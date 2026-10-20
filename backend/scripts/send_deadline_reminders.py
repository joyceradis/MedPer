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
from app.deps import set_request_context
from app.deadlines import pending_reminders
from app.mailer import send_deadline_reminder
from app.models import DeadlineReminder, User

logger = logging.getLogger("medper.deadlines")


def executar(dry_run: bool = False, agora: datetime | None = None) -> int:
    agora = agora or datetime.now(timezone.utc)
    enviados = 0
    # The worker uses the same restricted role and user context as the API.
    # It never needs BYPASSRLS, and never broadcasts a case to an organization.
    with SessionLocal() as db:
        user_ids = list(db.scalars(select(User.id).where(User.is_active.is_(True))))
    for user_id in user_ids:
        with SessionLocal() as db:
            user = db.get(User, user_id)
            if not user or not user.is_active or not user.email:
                continue
            set_request_context(db, user)
            devidos = pending_reminders(db, agora, owner_user_id=user.id)
            for aviso in devidos:
                set_request_context(db, user)  # commit resets transaction-local RLS settings
                if dry_run:
                    # Case titles and addresses do not belong in scheduler logs.
                    print(f"[simulação] prazo {aviso['deadline_id']} | marco D-{aviso['milestone']}")
                    enviados += 1
                    continue
                try:
                    entregue = send_deadline_reminder(user.email, aviso)
                except Exception:
                    logger.exception("falha ao enviar lembrete %s", aviso["deadline_id"])
                    continue
                if entregue:
                    db.add(DeadlineReminder(
                        deadline_id=aviso["deadline_id"], milestone=aviso["milestone"], sent_at=agora,
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
