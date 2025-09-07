from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    WEBAPP_CALLBACK_URL: str = "http://localhost:3000/api/submissions/callback"
    WEBAPP_CALLBACK_SECRET: str = "a-very-long-and-random-secret-string-for-callback"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()