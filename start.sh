#!/usr/bin/env bash
# start.sh  –  Start backend og frontend

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🏃 Fysioterapeut Markedsplass"
echo "────────────────────────────"

# Sjekk at databasen finnes
if [ ! -f "$ROOT/backend/fysioterapeuter.db" ]; then
  echo "⚠️  Ingen database funnet. Henter data fra BRREG ..."
  cd "$ROOT/scripts"
  pip install requests -q
  python hent_data.py
  cd "$ROOT"
fi

# Start backend i bakgrunn
echo "▶  Starter backend på http://localhost:8000 ..."
cd "$ROOT/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "▶  Starter frontend på http://localhost:5173 ..."
cd "$ROOT/frontend"
npm install -s
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅  Klar!"
echo "   Frontend:  http://localhost:5173"
echo "   API docs:  http://localhost:8000/docs"
echo ""
echo "Trykk Ctrl+C for å stoppe."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
