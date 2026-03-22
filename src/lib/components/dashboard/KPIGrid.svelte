<script>
  export let kpiData = [];
</script>

<section class="kpis">
  {#each kpiData as kpi}
    <div class="kpi-card kpi-card--{kpi.color}" class:kpi-card--empty={kpi.empty}>
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
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    opacity: 0.8;
  }
  .kpi-card--emerald::before { background: linear-gradient(135deg, #10b981, #059669); }
  .kpi-card--amber::before { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .kpi-card--orange::before { background: linear-gradient(135deg, #f97316, #ea580c); }
  .kpi-card--purple::before { background: linear-gradient(135deg, #6366F1, #4F46E5); }

  .kpi-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  }
  .kpi-card--empty { opacity: 0.6; }

  .kpi-card__content { flex: 1; min-width: 0; }
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
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
  .kpi-card__trend { flex-shrink: 0; }
  .kpi-card__trend-value {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(99,102,241,0.15);
    color: #6366F1;
  }
</style>