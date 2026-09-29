"""Fixture-only boundary and caller-supplied fold checks. F5 owns real splitting."""
from datetime import datetime
import math
from ml.contracts.features import FEATURE_NAMES, DICTIONARY, derive_features
from .spec import VERSION


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.utcoffset() is None:
        raise ValueError('TIMEZONE_REQUIRED')
    return parsed


def validate_dataset(data):
    if (data.get('version') != VERSION or data.get('origin') != 'fixture'
            or data.get('period') != 'FULL' or data.get('featureNames') != FEATURE_NAMES
            or data.get('dataContractVersion') != DICTIONARY['version']
            or data.get('featureRecipeVersion') != DICTIONARY['featureRecipeVersion']):
        raise ValueError('FIXTURE_CONTRACT_REQUIRED')
    rows = data['rows']
    if not rows:
        raise ValueError('EMPTY_DATASET')
    ids = set()
    for row in rows:
        if set(row) != {'id', 'asOf', 'labelAvailableAt', 'features', 'target'}:
            raise ValueError('ROW_FIELDS_INVALID')
        if not isinstance(row['id'], str) or not row['id'].startswith('fixture-') or row['id'] in ids:
            raise ValueError('INVALID_OR_DUPLICATE_EVENT')
        ids.add(row['id'])
        if set(row['features']) != set(FEATURE_NAMES):
            raise ValueError('FEATURE_SET_MISMATCH')
        derive_features(row['features'])
        f = row['features']
        if f['rest_diff'] != f['home_rest_days']-f['away_rest_days']:
            raise ValueError('REST_DIFFERENCE_MISMATCH')
        y = row['target']
        if isinstance(y, bool) or not isinstance(y, (int,float)) or not math.isfinite(y) or y < 0 or int(y) != y:
            raise ValueError('INVALID_FINAL_POINTS')
        if timestamp(row['labelAvailableAt']) <= timestamp(row['asOf']):
            raise ValueError('LABEL_TIME_INVALID')
    return rows


def partition(rows, train_ids, predict_ids):
    if not train_ids or not predict_ids or len(set(train_ids)) != len(train_ids) or len(set(predict_ids)) != len(predict_ids):
        raise ValueError('EMPTY_OR_DUPLICATE_PARTITION')
    if set(train_ids) & set(predict_ids):
        raise ValueError('TRAIN_PREDICT_OVERLAP')
    by_id = {r['id']:r for r in rows}
    if not (set(train_ids) | set(predict_ids)) <= set(by_id):
        raise ValueError('UNKNOWN_EVENT')
    train, predict = [by_id[i] for i in train_ids], [by_id[i] for i in predict_ids]
    if max(timestamp(r['labelAvailableAt']) for r in train) >= min(timestamp(r['asOf']) for r in predict):
        raise ValueError('TEMPORAL_LEAKAGE')
    return train, predict
