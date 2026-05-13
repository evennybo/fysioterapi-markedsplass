"""
startup.py – Kjøres av Railway før uvicorn starter.
Laster ned fysioterapeuter.db fra GitHub Releases hvis den ikke finnes lokalt.
"""
import os
import sys
import urllib.request
from pathlib import Path

DB_PATH = Path(__file__).parent / "fysioterapeuter.db"
DB_URL = os.environ.get(
    "DB_DOWNLOAD_URL",
    "https://github.com/evennybo/fysioterapi-markedsplass/releases/latest/download/fysioterapeuter.db"
)

def main():
    if DB_PATH.exists():
        print(f"[startup] Database finnes allerede ({DB_PATH.stat().st_size // 1024 // 1024} MB) – hopper over nedlasting.")
        return

    print(f"[startup] Laster ned database fra {DB_URL} ...")
    try:
        urllib.request.urlretrieve(DB_URL, DB_PATH)
        mb = DB_PATH.stat().st_size // 1024 // 1024
        print(f"[startup] Database lastet ned ({mb} MB). Klar.")
    except Exception as e:
        print(f"[startup] FEIL: Klarte ikke laste ned database: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
