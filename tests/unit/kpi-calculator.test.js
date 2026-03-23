import { describe, it, expect } from 'vitest';
import { calculateUserKPIs } from '$lib/services/kpi-calculator.js';

describe('calculateUserKPIs', () => {
  it('returns empty state when no picks', () => {
    const result = calculateUserKPIs([]);
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe('—');
    expect(result[0].label).toBe('Win Rate');
    expect(result[0].empty).toBe(true);
  });

  it('returns empty state when null', () => {
    const result = calculateUserKPIs(null);
    expect(result).toHaveLength(4);
    expect(result[0].empty).toBe(true);
  });

  it('calculates win rate correctly', () => {
    const picks = [
      { status: 'win', odds: -110, createdAt: '2026-01-01' },
      { status: 'win', odds: -110, createdAt: '2026-01-02' },
      { status: 'loss', odds: -110, createdAt: '2026-01-03' },
      { status: 'win', odds: -110, createdAt: '2026-01-04' },
    ];
    const result = calculateUserKPIs(picks);
    expect(result[0].value).toBe('75.0%');
    expect(result[0].empty).toBe(false);
  });

  it('calculates ROI correctly with -110 odds', () => {
    const picks = [
      { status: 'win', odds: -110, createdAt: '2026-01-01' },
      { status: 'loss', odds: -110, createdAt: '2026-01-02' },
    ];
    const result = calculateUserKPIs(picks);
    // Win pays 100/110 = 0.909, Loss costs 1. Net = 0.909 - 1 = -0.091
    // ROI = (-0.091 / 2) * 100 = -4.5%
    expect(result[1].value).toContain('%');
    expect(result[1].empty).toBe(false);
  });

  it('calculates winning streak', () => {
    const picks = [
      { status: 'win', odds: -110, createdAt: '2026-01-03' },
      { status: 'win', odds: -110, createdAt: '2026-01-02' },
      { status: 'win', odds: -110, createdAt: '2026-01-01' },
    ];
    const result = calculateUserKPIs(picks);
    expect(result[2].value).toBe('3W');
  });

  it('calculates losing streak', () => {
    const picks = [
      { status: 'loss', odds: -110, createdAt: '2026-01-03' },
      { status: 'loss', odds: -110, createdAt: '2026-01-02' },
      { status: 'win', odds: -110, createdAt: '2026-01-01' },
    ];
    const result = calculateUserKPIs(picks);
    expect(result[2].value).toBe('2L');
  });

  it('ignores pending picks for win rate', () => {
    const picks = [
      { status: 'win', odds: -110, createdAt: '2026-01-01' },
      { status: 'pending', odds: -110, createdAt: '2026-01-02' },
    ];
    const result = calculateUserKPIs(picks);
    expect(result[0].value).toBe('100.0%');
  });
});