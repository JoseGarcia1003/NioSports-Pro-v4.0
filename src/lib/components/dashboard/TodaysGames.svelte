<script>
  import Skeleton from '$lib/components/Skeleton.svelte';
  export let games = [];
  export let loading = true;
</script>

<section class="games">
  <div class="games__header">
    <h2 class="section-title">Partidos de hoy</h2>
    <a href="/totales" class="games__view-all">
      Ver análisis completo
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
  </div>

  {#if loading}
    <div class="games__grid">
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
    </div>
  {:else if games.length === 0}
    <div class="games__empty">
      <p>No hay partidos programados para hoy</p>
    </div>
  {:else}
    <div class="games__grid">
      {#each games as game (game.id)}
        <article class="game-card">
          <div class="game-card__header">
            <span class="game-card__time">{game.status || 'TBD'}</span>
            <span class="game-card__league">NBA</span>
          </div>
          <div class="game-card__teams">
            <div class="game-card__team">
              <div class="game-card__team-logo">{game.visitor_team.abbreviation?.charAt(0) || 'V'}</div>
              <span class="game-card__team-name">{game.visitor_team.full_name}</span>
            </div>
            <div class="game-card__vs"><span>VS</span></div>
            <div class="game-card__team game-card__team--home">
              <div class="game-card__team-logo">{game.home_team.abbreviation?.charAt(0) || 'H'}</div>
              <span class="game-card__team-name">{game.home_team.full_name}</span>
            </div>
          </div>
          <a href="/totales" class="game-card__cta">
            <span>Analizar partido</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .section-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text-primary); }
  .games { margin-bottom: 48px; }
  .games__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .games__view-all {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.9rem; font-weight: 600; color: #6366F1; text-decoration: none; transition: all 0.2s ease;
  }
  .games__view-all:hover { color: #4F46E5; }
  .games__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
  .games__empty {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 60px 20px; text-align: center; color: var(--color-text-muted);
    background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 20px;
  }

  .game-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px; padding: 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .game-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
  .game-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .game-card__time { font-size: 0.85rem; font-weight: 700; color: var(--color-text-muted); }
  .game-card__league { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; background: rgba(99,102,241,0.15); color: #6366F1; border-radius: 9999px; }
  .game-card__teams { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
  .game-card__team { display: flex; align-items: center; gap: 14px; }
  .game-card__team-logo {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 800; color: rgba(255,255,255,0.7);
  }
  .game-card__team--home .game-card__team-logo { background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1)); color: #818cf8; }
  .game-card__team-name { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.9); }
  .game-card__team--home .game-card__team-name { color: #818cf8; }
  .game-card__vs { display: flex; align-items: center; padding-left: 58px; }
  .game-card__vs span { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; }

  .game-card__cta {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05));
    border: 1px solid rgba(99,102,241,0.2); border-radius: 14px;
    font-size: 0.9rem; font-weight: 700; color: #6366F1; text-decoration: none; transition: all 0.2s ease;
  }
  .game-card__cta:hover { background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1)); border-color: rgba(99,102,241,0.4); }
</style>