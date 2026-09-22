<script>
  export let stats = [null,null];
  export let names = [];
  const ratio=(s,a,b)=>s&&s[b]>0?`${(100*s[a]/s[b]).toFixed(1)}%`:'—';
  const average=(s,key)=>s&&s.matches>0?(s[key]/s.matches).toFixed(1):'—';
  const metrics=[
    {label:'Primer servicio dentro',value:s=>ratio(s,'firstServeIn','servicePoints')},
    {label:'Puntos ganados con primer servicio',value:s=>ratio(s,'firstServeWon','firstServeIn')},
    {label:'Puntos ganados con segundo servicio',value:s=>ratio(s,'secondServeWon','secondServePoints')},
    {label:'Aces por partido',value:s=>average(s,'aces')},
    {label:'Dobles faltas por partido',value:s=>average(s,'doubleFaults')},
    {label:'Puntos de quiebre salvados',value:s=>ratio(s,'breakPointsSaved','breakPointsFaced')},
    {label:'Oportunidades de quiebre convertidas',value:s=>ratio(s,'breaksConverted','breakOpportunities')},
  ];
</script>
<div class="serve">
  <h3>Servicio, resto y presión</h3><p>Temporada · todas las superficies · muestra aportada por el proveedor</p>
  <div class="row head"><strong>{names[0]}</strong><span>Métrica</span><strong>{names[1]}</strong></div>
  {#each metrics as metric}<div class="row"><b>{metric.value(stats[0])}</b><span>{metric.label}</span><b>{metric.value(stats[1])}</b></div>{/each}
  <div class="row"><b>{stats[0]?.matches??'—'}</b><span>Partidos incluidos en esta muestra</span><b>{stats[1]?.matches??'—'}</b></div>
  {#if stats.some(s=>!s)}<p class="note">Hay estadísticas no disponibles. El símbolo — no significa cero; no se inventan porcentajes cuando falta el dato o el denominador.</p>{/if}
  {#each stats as s,i}{#if s}<p class="note">{names[i]} · Datos hasta {new Date(s.asOf).toISOString().slice(0,10)} · No intervienen todavía en el modelo Elo.</p>{/if}{/each}
</div>
<style>
  h3{font-size:15px;font-weight:500;margin:22px 0 8px}p{font-size:12px;color:var(--muted);line-height:1.8}.row{display:grid;grid-template-columns:1fr 1.7fr 1fr;gap:10px;text-align:center;align-items:center;border-bottom:1px solid var(--tennis-border);padding:15px 0}.row b{font-size:14px;font-weight:450}.row span{font-size:12px;color:var(--muted)}.head{margin-top:20px}.head strong{font-size:12px;font-weight:500;color:var(--lime)}.note{margin-top:17px}
</style>
