"""Disposable databases only: run by the dedicated PostgreSQL/age CI job."""
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

from cryptography.fernet import Fernet
import psycopg
from psycopg import sql
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Case, Organization, User
from app.session_models import StoredFile

pytestmark = pytest.mark.skipif(os.getenv('MEDPER_BACKUP_TEST') != '1', reason='Dedicated disposable backup CI job')
BACKEND = Path(__file__).resolve().parents[1]
SCRIPT = BACKEND / 'scripts/backup_bundle.py'


def invoke(command, env, archive=None, success=True):
    result = subprocess.run([sys.executable, str(SCRIPT), command, *([str(archive)] if archive else [])],
                            cwd=BACKEND, env=env, text=True, capture_output=True)
    assert (result.returncode == 0) == success, result.stdout + result.stderr
    return result


def test_authenticated_complete_backup_and_restore_refuses_unsafe_targets(tmp_path):
    # No fallback URL: this variable exists only on the synthetic CI service.
    admin_url = os.environ['MEDPER_RESTORE_TEST_ADMIN_URL']
    names = ['medper_drill_' + uuid.uuid4().hex for _ in range(3)]
    source_name, restored_name, untouched_name = names
    with psycopg.connect(admin_url, autocommit=True) as admin:
        try:
            for name in names:
                admin.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
            # URLs keep the same test service credentials, only the DB changes.
            from urllib.parse import urlsplit, urlunsplit
            def url(name):
                parts = urlsplit(admin_url)
                return urlunsplit(parts._replace(path='/'+name))
            key = Fernet.generate_key()
            storage = tmp_path / 'source-files'
            storage.mkdir()
            file_key = uuid.uuid4().hex + '.bin'
            content = b'synthetic confidential document'
            ciphertext = Fernet(key).encrypt(content)
            (storage / file_key).write_bytes(ciphertext)
            env = {**os.environ, 'DATABASE_URL': url(source_name),
                   'MEDPER_DATABASE_URL': url(source_name).replace('postgresql://','postgresql+psycopg://',1),
                   'MEDPER_FILE_ENCRYPTION_KEY': key.decode(), 'MEDPER_STORAGE_PATH': str(storage),
                   'MEDPER_BACKUP_MAINTENANCE': 'true', 'BACKUP_DIR': str(tmp_path/'backups')}
            migration = subprocess.run([sys.executable,'-m','alembic','upgrade','head'], cwd=BACKEND, env=env, capture_output=True, text=True)
            assert migration.returncode == 0, migration.stderr
            engine = create_engine(env['MEDPER_DATABASE_URL'])
            with Session(engine) as db:
                org = Organization(name='Synthetic',slug='synthetic')
                db.add(org); db.flush()
                user = User(organization_id=org.id,email='synthetic@example.com',password_hash='synthetic-no-login')
                db.add(user); db.flush()
                payload = {'schemaVersion':2,'identity':{'title':'Synthetic private record'}}
                case = Case(organization_id=org.id,owner_user_id=user.id,title='Synthetic',object_type='Synthetic',
                            state_payload={'__medper_encrypted__':1,'ciphertext':Fernet(key).encrypt(json.dumps(payload).encode()).decode()})
                db.add(case); db.flush()
                db.add(StoredFile(organization_id=org.id,case_id=case.id,uploaded_by=user.id,
                                  original_name='synthetic.txt',storage_key=file_key,content_type='text/plain',
                                  size_bytes=len(content),sha256=__import__('hashlib').sha256(content).hexdigest()))
                db.commit()
                identifier, owner = case.id, user.id
            engine.dispose()
            with psycopg.connect(url(source_name)) as db:
                for script in ['init_database.sql','restrict_audit.sql','enable_rls.sql']:
                    db.execute((BACKEND/'scripts'/script).read_text(), prepare=False)
            identity = tmp_path/'identity.txt'
            generated = subprocess.run(['age-keygen','-o',str(identity)],capture_output=True,text=True)
            assert generated.returncode == 0, generated.stderr
            recipients = tmp_path/'recipients.txt'
            public = subprocess.check_output(['age-keygen','-y',str(identity)],text=True)
            recipients.write_text(public)
            env.update(BACKUP_AGE_RECIPIENTS_FILE=str(recipients), BACKUP_AGE_IDENTITY_FILE=str(identity))

            invoke('create', {**env,'MEDPER_BACKUP_MAINTENANCE':'false'}, success=False)
            archive = Path(invoke('create',env).stdout.strip())
            assert archive.exists() and content not in archive.read_bytes()
            assert not list(archive.parent.glob('.medper-*'))
            invoke('verify',env,archive)
            # Wrong application key and corrupted age input fail before SQL/files.
            invoke('verify',{**env,'MEDPER_FILE_ENCRYPTION_KEY':Fernet.generate_key().decode()},archive,success=False)
            damaged = tmp_path/'damaged.age'
            raw = bytearray(archive.read_bytes()); raw[-1] ^= 1; damaged.write_bytes(raw)
            empty = tmp_path/'restored-files'
            target = {**env,'DATABASE_URL':url(untouched_name),'MEDPER_STORAGE_PATH':str(empty)}
            invoke('restore',target,damaged,success=False)
            assert not empty.exists()
            with psycopg.connect(url(untouched_name)) as db:
                assert db.execute("SELECT count(*) FROM pg_tables WHERE schemaname='public'").fetchone()[0] == 0

            target['DATABASE_URL'] = url(restored_name)
            invoke('restore',target,archive)
            assert (empty/file_key).read_bytes() == ciphertext
            assert Fernet(key).decrypt((empty/file_key).read_bytes()) == content
            with psycopg.connect(url(restored_name)) as db:
                row = db.execute('SELECT owner_user_id,state_payload FROM cases WHERE id=%s',(identifier,)).fetchone()
                assert row[0] == owner
                assert json.loads(Fernet(key).decrypt(row[1]['ciphertext'].encode())) == payload
                assert db.execute('SELECT count(*) FROM stored_files').fetchone()[0] == 1
                assert db.execute("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='cases'").fetchone() == (True,True)
            # A second restore must never replace an existing database/files.
            invoke('restore',target,archive,success=False)
            other_empty = tmp_path/'other-empty-files'
            invoke('restore',{**target,'MEDPER_STORAGE_PATH':str(other_empty)},archive,success=False)
            assert (empty/file_key).read_bytes() == ciphertext
            # Missing blobs cannot produce a deceptively successful backup.
            (storage/file_key).unlink()
            invoke('create',env,success=False)
            assert list(archive.parent.iterdir()) == [archive]
        finally:
            for name in names:
                admin.execute(sql.SQL('DROP DATABASE IF EXISTS {} WITH (FORCE)').format(sql.Identifier(name)))
