"""Generate the human-readable dictionary from the executable contract."""
import argparse
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]


def render():
    data=json.loads((ROOT/'ml/contracts/dictionary.json').read_text(encoding='utf-8'))
    lines=['# Diccionario de datos v'+data['version'],'',
        'Generado desde [dictionary.json](../../ml/contracts/dictionary.json). No editar las filas a mano.',
        'Reglas comunes y metadatos obligatorios: [DATA_CONTRACT.md](DATA_CONTRACT.md).',
        '',
        'Cada variable hereda partido, liga, temporada, periodo y zona de event; sus timestamps de captura/disponibilidad/publicación y fuente concreta están en observations. No hay fechas o proveedores ficticios por defecto.',
        '',
        'training/inference indican uso admisible como entrada. target=true es etiqueta separada, nunca predictor. Que una variable esté descrita no demuestra que el motor actual la utilice.',
        '',
        'Todas las definiciones tienen versión '+data['version']+'. Faltante: rechazo para construir vector (null con motivo puede conservarse como evidencia). Extremos: rechazo fuera del dominio; no clipping salvo transformación explícita con rawValue. Actualización: nueva revisión, nunca sobrescritura.',
        '']
    for sport,title in [('basketball','NBA FULL'),('tennis','Tenis MATCH')]:
        lines.extend(['## '+title,'','| Variable | Tipo / unidad | Rol y uso | Definición / fórmula |','|---|---|---|---|'])
        for d in data['variables']:
            if d['sport']!=sport:continue
            usage='etiqueta separada' if d.get('target') else ('train='+str(d['training']).lower()+', inferencia='+str(d['inference']).lower())
            detail=d['description']
            if d.get('derive'):detail+=' Receta: '+json.dumps(d['derive'],ensure_ascii=False,separators=(',',':'))+'.'
            if d.get('transform'):detail+=' Transformación: '+d['transform']+'.'
            if d.get('values'):detail+=' Valores: '+str(d['values'])+'.'
            bounds=[k+'='+str(d[k]) for k in ['min','max'] if d.get(k) is not None]
            if bounds:detail+=' Dominio: '+', '.join(bounds)+'.'
            lines.append('| '+d['name']+' | '+d['type']+' / '+d['unit']+' | '+d['role']+'; '+usage+' | '+detail.replace('|','/')+' |')
        lines.append('')
    lines.extend(['## Fuente concreta y uso histórico','',
        'La descripción source de cada definición exige origen histórico o derivación documentada. La observación identifica provider, recordId y revision; la derivación NBA incluye registros de su ventana. La lista de confianza se suministra en servidor; un metadato autodeclarado no autentica origen.',
        'El CSV legado no cumple ese contrato. Consultar LEGACY_DATA_REPORT.json; no completar los metadatos ausentes mediante suposiciones.',''])
    return '\n'.join(lines)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    out=ROOT/'docs/reconstruction/DATA_DICTIONARY.md';content=render()
    if args.check:
        if not out.exists() or out.read_text(encoding='utf-8')!=content:raise SystemExit('Dictionary documentation out of date')
        print('Dictionary documentation matches schema')
    else:out.write_text(content,encoding='utf-8')
