"""python -m ml.experiments.run: fixture smoke report, never a model-selection report."""
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path
import warnings
from .fixtures import make_fixture
from .spec import CANDIDATES, SCENARIOS, specification
from .protocol import validate_dataset, partition
from .candidates import Candidate
from .stacking import fit_temporal_stack


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def smoke_report():
    data = make_fixture()
    rows = validate_dataset(data)
    ids = [r['id'] for r in rows]
    train, predict = partition(rows, ids[:120], ids[120:])
    reports, notices = [], []
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always')
        for scenario in SCENARIOS:
            for name in CANDIDATES:
                if scenario != 'all' and name in ('historical_mean', 'moving_mean'):
                    continue  # invariant references reported once
                first = Candidate(name, scenario).fit(train)
                values = first.predict(predict).tolist()
                second = Candidate(name, scenario).fit(train).predict(predict).tolist()
                if values != second:
                    raise ValueError(f'NONDETERMINISTIC: {name}/{scenario}')
                reports.append({'candidate': name, 'scenario': scenario,
                                'featureNames': list(first.names), 'predictionIds': ids[120:],
                                'predictions': values, 'predictionHash': digest(values), 'repeatEqual': True})
        folds = [{'train': ids[:end], 'predict': ids[end:end+20]} for end in (40,60,80,100)]
        stacks = []
        for scenario in SCENARIOS:
            result = fit_temporal_stack(data, folds, ids[:120], ids[120:], scenario)
            repeat = fit_temporal_stack(data, folds, ids[:120], ids[120:], scenario)
            if result != repeat:
                raise ValueError('NONDETERMINISTIC_STACK')
            stacks.append({'scenario': scenario, **result, 'repeatEqual': True})
        notices = sorted({f'{w.category.__name__}: {w.message}' for w in captured})
    spec = specification()
    root = Path(__file__).resolve().parents[2]
    sources = sorted(Path(__file__).parent.glob('*.py')) + [
        root/'ml/contracts/features.py', root/'ml/contracts/dictionary.json',
        Path(__file__).with_name('requirements.txt')]
    return {'purpose': 'SOFTWARE_FIXTURE_SMOKE_ONLY', 'origin': 'fixture',
            'specification': spec, 'specificationHash': digest(spec), 'fixtureHash': digest(data),
            'python': platform.python_version(), 'platform': platform.platform(),
            'dependencies': {p:importlib.metadata.version(p) for p in ('numpy','scipy','scikit-learn','xgboost','lightgbm','joblib','threadpoolctl')},
            'sourceHashes': {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
            'rows': len(rows), 'trainRows':120, 'predictionRows':24,
            'candidates': reports, 'stacks': stacks, 'warnings': notices,
            'selectedWinner': None, 'empiricalMetrics': None, 'productionEnabled': False}


if __name__ == '__main__':
    print(json.dumps(smoke_report(), indent=2, allow_nan=False))
