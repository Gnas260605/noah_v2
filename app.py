"""
app.py – Root entry point for running Noah Retail locally (without Docker).
Simply re-exports the Flask app from the api package.

Usage (local):
    python -m flask --app app run --port 5000 --debug
  OR
    python app.py

Note: Set RABBITMQ_HOST, MYSQL_HOST, POSTGRES_HOST env-vars to
      point to local or running Docker services.
"""

import os

# ── Local dev defaults (override with env vars when running locally) ──────────
os.environ.setdefault("RABBITMQ_HOST",  "localhost")
os.environ.setdefault("MYSQL_HOST",     "localhost")
os.environ.setdefault("POSTGRES_HOST",  "localhost")

# ── Import the Flask app (must come AFTER env defaults are set) ───────────────
from api.app import app  # noqa: E402

if __name__ == "__main__":
    print("=" * 60)
    print("  NOAH Retail Integration System")
    print("  Running locally on http://localhost:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
