"""Fixture execution of a temporal plan, including immutable calibration receipts.

No probability calibrator, real-data admission, production export or final-test access.
"""
import copy
import hashlib
import pickle
import importlib.metadata
import platform
from pathlib import Path
from ml.experiments.candidates import Candidate
from ml.experiments.fixtures import make_fixture
from ml.experiments.protocol import validate_dataset
from ml.experiments.spec import specification
from ml.experiments.stacking import fit_temporal_stack
from .temporal import plan, digest, iso


def fixture_metadata(data):
    if data.get('origin')!='fixture':
        raise ValueError('FIXTURE_ONLY')
    return [{'id':r['id'],'group':iso(r['asOf'])[:10], 'asOf':r['asOf'],
             'featuresAvailableAt':r['asOf'],'labelAvailableAt':r['labelAvailableAt']} for r in data['rows']]


def fixture_policy():
    return {'trainEnd':'2020-03-01T00:00:00Z', 'validationEnd':'2020-04-10T00:00:00Z',
            'calibrationEnd':'2020-05-04T00:00:00Z', 'evaluationAsOf':'2020-05-24T00:00:00Z',
            'gapHours':24,'initialGroups':20,'blockGroups':10}


class FrozenProjection:
    """No refit API. Mutation of the internal fitted object invalidates its receipt."""
    def __init__(self, candidate, train_rows, plan_hash, calibration_rows):
        self._model = candidate
        self.train_ids = tuple(r['id'] for r in train_rows)
        self.plan_hash = plan_hash
        self.train_hash = digest(train_rows)
        self.model_hash = self._hash()
        self.calibration_ids = tuple(r['id'] for r in calibration_rows)
        self.input_hash = self._inputs(calibration_rows)

    @staticmethod
    def _inputs(rows):
        return digest([{k:r[k] for k in ('id','asOf','features','labelAvailableAt')} for r in rows])

    def _hash(self):
        return hashlib.sha256(pickle.dumps(self._model, protocol=5)).hexdigest()

    def predict(self, rows):
        if self._hash()!=self.model_hash:
            raise ValueError('MODEL_CHANGED_RECALIBRATION_REQUIRED')
        if set(r['id'] for r in rows) & set(self.train_ids):
            raise ValueError('CALIBRATION_TRAIN_OVERLAP')
        if tuple(r['id'] for r in rows)!=self.calibration_ids or self._inputs(rows)!=self.input_hash:
            raise ValueError('CALIBRATION_SCOPE_MISMATCH_FINAL_TEST_LOCKED')
        values=self._model.predict(rows).tolist()
        if self._hash()!=self.model_hash:
            raise ValueError('MODEL_MUTATED_DURING_PREDICTION')
        return {'modelHash':self.model_hash,'trainingHash':self.train_hash,'planHash':self.plan_hash,
                'predictionIds':[r['id'] for r in rows],'predictions':values}

    def bind_calibration(self, receipt, rows):
        if (self._hash()!=self.model_hash or receipt.get('modelHash')!=self.model_hash
                or receipt.get('trainingHash')!=self.train_hash or receipt.get('planHash')!=self.plan_hash):
            raise ValueError('MODEL_CHANGED_RECALIBRATION_REQUIRED')
        expected=self.predict(rows)
        if receipt!=expected:
            raise ValueError('CALIBRATION_RECEIPT_MISMATCH')
        # This binds an independent data batch for F7; it does NOT fit a calibrator.
        return {**receipt,'labelIds':[r['id'] for r in rows],
                'labelsHash':digest([r['target'] for r in rows]),
                'calibratorFitted':False,'status':'INDEPENDENT_BATCH_PREPARED_NOT_CALIBRATED'}


def execute_fixture(data, policy, name='ridge', scenario='all'):
    manifest=plan(fixture_metadata(data),policy)
    # Do not validate/read target or features from reserved events at all.
    roles=manifest['partitions']
    included=set(roles['train']+roles['validation']+roles['calibration'])
    development={**data,'rows':[copy.deepcopy(r) for r in data['rows'] if r['id'] in included]}
    rows=validate_dataset(development)
    by_id={r['id']:r for r in rows}
    take=lambda ids:[by_id[i] for i in ids]
    validation=[]
    for fold in manifest['validationFolds']:
        train, held=take(fold['train']),take(fold['predict'])
        fitted=Candidate(name,scenario).fit(train)
        # Read only input variables in held-out rows. Candidate.predict ignores their labels.
        validation.append({**fold,'predictions':fitted.predict(held).tolist(),
                           'trainDataHash':digest(train), 'featureNames':list(fitted.names)})
    train=take(manifest['finalTrain'])
    calibration=take(roles['calibration'])
    model=FrozenProjection(Candidate(name,scenario).fit(train),train,manifest['planHash'],calibration)
    predictions=model.predict(calibration)
    batch=model.bind_calibration(predictions,calibration)
    # F4 stacking consumes automatically generated F5 folds. Calibrating this stack is F7.
    stack=fit_temporal_stack(development,manifest['oofFolds'],manifest['finalTrain'],roles['calibration'],scenario)
    root=Path(__file__).resolve().parents[2]
    sources=sorted((root/'ml/validation').glob('*.py'))+sorted((root/'ml/experiments').glob('*.py'))+[
        root/'ml/contracts/features.py',root/'ml/contracts/dictionary.json',root/'ml/experiments/requirements.txt']
    return {'purpose':'TEMPORAL_SOFTWARE_FIXTURE_ONLY', 'manifest':manifest,
            'datasetVersion':data['version'],'developmentHash':digest(development),
            'featureRecipeVersion':data['featureRecipeVersion'],
            'sourceHashes':{p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
            'environment':{'python':platform.python_version(),'platform':platform.platform(),
                           'dependencies':{p:importlib.metadata.version(p) for p in ('numpy','scipy','scikit-learn','xgboost','lightgbm')}},
            'candidate':name,'scenario':scenario,'configuration':specification(),
            'validation':validation,'calibration':batch,'stackCalibrationProjection':stack,
            'finalTestRead':False,'empiricalMetrics':None,'winner':None}, model


if __name__=='__main__':
    import json
    result,_=execute_fixture(make_fixture(),fixture_policy())
    print(json.dumps(result,indent=2,allow_nan=False))
