import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Measures WCAG 2.x contrast for the brand tokens actually shipped in brand.css.
const css = readFileSync(resolve(process.cwd(), 'src/lib/styles/brand.css'), 'utf8');

function block(selector) {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m => [m[1], m[2]]));
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  dark: block(':root, [data-theme="dark"]'),
  light: { ...block(':root, [data-theme="dark"]'), ...block('[data-theme="light"]') }
};

// Body text and the semantic hit/miss colours carry information: AA (4.5:1) on
// every surface they appear on. Action labels are short bold text: also 4.5:1.
const TEXT = ['ink', 'muted', 'accent', 'hit', 'miss'];
const SURFACES = ['nio-page', 'nio-surface', 'nio-raised'];

describe('brand contrast (WCAG AA)', () => {
  for (const [name, t] of Object.entries(themes)) {
    for (const fg of TEXT) {
      for (const bg of SURFACES) {
        it(`${name}: --nio-${fg} on --${bg} ≥ 4.5`, () => {
          expect(contrast(t[`nio-${fg}`], t[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    it(`${name}: action label on action ≥ 4.5`, () => {
      expect(contrast(t['nio-action-ink'], t['nio-action'])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('matches the reference values of the formula', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});

import { teamColor, teamInk } from '../../src/lib/product/teams.js';
import { TEAMS } from '../../src/lib/nba/season.js';
describe('team monogram badges', () => {
  it('every team badge text reaches AA (4.5:1) on its own colour', () => {
    for (const code of Object.keys(TEAMS)) expect(contrast(teamInk(code), teamColor(code)), code).toBeGreaterThanOrEqual(4.5);
  });
});
