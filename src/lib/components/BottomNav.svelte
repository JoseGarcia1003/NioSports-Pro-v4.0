<script>
 import { page } from '$app/stores';
 import { PRIMARY_NAV,navActive } from '$lib/product/navigation.js';
 import { Home,Cpu,Trophy,Wallet,User } from 'lucide-svelte';
 const icons={Home,Cpu,Trophy,Wallet,User};
</script>
<nav class="bottom" aria-label="Navegación móvil">{#each PRIMARY_NAV as item}<a href={item.href} class:active={navActive(item,$page.url.pathname)} aria-current={navActive(item,$page.url.pathname)?'page':undefined}><svelte:component this={icons[item.icon]} size={20}/><span>{item.label}</span></a>{/each}</nav>
<style>.bottom{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--color-bg-base,#060912);border-top:1px solid var(--color-border,#283246);padding:8px 4px max(8px,env(safe-area-inset-bottom));grid-template-columns:repeat(5,minmax(0,1fr))}.bottom a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:7px 0;text-decoration:none;color:var(--color-text-muted,#94a3b8);font-size:10px;border-radius:10px}.bottom a.active{color:#a9d886;background:#a9d88612}.bottom a:focus-visible{outline:2px solid #a9d886}@media(max-width:768px){.bottom{display:grid}}:global([data-theme="light"]) .bottom a.active{color:#315f28;background:#e7f0e2}</style>
