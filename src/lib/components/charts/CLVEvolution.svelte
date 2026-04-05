<script>
  export let data = []; // [{ index, clv }]
  export let width = 600;
  export let height = 180;

  const pad = { top: 15, right: 20, bottom: 25, left: 45 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  $: points = data.length > 1 ? data : [];
  $: allCLV = points.map(d => d.clv);
  $: minY = points.length ? Math.min(-2, ...allCLV) : -2;
  $: maxY = points.length ? Math.max(2, ...allCLV) : 2;
  $: rangeY = maxY - minY || 1;

  $: sx = (i) => pad.left + (i / Math.max(points.length - 1, 1)) * w;
  $: sy = (v) => pad.top + h - ((v - minY) / rangeY) * h;

  $: linePath = points.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(d.clv).toFixed(1)}`).join(' ');
  $: zeroY = sy(0);

  $: avgCLV = points.length ? (allCLV.reduce((a, b) => a + b, 0) / allCLV.length) : 0;
  $: isPositive = avgCLV >= 0;
</script>

<div class="chart-container">
  {#if points.length > 1}
    <svg viewBox="0 0 {width} {height}" class="chart-svg">
      <!-- Zero line -->
      <line
        x1={pad.left} x2={width - pad.right}
        y1={zeroY} y2={zeroY}
        stroke="rgba(255,255,255,0.15)" stroke-width="1"
      />

      <!-- Average CLV line -->
      <line
        x1={pad.left} x2={width - pad.right}
        y1={sy(avgCLV)} y2={sy(avgCLV)}
        stroke={isPositive ? '#10B981' : '#EF4444'} stroke-width="1" stroke-dasharray="4,4" opacity="0.6"
      />

      <!-- Data points as dots -->
      {#each points as d, i}
        <circle
          cx={sx(i)} cy={sy(d.clv)}
          r="3"
          fill={d.clv >= 0 ? '#10B981' : '#EF4444'}
          opacity="0.6"
        />
      {/each}

      <!-- Rolling average line -->
      <path d={linePath} fill="none" stroke={isPositive ? '#10B981' : '#EF4444'} stroke-width="2" stroke-linejoin="round" opacity="0.8" />

      <!-- Labels -->
      <text x={pad.left - 8} y={pad.top + 4} text-anchor="end" class="axis-label">{maxY.toFixed(1)}</text>
      <text x={pad.left - 8} y={zeroY + 4} text-anchor="end" class="axis-label">0</text>
      <text x={pad.left - 8} y={pad.top + h + 4} text-anchor="end" class="axis-label">{minY.toFixed(1)}</text>

      <!-- Average label -->
      <text x={width - pad.right + 4} y={sy(avgCLV) - 6} class="avg-label" fill={isPositive ? '#10B981' : '#EF4444'}>
        avg: {avgCLV >= 0 ? '+' : ''}{avgCLV.toFixed(2)}
      </text>
    </svg>
  {:else}
    <div class="chart-empty">CLV se calculará con picks resueltos</div>
  {/if}
</div>

<style>
  .chart-container { width: 100%; }
  .chart-svg { width: 100%; height: auto; display: block; }
  .axis-label { font-size: 10px; fill: rgba(255,255,255,0.4); font-family: 'DM Mono', monospace; }
  .avg-label { font-size: 10px; font-family: 'DM Mono', monospace; font-weight: 700; }
  .chart-empty {
    height: 180px; display: flex; align-items: center; justify-content: center;
    color: var(--color-text-muted); font-size: 0.85rem;
  }
</style>