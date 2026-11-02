import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: vi.fn() }));
import Pricing from '../../src/routes/pricing/+page.svelte';

afterEach(() => cleanup());

describe('Planes during the open beta', () => {
  it('offers only what exists, for free, and no way to pay', () => {
    const screen = render(Pricing);
    const text = document.body.textContent;
    expect(text).toContain('Beta gratuita');
    expect(text).toContain('Props de equipo y totales');
    expect(text).toContain('Próximamente');
    // Retired or never-built features must not be sold.
    for (const gone of ['Exportar CSV', 'Estadísticas de tus resultados', '14.99', '29.99', 'Suscribirme']) expect(text).not.toContain(gone);
    expect(screen.queryByRole('button', { name: /suscrib/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Crear cuenta gratis/ }).getAttribute('href')).toBe('/login?modo=registro');
  });
});
