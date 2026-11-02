<script>
  const status = [
    { label: 'Datos deportivos', value: 'Conectados', note: 'Calendario (balldontlie), estadísticas oficiales por jugador y partido (stats.nba.com, carga diaria) y líneas de las casas (The Odds API, plan gratuito: totales y puntos de jugadores). Sin lesiones confirmadas todavía.' },
    { label: 'Modelos predictivos', value: 'En reconstrucción', note: 'Ningún modelo publica probabilidades. La «lectura de los datos» es un resumen por reglas de señales a favor y en contra, no una probabilidad.' },
    { label: 'Probabilidades calibradas', value: 'No disponibles', note: 'Calibrar exige resultados reales posteriores al entrenamiento. No mostramos porcentajes sin esa comprobación.' },
    { label: 'Historial de señales', value: 'En marcha', note: 'Las señales se sellan antes del partido, no se editan y se liquidan con el box score oficial. La muestra aún es pequeña para medir acierto.' }
  ];

  // ok = available today with real data; false = planned (shown as «Próximamente»).
  const scopes = [
    {
      title: 'Props de jugadores',
      items: [['Minutos recientes frente a la temporada', true], ['Acierto L5, L10, L20 y temporada', true], ['Local, visitante y cara a cara', true], ['Con y sin un compañero', true], ['Defensa del rival por posición', false], ['Ritmo del partido y del rival', false], ['Lesiones y ausencias confirmadas', false]]
    },
    {
      title: 'Props de equipo y totales',
      items: [['Puntos por equipo y total frente a la línea', true], ['Puntos permitidos por el rival', true], ['Tendencia reciente frente a la temporada', true], ['Primera mitad y primer cuarto por separado', false], ['Ritmo, eficiencia, descanso y viajes', false]]
    },
    {
      title: 'Tenis',
      items: [['Orden de juego, superficie y circuito', true], ['Rendimiento de la temporada en esa superficie', false], ['Puntos de saque y de resto ganados', false], ['Carga de partidos y fatiga', false], ['El historial directo solo como un dato más', false]]
    }
  ];

  const steps = [
    ['Datos con fuente', 'Cada cifra indica de dónde viene y hasta qué hora está actualizada. Si falta un dato, se muestra la ausencia.'],
    ['Contexto', 'Se estudia por qué una cifra es como es: rival, superficie, minutos, ausencias, calendario.'],
    ['Estimación', 'Se calcula un rango de resultados posibles, no un número aislado.'],
    ['Comparación con la línea', 'La estimación se contrasta con la línea y la cuota publicadas en ese momento.'],
    ['Decisión o abstención', 'Si la evidencia no es suficiente, no se publica pick. Abstenerse también es un resultado del análisis.'],
    ['Explicación', 'La inteligencia artificial redacta el razonamiento únicamente a partir de los datos verificados del paso 1.']
  ];

  const rules = [
    'No inventamos partidos, lesiones, estadísticas, cuotas ni resultados.',
    'No usamos información posterior al momento del análisis.',
    'Separamos proyección, probabilidad y recomendación.',
    'Los ejemplos de demostración se rotulan como tales y nunca se mezclan con datos reales.',
    'Un acierto o un fallo aislado no valida ni invalida el método; se evalúa sobre muestras amplias.'
  ];

  const glossary = [
    ['Proyección', 'Valor esperado de la estadística (puntos, rebotes, juegos…) según los datos disponibles.'],
    ['Línea', 'Umbral publicado por la casa de apuestas, por ejemplo 2,5 triples.'],
    ['Probabilidad', 'Frecuencia con la que el resultado superaría la línea si la situación se repitiera muchas veces.'],
    ['Cuota decimal', 'Pago total por unidad apostada. Una cuota de 2,00 implica una probabilidad del 50 % sin margen.'],
    ['Valor esperado', 'Ganancia o pérdida media por unidad, combinando probabilidad y cuota. Solo tiene sentido con probabilidades calibradas.']
  ];
</script>

<svelte:head>
  <title>Metodología · NioSports Pro</title>
  <meta name="description" content="Cómo analiza NioSports Pro props de jugadores, props de equipo y tenis, y qué partes del sistema están disponibles hoy." />
</svelte:head>

<div class="product-page method">
  <header class="product-heading">
    <div>
      <span class="product-eyebrow">Metodología</span>
      <h1>Cómo analizamos un partido.</h1>
      <p>Primero los datos, después el contexto y solo al final una estimación. Esta página explica el método y también lo que todavía no está disponible.</p>
    </div>
  </header>

  <section class="product-section" aria-labelledby="estado">
    <h2 id="estado">Estado actual del sistema</h2>
    <div class="status">
      {#each status as item}
        <article class="product-panel">
          <span class="product-eyebrow">{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.note}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="product-section" aria-labelledby="alcance">
    <h2 id="alcance">Qué estudiamos</h2>
    <p class="lead">El historial directo o la racha reciente son puntos de partida, no conclusiones. Cada mercado tiene sus propios factores.</p>
    <div class="scopes">
      {#each scopes as scope}
        <article class="product-panel">
          <h3>{scope.title}</h3>
          <ul>{#each scope.items as [item, ok]}<li class:planned={!ok}><span>{item}</span><em>{ok ? 'Disponible' : 'Próximamente'}</em></li>{/each}</ul>
        </article>
      {/each}
    </div>
  </section>

  <section class="product-section" aria-labelledby="proceso">
    <h2 id="proceso">Cómo se construye un análisis</h2>
    <ol class="steps">
      {#each steps as [title, text], i}
        <li><span class="num">{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>
      {/each}
    </ol>
  </section>

  <section class="product-section product-panel" aria-labelledby="reglas">
    <h2 id="reglas">Reglas que no se negocian</h2>
    <ul class="rules">{#each rules as rule}<li>{rule}</li>{/each}</ul>
  </section>

  <section class="product-section" aria-labelledby="glosario">
    <h2 id="glosario">Cómo leer las cifras</h2>
    <dl class="glossary">
      {#each glossary as [term, def]}<div><dt>{term}</dt><dd>{def}</dd></div>{/each}
    </dl>
  </section>

  <p class="product-note foot">Ningún análisis garantiza un resultado. Apuesta solo lo que puedas permitirte perder. <a class="product-link" href="/legal/responsible-gambling">Juego responsable ↗</a></p>
</div>

<style>
  .method h2 { font-size: clamp(22px, 2.4vw, 28px); letter-spacing: -.03em; margin: 0 0 14px; }
  .method h3 { font-size: 17px; margin: 0 0 8px; letter-spacing: -.01em; }
  .method .product-section { margin-bottom: 48px; }
  .lead { max-width: 680px; color: var(--color-text-muted); margin: 0 0 20px; }
  .status { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .status article { padding: 20px; display: flex; flex-direction: column; gap: 8px; }
  .status strong { font-size: 19px; color: var(--product-accent-text); }
  .status p, .scopes li, .steps p, .glossary dd { font-size: 14px; line-height: 1.65; color: var(--color-text-muted); margin: 0; }
  .scopes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .scopes article { padding: 22px; }
  .scopes ul, .rules { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
  .scopes ul { list-style: none; padding-left: 0; gap: 8px; }
  .scopes li { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .scopes li em { flex: none; font-style: normal; font-size: 11px; font-weight: 700; color: var(--nio-accent); }
  .scopes li.planned em { color: var(--nio-muted); }
  .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 28px; }
  .steps li { display: flex; gap: 16px; padding: 18px 0; border-top: 1px solid var(--product-border); }
  .num { font-family: var(--font-mono, monospace); font-size: 13px; color: var(--product-accent-text); padding-top: 2px; }
  .rules li { font-size: 15px; line-height: 1.6; }
  .method .product-panel.product-section { padding: 26px; }
  .glossary { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 28px; }
  .glossary div { padding: 16px 0; border-top: 1px solid var(--product-border); }
  .glossary dt { font-weight: var(--font-bold); margin-bottom: 4px; }
  .glossary dd { margin: 0; }
  .foot { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
  @media (max-width: 1000px) { .status { grid-template-columns: repeat(2, minmax(0, 1fr)); } .scopes { grid-template-columns: 1fr; } }
  @media (max-width: 680px) { .status, .steps, .glossary { grid-template-columns: 1fr; } }
</style>
