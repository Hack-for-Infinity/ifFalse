import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("./backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"
