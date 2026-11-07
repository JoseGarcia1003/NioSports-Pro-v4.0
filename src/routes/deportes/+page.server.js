import { env } from '$env/dynamic/private';
import { allReadiness } from '$lib/sports/registry.js';

// Rendered on the server: readiness depends only on configuration, so the
// cards arrive with the HTML instead of after a second request.
export function load() {
  return { sports: allReadiness(env).map(s => ({ ...s, kinds: s.kinds.map(k => ({ kind: k.kind, state: k.state })) })) };
}
