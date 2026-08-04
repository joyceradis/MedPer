from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./medper.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    password_reset_minutes: int = 30
    storage_path: str = "./storage"
    file_encryption_key: str = ""
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
    model_config = SettingsConfigDict(env_file=".env", env_prefix="MEDPER_")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)


settings = Settings()
