<!-- src/lib/components/TeamSelector.svelte -->
<script>
  import { ChevronDown, Search, X } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';

  export let teams = [];
  export let value = '';
  export let placeholder = 'Seleccionar equipo...';
  export let disabled = [];
  export let accent = '#6366f1';

  let open = false;
  let search = '';
  let highlightIndex = -1;
  let dropdownEl;
  let inputEl;
  let containerEl;

  $: filtered = teams.filter(t => {
    if (search && !t.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  $: if (!open) { search = ''; highlightIndex = -1; }

  function toggle() {
    open = !open;
    if (open) {
      search = '';
      highlightIndex = -1;
      setTimeout(() => inputEl?.focus(), 10);
    }
  }

  function select(team) {
    if (disabled.includes(team)) return;
    value = team;
    open = false;
  }

  function clear(e) {
    e.stopPropagation();
    value = '';
    open = false;
  }

  function handleKeydown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open = true;
        setTimeout(() => inputEl?.focus(), 10);
      }
      return;
    }
    if (e.key === 'Escape') { open = false; return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightIndex = Math.min(highlightIndex + 1, filtered.length - 1); scrollToHighlighted(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); highlightIndex = Math.max(highlightIndex - 1, 0); scrollToHighlighted(); }
    if (e.key === 'Enter' && highlightIndex >= 0 && filtered[highlightIndex]) { e.preventDefault(); select(filtered[highlightIndex]); }
  }

  function scrollToHighlighted() {
    if (!dropdownEl) return;
    const items = dropdownEl.querySelectorAll('.dd__item');
    if (items[highlightIndex]) items[highlightIndex].scrollIntoView({ block: 'nearest' });
  }

  function handleClickOutside(e) {
    if (containerEl && !containerEl.contains(e.target)) open = false;
  }

  onMount(() => { document.addEventListener('click', handleClickOutside, true); });
  onDestroy(() => { if (typeof document !== 'undefined') document.removeEventListener('click', handleClickOutside, true); });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="dd-container" bind:this={containerEl} on:keydown={handleKeydown} style="--accent: {accent}">
  <button class="dd__trigger" class:dd__trigger--open={open} class:dd__trigger--selected={!!value} on:click={toggle} type="button">
    {#if value}
      <span class="dd__selected-text">{value}</span>
      <button class="dd__clear" on:click={clear} type="button" aria-label="Limpiar selección"><X size={14} /></button>
    {:else}
      <span class="dd__placeholder">{placeholder}</span>
    {/if}
    <ChevronDown size={16} class="dd__chevron {open ? 'dd__chevron--open' : ''}" />
  </button>

  {#if open}
    <div class="dd__dropdown" bind:this={dropdownEl}>
      <div class="dd__search-wrap">
        <Search size={14} />
        <input bind:this={inputEl} class="dd__search" type="text" bind:value={search} placeholder="Buscar equipo..." autocomplete="off" />
      </div>
      <div class="dd__list">
        {#if filtered.length === 0}
          <div class="dd__empty">Sin resultados</div>
        {:else}
          {#each filtered as team, i}
            {@const isDisabled = disabled.includes(team)}
            {@const isSelected = team === value}
            {@const isHighlighted = i === highlightIndex}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="dd__item" class:dd__item--disabled={isDisabled} class:dd__item--selected={isSelected} class:dd__item--highlighted={isHighlighted} on:click={() => select(team)} role="option" aria-selected={isSelected} aria-disabled={isDisabled}>
              <span class="dd__item-name">{team}</span>
              {#if isSelected}<span class="dd__item-check">✓</span>{/if}
              {#if isDisabled}<span class="dd__item-tag">Ya seleccionado</span>{/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .dd-container { position: relative; width: 100%; }

  .dd__trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 10px; padding: 11px 14px; color: var(--color-text-muted); font-size: 0.9rem; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: left; min-height: 44px; }
  .dd__trigger:hover { border-color: var(--color-border-hover); }
  .dd__trigger--open { border-color: var(--accent); }
  .dd__trigger--selected { color: var(--color-text-primary); }
  .dd__selected-text { font-weight: 600; flex: 1; }
  .dd__placeholder { flex: 1; }

  .dd__clear { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; border: none; background: var(--color-bg-card); color: var(--color-text-muted); cursor: pointer; transition: background 0.15s; padding: 0; min-height: auto; }
  .dd__clear:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

  :global(.dd__chevron) { color: var(--color-text-muted); transition: transform 0.2s ease; flex-shrink: 0; }
  :global(.dd__chevron--open) { transform: rotate(180deg); }

  .dd__dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--color-bg, #fff); border: 1px solid var(--color-border-hover); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.1); z-index: 100; overflow: hidden; animation: dropIn 0.15s ease-out; }
  @keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

  .dd__search-wrap { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); }
  .dd__search { flex: 1; background: none; border: none; color: var(--color-text-primary); font-size: 0.85rem; outline: none; padding: 0; min-height: auto; }
  .dd__search::placeholder { color: var(--color-text-muted); }

  .dd__list { max-height: 240px; overflow-y: auto; padding: 6px; scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
  .dd__list::-webkit-scrollbar { width: 4px; }
  .dd__list::-webkit-scrollbar-track { background: transparent; }
  .dd__list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }

  .dd__item { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; color: var(--color-text-secondary); transition: background 0.1s, color 0.1s; min-height: auto; }
  .dd__item:hover:not(.dd__item--disabled) { background: rgba(99, 102, 241, 0.1); color: var(--color-text-primary); }
  .dd__item--highlighted:not(.dd__item--disabled) { background: rgba(99, 102, 241, 0.15); color: var(--color-text-primary); }
  .dd__item--selected { background: rgba(99, 102, 241, 0.12); color: #6366f1; font-weight: 600; }
  .dd__item--disabled { opacity: 0.3; cursor: not-allowed; }
  .dd__item-name { flex: 1; }
  .dd__item-check { color: var(--accent); font-weight: 700; font-size: 0.85rem; }
  .dd__item-tag { font-size: 0.68rem; color: var(--color-text-muted); font-style: italic; }
  .dd__empty { text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 0.85rem; }
</style>