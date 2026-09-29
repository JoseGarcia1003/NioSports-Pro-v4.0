"""Projection-only service boundary. No odds, probabilities, picks or fallbacks."""
import hashlib
import json
import math
from pathlib import Path
from ml.contracts.features import FEATURE_NAMES, DICTIONARY, derive_features

VERSION = 'prediction-chain-1'
FILES = ('ensemble_model.json', 'lightgbm_totals.txt', 'calibration.json')


def artifact_hash(manifest):
    return hashlib.sha256(''.join(manifest['files'][name] for name in FILES).encode('ascii')).hexdigest()


def validate_manifest(manifest, directory):
    if (manifest.get('version') != VERSION or manifest.get('modelId') != 'nba-legacy-ensemble-projection-1'
        or manifest.get('period') != 'FULL' or manifest.get('validation') != 'experimental'
        or manifest.get('featureNames') != FEATURE_NAMES
        or manifest.get('featureRecipeVersion') != DICTIONARY['featureRecipeVersion']
        or set(manifest.get('files', {})) != set(FILES)):
        raise ValueError('ARTIFACT_INCOMPATIBLE')
    for name in FILES:
        path = Path(directory) / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != manifest['files'][name]:
            raise ValueError('ARTIFACT_HASH_MISMATCH')
    if manifest.get('artifactHash') != artifact_hash(manifest):
        raise ValueError('ARTIFACT_HASH_MISMATCH')
    return manifest


def feature_vector(body, manifest):
    allowed = {'version','modelId','snapshotHash','eventId','period','featureRecipeVersion','featureNames','values'}
    if (not isinstance(body,dict) or set(body) != allowed or body['version'] != VERSION
        or body['modelId'] != manifest['modelId'] or body['period'] != 'FULL'
        or body['featureRecipeVersion'] != DICTIONARY['featureRecipeVersion']
        or body['featureNames'] != FEATURE_NAMES
        or not isinstance(body['eventId'],str) or not body['eventId'] or len(body['eventId'])>150
        or not isinstance(body['snapshotHash'],str) or len(body['snapshotHash'])!=64
        or any(c not in '0123456789abcdef' for c in body['snapshotHash'])):
        raise ValueError('PROJECTION_CONTRACT_REQUIRED')
    values = body['values']
    if not isinstance(values,list) or len(values)!=len(FEATURE_NAMES):
        raise ValueError('FEATURE_DIMENSION_MISMATCH')
    validated = derive_features(dict(zip(FEATURE_NAMES,values)))
    return [validated[name] for name in FEATURE_NAMES]


def numbers(values):
    if not isinstance(values,list) or not values or any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in values):
        raise ValueError('INVALID_NUMERIC_ARTIFACT')
    return values


def scaled(values, scaler):
    mean, scale = numbers(scaler['mean']), numbers(scaler['scale'])
    numbers(values)
    if len(values)!=len(mean) or len(values)!=len(scale) or any(s<=0 for s in scale):
        raise ValueError('FEATURE_DIMENSION_MISMATCH')
    return [(x-m)/s for x,m,s in zip(values,mean,scale)]


def ridge(values, params, scaler):
    x, coef = scaled(values,scaler), numbers(params['coef'])
    numbers([params['intercept']])
    if len(x)!=len(coef): raise ValueError('RIDGE_DIMENSION_MISMATCH')
    return sum(a*b for a,b in zip(x,coef))+params['intercept']


def mlp(values, params, scaler):
    hidden = scaled(values,scaler)
    matrices, biases = params['coefs'], params['intercepts']
    if not matrices or len(matrices)!=len(biases): raise ValueError('MLP_DIMENSION_MISMATCH')
    for index,(weights,bias) in enumerate(zip(matrices,biases)):
        numbers(bias)
        if len(weights)!=len(hidden): raise ValueError('MLP_DIMENSION_MISMATCH')
        for row in weights:
            numbers(row)
            if len(row)!=len(bias): raise ValueError('MLP_DIMENSION_MISMATCH')
        hidden = [sum(hidden[i]*weights[i][j] for i in range(len(hidden)))+bias[j] for j in range(len(bias))]
        if index<len(matrices)-1: hidden=[max(0,x) for x in hidden]
    if len(hidden)!=1 or not math.isfinite(hidden[0]): raise ValueError('INVALID_PROJECTION')
    return hidden[0]


def projection_response(body, manifest, predictions):
    numbers(predictions)
    if len(predictions)!=4 or any(x<0 for x in predictions): raise ValueError('INCOMPLETE_ENSEMBLE')
    mean=sum(predictions)/len(predictions)
    if not math.isfinite(mean): raise ValueError('INVALID_PROJECTION')
    return {'version':VERSION,'stage':'projection','eventId':body['eventId'],'snapshotHash':body['snapshotHash'],
            'period':'FULL','modelId':manifest['modelId'],'artifactHash':manifest['artifactHash'],
            'validation':'experimental','value':{'mean':mean}}
