"""Real estimator adapters for fixture experiments; no inference-service registration."""
import copy
import warnings
import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.compose import TransformedTargetRegressor
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from .spec import PARAMETERS, BASE_MODELS, feature_names


class MeanReference(RegressorMixin, BaseEstimator):
    def fit(self, X, y):
        self.mean_ = float(np.mean(y))
        return self

    def predict(self, X):
        return np.full(len(X), self.mean_)


class MovingReference(RegressorMixin, BaseEstimator):
    """Arithmetic average of home/away L20 COMBINED totals, not their sum."""
    def fit(self, X, y):
        return self

    def predict(self, X):
        return np.mean(X, axis=1)


def estimator(name):
    if name == 'historical_mean':
        return MeanReference()
    if name == 'moving_mean':
        return MovingReference()
    params = copy.deepcopy(PARAMETERS[name])
    if name == 'ridge':
        return make_pipeline(StandardScaler(), Ridge(**params))
    if name == 'simple_tree':
        return DecisionTreeRegressor(**params)
    if name == 'xgboost':
        return XGBRegressor(**params)
    if name == 'lightgbm':
        return LGBMRegressor(**params)
    # Scale X and y on fit only; avoid optimizing a neural net on raw 200-point targets.
    return TransformedTargetRegressor(
        regressor=make_pipeline(StandardScaler(), MLPRegressor(**params)),
        transformer=StandardScaler())


def matrix(rows, names):
    return np.asarray([[r['features'][n] for n in names] for r in rows], dtype=float)


class Candidate:
    def __init__(self, name, scenario='all'):
        self.name, self.scenario = name, scenario
        self.names = feature_names('baseline' if name == 'moving_mean' else scenario)
        self.model = None
        self.members = None
        self.train_ids = ()

    def fit(self, rows):
        # Runner validates dataset provenance/numerics before invoking these internal adapters.
        if not rows:
            raise ValueError('EMPTY_TRAIN')
        self.model, self.members, self.train_ids = None, None, ()
        if self.name == 'mean_ensemble':
            members = [Candidate(n, self.scenario).fit(rows) for n in BASE_MODELS]
            self.members = members  # publish only after every member succeeded
        else:
            model = estimator(self.name)
            with warnings.catch_warnings():
                warnings.simplefilter('error', ConvergenceWarning)
                model.fit(matrix(rows, self.names), np.asarray([r['target'] for r in rows], dtype=float))
            self.model = model
        self.train_ids = tuple(r['id'] for r in rows)
        return self

    def predict(self, rows):
        if not self.train_ids:
            raise ValueError('NOT_FITTED')
        values = (np.mean([m.predict(rows) for m in self.members], axis=0)
                  if self.members else self.model.predict(matrix(rows, self.names)))
        result = np.asarray(values, dtype=float)
        if result.shape != (len(rows),) or not np.isfinite(result).all() or (result < 0).any():
            raise ValueError('INVALID_POINT_PROJECTION')
        return result
