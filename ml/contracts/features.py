"""Pure numeric feature recipes shared with JS via dictionary.json. No model training."""
import json
import math
from pathlib import Path

DICTIONARY = json.loads(Path(__file__).with_name("dictionary.json").read_text(encoding="utf-8"))
FEATURES = [v for v in DICTIONARY["variables"] if v["sport"] == "basketball" and v["role"] == "feature"]
FEATURE_NAMES = [v["name"] for v in FEATURES]
INTERACTION_NAMES = FEATURE_NAMES[20:]


def calculate_recipe(formula, values):
    args = [values[name] for name in formula["args"]]
    if formula["op"] == "sum":
        return sum(args)
    if formula["op"] == "difference":
        return args[0] - args[1]
    if formula["op"] == "all_gte":
        return int(all(v >= formula["threshold"] for v in args))
    raise ValueError("Unknown feature recipe")


def derive_features(values):
    result = {}
    for definition in FEATURES:
        name = definition["name"]
        value = calculate_recipe(definition["derive"], result) if "derive" in definition else values.get(name)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid numeric feature: {name}")
        if definition["type"] == "integer" and (value != int(value) or abs(value) > 9007199254740991):
            raise ValueError(f"Invalid integer: {name}")
        for bound, comparator in [("min", lambda x,y:x<y), ("max",lambda x,y:x>y)]:
            if definition.get(bound) is not None and comparator(value,definition[bound]):
                raise ValueError(f"Out of domain: {name}")
        if "derive" in definition and name in values:
            supplied = values[name]
            if isinstance(supplied,bool) or not isinstance(supplied,(int,float)) or not math.isfinite(supplied) or abs(supplied-value)>1e-9:
                raise ValueError(f"Derivation mismatch: {name}")
        result[name] = value
    if result["is_b2b_home"] != int(result["home_rest_days"] == 0) or result["is_b2b_away"] != int(result["away_rest_days"] == 0):
        raise ValueError("B2B and rest mismatch")
    return result


def add_legacy_interactions(base):
    """Compatibility only: shared composites; does NOT certify provenance."""
    result = dict(base)
    for definition in FEATURES:
        if "derive" in definition:
            result[definition["name"]] = calculate_recipe(definition["derive"],result)
    return result
