<!-- src/lib/components/ToastContainer.svelte -->
<!--
  REEMPLAZA: scripts/toast.js y window.showToast()

  En el sistema actual cualquier módulo llama window.showToast({ message, type })
  y un listener global manipula el DOM directamente. Aquí, cualquier módulo
  importa { toasts } from '$lib/stores/ui' y llama toasts.success('mensaje').
  Este componente lee ese store y renderiza lo que haya en él.

  La separación es: el store es la fuente de verdad, este componente
  es solo el "dibujante". Cualquier código en cualquier parte de la app
  puede añadir toasts sin saber nada de este componente.
-->
<script>
  import { toasts } from '$lib/stores/ui';

  // Mapa de estilos por tipo — definido como datos, no como CSS condicional disperso
  const TYPE_CONFIG = {
    success: { icon: '✅', bg: 'rgba(16,185,129,0.15)', border: '#10b981' },
    error:   { icon: '❌', bg: 'rgba(239,68,68,0.15)',  border: '#ef4444' },
    warning: { icon: '⚠️', bg: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
    info:    { icon: 'ℹ️', bg: 'rgba(6,182,212,0.15)',  border: '#06b6d4' },
  };
</script>

<!-- Portal al final del body para evitar problemas de z-index y overflow -->
<div class="toast-portal" aria-live="polite" aria-atomic="false">
  {#each $toasts as toast (toast.id)}
    {@const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info}
    <!--
      (toast.id) como key en #each es crítico: le dice a Svelte que
      identifique cada toast por su ID único. Sin esto, cuando un toast
      desaparece del medio de la lista, Svelte podría reutilizar el nodo
      DOM equivocado. Con la key, siempre destruye exactamente el nodo correcto.
    -->
    <div
      class="toast"
      style="background:{cfg.bg}; border-color:{cfg.border}"
      role="alert"
    >
      <span class="toast__icon">{cfg.icon}</span>
      <p class="toast__message">{toast.message}</p>
      <button
        class="toast__close"
        on:click={() => toasts.dismiss(toast.id)}
        aria-label="Cerrar"
      >×</button>
    </div>
  {/each}
</div>

<style>
  .toast-portal {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none; /* El portal no bloquea clicks en la app */
  }

  .toast {
    pointer-events: auto; /* Pero cada toast sí recibe clicks */
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid;
    backdrop-filter: blur(12px);
    min-width: 280px;
    max-width: 380px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .toast__icon   { flex-shrink: 0; font-size: 16px; margin-top: 1px; }
  .toast__message {
    flex: 1;
    margin: 0;
    font-size: 0.9rem;
    color: #fff;
    line-height: 1.4;
  }
  .toast__close {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.15s;
  }
  .toast__close:hover { color: #fff; }
</style>
