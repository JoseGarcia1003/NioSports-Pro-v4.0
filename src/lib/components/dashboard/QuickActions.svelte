<script>
  import { TrendingUp, BarChart3, Target, Wallet } from 'lucide-svelte';

  const actions = [
    { href: '/picks', label: 'Picks', desc: 'Predicciones del modelo', icon: Target, gradient: 'primary' },
    { href: '/totales', label: 'Análisis', desc: 'Totales por período', icon: BarChart3, gradient: 'secondary' },
    { href: '/stats', label: 'Estadísticas', desc: 'Tu rendimiento', icon: TrendingUp, gradient: 'tertiary' },
    { href: '/bankroll', label: 'Bankroll', desc: 'Gestión de capital', icon: Wallet, gradient: 'quaternary' },
  ];
</script>

<section class="actions">
  <h2 class="section-title">Acciones rápidas</h2>
  <div class="actions__grid">
    {#each actions as action}
      <a href={action.href} class="action-card action-card--{action.gradient}">
        <div class="action-card__icon-wrap">
          <svelte:component this={action.icon} size={22} strokeWidth={2} />
        </div>
        <div class="action-card__content">
          <h3 class="action-card__title">{action.label}</h3>
          <p class="action-card__desc">{action.desc}</p>
        </div>
        <svg class="action-card__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
    {/each}
  </div>
</section>

<style>
  .section-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 1.25rem; font-weight: 800; margin-bottom: 20px;
    color: var(--color-text-primary);
  }
  .actions { margin-bottom: 48px; }
  .actions__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 1024px) { .actions__grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 540px) { .actions__grid { grid-template-columns: 1fr; } }

  .action-card {
    display: flex; align-items: center; gap: 16px;
    padding: 20px 24px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .action-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  }

  .action-card__icon-wrap {
    width: 48px; height: 48px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .action-card--primary .action-card__icon-wrap { background: rgba(99,102,241,0.15); color: #6366F1; }
  .action-card--secondary .action-card__icon-wrap { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .action-card--tertiary .action-card__icon-wrap { background: rgba(139,92,246,0.15); color: #8b5cf6; }
  .action-card--quaternary .action-card__icon-wrap { background: rgba(16,185,129,0.15); color: #10b981; }

  .action-card__content { flex: 1; min-width: 0; }
  .action-card__title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 2px; }
  .action-card__desc { font-size: 0.85rem; color: var(--color-text-muted); }

  .action-card__arrow {
    flex-shrink: 0; color: var(--color-text-muted);
    transition: all 0.2s ease;
  }
  .action-card:hover .action-card__arrow { color: var(--color-text-secondary); transform: translateX(4px); }
</style>