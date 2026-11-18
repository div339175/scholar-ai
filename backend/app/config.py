import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "StepCode - Scholar AI Engine"
    API_V1_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stepcode.db")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

settings = Settings()
