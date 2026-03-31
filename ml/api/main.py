"""
NioSports Pro — ML Prediction API
Deploy: Railway
Stack: FastAPI + XGBoost + Venn-ABERS (future)
"""

import os
import json
import numpy as np
import xgboost as xgb
from math import erf, sqrt
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager

# ── Model loading ──
MODEL_PATH = os.getenv('MODEL_PATH', 'ml/models/xgboost_totals.json')
ML_API_KEY = os.getenv('ML_API_KEY', '')

model = None

FEATURE_COLS = [
    'home_total_l5', 'home_total_l10', 'home_total_l20', 'home_home_avg', 'home_std',
    'away_total_l5', 'away_total_l10', 'away_total_l20', 'away_away_avg', 'away_std',
    'total_sum_l5', 'total_sum_l10', 'total_diff_l5',
    'home_rest_days', 'away_rest_days', 'is_b2b_home', 'is_b2b_away', 'rest_diff',
    'altitude_ft', 'days_into_season',
]

ALTITUDE_TEAMS = {'Nuggets': 5280, 'Jazz': 4226}
PERIOD_FACTORS = {'Q1': 0.25, 'HALF': 0.48, 'FULL': 1.0}
PERIOD_STD = {'Q1': 4.8, 'HALF': 7.2, 'FULL': 10.5}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if os.path.exists(MODEL_PATH):
        model = xgb.Booster()
        model.load_model(MODEL_PATH)
        print(f"[ML API] Model loaded: {MODEL_PATH}")
    else:
        print(f"[ML API] WARNING: No model at {MODEL_PATH}")
    yield
    print("[ML API] Shutting down")


app = FastAPI(
    title="NioSports Pro ML API",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Schemas ──
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
    ev: float
    ev_percent: float
    is_value_bet: bool
    model_version: str
    source: str


# ── Core prediction logic ──
def build_features(req: PredictRequest) -> dict:
    home = req.home_team
    away = req.away_team
    return {
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


def heuristic_fallback(features: dict) -> float:
    """Weighted average fallback when ML model unavailable."""
    return (
        features['total_sum_l5'] / 2 * 0.45 +
        features['total_sum_l10'] / 2 * 0.30 +
        features['total_sum_l5'] / 2 * 0.25
    ) * 2


def normal_cdf(z: float) -> float:
    """Standard normal CDF approximation."""
    return 0.5 * (1 + erf(z / sqrt(2)))


def predict_total(req: PredictRequest) -> dict:
    features = build_features(req)

    # ML or fallback
    if model is not None:
        X = np.array([[features[col] for col in FEATURE_COLS]])
        dmatrix = xgb.DMatrix(X, feature_names=FEATURE_COLS)
        raw_projection = float(model.predict(dmatrix)[0])
        source = 'xgboost'
        version = '3.0.0-xgboost'
    else:
        raw_projection = heuristic_fallback(features)
        source = 'heuristic-fallback'
        version = '2.0.0-heuristic'

    # Period adjustment
    factor = PERIOD_FACTORS.get(req.period, 1.0)
    projection = round(raw_projection * factor, 1)
    line = req.line

    # Direction and edge
    edge = round(projection - line, 1)
    direction = 'OVER' if projection > line else 'UNDER'

    # Probability via normal CDF
    std = PERIOD_STD.get(req.period, 10.5)
    z = (projection - line) / std if std > 0 else 0
    prob_over = normal_cdf(z)
    probability = prob_over if direction == 'OVER' else (1 - prob_over)
    probability_pct = round(probability * 100, 1)

    # Confidence
    if probability_pct >= 65:
        confidence = 'HIGH'
    elif probability_pct >= 55:
        confidence = 'MEDIUM'
    else:
        confidence = 'LOW'

    # Expected Value (assuming -110 odds)
    decimal_odds = 1.909  # -110
    ev = probability * (decimal_odds - 1) - (1 - probability)
    ev_percent = round(ev * 100, 2)
    is_value_bet = ev_percent > 0 and abs(edge) >= 1.5

    return {
        'projection': projection,
        'line': line,
        'edge': edge,
        'direction': direction,
        'probability': round(probability, 4),
        'probability_pct': probability_pct,
        'confidence': confidence,
        'ev': round(ev, 4),
        'ev_percent': ev_percent,
        'is_value_bet': is_value_bet,
        'model_version': version,
        'source': source,
    }


# ── Endpoints ──
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "version": "3.0.0",
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest, x_api_key: str = Header(default='')):
    if ML_API_KEY and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return predict_total(req)


@app.post("/predict-batch")
async def predict_batch(games: List[PredictRequest], x_api_key: str = Header(default='')):
    if ML_API_KEY and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    results = [predict_total(g) for g in games]
    return {"predictions": results, "count": len(results)}