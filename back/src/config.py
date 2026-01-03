from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Neo4j Configuration
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    
    # Application Configuration
    APP_NAME: str = "MyLinks API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
