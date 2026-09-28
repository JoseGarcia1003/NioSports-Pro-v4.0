import ast
import hashlib
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from ml.contracts.features import derive_features,add_legacy_interactions,FEATURE_NAMES,DICTIONARY
REFERENCE=json.loads((ROOT/'tests/fixtures/nba-contract-vector.json').read_text())
spec=importlib.util.spec_from_file_location('data_audit',ROOT/'scripts/audit-data-contract.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class DataContractTests(unittest.TestCase):
    def test_shared_vector_reference(self):
        self.assertEqual(derive_features(REFERENCE['input']),REFERENCE['expected'])
    def test_artifact_feature_order(self):
        calibration=json.loads((ROOT/'ml/models/calibration.json').read_text())
        self.assertEqual(FEATURE_NAMES,calibration['feature_cols'])
    def test_invalid_numeric_and_missing_features(self):
        for bad in [None,'225',True,float('nan'),float('inf'),-1]:
            values=dict(REFERENCE['input']);values['home_total_l5']=bad
            with self.assertRaises(ValueError):derive_features(values)
        values=dict(REFERENCE['input']);values.pop('home_std')
        with self.assertRaises(ValueError):derive_features(values)
    def test_derived_override_rejected(self):
        for bad in [None,'440',float('nan'),441]:
            with self.assertRaises(ValueError):derive_features({**REFERENCE['input'],'total_sum_l5':bad})
    def test_rest_inconsistency(self):
        with self.assertRaises(ValueError):derive_features({**REFERENCE['input'],'is_b2b_home':0})
    def test_api_uses_same_recipe_without_loading_models_or_services(self):
        tree=ast.parse((ROOT/'ml/api/main.py').read_text(encoding='utf-8-sig'))
        func=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='build_features')
        namespace={'PredictRequest':object,'ALTITUDE_TEAMS':{},'add_legacy_interactions':add_legacy_interactions}
        exec(compile(ast.Module(body=[func],type_ignores=[]),'api_feature_function','exec'),namespace)
        home=SimpleNamespace(name='fixture-home',total_l5=225,total_l10=224,total_l20=223,home_avg=226,std=12,rest_days=0,is_b2b=True)
        away=SimpleNamespace(name='fixture-away',total_l5=215,total_l10=218,total_l20=219,away_avg=216,std=10,rest_days=2,is_b2b=False)
        result=namespace['build_features'](SimpleNamespace(home_team=home,away_team=away,days_into_season=100))
        self.assertEqual(result,REFERENCE['expected'])
    def test_interactions_compatible_for_bounded_and_unbounded_rest(self):
        for home in [0,1,2,7,12]:
            for away in [0,1,2,7,20]:
                base={**REFERENCE['expected'],'home_rest_days':min(home,7),'away_rest_days':min(away,7),'is_b2b_home':int(home==0),'is_b2b_away':int(away==0)}
                result=add_legacy_interactions(base)
                self.assertEqual(result['both_rested'],int(home>=2 and away>=2))
                self.assertEqual(result['both_b2b'],int(home==0 and away==0))
                self.assertEqual(result['total_rest'],min(home,7)+min(away,7))
    def test_legacy_csv_quarantined_and_preserved(self):
        path=ROOT/'ml/data/nba_features.csv';before=hashlib.sha256(path.read_bytes()).hexdigest()
        result=audit.assess(path)
        self.assertEqual(result['rows'],5999)
        self.assertEqual(result['eligible_strict_training_rows'],0)
        self.assertEqual(result['quarantined_rows'],5999)
        self.assertFalse(result['market_line_present'])
        self.assertEqual(before,hashlib.sha256(path.read_bytes()).hexdigest())
    def test_archived_trainers_stop_before_dependency_imports_or_writes(self):
        for script in ['ml/train/train_model.py','ml/train/train_v3.py','ml/train/train_ensemble.py','ml/data/feature_engineering.py']:
            p=subprocess.run([sys.executable,str(ROOT/script)],cwd=ROOT,capture_output=True,text=True,timeout=10)
            self.assertNotEqual(p.returncode,0)
            self.assertIn('LEGACY_DATA_QUARANTINED',p.stderr)
    def test_dictionary_documentation_matches_machine_definition(self):
        p=subprocess.run([sys.executable,str(ROOT/'scripts/render-data-dictionary.py'),'--check'],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(p.returncode,0,p.stderr)
    def test_no_unversioned_feature_formulas_in_current_api(self):
        tree=ast.parse((ROOT/'ml/api/main.py').read_text(encoding='utf-8-sig'))
        func=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='build_features')
        self.assertTrue(any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='add_legacy_interactions' for n in ast.walk(func)))

if __name__=='__main__':unittest.main()
