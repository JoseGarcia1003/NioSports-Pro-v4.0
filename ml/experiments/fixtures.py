"""Deterministic fictional events. NEVER a sample of the NBA population."""
from datetime import datetime, timedelta, timezone
import random
from ml.contracts.features import derive_features, FEATURE_NAMES, DICTIONARY
from .spec import SEED, VERSION


def make_fixture(n=144):
    rng = random.Random(SEED)
    start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    rows = []
    for i in range(n):
        values = {}
        for side in ('home', 'away'):
            center = 215 + rng.uniform(-18, 18)
            for window in (5, 10, 20):
                values[f'{side}_total_l{window}'] = center + rng.uniform(-10, 10)
            values[f'{side}_{side}_avg'] = center + rng.uniform(-8, 8)
            values[f'{side}_std'] = rng.uniform(8, 20)
            values[f'{side}_rest_days'] = rng.randrange(5)
            values[f'is_b2b_{side}'] = int(values[f'{side}_rest_days'] == 0)
        values.update(rest_diff=values['home_rest_days']-values['away_rest_days'],
                      altitude_ft=(5280 if i % 5 == 0 else 0), days_into_season=i)
        features = derive_features(values)
        # Arbitrary test relationship, deliberately not a sports simulation or backtest.
        target = round((features['home_total_l20']+features['away_total_l20'])/2
                       + 0.1*features['momentum_5v10'] + rng.uniform(-5, 5))
        as_of = start + timedelta(days=i)
        rows.append({'id': f'fixture-game-{i:04}', 'asOf': as_of.isoformat(),
                     'labelAvailableAt': (as_of+timedelta(hours=4)).isoformat(),
                     'features': features, 'target': target})
    return {'version': VERSION, 'origin': 'fixture', 'period': 'FULL',
            'dataContractVersion': DICTIONARY['version'],
            'featureRecipeVersion': DICTIONARY['featureRecipeVersion'],
            'featureNames': FEATURE_NAMES.copy(), 'rows': rows}
