"""
preprocess_and_upload.py
========================
One-time (or on-demand) script that:
  1. Reads raw CERT CSV logs from data/raw/
  2. Aggregates per-user features
  3. Runs ML inference
  4. Upserts both tables into Supabase PostgreSQL

Usage:
    python scripts/preprocess_and_upload.py

Run this script once after installing the project, then whenever
you have fresh data to re-process.
"""

import os
import sys
import json

# Force UTF-8 output so Unicode characters don't crash on Windows (cp1252)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure root project directory is on path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT, ".env"))

from supabase import create_client, Client
from src.data_preprocessing import load_data
from src.detector import ThreatDetectionEngine

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

BATCH_SIZE = 200  # Rows per upsert batch to stay within Supabase limits

SEP = "=" * 55


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upsert_in_batches(client: Client, table: str, records: list):
    """Upsert records in batches to avoid request size limits."""
    total = len(records)
    for i in range(0, total, BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        client.table(table).upsert(batch).execute()
        print(f"  Uploaded {min(i + BATCH_SIZE, total)}/{total} rows to {table}...")


def main():
    print(SEP)
    print("  ThreatWatch - Preprocess & Upload to Supabase")
    print(SEP)

    # ---- 1. Load and aggregate raw data ------------------------
    print("\n[1/3] Loading and aggregating raw CSV data...")
    df_raw, labels = load_data()
    print(f"      OK Loaded {len(df_raw)} users.")

    # ---- 2. Run ML inference ----------------------------------
    print("\n[2/3] Running ML inference...")
    try:
        engine = ThreatDetectionEngine()
    except FileNotFoundError:
        print("  ERROR: Saved models not found.")
        print("    Run `python src/train.py` first to train and save models.")
        sys.exit(1)

    results = engine.analyze_activity(df_raw)
    print(f"      OK Inference complete. {len(results)} predictions generated.")

    # ---- 3. Upload to Supabase --------------------------------
    print("\n[3/3] Uploading to Supabase...")
    client = get_supabase()

    # --- user_features table ---
    feature_cols = [
        "user_id", "logon_count", "after_hours_logons", "graph_centrality",
        "emails_sent", "avg_email_sentiment", "files_downloaded",
        "usb_writes", "http_bytes_uploaded",
    ]
    # Add ground truth label
    df_raw_copy = df_raw.copy()
    df_raw_copy["is_insider"] = labels.astype(int)

    # Only keep columns that exist
    existing_cols = [c for c in feature_cols if c in df_raw_copy.columns]
    existing_cols.append("is_insider")

    feature_records = (
        df_raw_copy[existing_cols]
        .fillna(0)
        .astype({c: float for c in existing_cols if c not in ("user_id", "is_insider")})
        .to_dict(orient="records")
    )

    print(f"  Uploading {len(feature_records)} rows to `user_features`...")
    upsert_in_batches(client, "user_features", feature_records)
    print("  OK user_features uploaded.")

    # --- ml_results table ---
    result_records = (
        results
        .fillna(0)
        .assign(
            is_anomaly=results["is_anomaly"].astype(int),
            is_threat=results["is_threat"].astype(int),
        )
        .to_dict(orient="records")
    )

    print(f"  Uploading {len(result_records)} rows to `ml_results`...")
    upsert_in_batches(client, "ml_results", result_records)
    print("  OK ml_results uploaded.")

    print(SEP)
    print("  DONE! Supabase tables are up-to-date.")
    print("  Restart your API server to use cloud data.")
    print(SEP + "\n")


if __name__ == "__main__":
    main()
