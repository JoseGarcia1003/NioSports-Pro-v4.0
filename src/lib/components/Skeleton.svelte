<!-- src/lib/components/Skeleton.svelte -->
<!-- Componente reutilizable para estados de carga premium -->
<script>
  /** Variante del skeleton */
  export let variant = 'text'; // text | circle | card | pick | stat | button
  
  /** Ancho (CSS value) */
  export let width = '100%';
  
  /** Alto (CSS value) */
  export let height = null;
  
  /** Número de líneas (solo para variant="text") */
  export let lines = 1;
  
  /** Animación activa */
  export let animate = true;
  
  /** Clase adicional */
  let className = '';
  export { className as class };

  // Alturas predeterminadas por variante
  const defaultHeights = {
    text: '14px',
    circle: '40px',
    card: '120px',
    pick: '140px',
    stat: '80px',
    button: '40px',
    avatar: '48px',
    title: '28px',
    subtitle: '18px',
  };

  $: computedHeight = height || defaultHeights[variant] || '20px';
</script>

{#if variant === 'text' && lines > 1}
  <div class="skeleton-lines" style="--sk-width: {width};" class:animate>
    {#each Array(lines) as _, i}
      <div 
        class="skeleton skeleton--text {className}"
        class:animate
        style="
          --sk-height: {computedHeight};
          --sk-width: {i === lines - 1 ? '75%' : '100%'};
        "
        role="presentation"
        aria-hidden="true"
      ></div>
    {/each}
  </div>

{:else if variant === 'pick'}
  <article class="skeleton-pick {className}" class:animate role="presentation" aria-hidden="true">
    <div class="skeleton-pick__header">
      <div class="skeleton-pick__teams">
        <div class="skeleton skeleton--text" style="--sk-width: 70%; --sk-height: 18px;"></div>
        <div class="skeleton skeleton--text" style="--sk-width: 50%; --sk-height: 14px; margin-top: 8px;"></div>
      </div>
      <div class="skeleton skeleton--circle" style="--sk-size: 32px;"></div>
    </div>
    <div class="skeleton-pick__bar">
      <div class="skeleton skeleton--text" style="--sk-width: 100%; --sk-height: 6px; border-radius: 3px;"></div>
    </div>
    <div class="skeleton-pick__stats">
      <div class="skeleton skeleton--text" style="--sk-width: 60px; --sk-height: 12px;"></div>
      <div class="skeleton skeleton--text" style="--sk-width: 45px; --sk-height: 12px;"></div>
      <div class="skeleton skeleton--text" style="--sk-width: 55px; --sk-height: 12px;"></div>
    </div>
    <div class="skeleton-pick__actions">
      <div class="skeleton skeleton--button" style="--sk-width: 90px; --sk-height: 32px;"></div>
      <div class="skeleton skeleton--button" style="--sk-width: 32px; --sk-height: 32px;"></div>
    </div>
  </article>

{:else if variant === 'stat'}
  <div class="skeleton-stat {className}" class:animate role="presentation" aria-hidden="true">
    <div class="skeleton skeleton--text" style="--sk-width: 50px; --sk-height: 28px;"></div>
    <div class="skeleton skeleton--text" style="--sk-width: 40px; --sk-height: 10px; margin-top: 6px;"></div>
  </div>

{:else if variant === 'card'}
  <div class="skeleton-card {className}" class:animate role="presentation" aria-hidden="true">
    <div class="skeleton-card__header">
      <div class="skeleton skeleton--circle" style="--sk-size: 40px;"></div>
      <div class="skeleton-card__title">
        <div class="skeleton skeleton--text" style="--sk-width: 120px; --sk-height: 16px;"></div>
        <div class="skeleton skeleton--text" style="--sk-width: 80px; --sk-height: 12px; margin-top: 6px;"></div>
      </div>
    </div>
    <div class="skeleton-card__body">
      <div class="skeleton skeleton--text" style="--sk-width: 100%; --sk-height: 14px;"></div>
      <div class="skeleton skeleton--text" style="--sk-width: 90%; --sk-height: 14px; margin-top: 8px;"></div>
      <div class="skeleton skeleton--text" style="--sk-width: 75%; --sk-height: 14px; margin-top: 8px;"></div>
    </div>
  </div>

{:else if variant === 'circle' || variant === 'avatar'}
  <div 
    class="skeleton skeleton--circle {className}"
    class:animate
    style="--sk-size: {width};"
    role="presentation"
    aria-hidden="true"
  ></div>

{:else}
  <div 
    class="skeleton skeleton--{variant} {className}"
    class:animate
    style="--sk-width: {width}; --sk-height: {computedHeight};"
    role="presentation"
    aria-hidden="true"
  ></div>
{/if}

<style>
  /* Base skeleton */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-bg-card, rgba(255,255,255,0.04)) 0%,
      rgba(255,255,255,0.08) 50%,
      var(--color-bg-card, rgba(255,255,255,0.04)) 100%
    );
    background-size: 200% 100%;
    border-radius: var(--radius-md, 8px);
    width: var(--sk-width, 100%);
    height: var(--sk-height, 20px);
  }

  .skeleton.animate {
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Variantes base */
  .skeleton--text {
    border-radius: var(--radius-sm, 4px);
  }

  .skeleton--circle {
    width: var(--sk-size, 40px);
    height: var(--sk-size, 40px);
    border-radius: var(--radius-full, 9999px);
    flex-shrink: 0;
  }

  .skeleton--button {
    border-radius: var(--radius-md, 8px);
  }

  .skeleton--title {
    height: 28px;
    border-radius: var(--radius-sm, 4px);
  }

  /* Líneas múltiples */
  .skeleton-lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: var(--sk-width, 100%);
  }

  /* Skeleton Pick Card */
  .skeleton-pick {
    background: var(--color-bg-card, rgba(255,255,255,0.04));
    border: 1px solid var(--color-border, rgba(255,255,255,0.09));
    border-radius: var(--radius-xl, 14px);
    padding: 15px;
  }

  .skeleton-pick__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .skeleton-pick__teams {
    flex: 1;
  }

  .skeleton-pick__bar {
    margin: 12px 0;
  }

  .skeleton-pick__stats {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .skeleton-pick__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
  }

  /* Skeleton Stat */
  .skeleton-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg-card, rgba(255,255,255,0.04));
    border: 1px solid var(--color-border, rgba(255,255,255,0.09));
    border-radius: var(--radius-lg, 10px);
    padding: 12px 20px;
    min-width: 80px;
  }

  /* Skeleton Card */
  .skeleton-card {
    background: var(--color-bg-card, rgba(255,255,255,0.04));
    border: 1px solid var(--color-border, rgba(255,255,255,0.09));
    border-radius: var(--radius-xl, 14px);
    padding: 16px;
  }

  .skeleton-card__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .skeleton-card__title {
    flex: 1;
  }

  .skeleton-card__body {
    padding-top: 8px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton.animate,
    .skeleton-pick.animate .skeleton,
    .skeleton-stat.animate .skeleton,
    .skeleton-card.animate .skeleton {
      animation: none;
      background: var(--color-bg-card, rgba(255,255,255,0.06));
    }
  }
</style>