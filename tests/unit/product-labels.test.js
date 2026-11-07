import { it, expect } from 'vitest';
import { modelLabel, groupLabel, marketLabel } from '../../src/lib/product/labels.js';
it('never shows raw identifiers to users', () => {
  expect(modelLabel('nba-points@1.0.0')).toBe('Modelo de puntos NBA · v1.0.0');
  expect(modelLabel('reading@reading-v1')).toBe('Lectura por reglas · v1');
  expect(groupLabel('nba:points')).toBe('NBA · Puntos de jugador');
  expect(groupLabel('nba-points@1.0.0')).toBe('Modelo de puntos NBA · v1.0.0');
  expect(marketLabel('game_total')).toBe('Total del partido');
  expect(modelLabel(null)).toBe('—');
});
