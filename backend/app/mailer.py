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
