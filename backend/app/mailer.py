import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode

from .config import settings

logger = logging.getLogger("medper.mail")


def send_password_reset(email: str, raw_token: str) -> None:
    if not settings.smtp_enabled:
        logger.warning("SMTP não configurado; token de redefinição não enviado")
        return

    query = urlencode({"reset_token": raw_token})
    link = f"{settings.public_frontend_url.rstrip('/')}?{query}"
    message = EmailMessage()
    message["Subject"] = "Redefinição de senha do MedPer"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(
        "Foi solicitada uma redefinição de senha para sua conta MedPer.\n\n"
        f"Abra o endereço abaixo dentro de {settings.password_reset_minutes} minutos:\n{link}\n\n"
        "Caso você não tenha feito a solicitação, ignore esta mensagem."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as client:
        if settings.smtp_starttls:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


def _prazo_assunto(marco: int) -> str:
    if marco == 0:
        return "MedPer — prazo vence hoje"
    if marco == 2:
        return "MedPer — prazo em 2 dias"
    return "MedPer — prazo em uma semana"


def send_deadline_reminder(email: str, aviso: dict) -> bool:
    """Avisa a perita de um prazo que se aproxima.

    O que este e-mail NÃO leva, por decisão e não por esquecimento: número do
    processo, nome ou qualquer dado do periciado, e nada de conteúdo clínico. O
    e-mail trafega por provedor de terceiro e fica na caixa de entrada
    indefinidamente; o número do processo é chave pública que liga o caso às
    partes, então bastaria ele para reidentificar.

    Leva o tipo do prazo, a data e o título do caso — que é texto escolhido pela
    perita. `docs/DATA_HANDLING_PILOT.md` registra a recomendação de não pôr nome
    de periciado no título.

    Devolve False quando não há SMTP configurado, para que o disparador não
    marque como avisado o que não saiu.
    """
    if not settings.smtp_enabled:
        logger.warning("SMTP não configurado; lembrete de prazo não enviado")
        return False

    vencimento = aviso["due_at"].strftime("%d/%m/%Y às %H:%M")
    restantes = aviso["days_remaining"]
    quando = "hoje" if restantes <= 0 else ("amanhã" if restantes == 1 else f"em {restantes} dias")

    message = EmailMessage()
    message["Subject"] = _prazo_assunto(aviso["milestone"])
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(
        f"{aviso['kind']} — {aviso['case_title']}\n\n"
        f"Vence {quando}, em {vencimento}.\n\n"
        f"Abra a perícia: {settings.public_frontend_url.rstrip('/')}/app.html#/case/{aviso['case_id']}/delimitation\n\n"
        "Este aviso é automático e não substitui a conferência dos autos."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as client:
        if settings.smtp_starttls:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
    return True
