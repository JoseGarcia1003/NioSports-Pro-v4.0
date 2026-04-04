<script>
  import UpgradeGate from '$lib/components/UpgradeGate.svelte';
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { bankrollStore, bankrollROI, bankrollPnL, allPicks } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { Wallet, ArrowUpCircle, ArrowDownCircle, RotateCcw, TrendingUp, Target, BarChart3, X } from 'lucide-svelte';
  import ProfitCurve from '$lib/components/charts/ProfitCurve.svelte';

  let loading = true;
  let showModal = false;
  let modalType = 'deposit';
  let modalAmount = '';
  let modalNote = '';
  let modalLoading = false;

  onMount(() => { setTimeout(() => loading = false, 300); });

  $: bankroll = $bankrollStore;
  $: current = bankroll.current ?? 0;
  $: initial = bankroll.initial ?? 0;
  $: history = bankroll.history ?? [];
  $: roi = parseFloat($bankrollROI) || 0;
  $: pnl = parseFloat($bankrollPnL) || 0;

  $: picks = $allPicks || [];
  $: resolvedPicks = picks.filter(p => (p.status || p.result) === 'win' || (p.status || p.result) === 'loss');
  $: wins = resolvedPicks.filter(p => (p.status || p.result) === 'win').length;
  $: losses = resolvedPicks.filter(p => (p.status || p.result) === 'loss').length;
  $: winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';

  // Chart data from history
  $: chartData = history.map((h, i) => ({ date: i, profit: h.balance || 0 }));

  function getEntryDisplay(entry) {
    const map = {
      deposit: { label: 'Depósito', cls: 'pos' },
      withdraw: { label: 'Retiro', cls: 'neg' },
      bet_win: { label: 'Apuesta Ganada', cls: 'pos' },
      bet_loss: { label: 'Apuesta Perdida', cls: 'neg' },
      bet_push: { label: 'Push', cls: 'neutral' },
    };
    return map[entry.type] || { label: entry.type, cls: 'neutral' };
  }

  function getAmountDisplay(entry) {
    const isPos = entry.type === 'deposit' || entry.type === 'bet_win';
    const isNeutral = entry.type === 'bet_push';
    if (isNeutral) return { text: '$0.00', cls: 'neutral' };
    return { text: `${isPos ? '+' : '-'}$${(entry.amount || 0).toFixed(2)}`, cls: isPos ? 'pos' : 'neg' };
  }

  function openModal(type) { modalType = type; modalAmount = ''; modalNote = ''; showModal = true; }
  function closeModal() { showModal = false; modalLoading = false; }

  async function handleTransaction() {
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount <= 0) { toasts.error('Monto debe ser mayor a 0.'); return; }
    if (modalType === 'withdraw' && amount > current) { toasts.error('No puedes retirar más de tu saldo.'); return; }
    modalLoading = true;
    try {
      const newBalance = modalType === 'deposit' ? current + amount : current - amount;
      await bankrollStore.addTransaction({
        user_id: $userId,
        type: modalType,
        amount: modalType === 'deposit' ? amount : -amount,
        balance: parseFloat(newBalance.toFixed(2)),
        note: modalNote || null,
        created_at: new Date().toISOString(),
      });
      toasts.success(modalType === 'deposit' ? `Depósito de $${amount.toFixed(2)} registrado.` : `Retiro de $${amount.toFixed(2)} registrado.`);
      closeModal();
    } catch {
      toasts.error('No se pudo registrar.');
      modalLoading = false;
    }
  }

  async function handleReset() {
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount < 0) { toasts.error('Monto inválido.'); return; }
    modalLoading = true;
    try {
      // For reset, we just set a new initial via a deposit transaction
      await bankrollStore.addTransaction({
        user_id: $userId,
        type: 'deposit',
        amount,
        balance: amount,
        note: 'Bankroll reiniciado',
        created_at: new Date().toISOString(),
      });
      toasts.success('Bankroll reiniciado.');
      closeModal();
    } catch {
      toasts.error('No se pudo reiniciar.');
      modalLoading = false;
    }
  }

  function submit() { if (modalType === 'reset') handleReset(); else handleTransaction(); }
</script>

<svelte:head><title>Bankroll — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">Gestión de capital</span>
    <h1 class="page__title">Bankroll</h1>
    <p class="page__subtitle">Evolución y control de tu capital de juego</p>
  </header>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>Cargando bankroll...</p></div>
  {:else}

  <UpgradeGate feature="bankroll" requiredPlan="pro" title="Bankroll Management" description="Controla tu bankroll, registra depósitos/retiros y visualiza tu rentabilidad con gráficos profesionales.">
    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi kpi--main">
        <div class="kpi__icon"><Wallet size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value indigo">${current.toFixed(2)}</span>
          <span class="kpi__label">Balance actual</span>
        </div>
        {#if initial > 0}
          <span class="kpi__badge" class:green={pnl >= 0} class:red={pnl < 0}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({roi >= 0 ? '+' : ''}{roi}%)
          </span>
        {/if}
      </div>
      <div class="kpi">
        <div class="kpi__icon"><BarChart3 size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value">${initial.toFixed(2)}</span>
          <span class="kpi__label">Capital inicial</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi__icon"><Target size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value" class:green={parseFloat(winRate) >= 52.4}>{winRate}{winRate !== '—' ? '%' : ''}</span>
          <span class="kpi__label">Win Rate</span>
        </div>
        <span class="kpi__badge">{wins}W-{losses}L</span>
      </div>
      <div class="kpi">
        <div class="kpi__icon"><TrendingUp size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value" class:green={roi >= 0} class:red={roi < 0}>{roi >= 0 ? '+' : ''}{roi}%</span>
          <span class="kpi__label">ROI total</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="abtn abtn--deposit" on:click={() => openModal('deposit')}>
        <ArrowUpCircle size={16} /> Depósito
      </button>
      <button class="abtn abtn--withdraw" on:click={() => openModal('withdraw')} disabled={current <= 0}>
        <ArrowDownCircle size={16} /> Retiro
      </button>
      <button class="abtn abtn--reset" on:click={() => openModal('reset')}>
        <RotateCcw size={16} /> Reiniciar
      </button>
    </div>

    <!-- Balance Chart -->
    <div class="card">
      <h2 class="card__title">Evolución del Balance</h2>
      {#if chartData.length >= 2}
        <ProfitCurve data={chartData} />
      {:else}
        <div class="empty-inline">
          <TrendingUp size={32} strokeWidth={1} />
          <p>Registra al menos 2 movimientos para ver la evolución</p>
        </div>
      {/if}
    </div>

    <!-- History -->
    <div class="card">
      <h2 class="card__title">Historial de Movimientos</h2>
      {#if history.length === 0}
        <div class="empty-inline">
          <Wallet size={32} strokeWidth={1} />
          <p>Sin movimientos registrados</p>
          <span class="muted">Haz tu primer depósito para comenzar</span>
        </div>
      {:else}
        <div class="history-list">
          {#each [...history].reverse() as entry, i (entry.created_at || entry.date || i)}
            {@const display = getEntryDisplay(entry)}
            {@const amt = getAmountDisplay(entry)}
            <div class="hitem">
              <div class="hitem__left">
                <span class="hitem__type">{display.label}</span>
                {#if entry.note}<span class="hitem__note">{entry.note}</span>{/if}
                <span class="hitem__date">{(entry.created_at || entry.date || '').slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div class="hitem__right">
                <span class="hitem__amount" class:green={amt.cls === 'pos'} class:red={amt.cls === 'neg'}>{amt.text}</span>
                <span class="hitem__balance">${(entry.balance || 0).toFixed(2)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </UpgradeGate>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={closeModal}>
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal__head">
        <h3>{modalType === 'deposit' ? 'Registrar Depósito' : modalType === 'withdraw' ? 'Registrar Retiro' : 'Reiniciar Bankroll'}</h3>
        <button class="modal__x" on:click={closeModal}><X size={18} /></button>
      </div>

      {#if modalType === 'reset'}
        <div class="modal__warn">Esto establecerá un nuevo capital inicial. El historial previo se mantiene.</div>
      {/if}

      <label class="field">
        <span class="field__label">{modalType === 'reset' ? 'Nuevo capital ($)' : 'Monto ($)'}</span>
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
        <button class="mbtn mbtn--ghost" on:click={closeModal} disabled={modalLoading}>Cancelar</button>
        <button class="mbtn mbtn--primary" on:click={submit} disabled={modalLoading || !modalAmount}>
          {modalLoading ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 32px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 0.9rem; color: rgba(255,255,255,0.4); }

  /* KPIs */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }

  .kpi { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 18px; display: flex; align-items: flex-start; gap: 12px; position: relative; }
  .kpi--main { border-color: rgba(99,102,241,0.25); }
  .kpi__icon { color: #6366F1; margin-top: 2px; }
  .kpi__body { display: flex; flex-direction: column; gap: 2px; }
  .kpi__value { font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 700; }
  .kpi__label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi__badge { position: absolute; top: 12px; right: 14px; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); }

  /* Actions */
  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
  .abtn { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .abtn:active:not(:disabled) { transform: scale(0.97); }
  .abtn:disabled { opacity: 0.3; cursor: not-allowed; }
  .abtn--deposit { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.25); }
  .abtn--deposit:hover { background: rgba(16,185,129,0.25); }
  .abtn--withdraw { background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); }
  .abtn--withdraw:hover { background: rgba(239,68,68,0.25); }
  .abtn--reset { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.08); }
  .abtn--reset:hover { background: rgba(255,255,255,0.08); }

  /* Cards */
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px; }
  .card__title { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; }

  /* History */
  .history-list { display: flex; flex-direction: column; gap: 8px; }
  .hitem { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; }
  .hitem__left { display: flex; flex-direction: column; gap: 2px; }
  .hitem__type { font-weight: 700; font-size: 0.88rem; }
  .hitem__note { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
  .hitem__date { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
  .hitem__right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .hitem__amount { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 1rem; }
  .hitem__balance { font-size: 0.7rem; color: rgba(255,255,255,0.35); }

  /* Shared */
  .green { color: #10B981; }
  .red { color: #EF4444; }
  .indigo { color: #6366F1; }
  .muted { font-size: 0.85rem; color: rgba(255,255,255,0.35); }

  .empty-inline { text-align: center; padding: 32px; color: rgba(255,255,255,0.25); display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 0.85rem; }

  .loading { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: rgba(255,255,255,0.4); }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Modal */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #111318; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 28px 24px; width: 100%; max-width: 400px; }
  .modal__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal__head h3 { font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 800; }
  .modal__x { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; }
  .modal__warn { font-size: 0.83rem; color: #F59E0B; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
  .modal__actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }

  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field__label { font-size: 0.78rem; color: rgba(255,255,255,0.5); font-weight: 600; }
  .field__input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #fff; font-family: 'DM Mono', monospace; font-size: 0.95rem; }
  .field__input:focus { outline: none; border-color: #6366F1; }

  .mbtn { padding: 10px 20px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .mbtn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mbtn--ghost { background: transparent; border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
  .mbtn--primary { background: #6366F1; color: #fff; }
</style>