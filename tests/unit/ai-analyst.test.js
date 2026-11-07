// @vitest-environment node
import { it, expect } from 'vitest';
import { signalFacts } from '../../src/lib/ai/facts.js';
import { verifyAnalysis } from '../../src/lib/ai/verifier.js';
import { explain, aiConfig } from '../../src/lib/ai/analyst.js';

const entry = { name: 'Jugador', team: 'OKC', opponent: 'CLE', side: 'under', stat: 'pts', line: 29.5, books: 5, favour: 4, against: 0, tipoff: '2026-11-03T00:00:00.000Z',
  l10: { hits: 8, n: 10 }, model: { p: 0.58, mean: 27.1, interval80: [19, 35], games: 40, model: 'nba-points@1.0.0' },
  findings: [{ weight: 1, title: 'Forma', text: 'Promedia 24,9 puntos en L10, 4,6 por debajo de la línea.' }] };
const sheet = signalFacts(entry, { day: '2026-11-02' });

it('builds a fact sheet with sources and declared unknowns', () => {
  expect(sheet.facts.find(f => f.id === 'line')).toMatchObject({ value: 29.5, source: 'The Odds API' });
  expect(sheet.facts.find(f => f.id === 'model_p').value).toBe(58);
  expect(sheet.unknowns.join(' ')).toMatch(/lesiones/);
});

it('keeps sentences whose figures all exist and excludes invented ones', () => {
  const v = verifyAnalysis('La línea está en 29,5 puntos. El modelo estima un 58 % para el menos. Promedia 31,2 puntos esta semana.', sheet);
  expect(v.checked).toBe(3); expect(v.ok).toBe(false);
  expect(v.publishable).toBe('La línea está en 29,5 puntos. El modelo estima un 58 % para el menos.');
  expect(v.excluded[0].reasons).toContain('cifra_sin_fuente:31,2');
});

it('blocks injury claims, certainty, causal claims and unregistered dates', () => {
  const v = verifyAnalysis('Llega con una lesión en el tobillo. Es una apuesta segura. Baja porque está cansado. El 2026-10-01 anotó poco.', sheet);
  expect(v.publishable).toBe('');
  expect(v.excluded.map(e => e.reasons[0])).toEqual(['afirmacion_lesion_o_alineacion_sin_dato', 'lenguaje_de_certeza', 'causalidad_no_demostrada', 'fecha_no_registrada:2026-10-01']);
});

it('stays disabled without explicit configuration and never calls a provider', async () => {
  expect(aiConfig({}).enabled).toBe(false);
  expect(aiConfig({ AI_PROVIDER: 'anthropic' }).reason).toBe('missing_key');
  expect(await explain(sheet, { env: {}, client: { messages: { create: () => { throw new Error('called'); } } } })).toEqual({ status: 'disabled', reason: 'not_configured' });
});

it('publishes only the verified part of a model answer', async () => {
  const calls = [];
  const client = { messages: { create: async req => { calls.push(req); return { content: [{ type: 'text', text: 'El modelo da un 58 % al menos de 29,5. Es fijo.' }] }; } } };
  const r = await explain(sheet, { env: { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }, client });
  expect(calls[0].model).toBe('claude-opus-5-5'); expect(calls[0].system).toMatch(/EXCLUSIVAMENTE/);
  expect(r).toMatchObject({ status: 'ok', text: 'El modelo da un 58 % al menos de 29,5.', fullyVerified: false });
});
