<!--
  Renders the toasts held in $lib/stores/ui (toasts.success('…'), toasts.error('…')).
  The store is the source of truth; this component only draws it. Colours come
  from the brand tokens so every toast is readable in both themes, and green/red
  keep their single meaning (done / failed).
-->
<script>
  import { toasts } from '$lib/stores/ui';

  const TYPE_CONFIG = {
    success: { mark: '✓', label: 'Hecho' },
    error: { mark: '✕', label: 'Error' },
    warning: { mark: '!', label: 'Aviso' },
    info: { mark: 'i', label: 'Información' }
  };
</script>

<div class="toast-portal">
  {#each $toasts as toast (toast.id)}
    {@const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info}
    <!-- Errors interrupt (alert); everything else is announced politely (status). -->
    <div class={`toast ${toast.type in TYPE_CONFIG ? toast.type : 'info'}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span class="toast__icon" aria-hidden="true">{cfg.mark}</span>
      <p class="toast__message"><span class="sr-only">{`${cfg.label}: `}</span>{toast.message}</p>
      <button class="toast__close" on:click={() => toasts.dismiss(toast.id)} aria-label="Cerrar aviso">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-portal { position: fixed; right: 24px; bottom: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
  .toast { --tone: var(--nio-accent); pointer-events: auto; display: flex; align-items: flex-start; gap: 10px; padding: 12px 12px 12px 14px; border-radius: 12px; border: 1px solid var(--nio-border); border-left: 3px solid var(--tone); background: var(--nio-raised); color: var(--nio-ink); min-width: 280px; max-width: 380px; box-shadow: 0 10px 30px var(--nio-shadow); animation: slideIn .2s ease; }
  .toast.success { --tone: var(--nio-hit); }
  .toast.error { --tone: var(--nio-miss); }
  .toast__icon { flex-shrink: 0; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--tone); color: var(--nio-page); font-size: 12px; font-weight: 800; margin-top: 1px; }
  .toast__message { flex: 1; margin: 0; font-size: 14px; line-height: 1.45; }
  .toast__close { flex-shrink: 0; width: var(--tap, 44px); height: var(--tap, 44px); margin: -4px -4px 0 0; border-radius: 8px; background: none; border: none; cursor: pointer; color: var(--nio-muted); font-size: 18px; line-height: 1; }
  .toast__close:hover { color: var(--nio-ink); }
  .toast__close:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  @keyframes slideIn { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  /* Above the mobile bottom navigation. */
  @media (max-width: 768px) { .toast-portal { left: 16px; right: 16px; bottom: calc(84px + env(safe-area-inset-bottom)); } .toast { min-width: 0; max-width: none; } }
</style>
