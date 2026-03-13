<!-- src/lib/components/SkeletonCard.svelte -->
<!--
  Skeleton screens para estados de carga.
  
  El plan maestro dice:
  "Estados de carga con skeleton screens" — visualmente equivalen
  al layout final pero con bloques grises animados en lugar de datos.
  Esto elimina el "salto" visual cuando llegan los datos reales y
  comunica al usuario que algo está cargando (no que la app colgó).
  
  USO:
    <SkeletonCard />                    → card genérica (pick)
    <SkeletonCard type="game" />        → card de partido
    <SkeletonCard type="stat" />        → fila de estadística
    <SkeletonCard type="kpi" />         → bloque KPI numérico
    <SkeletonCard type="chart" />       → área de gráfico
    <SkeletonCard count={3} />          → 3 skeletons apilados
    <SkeletonCard type="game" count={4} /> → 4 skeletons de partido en grid
-->
<script>
  export let type  = 'pick';   // 'pick' | 'game' | 'stat' | 'kpi' | 'chart' | 'text'
  export let count = 1;        // cuántos skeletons renderizar
</script>

<div class="skeleton-group" class:skeleton-group--grid={type === 'game' || type === 'kpi'}>
  {#each Array(count) as _}

    {#if type === 'pick'}
      <!-- Simula un PickCard -->
      <div class="skeleton skeleton--pick" aria-hidden="true">
        <div class="sk-row">
          <div class="sk-block sk-block--title"></div>
          <div class="sk-block sk-block--badge"></div>
        </div>
        <div class="sk-block sk-block--subtitle"></div>
        <div class="sk-row sk-row--chips">
          <div class="sk-block sk-block--chip"></div>
          <div class="sk-block sk-block--chip"></div>
          <div class="sk-block sk-block--chip sk-block--chip-sm"></div>
        </div>
        <!-- Barra de confianza skeleton -->
        <div class="sk-block sk-block--bar"></div>
        <div class="sk-row sk-row--actions">
          <div class="sk-block sk-block--btn"></div>
          <div class="sk-block sk-block--btn sk-block--btn-sm"></div>
        </div>
      </div>

    {:else if type === 'game'}
      <!-- Simula una game-card -->
      <div class="skeleton skeleton--game" aria-hidden="true">
        <div class="sk-row">
          <div class="sk-block sk-block--team"></div>
          <div class="sk-block sk-block--vs"></div>
          <div class="sk-block sk-block--team"></div>
        </div>
        <div class="sk-block sk-block--time"></div>
      </div>

    {:else if type === 'stat'}
      <!-- Simula una fila de estadística -->
      <div class="skeleton skeleton--stat" aria-hidden="true">
        <div class="sk-block sk-block--label"></div>
        <div class="sk-row sk-row--stat">
          <div class="sk-block sk-block--bar sk-block--bar-full"></div>
          <div class="sk-block sk-block--num"></div>
        </div>
      </div>

    {:else if type === 'kpi'}
      <!-- Simula un bloque KPI -->
      <div class="skeleton skeleton--kpi" aria-hidden="true">
        <div class="sk-block sk-block--kpi-val"></div>
        <div class="sk-block sk-block--kpi-label"></div>
        <div class="sk-block sk-block--kpi-sub"></div>
      </div>

    {:else if type === 'chart'}
      <!-- Simula un área de gráfico -->
      <div class="skeleton skeleton--chart" aria-hidden="true">
        <div class="sk-block sk-block--chart-title"></div>
        <div class="sk-block sk-block--chart-area"></div>
      </div>

    {:else if type === 'text'}
      <!-- Simula párrafos de texto -->
      <div class="skeleton skeleton--text" aria-hidden="true">
        <div class="sk-block sk-block--line"></div>
        <div class="sk-block sk-block--line sk-block--line-short"></div>
        <div class="sk-block sk-block--line"></div>
        <div class="sk-block sk-block--line sk-block--line-med"></div>
      </div>
    {/if}

  {/each}
</div>

<!-- Screen reader announcement — solo visible para lectores de pantalla -->
<p class="sr-only" role="status" aria-live="polite">Cargando contenido...</p>

<style>
  /* Clase de solo lectura de pantalla (WCAG) */
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }

  /* Animación shimmer — la base de todos los skeletons */
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .skeleton-group--grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  /* Bloque skeleton base */
  .sk-block {
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 25%,
      rgba(255,255,255,0.09) 50%,
      rgba(255,255,255,0.04) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  /* Filas internas */
  .sk-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .sk-row--chips   { flex-wrap: wrap; }
  .sk-row--actions { justify-content: flex-end; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }
  .sk-row--stat    { align-items: center; gap: 8px; }

  /* ── PICK skeleton ──────────────────────────────────────────────── */
  .skeleton--pick {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 16px;
  }
  .sk-block--title    { height: 16px; flex: 1; }
  .sk-block--badge    { height: 24px; width: 60px; border-radius: 99px; flex-shrink: 0; }
  .sk-block--subtitle { height: 12px; width: 55%; margin-bottom: 10px; }
  .sk-block--chip     { height: 22px; width: 70px; border-radius: 99px; }
  .sk-block--chip-sm  { width: 45px; }
  .sk-block--bar      { height: 6px; width: 100%; border-radius: 4px; margin: 10px 0 8px; }
  .sk-block--btn      { height: 30px; width: 90px; border-radius: 8px; }
  .sk-block--btn-sm   { width: 36px; }

  /* ── GAME skeleton ──────────────────────────────────────────────── */
  .skeleton--game {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sk-block--team { height: 14px; flex: 1; }
  .sk-block--vs   { height: 10px; width: 16px; flex-shrink: 0; }
  .sk-block--time { height: 10px; width: 40%; }

  /* ── STAT skeleton ──────────────────────────────────────────────── */
  .skeleton--stat { padding: 4px 0; }
  .sk-block--label    { height: 11px; width: 40%; margin-bottom: 6px; }
  .sk-block--bar-full { height: 6px; flex: 1; border-radius: 4px; }
  .sk-block--num      { height: 14px; width: 36px; flex-shrink: 0; }

  /* ── KPI skeleton ───────────────────────────────────────────────── */
  .skeleton--kpi {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .sk-block--kpi-val   { height: 36px; width: 70%; border-radius: 8px; }
  .sk-block--kpi-label { height: 10px; width: 55%; }
  .sk-block--kpi-sub   { height: 9px; width: 40%; }

  /* ── CHART skeleton ─────────────────────────────────────────────── */
  .skeleton--chart {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 18px;
  }
  .sk-block--chart-title { height: 14px; width: 40%; margin-bottom: 14px; }
  .sk-block--chart-area  { height: 160px; border-radius: 8px; }

  /* ── TEXT skeleton ──────────────────────────────────────────────── */
  .skeleton--text { display: flex; flex-direction: column; gap: 8px; }
  .sk-block--line      { height: 13px; width: 100%; }
  .sk-block--line-short { width: 45%; }
  .sk-block--line-med   { width: 70%; }
</style>
