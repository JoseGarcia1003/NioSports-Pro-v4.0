import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import LoginExperience from '../../src/lib/components/LoginExperience.svelte';
import { loginWithEmail, registerWithEmail, resetPassword, loginWithGoogle } from '$lib/firebase';
import { goto } from '$app/navigation';

vi.mock('$lib/firebase', () => ({ loginWithEmail: vi.fn(), registerWithEmail: vi.fn(), resetPassword: vi.fn(), loginWithGoogle: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/stores/ui', async () => {
  const { writable } = await import('svelte/store');
  return { theme: { ...writable('light'), toggle: vi.fn() } };
});
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);

describe('account access form', () => {
  it('uses the native form and sends one login while a request is pending', async () => {
    let finish;
    loginWithEmail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const screen = render(LoginExperience);
    await fireEvent.input(screen.getByLabelText('Correo electrónico'), { target: { value: 'person@example.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña', { exact: true }), { target: { value: 'test-password' } });
    const form = screen.container.querySelector('form');
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(loginWithEmail).toHaveBeenCalledTimes(1);
    expect(loginWithEmail).toHaveBeenCalledWith('person@example.com', 'test-password');
    expect(screen.getByRole('button', { name: 'Crear cuenta', exact: true }).disabled).toBe(true);
    finish();
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/today'));
  });
  it('switches registration without retaining an exposed login password', async () => {
    const screen = render(LoginExperience);
    await fireEvent.input(screen.getByLabelText('Contraseña', { exact: true }), { target: { value: 'secret' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña', { exact: true }).type).toBe('text');
    await fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta', exact: true }));
    const password = screen.getByLabelText('Contraseña', { exact: true });
    expect(password.type).toBe('password');
    expect(password.value).toBe('');
    expect(password.minLength).toBe(6);
    expect(password.autocomplete).toBe('new-password');
    await fireEvent.input(screen.getByLabelText('Correo electrónico'), { target: { value: 'person@example.com' } });
    await fireEvent.input(password, { target: { value: 'new-password' } });
    await fireEvent.submit(screen.container.querySelector('form'));
    expect(registerWithEmail).toHaveBeenCalledWith('person@example.com', 'new-password');
    expect(loginWithEmail).not.toHaveBeenCalled();
  });
  it('shows recovery instructions in the page after the provider succeeds', async () => {
    const screen = render(LoginExperience);
    await fireEvent.click(screen.getByRole('button', { name: '¿La olvidaste?' }));
    expect(screen.queryByLabelText('Contraseña', { exact: true })).toBeNull();
    await fireEvent.input(screen.getByLabelText('Correo electrónico'), { target: { value: 'person@example.com' } });
    await fireEvent.submit(screen.container.querySelector('form'));
    expect(resetPassword).toHaveBeenCalledWith('person@example.com');
    expect(screen.getByRole('status').textContent).toContain('Si existe una cuenta');
    expect(goto).not.toHaveBeenCalled();
  });
  it('keeps failed access on the form with a readable error', async () => {
    loginWithEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
    const screen = render(LoginExperience);
    await fireEvent.submit(screen.container.querySelector('form'));
    expect(screen.getByRole('alert').textContent).toBe('Correo o contraseña incorrectos.');
    expect(goto).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar a mi espacio' }).disabled).toBe(false);
  });
  it('treats a closed Google popup as cancellation and allows another attempt', async () => {
    loginWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const screen = render(LoginExperience);
    await fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuar con Google' }).disabled).toBe(false);
    expect(goto).not.toHaveBeenCalled();
  });
});
