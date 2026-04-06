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
  <h2 class="section-title">
    <span class="section-title__text">Acciones rápidas</span>
    <span class="section-title__line"></span>
  </h2>
  <div class="actions__grid">
    {#each actions as action, i}
      <a href={action.href} class="action-card action-card--{action.gradient}" style="--i:{i}">
        <div class="action-card__shimmer"></div>
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
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 20px;
    color: var(--color-text-primary);
  }

  .section-title__text { white-space: nowrap; }

  .section-title__line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--color-accent, #6366F1) 0%, transparent 100%);
    opacity: 0.2;
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
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: var(--glass-bg, var(--color-bg-card));
    backdrop-filter: var(--glass-blur, blur(12px));
    -webkit-backdrop-filter: var(--glass-blur, blur(12px));
    border: 1px solid var(--glass-border, var(--color-border));
    border-radius: 20px;
    text-decoration: none;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-card, 0 2px 12px rgba(0,0,0,0.1));
    animation: cardIn 0.45s ease-out calc(var(--i) * 80ms) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Shimmer overlay on hover */
  .action-card__shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 60%);
    transform: translateX(-100%);
    transition: none;
    pointer-events: none;
  }

  .action-card:hover .action-card__shimmer {
    transform: translateX(100%);
    transition: transform 0.7s ease;
  }

  .action-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-border-hover);
    box-shadow: var(--shadow-elevated, 0 12px 40px rgba(0,0,0,0.25));
  }

  /* Icon wraps with subtle gradient bg */
  .action-card__icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .action-card:hover .action-card__icon-wrap {
    transform: scale(1.08);
  }

  .action-card--primary .action-card__icon-wrap {
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
    color: #818CF8;
    box-shadow: 0 0 0 0 rgba(99,102,241,0);
  }
  .action-card--primary:hover .action-card__icon-wrap {
    box-shadow: 0 0 16px rgba(99,102,241,0.2);
  }

  .action-card--secondary .action-card__icon-wrap {
    background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1));
    color: #60a5fa;
  }
  .action-card--secondary:hover .action-card__icon-wrap {
    box-shadow: 0 0 16px rgba(59,130,246,0.2);
  }

  .action-card--tertiary .action-card__icon-wrap {
    background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1));
    color: #a78bfa;
  }
  .action-card--tertiary:hover .action-card__icon-wrap {
    box-shadow: 0 0 16px rgba(139,92,246,0.2);
  }

  .action-card--quaternary .action-card__icon-wrap {
    background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.1));
    color: #34d399;
  }
  .action-card--quaternary:hover .action-card__icon-wrap {
    box-shadow: 0 0 16px rgba(16,185,129,0.2);
  }

  .action-card__content { flex: 1; min-width: 0; position: relative; z-index: 1; }

  .action-card__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: 2px;
  }

  .action-card__desc {
    font-size: 0.82rem;
    color: var(--color-text-muted);
  }

  .action-card__arrow {
    flex-shrink: 0;
    color: var(--color-text-muted);
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }

  .action-card:hover .action-card__arrow {
    color: var(--color-accent, #6366F1);
    transform: translateX(5px);
  }

  @media (prefers-reduced-motion: reduce) {
    .action-card { animation: none; }
    .action-card:hover { transform: none; }
    .action-card:hover .action-card__icon-wrap { transform: none; }
    .action-card:hover .action-card__shimmer { transition: none; transform: translateX(-100%); }
  }
</style>