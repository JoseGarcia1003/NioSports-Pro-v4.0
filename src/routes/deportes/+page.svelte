<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight } from 'lucide-svelte';
  import { STATE_LABEL, KIND_LABEL, SPORT_HREF } from '$lib/product/sports-hub.js';

  // The four disciplines and the honest state of each data feed.
  let sports = null, failed = false;
  onMount(async () => { try { const r = await fetch('/api/sports/status'); sports = (await r.json()).sports; } catch { failed = true; } });
</script>

<svelte:head><title>Deportes · NioSports Pro</title><meta name="description" content="Fútbol, NBA, tenis y MLB en NioSports Pro, con el estado real de cada fuente de datos." /></svelte:head>

<div class="page">
  <header>
    <p class="eyebrow">Deportes</p>
    <h1>Cuatro disciplinas, una sola regla</h1>
    <p class="lead">Cada deporte tiene sus propias fuentes, modelos e historial. Mostramos solo lo que una fuente real entrega; si una fuente todavía no está conectada, lo decimos.</p>
  </header>
  {#if failed}<p class="muted">No pudimos consultar el estado de las fuentes.</p>
  {:else if !sports}<p class="muted" role="status">Consultando fuentes…</p>
  {:else}
    <div class="grid">
      {#each ['football', 'nba', 'tennis', 'mlb'].map(id => sports.find(s => s.sport === id)) as s (s.sport)}
        <section class="card" aria-labelledby={`sport-${s.sport}`}>
          <div class="top"><h2 id={`sport-${s.sport}`}>{s.name}</h2><span class="pill" data-state={s.overall}>{STATE_LABEL[s.overall]}</span></div>
          <ul>{#each s.kinds as k}<li><span>{KIND_LABEL[k.kind]}</span><em data-state={k.state}>{STATE_LABEL[k.state]}</em></li>{/each}</ul>
          <p class="muted small">Modelos publicados: {Object.keys(s.modelled).length ? Object.values(s.modelled).join(', ') : 'ninguno todavía'}</p>
          <a href={SPORT_HREF[s.sport]}>Abrir {s.name} <ArrowUpRight size={14} aria-hidden="true" /></a>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px 100px; color: var(--nio-ink); }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 12px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0; }
  .lead { color: var(--nio-muted); max-width: 720px; line-height: 1.6; margin: 0 0 24px; }
  .muted { color: var(--nio-muted); margin: 0; }
  .small { font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .card { border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); padding: 18px; display: grid; gap: 12px; align-content: start; }
  .top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
  .pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--nio-border); color: var(--nio-muted); white-space: nowrap; }
  .pill[data-state='partial'], .pill[data-state='complete'] { color: var(--nio-accent); border-color: var(--nio-gold-border); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
  li { display: flex; justify-content: space-between; gap: 8px; }
  em { font-style: normal; color: var(--nio-muted); font-size: 12px; }
  em[data-state='live'] { color: var(--nio-hit); }
  a { display: inline-flex; gap: 6px; align-items: center; color: var(--nio-accent); font-weight: 700; text-decoration: none; font-size: 14px; }
  a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  @media (max-width: 560px) { .page { padding: 24px 16px 100px; } }
</style>
