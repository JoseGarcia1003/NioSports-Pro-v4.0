<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight } from 'lucide-svelte';
  import { currentUser } from '$lib/stores/auth.js';
  import { subscription } from '$lib/stores/subscription.js';
  import { nbaToday } from '$lib/stores/nba-today.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { planLabel } from '$lib/product/navigation.js';
  import { dashboardNotices, recordLabel } from '$lib/product/dashboard.js';
  import { teamStyle } from '$lib/product/teams.js';
  import NbaTodayBoard from './NbaTodayBoard.svelte';

  // The member's operations centre: what needs attention, today's sealed
  // signals, the verified record, the bankroll and every tool one tap away.
  // One private request (/api/dashboard); every figure comes from the server.
  let state = 'loading', d = null;
  async function load() {
    state = 'loading';
    try {
      const res = await authenticatedFetch('/api/dashboard');
      if (!res.ok) throw new Error();
      d = await res.json(); state = 'ready';
    } catch { state = 'unavailable'; }
  }
  onMount(load);

  $: name = $currentUser?.displayName?.trim().split(/\s+/)[0];
  const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const time = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
  const usd = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
  const money = v => usd.format(Number(v || 0) / 100);
  /** Signed amount with a real minus sign: «+$38,20», «−$20,00». */
  const signed = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${usd.format(Math.abs(Number(v || 0)) / 100)}`;
  const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toLocaleString('es', { maximumFractionDigits: digits })} %`);
  const num = v => v.toLocaleString('es', { maximumFractionDigits: 1 });
  const MOVES = { deposit: 'Capital añadido', withdraw: 'Capital retirado', stake: 'Ticket registrado', settle: 'Ticket liquidado' };

  $: games = $nbaToday.games || [];
  $: nextGame = games.map(g => Date.parse(g.datetime)).filter(t => t > Date.now()).sort((a, b) => a - b)[0];
  $: notices = d ? dashboardNotices(d) : [];
  $: record = recordLabel(d?.record?.summary);
  $: bank = d?.bankroll;
  $: busy = state === 'loading';

  const tools = [
    ['/sports/nba/props', 'Props de jugadores'], ['/sports/nba/puntos', 'Mercado de puntos'], ['/sports/nba/estadisticas', 'Estadísticas NBA'],
    ['/sports/nba/clasificacion', 'Clasificación'], ['/verificar', 'Verificar pronósticos'], ['/transparencia', 'Rendimiento real']
  ];
  const sports = [['/sports/nba', 'NBA'], ['/deportes/futbol', 'Fútbol'], ['/tennis', 'Tenis'], ['/deportes/mlb', 'MLB']];
</script>

<div class="dash">
  <header class="head">
    <div>
      <p class="eyebrow">Hoy · {today}</p>
      <h1>{name ? `Hola, ${name}` : 'Tu jornada'}</h1>
    </div>
    <a class="plan" href="/pricing">{planLabel($subscription)}</a>
  </header>

  {#if state === 'unavailable'}
    <div class="notice warn" role="alert"><span class="dot" aria-hidden="true"></span><p>No pudimos cargar tu resumen. Tus datos no se han perdido.</p><button type="button" on:click={load}>Reintentar</button></div>
  {:else if notices.length}
    <ul class="notices" aria-label="Avisos de hoy">
      {#each notices as n (n.id)}
        <li class={n.level}>
          {#if n.href}
            <a class="row" href={n.href}><span class="dot" aria-hidden="true"></span><span class="text">{n.text}</span><span class="go">{n.action}<ArrowUpRight size={14} aria-hidden="true" /></span></a>
          {:else}
            <div class="row"><span class="dot" aria-hidden="true"></span><span class="text">{n.text}</span></div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <section class="tiles" aria-label="Resumen" aria-busy={busy}>
    <a class="tile" href="/sports/nba">
      <small>Partidos NBA hoy</small>
      <b>{$nbaToday.state === 'ready' || $nbaToday.state === 'empty' ? games.length : '—'}</b>
      <em>{nextGame ? `Próximo a las ${time.format(new Date(nextGame))}` : $nbaToday.state === 'unavailable' ? 'Calendario no disponible' : games.length ? 'Jornada en juego o terminada' : 'Sin partidos programados'}</em>
    </a>
    <a class="tile" href="/predictions">
      <small>Señales de hoy</small>
      <b>{busy ? '—' : d?.edition?.sealed ? d.edition.count : '—'}</b>
      <em>{busy ? 'Consultando…' : d?.edition?.sealed ? `Selladas a las ${time.format(new Date(d.edition.sealedAt))}` : 'Sin edición sellada todavía'}</em>
    </a>
    <a class="tile" href="/transparencia">
      <small>Historial sellado (30 días)</small>
      <b>{busy ? '—' : record.value}</b>
      <em>{busy ? 'Consultando…' : record.note}</em>
    </a>
    <a class="tile" href="/bankroll">
      <small>Bankroll disponible</small>
      <b>{busy ? '—' : bank?.started ? money(bank.availableMinor) : '—'}</b>
      <em>{busy ? 'Consultando…' : bank?.started ? `${money(bank.reservedMinor)} comprometido` : 'Empieza tu registro'}</em>
    </a>
  </section>

  <div class="grid">
    <div class="col">
      <section class="panel" aria-labelledby="top-title">
        <div class="panel-head"><h2 id="top-title">Señales destacadas</h2><a href="/predictions">Ver todas <ArrowUpRight size={14} aria-hidden="true" /></a></div>
        {#if busy}
          <ul class="picks" aria-hidden="true">{#each [0, 1, 2] as _}<li class="pick skeleton"></li>{/each}</ul>
        {:else if d?.edition?.sealed && d.edition.top.length}
          <ul class="picks">
            {#each d.edition.top as s}
              {#if s.locked}
                <li class="pick locked"><i class="badge" style={teamStyle(s.team)}>{s.team}</i><span class="who"><b>Selección premium</b><small>vs {s.opponent} · {time.format(new Date(s.tipoff))}</small></span></li>
              {:else}
                <li class="pick">
                  <i class="badge" style={teamStyle(s.team)}>{s.team}</i>
                  <span class="who"><b>{s.name}</b><small>{s.home ? 'vs' : '@'} {s.opponent} · {time.format(new Date(s.tipoff))}</small></span>
                  <span class="call"><b>{s.side === 'over' ? 'Más de' : 'Menos de'} {num(s.line)}</b><small>{s.p != null ? `${Math.round(s.p * 100)} % según el modelo` : 'puntos'}</small></span>
                </li>
              {/if}
            {/each}
          </ul>
          <p class="muted">Una probabilidad no es una garantía. Cada edición queda sellada antes del primer partido{#if d.edition.sealHash}{' '}(huella <code>{d.edition.sealHash.slice(0, 10)}…</code>){/if}.</p>
        {:else if d?.edition?.sealed}
          <p class="muted">Hoy ninguna prop alcanza el umbral del método. Abstenerse también es una decisión.</p>
        {:else}
          <p class="muted">Todavía no hay edición sellada para hoy. Se publica sola antes del primer partido, cuando hay líneas de mercado y estadísticas al día.</p>
        {/if}
      </section>
      <NbaTodayBoard limit={6} />
    </div>

    <aside class="col">
      <section class="panel" aria-labelledby="bank-title">
        <div class="panel-head"><h2 id="bank-title">Tu bankroll</h2><a href="/bankroll">Abrir <ArrowUpRight size={14} aria-hidden="true" /></a></div>
        {#if busy}
          <div class="skeleton block" aria-hidden="true"></div>
        {:else if bank?.started}
          <dl class="stats">
            <div><dt>Beneficio</dt><dd class:pos={bank.profitMinor > 0} class:neg={bank.profitMinor < 0}>{signed(bank.profitMinor)}</dd></div>
            <div><dt>Yield</dt><dd>{pct(bank.metrics?.yield)}</dd></div>
            <div><dt>Acierto</dt><dd>{bank.metrics?.decided ? `${bank.metrics.won}/${bank.metrics.decided}` : '—'}</dd></div>
          </dl>
          {#if bank.metrics && !bank.metrics.conclusive}<p class="muted">Con menos de 30 tickets liquidados estas cifras son orientativas.</p>{/if}
          {#if bank.recent?.length}
            <ul class="moves" aria-label="Últimos movimientos">
              {#each bank.recent as m (m.id)}<li><span>{MOVES[m.kind] ?? m.kind}{m.note ? ` · ${m.note}` : ''}</span><b class:pos={m.deltaMinor > 0} class:neg={m.deltaMinor < 0}>{signed(m.deltaMinor)}</b></li>{/each}
            </ul>
          {/if}
        {:else if bank}
          <p class="muted">Lleva la cuenta de tu capital, tus tickets y tu resultado real. Es un registro personal: NioSports no mueve dinero.</p>
          <a class="cta" href="/bankroll">Empezar mi registro</a>
        {:else}
          <p class="muted">No pudimos consultar tu bankroll ahora mismo.</p>
        {/if}
      </section>

      <nav class="panel" aria-labelledby="sports-title">
        <div class="panel-head"><h2 id="sports-title">Deportes</h2><a href="/deportes">Estado de las fuentes <ArrowUpRight size={14} aria-hidden="true" /></a></div>
        <ul class="chips">{#each sports as [href, label]}<li><a href={href}>{label}</a></li>{/each}</ul>
      </nav>

      <nav class="panel" aria-labelledby="tools-title">
        <div class="panel-head"><h2 id="tools-title">Herramientas</h2></div>
        <ul class="tools">{#each tools as [href, label]}<li><a href={href}>{label}<ArrowUpRight size={14} aria-hidden="true" /></a></li>{/each}</ul>
      </nav>
    </aside>
  </div>
</div>

<style>
  .dash { max-width: 1320px; margin: 0 auto; padding: 28px 24px 100px; color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 18px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 6px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(32px, 4vw, 48px); line-height: .95; margin: 0; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 20px; letter-spacing: .02em; margin: 0; }
  .plan { display: inline-flex; align-items: center; min-height: var(--tap, 44px); padding: 0 14px; border-radius: 999px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); color: var(--nio-accent); font-weight: 700; font-size: 13px; text-decoration: none; white-space: nowrap; }

  .notices { list-style: none; margin: 0 0 16px; padding: 0 14px; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); }
  .notices li + li { border-top: 1px solid var(--nio-border); }
  .row { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: var(--tap, 44px); padding: 6px 0; color: var(--nio-ink); text-decoration: none; font-size: 14px; line-height: 1.4; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nio-muted); }
  .ok .dot { background: var(--nio-hit); }
  .warn .dot { background: var(--nio-accent); }
  .go { display: inline-flex; align-items: center; gap: 4px; color: var(--nio-accent); font-weight: 700; font-size: 13px; white-space: nowrap; }
  a.row:hover .text { color: var(--nio-accent); }
  .notice { display: grid; grid-template-columns: 8px 1fr auto; gap: 12px; align-items: center; margin-bottom: 16px; padding: 6px 14px; border-radius: 14px; border: 1px solid var(--nio-gold-border); background: var(--nio-gold-soft); font-size: 14px; }
  .notice p { margin: 0; }
  .notice button { min-height: var(--tap, 44px); padding: 0 6px; color: var(--nio-accent); font: inherit; font-weight: 700; font-size: 13px; background: none; border: 0; cursor: pointer; }

  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
  .tile { display: grid; gap: 4px; align-content: start; min-height: 112px; padding: 16px; border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; transition: border-color .15s ease; }
  .tile:hover { border-color: var(--nio-gold-border); }
  .tile small { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); font-weight: 600; }
  .tile b { font-family: var(--font-display); font-size: 38px; line-height: 1; font-weight: 800; }
  .tile em { font-style: normal; font-size: 12.5px; color: var(--nio-muted); line-height: 1.4; }

  .grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; }
  .col { display: grid; gap: 18px; min-width: 0; }
  .panel { border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); padding: 18px; display: grid; gap: 12px; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .panel-head a { display: inline-flex; align-items: center; gap: 4px; min-height: var(--tap, 44px); color: var(--nio-accent); font-weight: 700; font-size: 13px; text-decoration: none; white-space: nowrap; }
  .muted { margin: 0; color: var(--nio-muted); font-size: 13.5px; line-height: 1.55; }
  code { font-size: 12px; }

  .picks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .pick { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 60px; padding: 10px 12px; border-radius: 12px; background: var(--nio-raised); }
  .pick.locked { border: 1px dashed var(--nio-border); background: transparent; }
  .badge { display: inline-grid; place-items: center; width: 42px; height: 26px; border-radius: 6px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 14px; letter-spacing: .04em; }
  .who, .call { display: grid; min-width: 0; }
  .who b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who small, .call small { color: var(--nio-muted); font-size: 12px; }
  .call { text-align: right; }
  .call b { font-family: var(--font-display); font-size: 19px; letter-spacing: .01em; white-space: nowrap; }

  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; }
  .stats div { padding: 10px 12px; border-radius: 12px; background: var(--nio-raised); }
  dt { font-size: 11px; color: var(--nio-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
  dd { margin: 4px 0 0; font-family: var(--font-display); font-size: 22px; font-weight: 700; white-space: nowrap; }
  .pos { color: var(--nio-hit); } .neg { color: var(--nio-miss); }
  .moves { list-style: none; margin: 0; padding: 0; display: grid; }
  .moves li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--nio-border); font-size: 13px; }
  .moves span { color: var(--nio-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cta { display: inline-flex; align-items: center; justify-content: center; min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; background: var(--nio-action); color: var(--nio-action-ink); font-weight: 700; font-size: 14px; text-decoration: none; justify-self: start; }

  .chips { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .chips a { display: grid; place-items: center; min-height: var(--tap, 44px); border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font-weight: 700; font-size: 14px; text-decoration: none; }
  .tools { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
  .tools a { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: var(--tap, 44px); border-top: 1px solid var(--nio-border); color: var(--nio-ink); font-size: 14px; font-weight: 600; text-decoration: none; }
  .tools a :global(svg) { color: var(--nio-accent); flex: none; }
  .chips a:hover, .tools a:hover { color: var(--nio-accent); }

  .skeleton { background: linear-gradient(90deg, var(--nio-raised), var(--nio-selection), var(--nio-raised)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
  .skeleton.block { height: 120px; border-radius: 12px; }
  @keyframes shimmer { to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } .tile { transition: none; } }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; border-radius: 6px; }

  @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) {
    .dash { padding: 20px 16px 100px; }
    .tile { min-height: 104px; padding: 14px; } .tile b { font-size: 32px; }
    .go { font-size: 0; gap: 0; } .go :global(svg) { width: 16px; height: 16px; }
    .pick { grid-template-columns: auto minmax(0, 1fr); } .call { grid-column: 2; text-align: left; }
    .tools { grid-template-columns: 1fr; }
  }
</style>
