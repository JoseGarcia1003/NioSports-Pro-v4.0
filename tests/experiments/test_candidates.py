import copy
import unittest
from unittest.mock import patch
import numpy as np
from ml.contracts.features import FEATURE_NAMES, FEATURES
from ml.experiments.spec import GROUPS, SCENARIOS, CANDIDATES, feature_names
from ml.experiments.fixtures import make_fixture
from ml.experiments.candidates import Candidate, estimator
from ml.experiments.protocol import validate_dataset, partition
from ml.experiments.stacking import fit_temporal_stack


class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.data = make_fixture()
        self.rows = validate_dataset(self.data)
        self.ids = [r['id'] for r in self.rows]
        self.train, self.predict = self.rows[:120], self.rows[120:]
        self.folds = [{'train':self.ids[:end], 'predict':self.ids[end:end+20]} for end in (40,60,80,100)]

    def test_fixture_is_reproducible_and_explicit(self):
        self.assertEqual(self.data, make_fixture())
        self.assertEqual(self.data['origin'], 'fixture')

    def test_all_26_features_covered_once_by_base_or_recipe(self):
        base = [n for names in GROUPS.values() for n in names]
        self.assertEqual(len(base), len(set(base)))
        derived = [v['name'] for v in FEATURES if 'derive' in v]
        self.assertEqual(set(base) | set(derived), set(FEATURE_NAMES))
        self.assertFalse(set(base) & set(derived))
        self.assertEqual(feature_names('all'), tuple(FEATURE_NAMES))

    def test_ablations_do_not_reintroduce_removed_information(self):
        for scenario in SCENARIOS:
            names = feature_names(scenario)
            for v in FEATURES:
                if v['name'] in names and 'derive' in v:
                    self.assertTrue(set(v['derive']['args']) <= set(names))
        for n in ('total_sum_l5', 'total_diff_l5', 'momentum_5v10'):
            self.assertNotIn(n, feature_names('without_short'))
        for n in ('total_rest', 'both_rested', 'both_b2b', 'rest_diff'):
            self.assertNotIn(n, feature_names('without_rest'))

    def test_fixture_only_boundary_rejects_real_data_and_wrong_order(self):
        for key, value in [('origin','observed'), ('period','Q1'), ('featureNames',list(reversed(FEATURE_NAMES)))]:
            with self.assertRaises(ValueError): validate_dataset({**self.data, key:value})

    def test_bad_target_future_label_and_duplicate_rejected(self):
        for mutate in (lambda d: d['rows'][0].update(target=True),
                       lambda d: d['rows'][0].update(target=float('nan')),
                       lambda d: d['rows'][0].update(labelAvailableAt=d['rows'][0]['asOf']),
                       lambda d: d['rows'][1].update(id=d['rows'][0]['id']),
                       lambda d: d['rows'][0]['features'].update(rest_diff=77),
                       lambda d: d['rows'][0]['features'].update(momentum_5v10=999)):
            bad=copy.deepcopy(self.data);mutate(bad)
            with self.assertRaises(ValueError): validate_dataset(bad)

    def test_temporal_partition_uses_label_availability(self):
        partition(self.rows, self.ids[:120], self.ids[120:])
        for a,b in [(self.ids[:10],self.ids[:2]), (self.ids[20:30],self.ids[:10]),
                    (self.ids[:2]*2,self.ids[10:]), (['missing'],self.ids[10:])]:
            with self.assertRaises(ValueError): partition(self.rows,a,b)
        late=copy.deepcopy(self.rows);late[0]['labelAvailableAt']=late[121]['asOf']
        with self.assertRaisesRegex(ValueError,'TEMPORAL'): partition(late,self.ids[:120],self.ids[120:])

    def test_historical_reference_only_uses_train_labels(self):
        model=Candidate('historical_mean').fit(self.train)
        expected=np.mean([r['target'] for r in self.train])
        np.testing.assert_allclose(model.predict(self.predict),expected)
        changed=copy.deepcopy(self.predict)
        for r in changed:r['target']=9999
        np.testing.assert_array_equal(model.predict(changed),model.predict(self.predict))

    def test_moving_reference_averages_combined_totals_without_doubling(self):
        expected=[(r['features']['home_total_l20']+r['features']['away_total_l20'])/2 for r in self.predict]
        np.testing.assert_allclose(Candidate('moving_mean').fit(self.train).predict(self.predict),expected)

    def test_ridge_scaler_fit_on_training_only(self):
        candidate=Candidate('ridge','baseline').fit(self.train)
        scaler=candidate.model.steps[0][1]
        expected=np.mean([[r['features'][n] for n in candidate.names] for r in self.train],axis=0)
        np.testing.assert_allclose(scaler.mean_,expected)
        before=scaler.mean_.copy()
        candidate.predict(self.predict)
        np.testing.assert_array_equal(scaler.mean_,before)

    def test_all_candidates_execute_and_repeat(self):
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                a=Candidate(name).fit(self.train).predict(self.predict)
                b=Candidate(name).fit(self.train).predict(self.predict)
                self.assertEqual(a.shape,(24,))
                np.testing.assert_array_equal(a,b)

    def test_holdout_labels_do_not_change_stack_predictions(self):
        before=fit_temporal_stack(self.data,self.folds,self.ids[:120],self.ids[120:])
        changed=copy.deepcopy(self.data)
        for row in changed['rows'][120:]:row['target']+=100
        after=fit_temporal_stack(changed,self.folds,self.ids[:120],self.ids[120:])
        self.assertEqual(before,after)
        self.assertEqual(len(before['oofIds']),80)
        self.assertFalse(set(before['oofIds']) & set(self.ids[120:]))

    def test_stack_rejects_insample_and_evaluation_contamination(self):
        bad_folds=[[], [{'train':self.ids[:50],'predict':self.ids[40:60]}],
                   [{'train':self.ids[:40],'predict':self.ids[120:]}], self.folds+[self.folds[0]]]
        for folds in bad_folds:
            with self.assertRaises(ValueError): fit_temporal_stack(self.data,folds,self.ids[:120],self.ids[120:])

    def test_input_data_not_mutated(self):
        before=copy.deepcopy(self.data)
        Candidate('ridge').fit(self.train).predict(self.predict)
        self.assertEqual(before,self.data)

    def test_ensemble_does_not_silently_drop_failing_member(self):
        def fail(name):
            if name=='lightgbm':raise RuntimeError('fixture member unavailable')
            return estimator(name)
        model=Candidate('mean_ensemble')
        with patch('ml.experiments.candidates.estimator',side_effect=fail):
            with self.assertRaises(RuntimeError):model.fit(self.train)
        with self.assertRaisesRegex(ValueError,'NOT_FITTED'):model.predict(self.predict)

    def test_unknown_candidate_does_not_fall_back(self):
        with self.assertRaises(KeyError):Candidate('unknown').fit(self.train)

    def test_removed_group_cannot_change_ridge_prediction(self):
        candidate=Candidate('ridge','without_rest').fit(self.train)
        changed=copy.deepcopy(self.predict)
        for row in changed:
            for name in ('home_rest_days','away_rest_days','is_b2b_home','is_b2b_away',
                         'rest_diff','total_rest','both_rested','both_b2b'):
                row['features'][name]=9999  # internal adapter must never read removed columns
        np.testing.assert_array_equal(candidate.predict(changed),candidate.predict(self.predict))

    def test_mlp_scales_target_from_train_only(self):
        candidate=Candidate('mlp').fit(self.train)
        expected=np.mean([r['target'] for r in self.train])
        self.assertAlmostEqual(candidate.model.transformer_.mean_[0],expected)

    def test_ensemble_is_arithmetic_mean_of_all_members(self):
        model=Candidate('mean_ensemble').fit(self.train)
        expected=np.mean([m.predict(self.predict) for m in model.members],axis=0)
        np.testing.assert_array_equal(model.predict(self.predict),expected)

    def test_oof_receipt_can_be_reproduced_without_heldout_targets(self):
        result=fit_temporal_stack(self.data,self.folds,self.ids[:120],self.ids[120:])
        receipt=result['folds'][0]
        earlier,heldout=partition(self.rows,receipt['trainIds'],receipt['predictionIds'])
        self.assertLess(receipt['trainedThrough'],receipt['predictionFrom'])
        for row in heldout:row['target']+=100
        expected=np.column_stack([Candidate(n).fit(earlier).predict(heldout) for n in result['baseModels']])
        np.testing.assert_array_equal(expected,receipt['predictions'])


if __name__=='__main__':unittest.main()
