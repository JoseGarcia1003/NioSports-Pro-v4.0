"""Metadata-only temporal planning. No reading targets or feature values."""
from datetime import datetime, timedelta, timezone
import hashlib
import json

VERSION = 'temporal-protocol-1'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def instant(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.utcoffset() is None:
        raise ValueError('TIMEZONE_REQUIRED')
    return parsed.astimezone(timezone.utc)


def iso(value):
    return instant(value).isoformat()


def metadata(records):
    if not records:
        raise ValueError('EMPTY_METADATA')
    seen, clean = set(), []
    for r in records:
        if set(r) != {'id', 'group', 'asOf', 'featuresAvailableAt', 'labelAvailableAt'}:
            raise ValueError('METADATA_FIELDS_INVALID')
        if any(not isinstance(r[k], str) or not r[k] for k in r):
            raise ValueError('METADATA_TYPE_INVALID')
        if r['id'] in seen:
            raise ValueError('DUPLICATE_EVENT')
        seen.add(r['id'])
        item = {**r, **{k: iso(r[k]) for k in ('asOf','featuresAvailableAt','labelAvailableAt')}}
        if instant(item['featuresAvailableAt']) > instant(item['asOf']):
            raise ValueError('FUTURE_FEATURES')
        if instant(item['labelAvailableAt']) <= instant(item['asOf']):
            raise ValueError('LABEL_BEFORE_EVENT')
        clean.append(item)
    return sorted(clean, key=lambda r: (r['asOf'], r['id']))


def groups(records):
    # Caller groups and simultaneous forecast instants are BOTH indivisible.
    parent=list(range(len(records)))
    def find(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]]
            i=parent[i]
        return i
    seen_group, seen_time = {}, {}
    for i,r in enumerate(records):
        for index,key in ((seen_group,r['group']),(seen_time,r['asOf'])):
            if key in index:parent[find(i)]=find(index[key])
            index[key]=i
    clusters={}
    for i,r in enumerate(records):clusters.setdefault(find(i),[]).append(r)
    return sorted([sorted(g, key=lambda r: (r['asOf'], r['id'])) for g in clusters.values()], key=lambda g:g[0]['asOf'])


def train_before(records, cutoff, gap_hours):
    boundary = instant(cutoff)-timedelta(hours=gap_hours)
    accepted, excluded = [], []
    for group in groups(records):
        if all(instant(r['labelAvailableAt']) < boundary for r in group):
            accepted.extend(r['id'] for r in group)
        else:
            excluded.extend(r['id'] for r in group)
    return accepted, excluded


def walk_forward(records, *, initial_groups, block_groups, gap_hours):
    records = metadata(records)
    if (type(initial_groups) is not int or initial_groups < 2 or type(block_groups) is not int
            or block_groups < 1 or type(gap_hours) not in (int,float) or not 0 <= gap_hours <= 8760):
        raise ValueError('INVALID_FOLD_POLICY')
    grouped = groups(records)
    folds = []
    for start in range(initial_groups, len(grouped), block_groups):
        held = [r for g in grouped[start:start+block_groups] for r in g]
        earlier = [r for g in grouped[:start] for r in g]
        train, purged = train_before(earlier, held[0]['asOf'], gap_hours)
        if not train:
            raise ValueError('INSUFFICIENT_FOLD_TRAIN')
        folds.append({'train': train, 'predict':[r['id'] for r in held],
                      'fitBefore': held[0]['asOf'], 'purged':purged})
    if not folds:
        raise ValueError('INSUFFICIENT_OOF_GROUPS')
    return folds


def plan(records, policy):
    required = {'trainEnd','validationEnd','calibrationEnd','evaluationAsOf',
                'gapHours','initialGroups','blockGroups'}
    if set(policy) != required:
        raise ValueError('POLICY_FIELDS_INVALID')
    clean = metadata(records)
    cuts = [instant(policy[k]) for k in ('trainEnd','validationEnd','calibrationEnd','evaluationAsOf')]
    if not cuts[0] < cuts[1] < cuts[2] <= cuts[3]:
        raise ValueError('UNORDERED_CUTOFFS')
    gap = policy['gapHours']
    if type(gap) not in (int,float) or not 0 <= gap <= 8760:
        raise ValueError('INVALID_EMBARGO')
    buckets = {k:[] for k in ('train','validation','calibration','reserved')}
    excluded = []
    def bucket(r):
        date = instant(r['asOf'])
        return 'train' if date<cuts[0] else 'validation' if date<cuts[1] else 'calibration' if date<cuts[2] else 'reserved'
    for group in groups(clean):
        roles = {bucket(r) for r in group}
        if len(roles) != 1:
            excluded.append({'ids':[r['id'] for r in group], 'reason':'GROUP_CROSSES_BOUNDARY'})
            continue
        role = roles.pop()
        # Reservation metadata can contain future events. Their labels are never consumed.
        if role!='reserved' and any(instant(r['labelAvailableAt']) >= cuts[3] for r in group):
            excluded.append({'ids':[r['id'] for r in group], 'reason':'LABEL_NOT_AVAILABLE_AT_EVALUATION'})
            continue
        buckets[role].extend(group)
    if any(not buckets[k] for k in ('train','validation','calibration')):
        raise ValueError('EMPTY_DEVELOPMENT_PARTITION')
    development = sorted(buckets['train']+buckets['validation'], key=lambda r:(r['asOf'],r['id']))
    # Explicit validation groups, with expanding training history and availability embargo.
    validation_folds = []
    blocks = groups(buckets['validation'])
    block_size = policy['blockGroups']
    if type(block_size) is not int or block_size < 1:
        raise ValueError('INVALID_FOLD_POLICY')
    for start in range(0,len(blocks),block_size):
        held = [r for g in blocks[start:start+block_size] for r in g]
        train, purged = train_before(development,held[0]['asOf'],gap)
        if not train:raise ValueError('INSUFFICIENT_VALIDATION_TRAIN')
        validation_folds.append({'train':train,'predict':[r['id'] for r in held],
                                 'fitBefore':held[0]['asOf'],'purged':purged})
    final_train, final_purged = train_before(development,buckets['calibration'][0]['asOf'],gap)
    if not final_train:raise ValueError('INSUFFICIENT_FINAL_TRAIN')
    eligible = [r for r in development if r['id'] in set(final_train)]
    oof = walk_forward(eligible,initial_groups=policy['initialGroups'],block_groups=block_size,gap_hours=gap)
    normalized = {**policy, **{k:iso(policy[k]) for k in ('trainEnd','validationEnd','calibrationEnd','evaluationAsOf')}}
    result = {'version':VERSION,'metadataHash':digest(clean),'policy':normalized,
              'partitions':{k:[r['id'] for r in v] for k,v in buckets.items()},'excluded':excluded,
              'validationFolds':validation_folds,'finalTrain':final_train,'finalPurged':final_purged,'oofFolds':oof,
              'testFinal':{'status':'UNAVAILABLE_INDEPENDENT_DATA','locked':True,
                           'reason':'Reservation is not proof of independence; no final-test reader in F5'}}
    return {**result,'planHash':digest(result)}
