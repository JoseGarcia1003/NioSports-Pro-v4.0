<script>
  export let data = []; // [{ date, profit }]
  export let width = 600;
  export let height = 200;

  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  $: points = data.length > 1 ? data : [];
  $: minY = points.length ? Math.min(0, ...points.map(d => d.profit)) : 0;
  $: maxY = points.length ? Math.max(0, ...points.map(d => d.profit)) : 100;
  $: rangeY = maxY - minY || 1;

  $: scaleX = (i) => pad.left + (i / Math.max(points.length - 1, 1)) * w;
  $: scaleY = (v) => pad.top + h - ((v - minY) / rangeY) * h;

  $: linePath = points.length > 1
    ? points.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(d.profit).toFixed(1)}`).join(' ')
    : '';

  $: areaPath = linePath
    ? `${linePath} L${scaleX(points.length - 1).toFixed(1)},${scaleY(0).toFixed(1)} L${scaleX(0).toFixed(1)},${scaleY(0).toFixed(1)} Z`
    : '';

  $: zeroY = scaleY(0);
  $: lastProfit = points.length ? points[points.length - 1].profit : 0;
  $: isPositive = lastProfit >= 0;
</script>

<div class="chart-container">
  {#if points.length > 1}
    <svg viewBox="0 0 {width} {height}" class="chart-svg">
      <defs>
        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={isPositive ? '#6366F1' : '#EF4444'} stop-opacity="0.3" />
          <stop offset="100%" stop-color={isPositive ? '#6366F1' : '#EF4444'} stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      {#each [0.25, 0.5, 0.75] as pct}
        <line
          x1={pad.left} x2={width - pad.right}
          y1={pad.top + h * pct} y2={pad.top + h * pct}
          stroke="rgba(255,255,255,0.04)" stroke-width="1"
        />
      {/each}

      <!-- Zero line -->
      <line
        x1={pad.left} x2={width - pad.right}
        y1={zeroY} y2={zeroY}
        stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="4,4"
      />

      <!-- Area fill -->
      <path d={areaPath} fill="url(#profitGrad)" />

      <!-- Line -->
      <path d={linePath} fill="none" stroke={isPositive ? '#6366F1' : '#EF4444'} stroke-width="2" stroke-linejoin="round" />

      <!-- End dot -->
      <circle
        cx={scaleX(points.length - 1)} cy={scaleY(lastProfit)}
        r="4" fill={isPositive ? '#6366F1' : '#EF4444'}
      />

      <!-- Y-axis labels -->
      <text x={pad.left - 8} y={pad.top + 4} text-anchor="end" class="axis-label">
        {maxY >= 1000 ? `${(maxY/1000).toFixed(1)}k` : maxY.toFixed(0)}
      </text>
      <text x={pad.left - 8} y={zeroY + 4} text-anchor="end" class="axis-label">0</text>
      <text x={pad.left - 8} y={pad.top + h + 4} text-anchor="end" class="axis-label">
        {minY >= -1000 ? minY.toFixed(0) : `${(minY/1000).toFixed(1)}k`}
      </text>
    </svg>
  {:else}
    <div class="chart-empty">Sin datos suficientes para graficar</div>
  {/if}
</div>

<style>
  .chart-container { width: 100%; }
  .chart-svg { width: 100%; height: auto; display: block; }
  .axis-label { font-size: 10px; fill: rgba(255,255,255,0.4); font-family: 'DM Mono', monospace; }
  .chart-empty {
    height: 200px; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.3); font-size: 0.85rem;
  }
</style>