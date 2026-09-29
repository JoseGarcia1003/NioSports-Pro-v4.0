import ast
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from ml.contracts.projection import VERSION,FILES,validate_manifest,feature_vector,ridge,mlp,projection_response,artifact_hash
from ml.contracts.features import FEATURE_NAMES,DICTIONARY

ROOT=Path(__file__).resolve().parents[2]
REFERENCE=json.loads((ROOT/'tests/fixtures/nba-contract-vector.json').read_text())

def manifest():
    result={'version':VERSION,'modelId':'nba-legacy-ensemble-projection-1','period':'FULL',
            'validation':'experimental','featureNames':FEATURE_NAMES,
            'featureRecipeVersion':DICTIONARY['featureRecipeVersion'],'files':{name:hashlib.sha256(b'fixture').hexdigest() for name in FILES}}
    result['artifactHash']=artifact_hash(result)
    return result

def request():
    return {'version':VERSION,'modelId':manifest()['modelId'],'snapshotHash':'a'*64,'eventId':'game-1','period':'FULL',
            'featureRecipeVersion':DICTIONARY['featureRecipeVersion'],'featureNames':FEATURE_NAMES,
            'values':[REFERENCE['expected'][name] for name in FEATURE_NAMES]}

class ProjectionArchitectureTests(unittest.TestCase):
    def test_accepts_exact_vector_only(self):
        body=request();self.assertEqual(feature_vector(body,manifest()),body['values'])
        for key,value in [('values',body['values'][:-1]),('featureNames',list(reversed(FEATURE_NAMES))),('period','Q1'),('line',220),('snapshotHash','bad')]:
            invalid={**body,key:value}
            with self.assertRaises(ValueError):feature_vector(invalid,manifest())
    def test_manifest_requires_every_artifact_and_exact_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in FILES:(Path(directory)/name).write_bytes(b'fixture')
            self.assertEqual(validate_manifest(manifest(),directory)['period'],'FULL')
            (Path(directory)/FILES[1]).write_bytes(b'changed')
            with self.assertRaises(ValueError):validate_manifest(manifest(),directory)
    def test_ridge_does_not_pad_or_trim(self):
        scaler={'mean':[1,2],'scale':[2,4]};params={'coef':[3,4],'intercept':5}
        self.assertEqual(ridge([3,6],params,scaler),12)
        for values in [[1],[1,2,3]]:
            with self.assertRaises(ValueError):ridge(values,params,scaler)
        with self.assertRaises(ValueError):ridge([1,2],params,{'mean':[1,2],'scale':[1,0]})
    def test_mlp_does_not_substitute_missing_neurons_or_outputs(self):
        params={'coefs':[[[1],[2]]],'intercepts':[[3]]};scaler={'mean':[0,0],'scale':[1,1]}
        self.assertEqual(mlp([4,5],params,scaler),17)
        for bad in [{'coefs':[[[1]]],'intercepts':[[3]]},{'coefs':[],'intercepts':[]},{'coefs':[[[1,2],[3,4]]],'intercepts':[[1,2]]}]:
            with self.assertRaises(ValueError):mlp([4,5],bad,scaler)
    def test_projection_has_no_probability_or_commercial_fields(self):
        result=projection_response(request(),manifest(),[210,220,230,240])
        self.assertEqual(result['value'],{'mean':225})
        for key in ['line','probability','ev','confidence','direction','stake']:self.assertNotIn(key,result)
        for incomplete in [[220,230],[220,230,240,float('nan')]]:
            with self.assertRaises(ValueError):projection_response(request(),manifest(),incomplete)
    def test_service_stays_disabled_without_manifest_before_importing_ml_libraries(self):
        tree=ast.parse((ROOT/'ml/api/main.py').read_text(encoding='utf-8-sig'))
        function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='load_models')
        with tempfile.TemporaryDirectory() as directory:
            scope={'MODEL_DIR':Path(directory),'state':{'ready':True}}
            exec(compile(ast.Module(body=[function],type_ignores=[]),'load_models','exec'),scope)
            scope['load_models']()
            self.assertEqual(scope['state'],{'ready':False,'reason':'MODEL_UNAVAILABLE'})

if __name__=='__main__':unittest.main()
