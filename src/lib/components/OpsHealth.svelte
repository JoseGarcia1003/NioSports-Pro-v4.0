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
