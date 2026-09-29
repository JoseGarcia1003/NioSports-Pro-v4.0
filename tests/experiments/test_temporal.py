import copy
import unittest
from ml.experiments.fixtures import make_fixture
from ml.validation.temporal import plan, metadata, walk_forward
from ml.validation.experiment import execute_fixture, fixture_metadata, fixture_policy


class TemporalTests(unittest.TestCase):
    def setUp(self):
        self.data=make_fixture()
        self.meta=fixture_metadata(self.data)
        self.policy=fixture_policy()

    def test_disjoint_exhaustive_partitions_and_locked_final(self):
        m=plan(self.meta,self.policy)
        ids=[i for group in m['partitions'].values() for i in group]
        self.assertEqual(len(ids),144)
        self.assertEqual(len(set(ids)),144)
        self.assertEqual([len(v) for v in m['partitions'].values()],[60,40,24,20])
        self.assertTrue(m['testFinal']['locked'])
        self.assertEqual(m['testFinal']['status'],'UNAVAILABLE_INDEPENDENT_DATA')

    def test_order_and_timezone_equivalence_do_not_change_plan(self):
        same=copy.deepcopy(self.meta)
        same[0]['asOf']='2019-12-31T19:00:00-05:00'
        same[0]['featuresAvailableAt']=same[0]['asOf']
        self.assertEqual(plan(same[::-1],self.policy),plan(self.meta,self.policy))

    def test_future_features_duplicate_and_naive_time_rejected(self):
        for key,value in [('featuresAvailableAt',self.meta[1]['asOf']),('asOf','2020-01-01T00:00:00')]:
            bad=copy.deepcopy(self.meta);bad[0][key]=value
            with self.assertRaises(ValueError):plan(bad,self.policy)
        with self.assertRaises(ValueError):plan(self.meta+[self.meta[0]],self.policy)

    def test_invalid_policy_rejected(self):
        for key,value in [('gapHours',-1),('gapHours',float('nan')),('blockGroups',True),
                          ('initialGroups',1),('trainEnd',self.policy['calibrationEnd'])]:
            with self.assertRaises(ValueError):plan(self.meta,{**self.policy,key:value})

    def test_group_crossing_boundary_is_excluded_whole(self):
        self.meta[59]['group']=self.meta[60]['group']='shared'
        result=plan(self.meta,self.policy)
        self.assertEqual(result['excluded'][0]['reason'],'GROUP_CROSSES_BOUNDARY')
        self.assertEqual(set(result['excluded'][0]['ids']),{self.meta[59]['id'],self.meta[60]['id']})

    def test_simultaneous_events_with_different_groups_stay_together(self):
        extra={**self.meta[65],'id':'fixture-other','group':'different'}
        m=plan(self.meta+[extra],self.policy)
        for fold in m['validationFolds']+m['oofFolds']:
            self.assertEqual(extra['id'] in fold['predict'],self.meta[65]['id'] in fold['predict'])

    def test_overlapping_group_is_not_partially_trained(self):
        self.meta[58]['group']=self.meta[65]['group']='spanning-days'
        m=plan(self.meta,self.policy)  # this group straddles train/validation, so excluded
        for fold in m['validationFolds']:
            self.assertNotIn(self.meta[58]['id'],fold['train'])
        self.meta=fixture_metadata(self.data)
        self.meta[62]['group']=self.meta[85]['group']='spanning-validation'
        m=plan(self.meta,self.policy)
        for fold in m['validationFolds']:
            self.assertEqual(self.meta[62]['id'] in fold['train'],self.meta[85]['id'] in fold['train'])

    def test_label_delay_and_embargo_remove_whole_training_group(self):
        m=plan(self.meta,self.policy)
        self.assertIn(self.meta[59]['id'],m['validationFolds'][0]['purged'])
        self.meta[0]['labelAvailableAt']='2020-04-20T00:00:00Z'
        m=plan(self.meta,self.policy)
        self.assertNotIn(self.meta[0]['id'],m['finalTrain'])

    def test_labels_unavailable_at_evaluation_are_not_used(self):
        self.meta[0]['labelAvailableAt']='2021-01-01T00:00:00Z'
        m=plan(self.meta,self.policy)
        self.assertEqual(m['excluded'][0]['reason'],'LABEL_NOT_AVAILABLE_AT_EVALUATION')

    def test_oof_train_is_strictly_earlier_and_never_final_or_calibration(self):
        m=plan(self.meta,self.policy)
        by_id={r['id']:r for r in self.meta}
        used=[]
        for fold in m['oofFolds']:
            self.assertFalse(set(fold['train']) & set(fold['predict']))
            self.assertTrue(set(fold['train']+fold['predict']) <= set(m['finalTrain']))
            self.assertLess(max(by_id[i]['labelAvailableAt'] for i in fold['train']),fold['fitBefore'])
            used.extend(fold['predict'])
        self.assertEqual(len(used),len(set(used)))

    def test_final_targets_and_features_are_never_read(self):
        baseline,_=execute_fixture(self.data,self.policy)
        poisoned=copy.deepcopy(self.data)
        for row in poisoned['rows'][124:]:
            row['target']=object();row['features']=object()
        result,_=execute_fixture(poisoned,self.policy)
        self.assertEqual(result,baseline)

    def test_calibration_label_changes_cannot_change_model_or_predictions(self):
        before,model=execute_fixture(self.data,self.policy)
        changed=copy.deepcopy(self.data)
        for row in changed['rows'][100:124]:row['target']+=100
        after,other=execute_fixture(changed,self.policy)
        self.assertEqual(model.model_hash,other.model_hash)
        self.assertEqual(before['calibration']['predictions'],after['calibration']['predictions'])
        self.assertEqual(before['stackCalibrationProjection'],after['stackCalibrationProjection'])
        self.assertNotEqual(before['calibration']['labelsHash'],after['calibration']['labelsHash'])

    def test_refit_invalidates_calibration_receipt(self):
        result,model=execute_fixture(self.data,self.policy)
        model._model.fit(self.data['rows'][:124])  # adversarial bypass of the public frozen interface
        with self.assertRaisesRegex(ValueError,'MODEL_CHANGED'):
            model.predict(self.data['rows'][100:124])

    def test_altered_receipt_and_overlap_rejected(self):
        _,model=execute_fixture(self.data,self.policy)
        rows=self.data['rows'][100:124]
        receipt=model.predict(rows);receipt['predictions'][0]+=1
        with self.assertRaisesRegex(ValueError,'RECEIPT'):model.bind_calibration(receipt,rows)
        with self.assertRaisesRegex(ValueError,'OVERLAP'):model.predict(self.data['rows'][:10])

    def test_insufficient_groups_and_observed_execution_fail_closed(self):
        with self.assertRaises(ValueError):walk_forward(self.meta[:3],initial_groups=4,block_groups=1,gap_hours=0)
        with self.assertRaises(ValueError):execute_fixture({**self.data,'origin':'observed'},self.policy)

    def test_reserved_test_cannot_be_used_as_calibration(self):
        _,model=execute_fixture(self.data,self.policy)
        with self.assertRaisesRegex(ValueError,'FINAL_TEST_LOCKED'):model.predict(self.data['rows'][124:])
        changed=copy.deepcopy(self.data['rows'][100:124]);changed[0]['features']['altitude_ft']+=1
        with self.assertRaisesRegex(ValueError,'SCOPE'):model.predict(changed)

    def test_all_candidate_families_obey_freeze_and_calibration_boundary(self):
        from ml.experiments.spec import CANDIDATES
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                result,model=execute_fixture(self.data,self.policy,name)
                self.assertEqual(model.model_hash,result['calibration']['modelHash'])
                self.assertFalse(result['calibration']['calibratorFitted'])

    def test_exact_embargo_boundary_is_excluded(self):
        self.meta[0]['labelAvailableAt']='2020-02-29T00:00:00Z'
        result=plan(self.meta,self.policy)
        self.assertNotIn(self.meta[0]['id'],result['validationFolds'][0]['train'])

    def test_final_scaler_uses_only_purged_training_rows(self):
        import numpy as np
        result,model=execute_fixture(self.data,self.policy)
        ids=set(result['manifest']['finalTrain'])
        expected=np.mean([[r['features'][n] for n in model._model.names]
                          for r in self.data['rows'] if r['id'] in ids],axis=0)
        np.testing.assert_allclose(model._model.model.steps[0][1].mean_,expected)


if __name__=='__main__':unittest.main()
