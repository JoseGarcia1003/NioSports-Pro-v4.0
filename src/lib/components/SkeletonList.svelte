<!-- src/lib/components/SkeletonList.svelte -->
<!-- Lista de skeletons para estados de carga -->
<script>
  import Skeleton from './Skeleton.svelte';

  /** Tipo de skeleton a repetir */
  export let variant = 'pick';
  
  /** Cantidad de items */
  export let count = 3;
  
  /** Gap entre items */
  export let gap = '12px';
  
  /** Dirección del layout */
  export let direction = 'column'; // column | row
  
  /** Mostrar con animación escalonada */
  export let stagger = true;
</script>

<div 
  class="skeleton-list"
  class:skeleton-list--row={direction === 'row'}
  style="--gap: {gap};"
  role="status"
  aria-label="Cargando contenido..."
>
  {#each Array(count) as _, i}
    <div 
      class="skeleton-list__item"
      style={stagger ? `animation-delay: ${i * 0.08}s` : ''}
    >
      <Skeleton {variant} />
    </div>
  {/each}
</div>

<style>
  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: var(--gap, 12px);
  }

  .skeleton-list--row {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .skeleton-list__item {
    animation: fadeIn 0.3s ease-out both;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-list__item {
      animation: none;
    }
  }
</style>