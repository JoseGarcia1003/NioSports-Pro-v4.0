<script>
  import { onMount } from 'svelte';
  import { ShieldCheck, ShieldAlert, Download, Lock, Clock } from 'lucide-svelte';
  import { verifyChain, sha256Hex, GENESIS } from '$lib/integrity/seal.js';
  import { modelLabel } from '$lib/product/labels.js';

  // Public verification: the browser re-computes every SHA-256 itself and checks
  // the chain links. Nothing here trusts a "verified" flag sent by our server.
  let state = 'loading', seals = [], verdicts = new Map(), chainOk = null, open = null;
  let pasted = '', pastedHash = '', pastedResult = null;

  const dt = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
  const when = v => (v ? dt.format(new Date(v)) : '—');
  const short = h => `${h.slice(0, 10)}…${h.slice(-6)}`;
  const MARKET = { points: 'Puntos de jugador', team_points: 'Puntos de equipo', game_total: 'Total del partido' };
  const SPORT = { nba: 'NBA', football: 'Fútbol', tennis: 'Tenis', mlb: 'MLB' };
  const num = v => (typeof v === 'number' ? v.toLocaleString('es', { maximumFractionDigits: 1 }) : v);

  onMount(async () => {
    try {
      const res = await fetch('/api/public/seals?limit=200');
      const body = await res.json();
      if (!res.ok) throw new Error();
      seals = body.seals;
      const asc = [...seals].sort((a, b) => a.seq - b.seq);
      const startPrev = asc[0]?.seq === 1 ? GENESIS : null;
      const result = await verifyChain(asc, { startPrev });
      verdicts = new Map(result.records.map(r => [r.seq, r]));
      chainOk = result.ok;
      state = 'ready';
    } catch { state = 'unavailable'; }
  });

  async function checkPasted() {
    const text = pasted.trim();
    if (!text) return;
    const hash = await sha256Hex(text);
    const known = seals.find(s => s.hash === hash);
    pastedResult = { hash, matches: pastedHash ? hash === pastedHash.trim().toLowerCase() : null, known };
  }
  const entries = s => { try { return JSON.parse(s.text).entries; } catch { return []; } };
  const download = s => {
    const url = URL.createObjectURL(new Blob([s.text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `niosports-${s.editionKey.replace(/:/g, '_')}.json` });
    a.click(); URL.revokeObjectURL(url);
  };
</script>

<svelte:head><title>Verificar pronósticos · NioSports Pro</title><meta name="description" content="Comprueba por ti mismo que los pronósticos de NioSports se registraron antes de cada partido y no se han modificado." /></svelte:head>

<div class="page">
  <header class="head">
    <p class="eyebrow">Transparencia · Registro sellado</p>
    <h1>Verifica cada pronóstico</h1>
    <p class="lead">Cada edición se guarda como un texto exacto y se resume con una huella SHA-256 antes del primer partido. Cada huella incluye la anterior, formando una cadena: cambiar cualquier registro pasado rompería todos los siguientes. Tu navegador recalcula aquí todas las huellas; no tienes que confiar en nosotros.</p>
  </header>

  {#if state === 'loading'}
    <p class="state" role="status">Cargando el registro y verificando en tu navegador…</p>
  {:else if state === 'unavailable'}
    <p class="state">No pudimos cargar el registro. Inténtalo más tarde.</p>
  {:else}
    <div class="summary" class:bad={!chainOk} role="status">
      {#if chainOk}<ShieldCheck size={22} aria-hidden="true" />{:else}<ShieldAlert size={22} aria-hidden="true" />{/if}
      <p><b>{chainOk ? 'Cadena íntegra' : 'Se detectó una inconsistencia'}</b> · {seals.length} {seals.length === 1 ? 'registro' : 'registros'} verificados en este navegador con Web Crypto (SHA-256).</p>
    </div>

    {#if !seals.length}
      <p class="state">Todavía no hay ediciones selladas.</p>
    {:else}
      <ol class="ledger">
        {#each seals as s (s.seq)}
          {@const v = verdicts.get(s.seq)}
          <li class="seal">
            <div class="row">
              <span class="seq">#{s.seq}</span>
              <div class="what">
                <strong>{SPORT[s.sport] ?? s.sport} · {MARKET[s.market] ?? s.market} · {s.day}</strong>
                <small>{s.entryCount} {s.entryCount === 1 ? 'pronóstico' : 'pronósticos'} · <span title={s.model}>{modelLabel(s.model)}</span></small>
              </div>
              <span class="badge" class:ok={v?.ok} class:fail={!v?.ok}>{v?.ok ? (v.content === 'verified' ? 'Verificado' : 'Huella encadenada') : 'Error'}</span>
            </div>
            <dl class="meta">
              <div><dt>Huella</dt><dd><code title={s.hash}>{short(s.hash)}</code></dd></div>
              <div><dt>Sellado</dt><dd>{when(s.sealedAt)}</dd></div>
              <div><dt>Primer partido</dt><dd>{when(s.firstEventAt)}</dd></div>
              <div><dt>Anclaje externo</dt><dd>{s.anchors.length ? `OpenTimestamps (${s.anchors.length})` : 'Pendiente'}</dd></div>
            </dl>
            {#if s.backfilled}<p class="note"><Clock size={14} aria-hidden="true" /> Sellado retroactivamente desde una tabla inmutable: no prueba por sí solo que el contenido existiera antes del partido.</p>{/if}
            {#if v && !v.ok}<p class="note fail">Problemas: {v.problems.join(', ')}</p>{/if}
            {#if s.revealed && s.text}
              <div class="actions">
                <button type="button" on:click={() => (open = open === s.seq ? null : s.seq)} aria-expanded={open === s.seq}>{open === s.seq ? 'Ocultar contenido' : 'Ver contenido sellado'}</button>
                <button type="button" on:click={() => download(s)}><Download size={14} aria-hidden="true" /> Texto exacto (.json)</button>
                {#each s.anchors as a}<a href={`/api/public/seals/${s.hash}/ots?calendar=${encodeURIComponent(a.calendar)}`}><Download size={14} aria-hidden="true" /> Prueba .ots</a>{/each}
              </div>
              {#if open === s.seq}
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div class="scroller" tabindex="0" role="region" aria-label={`Contenido sellado del registro ${s.seq}`}>
                  <table>
                    <thead><tr><th scope="col">Jugador</th><th scope="col">Lado</th><th scope="col">Línea</th><th scope="col">Prob. modelo</th></tr></thead>
                    <tbody>{#each entries(s) as e}<tr><th scope="row">{e.name}</th><td>{e.side === 'over' ? 'Más de' : 'Menos de'}</td><td>{num(e.line)}</td><td>{e.model?.p != null ? `${Math.round(e.model.p * 100)} %` : '—'}</td></tr>{/each}</tbody>
                  </table>
                </div>
              {/if}
            {:else}
              <p class="note"><Lock size={14} aria-hidden="true" /> Contenido oculto hasta {when(s.revealAfter)}. La huella ya es pública: cuando se revele, cualquiera podrá comprobar que coincide.</p>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}

    <section class="check" aria-labelledby="check-title">
      <h2 id="check-title">Comprueba un texto tú mismo</h2>
      <p class="muted">Pega el texto exacto de una edición (el archivo .json descargado) y, si quieres, la huella publicada. Calculamos el SHA-256 en tu navegador.</p>
      <label for="pasted">Texto sellado</label>
      <textarea id="pasted" bind:value={pasted} rows="4" spellcheck="false"></textarea>
      <label for="pasted-hash">Huella publicada (opcional)</label>
      <input id="pasted-hash" bind:value={pastedHash} autocomplete="off" spellcheck="false" />
      <button type="button" class="primary" on:click={checkPasted}>Calcular SHA-256</button>
      {#if pastedResult}
        <p class="result" role="status"><code>{pastedResult.hash}</code><br />
          {#if pastedResult.matches === true}Coincide con la huella indicada.{:else if pastedResult.matches === false}No coincide con la huella indicada: el texto no es el sellado.{/if}
          {pastedResult.known ? ` Es el registro #${pastedResult.known.seq} del libro.` : ' No corresponde a ningún registro listado.'}</p>
      {/if}
    </section>
  {/if}

  <section class="limits" aria-labelledby="limits-title">
    <h2 id="limits-title">Qué demuestra y qué no</h2>
    <ul>
      <li><b>Demuestra integridad:</b> si alguien cambiara una coma de un registro, su huella y toda la cadena posterior dejarían de cuadrar en tu navegador.</li>
      <li><b>La base de datos rechaza cambios:</b> verifica cada huella al guardarla, exige el orden de la cadena y que el sellado sea anterior al primer partido, y no permite editar ni borrar.</li>
      <li><b>Anclaje independiente:</b> cada huella se envía a calendarios públicos de OpenTimestamps, que la anclan en la cadena de bloques de Bitcoin (en horas). La prueba .ots se verifica con la herramienta oficial <code>ots verify</code> sin depender de NioSports.</li>
      <li><b>Límite:</b> mientras una huella no está anclada, la prueba de fecha depende de nuestra base de datos. Quien administre el servidor podría, en teoría, reescribir la cadena entera antes del anclaje; el anclaje externo es lo que lo impide.</li>
      <li><b>Límite:</b> el sello prueba qué se publicó y cuándo, no que el pronóstico sea bueno. Para eso está la <a href="/transparencia">calibración pública</a>.</li>
    </ul>
  </section>
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 32px 24px 100px; color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 12px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0 0 10px; }
  .lead { color: var(--nio-muted); line-height: 1.6; max-width: 760px; margin: 0 0 24px; }
  .state, .muted { color: var(--nio-muted); }
  .summary { display: flex; gap: 12px; align-items: center; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--nio-gold-border); background: var(--nio-gold-soft); margin-bottom: 18px; color: var(--nio-hit); }
  .summary.bad { color: var(--nio-miss); border-color: var(--nio-miss); }
  .summary p { margin: 0; color: var(--nio-ink); font-size: 14px; }
  .ledger { list-style: none; padding: 0; margin: 0 0 28px; display: grid; gap: 12px; }
  .seal { border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); padding: 16px; display: grid; gap: 10px; }
  .row { display: flex; align-items: center; gap: 12px; }
  .seq { font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--nio-accent); min-width: 40px; }
  .what { display: grid; flex: 1; min-width: 0; }
  .what small { color: var(--nio-muted); }
  .badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--nio-border); white-space: nowrap; }
  .badge.ok { color: var(--nio-hit); } .badge.fail { color: var(--nio-miss); }
  .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
  dt { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); font-weight: 600; }
  dd { margin: 2px 0 0; font-size: 13px; overflow-wrap: anywhere; }
  code { font-size: 12px; overflow-wrap: anywhere; }
  .note { margin: 0; display: flex; gap: 6px; align-items: flex-start; font-size: 13px; color: var(--nio-muted); line-height: 1.5; }
  .note.fail { color: var(--nio-miss); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .actions button, .actions a, .primary { display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap, 44px); padding: 0 12px; border-radius: 9px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .primary { background: var(--nio-action); color: var(--nio-action-ink); border: 0; min-height: var(--tap, 44px); margin-top: 4px; justify-self: start; }
  .scroller { overflow-x: auto; border: 1px solid var(--nio-border); border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--nio-border); white-space: nowrap; }
  thead th { background: var(--nio-raised); color: var(--nio-muted); font-size: 11px; }
  .check { border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); padding: 18px; display: grid; gap: 8px; margin-bottom: 24px; }
  label { font-size: 12px; font-weight: 600; color: var(--nio-muted); }
  textarea, input { width: 100%; box-sizing: border-box; border: 1px solid var(--nio-border); border-radius: 10px; background: var(--nio-raised); color: var(--nio-ink); font: 12px/1.5 ui-monospace, monospace; padding: 10px; }
  .result { margin: 6px 0 0; font-size: 13px; line-height: 1.6; }
  .limits ul { margin: 0; padding-left: 20px; color: var(--nio-muted); line-height: 1.7; font-size: 14px; }
  .limits b { color: var(--nio-ink); }
  .limits a { color: var(--nio-accent); }
  button:focus-visible, a:focus-visible, textarea:focus-visible, input:focus-visible, .scroller:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 640px) { .page { padding: 24px 16px 100px; } .meta { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
