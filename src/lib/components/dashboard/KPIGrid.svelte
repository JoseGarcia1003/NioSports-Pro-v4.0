<script>
  export let kpiData = [];
</script>

<section class="kpis">
  {#each kpiData as kpi, i}
    <div class="kpi-card kpi-card--{kpi.color}" class:kpi-card--empty={kpi.empty} style="--i:{i}">
      <div class="kpi-card__glow"></div>
      <div class="kpi-card__content">
        <span class="kpi-card__value">{kpi.value}</span>
        <span class="kpi-card__label">{kpi.label}</span>
      </div>
      <div class="kpi-card__trend">
        <span class="kpi-card__trend-value">{kpi.trend}</span>
      </div>
    </div>
  {/each}
</section>

<style>
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 48px;
  }
  @media (max-width: 1024px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 540px) { .kpis { grid-template-columns: 1fr 1fr; gap: 12px; } }

  .kpi-card {
    background: var(--glass-bg, var(--color-bg-card));
    backdrop-filter: var(--glass-blur, blur(12px));
    -webkit-backdrop-filter: var(--glass-blur, blur(12px));
    border: 1px solid var(--glass-border, var(--color-border));
    border-radius: 20px;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-card, 0 2px 12px rgba(0,0,0,0.1));
    animation: kpiIn 0.5s ease-out calc(var(--i) * 100ms) both;
  }

  @keyframes kpiIn {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Top gradient bar */
  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    opacity: 0.85;
    transition: height 0.3s ease;
  }
  .kpi-card--emerald::before { background: linear-gradient(135deg, #10b981, #34d399); }
  .kpi-card--amber::before { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
  .kpi-card--orange::before { background: linear-gradient(135deg, #f97316, #fb923c); }
  .kpi-card--purple::before { background: linear-gradient(135deg, #6366F1, #a78bfa); }

  /* Corner glow on hover */
  .kpi-card__glow {
    position: absolute;
    top: -50px; right: -50px;
    width: 120px; height: 120px;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
    filter: blur(10px);
  }
  .kpi-card--emerald .kpi-card__glow { background: radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%); }
  .kpi-card--amber .kpi-card__glow { background: radial-gradient(circle, rgba(245,158,11,0.3), transparent 70%); }
  .kpi-card--orange .kpi-card__glow { background: radial-gradient(circle, rgba(249,115,22,0.3), transparent 70%); }
  .kpi-card--purple .kpi-card__glow { background: radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%); }

  .kpi-card:hover {
    transform: translateY(-5px);
    border-color: var(--color-border-hover);
    box-shadow: var(--shadow-elevated, 0 12px 40px rgba(0,0,0,0.25));
  }
  .kpi-card:hover::before { height: 4px; }
  .kpi-card:hover .kpi-card__glow { opacity: 1; }

  .kpi-card--empty { opacity: 0.5; }

  .kpi-card__content { flex: 1; min-width: 0; position: relative; z-index: 1; }

  .kpi-card__value {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
  }

  .kpi-card__label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .kpi-card__trend { flex-shrink: 0; position: relative; z-index: 1; }

  .kpi-card__trend-value {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 9999px;
    background: var(--color-accent-glow, rgba(99,102,241,0.15));
    color: var(--color-accent, #6366F1);
  }

  @media (prefers-reduced-motion: reduce) {
    .kpi-card { animation: none; }
    .kpi-card:hover { transform: none; }
  }
</style>