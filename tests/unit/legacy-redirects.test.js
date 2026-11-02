import { describe, it, expect } from 'vitest';

// Retired legacy screens (no user data was stored) send people to their current home.
const cases = [
  ['picks', '/predictions'],
  ['tracking', '/predictions#history-title'],
  ['stats', '/bankroll'],
  ['results', '/bankroll'],
  ['totales', '/sports/nba/props?vista=equipos']
];

describe('legacy routes', () => {
  it.each(cases)('/%s redirects permanently to %s', async (route, target) => {
    const { load } = await import(`../../src/routes/${route}/+page.js`);
    let thrown;
    try { load(); } catch (err) { thrown = err; }
    expect(thrown).toMatchObject({ status: 308, location: target });
  });
});
