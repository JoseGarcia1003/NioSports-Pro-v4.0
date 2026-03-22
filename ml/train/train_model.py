"""
Entrena modelo XGBoost con walk-forward validation.
Optimiza hiperparámetros con Optuna.
Compara contra modelo heurístico baseline.

Uso: python ml/train/train_model.py
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import optuna
from sklearn.metrics import mean_absolute_error, brier_score_loss
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import TimeSeriesSplit
from datetime import datetime

optuna.logging.set_verbosity(optuna.logging.WARNING)

# Features que usa el modelo (excluir metadata y target)
FEATURE_COLS = [
    'home_total_l5', 'home_total_l10', 'home_total_l20', 'home_home_avg', 'home_std',
    'away_total_l5', 'away_total_l10', 'away_total_l20', 'away_away_avg', 'away_std',
    'total_sum_l5', 'total_sum_l10', 'total_diff_l5',
    'home_rest_days', 'away_rest_days', 'is_b2b_home', 'is_b2b_away', 'rest_diff',
    'altitude_ft', 'days_into_season',
]

TARGET_COL = 'actual_total'

def load_dataset():
    """Carga el dataset de features."""
    path = 'ml/data/nba_features.csv'
    if not os.path.exists(path):
        print("ERROR: Run feature_engineering.py first")
        sys.exit(1)
    
    df = pd.read_csv(path)
    df['_date'] = pd.to_datetime(df['_date'])
    print(f"  Loaded {len(df)} samples")
    print(f"  Features: {len(FEATURE_COLS)}")
    return df

def walk_forward_split(df, n_test_seasons=2):
    """
    Walk-forward temporal splits.
    Train on earlier seasons, test on later seasons.
    NUNCA usa datos futuros para entrenar.
    """
    df = df.sort_values('_date').reset_index(drop=True)
    
    # Determinar temporadas por año
    df['_season'] = df['_date'].apply(
        lambda d: d.year if d.month >= 10 else d.year - 1
    )
    seasons = sorted(df['_season'].unique())
    
    if len(seasons) < 3:
        print(f"ERROR: Need at least 3 seasons, found {len(seasons)}")
        sys.exit(1)
    
    splits = []
    for i in range(n_test_seasons):
        test_season = seasons[-(i+1)]
        train_seasons = [s for s in seasons if s < test_season]
        
        train_mask = df['_season'].isin(train_seasons)
        test_mask = df['_season'] == test_season
        
        if train_mask.sum() > 100 and test_mask.sum() > 50:
            splits.append({
                'train_idx': df[train_mask].index.tolist(),
                'test_idx': df[test_mask].index.tolist(),
                'train_seasons': train_seasons,
                'test_season': test_season,
            })
    
    splits.reverse()  # Chronological order
    return splits

def optimize_hyperparams(X_train, y_train, n_trials=50):
    """Optimiza hiperparámetros con Optuna."""
    print("  Optimizing hyperparameters...")
    
    def objective(trial):
        params = {
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.1, log=True),
            'max_depth': trial.suggest_int('max_depth', 3, 7),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'reg_alpha': trial.suggest_float('reg_alpha', 0.0, 10.0),
            'reg_lambda': trial.suggest_float('reg_lambda', 0.0, 10.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'n_estimators': 500,
            'early_stopping_rounds': 30,
            'objective': 'reg:squarederror',
            'tree_method': 'hist',
            'verbosity': 0,
        }
        
        # TimeSeriesSplit for internal validation
        tscv = TimeSeriesSplit(n_splits=3)
        scores = []
        
        for train_idx, val_idx in tscv.split(X_train):
            X_t, X_v = X_train.iloc[train_idx], X_train.iloc[val_idx]
            y_t, y_v = y_train.iloc[train_idx], y_train.iloc[val_idx]
            
            model = xgb.XGBRegressor(**params)
            model.fit(X_t, y_t, eval_set=[(X_v, y_v)], verbose=False)
            
            preds = model.predict(X_v)
            mae = mean_absolute_error(y_v, preds)
            scores.append(mae)
        
        return np.mean(scores)
    
    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
    
    print(f"  Best MAE: {study.best_value:.2f}")
    print(f"  Best params: {json.dumps(study.best_params, indent=2)}")
    
    return study.best_params

def train_model(X_train, y_train, params):
    """Entrena modelo final con los mejores hiperparámetros."""
    model_params = {
        **params,
        'n_estimators': 500,
        'early_stopping_rounds': 30,
        'objective': 'reg:squarederror',
        'tree_method': 'hist',
        'verbosity': 0,
    }
    
    # Split interno para early stopping
    split_idx = int(len(X_train) * 0.85)
    X_t = X_train.iloc[:split_idx]
    y_t = y_train.iloc[:split_idx]
    X_v = X_train.iloc[split_idx:]
    y_v = y_train.iloc[split_idx:]
    
    model = xgb.XGBRegressor(**model_params)
    model.fit(X_t, y_t, eval_set=[(X_v, y_v)], verbose=False)
    
    return model

def evaluate_model(model, X_test, y_test, df_test, default_line=220):
    """Evalúa modelo en test set."""
    predictions = model.predict(X_test)
    
    # MAE
    mae = mean_absolute_error(y_test, predictions)
    
    # Simular over/under betting
    # Usar total_sum_l10 como proxy de la línea de mercado
    lines = df_test['total_sum_l10'].values / 2  # Approximar línea
    
    wins = 0
    losses = 0
    total_bets = 0
    
    for i in range(len(predictions)):
        pred = predictions[i]
        actual = y_test.iloc[i]
        line = lines[i] if not np.isnan(lines[i]) else default_line
        
        # Solo apostar si hay edge > 2 puntos
        edge = abs(pred - line)
        if edge < 2:
            continue
        
        direction = 'OVER' if pred > line else 'UNDER'
        
        if direction == 'OVER':
            won = actual > line
        else:
            won = actual < line
        
        if actual == line:
            continue  # Push
        
        total_bets += 1
        if won:
            wins += 1
        else:
            losses += 1
    
    win_rate = wins / total_bets if total_bets > 0 else 0
    
    # ROI (asumiendo -110 odds)
    profit = wins * (100/110) - losses * 1
    roi = profit / total_bets * 100 if total_bets > 0 else 0
    
    return {
        'mae': round(mae, 2),
        'win_rate': round(win_rate * 100, 1),
        'wins': wins,
        'losses': losses,
        'total_bets': total_bets,
        'roi_pct': round(roi, 2),
        'profit_units': round(profit, 2),
        'mean_prediction': round(np.mean(predictions), 1),
        'mean_actual': round(np.mean(y_test), 1),
    }

def heuristic_baseline(df_test):
    """Baseline: promedios ponderados (modelo actual de NioSports)."""
    wins = 0
    losses = 0
    total = 0
    
    for _, row in df_test.iterrows():
        # Modelo heurístico: promedio L5(0.45) + L10(0.30) + L20(0.25)
        pred = (
            row['total_sum_l5'] / 2 * 0.45 +
            row['total_sum_l10'] / 2 * 0.30 +
            (row.get('total_sum_l20', row['total_sum_l10']) / 2) * 0.25
        ) * 2  # Multiplicar por 2 porque sum es de ambos equipos
        
        # Usar L10 promedio como línea
        line = row['total_sum_l10'] / 2
        actual = row['actual_total']
        
        edge = abs(pred - line)
        if edge < 2:
            continue
        
        direction = 'OVER' if pred > line else 'UNDER'
        
        if direction == 'OVER':
            won = actual > line
        else:
            won = actual < line
        
        if actual == line:
            continue
        
        total += 1
        if won:
            wins += 1
        else:
            losses += 1
    
    win_rate = wins / total if total > 0 else 0
    profit = wins * (100/110) - losses
    roi = profit / total * 100 if total > 0 else 0
    
    return {
        'win_rate': round(win_rate * 100, 1),
        'wins': wins,
        'losses': losses,
        'total_bets': total,
        'roi_pct': round(roi, 2),
    }

def main():
    print("═══════════════════════════════════════════")
    print("  NioSports Pro — XGBoost Training")
    print("═══════════════════════════════════════════")
    
    df = load_dataset()
    splits = walk_forward_split(df, n_test_seasons=2)
    
    print(f"\n  Walk-forward splits: {len(splits)}")
    for s in splits:
        print(f"    Train: {s['train_seasons']} → Test: {s['test_season']} ({len(s['test_idx'])} games)")
    
    all_results = []
    best_model = None
    best_params = None
    
    for i, split in enumerate(splits):
        print(f"\n{'='*50}")
        print(f"  FOLD {i+1}: Test season {split['test_season']}")
        print(f"{'='*50}")
        
        X_train = df.loc[split['train_idx'], FEATURE_COLS]
        y_train = df.loc[split['train_idx'], TARGET_COL]
        X_test = df.loc[split['test_idx'], FEATURE_COLS]
        y_test = df.loc[split['test_idx'], TARGET_COL]
        df_test = df.loc[split['test_idx']]
        
        # Optimize hyperparams (only on first fold to save time)
        if i == 0:
            best_params = optimize_hyperparams(X_train, y_train, n_trials=50)
        
        # Train
        print("  Training model...")
        model = train_model(X_train, y_train, best_params)
        
        # Evaluate XGBoost
        print("  Evaluating XGBoost...")
        xgb_results = evaluate_model(model, X_test, y_test, df_test)
        
        # Evaluate baseline
        print("  Evaluating heuristic baseline...")
        baseline_results = heuristic_baseline(df_test)
        
        print(f"\n  ┌─────────────────────────────────────┐")
        print(f"  │ XGBoost:   MAE={xgb_results['mae']}, WR={xgb_results['win_rate']}%, ROI={xgb_results['roi_pct']}%")
        print(f"  │ Baseline:  WR={baseline_results['win_rate']}%, ROI={baseline_results['roi_pct']}%")
        print(f"  │ XGBoost {'WINS' if xgb_results['win_rate'] > baseline_results['win_rate'] else 'LOSES'} vs baseline")
        print(f"  └─────────────────────────────────────┘")
        
        all_results.append({
            'fold': i + 1,
            'test_season': split['test_season'],
            'xgboost': xgb_results,
            'baseline': baseline_results,
        })
        
        best_model = model
    
    # Save model and results
    os.makedirs('ml/models', exist_ok=True)
    
    model_path = 'ml/models/xgboost_totals.json'
    best_model.save_model(model_path)
    print(f"\n  Model saved to {model_path}")
    
    params_path = 'ml/models/best_params.json'
    with open(params_path, 'w') as f:
        json.dump(best_params, f, indent=2)
    
    results_path = 'ml/models/training_results.json'
        with open(results_path, 'w') as f:
            json.dump({
                'trained_at': datetime.now().isoformat(),
                'feature_cols': FEATURE_COLS,
                'folds': all_results,
            }, f, indent=2, default=str)
    
    # Feature importance
    importance = dict(zip(FEATURE_COLS, best_model.feature_importances_))
    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    print(f"\n  Top 10 features:")
    for feat, imp in sorted_imp[:10]:
        print(f"    {feat}: {imp:.4f}")

if __name__ == '__main__':
    main()