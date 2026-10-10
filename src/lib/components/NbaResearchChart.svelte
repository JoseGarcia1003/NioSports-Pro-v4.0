<script>
  export let rows=[];
  export let line=227.5;
  const top=40,bottom=230,left=38,right=644;
  $: lower=Math.floor((Math.min(line,...rows.map(r=>r.total))-18)/10)*10;
  $: upper=Math.ceil((Math.max(line,...rows.map(r=>r.total))+12)/10)*10;
  $: y=value=>bottom-(value-lower)/(upper-lower)*(bottom-top);
  $: step=(right-left)/Math.max(rows.length,1);
  $: ticks=[lower,(upper+lower)/2,upper];
</script>

<div class="research-chart" style={`--chart-width: ${Math.max(600,rows.length*38)}px`}>
  <p class="chart-hint">Desliza el gráfico para ver todos los encuentros.</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (La región desplazable necesita foco para usar las flechas del teclado.) -->
  <div class="chart-scroll" tabindex="0" role="region" aria-label="Gráfico de encuentros, desplazamiento horizontal">
  <svg viewBox="0 0 680 282" role="img" aria-label={`Totales de ${rows.length} encuentros ficticios. Línea de referencia ${line}. Los valores exactos están en el detalle accesible.`}>
    {#each ticks as tick}<line class="gridline" x1={left} x2={right} y1={y(tick)} y2={y(tick)}/><text class="axis" x="28" y={y(tick)+4} text-anchor="end">{tick}</text>{/each}
    {#each rows as row,i}
      <rect class="bar" class:under={row.total<line} class:equal={row.total===line} x={left+i*step+step*.18} y={y(row.total)} width={step*.64} height={bottom-y(row.total)} rx="4"/>
      <text class="bar-value" x={left+(i+.5)*step} y={y(row.total)-9} text-anchor="middle">{row.total}</text>
      <text class="axis" x={left+(i+.5)*step} y="253" text-anchor="middle">{row.label}</text>
      <text class="venue" x={left+(i+.5)*step} y="270" text-anchor="middle">{row.venue==='home'?'L':'V'}</text>
    {/each}
    <line class="reference" x1={left} x2={right} y1={y(line)} y2={y(line)}/>
    <rect class="reference-label" x="582" y={y(line)-21} width="62" height="19" rx="4"/>
    <text class="reference-text" x="613" y={y(line)-7} text-anchor="middle">{line.toLocaleString('es')}</text>
  </svg>
  </div>
  <div class="legend"><span><i class="above"></i>Sobre referencia</span><span><i class="below"></i>Bajo referencia</span><span><i class="on"></i>Igual</span><span>L / V: local / visitante</span></div>
  <details><summary>Ver valores y localía</summary><div class="data-scroll"><table><caption>Resultados ficticios · orden del más antiguo al más reciente</caption><thead><tr><th>Encuentro</th><th>Total</th><th>Localía del primer club</th><th>Frente a referencia</th></tr></thead><tbody>{#each rows as row}<tr><td>{row.label}</td><td>{row.total}</td><td>{row.venue==='home'?'Local':'Visitante'}</td><td>{row.total>line?'Sobre':row.total<line?'Bajo':'Igual'}</td></tr>{/each}</tbody></table></div></details>
</div>
<style>
  .research-chart{min-width:0}svg{display:block;width:100%;overflow:visible}.gridline{stroke:var(--lab-line);stroke-dasharray:3 5}.axis{fill:var(--lab-muted);font-size:11px}.venue{fill:var(--lab-muted);font-size:9px}.bar{fill:var(--nio-chart-over)}.bar.under{fill:var(--lab-blue)}.bar.equal{fill:var(--lab-amber)}.bar-value{fill:var(--lab-ink);font-size:11px;font-weight:650}.reference{stroke:var(--lab-accent);stroke-width:1.6;stroke-dasharray:5 4}.reference-label{fill:var(--nio-gold-soft)}.reference-text{fill:var(--lab-accent);font-size:11px;font-weight:700}.legend{display:flex;flex-wrap:wrap;gap:9px 15px;font-size:11px;color:var(--lab-muted);padding:10px 0 12px}.legend span{display:flex;align-items:center;gap:6px}i{width:7px;height:7px;border-radius:2px}.above{background:var(--nio-chart-over)}.below{background:var(--lab-blue)}.on{background:var(--lab-amber)}details{border-top:1px solid var(--lab-line);padding-top:13px;color:var(--lab-muted);font-size:12px}summary{cursor:pointer;min-height:30px}summary:focus-visible{outline:2px solid var(--lab-accent);outline-offset:3px}.data-scroll{overflow:auto}table{width:100%;font-size:12px;border-collapse:collapse;white-space:nowrap}caption{text-align:left;padding:12px 0}th,td{text-align:left;padding:9px;border-bottom:1px solid var(--lab-line)}
.chart-scroll{overflow-x:auto;overscroll-behavior-x:contain}.chart-scroll:focus-visible{outline:2px solid var(--lab-accent);outline-offset:3px}.chart-hint{display:none}.axis,.venue,.reference-text{font-size:14px}.bar-value{font-size:16px}@media(max-width:760px){.chart-scroll svg{min-width:var(--chart-width)}.chart-hint{display:block;font-size:11px;color:var(--lab-muted);margin:0 0 10px}}
.research-chart{background:var(--lab-surface);border:0;padding:8px 0 0}.bar{stroke:none}.bar.equal{stroke:var(--lab-ink);stroke-width:.7}
</style>
