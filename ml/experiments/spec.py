"""Predeclared point-projection experiment. No tuning or winner selection."""
from ml.contracts.features import FEATURES, FEATURE_NAMES

VERSION = 'nba-candidates-1'
SEED = 1729
GROUPS = {
    'long': ['home_total_l20', 'away_total_l20'],
    'short': ['home_total_l5', 'away_total_l5'],
    'medium': ['home_total_l10', 'away_total_l10'],
    'venue': ['home_home_avg', 'away_away_avg'],
    'dispersion': ['home_std', 'away_std'],
    'rest': ['home_rest_days', 'away_rest_days', 'is_b2b_home', 'is_b2b_away', 'rest_diff'],
    'context': ['altitude_ft', 'days_into_season'],
}
SCENARIOS = {
    'baseline': ['long'],
    'plus_form': ['long', 'short', 'medium'],
    'plus_rest': ['long', 'short', 'medium', 'rest'],
    'all': list(GROUPS),
    **{f'without_{g}': [other for other in GROUPS if other != g] for g in GROUPS},
}
PARAMETERS = {
    'ridge': {'alpha': 10.0, 'solver': 'svd'},
    'simple_tree': {'max_depth': 2, 'min_samples_leaf': 8, 'random_state': SEED},
    'xgboost': {'n_estimators': 40, 'max_depth': 2, 'learning_rate': 0.05,
                'objective': 'reg:squarederror', 'tree_method': 'hist',
                'subsample': 1.0, 'colsample_bytree': 1.0, 'reg_lambda': 10.0,
                'n_jobs': 1, 'random_state': SEED},
    'lightgbm': {'n_estimators': 40, 'num_leaves': 7, 'max_depth': 3,
                 'learning_rate': 0.05, 'min_child_samples': 8, 'reg_lambda': 10.0,
                 'verbosity': -1, 'n_jobs': 1, 'random_state': SEED,
                 'deterministic': True, 'force_col_wise': True},
    'mlp': {'hidden_layer_sizes': (8,), 'activation': 'tanh', 'solver': 'lbfgs',
            'alpha': 1.0, 'max_iter': 2000, 'max_fun': 30000,
            'tol': 1e-5, 'random_state': SEED},
}
BASE_MODELS = ('ridge', 'xgboost', 'lightgbm', 'mlp')
CANDIDATES = ('historical_mean', 'moving_mean', *PARAMETERS, 'mean_ensemble')


def feature_names(scenario):
    """Remove derived features when ANY prerequisite is absent; preserve F2 order."""
    selected = {name for g in SCENARIOS[scenario] for name in GROUPS[g]}
    for definition in FEATURES:
        if 'derive' in definition and all(n in selected for n in definition['derive']['args']):
            selected.add(definition['name'])
    return tuple(n for n in FEATURE_NAMES if n in selected)


def specification():
    return {'version': VERSION, 'seed': SEED, 'target': 'combined_final_points_including_overtime',
            'sport': 'basketball', 'period': 'FULL', 'origin': 'fixture',
            'groups': GROUPS, 'scenarios': {s: feature_names(s) for s in SCENARIOS},
            'parameters': PARAMETERS, 'candidates': CANDIDATES,
            'stacking': {'base_models': BASE_MODELS, 'meta': 'ridge', 'alpha': 10.0,
                         'training_inputs': 'temporal_out_of_fold_point_predictions_only'},
            'selection': None, 'primary_future_metric': 'MAE_points',
            'secondary_future_metric': 'RMSE_points', 'profitability_claims': False}
