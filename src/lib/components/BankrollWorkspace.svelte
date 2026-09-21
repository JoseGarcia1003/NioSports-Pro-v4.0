<script>
  import { onMount, onDestroy } from 'svelte';
  import { userId } from '$lib/stores/auth.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { createBankrollWorkspace } from '$lib/bankroll/workspace.js';
  let type='deposit', amount='', odds='1.91', note='', draftVersion;
  const money=v=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(v||0)/100);
  const labels={deposit:'Capital añadido',withdraw:'Capital retirado',stake:'Stake reservado',settle:'Ticket liquidado'};
  const example={wallet:{available_minor:128450,reserved_minor:7500,deposited_minor:120000,withdrawn_minor:0,profit_minor:15950,settled_stake_minor:17500},entryCount:6,
    entries:[['stake',-7500,128450,'Lakers · Total del partido'],['settle',19100,135950,'Celtics · Ticket ganado'],['stake',-10000,116850,'Celtics · Total del partido'],['settle',14350,126850,'Nuggets · Ticket ganado'],['stake',-7500,112500,'Nuggets · Total del partido'],['deposit',120000,120000,'Capital de ejemplo']].map((e,i)=>({id:6-i,kind:e[0],delta_minor:e[1],balance_minor:e[2],note:e[3],created_at:`2026-09-${String(10-i).padStart(2,'0')}T12:00:00Z`})),
    tickets:[{id:'demo',stake_minor:7500,odds:1.91,note:'Lakers · Total del partido'}]};
  const workspace=createBankrollWorkspace({session:userId,request:authenticatedFetch,example});
  const {load,showDemo,transact}=workspace;
  onMount(()=>workspace.start({demo:new URLSearchParams(location.search).get('demo')==='1'}));
  onDestroy(workspace.destroy);
  $: ({data,loading,failure,success,demo,saving}=$workspace);
  $: if(draftVersion!==$workspace.draftVersion){draftVersion=$workspace.draftVersion;amount='';note='';odds='1.91';type='deposit';}
  $: w=data?.wallet||{};
  $: available=Number(w.available_minor||0);
  $: reserved=Number(w.reserved_minor||0);
  $: profit=Number(w.profit_minor||0);
  $: capital=Number(w.deposited_minor||0)-Number(w.withdrawn_minor||0);
  $: roi=Number(w.settled_stake_minor)>0?(profit/Number(w.settled_stake_minor)*100).toFixed(1)+'%':'—';
  $: exposure=available+reserved>0?Math.round(reserved/(available+reserved)*100):0;
  $: series=[...(data?.entries||[])].reverse().map(e=>Number(e.balance_minor));
  $: low=Math.min(...series,available)*.95;
  $: high=Math.max(...series,available,low+1)*1.05;
  $: points=series.map((v,i)=>`${20+i*760/Math.max(1,series.length-1)},${175-(v-low)/(high-low)*150}`).join(' ');
  function submit(){if(!/^\d+(\.\d{1,2})?$/.test(amount)||Number(amount)<=0){workspace.setFailure('Introduce un importe positivo con máximo dos decimales.');return;}transact({type,amountMinor:Math.round(Number(amount)*100),odds:type==='stake'?Number(odds):null,note});}
</script>

<div class="workspace">
  <header><div><span class="eyebrow">● TU CENTRO DE CONTROL</span><h1>Tu capital.<br/><em>Tus decisiones.</em></h1><p>Entiende tu exposición. Registra cada movimiento. Mide resultados.</p></div><div class="header-tools"><span class="badge">{demo?'Vista de ejemplo':'Registro personal · USD'}</span><button on:click={()=>demo?showDemo():load()} disabled={loading||saving} aria-label="Actualizar bankroll">↻ Actualizar</button></div></header>
  {#if demo}<aside class="demo"><strong>DEMO · DATOS SIMULADOS</strong><span>Ejemplo visual de lectura. No representa rendimiento real.</span><button on:click={load}>Volver a mi cuenta →</button></aside>{/if}
  {#if failure}<div class="message error" role="alert">{failure}<button on:click={load} disabled={saving}>Reintentar carga</button></div>{/if}
  {#if success}<div class="message" role="status">{success}</div>{/if}
  {#if loading}<div class="empty" role="status"><h2>Consultando tu registro…</h2><p>El saldo se obtiene de la contabilidad del servidor.</p></div>
  {:else if !data}<div class="empty"><span class="symbol">↗</span><h2>{$userId?'Tu registro todavía no está disponible':'Un lugar para cada movimiento'}</h2><p>{$userId?'No mostramos un saldo inventado cuando no podemos verificar los datos.':'Inicia sesión para consultar tu capital y registrar tus tickets.'}</p><div>{#if !$userId}<a class="primary" href="/login">Iniciar sesión</a>{/if}<button on:click={showDemo}>Explorar ejemplo visual →</button></div></div>
  {:else}
    {#if !demo && !data.wallet}<aside class="demo"><strong>Nuevo registro contable</strong><span>Aún no has registrado movimientos aquí. Los saldos e historiales del sistema anterior se conservan por separado y no se han importado automáticamente.</span></aside>{/if}
    <section class="metrics" aria-label="Resumen de capital">
      <article class="balance"><span class="eyebrow">◈ SALDO DISPONIBLE</span><div class="big">{money(available)}</div><footer>Patrimonio total <strong>{money(available+reserved)}</strong></footer></article>
      <article><span class="eyebrow">◷ COMPROMETIDO</span><div class="number">{money(reserved)}</div><p>{data.tickets.length} tickets pendientes</p><div class="meter"><span style={`width:${exposure}%`}></span></div><small>{exposure}% del patrimonio reservado</small></article>
      <article><span class="eyebrow">↗ BENEFICIO NETO</span><div class="number" class:negative={profit<0} class:positive={profit>=0}>{profit>0?'+':''}{money(profit)}</div><p>Solo resultados liquidados</p><footer>ROI sobre stake resuelto <strong>{roi}</strong></footer></article>
      <article><span class="eyebrow">⇣ CAPITAL NETO</span><div class="number">{money(capital)}</div><p>Aportaciones menos retiros</p><footer>Los depósitos no son beneficio</footer></article>
    </section>
    <div class="grid">
      <section class="panel chart"><div class="panel-head"><div><span class="eyebrow">PERSPECTIVA</span><h2>Evolución del saldo</h2></div><small>Últimos {series.length} movimientos</small></div>
        {#if series.length>1}<svg viewBox="0 0 800 210" role="img" aria-label="Evolución del saldo disponible, incluye aportaciones y retiros"><defs><linearGradient id="bank-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#65e2b5" stop-opacity=".24"/><stop offset="100%" stop-color="#65e2b5" stop-opacity="0"/></linearGradient></defs><path d="M20 45H780M20 110H780M20 175H780" stroke="#ffffff0e" fill="none"/><polygon points={`20,200 ${points} 780,200`} fill="url(#bank-area)"/><polyline {points} stroke="#65e2b5" stroke-width="3" fill="none" stroke-linejoin="round"/></svg><small>Saldo disponible, no curva de rentabilidad. Incluye aportaciones, retiros y reservas.</small>{:else}<div class="quiet">La evolución aparecerá después de dos movimientos.</div>{/if}
      </section>
      <section class="panel form-panel"><span class="eyebrow">REGISTRO MANUAL</span><h2>Añadir movimiento</h2><p>Control personal. No mueve dinero ni envía apuestas.</p><form on:submit|preventDefault={submit}>
        <label for="bank-type">Tipo de movimiento</label><select id="bank-type" bind:value={type} disabled={demo||saving}><option value="deposit">Aportar capital</option><option value="withdraw">Registrar retiro</option><option value="stake">Reservar stake de un ticket</option></select>
        <label for="bank-amount">Importe · USD</label><input id="bank-amount" bind:value={amount} inputmode="decimal" placeholder="0.00" required disabled={demo||saving}/>
        {#if type==='stake'}<label for="bank-odds">Cuota decimal aceptada</label><input id="bank-odds" type="number" min="1.0001" max="1000" step=".0001" bind:value={odds} required disabled={demo||saving}/>{/if}
        <label for="bank-note">Nota · opcional</label><input id="bank-note" bind:value={note} maxlength="500" placeholder="Referencia del movimiento" disabled={demo||saving}/><button class="primary" type="submit" disabled={demo||saving}>{saving?'Registrando…':'+ Registrar movimiento'}</button>
      </form></section>
      <section class="panel pending"><span class="eyebrow">EXPOSICIÓN ABIERTA</span><h2>Tickets pendientes <span class="count">{data.tickets.length}</span></h2>{#each data.tickets as ticket(ticket.id)}<div class="ticket"><div><strong>{ticket.note||'Ticket manual'}</strong><p>{money(ticket.stake_minor)} de stake · Cuota {Number(ticket.odds).toFixed(2)}</p><small>Resultado manual de tu registro personal</small></div><div class="ticket-actions">{#each [['win','Ganado'],['loss','Perdido'],['push','Push'],['void','Anulado']] as outcome}<button disabled={demo||saving} on:click={()=>transact({type:'settle',amountMinor:0,ticketId:ticket.id,outcome:outcome[0],note:`Resultado manual: ${outcome[1]}`})}>{outcome[1]}</button>{/each}</div></div>{:else}<div class="quiet">Sin capital comprometido. Tus próximos tickets aparecerán aquí.</div>{/each}</section>
      <section class="panel history"><div class="panel-head"><div><span class="eyebrow">TRAZABILIDAD</span><h2>Registro de movimientos</h2></div><small>{data.entryCount} registros en total</small></div><div class="scroll"><table><thead><tr><th>Movimiento</th><th>Fecha</th><th class="right">Importe</th><th class="right">Saldo posterior</th></tr></thead><tbody>{#each data.entries as entry(entry.id)}<tr><td><strong>{labels[entry.kind]||entry.kind}</strong><small class="row-note">{entry.note||'Sin nota'}</small></td><td><small>{new Date(entry.created_at).toLocaleDateString('es-EC')}</small></td><td class="right" class:positive={entry.delta_minor>0} class:negative={entry.delta_minor<0}>{entry.delta_minor>0?'+':''}{money(entry.delta_minor)}</td><td class="right">{money(entry.balance_minor)}</td></tr>{:else}<tr><td colspan="4" class="quiet">Tu registro comienza con la primera aportación.</td></tr>{/each}</tbody></table></div><small>Se muestran hasta 100 registros. Los saldos incluyen todos los movimientos, sin límite de historial.</small></section>
    </div>
  {/if}
</div>

<style>
  .workspace {
    --bank-text: #eaf2ee; --bank-muted: #a4b9ae; --bank-border: #2c4136;
    --bank-surface: #101c17; --bank-input: #0b1510; --bank-hover: #203a2c;
    --bank-accent: #70ddb0; --bank-accent-text: #081d12; --bank-positive: #70ddb0;
    --bank-negative: #f5aaa7; --bank-balance: linear-gradient(135deg,#17372b,#14291f);
    --bank-notice-bg: #26261c; --bank-notice-text: #ead397; --bank-notice-border: #655a35;
    max-width: 1360px; margin: auto; padding: 40px 28px 90px; color: var(--bank-text);
    font-family: var(--font-sans); font-size: 14px; line-height: 1.6; font-variant-numeric: tabular-nums;
  }
  :global([data-theme="light"]) .workspace {
    --bank-text: #152b21; --bank-muted: #52695d; --bank-border: #d4e1d8;
    --bank-surface: #fff; --bank-input: #f6f9f7; --bank-hover: #eaf2ed;
    --bank-accent: #206b48; --bank-accent-text: #fff; --bank-positive: #206b48;
    --bank-negative: #aa3436; --bank-balance: linear-gradient(135deg,#e6f3eb,#f6faf7);
    --bank-notice-bg: #fff8e9; --bank-notice-text: #795816; --bank-notice-border: #e9d9b5;
  }
  header { display:flex; justify-content:space-between; align-items:center; gap:24px; margin-bottom:30px; }
  header > div { min-width:0; }
  .eyebrow { font-size:11px; letter-spacing:1.3px; font-weight:600; color:var(--bank-muted); }
  h1,h2 { font-family:var(--font-display); font-weight:700; text-wrap:balance; }
  h1 { font-size:clamp(32px,3.7vw,48px); line-height:1.12; letter-spacing:-.04em; margin:14px 0; }
  h1 em { color:var(--bank-positive); font-style:normal; }
  h2 { font-size:22px; line-height:1.3; letter-spacing:-.025em; margin:10px 0 20px; }
  p { color:var(--bank-muted); font-size:14px; line-height:1.7; }
  small { font-size:12px; color:var(--bank-muted); line-height:1.6; }
  .header-tools { display:flex; gap:12px; align-items:center; flex-shrink:0; }
  .badge { border:1px solid var(--bank-border); border-radius:30px; padding:10px 12px; color:var(--bank-muted); font-size:12px; }
  button,a.primary { cursor:pointer; font:inherit; display:inline-flex; justify-content:center; align-items:center; min-height:44px; color:var(--bank-text); background:var(--bank-surface); border:1px solid var(--bank-border); border-radius:9px; padding:10px 14px; font-size:13px; font-weight:500; text-decoration:none; transition:background .15s,border-color .15s; }
  button:hover:not(:disabled) { border-color:var(--bank-accent); background:var(--bank-hover); }
  button:disabled { opacity:.55; cursor:not-allowed; }
  button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid var(--bank-accent); outline-offset:3px; }
  .demo,.message { display:flex; align-items:center; gap:16px; padding:16px 18px; border:1px solid var(--bank-border); border-radius:12px; margin-bottom:20px; font-size:13px; line-height:1.6; }
  .demo { background:var(--bank-notice-bg); border-color:var(--bank-notice-border); color:var(--bank-notice-text); }
  .demo button { margin-left:auto; flex-shrink:0; }
  .message { background:var(--bank-surface); color:var(--bank-positive); }
  .error { color:var(--bank-negative); }
  .metrics { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr; gap:14px; margin-bottom:24px; }
  .metrics article { min-width:0; padding:23px; border:1px solid var(--bank-border); border-radius:16px; background:var(--bank-surface); }
  .metrics .balance { background:var(--bank-balance); }
  .big { font-size:40px; font-weight:700; letter-spacing:-.04em; margin:20px 0; }
  .number { font-size:28px; letter-spacing:-.025em; font-weight:600; margin:22px 0 9px; }
  .metrics p { font-size:12px; margin:0; }
  footer { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px; font-size:12px; border-top:1px solid var(--bank-border); padding-top:14px; color:var(--bank-muted); margin-top:22px; }
  .meter { height:4px; background:var(--bank-border); margin:15px 0 7px; border-radius:3px; }
  .meter span { display:block; height:100%; background:var(--bank-accent); }
  .grid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; }
  .panel { min-width:0; background:var(--bank-surface); border:1px solid var(--bank-border); border-radius:16px; padding:24px; }
  .panel-head { display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .chart svg { width:100%; margin:15px 0; overflow:visible; }
  .chart svg path { stroke:var(--bank-border); }
  .chart svg polyline { stroke:var(--bank-positive); }
  .form-panel { grid-column:2; grid-row:1 / span 2; }
  .form-panel h2 { margin-bottom:7px; }
  form { display:flex; flex-direction:column; gap:9px; margin-top:24px; }
  label { font-size:13px; margin-top:8px; color:var(--bank-text); }
  input,select { width:100%; min-height:44px; box-sizing:border-box; border:1px solid var(--bank-border); background:var(--bank-input); color:var(--bank-text); border-radius:8px; padding:12px; font:inherit; }
  input::placeholder { color:var(--bank-muted); }
  input:disabled,select:disabled { opacity:.7; }
  button.primary,a.primary { background:var(--bank-accent); border-color:var(--bank-accent); color:var(--bank-accent-text); font-weight:600; padding:13px; }
  button.primary:hover:not(:disabled),a.primary:hover { filter:brightness(.92); background:var(--bank-accent); }
  form .primary { margin-top:14px; }
  .pending { grid-column:1; }
  .count { font-size:12px; color:var(--bank-muted); background:var(--bank-hover); padding:3px 8px; margin-left:8px; border-radius:5px; }
  .ticket { display:flex; justify-content:space-between; gap:14px; border-top:1px solid var(--bank-border); padding:18px 0 5px; }
  .ticket > div { min-width:0; }
  .ticket strong { font-size:14px; font-weight:600; overflow-wrap:anywhere; }
  .ticket-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .ticket-actions button { font-size:12px; padding:8px 10px; }
  .history { grid-column:1 / -1; }
  .scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; margin-bottom:15px; }
  th { text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--bank-muted); padding:15px 10px; border-bottom:1px solid var(--bank-border); }
  td { padding:17px 10px; border-bottom:1px solid var(--bank-border); }
  td strong { font-size:13px; font-weight:500; }
  .row-note { display:block; margin-top:6px; max-width:280px; overflow:hidden; text-overflow:ellipsis; }
  .right { text-align:right; }
  .positive { color:var(--bank-positive); }
  .negative { color:var(--bank-negative); }
  .quiet { padding:35px 0; color:var(--bank-muted); font-size:14px; }
  .empty { padding:65px 25px; text-align:center; border:1px solid var(--bank-border); border-radius:16px; background:var(--bank-surface); }
  .empty h2 { font-size:26px; margin:18px 0; }
  .empty button { margin:16px 8px; }
  .symbol { font-size:40px; color:var(--bank-positive); }
  @media(max-width:1050px) { .metrics { grid-template-columns:1fr 1fr; } .grid { grid-template-columns:1fr; } .form-panel { grid-column:auto; grid-row:auto; } .pending,.history { grid-column:auto; } .header-tools { flex-direction:column; align-items:flex-end; } }
  @media(max-width:620px) {
    .workspace { padding:25px 16px 90px; } header { align-items:flex-start; gap:12px; } .badge { display:none; } .header-tools button { padding:10px; }
    .metrics { gap:10px; } .metrics article { padding:16px; } .big { font-size:clamp(24px,7vw,32px); } .number { font-size:clamp(21px,6vw,28px); } .eyebrow { font-size:10px; letter-spacing:.07em; }
    .panel { padding:18px; } .demo { flex-direction:column; align-items:flex-start; gap:8px; } .demo button { margin:0; } .ticket { flex-direction:column; } .panel-head { align-items:flex-start; flex-wrap:wrap; }
  }
</style>
