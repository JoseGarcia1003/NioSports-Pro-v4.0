<!-- src/routes/bankroll/+page.svelte -->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { userId }           from '$lib/stores/auth';
  import { bankrollStore,
           bankrollROI,
           bankrollPnL,
           picksTotales }     from '$lib/stores/data';
  import { toasts }           from '$lib/stores/ui';
  import { dbSubscribe,
           dbWrite,
           userPath }         from '$lib/firebase';
  import SkeletonCard         from '$lib/components/SkeletonCard.svelte';

  let loading        = true;
  let cleanupBankroll = null;
  let cleanupPicks    = null;

  let showModal    = false;
  let modalType    = 'deposit';
  let modalAmount  = '';
  let modalNote    = '';
  let modalLoading = false;

  let chartCanvas;
  let chartInstance = null;

  onMount(async () => {
    if (!$userId) return;
    cleanupBankroll = dbSubscribe(
      userPath($userId, 'bankroll'),
      (data) => {
        bankrollStore.set(data ?? { current: 0, initial: 0, history: [] });
        loading = false;
      }
    );
    cleanupPicks = dbSubscribe(userPath($userId, 'picks', 'totales'), () => {});
  });

  onDestroy(() => {
    cleanupBankroll?.();
    cleanupPicks?.();
    chartInstance?.destroy();
  });

  afterUpdate(() => {
    if (!chartCanvas || loading) return;
    const history = $bankrollStore.history ?? [];
    if (history.length < 2) return;
    buildChart(history);
  });

  $: bankroll    = $bankrollStore;
  $: current     = bankroll.current  ?? 0;
  $: initial     = bankroll.initial  ?? 0;
  $: history     = bankroll.history  ?? [];
  $: roi         = parseFloat($bankrollROI) || 0;
  $: pnl         = parseFloat($bankrollPnL) || 0;
  $: pnlPositive = pnl >= 0;

  $: resolvedPicks = $picksTotales.filter(p => p.status && p.status !== 'pending');
  $: wins          = resolvedPicks.filter(p => p.status === 'win').length;
  $: losses        = resolvedPicks.filter(p => p.status === 'loss').length;
  $: winRate       = (wins + losses) > 0
                     ? ((wins / (wins + losses)) * 100).toFixed(1)
                     : '—';

  function buildChart(historyData) {
    if (typeof window === 'undefined' || !window.Chart) return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    const labels   = historyData.map(h => new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
    const values   = historyData.map(h => h.balance);
    const isProfit = values[values.length - 1] >= values[0];
    chartInstance  = new window.Chart(chartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Balance',
          data: values,
          borderColor: isProfit ? '#34d399' : '#f87171',
          backgroundColor: isProfit ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: isProfit ? '#34d399' : '#f87171',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, callback: v => `$${v}` } }
        }
      }
    });
  }

  function openModal(type) { modalType = type; modalAmount = ''; modalNote = ''; showModal = true; }
  function closeModal()    { showModal = false; modalLoading = false; }

  async function handleTransaction() {
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount <= 0) { toasts.error('Ingresa un monto válido mayor a 0.'); return; }
    if (modalType === 'withdraw' && amount > current) { toasts.error('No puedes retirar más de tu saldo actual.'); return; }
    modalLoading = true;
    try {
      const snapshot = bankrollStore.getSnapshot();
      const prevBal  = snapshot.current ?? 0;
      const newBal   = modalType === 'deposit' ? prevBal + amount : prevBal - amount;
      const entry    = { date: new Date().toISOString(), type: modalType, amount, balance: parseFloat(newBal.toFixed(2)), note: modalNote || null };
      const newHistory = [...(snapshot.history ?? []), entry];
      const updates    = { current: parseFloat(newBal.toFixed(2)), history: newHistory };
      if (!snapshot.initial || snapshot.initial === 0) updates.initial = parseFloat(newBal.toFixed(2));
      await dbWrite(userPath($userId, 'bankroll'), updates);
      toasts.success(modalType === 'deposit' ? `✅ Depósito de $${amount.toFixed(2)} registrado.` : `✅ Retiro de $${amount.toFixed(2)} registrado.`);
      closeModal();
    } catch {
      toasts.error('No se pudo registrar la transacción.');
      modalLoading = false;
    }
  }

  async function handleReset() {
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount < 0) { toasts.error('Ingresa un monto válido.'); return; }
    modalLoading = true;
    try {
      await dbWrite(userPath($userId, 'bankroll'), { current: parseFloat(amount.toFixed(2)), initial: parseFloat(amount.toFixed(2)), history: [], resetAt: new Date().toISOString() });
      toasts.success('Bankroll reiniciado correctamente.');
      closeModal();
    } catch {
      toasts.error('No se pudo reiniciar el bankroll.');
      modalLoading = false;
    }
  }

  function submit() { if (modalType === 'reset') handleReset(); else handleTransaction(); }
</script>

<svelte:head>
  <title>Bankroll — NioSports Pro</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</svelte:head>

<div class="page">

  <div class="page__header">
    <h1 class="page__title">💰 Bankroll</h1>
    <p class="page__subtitle">Gestión y evolución de tu capital de juego</p>
  </div>

  {#if loading}
    <!-- ✅ FASE 6: SkeletonCard reemplaza skeleton-grid y skeleton-chart manuales -->
    <SkeletonCard type="kpi" count={4} />
    <SkeletonCard type="chart" />

  {:else}

    <div class="kpi-grid">
      <div class="kpi kpi--main">
        <span class="kpi__icon">💵</span>
        <div class="kpi__value kpi__value--accent">${current.toFixed(2)}</div>
        <div class="kpi__label">Balance actual</div>
        {#if initial > 0}
          <div class="kpi__sub" class:kpi__sub--pos={pnlPositive} class:kpi__sub--neg={!pnlPositive}>
            {pnlPositive ? '+' : ''}${pnl.toFixed(2)} ({pnlPositive ? '+' : ''}{roi}%)
          </div>
        {/if}
      </div>

      <div class="kpi">
        <span class="kpi__icon">🏦</span>
        <div class="kpi__value">${initial.toFixed(2)}</div>
        <div class="kpi__label">Capital inicial</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">🎯</span>
        <div class="kpi__value" class:kpi__value--win={parseFloat(winRate) >= 55}>
          {winRate}{winRate !== '—' ? '%' : ''}
        </div>
        <div class="kpi__label">Win rate</div>
        <div class="kpi__sub kpi__sub--neutral">{wins}W / {losses}L</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">📊</span>
        <div class="kpi__value" class:kpi__value--win={roi >= 0} class:kpi__value--loss={roi < 0}>
          {roi >= 0 ? '+' : ''}{roi}%
        </div>
        <div class="kpi__label">ROI total</div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn--deposit"  on:click={() => openModal('deposit')}>+ Depósito</button>
      <button class="btn btn--withdraw" on:click={() => openModal('withdraw')} disabled={current <= 0}>− Retiro</button>
      <button class="btn btn--reset"    on:click={() => openModal('reset')}>↺ Reiniciar</button>
    </div>

    <div class="card">
      <h2 class="card__title">📈 Evolución del balance</h2>
      {#if history.length >= 2}
        <div class="chart-wrap"><canvas bind:this={chartCanvas}></canvas></div>
      {:else}
        <div class="empty-state empty-state--inline">
          <span>📉</span>
          <p>Registra al menos 2 movimientos para ver la evolución.</p>
        </div>
      {/if}
    </div>

    <div class="card">
      <h2 class="card__title">🕒 Historial de movimientos</h2>
      {#if history.length === 0}
        <div class="empty-state">
          <span>📭</span>
          <p>Sin movimientos registrados aún.</p>
          <p>Haz tu primer depósito para comenzar a trackear.</p>
        </div>
      {:else}
        <div class="history-list">
          {#each [...history].reverse() as entry, i (entry.date + i)}
            <div class="history-item">
              <div class="history-item__icon">{entry.type === 'deposit' ? '⬆️' : '⬇️'}</div>
              <div class="history-item__info">
                <span class="history-item__type">{entry.type === 'deposit' ? 'Depósito' : 'Retiro'}</span>
                {#if entry.note}<span class="history-item__note">{entry.note}</span>{/if}
                <span class="history-item__date">
                  {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div class="history-item__right">
                <span class="history-item__amount"
                  class:history-item__amount--pos={entry.type === 'deposit'}
                  class:history-item__amount--neg={entry.type === 'withdraw'}>
                  {entry.type === 'deposit' ? '+' : '−'}${entry.amount.toFixed(2)}
                </span>
                <span class="history-item__balance">Balance: ${entry.balance.toFixed(2)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {/if}
</div>

{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={closeModal} role="dialog" aria-modal="true">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">
          {modalType === 'deposit' ? '+ Registrar depósito' : modalType === 'withdraw' ? '− Registrar retiro' : '↺ Reiniciar bankroll'}
        </h3>
        <button class="modal__close" on:click={closeModal} aria-label="Cerrar">✕</button>
      </div>

      {#if modalType === 'reset'}
        <p class="modal__warning">⚠️ Esto borrará todo el historial y establecerá un nuevo capital inicial.</p>
      {/if}

      <label class="field">
        <span class="field__label">{modalType === 'reset' ? 'Nuevo capital inicial ($)' : 'Monto ($)'}</span>
        <input class="field__input" type="number" min="0" step="0.01" placeholder="0.00"
          bind:value={modalAmount} on:keydown={e => e.key === 'Enter' && submit()} />
      </label>

      {#if modalType !== 'reset'}
        <label class="field">
          <span class="field__label">Nota (opcional)</span>
          <input class="field__input" type="text" placeholder="Ej: Recarga mensual"
            bind:value={modalNote} maxlength="80" />
        </label>
      {/if}

      <div class="modal__actions">
        <button class="btn btn--ghost" on:click={closeModal} disabled={modalLoading}>Cancelar</button>
        <button class="btn"
          class:btn--deposit={modalType === 'deposit'}
          class:btn--withdraw={modalType === 'withdraw' || modalType === 'reset'}
          on:click={submit}
          disabled={modalLoading || !modalAmount}>
          {#if modalLoading}<span class="spinner"></span>{:else}Confirmar{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 32px 20px 80px; }
  .page__header   { margin-bottom: 28px; }
  .page__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 900;
    margin-bottom: 4px;
  }
  .page__subtitle { color: var(--color-text-muted); font-size: 0.9rem; }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
  }
  .kpi {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpi--main { border-color: rgba(251,191,36,0.25); }
  .kpi__icon  { font-size: 1.3rem; margin-bottom: 4px; }
  .kpi__value { font-size: 1.6rem; font-weight: 800; font-family: 'DM Mono', monospace; color: var(--color-text); }
  .kpi__value--accent { color: #fbbf24; }
  .kpi__value--win    { color: #34d399; }
  .kpi__value--loss   { color: #f87171; }
  .kpi__label { font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi__sub   { font-size: 0.78rem; font-weight: 700; margin-top: 2px; }
  .kpi__sub--pos     { color: #34d399; }
  .kpi__sub--neg     { color: #f87171; }
  .kpi__sub--neutral { color: var(--color-text-muted); }

  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 20px; border-radius: 10px; border: none;
    font-size: 0.88rem; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn--deposit  { background: #059669; color: #fff; }
  .btn--withdraw { background: #dc2626; color: #fff; }
  .btn--reset    { background: var(--color-bg-card); color: var(--color-text); border: 1px solid var(--color-border); }
  .btn--ghost    { background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border); }

  .card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 16px; padding: 22px 20px; margin-bottom: 20px; }
  .card__title { font-size: 1rem; font-weight: 800; margin-bottom: 16px; }
  .chart-wrap { height: 220px; }

  .history-list { display: flex; flex-direction: column; gap: 10px; }
  .history-item {
    display: flex; align-items: center; gap: 12px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px; padding: 12px 16px;
  }
  .history-item__icon  { font-size: 1.3rem; flex-shrink: 0; }
  .history-item__info  { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .history-item__type  { font-weight: 700; font-size: 0.88rem; }
  .history-item__note  { font-size: 0.78rem; color: var(--color-text-muted); }
  .history-item__date  { font-size: 0.72rem; color: var(--color-text-muted); }
  .history-item__right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .history-item__amount { font-weight: 800; font-size: 1rem; font-family: 'DM Mono', monospace; }
  .history-item__amount--pos { color: #34d399; }
  .history-item__amount--neg { color: #f87171; }
  .history-item__balance     { font-size: 0.72rem; color: var(--color-text-muted); }

  .empty-state { text-align: center; padding: 48px 20px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .empty-state span { font-size: 2.5rem; }
  .empty-state--inline { padding: 28px 20px; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #0f1729; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 28px 24px; width: 100%; max-width: 420px; }
  .modal__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal__title  { font-size: 1.05rem; font-weight: 800; }
  .modal__close  { background: none; border: none; color: var(--color-text-muted); font-size: 1rem; cursor: pointer; padding: 4px 8px; }
  .modal__warning { font-size: 0.83rem; color: #f59e0b; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
  .modal__actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }

  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field__label { font-size: 0.8rem; color: var(--color-text-muted); font-weight: 600; }
  .field__input { background: rgba(255,255,255,0.05); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 14px; color: var(--color-text); font-size: 0.95rem; width: 100%; transition: border-color 0.15s; }
  .field__input:focus { outline: none; border-color: #fbbf24; }

  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>