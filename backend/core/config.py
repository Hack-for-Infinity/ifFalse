import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ dir — works both locally and in Docker
_env_candidates = [
    Path(__file__).resolve().parent.parent / ".env",
    Path("./backend/.env"),
    Path(".env"),
]
for _p in _env_candidates:
    if _p.exists():
        load_dotenv(_p)
        break

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"
