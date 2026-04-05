<script>
  export let text = '';
  let show = false;
</script>

<span class="tip-wrap" on:mouseenter={() => show = true} on:mouseleave={() => show = false}>
  <span class="tip-icon">?</span>
  {#if show}
    <div class="tip-popup">{text}</div>
  {/if}
</span>

<style>
  .tip-wrap { position: relative; display: inline-flex; cursor: help; }
  .tip-icon {
    width: 16px; height: 16px; border-radius: 50%;
    background: rgba(99,102,241,0.15); color: #6366F1;
    font-size: 0.6rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .tip-popup {
    position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    background: #1A1D24; border: 1px solid var(--color-border-hover);
    border-radius: 10px; padding: 10px 14px; font-size: 0.78rem;
    color: var(--color-text-secondary); line-height: 1.5;
    width: max-content; max-width: 240px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    z-index: 100; pointer-events: none;
  }
</style>