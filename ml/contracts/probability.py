"""Canonical event-probability-1 arithmetic, not a fitted/calibrated NBA model."""
import math

VERSION = 'event-probability-1'
MAX_SAFE = 2**53-1


def finite(x):
    return type(x) in (int, float) and math.isfinite(x)


def total_outcomes(points, line):
    if not finite(line) or line <= 0 or line*2 > MAX_SAFE or not float(line*2).is_integer():
        raise ValueError('UNSUPPORTED_TOTAL_LINE')
    if not isinstance(points, list) or not 1 <= len(points) <= 10000:
        raise ValueError('INVALID_POINT_DISTRIBUTION')
    seen, result = set(), {'over':0., 'under':0., 'push':0.}
    for row in points:
        if not isinstance(row, dict) or set(row) != {'total','mass'}:
            raise ValueError('INVALID_POINT_DISTRIBUTION')
        total, mass = row['total'], row['mass']
        if (not finite(total) or not 0 <= total <= MAX_SAFE or not float(total).is_integer()
                or total in seen or not finite(mass) or not 0 <= mass <= 1):
            raise ValueError('INVALID_POINT_DISTRIBUTION')
        seen.add(total)
        result['over' if total > line else 'under' if total < line else 'push'] += mass
    if any(p > 1 for p in result.values()) or abs(sum(result.values())-1) > 1e-10:
        raise ValueError('INCOMPLETE_PROBABILITY_MASS')
    return result


def elo_outcomes(a, b):
    if not finite(a) or not finite(b):
        raise ValueError('INVALID_RATINGS')
    exponent = (b-a)/400
    # JS returns Infinity for a very large power; Python would raise OverflowError.
    win = 0. if exponent > 308 else 1/(1+10**exponent)
    return {'a':win, 'b':1-win}


if __name__ == '__main__':
    # Controlled parity harness, not an HTTP endpoint or model loader.
    import json
    from pathlib import Path
    vectors = json.loads((Path(__file__).resolve().parents[2]/'tests/fixtures/probability-vectors.json').read_text())
    print(json.dumps({c['id']:total_outcomes(c['points'],c['line']) if c['kind']=='total'
                      else elo_outcomes(c['a'],c['b']) for c in vectors['cases']},allow_nan=False))
