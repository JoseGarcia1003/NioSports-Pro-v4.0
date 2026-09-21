// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import { createBankrollWorkspace } from '../../src/lib/bankroll/workspace.js';

const wallet = amount => ({ wallet: { available_minor: amount }, entries: [], tickets: [] });
const response = body => ({ ok: true, json: async () => body });
const movement = { type: 'deposit', amountMinor: 2500, note: 'Capital personal' };
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function setup(uid = 'A', demo = false) {
  const session = writable(uid);
  const request = vi.fn().mockResolvedValue(response(wallet(10000)));
  let keys = 0;
  const example = wallet(128450);
  const workspace = createBankrollWorkspace({ session, request, example, makeKey: () => `request-${++keys}` });
  const start = () => workspace.start({ demo });
  const idle = () => vi.waitFor(() => expect(get(workspace).loading).toBe(false));
  return { session, request, example, workspace, start, idle };
}

describe('bankroll workspace request lifecycle', () => {
  it('starts an anonymous workspace without private requests or an invented balance', () => {
    const { workspace, request, start } = setup(null);
    start();
    expect(get(workspace)).toMatchObject({ data: null, loading: false, saving: false });
    expect(request).not.toHaveBeenCalled();
    workspace.destroy();
  });

  it('starts the explicit demo without contacting the private API and refuses mutations', async () => {
    const { workspace, request, example, start } = setup('A', true);
    start();
    expect(get(workspace)).toMatchObject({ demo: true, data: example, loading: false });
    expect(await workspace.transact(movement)).toBe(false);
    expect(request).not.toHaveBeenCalled();
    workspace.destroy();
  });

  it('clears account data and drafts immediately on logout', async () => {
    const { workspace, session, start, idle } = setup();
    start(); await idle();
    const version = get(workspace).draftVersion;
    session.set(null);
    expect(get(workspace)).toMatchObject({ data: null, loading: false, saving: false, failure: '', success: '' });
    expect(get(workspace).draftVersion).toBeGreaterThan(version);
    workspace.destroy();
  });

  it('rejects a response from before logout even after logging in with the same ID', async () => {
    const { workspace, request, session, start, idle } = setup();
    const old = deferred();
    request.mockReturnValueOnce(old.promise);
    start();
    const oldSignal = request.mock.calls[0][1].signal;
    session.set(null);
    request.mockResolvedValueOnce(response(wallet(22000)));
    session.set('A'); await idle();
    expect(oldSignal.aborted).toBe(true);
    old.resolve(response(wallet(99000)));
    await old.promise; await Promise.resolve(); await Promise.resolve();
    expect(get(workspace).data).toEqual(wallet(22000));
    workspace.destroy();
  });

  it('discards JSON that finishes parsing in another account', async () => {
    const { workspace, request, session, start, idle } = setup();
    const body = deferred();
    const reading = deferred();
    request.mockResolvedValueOnce({ ok: true, json: () => { reading.resolve(); return body.promise; } });
    start(); await reading.promise;
    request.mockResolvedValueOnce(response(wallet(32000)));
    session.set('B'); await idle();
    body.resolve(wallet(99000));
    await body.promise; await Promise.resolve();
    expect(get(workspace).data).toEqual(wallet(32000));
    workspace.destroy();
  });

  it('keeps a new refresh loading when an obsolete request fails', async () => {
    const { workspace, request, start, idle } = setup();
    start(); await idle();
    const old = deferred(), latest = deferred();
    request.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const first = workspace.load(), second = workspace.load();
    old.reject(new Error('Private failure from an old request'));
    await first;
    expect(get(workspace)).toMatchObject({ loading: true, failure: '', data: null });
    latest.resolve(response(wallet(42000))); await second;
    expect(get(workspace)).toMatchObject({ loading: false, data: wallet(42000) });
    workspace.destroy();
  });

  it('never lets a real response overwrite the example after changing mode', async () => {
    const { workspace, request, example, start, idle } = setup();
    start(); await idle();
    const pending = deferred();
    request.mockReturnValueOnce(pending.promise);
    const loading = workspace.load();
    workspace.showDemo();
    pending.resolve(response(wallet(99000))); await loading;
    expect(get(workspace)).toMatchObject({ demo: true, data: example, loading: false });
    workspace.destroy();
  });

  it('requests fresh account data when leaving the demo', async () => {
    const { workspace, request, start } = setup('A', true);
    start();
    const before = get(workspace).draftVersion;
    await workspace.load();
    expect(request).toHaveBeenCalledOnce();
    expect(get(workspace)).toMatchObject({ demo: false, data: wallet(10000), loading: false });
    expect(get(workspace).draftVersion).toBeGreaterThan(before);
    workspace.destroy();
  });

  it('ignores an old mutation without unlocking a new account mutation', async () => {
    const { workspace, request, session, start, idle } = setup();
    start(); await idle();
    const old = deferred(), latest = deferred();
    request.mockReturnValueOnce(old.promise);
    const first = workspace.transact(movement);
    const oldSignal = request.mock.calls[1][1].signal;
    session.set('B'); await idle();
    request.mockReturnValueOnce(latest.promise);
    const second = workspace.transact(movement);
    old.resolve(response(wallet(99000)));
    expect(await first).toBe(false);
    expect(oldSignal.aborted).toBe(true);
    expect(get(workspace)).toMatchObject({ saving: true, data: wallet(10000), success: '' });
    latest.resolve(response(wallet(12500)));
    expect(await second).toBe(true);
    expect(get(workspace)).toMatchObject({ saving: false, data: wallet(12500) });
    workspace.destroy();
  });

  it('prevents rapid duplicate submissions and refresh during a mutation', async () => {
    const { workspace, request, start, idle } = setup();
    start(); await idle();
    const pending = deferred();
    request.mockReturnValueOnce(pending.promise);
    const first = workspace.transact(movement);
    expect(await workspace.transact(movement)).toBe(false);
    await workspace.load();
    expect(request).toHaveBeenCalledTimes(2);
    pending.resolve(response(wallet(12500))); await first;
    expect(get(workspace).saving).toBe(false);
    workspace.destroy();
  });

  it('preserves the idempotency key after an uncertain result and resets it after success', async () => {
    const { workspace, request, start, idle } = setup();
    start(); await idle();
    request.mockRejectedValueOnce(new Error('Network disconnected'));
    expect(await workspace.transact(movement)).toBe(false);
    const firstKey = request.mock.calls[1][1].headers['Idempotency-Key'];
    expect(await workspace.transact(movement)).toBe(true);
    expect(request.mock.calls[2][1].headers['Idempotency-Key']).toBe(firstKey);
    await workspace.transact(movement);
    expect(request.mock.calls[3][1].headers['Idempotency-Key']).not.toBe(firstKey);
    workspace.destroy();
  });

  it('clears account idempotency keys and drafts across a session change', async () => {
    const { workspace, request, session, start, idle } = setup();
    start(); await idle();
    request.mockRejectedValueOnce(new Error('Network disconnected'));
    await workspace.transact(movement);
    const key = request.mock.calls[1][1].headers['Idempotency-Key'];
    const version = get(workspace).draftVersion;
    session.set('B'); await idle();
    expect(get(workspace).failure).toBe('');
    expect(get(workspace).draftVersion).toBeGreaterThan(version);
    await workspace.transact(movement);
    expect(request.mock.calls[3][1].headers['Idempotency-Key']).not.toBe(key);
    workspace.destroy();
  });

  it('reports errors from the current request without fabricating account data', async () => {
    const { workspace, request, start, idle } = setup();
    request.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Registro no disponible.' }) });
    start(); await idle();
    expect(get(workspace)).toMatchObject({ data: null, failure: 'Registro no disponible.' });
    workspace.destroy();
  });

  it('uses a useful message for timeouts and keeps the retry key', async () => {
    const { workspace, request, start, idle } = setup();
    start(); await idle();
    request.mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    await workspace.transact(movement);
    expect(get(workspace).failure).toContain('Comprueba el registro');
    expect(get(workspace).saving).toBe(false);
    workspace.destroy();
  });

  it('aborts and unsubscribes on unmount; late completions do not mutate state', async () => {
    const { workspace, request, session, start, idle } = setup();
    start(); await idle();
    const pending = deferred();
    request.mockReturnValueOnce(pending.promise);
    const operation = workspace.transact(movement);
    const signal = request.mock.calls[1][1].signal;
    workspace.destroy();
    const state = get(workspace);
    session.set('B');
    pending.resolve(response(wallet(99000))); await operation;
    expect(signal.aborted).toBe(true);
    expect(get(workspace)).toBe(state);
    expect(request).toHaveBeenCalledTimes(2);
    expect(await workspace.transact(movement)).toBe(false);
  });
});
