"""Versioned offline metrics. Never infer prices, probabilities or missing outcomes."""
import math
from collections import Counter
from decimal import Decimal
from ml.validation.temporal import instant

VERSION = 'evaluation-metrics-1'


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('FINITE_NUMBER_REQUIRED')
    return float(value)


def unique(rows):
    ids = [r['id'] for r in rows]
    if any(not isinstance(i, str) or not i for i in ids) or len(ids) != len(set(ids)):
        raise ValueError('INVALID_OR_DUPLICATE_ID')


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def regression(rows):
    unique(rows)
    errors = [number(r['prediction']) - number(r['target']) for r in rows]
    if not errors:
        return {'n': 0, 'mae': None, 'rmse': None, 'bias': None, 'status': 'NO_OBSERVATIONS'}
    if any(not math.isfinite(e * e) for e in errors):
        raise ValueError('ERROR_OVERFLOW')
    n = len(errors)
    return {'n': n, 'mae': math.fsum(abs(e) / n for e in errors),
            'rmse': math.sqrt(math.fsum(e * e / n for e in errors)),
            'bias': math.fsum(e / n for e in errors), 'status': 'COMPUTED', 'unit': 'points'}


def probabilities(rows, classes, *, bins=10):
    """Full outcome-space Brier (sum over classes); no conditioning away pushes."""
    unique(rows)
    if (len(classes) < 2 or len(set(classes)) != len(classes)
            or any(not isinstance(c, str) or not c or c in ('pending', 'void', 'withdrawn') for c in classes)):
        raise ValueError('INVALID_OUTCOME_SPACE')
    if type(bins) is not int or not 1 <= bins <= 100:
        raise ValueError('INVALID_BIN_COUNT')
    accepted, excluded = [], Counter()
    for r in rows:
        if r['outcome'] in ('pending', 'void', 'withdrawn'):
            excluded[r['outcome']] += 1
            continue
        if r['outcome'] not in classes or set(r['probabilities']) != set(classes):
            raise ValueError('OUTCOME_SPACE_MISMATCH')
        p = [number(r['probabilities'][c]) for c in classes]
        if any(x < 0 or x > 1 for x in p) or not math.isclose(sum(p), 1, abs_tol=1e-10, rel_tol=0):
            raise ValueError('INVALID_PROBABILITY_VECTOR')
        accepted.append((classes.index(r['outcome']), p))
    n = len(accepted)
    curves, eces = {}, []
    for j, name in enumerate(classes):
        buckets = [[] for _ in range(bins)]
        for y, p in accepted:
            buckets[min(int(p[j] * bins), bins-1)].append((p[j], int(y == j)))
        curve, ece = [], 0.0
        for i, b in enumerate(buckets):
            mean_p = ratio(sum(x[0] for x in b), len(b))
            observed = ratio(sum(x[1] for x in b), len(b))
            if b:
                ece += len(b) / n * abs(mean_p - observed)
            curve.append({'lower': i/bins, 'upper': (i+1)/bins, 'n': len(b),
                          'meanProbability': mean_p, 'observedFrequency': observed})
        curves[name] = curve
        eces.append(ece)
    brier = ratio(sum(sum((p[j]-int(y == j))**2 for j in range(len(classes))) for y,p in accepted), n)
    eps = 1e-15
    return {'n': n, 'universe': len(rows), 'excluded': dict(excluded), 'classes': list(classes),
            'status': 'COMPUTED' if n else 'NO_OBSERVATIONS',
            'brierMulticlassSum': brier,
            'brierBinary': brier/2 if n and len(classes) == 2 else None,
            'logLoss': ratio(sum(-math.log(max(p[y], eps)) for y,p in accepted), n),
            'logLossFloor': eps, 'impossibleObservedEvents': sum(p[y] == 0 for y,p in accepted),
            'eceMacroClasswise': sum(eces)/len(classes) if n else None,
            'binCount': bins, 'curves': curves}


def coverage(rows):
    """One row per eligible event, assembled BEFORE model/result filtering."""
    unique(rows)
    allowed = ('predicted', 'abstained', 'no_data', 'error', 'not_covered')
    for r in rows:
        if r['decision'] not in allowed or type(r['dataAvailable']) is not bool:
            raise ValueError('COVERAGE_STATE_INVALID')
        if r['decision'] == 'predicted' and not r['dataAvailable']:
            raise ValueError('PREDICTION_WITHOUT_DATA')
        if r['decision'] == 'no_data' and r['dataAvailable']:
            raise ValueError('NO_DATA_CONTRADICTION')
        if r['decision'] != 'predicted' and not r.get('reason'):
            raise ValueError('REASON_REQUIRED')
    counts = Counter(r['decision'] for r in rows)
    n = len(rows)
    return {'eligibleEvents': n, 'counts': {k: counts[k] for k in allowed},
            'predictionRate': ratio(counts['predicted'], n), 'abstentionRate': ratio(counts['abstained'], n),
            'dataAvailabilityRate': ratio(sum(r['dataAvailable'] for r in rows), n),
            'errorRate': ratio(counts['error'], n),
            'reasons': dict(Counter(r['reason'] for r in rows if r['decision'] != 'predicted'))}


def money(value):
    number(value)
    return Decimal(str(value))


def decisions(tickets, *, initial_capital=None):
    """Canonical decimal-odds tickets only. This is NOT a settlement/ledger writer."""
    unique(tickets)
    statuses = ('won', 'lost', 'push', 'void', 'pending')
    currencies = {r['currency'] for r in tickets}
    if len(currencies) > 1 or any(not isinstance(c, str) or not c for c in currencies):
        raise ValueError('SINGLE_CURRENCY_REQUIRED')
    origins = {r.get('origin') for r in tickets}
    if len(origins) > 1 or not origins <= {'fixture', 'manual', 'verified'}:
        raise ValueError('SINGLE_EXPLICIT_RESULT_ORIGIN_REQUIRED')
    for r in tickets:
        if not isinstance(r.get('pickId'), str) or not r['pickId']:
            raise ValueError('PICK_REFERENCE_REQUIRED')
        if r['status'] not in statuses or number(r['stake']) <= 0:
            raise ValueError('INVALID_TICKET')
        if r.get('odds') is not None and number(r['odds']) <= 1:
            raise ValueError('DECIMAL_ODDS_REQUIRED')
        if r['status'] != 'pending':
            if instant(r['settledAt']) < instant(r['placedAt']):
                raise ValueError('SETTLEMENT_BEFORE_PLACEMENT')
    counts = Counter(r['status'] for r in tickets)
    settled = [r for r in tickets if r['status'] != 'pending']
    exposed = [r for r in settled if r['status'] != 'void']
    missing_prices = [r['id'] for r in exposed if r.get('odds') is None]
    counts_full = {k: counts[k] for k in statuses}
    out = {'tickets': len(tickets), 'distinctPicksWithTickets': len({r['pickId'] for r in tickets}),
           'origin': next(iter(origins), None), 'counts': counts_full, 'currency': next(iter(currencies), None),
           'hitRate': ratio(counts['won'], counts['won']+counts['lost']),
           'hitDenominator': counts['won']+counts['lost'], 'settledExposureCount': len(exposed),
           'pendingStake': float(sum((money(r['stake']) for r in tickets if r['status']=='pending'), Decimal(0))),
           'voidStake': float(sum((money(r['stake']) for r in settled if r['status']=='void'), Decimal(0))),
           'missingPriceIds': missing_prices, 'profit': None, 'yield': None, 'roiOnInitialCapital': None,
           'maxDrawdownAmount': None, 'maxDrawdownRate': None,
           'returnStatus': 'MISSING_PRICES' if missing_prices else 'NO_SETTLED_EXPOSURE',
           'capitalStatus': 'INITIAL_CAPITAL_UNAVAILABLE'}
    stake = sum((money(r['stake']) for r in exposed), Decimal(0))
    out['yieldDenominatorStake'] = float(stake)
    if exposed and not missing_prices:
        changes = {}
        for r in exposed:
            pnl = money(r['stake']) * (money(r['odds'])-1) if r['status']=='won' else -money(r['stake']) if r['status']=='lost' else Decimal(0)
            at = instant(r['settledAt'])
            changes[at] = changes.get(at, Decimal(0)) + pnl
        profit = sum(changes.values(), Decimal(0))
        out.update(profit=float(profit), yield_=float(profit/stake), returnStatus='COMPUTED')
        out['yield'] = out.pop('yield_')
        if initial_capital is not None:
            capital = money(initial_capital['amount'])
            if capital <= 0 or initial_capital['currency'] != out['currency']:
                raise ValueError('INVALID_INITIAL_CAPITAL')
            if initial_capital['externalFlows'] != []:
                out['capitalStatus'] = 'EXTERNAL_FLOWS_UNSUPPORTED'
            else:
                equity, peak, drawdown, drawdown_rate = capital, capital, Decimal(0), Decimal(0)
                for at in sorted(changes):
                    equity += changes[at]
                    peak = max(peak, equity)
                    drawdown = max(drawdown, peak-equity)
                    drawdown_rate = max(drawdown_rate, (peak-equity)/peak)
                out.update(roiOnInitialCapital=float(profit/capital), maxDrawdownAmount=float(drawdown),
                           maxDrawdownRate=float(drawdown_rate), capitalStatus='COMPUTED_CLOSED_PNL_ONLY')
    # CLV is a quote comparison, not profit; preserve incompleteness and matching semantics.
    clvs, excluded = [], Counter()
    for r in tickets:
        if r['status'] == 'void':
            excluded['void'] += 1
            continue
        closing = r.get('closing')
        if r.get('odds') is None or not closing:
            excluded['missing_quote'] += 1
            continue
        if (not r.get('marketKey') or closing.get('marketKey') != r['marketKey']
                or not instant(r['placedAt']) <= instant(closing['observedAt']) <= instant(r['startsAt'])):
            excluded['incompatible_market_or_time'] += 1
            continue
        if number(closing['odds']) <= 1:
            raise ValueError('DECIMAL_CLOSING_ODDS_REQUIRED')
        clvs.append((money(r['stake']), money(r['odds'])/money(closing['odds'])-1))
    weight = sum((s for s,_ in clvs), Decimal(0))
    out['clv'] = {'n': len(clvs), 'excluded': dict(excluded), 'eligibleTickets': len(tickets)-counts['void'],
                  'quoteCoverage': ratio(len(clvs), len(tickets)-counts['void']),
                  'stakeWeightedPriceRatio': float(sum((s*v for s,v in clvs), Decimal(0))/weight) if weight else None,
                  'vigAdjusted': False}
    return out
