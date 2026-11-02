import { describe, it, expect } from 'vitest';

// Retired legacy screens (no user data was stored) send people to their current home.
const cases = [
  ['picks', '/predictions'],
  ['tracking', '/predictions#history-title'],
  ['stats', '/bankroll'],
  ['results', '/bankroll'],
  ['totales', '/sports/nba/puntos']
];

describe('legacy routes', () => {
  it('retires Match Studio into Mercado de puntos', async () => {
    const { load } = await import('../../src/routes/sports/nba/analisis/+page.js');
    let thrown;
    try { load(); } catch (err) { thrown = err; }
    expect(thrown).toMatchObject({ status: 308, location: '/sports/nba/puntos' });
  });
  it('sends the old team-props tab to Mercado de puntos and keeps players on Props', async () => {
    const { load } = await import('../../src/routes/sports/nba/props/+page.js');
    let thrown;
    try { load({ url: new URL('http://x/sports/nba/props?vista=equipos') }); } catch (err) { thrown = err; }
    expect(thrown).toMatchObject({ status: 308, location: '/sports/nba/puntos' });
    expect(load({ url: new URL('http://x/sports/nba/props') })).toBeUndefined();
  });
  it.each(cases)('/%s redirects permanently to %s', async (route, target) => {
    const { load } = await import(`../../src/routes/${route}/+page.js`);
    let thrown;
    try { load(); } catch (err) { thrown = err; }
    expect(thrown).toMatchObject({ status: 308, location: target });
  });
});
