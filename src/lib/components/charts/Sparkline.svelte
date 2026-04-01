<script>
  export let data = []; // array of numbers
  export let color = '#6366F1';
  export let width = 96;
  export let height = 32;

  $: points = data.length > 1 ? data : [];
  $: minV = points.length ? Math.min(...points) : 0;
  $: maxV = points.length ? Math.max(...points) : 1;
  $: range = maxV - minV || 1;

  $: sx = (i) => (i / Math.max(points.length - 1, 1)) * width;
  $: sy = (v) => height - ((v - minV) / range) * (height - 4) - 2;

  $: linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  $: areaPath = linePath ? `${linePath} L${width},${height} L0,${height} Z` : '';

  $: lastVal = points.length ? points[points.length - 1] : 0;
  $: firstVal = points.length ? points[0] : 0;
  $: trending = lastVal >= firstVal;
  $: lineColor = color === 'auto' ? (trending ? '#10B981' : '#EF4444') : color;
</script>

{#if points.length > 1}
  <svg {width} {height} viewBox="0 0 {width} {height}" class="sparkline">
    <defs>
      <linearGradient id="sparkGrad-{$$props.class || 'default'}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={lineColor} stop-opacity="0.2" />
        <stop offset="100%" stop-color={lineColor} stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d={areaPath} fill="url(#sparkGrad-{$$props.class || 'default'})" />
    <path d={linePath} fill="none" stroke={lineColor} stroke-width="1.5" stroke-linejoin="round" />
  </svg>
{:else}
  <svg {width} {height}><text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="10">—</text></svg>
{/if}

<style>
  .sparkline { display: inline-block; vertical-align: middle; }
</style>