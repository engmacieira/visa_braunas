import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "VigiMinas"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "Backend oficial do Sistema VigiMinas - Vigilância Sanitária Municipal (DDD, FastAPI, SQLAlchemy 2.0)"
    )
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Rota Base da API
    API_V1_STR: str = "/api/v1"

    # Dados Institucionais Padrão
    MUNICIPIO_PADRAO: str = "Braúnas"
    UF_PADRAO: str = "MG"

    # Dualidade de Drivers de Banco de Dados
    DATABASE_URL: str = (
        "postgresql+asyncpg://vigiminas_user:vigiminas_pass@localhost:5434/vigiminas_db"
    )
    DATABASE_URL_SYNC: str = (
        "postgresql+psycopg2://vigiminas_user:vigiminas_pass@localhost:5434/vigiminas_db"
    )

    # Configurações do Pool Assíncrono do Banco de Dados
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 30
    DB_POOL_TIMEOUT: int = 30

    # Cache e Mensageria (Opcional - InMemoryBackend por padrão caso ausente)
    REDIS_URL: Union[str, None] = None

    # Segurança e Criptografia
    SECRET_KEY: str = "sua_chave_secreta_super_segura_deve_ser_alterada_em_producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(
        cls, value: Union[str, List[str]]
    ) -> List[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed]
                except json.JSONDecodeError:
                    pass
            # Suporte a origens separadas por vírgula
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        elif isinstance(value, list):
            return [str(origin).strip() for origin in value]
        return []

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
