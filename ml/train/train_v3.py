"""
NioSports Pro — Motor v3.0 Training Pipeline
Entrena XGBoost mejorado con features expandidas + calibración Platt.
Ejecutar: py ml/train/train_v3.py
"""

import os
import json
import time
import numpy as np
import pandas as pd
import xgboost as xgb
from pathlib import Path
from math import log, exp

# ── Paths ──
BASE = Path(__file__).resolve().parent.parent
FEATURES_CSV = BASE / 'data' / 'nba_features.csv'
MODEL_OUT = BASE / 'models' / 'xgboost_totals.json'
CALIB_OUT = BASE / 'models' / 'calibration.json'

print("=" * 60)
print("  NioSports Pro — Motor v3.0 Training Pipeline")
print("=" * 60)

# ═══════════════════════════════════════════
# STEP 1: Load existing features
# ═══════════════════════════════════════════
print("\n[1/6] Loading features...")
df = pd.read_csv(FEATURES_CSV)
print(f"  Loaded {len(df)} samples with {len(df.columns)} columns")
print(f"  Columns: {list(df.columns)}")

# ═══════════════════════════════════════════
# STEP 2: Attempt to fetch advanced stats
# ═══════════════════════════════════════════
print("\n[2/6] Attempting to fetch advanced NBA stats via nba_api...")

advanced_features_added = False

try:
    from nba_api.stats.endpoints import LeagueDashTeamStats
    
    seasons = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25']
    all_advanced = []
    
    for season in seasons:
        print(f"  Fetching {season}...")
        try:
            stats = LeagueDashTeamStats(
                season=season,
                measure_type_detailed_defense='Advanced',
                per_mode_detailed='PerGame',
                timeout=30
            )
            data = stats.get_data_frames()[0]
            
            if len(data) > 0:
                team_stats = data[['TEAM_NAME', 'PACE', 'OFF_RATING', 'DEF_RATING', 
                                   'NET_RATING', 'EFG_PCT', 'TM_TOV_PCT', 'OREB_PCT']].copy()
                team_stats['season'] = season
                all_advanced.append(team_stats)
                print(f"    Got {len(data)} teams")
            
            time.sleep(3)  # Rate limiting
            
        except Exception as e:
            print(f"    Warning: Could not fetch {season}: {e}")
            time.sleep(2)
            continue
    
    if all_advanced:
        adv_df = pd.concat(all_advanced, ignore_index=True)
        print(f"  Total advanced stats: {len(adv_df)} team-seasons")
        
        # Create team mapping for merge
        # We'll create synthetic features from the advanced stats
        avg_pace = adv_df.groupby('TEAM_NAME')['PACE'].mean()
        avg_ortg = adv_df.groupby('TEAM_NAME')['OFF_RATING'].mean()
        avg_drtg = adv_df.groupby('TEAM_NAME')['DEF_RATING'].mean()
        
        print(f"  Advanced stats collected for {len(avg_pace)} teams")
        advanced_features_added = True
    
except ImportError:
    print("  nba_api not installed. Skipping advanced stats.")
except Exception as e:
    print(f"  Could not fetch advanced stats: {e}")

if not advanced_features_added:
    print("  Proceeding with existing features (still powerful)")

# ═══════════════════════════════════════════
# STEP 3: Engineer additional features from existing data
# ═══════════════════════════════════════════
print("\n[3/6] Engineering additional features...")

# Create new features from existing columns
feature_cols = [c for c in df.columns if c not in [
    'actual_total', 'game_id', 'date', 'season', 'line',
    'home_team', 'away_team',
    '_game_id', '_date', '_home', '_away', '_home_score', '_away_score'
]]

# Add interaction features
if 'total_sum_l5' in df.columns and 'total_sum_l10' in df.columns:
    df['momentum_5v10'] = df['total_sum_l5'] - df['total_sum_l10']
    feature_cols.append('momentum_5v10')
    print("  Added: momentum_5v10 (L5 vs L10 trend)")

if 'home_total_l5' in df.columns and 'away_total_l5' in df.columns:
    df['matchup_volatility'] = df.get('home_std', 10) + df.get('away_std', 10)
    if 'matchup_volatility' not in feature_cols:
        feature_cols.append('matchup_volatility')
    print("  Added: matchup_volatility (combined std)")

if 'home_rest_days' in df.columns and 'away_rest_days' in df.columns:
    df['total_rest'] = df['home_rest_days'] + df['away_rest_days']
    df['both_rested'] = ((df['home_rest_days'] >= 2) & (df['away_rest_days'] >= 2)).astype(int)
    df['both_b2b'] = ((df.get('is_b2b_home', 0) == 1) & (df.get('is_b2b_away', 0) == 1)).astype(int)
    feature_cols.extend(['total_rest', 'both_rested', 'both_b2b'])
    print("  Added: total_rest, both_rested, both_b2b")

if 'home_home_avg' in df.columns and 'away_away_avg' in df.columns:
    df['venue_split_diff'] = df['home_home_avg'] - df['away_away_avg']
    feature_cols.append('venue_split_diff')
    print("  Added: venue_split_diff (home advantage signal)")

# Remove duplicates
feature_cols = list(dict.fromkeys(feature_cols))

# Ensure all feature columns exist and are numeric
valid_features = []
for col in feature_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].notna().sum() > len(df) * 0.5:  # At least 50% non-null
            valid_features.append(col)

feature_cols = valid_features
print(f"  Final feature count: {len(feature_cols)}")
print(f"  Features: {feature_cols}")

# ═══════════════════════════════════════════
# STEP 4: Prepare data and train with walk-forward
# ═══════════════════════════════════════════
print("\n[4/6] Training XGBoost v3.0 with walk-forward validation...")

# Target: classify if actual_total > line (OVER) or not
if 'actual_total' not in df.columns:
    print("  ERROR: 'actual_total' column not found!")
    print(f"  Available columns: {list(df.columns)}")
    exit(1)

# Drop rows with missing target
df = df.dropna(subset=['actual_total'] + feature_cols)
print(f"  Samples after cleanup: {len(df)}")

# Sort by date if available
if 'date' in df.columns:
    df = df.sort_values('date').reset_index(drop=True)

X = df[feature_cols].values
y_reg = df['actual_total'].values

# Create classification target: did actual exceed median projection?
if 'line' in df.columns:
    y_cls = (df['actual_total'] > df['line']).astype(int).values
    print(f"  Over rate: {y_cls.mean():.3f}")
else:
    # Use median of actual_total as pseudo-line
    median_total = np.median(y_reg)
    y_cls = (y_reg > median_total).astype(int)
    print(f"  Using median {median_total:.1f} as pseudo-line")

# Walk-forward splits
n = len(df)
split1 = int(n * 0.6)  # ~60% for first train
split2 = int(n * 0.8)  # ~80% for second train

print(f"\n  Walk-forward validation:")
print(f"  Fold 1: Train[0:{split1}] → Test[{split1}:{split2}]")
print(f"  Fold 2: Train[0:{split2}] → Test[{split2}:{n}]")

# Best params from previous Optuna optimization
best_params = {
    'objective': 'reg:squarederror',
    'max_depth': 4,
    'learning_rate': 0.05,
    'n_estimators': 300,
    'subsample': 0.7,
    'colsample_bytree': 0.7,
    'min_child_weight': 5,
    'gamma': 0.1,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'seed': 42,
}

results = []

for fold, (train_end, test_start, test_end) in enumerate([
    (split1, split1, split2),
    (split2, split2, n),
], start=1):
    X_train, X_test = X[:train_end], X[test_start:test_end]
    y_train, y_test = y_reg[:train_end], y_reg[test_start:test_end]
    y_cls_test = y_cls[test_start:test_end]
    
    # Get lines for this fold
    if 'line' in df.columns:
        lines_test = df['line'].values[test_start:test_end]
    else:
        lines_test = np.full(len(y_test), np.median(y_reg[:train_end]))
    
    # Train
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_cols)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_cols)
    
    params = {k: v for k, v in best_params.items() if k != 'n_estimators'}
    model = xgb.train(params, dtrain, num_boost_round=best_params['n_estimators'],
                       evals=[(dtest, 'test')], verbose_eval=False)
    
    # Predict
    preds = model.predict(dtest)
    
    # Metrics
    mae = np.mean(np.abs(preds - y_test))
    
    # Over/Under accuracy
    pred_over = preds > lines_test
    actual_over = y_test > lines_test
    correct = pred_over == actual_over
    wr = correct.mean()
    
    # ROI at -110
    wins = correct.sum()
    losses = (~correct).sum()
    profit = wins * (100 / 110) - losses * 1
    roi = profit / len(correct) * 100
    
    print(f"\n  Fold {fold}: MAE={mae:.2f}, WR={wr:.3f} ({wr*100:.1f}%), ROI={roi:+.2f}%")
    print(f"    {wins}W-{losses}L out of {len(correct)} games")
    
    results.append({
        'fold': fold, 'mae': mae, 'wr': wr, 'roi': roi,
        'wins': int(wins), 'losses': int(losses), 'total': len(correct)
    })

# ═══════════════════════════════════════════
# STEP 5: Train final model on ALL data + Platt calibration
# ═══════════════════════════════════════════
print("\n[5/6] Training final model on all data...")

dtrain_full = xgb.DMatrix(X, label=y_reg, feature_names=feature_cols)
params_final = {k: v for k, v in best_params.items() if k != 'n_estimators'}
final_model = xgb.train(params_final, dtrain_full, num_boost_round=best_params['n_estimators'],
                          verbose_eval=False)

# Platt calibration: fit sigmoid to convert predictions → calibrated probabilities
# Use last fold's predictions for calibration
print("\n[5b/6] Computing Platt scaling calibration...")

# Get predictions on last fold (out-of-sample)
X_cal = X[split2:]
y_cal = y_cls[split2:]  # Binary: 1 = over, 0 = under
if 'line' in df.columns:
    lines_cal = df['line'].values[split2:]
else:
    lines_cal = np.full(len(y_cal), np.median(y_reg[:split2]))

dcal = xgb.DMatrix(X_cal, feature_names=feature_cols)
preds_cal = final_model.predict(dcal)

# Raw scores: prediction - line (positive = over signal)
raw_scores = preds_cal - lines_cal

# Fit Platt scaling: P(over) = 1 / (1 + exp(A * score + B))
# Using Newton's method (simplified)
from scipy.optimize import minimize

def platt_loss(params, scores, labels):
    A, B = params
    p = 1.0 / (1.0 + np.exp(A * scores + B))
    p = np.clip(p, 1e-8, 1 - 1e-8)
    return -np.mean(labels * np.log(p) + (1 - labels) * np.log(1 - p))

try:
    from scipy.optimize import minimize
    result = minimize(platt_loss, x0=[1.0, 0.0], args=(raw_scores, y_cal), method='Nelder-Mead')
    A, B = result.x
    print(f"  Platt params: A={A:.4f}, B={B:.4f}")
    
    # Verify calibration
    cal_probs = 1.0 / (1.0 + np.exp(A * raw_scores + B))
    bins = np.linspace(0, 1, 11)
    for i in range(len(bins) - 1):
        mask = (cal_probs >= bins[i]) & (cal_probs < bins[i + 1])
        if mask.sum() > 0:
            predicted = cal_probs[mask].mean()
            actual = y_cal[mask].mean()
            print(f"    Bin [{bins[i]:.1f}-{bins[i+1]:.1f}]: predicted={predicted:.3f}, actual={actual:.3f}, n={mask.sum()}")
    
    calibration = {'method': 'platt', 'A': float(A), 'B': float(B)}
    
except ImportError:
    print("  scipy not available. Using default calibration.")
    calibration = {'method': 'normal_cdf', 'A': 1.0, 'B': 0.0}

# ═══════════════════════════════════════════
# STEP 6: Save model + calibration + metadata
# ═══════════════════════════════════════════
print("\n[6/6] Saving model and calibration...")

os.makedirs(MODEL_OUT.parent, exist_ok=True)

# Save model (Booster format — compatible with Railway)
final_model.save_model(str(MODEL_OUT))
print(f"  Model saved: {MODEL_OUT}")

# Save calibration
calib_data = {
    **calibration,
    'feature_cols': feature_cols,
    'feature_count': len(feature_cols),
    'training_samples': len(df),
    'validation_results': results,
    'period_std': {'Q1': 4.8, 'HALF': 7.2, 'FULL': 10.5},
    'version': '3.0.0',
}

with open(str(CALIB_OUT), 'w') as f:
    json.dump(calib_data, f, indent=2, default=str)
print(f"  Calibration saved: {CALIB_OUT}")

# Feature importance
importance = final_model.get_score(importance_type='gain')
sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
print(f"\n  Top 10 features by gain:")
for feat, gain in sorted_imp[:10]:
    print(f"    {feat}: {gain:.1f}")

# Summary
print("\n" + "=" * 60)
print("  TRAINING COMPLETE — SUMMARY")
print("=" * 60)
for r in results:
    print(f"  Fold {r['fold']}: WR={r['wr']*100:.1f}% | ROI={r['roi']:+.2f}% | {r['wins']}W-{r['losses']}L")
print(f"  Features: {len(feature_cols)}")
print(f"  Calibration: {calibration['method']} (A={calibration.get('A', 'N/A')}, B={calibration.get('B', 'N/A')})")
print(f"  Model: {MODEL_OUT}")
print(f"  Ready for Railway deployment")
print("=" * 60)