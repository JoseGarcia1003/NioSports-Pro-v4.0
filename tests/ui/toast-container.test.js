import { afterEach, describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import ToastContainer from '../../src/lib/components/ToastContainer.svelte';
import { toasts } from '../../src/lib/stores/ui.js';

afterEach(() => { cleanup(); });

describe('ToastContainer', () => {
  it('announces errors as alerts and the rest politely, and can be dismissed', async () => {
    const screen = render(ToastContainer);
    const ok = toasts.show({ message: 'Guardado', type: 'success', duration: 0 });
    toasts.show({ message: 'No se pudo guardar', type: 'error', duration: 0 });
    await Promise.resolve();
    expect(screen.getByRole('alert').textContent).toContain('Error: No se pudo guardar');
    expect(screen.getByRole('status').textContent).toContain('Hecho: Guardado');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar aviso' })[0]);
    expect(screen.queryByRole('status')).toBeNull();
    toasts.dismiss(ok);
  });
});
