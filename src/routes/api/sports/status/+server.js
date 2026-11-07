import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { allReadiness } from '$lib/sports/registry.js';

// Public readiness of each sport. States only: never key names or values.
export function GET() {
  const sports = allReadiness(env).map(s => ({ ...s, kinds: s.kinds.map(k => ({ kind: k.kind, state: k.state, providers: k.providers.map(p => ({ id: p.id, state: p.state, label: p.label })) })) }));
  return json({ sports }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
