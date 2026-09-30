"""Paired, event-aligned descriptive differences and exploratory block intervals."""
import random
from .metrics import number, unique, regression

POLICY = {'version': 'development-comparison-1', 'primary': 'MAE_points', 'secondary': 'RMSE_points',
          'seed': 1729, 'replicates': 2000, 'confidence': .95, 'minimumBlocks': 8,
          'resamplingUnit': 'whole_temporal_validation_fold', 'interval': 'percentile_paired_block_bootstrap',
          'multipleComparisonAdjusted': False, 'automaticSelection': False}


def paired(candidate, reference):
    unique(candidate)
    unique(reference)
    a, b = {r['id']:r for r in candidate}, {r['id']:r for r in reference}
    if not a or set(a) != set(b):
        raise ValueError('PAIRED_UNIVERSE_MISMATCH')
    blocks = {}
    for key in sorted(a):
        x,y = a[key],b[key]
        if x['target'] != y['target'] or x['block'] != y['block']:
            raise ValueError('PAIRED_TARGET_OR_BLOCK_MISMATCH')
        if not isinstance(x['block'], str) or not x['block']:
            raise ValueError('BLOCK_REQUIRED')
        for r in (x,y):
            number(r['target']); number(r['prediction'])
        blocks.setdefault(x['block'], ([], []))[0].append(x)
        blocks[x['block']][1].append(y)
    def delta(x,y):
        mx,my = regression(x),regression(y)
        return {k: mx[k]-my[k] for k in ('mae','rmse')}
    point = delta(candidate, reference)
    result = {'n':len(a),'blocks':len(blocks),'differenceCandidateMinusReference':point,
              'perBlock':[{'block':k,'n':len(x),**delta(x,y)} for k,(x,y) in sorted(blocks.items())],
              'interval95':None,'intervalStatus':'INSUFFICIENT_TEMPORAL_BLOCKS',
              'interpretation':'Negative means lower error; not a profitability test or selection rule'}
    if len(blocks) < POLICY['minimumBlocks']:
        return result
    rng = random.Random(POLICY['seed'])
    samples = {k:[] for k in ('mae','rmse')}
    ordered = [blocks[k] for k in sorted(blocks)]
    for _ in range(POLICY['replicates']):
        # Repeated blocks get distinct resample IDs; pairings remain intact.
        xs,ys = [],[]
        for i in range(len(ordered)):
            x,y = rng.choice(ordered)
            xs.extend({**r,'id':f'{i}:{r["id"]}'} for r in x)
            ys.extend({**r,'id':f'{i}:{r["id"]}'} for r in y)
        for k,v in delta(xs,ys).items():samples[k].append(v)
    def quantile(values, q):
        values = sorted(values)
        p = (len(values)-1)*q
        low = int(p)
        high = min(low+1,len(values)-1)
        return values[low]+(values[high]-values[low])*(p-low)
    tail = (1-POLICY['confidence'])/2
    result.update(interval95={k:[quantile(v,tail),quantile(v,1-tail)] for k,v in samples.items()},
                  intervalStatus='EXPLORATORY_CONDITIONAL_ON_FIXED_PREDICTIONS')
    return result
