# Insider Threat Detection System - Project Context

## Project Overview
The **Intelligent Insider Threat Detection System** is a machine learning-based platform designed to analyze user activity, detect anomalies, and classify potential insider threats within an organization. It features a modern web frontend for visualization and a robust Python backend powered by FastAPI, incorporating multiple machine learning models and explainability frameworks.

## Architecture
The system follows a full-stack architecture:

1.  **Frontend (`/frontend`):**
    -   Built with **React** (Vite), **Tailwind CSS**, and **Framer Motion** for animations.
    -   Uses **Recharts** for data visualization and dashboards.
    -   Provides an interface for security analysts to monitor threat scores, view network graphs, and analyze SHAP explainability metrics.

2.  **Backend (`api.py`):**
    -   A **FastAPI** server that acts as the bridge between the frontend and the machine learning engine.
    -   Exposes endpoints to retrieve threat analysis, run data through models, and fetch graph visualizations.
    -   Integrates with **Supabase** for fetching pre-processed `user_features` and `ml_results` from the database.

## Machine Learning Engine (`/src`)
The core ML logic is located in the `src/` directory. The models are serialized and saved in `models_saved/`.
-   **`detector.py`:** Contains the `ThreatDetectionEngine` class, which uses an ensemble approach:
    -   *Anomaly Detection:* **Isolation Forest** to flag unusual behavior (`is_anomaly`, `anomaly_score`).
    -   *Threat Classification:* **XGBoost** to calculate a precise threat probability (`threat_probability`, `is_threat`).
    -   *Risk Scoring:* Merges outputs into a three-tier classification (`High`, `Medium`, `Low`).
-   **`data_preprocessing.py`:** Handles data loading, normalization, and feature extraction.
-   **`explainability.py`:** Uses **SHAP (SHapley Additive exPlanations)** to interpret the XGBoost model and provide human-readable explanations of why a user was flagged.
-   **`graph_analysis.py`:** Generates network graphs to visualize relationships and communication patterns between users.
-   **`red_team.py`:** A testing utility (`inject_red_team_attacks`) designed to inject synthetic malicious activity into datasets for model validation.

## File Structure & Responsibilities
-   `api.py`: Main FastAPI application, routing, and Supabase data loading.
-   `frontend/`: Entire React application (package.json, src, components, etc.).
-   `src/`: Python module containing the ML pipeline (preprocessing, detection, explainability).
-   `models_saved/`: Serialized ML models (`xgboost.pkl`, `isolation_forest.pkl`).
-   `.env`: Environment variables (e.g., `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).

## Research Paper Angles
When writing the research paper on this project, consider focusing on these themes:
-   **Ensemble ML for Security:** Discuss the effectiveness of combining unsupervised anomaly detection (Isolation Forest) with supervised classification (XGBoost) to reduce false positives in insider threat detection.
-   **Model Explainability (XAI):** Highlight the integration of SHAP values to build trust with security analysts by making the "black-box" XGBoost model interpretable.
-   **Red Teaming & Synthetic Data:** Address the challenge of imbalanced datasets in cybersecurity and how injecting synthetic red team attacks (`red_team.py`) helps validate model robustness.
-   **Real-time Analytics Architecture:** The architectural benefits of decoupling the heavy ML inference via FastAPI from the reactive React dashboard for real-time threat monitoring.
