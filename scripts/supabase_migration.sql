-- ============================================================
-- ThreatWatch: Supabase Schema Migration
-- Run this once in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Processed user feature vectors (ML model inputs)
CREATE TABLE IF NOT EXISTS user_features (
    user_id                TEXT PRIMARY KEY,
    logon_count            FLOAT DEFAULT 0,
    after_hours_logons     FLOAT DEFAULT 0,
    graph_centrality       FLOAT DEFAULT 0,
    emails_sent            FLOAT DEFAULT 0,
    avg_email_sentiment    FLOAT DEFAULT 0,
    files_downloaded       FLOAT DEFAULT 0,
    usb_writes             FLOAT DEFAULT 0,
    http_bytes_uploaded    FLOAT DEFAULT 0,
    is_insider             INTEGER DEFAULT 0,
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ML analysis results (model outputs)
CREATE TABLE IF NOT EXISTS ml_results (
    user_id             TEXT PRIMARY KEY,
    anomaly_score       FLOAT,
    is_anomaly          INTEGER,
    threat_probability  FLOAT,
    is_threat           INTEGER,
    risk_level          TEXT,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended for production)
-- ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ml_results ENABLE ROW LEVEL SECURITY;
