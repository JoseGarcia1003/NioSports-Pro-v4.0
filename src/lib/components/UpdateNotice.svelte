<script>
  import { beforeNavigate } from '$app/navigation';
  import { updated } from '$app/stores';

  // A new deployment was detected (kit.version.pollInterval). The next in-app
  // navigation becomes a full page load, so nobody keeps using stale code; the
  // notice lets the user refresh right away.
  beforeNavigate(({ willUnload, to }) => {
    if ($updated && !willUnload && to?.url) location.href = to.url.href;
  });
</script>

{#if $updated}
  <div class="update" role="status">
    <span>Hay una versión nueva de NioSports.</span>
    <button type="button" on:click={() => location.reload()}>Actualizar</button>
  </div>
{/if}

<style>
  .update { position: fixed; left: 50%; bottom: calc(84px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 1200; display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 16px; border-radius: 12px; border: 1px solid var(--nio-gold-border); background: var(--nio-raised); color: var(--nio-ink); box-shadow: 0 10px 30px var(--nio-shadow); font-size: 14px; max-width: calc(100vw - 32px); }
  button { min-height: 36px; padding: 0 14px; border-radius: 9px; border: 0; background: var(--nio-action); color: var(--nio-action-ink); font: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
  button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (min-width: 1024px) { .update { bottom: 24px; } }
</style>
