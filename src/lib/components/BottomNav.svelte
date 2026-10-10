<script>
 import { page } from '$app/stores';
 import { PRIMARY_NAV,navActive } from '$lib/product/navigation.js';
 import { Home,Cpu,Trophy,Wallet,User } from 'lucide-svelte';
 const icons={Home,Cpu,Trophy,Wallet,User};
</script>
<nav class="bottom" aria-label="Navegación móvil">{#each PRIMARY_NAV as item}<a href={item.href} class:active={navActive(item,$page.url.pathname)} aria-current={navActive(item,$page.url.pathname)?'page':undefined}><svelte:component this={icons[item.icon]} size={20}/><span>{item.label}</span></a>{/each}</nav>
<style>.bottom{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--nio-chrome);border-top:1px solid var(--nio-border);padding:8px 4px max(8px,env(safe-area-inset-bottom));grid-template-columns:repeat(5,minmax(0,1fr))}.bottom a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:7px 0;text-decoration:none;color:var(--nio-muted);font-size:10px;border-radius:10px}.bottom a.active{color:var(--nio-ink);background:var(--nio-selection);box-shadow:inset 0 -2px var(--nio-gold)}.bottom a:focus-visible{outline:2px solid var(--nio-gold)}@media(max-width:768px){.bottom{display:grid}}</style>
