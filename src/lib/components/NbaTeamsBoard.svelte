<script>
  import { onMount } from 'svelte';
  import { teamColor, teamStyle } from '$lib/product/teams.js';
  import { toTeamGame, rateVs, mean, teamReferenceLine, marketTotalFor } from '$lib/nba/team-props.js';

  /** Board games ({id, home, visitor, homeName, visitorName, datetime}). */
  export let games = [];
  /** { [team]: [[date, opp, home, pf, pa, season], ...] } newest first. */
  export let teams = null;
  export let gameFilter = 'all';
  export let side = 'over';

  // Market game totals (cached server-side; no credits per visit).
  let totals = null;
  onMount(async () => {
    try {
      const res = await fetch('/api/odds/nba-totals');
      const body = await res.json();
      totals = res.ok && Array.isArray(body.events) ? body : null;
    } catch { totals = null; }
  });

  let overrides = {};
  const nudge = (key, current, delta) => { overrides = { ...overrides, [key]: Math.max(0.5, Math.round((current + delta) * 2) / 2) }; };
  const reset = key => { const { [key]: _, ...rest } = overrides; overrides = rest; };

  const fmt = n => (n == null ? '—' : n.toLocaleString('es', { maximumFractionDigits: 1 }));
  const pct = r => (r.rate == null ? '—' : `${Math.round((side === 'under' ? 1 - r.rate : r.rate) * 100)}%`);
  const hits = r => (side === 'under' ? r.under : r.over);
  const tone = r => { if (r.rate == null) return ''; const v = side === 'under' ? 1 - r.rate : r.rate; return v >= 0.6 ? 'hit' : v <= 0.4 ? 'miss' : ''; };
  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
  const WINDOWS = [['L5', 5], ['L10', 10], ['L20', 20]];

  function teamSample(code) { return Array.isArray(teams?.[code]) ? teams[code].map(toTeamGame) : []; }

  $: cards = games
    .filter(g => gameFilter === 'all' || String(g.id) === gameFilter)
    .map(g => {
      const away = teamSample(g.visitor), home = teamSample(g.home);
      const market = marketTotalFor(g, totals);
      const totalKey = `${g.id}:total`;
      const refTotal = teamReferenceLine([...away, ...home].sort((a, b) => b.date.localeCompare(a.date)).map(x => x.total));
      const totalLine = overrides[totalKey] ?? market?.point ?? refTotal;
      const rows = [[g.visitor, away, g.home], [g.home, home, g.visitor]].map(([code, sample, opp]) => {
        const key = `${g.id}:${code}`;
        const ref = teamReferenceLine(sample.map(x => x.pf));
        const line = overrides[key] ?? ref;
        const oppSample = teamSample(opp);
        return { code, key, line, custom: key in overrides, n: sample.length,
          windows: WINDOWS.map(([label, n]) => [label, rateVs(sample.map(x => x.pf), line, n)]),
          avg: mean(sample.map(x => x.pf), 10), oppAllows: mean(oppSample.map(x => x.pa), 10),
          totals: WINDOWS.map(([label, n]) => [label, rateVs(sample.map(x => x.total), totalLine, n)]) };
      });
      return { g, market, totalKey, totalLine, totalCustom: totalKey in overrides, rows };
    });
</script>

<section class="teams" aria-label="Props de equipo">
  <p class="notice">
    Puntos de cada equipo y total del partido, sumados del box score oficial (stats.nba.com). <b>«Casa»</b>: total real del partido, mediana entre casas{#if totals}{' '}({totals.source}, {timeFormat.format(new Date(totals.fetchedAt))}){/if}. <b>«Ref.»</b>: mediana de sus últimos 10 partidos ajustada a ,5, <b>no es una línea de casa</b>.
  </p>
  <div class="segment" role="group" aria-label="Lado de la línea">
    <button type="button" class:on={side === 'over'} aria-pressed={side === 'over'} on:click={() => (side = 'over')}>Más de</button>
    <button type="button" class:on={side === 'under'} aria-pressed={side === 'under'} on:click={() => (side = 'under')}>Menos de</button>
  </div>
  {#if !teams}
    <p class="state">No pudimos cargar los partidos por equipo. No mostramos cifras sin fuente.</p>
  {:else}
    <div class="cards">
      {#each cards as c (c.g.id)}
        <article class="card">
          <header>
            <span class="match"><i class="badge" style={teamStyle(c.g.visitor)}>{c.g.visitor}</i><span class="at">@</span><i class="badge" style={teamStyle(c.g.home)}>{c.g.home}</i></span>
            <small>{timeFormat.format(new Date(c.g.datetime))}</small>
          </header>

          <div class="block">
            <div class="block-head">
              <h3>Total del partido</h3>
              {#if c.totalLine != null}
                <span class="line">
                  <button type="button" aria-label="Bajar línea del total" on:click={() => nudge(c.totalKey, c.totalLine, -0.5)}>−</button>
                  <b title={c.totalCustom ? 'Línea ajustada por ti' : c.market ? `Mediana de ${c.market.books} casas` : 'Línea de referencia'}>{fmt(c.totalLine)}</b>
                  <button type="button" aria-label="Subir línea del total" on:click={() => nudge(c.totalKey, c.totalLine, 0.5)}>+</button>
                  <em>{c.totalCustom ? 'Tuya' : c.market ? 'Casa' : 'Ref.'}</em>
                  {#if c.totalCustom}<button type="button" class="reset" on:click={() => reset(c.totalKey)}>Restablecer</button>{/if}
                </span>
              {/if}
            </div>
            {#each c.rows as r}
              <div class="rates">
                <span class="who">{r.code}</span>
                {#each r.totals as [label, h]}<span class={`rate ${tone(h)}`}><small>{label}</small><b>{pct(h)}</b><em>{hits(h)}/{h.over + h.under}</em></span>{/each}
              </div>
            {/each}
            <p class="hint">Partidos de cada equipo cuyo total quedó {side === 'over' ? 'por encima' : 'por debajo'} de la línea.</p>
          </div>

          {#each c.rows as r}
            <div class="block">
              <div class="block-head">
                <h3>Puntos de {r.code}</h3>
                {#if r.line != null}
                  <span class="line">
                    <button type="button" aria-label={`Bajar línea de ${r.code}`} on:click={() => nudge(r.key, r.line, -0.5)}>−</button>
                    <b>{fmt(r.line)}</b>
                    <button type="button" aria-label={`Subir línea de ${r.code}`} on:click={() => nudge(r.key, r.line, 0.5)}>+</button>
                    <em>{r.custom ? 'Tuya' : 'Ref.'}</em>
                    {#if r.custom}<button type="button" class="reset" on:click={() => reset(r.key)}>Restablecer</button>{/if}
                  </span>
                {/if}
              </div>
              {#if r.n}
                <div class="rates solo">
                  {#each r.windows as [label, h]}<span class={`rate ${tone(h)}`}><small>{label}</small><b>{pct(h)}</b><em>{hits(h)}/{h.over + h.under}</em></span>{/each}
                </div>
                <p class="hint">Promedia {fmt(r.avg)} en L10{#if r.oppAllows != null}; su rival de hoy permite {fmt(r.oppAllows)} en sus últimos 10{/if}.</p>
              {:else}
                <p class="hint">Sin partidos guardados de este equipo.</p>
              {/if}
            </div>
          {/each}
        </article>
      {:else}
        <p class="state">No hay partidos para este filtro.</p>
      {/each}
    </div>
  {/if}
</section>

<style>
  .teams { font-variant-numeric: tabular-nums; }
  .notice { margin: 20px 0 16px; padding: 12px 14px; border-radius: 12px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); color: var(--nio-ink); font-size: 13px; line-height: 1.55; }
  .notice b { color: var(--nio-accent); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
  .card { border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); padding: 16px; display: grid; gap: 12px; align-content: start; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .match { display: inline-flex; align-items: center; gap: 8px; }
  .at { color: var(--nio-muted); font-weight: 600; }
  header small { color: var(--nio-muted); font-size: 12px; }
  .badge { display: inline-grid; place-items: center; width: 44px; height: 28px; border-radius: 6px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 15px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .block { border-top: 1px solid var(--nio-border); padding-top: 12px; display: grid; gap: 8px; }
  .block-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  h3 { margin: 0; font-family: var(--font-display); text-transform: uppercase; font-size: 17px; letter-spacing: .02em; }
  .line { display: inline-flex; align-items: center; gap: 6px; }
  .line b { font-family: var(--font-display); font-size: 22px; min-width: 52px; text-align: center; }
  .line em { font-style: normal; font-size: 11px; font-weight: 700; color: var(--nio-accent); text-transform: uppercase; letter-spacing: .06em; }
  .line button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 700; cursor: pointer; }
  .line .reset { width: auto; padding: 0 8px; font-size: 11px; color: var(--nio-muted); }
  .line button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .rates { display: grid; grid-template-columns: 48px repeat(3, 1fr); gap: 6px; align-items: center; }
  .rates.solo { grid-template-columns: repeat(3, 1fr); }
  .who { font-weight: 700; font-size: 13px; color: var(--nio-muted); }
  .rate { display: grid; justify-items: center; padding: 6px 4px; border-radius: 10px; background: var(--nio-raised); }
  .rate small { font-size: 10px; color: var(--nio-muted); letter-spacing: .06em; }
  .rate b { font-family: var(--font-display); font-size: 20px; line-height: 1.1; }
  .rate em { font-style: normal; font-size: 11px; color: var(--nio-muted); }
  .rate.hit b { color: var(--nio-hit); }
  .rate.miss b { color: var(--nio-miss); }
  .hint { margin: 0; font-size: 12px; color: var(--nio-muted); line-height: 1.5; }
  .state { color: var(--nio-muted); }
  .segment { display: inline-flex; gap: 4px; margin: 0 0 14px; padding: 3px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-surface); }
  .segment button { min-height: 34px; padding: 0 14px; border-radius: 8px; border: 0; background: transparent; color: var(--nio-muted); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .segment button.on { background: var(--nio-action); color: var(--nio-action-ink); }
  .segment button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
</style>
