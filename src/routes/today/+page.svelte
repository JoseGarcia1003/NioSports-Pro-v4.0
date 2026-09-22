<script>
 import { subscription } from '$lib/stores/subscription.js';
 import { currentUser, isAuthenticated } from '$lib/stores/auth.js';
 import { planLabel } from '$lib/product/navigation.js';
 import TodayAgenda from '$lib/components/TodayAgenda.svelte';
 import SportDirectory from '$lib/components/SportDirectory.svelte';
 $: name=$currentUser?.displayName?.split(' ')[0];
 $: label=planLabel($subscription);
</script>
<svelte:head><title>Hoy · NioSports Pro</title></svelte:head>
<div class="product-page">
 <header class="product-heading"><div><span class="product-eyebrow">TU PUNTO DE PARTIDA</span><h1>{name?`Tu día deportivo, ${name}.`:'Tu día deportivo, en perspectiva.'}</h1><p>Encuentra un partido. Revisa los datos. Decide con contexto.</p></div><a class="product-badge" href="/account">{$isAuthenticated?label:'Explorando sin cuenta'} ↗</a></header>
 <TodayAgenda/>
 <div class="lead"><section class="product-panel reward"><span class="product-eyebrow">INCLUIDO EN FREE</span><h2>Tu análisis Premium del día.</h2><p>Un pronóstico Premium gratuito cada día, cuando haya uno disponible. Puedes empezar explorando los deportes y sus datos.</p><div class="product-actions"><a class="product-action" href="/predictions">Ver pronósticos disponibles ↗</a><a class="product-link" href="/sports">Explorar deportes</a></div><p class="product-note">Una selección fijada por fecha cuando hay una edición publicada. Su disponibilidad depende de los datos recibidos.</p></section><aside class="product-panel"><span class="product-eyebrow">EMPIEZA POR AQUÍ</span><h2>De la pista a los datos</h2><a class="product-row" href="/tennis"><span>Calendario de tenis<small>Hoy y mañana · masculino y femenino</small></span><span>↗</span></a><a class="product-row" href="/sports/nba"><span>Centro NBA<small>Partidos, contexto y análisis de totales</small></span><span>↗</span></a><a class="product-link" href="/tennis?demo=1">Probar tenis con datos de ejemplo</a></aside></div>
 <section class="product-section"><span class="product-eyebrow">ELIGE TU DEPORTE</span><h2>Una plataforma. Tu forma de analizar.</h2><SportDirectory/></section>
 <section class="product-section product-grid"><div><span class="product-eyebrow">TU SEGUIMIENTO</span><h2>Analiza también tus decisiones.</h2><p class="product-note">El bankroll tiene su propio espacio: capital, exposición y resultados. No necesitas mezclarlo con el calendario para encontrar tu próximo análisis.</p><a class="product-link" href="/bankroll">Abrir mi bankroll ↗</a><a class="product-link" href="/results">Consultar resultados</a></div><div class="quiet"><h3>Empieza gratis. Profundiza cuando lo necesites.</h3><p class="product-note">Todos los deportes disponibles se pueden explorar con FREE. Premium amplía los pronósticos y las herramientas de análisis.</p><a class="product-link" href="/pricing">Comparar lo que incluye cada plan ↗</a></div></section>
</div>
<style>.lead{display:grid;grid-template-columns:1.5fr 1fr;gap:22px}.reward{background:linear-gradient(125deg,#1a302b,#101e21);position:relative;overflow:hidden}.reward h2{font-size:clamp(28px,3vw,38px);max-width:450px;letter-spacing:-1px;margin-top:22px;color:#f0f5ef}.reward p{max-width:530px;color:#b3c2bd}.quiet{border-left:2px solid #a9d88650;padding:0 0 0 26px}.quiet h3{font-size:20px;margin-top:0}@media(max-width:850px){.lead{grid-template-columns:1fr}}
</style>
