"""
NioSports Pro — ML Prediction API v4.0
Stacking Ensemble: XGBoost + LightGBM + Ridge + MLP → LogisticRegression meta
Deploy: Railway
"""

import os
import json
import numpy as np
import xgboost as xgb
from math import erf, sqrt
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from contextlib import asynccontextmanager

# ── Paths ──
MODEL_DIR = os.getenv('MODEL_DIR', 'ml/models')
XGB_PATH = os.path.join(MODEL_DIR, 'ensemble_model.json')
XGB_LEGACY_PATH = os.path.join(MODEL_DIR, 'xgboost_totals.json')
LGB_PATH = os.path.join(MODEL_DIR, 'lightgbm_totals.txt')
CALIB_PATH = os.path.join(MODEL_DIR, 'calibration.json')
ML_API_KEY = os.getenv('ML_API_KEY', '')

# ── Global state ──
xgb_model = None
lgb_model = None
calib_data = None
ensemble_ready = False

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


def load_models():
    """Load all ensemble models and calibration data."""
    global xgb_model, lgb_model, calib_data, ensemble_ready, FEATURE_COLS

    # Load calibration (contains Ridge, MLP, meta-learner params)
    if os.path.exists(CALIB_PATH):
        with open(CALIB_PATH) as f:
            calib_data = json.load(f)
        if 'feature_cols' in calib_data:
            FEATURE_COLS = calib_data['feature_cols']
        print(f"[ML API] Calibration loaded: v{calib_data.get('version', '?')}, {len(FEATURE_COLS)} features")

    # Load XGBoost
    xgb_path = XGB_PATH if os.path.exists(XGB_PATH) else XGB_LEGACY_PATH
    if os.path.exists(xgb_path):
        xgb_model = xgb.Booster()
        xgb_model.load_model(xgb_path)
        print(f"[ML API] XGBoost loaded: {xgb_path}")

    # Load LightGBM
    try:
        import lightgbm as lgb
        if os.path.exists(LGB_PATH):
            lgb_model = lgb.Booster(model_file=LGB_PATH)
            print(f"[ML API] LightGBM loaded: {LGB_PATH}")
    except ImportError:
        print("[ML API] LightGBM not available — using XGBoost only for that slot")

    ensemble_ready = (xgb_model is not None) and (calib_data is not None) and ('ensemble' in (calib_data or {}))
    print(f"[ML API] Ensemble ready: {ensemble_ready}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield
    print("[ML API] Shutting down")


app = FastAPI(title="NioSports Pro ML API", version="4.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST", "GET"], allow_headers=["*"])


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


# ── Feature building ──
def build_features(req: PredictRequest) -> dict:
    home, away = req.home_team, req.away_team
    base = {
        'home_total_l5': home.total_l5, 'home_total_l10': home.total_l10,
        'home_total_l20': home.total_l20, 'home_home_avg': home.home_avg, 'home_std': home.std,
        'away_total_l5': away.total_l5, 'away_total_l10': away.total_l10,
        'away_total_l20': away.total_l20, 'away_away_avg': away.away_avg, 'away_std': away.std,
        'total_sum_l5': home.total_l5 + away.total_l5,
        'total_sum_l10': home.total_l10 + away.total_l10,
        'total_diff_l5': home.total_l5 - away.total_l5,
        'home_rest_days': min(home.rest_days, 7), 'away_rest_days': min(away.rest_days, 7),
        'is_b2b_home': 1 if home.is_b2b else 0, 'is_b2b_away': 1 if away.is_b2b else 0,
        'rest_diff': home.rest_days - away.rest_days,
        'altitude_ft': ALTITUDE_TEAMS.get(home.name, 0),
        'days_into_season': req.days_into_season,
    }
    # Engineered features (match training)
    base['momentum_5v10'] = base['total_sum_l5'] - base['total_sum_l10']
    base['matchup_volatility'] = home.std + away.std
    base['total_rest'] = base['home_rest_days'] + base['away_rest_days']
    base['both_rested'] = 1 if (home.rest_days >= 2 and away.rest_days >= 2) else 0
    base['both_b2b'] = 1 if (home.is_b2b and away.is_b2b) else 0
    base['venue_split_diff'] = home.home_avg - away.away_avg
    return base


def ridge_predict(features_array, ridge_params, scaler_params):
    """Predict using Ridge coefficients from calibration.json."""
    # Scale
    mean = np.array(scaler_params['mean'])
    scale = np.array(scaler_params['scale'])
    # Pad or trim to match scaler dimensions
    x = features_array.copy()
    if len(x) < len(mean):
        x = np.pad(x, (0, len(mean) - len(x)), constant_values=0)
    elif len(x) > len(mean):
        x = x[:len(mean)]
    x_scaled = (x - mean) / np.where(scale == 0, 1, scale)
    # Predict
    coef = np.array(ridge_params['coef'])
    if len(x_scaled) < len(coef):
        x_scaled = np.pad(x_scaled, (0, len(coef) - len(x_scaled)), constant_values=0)
    elif len(x_scaled) > len(coef):
        x_scaled = x_scaled[:len(coef)]
    return float(np.dot(x_scaled, coef) + ridge_params['intercept'])


def mlp_predict(features_array, mlp_params, scaler_params):
    """Predict using MLP weights from calibration.json."""
    mean = np.array(scaler_params['mean'])
    scale = np.array(scaler_params['scale'])
    x = features_array.copy()
    if len(x) < len(mean):
        x = np.pad(x, (0, len(mean) - len(x)), constant_values=0)
    elif len(x) > len(mean):
        x = x[:len(mean)]
    x_scaled = (x - mean) / np.where(scale == 0, 1, scale)

    # Forward pass through MLP layers
    h = x_scaled
    for i, (w, b) in enumerate(zip(mlp_params['coefs'], mlp_params['intercepts'])):
        w = np.array(w)
        b = np.array(b)
        if h.shape[0] < w.shape[0]:
            h = np.pad(h, (0, w.shape[0] - h.shape[0]), constant_values=0)
        elif h.shape[0] > w.shape[0]:
            h = h[:w.shape[0]]
        h = h @ w + b
        if i < len(mlp_params['coefs']) - 1:  # ReLU for hidden layers
            h = np.maximum(h, 0)
    return float(h[0]) if h.ndim == 1 else float(h)


def meta_predict(base_preds, line, meta_params):
    """Meta-learner probability using logistic regression coefficients."""
    edges = np.array(base_preds) - line
    coef = np.array(meta_params['coef'][0])
    intercept = float(meta_params['intercept'][0])
    if len(edges) < len(coef):
        edges = np.pad(edges, (0, len(coef) - len(edges)), constant_values=0)
    elif len(edges) > len(coef):
        edges = edges[:len(coef)]
    logit = np.dot(edges, coef) + intercept
    prob = 1.0 / (1.0 + np.exp(-logit))
    return float(prob)


def heuristic_fallback(features: dict) -> float:
    return (features['total_sum_l5'] / 2 * 0.45 + features['total_sum_l10'] / 2 * 0.30 + features['total_sum_l5'] / 2 * 0.25) * 2


def normal_cdf(z: float) -> float:
    return 0.5 * (1 + erf(z / sqrt(2)))


# ── Core prediction ──
def predict_total(req: PredictRequest) -> dict:
    features = build_features(req)
    feature_array = np.array([features.get(col, 0) for col in FEATURE_COLS], dtype=np.float32)

    if ensemble_ready and xgb_model is not None:
        # XGBoost prediction
        dmatrix = xgb.DMatrix(feature_array.reshape(1, -1), feature_names=FEATURE_COLS)
        xgb_pred = float(xgb_model.predict(dmatrix)[0])

        # LightGBM prediction
        if lgb_model is not None:
            lgb_pred = float(lgb_model.predict(feature_array.reshape(1, -1))[0])
        else:
            lgb_pred = xgb_pred  # Fallback

        # Ridge prediction
        ens = calib_data.get('ensemble', {})
        ridge_pred = ridge_predict(feature_array, ens.get('ridge', {}), ens.get('scaler', {}))

        # MLP prediction
        mlp_pred = mlp_predict(feature_array, ens.get('mlp', {}), ens.get('scaler', {}))

        # Ensemble average
        base_preds = [xgb_pred, lgb_pred, ridge_pred, mlp_pred]
        raw_projection = float(np.mean(base_preds))

        # Meta-learner probability
        meta_prob = meta_predict(base_preds, req.line, ens.get('meta_params', {}))

        source = 'ensemble-v4'
        version = '4.0.0-ensemble'
        use_meta_prob = True

    elif xgb_model is not None:
        dmatrix = xgb.DMatrix(feature_array.reshape(1, -1), feature_names=FEATURE_COLS)
        raw_projection = float(xgb_model.predict(dmatrix)[0])
        source = 'xgboost'
        version = '3.0.0-xgboost'
        use_meta_prob = False
    else:
        raw_projection = heuristic_fallback(features)
        source = 'heuristic-fallback'
        version = '2.0.0-heuristic'
        use_meta_prob = False

    # Period adjustment
    factor = PERIOD_FACTORS.get(req.period, 1.0)
    projection = round(raw_projection * factor, 1)
    line = req.line
    edge = round(projection - line, 1)
    direction = 'OVER' if projection > line else 'UNDER'

    # Probability
    if use_meta_prob:
        prob_over = meta_prob
        probability = prob_over if direction == 'OVER' else (1 - prob_over)
    elif calib_data and calib_data.get('method') == 'platt':
        A = calib_data.get('A', -0.163)
        B = calib_data.get('B', 0.256)
        raw_score = projection - line
        prob_over = 1.0 / (1.0 + np.exp(A * raw_score + B))
        probability = prob_over if direction == 'OVER' else (1 - prob_over)
    else:
        std = PERIOD_STD.get(req.period, 10.5)
        z = (projection - line) / std if std > 0 else 0
        prob_over = normal_cdf(z)
        probability = prob_over if direction == 'OVER' else (1 - prob_over)

    probability_pct = round(float(probability) * 100, 1)
    confidence = 'HIGH' if probability_pct >= 65 else ('MEDIUM' if probability_pct >= 55 else 'LOW')

    # EV at -110
    decimal_odds = 1.909
    ev = float(probability) * (decimal_odds - 1) - (1 - float(probability))
    ev_percent = round(ev * 100, 2)
    is_value_bet = ev_percent > 0 and abs(edge) >= 1.5

    return {
        'projection': projection, 'line': line, 'edge': edge, 'direction': direction,
        'probability': round(float(probability), 4), 'probability_pct': probability_pct,
        'confidence': confidence, 'ev': round(ev, 4), 'ev_percent': ev_percent,
        'is_value_bet': is_value_bet, 'model_version': version, 'source': source,
    }


# ── Endpoints ──
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": xgb_model is not None,
        "ensemble_ready": ensemble_ready,
        "lgb_loaded": lgb_model is not None,
        "version": "4.0.0",
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
    return {"predictions": [predict_total(g) for g in games], "count": len(games)}