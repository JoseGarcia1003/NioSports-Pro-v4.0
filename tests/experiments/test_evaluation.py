import copy
import math
import unittest
from sklearn.metrics import mean_absolute_error, mean_squared_error, log_loss, brier_score_loss
from ml.evaluation.metrics import regression, probabilities, coverage, decisions
from ml.evaluation.comparison import paired
from ml.evaluation.run import evaluate_fixture, configurations
from ml.experiments.fixtures import make_fixture
from ml.validation.experiment import fixture_metadata, fixture_policy
from ml.validation.temporal import plan


def point(i, target, prediction, block='fold-0'):
    return {'id':str(i),'target':target,'prediction':prediction,'block':block}


def ticket(i, status='won', stake=10, odds=2, at='2020-01-01T05:00:00Z'):
    return {'id':str(i),'pickId':f'pick-{i}','origin':'fixture',
            'status':status,'stake':stake,'odds':odds,'currency':'USD','settledAt':at,
            'marketKey':'event-1:FULL:over:200.5:rules-v1','placedAt':'2020-01-01T00:00:00Z',
            'startsAt':'2020-01-01T03:00:00Z'}


CAPITAL = {'amount':100,'currency':'USD','externalFlows':[]}


class MetricTests(unittest.TestCase):
    def test_regression_matches_library(self):
        y,p = [2,4,6],[1,6,6]
        r = regression([point(i,a,b) for i,(a,b) in enumerate(zip(y,p))])
        self.assertAlmostEqual(r['mae'],mean_absolute_error(y,p))
        self.assertAlmostEqual(r['rmse'],math.sqrt(mean_squared_error(y,p)))
        self.assertAlmostEqual(r['bias'],1/3)

    def test_no_observations_is_not_zero(self):
        self.assertIsNone(regression([])['mae'])
        self.assertIsNone(probabilities([],['yes','no'])['logLoss'])
        self.assertIsNone(coverage([])['predictionRate'])
        self.assertIsNone(decisions([])['hitRate'])
        self.assertIsNone(decisions([])['yield'])

    def test_invalid_points_and_duplicate_ids(self):
        for value in (True,float('nan'),float('inf'),'1'):
            with self.assertRaises(ValueError):regression([point(1,1,value)])
        with self.assertRaises(ValueError):regression([point(1,1,2),point(1,1,3)])
        with self.assertRaises(ValueError):regression([point(1,1,1e300)])

    def test_binary_metrics_match_library(self):
        ps,ys = [.1,.6,.9,.8],[0,1,0,1]
        rows = [{'id':str(i),'outcome':str(y),'probabilities':{'0':1-p,'1':p}} for i,(p,y) in enumerate(zip(ps,ys))]
        r = probabilities(rows,['0','1'])
        self.assertAlmostEqual(r['brierBinary'],brier_score_loss(ys,ps))
        self.assertAlmostEqual(r['brierMulticlassSum'],2*r['brierBinary'])
        self.assertAlmostEqual(r['logLoss'],log_loss(ys,ps))

    def test_push_is_full_outcome_not_conditioned_away(self):
        r = probabilities([{'id':'a','outcome':'push','probabilities':{'over':.5,'under':.4,'push':.1}}],['over','under','push'])
        self.assertAlmostEqual(r['brierMulticlassSum'],1.22)
        self.assertAlmostEqual(r['logLoss'],-math.log(.1))
        self.assertIsNone(r['brierBinary'])

    def test_curve_empty_bins_endpoints_and_ece(self):
        rows = [{'id':'a','outcome':'yes','probabilities':{'yes':1,'no':0}},
                {'id':'b','outcome':'no','probabilities':{'yes':0,'no':1}}]
        r = probabilities(rows,['yes','no'])
        self.assertEqual(r['eceMacroClasswise'],0)
        self.assertEqual(r['curves']['yes'][-1]['n'],1)
        self.assertIsNone(r['curves']['yes'][3]['meanProbability'])

    def test_ece_known_nonzero_and_calibration_counts(self):
        rows = [{'id':str(i),'outcome':'yes','probabilities':{'yes':.5,'no':.5}} for i in range(4)]
        r = probabilities(rows,['yes','no'])
        self.assertEqual(r['eceMacroClasswise'],.5)
        self.assertEqual(r['curves']['yes'][5]['observedFrequency'],1)
        self.assertEqual(sum(b['n'] for b in r['curves']['yes']),4)

    def test_impossible_observation_and_exclusions_explicit(self):
        r = probabilities([{'id':'a','outcome':'yes','probabilities':{'yes':0,'no':1}},
                           {'id':'b','outcome':'void'},{'id':'c','outcome':'pending'}],['yes','no'])
        self.assertEqual(r['n'],1)
        self.assertEqual(r['impossibleObservedEvents'],1)
        self.assertEqual(r['excluded'],{'void':1,'pending':1})
        self.assertAlmostEqual(r['logLoss'],-math.log(1e-15))

    def test_probability_contract_rejects_ambiguous_vectors(self):
        for p in ({'yes':.7,'no':.7},{'yes':-.1,'no':1.1},{'yes':True,'no':0},{'yes':1}):
            with self.assertRaises(ValueError):probabilities([{'id':'a','outcome':'yes','probabilities':p}],['yes','no'])
        with self.assertRaises(ValueError):probabilities([],['push','push'])

    def test_coverage_retains_errors_and_no_data_in_denominator(self):
        rows = [{'id':str(i),'decision':d,'dataAvailable':d in ('predicted','abstained'), 'reason':'reason-'+d}
                for i,d in enumerate(('predicted','abstained','no_data','error','not_covered'))]
        r = coverage(rows)
        self.assertEqual(r['eligibleEvents'],5)
        self.assertEqual(r['predictionRate'],.2)
        self.assertEqual(r['abstentionRate'],.2)
        self.assertEqual(r['dataAvailabilityRate'],.4)

    def test_coverage_rejects_missing_reason_and_contradiction(self):
        for r in ({'id':'a','decision':'abstained','dataAvailable':True},
                  {'id':'a','decision':'predicted','dataAvailable':False},
                  {'id':'a','decision':'no_data','dataAvailable':True,'reason':'x'}):
            with self.assertRaises(ValueError):coverage([r])

    def test_yield_roi_hit_rate_have_different_denominators(self):
        rows = [ticket(1,'won',10,3),ticket(2,'lost',10),ticket(3,'push',10),ticket(4,'void',100),ticket(5,'pending',50)]
        r = decisions(rows,initial_capital=CAPITAL)
        self.assertEqual(r['profit'],10)
        self.assertEqual(r['yieldDenominatorStake'],30)
        self.assertAlmostEqual(r['yield'],1/3)
        self.assertEqual(r['roiOnInitialCapital'],.1)
        self.assertEqual(r['hitRate'],.5)
        self.assertEqual(r['pendingStake'],50)
        self.assertEqual(r['voidStake'],100)

    def test_missing_price_blocks_complete_return(self):
        r = decisions([ticket(1),ticket(2,'lost',odds=None)])
        self.assertEqual(r['returnStatus'],'MISSING_PRICES')
        self.assertIsNone(r['profit'])
        self.assertEqual(r['missingPriceIds'],['2'])

    def test_decimal_191_produces_091_profit_per_unit(self):
        r = decisions([ticket(1,stake=1,odds=1.91)])
        self.assertEqual(r['profit'],.91)
        self.assertEqual(r['yield'],.91)

    def test_only_pending_and_void_do_not_report_zero_profit(self):
        r = decisions([ticket(1,'pending'),ticket(2,'void',odds=None)])
        self.assertIsNone(r['profit'])
        self.assertIsNone(r['hitRate'])

    def test_decimal_prices_currency_and_stakes_validated(self):
        for patch in ({'odds':-110},{'stake':0},{'odds':True},{'status':'abstained'}):
            with self.assertRaises(ValueError):decisions([{**ticket(1),**patch}])
        with self.assertRaises(ValueError):decisions([ticket(1),{**ticket(2),'currency':'EUR'}])

    def test_manual_verified_and_fixture_results_cannot_be_mixed(self):
        with self.assertRaises(ValueError):decisions([ticket(1),{**ticket(2),'origin':'verified'}])
        with self.assertRaises(ValueError):decisions([{**ticket(1),'origin':None}])
        self.assertEqual(decisions([{**ticket(1),'origin':'manual'}])['origin'],'manual')

    def test_picks_are_not_counted_as_tickets(self):
        r = decisions([ticket(1),{**ticket(2),'pickId':'pick-1'}])
        self.assertEqual(r['tickets'],2)
        self.assertEqual(r['distinctPicksWithTickets'],1)
        with self.assertRaises(ValueError):decisions([{**ticket(1),'pickId':None}])

    def test_settlement_cannot_precede_placement(self):
        with self.assertRaises(ValueError):decisions([ticket(1,at='2019-12-31T00:00:00Z')])

    def test_cashflows_do_not_masquerade_as_return(self):
        r = decisions([ticket(1)],initial_capital={**CAPITAL,'externalFlows':[{'deposit':50}]})
        self.assertEqual(r['profit'],10)
        self.assertIsNone(r['roiOnInitialCapital'])
        self.assertIsNone(r['maxDrawdownRate'])
        self.assertEqual(r['capitalStatus'],'EXTERNAL_FLOWS_UNSUPPORTED')

    def test_drawdown_groups_equal_settlement_times(self):
        rows = [ticket(1,'won',20),ticket(2,'lost',10),ticket(3,'lost',22,at='2020-01-02T05:00:00Z')]
        r = decisions(rows,initial_capital=CAPITAL)
        self.assertEqual(r['maxDrawdownAmount'],22)
        self.assertEqual(r['maxDrawdownRate'],.2)
        self.assertEqual(r,decisions(list(reversed(rows)),initial_capital=CAPITAL))

    def test_clv_requires_same_market_and_appropriate_time(self):
        row = ticket(1,odds=2.2)
        row['closing'] = {'odds':2,'marketKey':row['marketKey'],'observedAt':'2020-01-01T02:59:00Z'}
        self.assertAlmostEqual(decisions([row])['clv']['stakeWeightedPriceRatio'],.1)
        row['closing']['marketKey']='different-line'
        self.assertIsNone(decisions([row])['clv']['stakeWeightedPriceRatio'])
        row['closing']['marketKey']=row['marketKey']
        row['closing']['observedAt']='2020-01-01T04:00:00Z'
        self.assertEqual(decisions([row])['clv']['n'],0)

    def test_clv_discloses_incomplete_quote_coverage(self):
        row = ticket(1)
        row['closing']={'odds':2,'marketKey':row['marketKey'],'observedAt':'2020-01-01T02:00:00Z'}
        r = decisions([row,ticket(2)])['clv']
        self.assertEqual(r['quoteCoverage'],.5)
        self.assertEqual(r['excluded'],{'missing_quote':1})


class ComparisonTests(unittest.TestCase):
    def test_paired_intervals_and_reproduction(self):
        a = [point(i,10,11,f'fold-{i}') for i in range(8)]
        b = [point(i,10,12,f'fold-{i}') for i in range(8)]
        r = paired(a,b)
        self.assertEqual(r['interval95'],{'mae':[-1.,-1.],'rmse':[-1.,-1.]})
        self.assertEqual(r,paired(list(reversed(a)),list(reversed(b))))

    def test_small_number_blocks_never_fabricates_precision(self):
        a,b = [point(1,2,2)],[point(1,2,3)]
        r = paired(a,b)
        self.assertIsNone(r['interval95'])
        self.assertEqual(r['differenceCandidateMinusReference']['mae'],-1)

    def test_paired_rejects_different_samples_outcomes_or_blocks(self):
        a = [point(1,2,2)]
        for b in ([point(2,2,3)],[point(1,3,3)],[point(1,2,3,'other')]):
            with self.assertRaises(ValueError):paired(a,b)

    def test_unequal_block_sizes_are_pooled_by_event(self):
        a = [point(i,10,11 if i<3 else 15,'a' if i<3 else 'b') for i in range(4)]
        b = [point(i,10,10,r['block']) for i,r in enumerate(a)]
        self.assertEqual(paired(a,b)['differenceCandidateMinusReference']['mae'],2)


class DevelopmentTests(unittest.TestCase):
    def test_full_matrix_has_all_candidates_and_ablations(self):
        self.assertEqual(len(configurations()),79)
        self.assertIn(('stacking','without_rest'),configurations())

    def test_calibration_and_final_values_are_never_read(self):
        data = make_fixture()
        a = evaluate_fixture(data,cases=[('ridge','all'),('historical_mean','all')])
        self.assertEqual(a['results'][1]['featureNames'],[])
        manifest = plan(fixture_metadata(data),fixture_policy())
        sealed = set(manifest['partitions']['calibration']+manifest['partitions']['reserved'])
        for row in data['rows']:
            if row['id'] in sealed:row['target'],row['features']=object(),object()
        b = evaluate_fixture(data,cases=[('ridge','all'),('historical_mean','all')])
        self.assertEqual(a,b)
        self.assertIsNone(a['selectedWinner'])
        self.assertIsNone(a['empiricalMetrics'])

    def test_stacking_has_nested_oof_for_every_outer_fold(self):
        r = evaluate_fixture(make_fixture(),cases=[('stacking','all')])
        for fold in r['results'][0]['folds']:
            inner = fold['innerOOF']
            self.assertTrue(set(inner['oofIds'])<=set(fold['train']))
            self.assertFalse(set(inner['oofIds'])&set(fold['predict']))
            self.assertEqual(inner['predictionIds'],fold['predict'])
        self.assertEqual(r['results'][0]['metrics']['n'],40)

    def test_observed_data_and_unknown_candidates_rejected(self):
        data = make_fixture(); data['origin']='observed'
        with self.assertRaises(ValueError):evaluate_fixture(data)
        with self.assertRaises(ValueError):evaluate_fixture(make_fixture(),cases=[('random_forest','all')])

    def test_current_held_labels_cannot_change_current_fold_predictions(self):
        data = make_fixture()
        before = evaluate_fixture(data,cases=[('ridge','all')])
        first = before['results'][0]['folds'][0]['predict']
        for row in data['rows']:
            if row['id'] in first:row['target']+=30
        after = evaluate_fixture(data,cases=[('ridge','all')])
        a = [r['prediction'] for r in before['results'][0]['observations'] if r['id'] in first]
        b = [r['prediction'] for r in after['results'][0]['observations'] if r['id'] in first]
        self.assertEqual(a,b)


if __name__ == '__main__':
    unittest.main()
