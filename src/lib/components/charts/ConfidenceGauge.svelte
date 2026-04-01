<script>
  export let value = 0;  // 0-100
  export let size = 64;
  export let label = '';

  const r = 24;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r * 0.75; // 270 degrees

  $: pct = Math.min(100, Math.max(0, value));
  $: offset = circumference - (pct / 100) * circumference;
  $: color = pct >= 65 ? '#10B981' : pct >= 55 ? '#6366F1' : pct >= 45 ? '#F59E0B' : '#EF4444';
  $: confLabel = pct >= 65 ? 'HIGH' : pct >= 55 ? 'MED' : 'LOW';
</script>

<div class="gauge" style="width:{size}px; height:{size}px;">
  <svg viewBox="0 0 {size} {size}">
    <!-- Background arc -->
    <circle
      {cx} {cy} r={r}
      fill="none"
      stroke="rgba(255,255,255,0.06)"
      stroke-width="5"
      stroke-dasharray={circumference}
      stroke-linecap="round"
      transform="rotate(135, {cx}, {cy})"
    />
    <!-- Value arc -->
    <circle
      {cx} {cy} r={r}
      fill="none"
      stroke={color}
      stroke-width="5"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      stroke-linecap="round"
      transform="rotate(135, {cx}, {cy})"
    />
    <!-- Center text -->
    <text x={cx} y={cy - 2} text-anchor="middle" class="gauge-value" fill={color}>
      {pct.toFixed(0)}%
    </text>
    <text x={cx} y={cy + 10} text-anchor="middle" class="gauge-label">
      {label || confLabel}
    </text>
  </svg>
</div>

<style>
  .gauge { display: inline-block; }
  .gauge-value { font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 700; }
  .gauge-label { font-size: 8px; fill: rgba(255,255,255,0.4); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
</style>