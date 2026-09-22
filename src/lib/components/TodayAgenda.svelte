<script>
 import { onMount,onDestroy } from 'svelte';
 import { userId } from '$lib/stores/auth.js';
 import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
 import { nbaCalendarUrl,nbaCalendarRows } from '$lib/product/calendar.js';
 let mounted=false,signature=undefined,items=[],loading=true,controller,generation=0;
 onMount(()=>{mounted=true;});onDestroy(()=>{generation++;controller?.abort();});
 $: if(mounted&&signature!==$userId){signature=$userId;load();}
 async function load(){
  const run=++generation;controller?.abort();controller=new AbortController();loading=true;items=[];
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
  const requests=[{name:'NBA',href:'/sports/nba',request:()=>fetch(nbaCalendarUrl(),{signal}),count:b=>b.data?.length,zone:'Nueva York'},
   {name:'Tenis',href:'/tennis',request:()=>authenticatedFetch('/api/tennis?tz=America%2FGuayaquil',{signal}),count:b=>b.matches?.length,zone:'Guayaquil'}];
  const rows=await Promise.all(requests.map(async source=>{try{const response=await source.request();const body=await response.json();const count=source.name==="NBA"?nbaCalendarRows(response,body).length:source.count(body);if(!response.ok||response.headers.get('X-Data-Source')?.startsWith('mock')||!Number.isInteger(count))throw new Error();return {...source,count,state:body.stale?'Última actualización antigua':'En la cobertura recibida'};}catch{return {...source,count:null,state:source.name==='Tenis'&&!$userId?'Inicia sesión para consultar datos reales':'Fuente no disponible en este momento'};}}));
  if(run===generation){items=rows;loading=false;}
 }
</script>
<section class="agenda" aria-label="Agenda de hoy"><div class="agenda-head"><h2>Hoy en tu radar</h2><button on:click={load} disabled={loading}>{loading?'Consultando…':'Actualizar'}</button></div>{#if loading}<p role="status">Consultando las fuentes de los deportes…</p>{:else}<div class="agenda-items">{#each items as item}<a href={item.href}><strong>{item.name}</strong><span>{item.count===null?'Sin datos confirmados':`${item.count} partidos`}</span><small>{item.state} · Día local de {item.zone}</small><b aria-hidden="true">↗</b></a>{/each}</div>{/if}</section>
<style>.agenda{margin-bottom:28px;border-top:1px solid var(--line,var(--color-border,#283246));border-bottom:1px solid var(--line,var(--color-border,#283246));padding:18px 0}.agenda-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}h2{font-size:17px;margin:0}button{font-size:12px;color:var(--muted,var(--color-text-muted,#94a3b8));background:none;border:1px solid var(--line,var(--color-border,#283246));border-radius:8px;padding:7px 12px;cursor:pointer}.agenda-items{display:grid;grid-template-columns:1fr 1fr;gap:20px}a{display:grid;grid-template-columns:auto 1fr auto;gap:6px 18px;padding:18px;border:1px solid var(--line,var(--color-border));border-radius:10px;background:var(--surface,var(--color-bg-card));text-decoration:none;color:inherit}a>span{font-size:13px;color:var(--muted,var(--color-text-muted,#94a3b8))}small{grid-column:1/3;color:var(--muted,var(--color-text-muted,#94a3b8));font-size:12px}b{grid-column:3;grid-row:1/3;align-self:center;color:var(--accent,#a9d886)}p{font-size:13px;color:var(--muted,var(--color-text-muted,#94a3b8))}@media(max-width:650px){.agenda-items{grid-template-columns:1fr;gap:22px}}</style>
