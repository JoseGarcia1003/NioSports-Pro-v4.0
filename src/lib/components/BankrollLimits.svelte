<script>
  import { onMount } from 'svelte';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';

  // Responsible-use panel: limits, pauses and behavioural alerts. The server
  // enforces every limit; this panel only shows and requests changes.
  let view = null, state = 'loading', message = '', saving = false;
  let form = { maxStake: '', daily: '', weeklyLoss: '' };
  const money = v => (v == null ? 'Sin límite' : new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(v / 100));
  const when = v => new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
  const toMinor = v => (String(v).trim() === '' ? undefined : Math.round(Number(String(v).replace(',', '.')) * 100));

  async function load() {
    try { const res = await authenticatedFetch('/api/bankroll/limits'); if (!res.ok) throw new Error(); view = await res.json(); state = 'ready'; }
    catch { state = 'unavailable'; }
  }
  onMount(load);

  async function save(body) {
    saving = true; message = '';
    try {
      const res = await authenticatedFetch('/api/bankroll/limits', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      view = data;
      message = Object.keys(data.deferred || {}).length ? 'Los límites más estrictos se aplicaron ya. Los más amplios se aplicarán en 24 horas (periodo de enfriamiento).' : 'Cambios aplicados.';
      form = { maxStake: '', daily: '', weeklyLoss: '' };
    } catch { message = 'No se pudo guardar. Revisa los importes.'; }
    finally { saving = false; }
  }
  function submit() {
    const body = {};
    for (const [k, f] of [['maxStakeMinor', 'maxStake'], ['dailyStakeMinor', 'daily'], ['weeklyLossMinor', 'weeklyLoss']]) { const v = toMinor(form[f]); if (v !== undefined) body[k] = v; }
    if (Object.keys(body).length) save(body);
  }
</script>

<section class="panel limits" aria-labelledby="limits-title">
  <span class="eyebrow">USO RESPONSABLE</span>
  <h2 id="limits-title">Límites y pausas</h2>
  {#if state === 'loading'}<p class="muted" role="status">Consultando tus límites…</p>
  {:else if state === 'unavailable'}<p class="muted">No pudimos cargar tus límites.</p>
  {:else}
    {#each view.alerts as a}<p class="alert" class:warn={a.level === 'warning'} role="note">{a.text}</p>{/each}
    {#if view.limits.pauseUntil}<p class="alert warn" role="status">Pausa activa hasta el {when(view.limits.pauseUntil)}. No se pueden registrar tickets nuevos.</p>{/if}
    <dl>
      <div><dt>Máximo por ticket</dt><dd>{money(view.limits.maxStakeMinor)}</dd></div>
      <div><dt>Máximo diario</dt><dd>{money(view.limits.dailyStakeMinor)}</dd></div>
      <div><dt>Pérdida semanal máxima</dt><dd>{money(view.limits.weeklyLossMinor)}</dd></div>
    </dl>
    {#if view.pending}<p class="muted small">Cambios pendientes desde el {when(view.pendingFrom)}.</p>{/if}
    <form on:submit|preventDefault={submit}>
      <label>Máximo por ticket (USD)<input inputmode="decimal" bind:value={form.maxStake} placeholder="Ej. 20" /></label>
      <label>Máximo diario (USD)<input inputmode="decimal" bind:value={form.daily} placeholder="Ej. 50" /></label>
      <label>Pérdida semanal (USD)<input inputmode="decimal" bind:value={form.weeklyLoss} placeholder="Ej. 100" /></label>
      <button type="submit" disabled={saving}>Guardar límites</button>
    </form>
    <div class="pause" role="group" aria-label="Tomar una pausa">
      <span>Tomar una pausa:</span>
      {#each [[1, '24 h'], [7, '7 días'], [30, '30 días']] as [d, label]}<button type="button" disabled={saving} on:click={() => save({ pauseDays: d })}>{label}</button>{/each}
    </div>
    <p class="muted small">Endurecer un límite se aplica al instante; ampliarlo o quitarlo tarda 24 horas. Una pausa no se puede acortar. <a href="/legal/responsible-gambling">Juego responsable</a></p>
    {#if message}<p class="muted" role="status">{message}</p>{/if}
  {/if}
</section>

<style>
  .limits { display: grid; gap: 10px; }
  h2 { margin: 0; }
  .muted { margin: 0; color: var(--nio-muted); font-size: 13px; line-height: 1.5; }
  .small { font-size: 12px; }
  .muted a { color: var(--nio-accent); }
  .alert { margin: 0; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); font-size: 13px; line-height: 1.5; }
  .alert.warn { border-color: var(--nio-gold-border); background: var(--nio-gold-soft); }
  dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; }
  dt { font-size: 11px; color: var(--nio-muted); font-weight: 600; }
  dd { margin: 2px 0 0; font-weight: 700; }
  form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 8px; align-items: end; }
  label { display: grid; gap: 4px; font-size: 12px; color: var(--nio-muted); font-weight: 600; }
  input { min-height: var(--tap, 44px); border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; padding: 0 10px; }
  button { min-height: var(--tap, 44px); padding: 0 14px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
  form button { background: var(--nio-action); color: var(--nio-action-ink); border: 0; }
  .pause { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; color: var(--nio-muted); }
  button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 720px) { dl, form { grid-template-columns: 1fr; } }
</style>
