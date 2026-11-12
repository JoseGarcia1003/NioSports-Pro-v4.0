<script>
  import { onMount } from 'svelte';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { healthChecks, vitalStatus, VITAL_LIMITS } from '$lib/product/ops-health.js';

  // Owner-only panel: the server answers 403 to everyone else and nothing renders.
  let data = null;
  onMount(async () => {
    try {
      const res = await authenticatedFetch('/api/ops/health');
      if (res.ok) data = await res.json();
    } catch { data = null; }
  });

  // On-demand run of the daily pipeline (box scores, schedules, edition, anchors).
  let syncing = false, syncResult = null, syncError = '';
  async function syncNow() {
    if (syncing) return;
    syncing = true; syncError = ''; syncResult = null;
    try {
      const res = await authenticatedFetch('/api/ops/sync', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) syncError = 'Ya hay una sincronización en curso. Espera un minuto.';
      else if (!res.ok) syncError = 'No se pudo ejecutar la sincronización.';
      else { syncResult = body.steps; const again = await authenticatedFetch('/api/ops/health'); if (again.ok) data = await again.json(); }
    } catch { syncError = 'No se pudo ejecutar la sincronización.'; }
    finally { syncing = false; }
  }
  const EDITION_REASON = { lines_unavailable: 'sin líneas de las casas todavía', no_upcoming_games: 'sin partidos por empezar', data_stale: 'estadísticas desactualizadas', unavailable: 'no disponible' };

  const when = iso => (iso ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—');
  const fmtVital = (metric, v) => (metric === 'CLS' ? v.toFixed(3) : `${Math.round(v)} ms`);
  $: checks = data ? healthChecks(data, Date.now()) : [];
</script>

{#if data}
  <section class="ops" aria-labelledby="ops-title">
    <div class="head">
      <h2 id="ops-title">Estado del sistema</h2>
      <small>Solo visible para el propietario · {when(data.checkedAt)}</small>
    </div>
    <ul class="checks">
      {#each checks as c}
        <li class={c.level}><span class="dot" aria-hidden="true"></span><span><b>{c.title}.</b> {c.text}</span></li>
      {/each}
    </ul>
    <div class="sync">
      <button type="button" on:click={syncNow} disabled={syncing}>{syncing ? 'Sincronizando… (hasta 1 min)' : 'Sincronizar ahora'}</button>
      <span class="muted">Trae los box scores que falten, actualiza calendarios y sella la edición del día. También se ejecuta solo dos veces al día.</span>
    </div>
    {#if syncError}<p class="muted" role="alert">{syncError}</p>{/if}
    {#if syncResult}
      <p class="muted" role="status">
        Box scores: {syncResult.boxScores?.games ?? 0} partidos, {syncResult.boxScores?.rows ?? 0} filas{syncResult.boxScores?.error ? ` (${syncResult.boxScores.error})` : ''}{syncResult.boxScores?.through ? `, hasta ${syncResult.boxScores.through}` : ''} ·
        Edición: {syncResult.edition?.sealed ? `${syncResult.edition.entries} señales${syncResult.edition.created ? ' (recién sellada)' : ''}` : (EDITION_REASON[syncResult.edition?.reason] ?? 'sin edición')} ·
        Anclajes nuevos: {syncResult.anchors?.stored ?? 0}
      </p>
    {/if}
    <h3>Rendimiento real (p75, 7 días)</h3>
    {#if data.vitals?.length}
      <div class="vitals" role="table" aria-label="Web Vitals de usuarios reales">
        <div class="row th" role="row"><span role="columnheader">Métrica</span><span role="columnheader">Dispositivo</span><span role="columnheader">p75</span><span role="columnheader">Muestras</span></div>
        {#each data.vitals as v}
          {@const st = vitalStatus(v.metric, Number(v.p75))}
          <div class="row" role="row"><span role="cell">{v.metric}</span><span role="cell">{v.device === 'mobile' ? 'Móvil' : 'Escritorio'}</span><span role="cell" class={st}>{fmtVital(v.metric, Number(v.p75))}</span><span role="cell">{v.n}</span></div>
        {/each}
      </div>
      <p class="muted">Objetivo «bueno» de Google: LCP ≤ {VITAL_LIMITS.LCP} ms, INP ≤ {VITAL_LIMITS.INP} ms, CLS ≤ {VITAL_LIMITS.CLS}. Con menos de 50 muestras la cifra es orientativa.</p>
    {:else}
      <p class="muted">Aún no hay mediciones de visitas reales.</p>
    {/if}
    <h3>Errores recientes</h3>
    {#if data.topErrors?.length}
      <ul class="errors">
        {#each data.topErrors as e}<li><b>{e.n}×</b> {e.source === 'server' ? 'Servidor' : 'Navegador'} · <code>{e.route}</code> · {e.message} <small>({when(e.last)})</small></li>{/each}
      </ul>
    {:else}
      <p class="muted">Sin errores registrados en 7 días.</p>
    {/if}
  </section>
{/if}

<style>
  .ops { margin: 28px 0; padding: 20px; border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 6px 16px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 24px; margin: 0; }
  h3 { font-size: 14px; margin: 18px 0 8px; }
  small, .muted { color: var(--nio-muted); font-size: 12px; }
  .muted { margin: 8px 0 0; line-height: 1.5; }
  .checks { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
  .checks li { display: grid; grid-template-columns: 12px 1fr; gap: 10px; font-size: 14px; line-height: 1.5; }
  .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; background: var(--nio-muted); }
  .ok .dot { background: var(--nio-hit); }
  .warn .dot { background: var(--nio-accent); }
  .bad .dot { background: var(--nio-miss); }
  .sync { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin-top: 16px; }
  .sync button { min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; border: 0; background: var(--nio-action); color: var(--nio-action-ink); font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .sync button:disabled { opacity: .6; cursor: wait; }
  .sync button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .sync .muted { margin: 0; flex: 1 1 260px; }
  .vitals { display: grid; border: 1px solid var(--nio-border); border-radius: 10px; overflow: hidden; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1fr .8fr; gap: 8px; padding: 8px 12px; font-size: 13px; border-top: 1px solid var(--nio-border); }
  .row.th { border-top: 0; background: var(--nio-raised); color: var(--nio-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .good { color: var(--nio-hit); font-weight: 700; }
  .poor { color: var(--nio-miss); font-weight: 700; }
  .needs-improvement { color: var(--nio-accent); font-weight: 700; }
  .errors { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: var(--nio-muted); }
  .errors b { color: var(--nio-ink); }
  code { font-size: 12px; }
</style>
