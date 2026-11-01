<script>
 import { SPORTS } from '$lib/product/navigation.js';
 export let compact=false;
 // Sports without data are announced in one line instead of full cards, so the
 // directory never looks emptier than the product really is.
 const available=SPORTS.filter(s=>s.status==='available');
 const planned=SPORTS.filter(s=>s.status==='planned');
</script>
<div class="sports" class:compact>{#each available as sport}<article style={`--sport-color:${sport.color}`}><div class="sport-top"><span aria-hidden="true">{sport.symbol}</span><small>ACCESO FREE</small></div><h3>{sport.name}</h3><p>{sport.description}</p><a href={sport.href}>Explorar {sport.name} <span aria-hidden="true">↗</span></a></article>{/each}</div>
{#if planned.length && !compact}<p class="upcoming">En preparación: {planned.map(s=>s.name).join(' · ')}</p>{/if}
<style>.sports{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.upcoming{margin:14px 0 0;font-size:13px;color:var(--color-text-muted,#94a3b8)}.sports article{padding:24px 20px;border:1px solid var(--color-border,#283246);border-top:3px solid var(--sport-color);border-radius:14px;background:var(--color-bg-elevated,#101827);display:flex;flex-direction:column}.sport-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.sport-top>span{font-size:28px}.sport-top small{font-size:9px;letter-spacing:1px;color:var(--color-text-muted,#94a3b8)}h3{font-size:23px;margin:22px 0 8px}p{font-size:13px;line-height:1.7;color:var(--color-text-muted,#94a3b8);flex:1}a{display:flex;justify-content:space-between;align-items:center;color:var(--color-text-primary,#edf2fa);text-decoration:none;font-size:13px;font-weight:650;padding-top:18px;margin-top:10px;border-top:1px solid var(--color-border,#283246)}a:focus-visible{outline:2px solid var(--sport-color);outline-offset:6px}.compact p{display:none}@media(max-width:560px){.sports{grid-template-columns:1fr}}@media(max-width:400px){.sports{gap:10px}.sports article{padding:18px 12px}.sport-top{align-items:flex-start;flex-direction:column}h3{font-size:21px}}
</style>
