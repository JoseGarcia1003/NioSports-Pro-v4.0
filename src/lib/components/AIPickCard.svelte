<!-- src/lib/components/AIPickCard.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let pick;
  export let showGameInfo = true;
  
  const dispatch = createEventDispatcher();
  
  function handleSave() {
    dispatch('save', pick);
  }
  
  // Colores según confianza
  function getConfidenceStyle(confidence) {
    const styles = {
      HIGH: { bg: 'rgba(52,211,153,.15)', border: 'rgba(52,211,153,.4)', color: '#34d399', label: '🔥 Alta' },
      MEDIUM: { bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.4)', color: '#fbbf24', label: '⚡ Media' },
      LOW: { bg: 'rgba(156,163,175,.15)', border: 'rgba(156,163,175,.4)', color: '#9ca3af', label: '📊 Baja' }
    };
    return styles[confidence] || styles.LOW;
  }
  
  // Estilo del badge de período
  function getPeriodStyle(period) {
    const styles = {
      Q1: { bg: 'rgba(96,165,250,.2)', color: '#60a5fa' },
      HALF: { bg: 'rgba(167,139,250,.2)', color: '#a78bfa' },
      FULL: { bg: 'rgba(251,146,60,.2)', color: '#fb923c' },
    };
    return styles[period] || styles.FULL;
  }
  
  $: conf = getConfidenceStyle(pick.confidence);
  $: periodStyle = getPeriodStyle(pick.period);
  $: isPositiveEV = (pick.evPercent || 0) > 0;
  $: isPositiveEdge = (pick.edge || 0) > 0;
</script>

<div class="ai-pick" class:ai-pick--featured={pick.isFeatured} class:ai-pick--top={pick.isTopPick}>
  {#if pick.isTopPick}
    <div class="top-badge">⭐ TOP PICK</div>
  {/if}
  
  <div class="ai-pick__header">
    {#if showGameInfo}
      <div class="game-info">
        <span class="team team--home">{pick.homeTeam}</span>
        <span class="vs">vs</span>
        <span class="team team--away">{pick.awayTeam}</span>
      </div>
    {/if}
    
    <div class="period-badge" style="background:{periodStyle.bg}; color:{periodStyle.color}">
      {pick.period}
    </div>
  </div>
  
  <div class="ai-pick__body">
    <div class="prediction">
      <div class="prediction__direction" class:over={pick.direction === 'OVER'} class:under={pick.direction === 'UNDER'}>
        {pick.direction}
      </div>
      <div class="prediction__line">{pick.line}</div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Proyección</span>
        <span class="stat-value">{pick.projection}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Edge</span>
        <span class="stat-value" class:positive={isPositiveEdge} class:negative={!isPositiveEdge}>
          {pick.edge > 0 ? '+' : ''}{pick.edge} pts
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Prob. Real</span>
        <span class="stat-value">{pick.probabilityPercent}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">EV</span>
        <span class="stat-value" class:positive={isPositiveEV} class:negative={!isPositiveEV}>
          {pick.evPercent > 0 ? '+' : ''}{pick.evPercent}%
        </span>
      </div>
    </div>
  </div>
  
  <div class="ai-pick__footer">
    <div class="confidence-badge" style="background:{conf.bg}; border-color:{conf.border}; color:{conf.color}">
      {conf.label}
    </div>
    
    <button class="save-btn" on:click={handleSave}>
      + Guardar Pick
    </button>
  </div>
  
  {#if pick.isDemo}
    <div class="demo-tag">Demo</div>
  {/if}
</div>

<style>
  .ai-pick {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 16px;
    position: relative;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  
  .ai-pick:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  
  .ai-pick--featured {
    border-color: rgba(251,191,36,.3);
    background: linear-gradient(135deg, rgba(251,191,36,.05), transparent);
  }
  
  .ai-pick--top {
    border-color: rgba(251,191,36,.5);
    background: linear-gradient(135deg, rgba(251,191,36,.1), rgba(52,211,153,.05));
  }
  
  .top-badge {
    position: absolute;
    top: -10px;
    left: 16px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }
  
  .ai-pick__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  
  .game-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  
  .team {
    font-weight: 700;
  }
  
  .team--home {
    color: #60a5fa;
  }
  
  .team--away {
    color: #fb923c;
  }
  
  .vs {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }
  
  .period-badge {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }
  
  .ai-pick__body {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 14px;
  }
  
  .prediction {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 90px;
  }
  
  .prediction__direction {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: 0.05em;
  }
  
  .prediction__direction.over {
    color: #34d399;
  }
  
  .prediction__direction.under {
    color: #f87171;
  }
  
  .prediction__line {
    font-size: 1.8rem;
    font-weight: 900;
    color: #fff;
    line-height: 1;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    flex: 1;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    background: rgba(255,255,255,.03);
    border-radius: 8px;
  }
  
  .stat-label {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-value {
    font-size: 0.9rem;
    font-weight: 700;
  }
  
  .stat-value.positive {
    color: #34d399;
  }
  
  .stat-value.negative {
    color: #f87171;
  }
  
  .ai-pick__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
  
  .confidence-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid;
  }
  
  .save-btn {
    background: rgba(251,191,36,.15);
    color: #fbbf24;
    border: 1px solid rgba(251,191,36,.3);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .save-btn:hover {
    background: rgba(251,191,36,.25);
    transform: scale(1.02);
  }
  
  .save-btn:active {
    transform: scale(0.98);
  }
  
  .demo-tag {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.6rem;
    color: var(--color-text-muted);
    background: rgba(255,255,255,.05);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  @media (max-width: 500px) {
    .ai-pick__body {
      flex-direction: column;
    }
    
    .stats-grid {
      width: 100%;
    }
  }
</style>