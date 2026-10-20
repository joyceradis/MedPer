#!/usr/bin/env python3
"""Authenticated, complete backups. Restore only into an empty PostgreSQL DB.

Uses the standard age file format, not a custom encryption implementation.
The application must be stopped for a consistent database/file snapshot.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tarfile
import tempfile
import uuid

from cryptography.fernet import Fernet
import psycopg


FILE_KEY = re.compile(r"[0-9a-f]{32}\.bin")


def required(name):
    value = os.environ.get(name, "")
    if not value:
        raise ValueError(f"{name} obrigatório")
    return value


def maintenance():
    if os.environ.get("MEDPER_BACKUP_MAINTENANCE") != "true":
        raise ValueError("Pare a API e os workers; confirme MEDPER_BACKUP_MAINTENANCE=true")


def dsn():
    value = required("DATABASE_URL").replace("postgresql+psycopg://", "postgresql://", 1)
    if not value.startswith("postgresql://"):
        raise ValueError("É necessária uma URL PostgreSQL explícita")
    return value


def run(command, **kwargs):
    # Do not place credentials in process arguments or expose command stderr.
    env = os.environ.copy()
    if command[0] in {"pg_dump", "pg_restore"} and "--list" not in command:
        for option in psycopg.pq.Conninfo.parse(dsn().encode()):
            if option.val is not None and option.envvar:
                env[option.envvar.decode()] = option.val.decode()
    result = subprocess.run(command, env=env, stderr=subprocess.PIPE, **kwargs)
    if result.returncode:
        raise RuntimeError(f"{command[0]} falhou; nenhuma restauração foi confirmada")
    return result


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def key_fingerprint():
    key = required("MEDPER_FILE_ENCRYPTION_KEY")
    Fernet(key.encode("ascii"))  # refuse a nonrecoverable key configuration
    return hashlib.sha256(key.encode("ascii")).hexdigest()


def create_backup():
    maintenance()
    fingerprint = key_fingerprint()
    recipients = required("BACKUP_AGE_RECIPIENTS_FILE")
    storage = Path(required("MEDPER_STORAGE_PATH"))
    if storage.is_symlink() or not storage.is_dir():
        raise ValueError("Diretório de anexos inexistente ou simbólico")
    output = Path(os.environ.get("BACKUP_DIR", "./backups")).resolve()
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(prefix=".medper-backup-", dir=output) as private:
        stage = Path(private)
        files = stage / "storage"
        files.mkdir()
        # A backup role must see every row; pg_dump refuses an RLS-limited dump.
        with psycopg.connect(dsn(), options="-c row_security=off") as db:
            keys = [row[0] for row in db.execute("SELECT storage_key FROM stored_files")]
        for name in keys:
            source = storage / name
            if not FILE_KEY.fullmatch(name) or source.is_symlink() or not source.is_file():
                raise ValueError("Anexo referenciado ausente ou com chave inválida")
            shutil.copyfile(source, files / name)
        dump = stage / "database.dump"
        with dump.open("wb") as stream:
            run(["pg_dump", "--format=custom", "--no-owner", "--no-privileges"], stdout=stream)
        members = [dump, *sorted(files.iterdir())]
        manifest = {"format": 1, "applicationKeySha256": fingerprint, "files": {
            member.relative_to(stage).as_posix(): {"sha256": digest(member), "bytes": member.stat().st_size}
            for member in members
        }}
        (stage / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        archive = stage / "bundle.tar"
        with tarfile.open(archive, "w") as bundle:
            for member in [stage / "manifest.json", *members]:
                bundle.add(member, arcname=member.relative_to(stage).as_posix(), recursive=False)
        encrypted = stage / "bundle.age"
        run(["age", "--encrypt", "--recipients-file", recipients, "--output", str(encrypted), str(archive)])
        target = output / f"medper-{uuid.uuid4().hex}.tar.age"
        os.link(encrypted, target)  # publish atomically without replacing any backup
        return target


def unpack_verified(archive, stage):
    # age must authenticate the COMPLETE input before tar or pg_restore sees it.
    plain = stage / "verified.tar"
    run(["age", "--decrypt", "--identity", required("BACKUP_AGE_IDENTITY_FILE"),
         "--output", str(plain), str(archive)])
    with tarfile.open(plain, "r:") as bundle:
        members = bundle.getmembers()
        names = [member.name for member in members]
        if len(names) != len(set(names)) or names.count("manifest.json") != 1:
            raise ValueError("Índice de backup duplicado ou ausente")
        manifest_member = bundle.getmember("manifest.json")
        if not manifest_member.isfile() or manifest_member.size > 8 * 1024 * 1024:
            raise ValueError("Índice de backup inválido")
        manifest = json.load(bundle.extractfile(manifest_member))
        if manifest.get("format") != 1 or manifest.get("applicationKeySha256") != key_fingerprint():
            raise ValueError("Formato ou chave da aplicação incompatível")
        index = manifest.get("files", {})
        if not isinstance(index, dict) or "database.dump" not in index or set(names) != {"manifest.json", *index}:
            raise ValueError("Conteúdo de backup incompleto")
        (stage / "storage").mkdir()
        for name, expected in index.items():
            if name != "database.dump" and not (name.startswith("storage/") and FILE_KEY.fullmatch(name[8:])):
                raise ValueError("Caminho de backup inválido")
            member = bundle.getmember(name)
            if not member.isfile() or member.size != expected["bytes"]:
                raise ValueError("Tipo ou tamanho de membro inválido")
            target = stage / name
            with bundle.extractfile(member) as source, target.open("xb") as dest:
                shutil.copyfileobj(source, dest)
            if digest(target) != expected["sha256"]:
                raise ValueError("Falha de integridade do backup")
    run(["pg_restore", "--list", str(stage / "database.dump")], stdout=subprocess.DEVNULL)
    return manifest


def verify_or_restore(archive, restore=False):
    if restore:
        maintenance()
        destination = Path(required("MEDPER_STORAGE_PATH")).absolute()
        if destination.is_symlink() or (destination.exists() and (not destination.is_dir() or any(destination.iterdir()))):
            raise ValueError("O diretório de restauração deve estar vazio e não pode ser simbólico")
        destination.parent.mkdir(parents=True, exist_ok=True)
        parent = destination.parent
    else:
        parent = None
    with tempfile.TemporaryDirectory(prefix=".medper-restore-", dir=parent) as private:
        stage = Path(private)
        manifest = unpack_verified(archive, stage)
        if restore:
            with psycopg.connect(dsn()) as db:
                if db.execute("SELECT count(*) FROM pg_tables WHERE schemaname='public'").fetchone()[0]:
                    raise ValueError("Restaure em um banco novo e vazio; o banco existente não será substituído")
            database = psycopg.conninfo.conninfo_to_dict(dsn())["dbname"]
            run(["pg_restore", "--dbname", database, "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", str(stage / "database.dump")])
            if destination.exists():
                destination.rmdir()  # only the already-checked empty directory
            (stage / "storage").rename(destination)
        return len(manifest["files"]) - 1


def main():
    os.umask(0o077)
    def terminate(signum, frame):
        raise SystemExit(128 + signum)
    signal.signal(signal.SIGTERM, terminate)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["create", "verify", "restore"])
    parser.add_argument("archive", nargs="?")
    args = parser.parse_args()
    try:
        if args.command == "create":
            print(create_backup())
        else:
            if not args.archive:
                raise ValueError("Informe um arquivo .tar.age")
            count = verify_or_restore(Path(args.archive).resolve(), restore=args.command == "restore")
            print(f"{args.command}: concluído; anexos={count}")
    except (ValueError, RuntimeError, OSError, psycopg.Error, tarfile.TarError, KeyError, TypeError) as error:
        # PostgreSQL exceptions can include connection metadata: keep output generic.
        message = str(error) if isinstance(error, (ValueError, RuntimeError)) else "Falha no backup/restauração; verifique a configuração e use um destino descartável."
        parser.exit(1, message + "\n")


if __name__ == "__main__":
    main()
