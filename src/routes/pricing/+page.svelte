<script>
  import { page } from '$app/stores';
  import { userId } from '$lib/stores/auth';
  import { subscription } from '$lib/stores/subscription';
  import { toasts } from '$lib/stores/ui';
  import { PLANS } from '$lib/config/plans.js';
  import { Check, X, Crown, Zap, Shield } from 'lucide-svelte';

  let loading = null; // which plan is loading

  $: success = $page.url.searchParams.get('success') === 'true';
  $: canceled = $page.url.searchParams.get('canceled') === 'true';
  $: currentPlan = $subscription.plan || 'free';

  const planList = [
    {
      ...PLANS.free,
      icon: Shield,
      highlights: [
        { text: 'Calculadora de totales', included: true },
        { text: '1 pick AI por día', included: true },
        { text: 'Módulo Bankroll', included: false },
        { text: 'Estadísticas completas', included: false },
        { text: 'CLV Tracking', included: false },
        { text: 'Exportar CSV', included: false },
      ]
    },
    {
      ...PLANS.pro,
      icon: Zap,
      highlights: [
        { text: 'Calculadora de totales', included: true },
        { text: '70% picks AI del día', included: true },
        { text: 'Módulo Bankroll', included: true },
        { text: 'Dashboard completo', included: true },
        { text: 'Exportar CSV', included: true },
        { text: 'CLV Tracking', included: false },
      ]
    },
    {
      ...PLANS.elite,
      icon: Crown,
      highlights: [
        { text: 'Calculadora de totales', included: true },
        { text: '100% picks AI del día', included: true },
        { text: 'Módulo Bankroll', included: true },
        { text: 'Dashboard + Stats completas', included: true },
        { text: 'CLV Tracking avanzado', included: true },
        { text: 'Exportar CSV + Prioridad', included: true },
      ]
    }
  ];

  async function handleCheckout(plan) {
    if (!$userId) { toasts.error('Inicia sesión primero.'); return; }
    if (!plan.priceId) return;
    if (currentPlan === plan.id) return;

    loading = plan.id;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: $userId,
          userEmail: '', // Firebase auth email
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toasts.error(data.error || 'Error al crear sesión de pago.');
      }
    } catch (err) {
      toasts.error('No se pudo conectar con Stripe.');
    } finally {
      loading = null;
    }
  }

  async function handleManage() {
    if (!$userId) return;
    loading = 'manage';
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: $userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toasts.error('No se pudo abrir el portal.');
    } catch { toasts.error('Error de conexión.'); }
    finally { loading = null; }
  }
</script>

<svelte:head><title>Planes — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">Planes y precios</span>
    <h1 class="page__title">Elige tu plan</h1>
    <p class="page__subtitle">Análisis cuantitativo NBA con XGBoost v3.0</p>
  </header>

  {#if success}
    <div class="banner banner--success">
      <Check size={20} />
      <p>Suscripción activada correctamente. Disfruta de NioSports Pro.</p>
    </div>
  {/if}

  {#if canceled}
    <div class="banner banner--warn">
      <X size={20} />
      <p>Pago cancelado. Puedes intentar de nuevo cuando quieras.</p>
    </div>
  {/if}

  <div class="plans-grid">
    {#each planList as plan}
      {@const isCurrent = currentPlan === plan.id}
      {@const isPopular = plan.id === 'pro'}
      <div class="plan" class:plan--popular={isPopular} class:plan--current={isCurrent}>
        {#if isPopular}<div class="plan__popular-badge">Más popular</div>{/if}
        {#if isCurrent}<div class="plan__current-badge">Tu plan actual</div>{/if}

        <div class="plan__header">
          <svelte:component this={plan.icon} size={24} />
          <h2 class="plan__name">{plan.name}</h2>
        </div>

        <div class="plan__price">
          {#if plan.price === 0}
            <span class="plan__amount">$0</span>
            <span class="plan__period">siempre gratis</span>
          {:else}
            <span class="plan__amount">${plan.price}</span>
            <span class="plan__period">/mes</span>
          {/if}
        </div>

        <ul class="plan__features">
          {#each plan.highlights as feat}
            <li class:included={feat.included} class:excluded={!feat.included}>
              {#if feat.included}<Check size={16} />{:else}<X size={16} />{/if}
              <span>{feat.text}</span>
            </li>
          {/each}
        </ul>

        {#if isCurrent}
          {#if plan.id !== 'free'}
            <button class="plan__btn plan__btn--manage" on:click={handleManage} disabled={loading === 'manage'}>
              {loading === 'manage' ? 'Cargando...' : 'Gestionar suscripción'}
            </button>
          {:else}
            <button class="plan__btn plan__btn--current" disabled>Plan actual</button>
          {/if}
        {:else if plan.price === 0}
          <button class="plan__btn plan__btn--free" disabled>Incluido</button>
        {:else}
          <button class="plan__btn" class:plan__btn--popular={isPopular} on:click={() => handleCheckout(plan)} disabled={loading === plan.id}>
            {loading === plan.id ? 'Redirigiendo...' : `Suscribirme a ${plan.name}`}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="guarantee">
    <Shield size={20} />
    <p>Cancela cuando quieras. Sin contratos. Cambio de plan instantáneo.</p>
  </div>
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { text-align: center; margin-bottom: 40px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 900; letter-spacing: -0.03em; margin: 10px 0 8px; }
  .page__subtitle { font-size: 1rem; color: var(--color-text-muted); }

  .banner { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; }
  .banner p { margin: 0; }
  .banner--success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #10B981; }
  .banner--warn { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); color: #F59E0B; }

  .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
  @media (max-width: 768px) { .plans-grid { grid-template-columns: 1fr; } }

  .plan { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 20px; padding: 28px 24px; display: flex; flex-direction: column; position: relative; transition: border-color 0.2s; }
  .plan:hover { border-color: rgba(255,255,255,0.12); }
  .plan--popular { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.04); }
  .plan--current { border-color: rgba(16,185,129,0.3); }

  .plan__popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6366F1; color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 14px; border-radius: 20px; }
  .plan__current-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #10B981; color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 14px; border-radius: 20px; }

  .plan__header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: var(--color-text-secondary); }
  .plan__name { font-family: 'Inter', sans-serif; font-size: 1.2rem; font-weight: 800; }

  .plan__price { margin-bottom: 24px; }
  .plan__amount { font-family: 'DM Mono', monospace; font-size: 2.5rem; font-weight: 800; }
  .plan__period { font-size: 0.9rem; color: var(--color-text-muted); }

  .plan__features { list-style: none; margin: 0 0 24px; padding: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .plan__features li { display: flex; align-items: center; gap: 10px; font-size: 0.88rem; }
  .included { color: var(--color-text-secondary); }
  .included :global(svg) { color: #10B981; }
  .excluded { color: var(--color-text-muted); }
  .excluded :global(svg) { color: rgba(255,255,255,0.15); }

  .plan__btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .plan__btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .plan__btn:active:not(:disabled) { transform: scale(0.97); }

  .plan__btn--popular { background: #6366F1; color: #fff; }
  .plan__btn--popular:hover:not(:disabled) { background: #4F46E5; }

  .plan__btn:not(.plan__btn--popular):not(.plan__btn--free):not(.plan__btn--current):not(.plan__btn--manage) {
    background: var(--color-bg-elevated); color: var(--color-text-secondary); border: 1px solid var(--color-border-hover);
  }
  .plan__btn:not(.plan__btn--popular):hover:not(:disabled) { background: rgba(255,255,255,0.1); }

  .plan__btn--free, .plan__btn--current { background: var(--color-bg-card); color: var(--color-text-muted); }
  .plan__btn--manage { background: rgba(16,185,129,0.12); color: #10B981; border: 1px solid rgba(16,185,129,0.2); }
  .plan__btn--manage:hover:not(:disabled) { background: rgba(16,185,129,0.2); }

  .guarantee { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px; color: var(--color-text-muted); font-size: 0.85rem; }
</style>