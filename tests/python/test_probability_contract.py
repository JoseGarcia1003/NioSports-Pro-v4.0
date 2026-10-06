import json
import unittest
from pathlib import Path
from ml.contracts.probability import total_outcomes, elo_outcomes

ROOT = Path(__file__).resolve().parents[2]


class ProbabilityTests(unittest.TestCase):
    def test_tolerance_cannot_allow_probability_above_one(self):
        with self.assertRaises(ValueError):
            total_outcomes([{'total':2,'mass':.5},{'total':3,'mass':.50000000001}],1)

    def test_common_vectors(self):
        data = json.loads((ROOT/'tests/fixtures/probability-vectors.json').read_text())
        for c in data['cases']:
            with self.subTest(c['id']):
                actual = total_outcomes(c['points'],c['line']) if c['kind']=='total' else elo_outcomes(c['a'],c['b'])
                for key,value in c['expected'].items():self.assertAlmostEqual(actual[key],value,places=12)

    def test_invalid_lines(self):
        for line in (True,'210',0,-1,210.25,float('nan'),float('inf')):
            with self.subTest(line):
                with self.assertRaises(ValueError):total_outcomes([{'total':210,'mass':1}],line)

    def test_incomplete_and_invalid_distributions(self):
        for points in ([],[{'total':2,'mass':.9}],[{'total':2,'mass':1},{'total':2,'mass':0}],
                       [{'total':True,'mass':1}],[{'total':2.5,'mass':1}],[{'total':2,'mass':float('nan')}],
                       [{'total':2,'mass':1,'extra':1}]):
            with self.subTest(points):
                with self.assertRaises(ValueError):total_outcomes(points,210)

    def test_elo_symmetry_and_invalid_inputs(self):
        self.assertAlmostEqual(elo_outcomes(1400,1600)['a'],elo_outcomes(1600,1400)['b'])
        for x in (None,True,'1500',float('nan'),float('inf')):
            with self.assertRaises(ValueError):elo_outcomes(x,1500)

    def test_monotonicity_and_push(self):
        points=[{'total':200,'mass':.2},{'total':210,'mass':.3},{'total':220,'mass':.5}]
        before={'over':1,'under':0}
        for half in range(399,442):
            p=total_outcomes(points,half/2)
            self.assertLessEqual(p['over'],before['over']);self.assertGreaterEqual(p['under'],before['under'])
            self.assertAlmostEqual(sum(p.values()),1)
            if half%2:self.assertEqual(p['push'],0)
            before=p
