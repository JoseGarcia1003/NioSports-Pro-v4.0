<script>
  export let remaining = null;
  export let limit = null;
  export let plan = 'free';
  export let reset = 0;

  $: pct   = (limit && remaining !== null) ? (remaining / limit) * 100 : 100;
  $: color = pct > 50 ? '#6366f1' : pct > 20 ? '#f59e0b' : '#ef4444';
  $: label = remaining === null ? '' : `${remaining}/${limit} predicciones hoy`;
  $: resetTime = reset
    ? new Date(reset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    : null;
</script>

{#if remaining !== null}
  <div class="rl-badge">
    <div class="rl-bar">
      <div class="rl-fill" style="width:{pct}%; background:{color}"></div>
    </div>
    <span class="rl-label" style="color:{color}">{label}</span>
    {#if remaining === 0 && plan !== 'elite'}
      <a href="/pricing" class="rl-upgrade">
        ↑ {plan === 'free' ? 'Upgrade a Pro' : 'Upgrade a Elite'}
      </a>
    {/if}
    {#if remaining !== null && remaining <= 3 && resetTime}
      <span class="rl-reset">Reinicia {resetTime}</span>
    {/if}
  </div>
{/if}

<style>
  .rl-badge {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px;
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 8px; font-size: 12px; font-family: inherit;
  }
  .rl-bar { width: 72px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; flex-shrink: 0; }
  .rl-fill { height: 100%; border-radius: 9999px; transition: width 0.4s ease, background 0.4s ease; }
  .rl-label { white-space: nowrap; font-weight: 500; }
  .rl-reset { color: #64748b; white-space: nowrap; font-size: 11px; }
  .rl-upgrade {
    color: #6366f1; font-weight: 600; text-decoration: none;
    white-space: nowrap; padding: 2px 8px;
    border: 1px solid rgba(99,102,241,0.4);
    border-radius: 4px; font-size: 11px; transition: all 0.2s ease;
  }
  .rl-upgrade:hover { background: rgba(99,102,241,0.15); color: #818cf8; }
</style>