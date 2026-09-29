"""Projection-only API. Legacy combined predictions disabled; no silent substitution."""
import os
import json
import secrets
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from ml.contracts.features import add_legacy_interactions
from ml.contracts.projection import (VERSION, validate_manifest, feature_vector,
    ridge, mlp, projection_response)

MODEL_DIR = Path(os.getenv('MODEL_DIR', 'ml/models'))
ML_API_KEY = os.getenv('ML_API_KEY', '')
state = {'ready':False, 'reason':'MODEL_UNAVAILABLE'}
ALTITUDE_TEAMS = {'Nuggets':5280,'Jazz':4226}

# Preserved numeric compatibility helper for F2. Not an accepted HTTP input.
def build_features(req) -> dict:
    home, away = req.home_team, req.away_team
    base = {
        'home_total_l5':home.total_l5,'home_total_l10':home.total_l10,'home_total_l20':home.total_l20,
        'home_home_avg':home.home_avg,'home_std':home.std,
        'away_total_l5':away.total_l5,'away_total_l10':away.total_l10,'away_total_l20':away.total_l20,
        'away_away_avg':away.away_avg,'away_std':away.std,
        'home_rest_days':min(home.rest_days,7),'away_rest_days':min(away.rest_days,7),
        'is_b2b_home':int(home.is_b2b),'is_b2b_away':int(away.is_b2b),
        'rest_diff':home.rest_days-away.rest_days,'altitude_ft':ALTITUDE_TEAMS.get(home.name,0),
        'days_into_season':req.days_into_season,
    }
    return add_legacy_interactions(base)

def load_models():
    global state
    state={'ready':False,'reason':'MODEL_UNAVAILABLE'}
    path=MODEL_DIR/'projection-manifest.json'
    if not path.is_file():
        return
    try:
        manifest=validate_manifest(json.loads(path.read_text()),MODEL_DIR)
        calibration=json.loads((MODEL_DIR/'calibration.json').read_text())
        if calibration.get('feature_cols')!=manifest['featureNames']:
            raise ValueError('FEATURE_ORDER_MISMATCH')
        import xgboost as xgb
        import lightgbm as lgb
        xgb_model=xgb.Booster()
        xgb_model.load_model(MODEL_DIR/'ensemble_model.json')
        lgb_model=lgb.Booster(model_file=str(MODEL_DIR/'lightgbm_totals.txt'))
        names=manifest['featureNames']
        if xgb_model.num_features()!=len(names) or xgb_model.feature_names!=names or lgb_model.feature_name()!=names:
            raise ValueError('FEATURE_ORDER_MISMATCH')
        ensemble=calibration['ensemble']
        # Validate every stored linear/neural dimension before advertising readiness.
        ridge([0.0]*len(names),ensemble['ridge'],ensemble['scaler'])
        mlp([0.0]*len(names),ensemble['mlp'],ensemble['scaler'])
        state={'ready':True,'manifest':manifest,'ensemble':ensemble,'xgb':xgb_model,'lgb':lgb_model,'xgb_module':xgb}
    except Exception:
        state={'ready':False,'reason':'ARTIFACT_INCOMPATIBLE'}

@asynccontextmanager
async def lifespan(app):
    load_models()
    yield

app=FastAPI(title='NioSports projection service',version=VERSION,lifespan=lifespan)

def authorize(key):
    if not ML_API_KEY:
        raise HTTPException(status_code=503,detail='SERVICE_AUTH_UNCONFIGURED')
    if not secrets.compare_digest(key,ML_API_KEY):
        raise HTTPException(status_code=401,detail='Invalid API key')

@app.get('/health')
async def health():
    return {'status':'ready' if state['ready'] else 'disabled','version':VERSION,
            'projectionAvailable':state['ready'],'probabilityAvailable':False,
            'periods':['FULL'] if state['ready'] else [],'reason':state.get('reason')}

@app.post('/predict')
@app.post('/predict-batch')
async def legacy_disabled(x_api_key: str=Header(default='')):
    authorize(x_api_key)
    raise HTTPException(status_code=410,detail='LEGACY_PREDICTION_DISABLED')

@app.post('/v1/project')
async def project(body:dict,x_api_key: str=Header(default='')):
    authorize(x_api_key)
    if not state['ready']:
        raise HTTPException(status_code=503,detail=state['reason'])
    try:
        values=feature_vector(body,state['manifest'])
        import numpy as np
        array=np.array([values],dtype=float)
        matrix=state['xgb_module'].DMatrix(array,feature_names=state['manifest']['featureNames'])
        ensemble=state['ensemble']
        predictions=[float(state['xgb'].predict(matrix)[0]),float(state['lgb'].predict(array)[0]),
                     ridge(values,ensemble['ridge'],ensemble['scaler']),
                     mlp(values,ensemble['mlp'],ensemble['scaler'])]
        return projection_response(body,state['manifest'],predictions)
    except (ValueError,KeyError,TypeError):
        raise HTTPException(status_code=422,detail='PROJECTION_CONTRACT_OR_ARTIFACT_INVALID')
    except Exception:
        raise HTTPException(status_code=503,detail='MODEL_EXECUTION_FAILED')
