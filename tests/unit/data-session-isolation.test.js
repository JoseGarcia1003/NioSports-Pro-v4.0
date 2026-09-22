// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: vi.fn() }));
vi.mock('$lib/supabase/client.js', () => ({
  getUserPicks: vi.fn(), savePick: vi.fn(), updatePick: vi.fn(), deletePick: vi.fn(), upsertUserProfile: vi.fn(),
}));

import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
import { getUserPicks, savePick, updatePick, deletePick, upsertUserProfile } from '$lib/supabase/client.js';
import { authStore } from '$lib/stores/auth.js';
import { allPicks, picksStore, bankrollStore, aiPicksStore, dataLoading, dataError, loadUserData, clearUserData } from '$lib/stores/data.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const pick = (userId, patch = {}) => ({ id: 'saved-pick', user_id: userId, source: 'model', status: 'pending', ...patch });
const wallet = amount => ({ wallet: { available_minor: amount, deposited_minor: amount }, entries: [] });
const response = body => ({ ok: true, json: async () => body });
const login = uid => authStore.setUser({ uid });
async function seed(uid, patch = {}) {
  getUserPicks.mockResolvedValueOnce([pick(uid, patch)]);
  await picksStore.loadForUser(uid);
}

beforeEach(() => {
  authStore.clear();
  clearUserData();
  vi.resetAllMocks();
  getUserPicks.mockResolvedValue([]);
  authenticatedFetch.mockResolvedValue(response(wallet(0)));
  upsertUserProfile.mockResolvedValue({});
});

describe('private data session isolation', () => {
  it('clears the previous account synchronously while the new profile is still loading', async () => {
    login('A');
    await seed('A');
    bankrollStore.set({ current: 500, initial: 500, history: [] });
    aiPicksStore.set([pick('A')]);
    const profile = deferred();
    upsertUserProfile.mockReturnValueOnce(profile.promise);

    login('B');
    const loading = loadUserData('B');
    expect(get(allPicks)).toEqual([]);
    expect(bankrollStore.getSnapshot()).toMatchObject({ current: 0, history: [], lastSync: null });
    expect(get(aiPicksStore)).toEqual([]);
    expect(get(dataError)).toBeNull();
    profile.resolve({});
    await loading;
  });

  it('ignores pick responses and bankroll JSON that finish after logout', async () => {
    login('A');
    const picks = deferred();
    const body = deferred();
    const reading = deferred();
    getUserPicks.mockReturnValueOnce(picks.promise);
    const readJson = vi.fn(() => { reading.resolve(); return body.promise; });
    authenticatedFetch.mockResolvedValueOnce({ ok: true, json: readJson });
    const loadingPicks = picksStore.loadForUser('A');
    const loadingBankroll = bankrollStore.loadForUser('A');
    await reading.promise;
    expect(readJson).toHaveBeenCalledOnce();

    authStore.clear();
    picks.resolve([pick('A')]);
    body.resolve(wallet(99000));
    await Promise.all([loadingPicks, loadingBankroll]);
    expect(get(allPicks)).toEqual([]);
    expect(bankrollStore.getSnapshot().current).toBe(0);
    expect(get(dataLoading)).toBe(false);
    expect(get(dataError)).toBeNull();
  });

  it('does not let a late account A failure clear account B data or its loading state', async () => {
    login('A');
    const old = deferred();
    getUserPicks.mockReturnValueOnce(old.promise);
    const oldLoading = picksStore.loadForUser('A');
    login('B');
    await seed('B');
    const latest = deferred();
    getUserPicks.mockReturnValueOnce(latest.promise);
    const newLoading = picksStore.loadForUser('B');

    old.reject(new Error('Account A request failed'));
    await oldLoading;
    expect(get(allPicks)).toEqual([pick('B')]);
    expect(get(dataError)).toBeNull();
    expect(get(dataLoading)).toBe(true);
    latest.resolve([pick('B', { status: 'win' })]);
    await newLoading;
    expect(get(dataLoading)).toBe(false);
  });

  it('does not restart old loads after a profile upsert finishes in another session', async () => {
    login('A');
    const profile = deferred();
    upsertUserProfile.mockReturnValueOnce(profile.promise);
    const oldLoading = loadUserData('A');
    login('B');
    await loadUserData('B');
    profile.resolve({});
    await oldLoading;
    expect(getUserPicks).toHaveBeenCalledOnce();
    expect(getUserPicks).toHaveBeenCalledWith('B', { limit: 500 });
    expect(authenticatedFetch).toHaveBeenCalledOnce();
  });

  it('does not restart old loads after logout during a profile upsert', async () => {
    login('A');
    const profile = deferred();
    upsertUserProfile.mockReturnValueOnce(profile.promise);
    const loading = loadUserData('A');
    clearUserData();
    profile.resolve({});
    await loading;
    expect(getUserPicks).not.toHaveBeenCalled();
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });

  it('treats a second login by the same user as a new session', async () => {
    login('A');
    const old = deferred();
    getUserPicks.mockReturnValueOnce(old.promise);
    const oldLoading = picksStore.loadForUser('A');
    authStore.clear();
    login('A');
    await seed('A', { status: 'win' });
    old.resolve([pick('A')]);
    await oldLoading;
    expect(get(allPicks)).toEqual([pick('A', { status: 'win' })]);
  });

  it('keeps the newest picks and bankroll refresh when an earlier refresh finishes last', async () => {
    login('A');
    const picks = deferred();
    const bank = deferred();
    getUserPicks.mockReturnValueOnce(picks.promise);
    authenticatedFetch.mockReturnValueOnce(bank.promise);
    const oldPicks = picksStore.loadForUser('A');
    const oldBank = bankrollStore.loadForUser('A');
    await seed('A', { status: 'win' });
    authenticatedFetch.mockResolvedValueOnce(response(wallet(7500)));
    await bankrollStore.loadForUser('A');

    picks.resolve([pick('A')]);
    bank.resolve(response(wallet(2000)));
    await Promise.all([oldPicks, oldBank]);
    expect(get(allPicks)).toEqual([pick('A', { status: 'win' })]);
    expect(bankrollStore.getSnapshot().current).toBe(75);
  });

  it('invalidates pending loads when stores are cleared independently', async () => {
    login('A');
    const picks = deferred();
    const bank = deferred();
    getUserPicks.mockReturnValueOnce(picks.promise);
    authenticatedFetch.mockReturnValueOnce(bank.promise);
    const loadingPicks = picksStore.loadForUser('A');
    const loadingBank = bankrollStore.loadForUser('A');
    picksStore.clear();
    bankrollStore.clear();
    picks.resolve([pick('A')]);
    bank.resolve(response(wallet(2000)));
    await Promise.all([loadingPicks, loadingBank]);
    expect(get(allPicks)).toEqual([]);
    expect(bankrollStore.getSnapshot().current).toBe(0);
    expect(get(dataLoading)).toBe(false);
  });

  it('rejects requests for an inactive account and excludes unexpected foreign rows', async () => {
    login('B');
    await Promise.all([loadUserData('A'), picksStore.loadForUser('A'), bankrollStore.loadForUser('A')]);
    expect(upsertUserProfile).not.toHaveBeenCalled();
    expect(getUserPicks).not.toHaveBeenCalled();
    expect(authenticatedFetch).not.toHaveBeenCalled();
    getUserPicks.mockResolvedValueOnce([pick('A'), pick('B')]);
    await picksStore.loadForUser('B');
    expect(get(allPicks)).toEqual([pick('B')]);
  });
});

describe('pending pick mutations', () => {
  const operations = [
    ['save', savePick, () => picksStore.save(pick('A', { id: 'new-pick' }))],
    ['update', updatePick, () => picksStore.update('saved-pick', { status: 'loss' })],
    ['remove', deletePick, () => picksStore.remove('saved-pick')],
  ];

  it.each(operations)('does not apply a delayed %s to a later session of the same user', async (_name, mock, run) => {
    login('A');
    await seed('A');
    const result = deferred();
    mock.mockReturnValueOnce(result.promise);
    const mutation = run();
    const rejected = expect(mutation).rejects.toMatchObject({ name: 'AbortError' });
    authStore.clear();
    login('A');
    await seed('A', { status: 'win' });
    result.resolve(pick('A', { status: 'loss' }));
    await rejected;
    expect(get(allPicks)).toEqual([pick('A', { status: 'win' })]);
  });

  it.each(operations)('does not apply a delayed %s after switching accounts', async (_name, mock, run) => {
    login('A');
    await seed('A');
    const result = deferred();
    mock.mockReturnValueOnce(result.promise);
    const mutation = run();
    const rejected = expect(mutation).rejects.toMatchObject({ name: 'AbortError' });
    login('B');
    await seed('B');
    result.resolve(pick('A', { status: 'loss' }));
    await rejected;
    expect(get(allPicks)).toEqual([pick('B')]);
  });

  it.each(operations)('invalidates a pending %s when the picks store is cleared', async (_name, mock, run) => {
    login('A');
    await seed('A');
    const result = deferred();
    mock.mockReturnValueOnce(result.promise);
    const mutation = run();
    const rejected = expect(mutation).rejects.toMatchObject({ name: 'AbortError' });
    picksStore.clear();
    result.resolve(pick('A'));
    await rejected;
    expect(get(allPicks)).toEqual([]);
  });

  it('blocks saves for another owner before making a database request', async () => {
    login('B');
    await expect(picksStore.save(pick('A'))).rejects.toMatchObject({ name: 'AbortError' });
    expect(savePick).not.toHaveBeenCalled();
  });

  it('still applies successful saves, updates and deletes in the active session', async () => {
    login('A');
    savePick.mockResolvedValueOnce(pick('A'));
    await picksStore.save(pick('A'));
    expect(get(allPicks)).toEqual([pick('A')]);
    updatePick.mockResolvedValueOnce(pick('A', { status: 'win' }));
    await picksStore.update('saved-pick', { status: 'win' });
    expect(get(allPicks)).toEqual([pick('A', { status: 'win' })]);
    deletePick.mockResolvedValueOnce(undefined);
    await picksStore.remove('saved-pick');
    expect(get(allPicks)).toEqual([]);
  });
});
