import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

const h = vi.hoisted(() => ({ hook: null }));
vi.mock('$app/stores', async () => { const { writable } = await import('svelte/store'); return { updated: writable(false) }; });
vi.mock('$app/navigation', () => ({ beforeNavigate: fn => { h.hook = fn; } }));
import { updated } from '$app/stores';
import UpdateNotice from '../../src/lib/components/UpdateNotice.svelte';

afterEach(() => { cleanup(); updated.set(false); });

describe('UpdateNotice', () => {
  it('stays hidden until a new deployment is detected, then offers to update', async () => {
    const screen = render(UpdateNotice);
    expect(screen.queryByRole('status')).toBeNull();
    updated.set(true);
    await Promise.resolve();
    expect(screen.getByRole('status').textContent).toContain('versión nueva');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeTruthy();
  });

  it('turns the next in-app navigation into a full load only after an update', () => {
    render(UpdateNotice);
    const original = window.location;
    const loc = { href: 'http://localhost/today' };
    Object.defineProperty(window, 'location', { value: loc, configurable: true });
    try {
      h.hook({ willUnload: false, to: { url: new URL('http://localhost/sports/nba/props') } });
      expect(loc.href).toBe('http://localhost/today');
      updated.set(true);
      h.hook({ willUnload: false, to: { url: new URL('http://localhost/sports/nba/props') } });
      expect(loc.href).toBe('http://localhost/sports/nba/props');
    } finally {
      Object.defineProperty(window, 'location', { value: original, configurable: true });
    }
  });
});
