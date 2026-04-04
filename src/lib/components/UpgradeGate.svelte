<!-- src/lib/components/UpgradeGate.svelte -->
<!-- Overlay that blocks content for users without the required plan -->
<script>
  import { Lock, Zap, Crown } from 'lucide-svelte';
  import { subscription } from '$lib/stores/subscription';
  import { hasFeature } from '$lib/config/plans.js';

  /** @type {string} Feature key from plans.js (e.g. 'bankroll', 'fullStats', 'clvTracking') */
  export let feature = '';

  /** @type {string} Minimum plan required: 'pro' or 'elite' */
  export let requiredPlan = 'pro';

  /** @type {string} Title shown in the gate overlay */
  export let title = 'Función Premium';

  /** @type {string} Description shown in the gate overlay */
  export let description = 'Actualiza tu plan para desbloquear esta función.';

  $: userPlan = $subscription.plan || 'free';
  $: isActive = $subscription.status === 'active' || $subscription.status === 'none';
  $: hasAccess = feature
    ? hasFeature(userPlan, feature)
    : (requiredPlan === 'pro'
        ? (userPlan === 'pro' || userPlan === 'elite')
        : userPlan === 'elite');

  $: planLabel = requiredPlan === 'elite' ? 'Elite' : 'Pro';
  $: planPrice = requiredPlan === 'elite' ? '$29.99' : '$14.99';
</script>

{#if hasAccess}
  <slot />
{:else}
  <div class="gate">
    <div class="gate__preview">
      <slot />
    </div>
    <div class="gate__overlay">
      <div class="gate__card">
        <div class="gate__icon">
          {#if requiredPlan === 'elite'}
            <Crown size={32} />
          {:else}
            <Zap size={32} />
          {/if}
        </div>
        <h3 class="gate__title">{title}</h3>
        <p class="gate__desc">{description}</p>
        <a href="/pricing" class="gate__btn">
          <Lock size={16} />
          Desbloquear con {planLabel} — {planPrice}/mes
        </a>
        <p class="gate__hint">Cancela cuando quieras · Sin compromiso</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .gate {
    position: relative;
    min-height: 300px;
  }

  .gate__preview {
    filter: blur(6px);
    opacity: 0.4;
    pointer-events: none;
    user-select: none;
    overflow: hidden;
    max-height: 500px;
  }

  .gate__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    background: radial-gradient(ellipse at center, rgba(6,9,18,0.95) 0%, rgba(6,9,18,0.8) 100%);
    border-radius: 16px;
  }

  .gate__card {
    text-align: center;
    padding: 40px 32px;
    max-width: 400px;
  }

  .gate__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 16px;
    color: #6366f1;
    margin-bottom: 20px;
  }

  .gate__title {
    font-size: 22px;
    font-weight: 700;
    color: #ededed;
    margin: 0 0 8px;
  }

  .gate__desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 24px;
    line-height: 1.5;
  }

  .gate__btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #6366f1;
    color: white;
    padding: 12px 28px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s;
  }

  .gate__btn:hover {
    background: #4f46e5;
    transform: translateY(-1px);
  }

  .gate__hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 12px;
  }
</style>