import { describe, it, expect } from 'vitest';
import { toGame } from '../../src/lib/nba/props.js';
import { analyseProp } from '../../src/lib/nba/analysis.js';

// [date, opp, home, min, pts, reb, ast, fg3m, season, team]
const g = (pts, { opp = 'CHI', home = true, min = 34, season = '2026-27' } = {}) => toGame(['2026-10-30', opp, home, min, pts, 5, 4, 2, season, 'BOS']);
const strong = [g(30), g(28), g(31), g(27), g(29), g(26), g(25), g(30), g(28), g(24), g(20, { season: '2025-26' }), g(21, { season: '2025-26' })];
const defense = { ORL: { games: 10, pts: 125, reb: 45, ast: 28, fg3m: 14 }, CHI: { games: 10, pts: 105, reb: 40, ast: 22, fg3m: 11 }, MIA: { games: 10, pts: 110, reb: 42, ast: 24, fg3m: 12 } };

describe('prop reading', () => {
  it('builds a favourable reading from consistent evidence and quotes the sample', () => {
    const r = analyseProp({ games: strong, history: strong, stat: 'pts', side: 'over', line: 23.5, opponent: 'ORL', home: true, defense });
    expect(r.reading).toBe('favorable');
    const form = r.findings.find(f => f.title === 'Forma reciente');
    expect(form.text).toBe('Supera 23,5 en 10 de sus últimos 10 partidos (100 %).');
    expect(r.findings.find(f => f.title === 'Defensa del rival').weight).toBe(1);
  });

  it('reverses the same evidence for the under side', () => {
    const r = analyseProp({ games: strong, history: strong, stat: 'pts', side: 'under', line: 23.5, opponent: 'ORL', home: true, defense });
    expect(r.reading).toBe('desfavorable');
    expect(r.findings.find(f => f.title === 'Forma reciente').text).toContain('Queda por debajo de 23,5 en 0 de');
  });

  it('never weighs tiny head-to-head samples or short defensive samples', () => {
    const hist = [...strong, g(10, { opp: 'ORL' }), g(12, { opp: 'ORL' })];
    const thin = { ...defense, ORL: { ...defense.ORL, games: 4 } };
    const r = analyseProp({ games: strong, history: hist, stat: 'pts', side: 'over', line: 23.5, opponent: 'ORL', home: true, defense: thin });
    const h2h = r.findings.find(f => f.title === 'Contra ORL');
    expect(h2h.weight).toBe(0);
    expect(h2h.caution).toBe(true);
    expect(r.findings.find(f => f.title === 'Defensa del rival').weight).toBe(0);
  });

  it('flags falling minutes against an over and a short current season', () => {
    const games = [g(20, { min: 22 }), g(22, { min: 24 }), g(21, { min: 20 }), g(19, { min: 34, season: '2025-26' }), g(25, { min: 35, season: '2025-26' })];
    const r = analyseProp({ games, history: games, stat: 'pts', side: 'over', line: 20.5, opponent: 'MIA', home: false, defense });
    expect(r.findings.some(f => f.title === 'Temporada corta' && f.caution)).toBe(true);
  });

  it('omits findings it cannot support instead of filling gaps', () => {
    const r = analyseProp({ games: [g(20)], history: null, stat: 'pts', side: 'over', line: 19.5, opponent: 'XXX', home: true, defense: null });
    expect(r.findings.map(f => f.title)).toEqual(['Temporada corta']);
    expect(r.reading).toBe('mixta');
  });

  it('keeps two aligned signals with neutral recent form as a mixed reading', () => {
    // L10 exactly at 50 %: form neutral; only margin and trend lean over.
    const games = [g(30), g(28), g(31), g(27), g(29), g(20), g(21), g(19), g(22), g(18), g(20), g(21), g(19), g(22), g(20)];
    const r = analyseProp({ games, history: games, stat: 'pts', side: 'over', line: 23.5, opponent: 'MIA', home: false, defense });
    expect(r.findings.find(f => f.title === 'Forma reciente').weight).toBe(0);
    expect(r.favour).toBeLessThan(3);
    expect(r.reading).toBe('mixta');
  });
});
