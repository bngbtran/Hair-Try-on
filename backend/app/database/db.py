import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # 👈 tự tìm .env trong working directory

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

STORAGE_BUCKET = "hairstyles"

_client: Client | None = None


def get_supabase() -> Client:
    global _client

    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL và SUPABASE_KEY chưa được set.\n"
                "Local: backend/.env\n"
                "Render: Environment Variables"
            )

        _client = create_client(SUPABASE_URL, SUPABASE_KEY)

    return _client