from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict


_WEAK_JWT_SECRETS = {
    "",
    "change-me-in-production",
    "development-only-not-for-production",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    database_url: str = "sqlite:///./medper.db"
    environment: str = "development"
    jwt_secret: str = "development-only-not-for-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    password_reset_minutes: int = 30
    storage_path: str = "./storage"
    file_encryption_key: str = ""
    file_storage_required: bool = False
    max_upload_bytes: int = 25 * 1024 * 1024
    cors_origins: str = "https://joyceradis.github.io,http://localhost:8080"
    log_level: str = "INFO"
    public_api_url: str = "http://localhost:8000"
    public_frontend_url: str = "https://joyceradis.github.io/MedPer"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    auth_rate_limit_attempts: int = 10
    auth_rate_limit_window_seconds: int = 60
    model_config = SettingsConfigDict(env_file=".env", env_prefix="MEDPER_")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

    @property
    def production_mode(self) -> bool:
        return self.environment.strip().lower() in {"production", "staging"}

    @property
    def jwt_secret_is_strong(self) -> bool:
        value = self.jwt_secret.strip()
        return value not in _WEAK_JWT_SECRETS and len(value) >= 32

    @property
    def file_encryption_key_is_valid(self) -> bool:
        if not self.file_encryption_key:
            return False
        try:
            Fernet(self.file_encryption_key.encode("ascii"))
            return True
        except (ValueError, TypeError, UnicodeError):
            return False

    def security_issues(self) -> list[str]:
        issues: list[str] = []
        if self.production_mode and not self.jwt_secret_is_strong:
            issues.append("jwt_secret_insecure")
        if self.file_storage_required and not self.file_encryption_key_is_valid:
            issues.append("file_encryption_key_invalid")
        return issues

    def assert_secure_startup(self) -> None:
        issues = self.security_issues()
        if issues:
            raise RuntimeError("Configuração de segurança inválida: " + ", ".join(issues))


settings = Settings()
