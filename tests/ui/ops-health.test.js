import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: fetchMock }));
import OpsHealth from '../../src/lib/components/OpsHealth.svelte';

afterEach(() => { cleanup(); fetchMock.mockReset(); });

describe('OpsHealth', () => {
  it('renders nothing for non-owners', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    const screen = render(OpsHealth);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ops/health'));
    expect(screen.queryByRole('region')).toBeNull();
    expect(document.body.textContent).not.toContain('Estado del sistema');
  });

  it('shows checks, real-user vitals and errors to the owner', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      checkedAt: '2026-11-02T12:00:00Z', stats: { lastGame: '2026-11-01', lastIngest: new Date().toISOString() },
      cache: [], signals: { editions: 0 }, positions: 0, errors24h: 1,
      vitals: [{ metric: 'LCP', device: 'mobile', n: 12, p75: 1840.2 }, { metric: 'CLS', device: 'desktop', n: 9, p75: 0.31 }],
      topErrors: [{ source: 'client', route: '/today', message: 'TypeError: x', n: 1, last: '2026-11-02T11:00:00Z' }]
    })));
    const screen = render(OpsHealth);
    const panel = await screen.findByRole('region', { name: 'Estado del sistema' });
    expect(panel.textContent).toContain('Estadísticas NBA');
    expect(panel.textContent).toContain('1840 ms');
    expect(panel.textContent).toContain('0.310');
    expect(panel.querySelector('.poor')?.textContent).toBe('0.310');
    expect(panel.textContent).toContain('TypeError: x');
  });
});
