<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let value = 0;
  export let duration = 600;
  export let decimals = 0;
  export let prefix = '';
  export let suffix = '';

  let displayed = 0;
  let mounted = false;

  onMount(() => { mounted = true; });

  $: if (mounted && browser) {
    animateTo(value);
  }

  function animateTo(target) {
    const start = displayed;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) { displayed = target; return; }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { displayed = target; return; }

    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      displayed = start + diff * eased;
      if (progress < 1) requestAnimationFrame(tick);
      else displayed = target;
    }
    requestAnimationFrame(tick);
  }
</script>

<span class="anim-num">{prefix}{displayed.toFixed(decimals)}{suffix}</span>

<style>
  .anim-num { font-variant-numeric: tabular-nums; }
</style>