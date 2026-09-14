<script>
 import { onMount, onDestroy } from 'svelte';
 import TodaysGames from '$lib/components/dashboard/TodaysGames.svelte';
 let games=[],loading=true,unavailable=false;const controller=new AbortController();
 import { nbaCalendarUrl,nbaCalendarRows } from '$lib/product/calendar.js';
 onMount(async()=>{try{const response=await fetch(nbaCalendarUrl(),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});const body=await response.json();games=nbaCalendarRows(response,body);}catch(e){if(e.name!=='AbortError')unavailable=true;}finally{loading=false;}}); onDestroy(()=>controller.abort());
</script>
<svelte:head><title>NBA · NioSports Pro</title></svelte:head>
<div class="product-page"><a class="product-link" href="/sports">← Todos los deportes</a><header class="product-heading"><div><span class="product-eyebrow">BALONCESTO / NBA</span><h1>El partido empieza en los datos.</h1><p>Calendario de hoy en Nueva York. Explora los encuentros y abre el análisis de totales para revisar los factores de cada equipo.</p></div><span class="product-badge">Deporte incluido en FREE</span></header><div class="product-grid"><a class="product-panel product-link" href="/totales"><h2>Análisis de totales ↗</h2><p>Equipos, línea y periodo del partido.</p></a><a class="product-panel product-link" href="/picks"><h2>Pronósticos NBA ↗</h2><p>Estimaciones disponibles y selecciones guardadas.</p></a></div><section class="product-section"><TodaysGames {games} {loading} {unavailable}/></section><p class="product-note">Sin información del proveedor no se muestran partidos inventados.</p></div>
