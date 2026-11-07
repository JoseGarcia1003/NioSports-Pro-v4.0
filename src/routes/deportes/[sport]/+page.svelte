<script>
  import { onMount } from 'svelte';
  import { STATE_LABEL, KIND_LABEL } from '$lib/product/sports-hub.js';
  export let data;

  // Football and MLB: real schedule only when a provider delivered it; otherwise
  // the page explains which feed is pending. No sample matches are shown.
  const NAMES = { football: 'Fútbol', mlb: 'Béisbol (MLB)' };
  let status = null, schedule = null;
  const time = new Intl.DateTimeFormat('es', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const STATUS = { scheduled: 'Programado', live: 'En juego', final: 'Final', postponed: 'Aplazado', cancelled: 'Cancelado', unknown: '—' };
  onMount(async () => {
    const [a, b] = await Promise.all([fetch('/api/sports/status').then(r => r.json()).catch(() => null), fetch(`/api/sports/${data.sport}/schedule`).then(r => r.json()).catch(() => null)]);
    status = a?.sports?.find(s => s.sport === data.sport) || null; schedule = b;
  });
</script>

<svelte:head><title>{NAMES[data.sport]} · NioSports Pro</title></svelte:head>

<div class="page">
  <p class="eyebrow"><a href="/deportes">Deportes</a> · {NAMES[data.sport]}</p>
  <h1>{NAMES[data.sport]}</h1>
  {#if schedule?.events?.length}
    <p class="lead">Partidos de hoy según {schedule.provider}{schedule.providerVerified ? '' : ' (integración en verificación)'} · actualizado {new Date(schedule.fetchedAt).toLocaleString('es')}{schedule.stale ? ' · datos antiguos' : ''}.</p>
    <ul class="events">
      {#each schedule.events as e (e.id)}
        <li><span class="when">{time.format(new Date(e.startsAt))}</span><span class="teams">{e.away.name} <i>@</i> {e.home.name}</span>{#if e.competition}<small>{e.competition}</small>{/if}<em>{STATUS[e.status]}{e.score?.home != null ? ` · ${e.score.away}–${e.score.home}` : ''}</em></li>
      {/each}
    </ul>
  {:else}
    <p class="lead">Todavía no mostramos partidos de {NAMES[data.sport].toLowerCase()}: {schedule?.reason === 'not_synced' ? 'ninguna fuente ha entregado el calendario de hoy' : 'no hay partidos registrados para hoy'}. No publicamos partidos, cuotas ni estadísticas de ejemplo.</p>
  {/if}
  {#if status}
    <section class="feeds" aria-labelledby="feeds-title">
      <h2 id="feeds-title">Estado de las fuentes</h2>
      <ul>{#each status.kinds as k}<li><span>{KIND_LABEL[k.kind]}</span><em>{STATE_LABEL[k.state]}{k.providers.length ? ` · ${k.providers.map(p => p.id).join(', ')}` : ''}</em></li>{/each}</ul>
      <p class="muted">Mercados previstos: {status.markets.join(', ')}. Los modelos de este deporte se publicarán solo tras validarse fuera de muestra, como el de puntos NBA.</p>
    </section>
  {/if}
</div>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 32px 24px 100px; color: var(--nio-ink); }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  .eyebrow a { color: var(--nio-accent); text-decoration: none; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 12px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0 0 10px; }
  .lead, .muted { color: var(--nio-muted); line-height: 1.6; }
  .events { list-style: none; padding: 0; margin: 0 0 24px; display: grid; gap: 8px; }
  .events li { display: grid; grid-template-columns: 110px 1fr auto; gap: 4px 12px; padding: 12px 14px; border: 1px solid var(--nio-border); border-radius: 12px; background: var(--nio-surface); align-items: center; }
  .events small { grid-column: 2; color: var(--nio-muted); }
  .when { color: var(--nio-muted); font-size: 13px; } .teams { font-weight: 700; } .teams i { color: var(--nio-muted); font-style: normal; }
  em { font-style: normal; color: var(--nio-muted); font-size: 12px; }
  .feeds ul { list-style: none; padding: 0; margin: 0 0 12px; display: grid; gap: 6px; font-size: 14px; }
  .feeds li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--nio-border); padding: 6px 0; }
  a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  @media (max-width: 560px) { .page { padding: 24px 16px 100px; } .events li { grid-template-columns: 1fr; } .events small { grid-column: 1; } }
</style>
