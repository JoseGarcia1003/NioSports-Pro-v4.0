<!-- src/lib/components/CourtBackground.svelte -->
<!-- Subtle animated basketball court lines in the background -->
<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let mounted = false;
  onMount(() => { mounted = true; });
</script>

{#if mounted}
<div class="court" aria-hidden="true">
  <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" class="court__svg">
    <!-- Half court line -->
    <line x1="600" y1="0" x2="600" y2="800" class="court__line" />
    
    <!-- Center circle -->
    <circle cx="600" cy="400" r="80" class="court__line" fill="none" />
    <circle cx="600" cy="400" r="8" class="court__dot" />
    
    <!-- Left three-point arc -->
    <path d="M 120 60 L 120 150 Q 120 400 340 400 Q 120 400 120 650 L 120 740" class="court__line" fill="none" />
    
    <!-- Right three-point arc -->
    <path d="M 1080 60 L 1080 150 Q 1080 400 860 400 Q 1080 400 1080 650 L 1080 740" class="court__line" fill="none" />
    
    <!-- Left key/paint -->
    <rect x="0" y="240" width="220" height="320" rx="0" class="court__line" fill="none" />
    <circle cx="220" cy="400" r="80" class="court__line" fill="none" />
    
    <!-- Right key/paint -->
    <rect x="980" y="240" width="220" height="320" rx="0" class="court__line" fill="none" />
    <circle cx="980" cy="400" r="80" class="court__line" fill="none" />
    
    <!-- Left basket area -->
    <circle cx="60" cy="400" r="12" class="court__accent" fill="none" />
    <line x1="40" y1="380" x2="40" y2="420" class="court__accent" />
    
    <!-- Right basket area -->
    <circle cx="1140" cy="400" r="12" class="court__accent" fill="none" />
    <line x1="1160" y1="380" x2="1160" y2="420" class="court__accent" />
    
    <!-- Court border -->
    <rect x="2" y="2" width="1196" height="796" rx="4" class="court__border" fill="none" />
    
    <!-- Floating particles -->
    <circle cx="200" cy="200" r="2" class="court__particle p1" />
    <circle cx="800" cy="150" r="1.5" class="court__particle p2" />
    <circle cx="400" cy="600" r="2" class="court__particle p3" />
    <circle cx="1000" cy="500" r="1.5" class="court__particle p4" />
    <circle cx="600" cy="100" r="2" class="court__particle p5" />
    <circle cx="300" cy="400" r="1" class="court__particle p6" />
    <circle cx="900" cy="300" r="1.5" class="court__particle p7" />
    <circle cx="150" cy="700" r="2" class="court__particle p8" />
  </svg>
</div>
{/if}

<style>
  .court {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    opacity: 0;
    animation: courtFadeIn 2s ease-out 0.5s forwards;
  }

  @keyframes courtFadeIn {
    to { opacity: 1; }
  }

  .court__svg {
    width: 100%;
    height: 100%;
    opacity: 0.035;
  }

  :global([data-theme="light"]) .court__svg {
    opacity: 0.025;
  }

  .court__line {
    stroke: var(--color-gold, #F59E0B);
    stroke-width: 1.5;
    stroke-dasharray: 8 4;
    animation: courtDash 30s linear infinite;
  }

  .court__border {
    stroke: var(--color-gold, #F59E0B);
    stroke-width: 2;
    stroke-dasharray: 12 6;
    animation: courtDash 40s linear infinite;
  }

  .court__accent {
    stroke: var(--color-accent, #6366F1);
    stroke-width: 2;
    animation: courtPulse 4s ease-in-out infinite;
  }

  .court__dot {
    fill: var(--color-gold, #F59E0B);
    animation: courtPulse 3s ease-in-out infinite;
  }

  .court__particle {
    fill: var(--color-gold, #F59E0B);
    opacity: 0.6;
  }

  .p1 { animation: float1 12s ease-in-out infinite; }
  .p2 { animation: float2 15s ease-in-out infinite; }
  .p3 { animation: float3 18s ease-in-out infinite; }
  .p4 { animation: float1 14s ease-in-out infinite reverse; }
  .p5 { animation: float2 16s ease-in-out infinite reverse; }
  .p6 { animation: float3 20s ease-in-out infinite; }
  .p7 { animation: float1 13s ease-in-out infinite; }
  .p8 { animation: float2 17s ease-in-out infinite reverse; }

  @keyframes courtDash {
    to { stroke-dashoffset: -100; }
  }

  @keyframes courtPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @keyframes float1 {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(30px, -20px); }
    50% { transform: translate(-15px, 25px); }
    75% { transform: translate(20px, 10px); }
  }

  @keyframes float2 {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(-25px, 15px); }
    66% { transform: translate(20px, -30px); }
  }

  @keyframes float3 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(35px, -25px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .court__line, .court__border, .court__accent, .court__dot,
    .p1, .p2, .p3, .p4, .p5, .p6, .p7, .p8 {
      animation: none !important;
    }
    .court { animation: none; opacity: 0.03; }
  }
</style>