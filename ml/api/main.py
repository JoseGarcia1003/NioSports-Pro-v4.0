"""
FastAPI microservicio para predicciones ML.
Deploy en Railway. SvelteKit lo llama via HTTP.

Uso local: uvicorn ml.api.main:app --reload --port 8000
"""

import os
import json
import numpy as np
import xgboost as xgb
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv('.env.local')

app = FastAPI(title="NioSports Pro ML API", version="1.0.0")

# ── Load model at startup ──
MODEL_PATH = os.getenv('MODEL_PATH', 'ml/models/xgboost_totals.json')
ML_API_KEY = os.getenv('ML_API_KEY', 'dev-key-change-in-production')

model = None
FEATURE_COLS = [
    'home_total_l5', 'home_total_l10', 'home_total_l20', 'home_home_avg', 'home_std',
    'away_total_l5', 'away_total_l10', 'away_total_l20', 'away_away_avg', 'away_std',
    'total_sum_l5', 'total_sum_l10', 'total_diff_l5',
    'home_rest_days', 'away_rest_days', 'is_b2b_home', 'is_b2b_away', 'rest_diff',
    'altitude_ft', 'days_into_season',
]

ALTITUDE_TEAMS = {'Nuggets': 5280, 'Jazz': 4226}

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = xgb.XGBRegressor()
        model.load_model(MODEL_PATH)
        print(f"[ML API] Model loaded from {MODEL_PATH}")
    else:
        print(f"[ML API] WARNING: No model found at {MODEL_PATH}. Using fallback.")

# ── Request/Response schemas ──
class TeamData(BaseModel):
    name: str
    total_l5: float = 220
    total_l10: float = 220
    total_l20: float = 220
    home_avg: float = 220
    away_avg: float = 220
    std: float = 10
    rest_days: int = 2
    is_b2b: bool = False

class PredictRequest(BaseModel):
    home_team: TeamData
    away_team: TeamData
    line: float
    period: str = "FULL"
    days_into_season: int = 100

class PredictResponse(BaseModel):
    projection: float
    line: float
    edge: float
    direction: str
    probability: float
    probability_pct: float
    confidence: str
    model_version: str
    source: str

# ── Prediction logic ──
def predict_total(req: PredictRequest) -> dict:
    """Generate prediction using XGBoost or fallback."""
    
    home = req.home_team
    away = req.away_team
    
    features = {
        'home_total_l5': home.total_l5,
        'home_total_l10': home.total_l10,
        'home_total_l20': home.total_l20,
        'home_home_avg': home.home_avg,
        'home_std': home.std,
        'away_total_l5': away.total_l5,
        'away_total_l10': away.total_l10,
        'away_total_l20': away.total_l20,
        'away_away_avg': away.away_avg,
        'away_std': away.std,
        'total_sum_l5': home.total_l5 + away.total_l5,
        'total_sum_l10': home.total_l10 + away.total_l10,
        'total_diff_l5': home.total_l5 - away.total_l5,
        'home_rest_days': min(home.rest_days, 7),
        'away_rest_days': min(away.rest_days, 7),
        'is_b2b_home': 1 if home.is_b2b else 0,
        'is_b2b_away': 1 if away.is_b2b else 0,
        'rest_diff': home.rest_days - away.rest_days,
        'altitude_ft': ALTITUDE_TEAMS.get(home.name, 0),
        'days_into_season': req.days_into_season,
    }
    
    if model is not None:
        # Use XGBoost
        X = np.array([[features[col] for col in FEATURE_COLS]])
        projection = float(model.predict(X)[0])
        source = 'xgboost'
    else:
        # Fallback: weighted average (heuristic)
        projection = (
            features['total_sum_l5'] / 2 * 0.45 +
            features['total_sum_l10'] / 2 * 0.30 +
            features['total_sum_l5'] / 2 * 0.25  # Approximate L20 with L5
        ) * 2
        source = 'heuristic-fallback'
    
    # Period adjustment
    period_factor = {'Q1': 0.25, 'HALF': 0.48, 'FULL': 1.0}.get(req.period, 1.0)
    projection = projection * period_factor
    line = req.line
    
    # Edge and direction
    edge = round(projection - line, 1)
    direction = 'OVER' if projection > line else 'UNDER'
    
    # Probability (using normal CDF approximation)
    std_dev = {'Q1': 4.8, 'HALF': 7.2, 'FULL': 10.5}.get(req.period, 10.5)
    z_score = (projection - line) / std_dev if std_dev > 0 else 0
    
    # Normal CDF approximation
    from math import erf, sqrt
    prob_over = 0.5 * (1 + erf(z_score / sqrt(2)))
    probability = prob_over if direction == 'OVER' else (1 - prob_over)
    probability_pct = round(probability * 100, 1)
    
    # Confidence level
    if probability_pct >= 65:
        confidence = 'HIGH'
    elif probability_pct >= 55:
        confidence = 'MEDIUM'
    else:
        confidence = 'LOW'
    
    return {
        'projection': round(projection, 1),
        'line': line,
        'edge': edge,
        'direction': direction,
        'probability': round(probability, 4),
        'probability_pct': probability_pct,
        'confidence': confidence,
        'model_version': '3.0.0-xgboost' if model else '2.0.0-heuristic',
        'source': source,
    }

# ── Endpoints ──
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
    }

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest, x_api_key: str = Header(default='')):
    if ML_API_KEY != 'dev-key-change-in-production' and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    result = predict_total(req)
    return result

@app.post("/predict-batch")
async def predict_batch(games: list[PredictRequest], x_api_key: str = Header(default='')):
    if ML_API_KEY != 'dev-key-change-in-production' and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    results = []
    for game in games:
        result = predict_total(game)
        results.append(result)
    
    return {"predictions": results, "count": len(results)}