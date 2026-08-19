#!/usr/bin/env python3
"""Dispara os lembretes de prazo devidos agora.

Feito para rodar em cron, de hora em hora:

    0 * * * * cd /srv/medper/backend && python scripts/send_deadline_reminders.py

Seguro para repetir. A unicidade (prazo, marco) é do banco, não da aplicação, e
o registro do envio só é gravado depois que o e-mail sai — de modo que uma falha
de SMTP faz o aviso ser tentado de novo na hora seguinte, em vez de o sistema
afirmar que avisou quando não avisou.

`--dry-run` lista o que sairia sem enviar nada e sem escrever no banco. Use antes
do primeiro disparo real.
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db import SessionLocal
from app.deadlines import pending_reminders
from app.mailer import send_deadline_reminder
from app.models import DeadlineReminder, User

logger = logging.getLogger("medper.deadlines")


def destinatarios(db, organization_id: str) -> list[str]:
    """Quem recebe o aviso de uma organização.

    Todas as contas ativas dela. No piloto a regra é uma organização por perita,
    então isto é exatamente uma pessoa; a consulta já cobre o caso de equipe sem
    precisar mudar depois.
    """
    return [
        usuario.email
        for usuario in db.scalars(
            select(User).where(User.organization_id == organization_id, User.is_active.is_(True))
        ).all()
        if usuario.email
    ]


def executar(dry_run: bool = False, agora: datetime | None = None) -> int:
    agora = agora or datetime.now(timezone.utc)
    enviados = 0

    with SessionLocal() as db:
        devidos = pending_reminders(db, agora)
        if not devidos:
            logger.info("nenhum lembrete devido em %s", agora.isoformat())
            return 0

        for aviso in devidos:
            emails = destinatarios(db, aviso["organization_id"])
            if not emails:
                logger.warning("prazo %s sem destinatário ativo", aviso["deadline_id"])
                continue

            if dry_run:
                print(
                    f"[simulação] {aviso['kind']} — {aviso['case_title']} "
                    f"| marco D-{aviso['milestone']} | vence {aviso['due_at'].isoformat()} "
                    f"| para {', '.join(emails)}"
                )
                enviados += 1
                continue

            entregue = False
            for email in emails:
                try:
                    entregue = send_deadline_reminder(email, aviso) or entregue
                except Exception:
                    logger.exception("falha ao enviar lembrete para %s", email)

            # Só marca depois de sair. Falha de SMTP faz tentar de novo na
            # próxima execução em vez de silenciar o aviso para sempre.
            if entregue:
                db.add(DeadlineReminder(
                    deadline_id=aviso["deadline_id"],
                    milestone=aviso["milestone"],
                    sent_at=agora,
                ))
                db.commit()
                enviados += 1

    logger.info("%d lembrete(s) processado(s)", enviados)
    return enviados


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="lista sem enviar nem gravar")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    executar(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
