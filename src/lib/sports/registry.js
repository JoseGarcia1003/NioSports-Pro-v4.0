// Readiness matrix: for every sport and data kind, which providers exist and
// whether each one is live, configured-but-unverified, or waiting for keys.
import { SPORTS_CONFIG, DATA_KINDS } from './config.js';
import { ADAPTERS, readiness } from './providers/index.js';

export function sportReadiness(sportId, env) {
  const cfg = SPORTS_CONFIG[sportId];
  if (!cfg) return null;
  const kinds = DATA_KINDS.map(kind => {
    const providers = cfg.providers[kind].map(id => ({ id, tier: ADAPTERS[id]?.tier ?? null, ...readiness(ADAPTERS[id], env, sportId) }));
    const state = providers.some(p => p.state === 'live') ? 'live' : providers.some(p => p.state === 'configured_unverified' || p.state === 'implemented') ? 'unverified'
      : providers.length ? 'awaiting_credentials' : 'no_provider';
    return { kind, state, providers };
  });
  const live = kinds.filter(k => k.state === 'live').length;
  const overall = live === 0 ? 'not_connected' : kinds.every(k => k.state === 'live') ? 'complete' : 'partial';
  return { sport: sportId, name: cfg.name, markets: cfg.markets, modelled: cfg.modelled, overall, kinds };
}

export const allReadiness = env => Object.keys(SPORTS_CONFIG).map(id => sportReadiness(id, env));
