"""Development comparison on explicit fixtures, never calibration or final test."""
import copy
import hashlib
import importlib.metadata
import json
import platform
import sys
from pathlib import Path
from ml.experiments.candidates import Candidate
from ml.experiments.fixtures import make_fixture
from ml.experiments.protocol import validate_dataset, partition
from ml.experiments.spec import CANDIDATES, SCENARIOS, specification, feature_names
from ml.experiments.stacking import fit_temporal_stack
from ml.validation.experiment import fixture_metadata, fixture_policy
from ml.validation.temporal import plan, walk_forward, digest
from .comparison import POLICY, paired
from .metrics import VERSION, regression, coverage


def configurations():
    return [(name, scenario) for scenario in SCENARIOS for name in (*CANDIDATES, 'stacking')
            if scenario == 'all' or name not in ('historical_mean','moving_mean')]


def evaluate_fixture(data, *, cases=None, progress=False):
    policy = fixture_policy()
    meta = fixture_metadata(data)
    manifest = plan(meta, policy)
    permitted = set(manifest['partitions']['train'] + manifest['partitions']['validation'])
    # No copying, hashing or validating calibration/reserved values.
    dev = {**data, 'rows':[copy.deepcopy(r) for r in data['rows'] if r['id'] in permitted]}
    rows = validate_dataset(dev)
    by_id = {r['id']:r for r in rows}
    cases = configurations() if cases is None else cases
    if not cases or len(set(cases)) != len(cases) or any(c not in configurations() for c in cases):
        raise ValueError('INVALID_EXPERIMENT_MATRIX')
    results = []
    for case_index, (name, scenario) in enumerate(cases):
        observations, receipts = [], []
        for fold_index, fold in enumerate(manifest['validationFolds']):
            train, held = partition(rows, fold['train'], fold['predict'])
            extra = {}
            if name == 'stacking':
                train_set = set(fold['train'])
                nested = walk_forward([r for r in meta if r['id'] in train_set],
                                      initial_groups=policy['initialGroups'], block_groups=policy['blockGroups'],
                                      gap_hours=policy['gapHours'])
                # A new inner OOF fit for EACH outer validation fold.
                stack = fit_temporal_stack(dev,nested,fold['train'],fold['predict'],scenario)
                values = stack['predictions']
                extra = {'innerOOF':stack}
            else:
                fitted = Candidate(name, scenario).fit(train)
                values = fitted.predict(held).tolist()
            batch = [{'id':r['id'],'target':r['target'],'prediction':v,'block':f'fold-{fold_index}'}
                     for r,v in zip(held, values, strict=True)]
            observations.extend(batch)
            receipts.append({**fold,'trainHash':digest(train),'metrics':regression(batch),**extra})
        expected_ids = set(manifest['partitions']['validation'])
        if {r['id'] for r in observations} != expected_ids:
            raise ValueError('VALIDATION_COVERAGE_MISMATCH')
        results.append({'candidate':name,'scenario':scenario,
                        'featureNames':[] if name=='historical_mean' else list(feature_names('baseline' if name=='moving_mean' else scenario)),
                        'metrics':regression(observations),'observations':observations,
                        'folds':receipts,'predictionHash':digest(observations)})
        if progress:print(f'{case_index+1}/{len(cases)} {name}/{scenario}',file=sys.stderr,flush=True)
    indexed = {(r['candidate'],r['scenario']):r for r in results}
    for result in results:
        refs = {'historical':('historical_mean','all'), 'moving':('moving_mean','all'),
                'ridge':('ridge','all'), 'simpleTree':('simple_tree','all'),
                'sameCandidateAllFeatures':(result['candidate'],'all')}
        result['comparisons'] = {key:paired(result['observations'],indexed[ref]['observations'])
                                 for key,ref in refs.items() if ref in indexed}
    root = Path(__file__).resolve().parents[2]
    sources = sorted(p for d in ('evaluation','validation','experiments') for p in (root/'ml'/d).glob('*.py'))
    sources += [root/'ml/contracts/features.py',root/'ml/contracts/dictionary.json',root/'ml/experiments/requirements.txt']
    return {'purpose':'DEVELOPMENT_COMPARISON_SOFTWARE_FIXTURE_ONLY','origin':'fixture',
            'metricVersion':VERSION,'comparisonPolicy':POLICY,'configuration':specification(),
            'environment':{'python':platform.python_version(),'platform':platform.platform(),
                           'dependencies':{p:importlib.metadata.version(p) for p in
                                           ('numpy','scipy','scikit-learn','xgboost','lightgbm','joblib','threadpoolctl')}},
            'sourceHashes':{p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
            'developmentHash':digest(dev),'temporalPlan':manifest,
            'coverage':coverage([{'id':i,'dataAvailable':True,'decision':'predicted'}
                                 for i in manifest['partitions']['validation']]),
            'results':results,'calibrationValuesRead':False,'finalTestValuesRead':False,
            'probabilityMetrics':{'status':'UNAVAILABLE_NO_ADMISSIBLE_DISTRIBUTION','values':None},
            'decisionMetrics':{'status':'UNAVAILABLE_NO_OBSERVED_PRICES_OR_TICKETS','values':None},
            'empiricalMetrics':None,'selectedWinner':None,'productionEnabled':False,
            'technicalDecision':'KEEP_CANDIDATES_UNSELECTED_UNTIL_ADMISSIBLE_DATA',
            'empiricalGate':'BLOCKED_BY_EVIDENCE'}


if __name__ == '__main__':
    print(json.dumps(evaluate_fixture(make_fixture(),progress=True),indent=2,allow_nan=False))
