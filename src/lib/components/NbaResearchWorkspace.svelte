<script>
  import Search from 'lucide-svelte/icons/search';
  import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
  import SlidersHorizontal from 'lucide-svelte/icons/sliders-horizontal';
  import Bookmark from 'lucide-svelte/icons/bookmark';
  import ChartNoAxesCombined from 'lucide-svelte/icons/chart-no-axes-combined';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import CalendarDays from 'lucide-svelte/icons/calendar-days';
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import NbaResearchChart from './NbaResearchChart.svelte';
  import { DEMO_MATCHES,RESEARCH_DEMO,filterResearch,researchSample,summarizeResearch } from '../nba/research-demo.js';
  import '../styles/research.css';
  let mode='demo',query='',count=10,venue='all',sort='mean',onlySaved=false,saved=[],selectedId=DEMO_MATCHES[0].id;
  let customLine=null,showFilters=false,lineContext=null;
  $: matches=filterResearch(mode==='demo'?DEMO_MATCHES:[],{query,count,venue,sort,onlySaved,saved});
  $: selected=matches.find(m=>m.id===selectedId)||matches[0]||null;
  $: if((selected?.id??null)!==lineContext){lineContext=selected?.id??null;customLine=null;}
  $: rows=selected?researchSample(selected.history,count,venue):[];
  $: line=customLine??selected?.line??227.5;
  $: summary=summarizeResearch(rows,line);
  const number=n=>n===null?'—':n.toLocaleString('es',{maximumFractionDigits:1,minimumFractionDigits:1});
  function choose(id){selectedId=id;customLine=null;}
  function switchMode(value){mode=value;query='';onlySaved=false;customLine=null;}
  function toggleSaved(id){saved=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];}
  function reset(){query='';venue='all';sort='mean';count=10;onlySaved=false;customLine=null;}
</script>

<div class="research-lab">
  <aside class="lab-rail" aria-label="Navegación del laboratorio">
    <a class="rail-brand" href="/sports/nba"><span class="nio-mark">n<span>↗</span></span><span>NIO<span class="rail-sub">MATCH STUDIO</span></span></a>
    <span class="rail-label">TU MESA DE ANÁLISIS</span>
    <a class="rail-link current" href="/sports/nba/analisis" aria-current="page"><ChartNoAxesCombined size={18}/>Explorar totales</a>
    <a class="rail-link" href="/sports/nba"><CalendarDays size={18}/>Calendario NBA</a>
    <a class="rail-link" href="/tennis"><span class="tennis-dot">◉</span>Laboratorio tenis</a>
    <div class="rail-divider"></div><span class="rail-label">TU PERSPECTIVA</span>
    <button class="rail-link" class:current={onlySaved} aria-pressed={onlySaved} on:click={()=>onlySaved=!onlySaved}><Bookmark size={18}/>Guardados <span class="count">{saved.length}</span></button>
    <a class="rail-link" href="/bankroll"><span class="tennis-dot">▥</span>Mi bankroll</a>
    <div class="rail-note"><ShieldCheck size={21}/><strong>La evidencia primero.</strong><p>Una tendencia describe la muestra. Una predicción necesita validación.</p><a href="/totales">Estado del motor <ArrowUpRight size={14}/></a></div>
    <a class="rail-back" href="/sports"><ArrowLeft size={14}/>Todos los deportes</a>
  </aside>

  <div class="lab-main">
    <header class="lab-header"><div><div class="lab-kicker"><span class="live-dot"></span>NIOSPORTS / BASKETBALL RESEARCH</div><h1>Encuentra tu perspectiva<span>.</span></h1><p>Explora la muestra. Contrasta la línea. Entiende el contexto.</p></div><a class="calendar-link" href="/sports/nba">Ver calendario <ArrowUpRight size={16}/></a></header>
    <div class="lab-modebar"><div class="mode-buttons" role="group" aria-label="Origen de los datos"><button class:active={mode==='demo'} aria-pressed={mode==='demo'} on:click={()=>switchMode('demo')}>Ejemplo interactivo</button><button class:active={mode==='real'} aria-pressed={mode==='real'} on:click={()=>switchMode('real')}>Datos reales</button></div><span class="mode-note">{mode==='demo'?'Equipos y resultados ficticios · Sin recomendaciones':'Fuente de análisis pendiente · Sin datos de ejemplo'}</span></div>

    <section class="lab-overview" aria-label="Contexto de la vista">
      <div><span class="overview-label">MERCADO EN EXPLORACIÓN</span><strong>Totales de partido <span>FULL</span></strong><small>Partido completo, incluidas prórrogas</small></div>
      <div><span class="overview-label">VENTANA ACTIVA</span><strong>Últimos {count} <span>encuentros</span></strong><small>{venue==='all'?'Todas las localías':venue==='home'?'Primer club como local':'Primer club como visitante'}</small></div>
      <div><span class="overview-label">CALIDAD DE EVIDENCIA</span><strong class="evidence">{mode==='demo'?'Muestra simulada':'Sin fuente habilitada'} <ShieldCheck size={18}/></strong><small>Probabilidad y ventaja predictiva no disponibles</small></div>
    </section>

    <div class="lab-toolbar"><label class="lab-search"><Search size={17}/><span class="sr-only">Buscar encuentro</span><input type="search" bind:value={query} placeholder="Buscar un equipo o encuentro…"/></label><div class="toolbar-actions"><button class:pressed={onlySaved} aria-pressed={onlySaved} on:click={()=>onlySaved=!onlySaved}><Bookmark size={15}/>Guardados <span>{saved.length}</span></button><button class:pressed={showFilters} aria-expanded={showFilters} aria-controls="research-filters" on:click={()=>showFilters=!showFilters}><SlidersHorizontal size={16}/>Filtros</button></div></div>
    {#if showFilters}<div class="lab-filters" id="research-filters"><label>Localía del primer club<select bind:value={venue}><option value="all">Todas</option><option value="home">Local</option><option value="away">Visitante</option></select></label><label>Ordenar por<select bind:value={sort}><option value="mean">Media: mayor a menor</option><option value="line">Referencia: menor a mayor</option></select></label><button on:click={reset}>Restablecer filtros</button></div>{/if}

    {#if mode==='real'}<section class="lab-empty" aria-labelledby="real-title"><ShieldCheck size={34}/><span class="lab-kicker">DATOS REALES</span><h2 id="real-title">El análisis empieza con una fuente.</h2><p>Este laboratorio todavía no recibe históricos y líneas de mercado verificados. Cuando exista una fuente admisible, podrás explorar aquí su muestra y su fecha de corte.</p><div><a class="lab-primary" href="/sports/nba">Consultar calendario <ArrowUpRight size={15}/></a><button on:click={()=>switchMode('demo')}>Explorar el ejemplo</button></div><small>No se generan pronósticos, cuotas ni selecciones.</small></section>
    {:else if !selected}<section class="lab-empty" aria-live="polite"><Search size={32}/><h2>{onlySaved?'No hay guardados en esta vista.':'No encontramos ese encuentro.'}</h2><p>{onlySaved?'Guarda un encuentro con el marcador de su fila. Los guardados duran esta sesión.':'Prueba con Ámbar, Coral o cualquier club del ejemplo.'}</p><button on:click={reset}>Restablecer vista</button></section>
    {:else}
      <div class="lab-grid">
        <section class="match-panel" aria-labelledby="match-list-title"><div class="panel-heading"><div><span class="lab-kicker">EL PUNTO DE PARTIDA</span><h2 id="match-list-title">Explorador de encuentros</h2></div><span class="total-count">{matches.length} / {DEMO_MATCHES.length}</span></div><div class="match-columns" aria-hidden="true"><span>ENCUENTRO / FULL</span><span>TENDENCIA L{count}</span><span>MEDIA</span></div>
          <div class="match-list">{#each matches as match}<div class="research-match" class:chosen={selected.id===match.id}><button class="match-select" aria-pressed={selected.id===match.id} on:click={()=>choose(match.id)}><span class="match-monogram">{match.homeCode}<small>{match.awayCode}</small></span><span class="match-names"><strong>{match.home.replace('Club ','')} <span>vs</span> {match.away.replace('Club ','')}</strong><small>Referencia {number(match.line)} · Simulada</small></span><span class="mini-chart" aria-hidden="true">{#each researchSample(match.history,count,venue).slice(-10) as row}<i class:below={row.total<match.line} style={`height:${Math.max(8,(row.total-180)*.7)}px`}></i>{/each}</span><span class="match-mean">{number(match.summary.mean)}<small>pts</small></span></button><button class="save-match" class:saved={saved.includes(match.id)} aria-label={`${saved.includes(match.id)?'Quitar de':'Añadir a'} guardados ${match.home} vs ${match.away}`} aria-pressed={saved.includes(match.id)} on:click={()=>toggleSaved(match.id)}><Bookmark size={16} fill={saved.includes(match.id)?'currentColor':'none'}/></button></div>{/each}</div><div class="list-footer"><span class="live-dot"></span>6 escenarios ficticios para explorar la experiencia.</div>
          <div class="research-principle"><span>01 / OBSERVAR ANTES DE DECIDIR</span><h3>Más contexto.<br/>Mejores preguntas.</h3><p>La media, el tamaño de muestra y la localía cuentan historias distintas. Explóralas juntas.</p><span class="principle-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
        </section>

        <section class="detail-panel" aria-labelledby="match-detail-title"><div class="detail-heading"><div><span class="lab-kicker">EL ENCUENTRO / EJEMPLO</span><h2 id="match-detail-title">{selected.home.replace('Club ','')} <span>vs</span> {selected.away.replace('Club ','')}</h2><p>Totales FULL · resultados ficticios</p></div><span class="detail-mark">{selected.homeCode}<small>×</small>{selected.awayCode}</span></div>
          <div class="detail-metrics"><div><span>MEDIA DE LA MUESTRA</span><strong>{number(summary.mean)}<small>pts</small></strong></div><div><span>LÍNEA DE REFERENCIA</span><strong>{number(line)}<small>pts</small></strong></div><div><span>SOBRE LA REFERENCIA</span><strong>{summary.over}<small>/ {summary.n}</small></strong></div></div>
          <div class="chart-toolbar"><h3>La muestra, partido a partido</h3><div role="group" aria-label="Ventana de encuentros">{#each [5,10,20] as n}<button class:active={count===n} aria-pressed={count===n} on:click={()=>count=n}>L{n}</button>{/each}</div></div>
          <NbaResearchChart {rows} {line}/>
          <div class="line-control"><label for="research-line">Explorar otra referencia <strong>{number(line)} pts</strong></label><input id="research-line" type="range" min="180" max="270" step="0.5" value={line} on:input={event=>customLine=Number(event.currentTarget.value)}/><div><span>180</span><button on:click={()=>customLine=null}>Volver a {number(selected.line)}</button><span>270</span></div></div>
          <div class="sample-reading" aria-live="polite"><span class="reading-icon">↗</span><p><strong>{summary.over} sobre · {summary.under} bajo · {summary.push} iguales.</strong> {summary.n} observaciones ficticias {summary.n<count?`de ${count} solicitadas tras filtrar localía`:'en la ventana seleccionada'}. Frecuencia de esta muestra; no es una probabilidad predictiva.</p></div>
        </section>
      </div>
      <section class="lab-evidence" aria-labelledby="source-title"><div class="evidence-title"><ShieldCheck size={20}/><div><span class="lab-kicker">TRAZABILIDAD A LA VISTA</span><h2 id="source-title">Sabes qué estás mirando.</h2></div></div><dl><div><dt>Origen</dt><dd>Conjunto de prueba NIO</dd></div><div><dt>Contenido</dt><dd>Equipos y resultados ficticios</dd></div><div><dt>Muestra filtrada</dt><dd>{summary.n} de {selected.history.length} observaciones</dd></div><div><dt>Validación predictiva</dt><dd>No disponible</dd></div></dl><p>{RESEARCH_DEMO.id} · Referencias simuladas, sin casa de apuestas ni fecha de mercado. Los filtros no calculan EV ni modifican tu bankroll.</p></section>
    {/if}
    <footer class="lab-footer"><span>NIO / MATCH STUDIO</span><span>Observa con claridad. Decide con criterio.</span><a href="/totales">Consultar capacidades del motor <ArrowUpRight size={13}/></a></footer>
  </div>
</div>
