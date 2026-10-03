from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./liuji.db"

    # JWT
    # Generate a secure key: python -c "import secrets; print(secrets.token_urlsafe(64))"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # LLM
    LLM_BASE_URL: str = "https://api.deepseek.com/v1"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "deepseek-chat"

    # App
    DAILY_NEW_WORDS: int = 20
    DAILY_REVIEW_LIMIT: int = 50
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode='after')
    def validate_secret_key(self) -> 'Settings':
        placeholder_keys = [
            "your-secret-key-change-in-production",
            "dev-secret-key-change-in-production-abc123xyz",
            "change-me",
            "secret",
        ]
        if not self.SECRET_KEY or self.SECRET_KEY in placeholder_keys:
            raise ValueError(
                "SECRET_KEY must be set to a secure random string. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        return self


settings = Settings()
