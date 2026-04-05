<script>
  export let data = []; // [{ predicted, actual, count }]
  export let width = 300;
  export let height = 300;

  const pad = { top: 20, right: 20, bottom: 35, left: 45 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  $: sx = (v) => pad.left + v * w;
  $: sy = (v) => pad.top + h - v * h;

  $: maxCount = data.length ? Math.max(...data.map(d => d.count)) : 1;
</script>

<div class="chart-container">
  {#if data.length > 0}
    <svg viewBox="0 0 {width} {height}" class="chart-svg">
      <!-- Grid -->
      {#each [0.2, 0.4, 0.6, 0.8] as v}
        <line x1={sx(v)} x2={sx(v)} y1={pad.top} y2={pad.top + h} stroke="rgba(255,255,255,0.04)" />
        <line x1={pad.left} x2={pad.left + w} y1={sy(v)} y2={sy(v)} stroke="rgba(255,255,255,0.04)" />
      {/each}

      <!-- Perfect calibration diagonal -->
      <line
        x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)}
        stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,4"
      />

      <!-- Confidence band ±5% -->
      <polygon
        points="{sx(0)},{sy(0.05)} {sx(0.95)},{sy(1)} {sx(1)},{sy(0.95)} {sx(0.05)},{sy(0)}"
        fill="rgba(99,102,241,0.05)"
      />

      <!-- Data points -->
      {#each data as d}
        {@const r = 3 + (d.count / maxCount) * 5}
        <circle
          cx={sx(d.predicted)} cy={sy(d.actual)}
          r={r}
          fill={Math.abs(d.predicted - d.actual) < 0.05 ? '#10B981' : '#F59E0B'}
          opacity="0.7"
          stroke="rgba(255,255,255,0.2)" stroke-width="0.5"
        />
      {/each}

      <!-- Axis labels -->
      <text x={pad.left + w / 2} y={height - 4} text-anchor="middle" class="axis-title">Predicted</text>
      <text x={12} y={pad.top + h / 2} text-anchor="middle" class="axis-title" transform="rotate(-90, 12, {pad.top + h / 2})">Actual</text>

      {#each [0, 0.5, 1] as v}
        <text x={sx(v)} y={height - 18} text-anchor="middle" class="axis-label">{v.toFixed(1)}</text>
        <text x={pad.left - 8} y={sy(v) + 4} text-anchor="end" class="axis-label">{v.toFixed(1)}</text>
      {/each}
    </svg>
  {:else}
    <div class="chart-empty">Calibración disponible con 50+ picks</div>
  {/if}
</div>

<style>
  .chart-container { width: 100%; }
  .chart-svg { width: 100%; height: auto; display: block; max-width: 300px; }
  .axis-label { font-size: 10px; fill: rgba(255,255,255,0.4); font-family: 'DM Mono', monospace; }
  .axis-title { font-size: 11px; fill: rgba(255,255,255,0.5); font-weight: 600; }
  .chart-empty {
    height: 200px; display: flex; align-items: center; justify-content: center;
    color: var(--color-text-muted); font-size: 0.85rem;
  }
</style>