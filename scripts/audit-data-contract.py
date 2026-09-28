"""Read-only legacy assessment. Does not repair provenance or execute training."""
import argparse
import csv
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ml.contracts.features import FEATURES, derive_features


def assess(path):
    data=path.read_bytes()
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader=csv.DictReader(source)
        columns=reader.fieldnames
        rows=list(reader)
    ids=[r["_game_id"] for r in rows]
    dates=[r["_date"] for r in rows]
    invalid=[]; score_mismatch=0
    for index,row in enumerate(rows,2):
        try:
            vector=derive_features({d["name"]:float(row[d["name"]]) for d in FEATURES if d["name"] in row})
            if float(row["actual_total"]) != float(row["_home_score"])+float(row["_away_score"]): score_mismatch+=1
        except (ValueError,KeyError,TypeError) as error:
            invalid.append({"csv_line":index,"reason":str(error)})
    return {
        "contract_version":"1.0.0","source_path":str(path.as_posix()),
        "sha256":hashlib.sha256(data).hexdigest(),"rows":len(rows),"unique_ids":len(set(ids)),
        "chronological_dates":dates==sorted(dates),"date_range":[min(dates),max(dates)] if dates else [],
        "rows_by_calendar_year":dict(sorted(Counter(d[:4] for d in dates).items())),
        "market_line_present":"line" in columns,"decimal_odds_present":"odds_decimal" in columns,
        "numeric_recipe_violations":len(invalid),"violation_examples":invalid[:10],"target_score_mismatches":score_mismatch,
        "eligible_strict_training_rows":0,"quarantined_rows":len(rows),
        "reasons":["No first-capture or documented availability timestamps","Date-only event cutoff; no exact start time/timezone",
                   "No per-window source records or coverage proof","No versioned provider/season provenance",
                   "Raw rest/day values before clipping not recoverable unambiguously","No historical market prices"],
        "permitted_use":"Retrospective exploratory research only; not certified point-in-time data or market profitability",
        "numeric_check_is_not_provenance_validation":True,"input_modified":False
    }


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,default=Path("ml/data/nba_features.csv"))
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    result=assess(args.input)
    payload=json.dumps(result,ensure_ascii=False,indent=2)+"\n"
    if args.output:
        if args.output.resolve()==args.input.resolve(): raise SystemExit("Refusing to overwrite source")
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(payload,encoding="utf-8")
    else: print(payload)
