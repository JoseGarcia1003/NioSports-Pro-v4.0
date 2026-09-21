import { writable } from 'svelte/store';

// One controller per mounted workspace. A user ID alone cannot identify a
// request's session: logout followed by login may reuse the same ID.
export function createBankrollWorkspace({ session, request, example, makeKey = () => crypto.randomUUID() }) {
  let state = { data: null, loading: true, saving: false, failure: '', success: '', demo: false, draftVersion: 0 };
  const store = writable(state);
  let unsubscribe, activeUser, generation = 0, controller, started = false, disposed = false;
  let requestKey, requestBody;

  function update(patch) { state = { ...state, ...patch }; store.set(state); }
  function invalidate() { generation++; controller?.abort(); controller = undefined; }
  function clearDraft() { requestKey = requestBody = undefined; return state.draftVersion + 1; }
  function begin() {
    invalidate();
    controller = new AbortController();
    return { generation, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) };
  }
  const current = run => !disposed && run.generation === generation;
  const errorMessage = error => error?.name === 'TimeoutError'
    ? 'La solicitud tardó demasiado. Comprueba el registro antes de reintentar.'
    : error?.message || 'No se pudo consultar el registro.';

  function start({ demo = false } = {}) {
    if (started || disposed) return;
    started = true;
    update({ demo });
    unsubscribe = session.subscribe(uid => {
      if (uid === activeUser) return;
      activeUser = uid;
      invalidate();
      update({ data: state.demo ? example : null, loading: false, saving: false,
        failure: '', success: '', draftVersion: clearDraft() });
      if (!state.demo) void load();
    });
  }

  function showDemo() {
    if (!started || disposed) return;
    invalidate();
    update({ demo: true, data: example, loading: false, saving: false, failure: '', success: '', draftVersion: clearDraft() });
  }

  async function load() {
    if (!started || disposed || state.saving) return;
    const draftVersion = state.demo ? clearDraft() : state.draftVersion;
    const run = begin();
    update({ demo: false, data: null, loading: !!activeUser, failure: '', success: '', draftVersion });
    if (!activeUser) return;
    try {
      const response = await request('/api/bankroll', { signal: run.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Registro no disponible.');
      if (current(run)) update({ data: body });
    } catch (error) {
      if (current(run)) update({ failure: errorMessage(error) });
    } finally {
      if (current(run)) update({ loading: false });
    }
  }

  async function transact(body) {
    if (!started || disposed || !activeUser || state.demo || state.saving || state.loading) return false;
    const run = begin();
    const encoded = JSON.stringify(body);
    if (encoded !== requestBody) { requestKey = makeKey(); requestBody = encoded; }
    update({ saving: true, failure: '', success: '' });
    try {
      const response = await request('/api/bankroll', { method: 'POST', signal: run.signal,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }, body: encoded });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el movimiento.');
      if (!current(run)) return false;
      update({ data: result, draftVersion: clearDraft(), success: 'Movimiento registrado. Saldo actualizado.' });
      return true;
    } catch (error) {
      if (current(run)) update({ failure: errorMessage(error) });
      return false;
    } finally {
      if (current(run)) update({ saving: false });
    }
  }

  function setFailure(message) { if (!disposed) update({ failure: message }); }
  function destroy() { disposed = true; invalidate(); unsubscribe?.(); }
  return { subscribe: store.subscribe, start, load, showDemo, transact, setFailure, destroy };
}
