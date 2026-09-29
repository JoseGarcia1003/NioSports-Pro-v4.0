"""Point-regression meta-model fitted ONLY to predictions from earlier training rows."""
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from .candidates import Candidate
from .protocol import validate_dataset, partition, timestamp
from .spec import BASE_MODELS


def fit_temporal_stack(data, folds, train_ids, predict_ids, scenario='all'):
    rows = validate_dataset(data)
    train, predict = partition(rows, train_ids, predict_ids)
    if not folds:
        raise ValueError('OOF_REQUIRED')
    receipts, seen, matrices, labels = [], set(), [], []
    for fold in folds:
        ids = set(fold['train']) | set(fold['predict'])
        if not ids <= set(train_ids) or seen & set(fold['predict']):
            raise ValueError('OOF_SCOPE_OR_DUPLICATE')
        earlier, held_out = partition(rows, fold['train'], fold['predict'])
        columns = [Candidate(name, scenario).fit(earlier).predict(held_out) for name in BASE_MODELS]
        matrices.append(np.column_stack(columns))
        labels.extend(r['target'] for r in held_out)
        seen.update(fold['predict'])
        receipts.append({'trainIds': list(fold['train']), 'predictionIds': list(fold['predict']),
                         'trainedThrough': max((r['labelAvailableAt'] for r in earlier), key=timestamp),
                         'predictionFrom': min((r['asOf'] for r in held_out), key=timestamp),
                         'predictions': np.column_stack(columns).tolist()})
    if len(seen) < 2:
        raise ValueError('OOF_SAMPLE_TOO_SMALL')
    # Continuous target: LogisticRegression would require an unjustified binary target.
    meta = make_pipeline(StandardScaler(), Ridge(alpha=10.0, solver='svd'))
    meta.fit(np.vstack(matrices), np.asarray(labels))
    members = [Candidate(name, scenario).fit(train) for name in BASE_MODELS]
    final = np.column_stack([m.predict(predict) for m in members])
    values = meta.predict(final)
    if not np.isfinite(values).all() or (values < 0).any():
        raise ValueError('INVALID_STACK_PROJECTION')
    return {'predictions': values.tolist(), 'oofIds': sorted(seen), 'folds': receipts,
            'baseModels': list(BASE_MODELS), 'metaModel': 'ridge_points',
            'trainingIds': list(train_ids), 'predictionIds': list(predict_ids)}
