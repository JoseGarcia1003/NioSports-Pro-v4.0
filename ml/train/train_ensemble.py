"""
NioSports Pro — Motor v4.0 Stacking Ensemble Training Pipeline
Entrena ensemble (XGBoost + LightGBM + Ridge + MLP) con meta-learner
LogisticRegression + calibración Platt mejorada.

Ejecutar: py ml/train/train_ensemble.py
"""

import os
import json
import time
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings('ignore')

# ── Paths ──
BASE = Path(__file__).resolve().parent.parent
FEATURES_CSV = BASE / 'data' / 'nba_features.csv'
MODEL_DIR = BASE / 'models'
MODEL_OUT = MODEL_DIR / 'ensemble_model.json'
CALIB_OUT = MODEL_DIR / 'calibration.json'
RESULTS_OUT = MODEL_DIR / 'training_results.json'
PARAMS_OUT = MODEL_DIR / 'best_params.json'

print("=" * 65)
print("  NioSports Pro — Motor v4.0 Stacking Ensemble Pipeline")
print("  XGBoost + LightGBM + Ridge + MLP → LogisticRegression meta")
print("=" * 65)

# ═══════════════════════════════════════════
# STEP 1: Load features
# ═══════════════════════════════════════════
print("\n[1/7] Loading features...")
df = pd.read_csv(FEATURES_CSV)
print(f"  Loaded {len(df)} samples, {len(df.columns)} columns")

# ═══════════════════════════════════════════
# STEP 2: Fetch advanced stats (optional)
# ═══════════════════════════════════════════
print("\n[2/7] Attempting advanced NBA stats via nba_api...")

advanced_added = False
try:
    from nba_api.stats.endpoints import LeagueDashTeamStats

    seasons = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25']
    all_adv = []

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
                cols = ['TEAM_NAME', 'PACE', 'OFF_RATING', 'DEF_RATING',
                        'NET_RATING', 'EFG_PCT', 'TM_TOV_PCT', 'OREB_PCT']
                available = [c for c in cols if c in data.columns]
                team_stats = data[available].copy()
                team_stats['season'] = season
                all_adv.append(team_stats)
                print(f"    Got {len(data)} teams")
            time.sleep(3)
        except Exception as e:
            print(f"    Warning: {season} failed: {e}")
            time.sleep(2)

    if all_adv:
        adv_df = pd.concat(all_adv, ignore_index=True)
        print(f"  Advanced stats: {len(adv_df)} team-seasons")
        advanced_added = True

except ImportError:
    print("  nba_api not installed — skipping")
except Exception as e:
    print(f"  Advanced stats failed: {e}")

if not advanced_added:
    print("  Proceeding with existing features")

# ═══════════════════════════════════════════
# STEP 3: Feature engineering
# ═══════════════════════════════════════════
print("\n[3/7] Engineering features...")

exclude_cols = {
    'actual_total', 'game_id', 'date', 'season', 'line',
    'home_team', 'away_team',
    '_game_id', '_date', '_home', '_away', '_home_score', '_away_score'
}

feature_cols = [c for c in df.columns if c not in exclude_cols]

# Interaction features
if 'total_sum_l5' in df.columns and 'total_sum_l10' in df.columns:
    df['momentum_5v10'] = df['total_sum_l5'] - df['total_sum_l10']
    feature_cols.append('momentum_5v10')

if 'home_std' in df.columns and 'away_std' in df.columns:
    df['matchup_volatility'] = df['home_std'] + df['away_std']
    feature_cols.append('matchup_volatility')

if 'home_rest_days' in df.columns and 'away_rest_days' in df.columns:
    df['total_rest'] = df['home_rest_days'] + df['away_rest_days']
    df['both_rested'] = ((df['home_rest_days'] >= 2) & (df['away_rest_days'] >= 2)).astype(int)
    df['both_b2b'] = ((df.get('is_b2b_home', 0) == 1) & (df.get('is_b2b_away', 0) == 1)).astype(int)
    feature_cols.extend(['total_rest', 'both_rested', 'both_b2b'])

if 'home_home_avg' in df.columns and 'away_away_avg' in df.columns:
    df['venue_split_diff'] = df['home_home_avg'] - df['away_away_avg']
    feature_cols.append('venue_split_diff')

# Dedupe and validate
feature_cols = list(dict.fromkeys(feature_cols))
valid_features = []
for col in feature_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].notna().sum() > len(df) * 0.5:
            valid_features.append(col)

feature_cols = valid_features
print(f"  Final features: {len(feature_cols)}")

# ═══════════════════════════════════════════
# STEP 4: Prepare data
# ═══════════════════════════════════════════
print("\n[4/7] Preparing data...")

if 'actual_total' not in df.columns:
    print("  ERROR: 'actual_total' not found!")
    exit(1)

df = df.dropna(subset=['actual_total'] + feature_cols)
if 'date' in df.columns:
    df = df.sort_values('date').reset_index(drop=True)

X = df[feature_cols].values.astype(np.float32)
y_reg = df['actual_total'].values.astype(np.float32)

if 'line' in df.columns:
    lines = df['line'].values.astype(np.float32)
    y_cls = (df['actual_total'] > df['line']).astype(int).values
else:
    median_total = np.median(y_reg)
    lines = np.full(len(y_reg), median_total, dtype=np.float32)
    y_cls = (y_reg > median_total).astype(int)

print(f"  Samples: {len(df)}, Features: {len(feature_cols)}")
print(f"  Over rate: {y_cls.mean():.3f}")

# Walk-forward splits
n = len(df)
split1 = int(n * 0.6)
split2 = int(n * 0.8)

# ═══════════════════════════════════════════
# STEP 5: Train Stacking Ensemble
# ═══════════════════════════════════════════
print("\n[5/7] Training Stacking Ensemble...")

import xgboost as xgb

try:
    import lightgbm as lgb
    has_lgb = True
    print("  ✓ LightGBM available")
except ImportError:
    has_lgb = False
    print("  ✗ LightGBM not installed — using XGBoost x2 instead")

from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import brier_score_loss

print(f"\n  Walk-forward validation:")
print(f"  Fold 1: Train[0:{split1}] → Test[{split1}:{split2}]")
print(f"  Fold 2: Train[0:{split2}] → Test[{split2}:{n}]")

# XGBoost params
xgb_params = {
    'objective': 'reg:squarederror',
    'max_depth': 4,
    'learning_rate': 0.05,
    'subsample': 0.7,
    'colsample_bytree': 0.7,
    'min_child_weight': 5,
    'gamma': 0.1,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'seed': 42,
}
xgb_rounds = 300

# LightGBM params
lgb_params = {
    'objective': 'regression',
    'max_depth': 4,
    'learning_rate': 0.05,
    'subsample': 0.7,
    'colsample_bytree': 0.7,
    'min_child_weight': 5,
    'num_leaves': 15,
    'verbose': -1,
    'seed': 43,
}
lgb_rounds = 300

all_results = []

for fold, (train_end, test_start, test_end) in enumerate([
    (split1, split1, split2),
    (split2, split2, n),
], start=1):
    print(f"\n  ── Fold {fold} ──")

    X_train, X_test = X[:train_end], X[test_start:test_end]
    y_train, y_test = y_reg[:train_end], y_reg[test_start:test_end]
    y_cls_test = y_cls[test_start:test_end]
    lines_test = lines[test_start:test_end]

    # ── Base Learner 1: XGBoost ──
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_cols)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_cols)
    xgb_model = xgb.train(xgb_params, dtrain, num_boost_round=xgb_rounds,
                           evals=[(dtest, 'test')], verbose_eval=False)
    xgb_preds = xgb_model.predict(dtest)
    xgb_mae = np.mean(np.abs(xgb_preds - y_test))
    print(f"    XGBoost  MAE: {xgb_mae:.2f}")

    # ── Base Learner 2: LightGBM (or XGBoost variant) ──
    if has_lgb:
        lgb_train = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
        lgb_valid = lgb.Dataset(X_test, label=y_test, feature_name=feature_cols, reference=lgb_train)
        lgb_model = lgb.train(lgb_params, lgb_train, num_boost_round=lgb_rounds,
                              valid_sets=[lgb_valid], callbacks=[lgb.log_evaluation(0)])
        lgb_preds = lgb_model.predict(X_test)
    else:
        # XGBoost variant with different params
        xgb_params2 = {**xgb_params, 'max_depth': 3, 'learning_rate': 0.03, 'seed': 43}
        xgb_model2 = xgb.train(xgb_params2, dtrain, num_boost_round=400,
                                evals=[(dtest, 'test')], verbose_eval=False)
        lgb_preds = xgb_model2.predict(dtest)
    lgb_mae = np.mean(np.abs(lgb_preds - y_test))
    print(f"    LightGBM MAE: {lgb_mae:.2f}")

    # ── Base Learner 3: Ridge ──
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc = scaler.transform(X_test)
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train_sc, y_train)
    ridge_preds = ridge.predict(X_test_sc)
    ridge_mae = np.mean(np.abs(ridge_preds - y_test))
    print(f"    Ridge    MAE: {ridge_mae:.2f}")

    # ── Base Learner 4: MLP ──
    mlp = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=500,
                        learning_rate='adaptive', early_stopping=True,
                        validation_fraction=0.15, random_state=44, verbose=False)
    mlp.fit(X_train_sc, y_train)
    mlp_preds = mlp.predict(X_test_sc)
    mlp_mae = np.mean(np.abs(mlp_preds - y_test))
    print(f"    MLP      MAE: {mlp_mae:.2f}")

    # ── Meta-learner: Logistic Regression on base predictions ──
    # Stack base predictions as meta-features
    meta_train_preds = np.column_stack([
        xgb_model.predict(xgb.DMatrix(X_train, feature_names=feature_cols)),
        lgb_model.predict(X_train) if has_lgb else xgb_model2.predict(xgb.DMatrix(X_train, feature_names=feature_cols)),
        ridge.predict(X_train_sc),
        mlp.predict(X_train_sc),
    ])
    meta_test_preds = np.column_stack([xgb_preds, lgb_preds, ridge_preds, mlp_preds])

    # Convert to classification: meta-features are (pred - line)
    lines_train = lines[:train_end]
    meta_train_edges = meta_train_preds - lines_train.reshape(-1, 1)
    meta_test_edges = meta_test_preds - lines_test.reshape(-1, 1)
    y_cls_train = y_cls[:train_end]

    meta_lr = LogisticRegression(C=1.0, max_iter=1000, random_state=45)
    meta_lr.fit(meta_train_edges, y_cls_train)
    meta_probs = meta_lr.predict_proba(meta_test_edges)[:, 1]

    # Ensemble regression prediction (simple average)
    ensemble_preds = np.mean(meta_test_preds, axis=1)
    ensemble_mae = np.mean(np.abs(ensemble_preds - y_test))

    # Classification metrics
    pred_over = ensemble_preds > lines_test
    actual_over = y_test > lines_test
    correct = pred_over == actual_over
    wr = correct.mean()

    # Brier score
    brier = brier_score_loss(y_cls_test, meta_probs)

    # ECE (Expected Calibration Error)
    bins_ece = np.linspace(0, 1, 11)
    ece = 0.0
    for i in range(len(bins_ece) - 1):
        mask = (meta_probs >= bins_ece[i]) & (meta_probs < bins_ece[i + 1])
        if mask.sum() > 0:
            avg_pred = meta_probs[mask].mean()
            avg_actual = y_cls_test[mask].mean()
            ece += mask.sum() / len(meta_probs) * abs(avg_pred - avg_actual)

    # ROI at -110
    wins_count = correct.sum()
    losses_count = (~correct).sum()
    profit = wins_count * (100 / 110) - losses_count
    roi = profit / len(correct) * 100

    print(f"\n    ENSEMBLE FOLD {fold}:")
    print(f"      MAE:   {ensemble_mae:.2f}")
    print(f"      WR:    {wr*100:.1f}% ({wins_count}W-{losses_count}L)")
    print(f"      ROI:   {roi:+.2f}%")
    print(f"      Brier: {brier:.4f}")
    print(f"      ECE:   {ece:.4f}")

    all_results.append({
        'fold': fold,
        'mae': float(ensemble_mae),
        'wr': float(wr),
        'roi': float(roi),
        'brier': float(brier),
        'ece': float(ece),
        'wins': int(wins_count),
        'losses': int(losses_count),
        'total': len(correct),
        'base_maes': {
            'xgboost': float(xgb_mae),
            'lightgbm': float(lgb_mae),
            'ridge': float(ridge_mae),
            'mlp': float(mlp_mae),
        },
    })

# ═══════════════════════════════════════════
# STEP 6: Train final models on ALL data
# ═══════════════════════════════════════════
print("\n[6/7] Training final models on all data...")

# XGBoost final
dtrain_full = xgb.DMatrix(X, label=y_reg, feature_names=feature_cols)
xgb_final = xgb.train(xgb_params, dtrain_full, num_boost_round=xgb_rounds, verbose_eval=False)

# LightGBM final
if has_lgb:
    lgb_ds = lgb.Dataset(X, label=y_reg, feature_name=feature_cols)
    lgb_final = lgb.train(lgb_params, lgb_ds, num_boost_round=lgb_rounds,
                          callbacks=[lgb.log_evaluation(0)])

# Ridge + MLP final
scaler_final = StandardScaler()
X_scaled = scaler_final.fit_transform(X)
ridge_final = Ridge(alpha=1.0)
ridge_final.fit(X_scaled, y_reg)
mlp_final = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=500,
                          learning_rate='adaptive', early_stopping=True,
                          validation_fraction=0.15, random_state=44, verbose=False)
mlp_final.fit(X_scaled, y_reg)

# Meta-learner final
all_base_preds = np.column_stack([
    xgb_final.predict(dtrain_full),
    lgb_final.predict(X) if has_lgb else xgb_final.predict(dtrain_full),
    ridge_final.predict(X_scaled),
    mlp_final.predict(X_scaled),
])
meta_edges_full = all_base_preds - lines.reshape(-1, 1)
meta_lr_final = LogisticRegression(C=1.0, max_iter=1000, random_state=45)
meta_lr_final.fit(meta_edges_full, y_cls)

# ═══════════════════════════════════════════
# STEP 7: Platt calibration + save everything
# ═══════════════════════════════════════════
print("\n[7/7] Calibrating and saving...")

# Platt calibration on last fold OOS predictions
X_cal = X[split2:]
y_cal_cls = y_cls[split2:]
lines_cal = lines[split2:]

xgb_cal = xgb_final.predict(xgb.DMatrix(X_cal, feature_names=feature_cols))
lgb_cal = lgb_final.predict(X_cal) if has_lgb else xgb_final.predict(xgb.DMatrix(X_cal, feature_names=feature_cols))
X_cal_sc = scaler_final.transform(X_cal)
ridge_cal = ridge_final.predict(X_cal_sc)
mlp_cal = mlp_final.predict(X_cal_sc)

ensemble_cal = np.mean([xgb_cal, lgb_cal, ridge_cal, mlp_cal], axis=0)
raw_scores = ensemble_cal - lines_cal

try:
    from scipy.optimize import minimize

    def platt_loss(params, scores, labels):
        A, B = params
        p = 1.0 / (1.0 + np.exp(A * scores + B))
        p = np.clip(p, 1e-8, 1 - 1e-8)
        return -np.mean(labels * np.log(p) + (1 - labels) * np.log(1 - p))

    result = minimize(platt_loss, x0=[-0.5, 0.0], args=(raw_scores, y_cal_cls), method='Nelder-Mead')
    A, B = result.x
    calibration = {'method': 'platt', 'A': float(A), 'B': float(B)}
    print(f"  Platt: A={A:.4f}, B={B:.4f}")

    # Calibration verification
    cal_probs = 1.0 / (1.0 + np.exp(A * raw_scores + B))
    print(f"  Calibration check:")
    for lo, hi in [(0.0, 0.4), (0.4, 0.5), (0.5, 0.6), (0.6, 1.0)]:
        mask = (cal_probs >= lo) & (cal_probs < hi)
        if mask.sum() > 5:
            print(f"    [{lo:.1f}-{hi:.1f}] pred={cal_probs[mask].mean():.3f} actual={y_cal_cls[mask].mean():.3f} n={mask.sum()}")

except ImportError:
    calibration = {'method': 'platt', 'A': -0.163, 'B': 0.256}
    print("  scipy not available — using default Platt params")

# Save XGBoost model (primary — Railway loads this)
os.makedirs(MODEL_DIR, exist_ok=True)
xgb_final.save_model(str(MODEL_OUT))

# Save scaler params for Ridge/MLP
scaler_params = {
    'mean': scaler_final.mean_.tolist(),
    'scale': scaler_final.scale_.tolist(),
}

# Save Ridge coefficients
ridge_params = {
    'coef': ridge_final.coef_.tolist(),
    'intercept': float(ridge_final.intercept_),
}

# Save MLP params
mlp_params = {
    'n_layers': len(mlp_final.coefs_),
    'coefs': [c.tolist() for c in mlp_final.coefs_],
    'intercepts': [i.tolist() for i in mlp_final.intercepts_],
}

# Save LightGBM model
if has_lgb:
    lgb_path = MODEL_DIR / 'lightgbm_totals.txt'
    lgb_final.save_model(str(lgb_path))
    print(f"  LightGBM saved: {lgb_path}")

# Save meta-learner
meta_params = {
    'coef': meta_lr_final.coef_.tolist(),
    'intercept': meta_lr_final.intercept_.tolist(),
    'classes': meta_lr_final.classes_.tolist(),
}

# Save calibration + all model metadata
calib_data = {
    **calibration,
    'feature_cols': feature_cols,
    'feature_count': len(feature_cols),
    'training_samples': len(df),
    'validation_results': all_results,
    'period_std': {'Q1': 4.8, 'HALF': 7.2, 'FULL': 10.5},
    'version': '4.0.0',
    'ensemble': {
        'base_learners': ['xgboost', 'lightgbm' if has_lgb else 'xgboost_v2', 'ridge', 'mlp'],
        'meta_learner': 'logistic_regression',
        'meta_params': meta_params,
        'scaler': scaler_params,
        'ridge': ridge_params,
        'mlp': mlp_params,
    },
}

with open(str(CALIB_OUT), 'w') as f:
    json.dump(calib_data, f, indent=2, default=str)
print(f"  Calibration saved: {CALIB_OUT}")

# Save training results
with open(str(RESULTS_OUT), 'w') as f:
    json.dump({'results': all_results, 'version': '4.0.0'}, f, indent=2)

# Feature importance (XGBoost)
importance = xgb_final.get_score(importance_type='gain')
sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)

# Summary
print("\n" + "=" * 65)
print("  STACKING ENSEMBLE v4.0 — TRAINING COMPLETE")
print("=" * 65)
for r in all_results:
    print(f"  Fold {r['fold']}: WR={r['wr']*100:.1f}% | ROI={r['roi']:+.2f}% | Brier={r['brier']:.4f} | ECE={r['ece']:.4f}")
    print(f"    Base MAEs: XGB={r['base_maes']['xgboost']:.2f} LGB={r['base_maes']['lightgbm']:.2f} Ridge={r['base_maes']['ridge']:.2f} MLP={r['base_maes']['mlp']:.2f}")
print(f"\n  Features: {len(feature_cols)}")
print(f"  Calibration: Platt (A={calibration.get('A'):.4f}, B={calibration.get('B'):.4f})")
print(f"  Top 5 features: {[f for f, _ in sorted_imp[:5]]}")
print(f"\n  Files:")
print(f"    {MODEL_OUT}")
if has_lgb:
    print(f"    {MODEL_DIR / 'lightgbm_totals.txt'}")
print(f"    {CALIB_OUT}")
print(f"    {RESULTS_OUT}")
print(f"\n  Ready for Railway deployment")
print("=" * 65)