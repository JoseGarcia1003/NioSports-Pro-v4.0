<script>
  import { isAuthenticated, userId, currentUser } from '$lib/stores/auth';
  import { PLANS } from '$lib/stripe/config.js';
  import { Check } from 'lucide-svelte';

  let billingCycle = 'monthly';
  let loading = null;

  const plans = Object.values(PLANS);

  async function handleSubscribe(plan) {
    if (plan.id === 'free') return;
    if (!$isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    loading = plan.id;
    try {
      const priceId = billingCycle === 'annual' ? plan.priceId_annual : plan.priceId_monthly;

      if (!priceId) {
        alert('Stripe no configurado aún. Configura los Price IDs en src/lib/stripe/config.js');
        loading = null;
        return;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: $userId,
          userEmail: $currentUser?.email,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al crear sesión de checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Error al conectar con Stripe');
    } finally {
      loading = null;
    }
  }

  function formatPrice(plan) {
    if (plan.price === 0) return 'Gratis';
    if (billingCycle === 'annual') {
      return `$${(plan.priceAnnual / 12).toFixed(0)}`;
    }
    return `$${plan.price}`;
  }
</script>

<svelte:head>
  <title>Precios — NioSports Pro</title>
</svelte:head>

<div class="pricing">
  <header class="pricing__header">
    <span class="pricing__label">Precios</span>
    <h1 class="pricing__title">Elige tu plan</h1>
    <p class="pricing__subtitle">7 días gratis en cualquier plan de pago. Cancela cuando quieras.</p>

    <div class="pricing__toggle">
      <button class="pricing__toggle-btn" class:active={billingCycle === 'monthly'}
              on:click={() => billingCycle = 'monthly'}>Mensual</button>
      <button class="pricing__toggle-btn" class:active={billingCycle === 'annual'}
              on:click={() => billingCycle = 'annual'}>
        Anual
        <span class="pricing__toggle-badge">-45%</span>
      </button>
    </div>
  </header>

  <div class="pricing__grid">
    {#each plans as plan}
      <div class="plan-card" class:plan-card--popular={plan.popular}>
        {#if plan.popular}
          <div class="plan-card__badge">Más popular</div>
        {/if}

        <div class="plan-card__header">
          <h2 class="plan-card__name">{plan.name}</h2>
          <div class="plan-card__price">
            <span class="plan-card__amount">{formatPrice(plan)}</span>
            {#if plan.price > 0}
              <span class="plan-card__period">/mes</span>
            {/if}
          </div>
          {#if billingCycle === 'annual' && plan.priceAnnual > 0}
            <p class="plan-card__annual">${plan.priceAnnual}/año facturado anualmente</p>
          {/if}
        </div>

        <ul class="plan-card__features">
          {#each plan.features as feature}
            <li class="plan-card__feature">
              <Check size={16} strokeWidth={3} />
              <span>{feature}</span>
            </li>
          {/each}
        </ul>

        <button
          class="plan-card__cta"
          class:plan-card__cta--primary={plan.popular}
          class:plan-card__cta--disabled={plan.id === 'free'}
          disabled={loading === plan.id || plan.id === 'free'}
          on:click={() => handleSubscribe(plan)}
        >
          {#if loading === plan.id}
            Procesando...
          {:else}
            {plan.cta}
          {/if}
        </button>
      </div>
    {/each}
  </div>

  <p class="pricing__disclaimer">
    Sin compromisos · Cancela cuando quieras · Pago seguro con Stripe
  </p>
</div>

<style>
  .pricing { max-width: 1200px; margin: 0 auto; padding: 80px 32px 120px; }
  @media (max-width: 768px) { .pricing { padding: 40px 16px 100px; } }

  .pricing__header { text-align: center; margin-bottom: 60px; }
  .pricing__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .pricing__title { font-family: 'Inter', sans-serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; letter-spacing: -0.03em; margin: 12px 0 16px; }
  .pricing__subtitle { font-size: 1.1rem; color: var(--color-text-muted); }

  .pricing__toggle {
    display: inline-flex; gap: 4px; margin-top: 32px; padding: 4px;
    background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
  }
  .pricing__toggle-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 24px; border: none; border-radius: 10px;
    font-size: 0.9rem; font-weight: 700; cursor: pointer;
    background: transparent; color: var(--color-text-muted);
    font-family: 'DM Sans', sans-serif; transition: all 0.2s ease;
  }
  .pricing__toggle-btn.active { background: #6366F1; color: #fff; }
  .pricing__toggle-badge { font-size: 0.7rem; padding: 2px 8px; background: #10B981; color: #fff; border-radius: 9999px; }

  .pricing__grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start;
  }
  @media (max-width: 900px) { .pricing__grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; } }

  .plan-card {
    position: relative;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 24px;
    padding: 36px 28px;
    transition: all 0.3s ease;
  }
  .plan-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.12); }
  .plan-card--popular {
    border-color: rgba(99,102,241,0.4);
    background: rgba(99,102,241,0.05);
    box-shadow: 0 0 60px rgba(99,102,241,0.1);
  }
  .plan-card__badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    padding: 6px 20px; background: linear-gradient(135deg, #6366F1, #4F46E5);
    color: #fff; font-size: 0.75rem; font-weight: 800; border-radius: 9999px;
    letter-spacing: 0.05em;
  }

  .plan-card__header { margin-bottom: 28px; }
  .plan-card__name { font-size: 1.2rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 12px; }
  .plan-card__price { display: flex; align-items: baseline; gap: 4px; }
  .plan-card__amount { font-family: 'DM Mono', monospace; font-size: 3rem; font-weight: 700; color: var(--color-text-primary); }
  .plan-card__period { font-size: 1rem; color: var(--color-text-muted); }
  .plan-card__annual { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 6px; }

  .plan-card__features { list-style: none; padding: 0; margin: 0 0 32px; display: flex; flex-direction: column; gap: 12px; }
  .plan-card__feature { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
  .plan-card__feature :global(svg) { color: #10B981; flex-shrink: 0; }

  .plan-card__cta {
    width: 100%; padding: 14px; border: none; border-radius: 14px;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: all 0.2s ease;
    background: rgba(255,255,255,0.06); color: var(--color-text-primary);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .plan-card__cta:hover { background: rgba(255,255,255,0.1); }
  .plan-card__cta--primary { background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff; border: none; box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
  .plan-card__cta--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
  .plan-card__cta--disabled { opacity: 0.5; cursor: default; }

  .pricing__disclaimer { text-align: center; margin-top: 40px; font-size: 0.85rem; color: var(--color-text-muted); }
</style>