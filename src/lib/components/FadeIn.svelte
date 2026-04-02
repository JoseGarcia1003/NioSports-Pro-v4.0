<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let delay = 0;
  export let duration = 400;
  export let y = 12;

  let visible = false;
  let el;

  onMount(() => {
    if (!browser) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { visible = true; return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => { visible = true; }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (el) observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={el}
  class="fade-in"
  class:visible
  style="--fade-duration: {duration}ms; --fade-y: {y}px;"
>
  <slot />
</div>

<style>
  .fade-in {
    opacity: 0;
    transform: translateY(var(--fade-y));
    transition: opacity var(--fade-duration) ease-out, transform var(--fade-duration) ease-out;
  }
  .fade-in.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .fade-in { opacity: 1; transform: none; transition: none; }
  }
</style>