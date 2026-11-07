<script>
  import { page } from '$app/stores';
  import { afterUpdate } from 'svelte';
  import { NBA_NAV, nbaActive } from '$lib/product/navigation.js';
  // Same five sections on every NBA page; scrolls sideways on phones.
  $: path = $page?.url?.pathname ?? '';
  let list;
  // On phones the bar scrolls sideways: keep the current section in view.
  afterUpdate(() => {
    const active = list?.querySelector('a.active');
    if (active && list.scrollWidth > list.clientWidth) {
      const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, left) });
    }
  });
</script>

<nav class="subnav" aria-label="Secciones NBA">
  <span class="league">NBA</span>
  <ul bind:this={list}>
    {#each NBA_NAV as item}
      <li><a href={item.href} class:active={nbaActive(item, path)} aria-current={nbaActive(item, path) ? 'page' : undefined}>{item.label}</a></li>
    {/each}
  </ul>
</nav>

<style>
  .subnav { display: flex; align-items: center; gap: 14px; max-width: 1320px; margin: 0 auto; padding: 18px 24px 10px; }
  .league { font-family: var(--font-display); font-weight: 800; font-size: 20px; letter-spacing: .04em; color: var(--nio-accent); padding-right: 14px; border-right: 1px solid var(--nio-border); }
  ul { list-style: none; display: flex; gap: 4px; margin: 0; padding: 4px; border: 1px solid var(--nio-border); border-radius: 12px; background: var(--nio-surface); overflow-x: auto; scrollbar-width: none; }
  ul::-webkit-scrollbar { display: none; }
  a { display: inline-flex; align-items: center; min-height: var(--tap, 44px); padding: 0 14px; border-radius: 9px; color: var(--nio-muted); font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap; }
  a:hover { color: var(--nio-ink); }
  a.active { background: var(--nio-action); color: var(--nio-action-ink); }
  a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 640px) { .subnav { padding: 12px 16px 6px; gap: 10px; } .league { display: none; } ul { width: 100%; } }
  /* On phones the list scrolls sideways: soft edges show there is more. */
  @media (max-width: 640px) { ul { mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); } }
</style>
