<script>
  export let data = []; // [{ label, value, total }]
  export let height = 180;

  const pad = { top: 10, right: 20, bottom: 30, left: 20 };
  const barWidth = 48;
  const gap = 24;

  $: totalWidth = data.length * (barWidth + gap) - gap + pad.left + pad.right;
  $: maxVal = Math.max(100, ...data.map(d => d.value || 0));
  $: barH = height - pad.top - pad.bottom;

  function barHeight(val) {
    return (val / maxVal) * barH;
  }

  function barColor(val) {
    if (val >= 55) return '#10B981';
    if (val >= 52) return '#6366F1';
    return '#EF4444';
  }
</script>

<div class="chart-container">
  {#if data.length > 0}
    <svg viewBox="0 0 {totalWidth} {height}" class="chart-svg">
      <!-- Breakeven line at 52.4% -->
      <line
        x1={pad.left} x2={totalWidth - pad.right}
        y1={pad.top + barH - barHeight(52.4)} y2={pad.top + barH - barHeight(52.4)}
        stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="4,4"
      />
      <text
        x={totalWidth - pad.right + 4}
        y={pad.top + barH - barHeight(52.4) + 3}
        class="axis-label">BE</text>

      {#each data as item, i}
        {@const x = pad.left + i * (barWidth + gap)}
        {@const bh = barHeight(item.value)}
        {@const y = pad.top + barH - bh}

        <!-- Bar -->
        <rect
          {x} {y} width={barWidth} height={bh}
          rx="4" ry="4"
          fill={barColor(item.value)}
          opacity="0.85"
        />

        <!-- Value label -->
        <text
          x={x + barWidth / 2} y={y - 6}
          text-anchor="middle" class="value-label"
          fill={barColor(item.value)}
        >{item.value.toFixed(1)}%</text>

        <!-- Count label -->
        <text
          x={x + barWidth / 2} y={y + bh / 2 + 4}
          text-anchor="middle" class="count-label"
        >{item.total || ''}</text>

        <!-- Bottom label -->
        <text
          x={x + barWidth / 2} y={height - 6}
          text-anchor="middle" class="bar-label"
        >{item.label}</text>
      {/each}
    </svg>
  {:else}
    <div class="chart-empty">Sin datos</div>
  {/if}
</div>

<style>
  .chart-container { width: 100%; overflow-x: auto; }
  .chart-svg { height: auto; display: block; min-width: 200px; }
  .value-label { font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 700; }
  .count-label { font-size: 10px; fill: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace; }
  .bar-label { font-size: 11px; fill: rgba(255,255,255,0.5); font-weight: 600; }
  .axis-label { font-size: 9px; fill: rgba(255,255,255,0.3); font-family: 'DM Mono', monospace; }
  .chart-empty {
    height: 180px; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.3); font-size: 0.85rem;
  }
</style>