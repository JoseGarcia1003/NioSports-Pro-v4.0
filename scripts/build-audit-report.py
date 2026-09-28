"""Build the dated audit PDF and its reproducible, read-only data summary."""
from pathlib import Path
import csv
import json
import math
import re
import statistics
from html import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepInFrame

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'docs/AUDIT_2026-09-27.md'
PDF = OUT / 'NioSports_Auditoria_2026-09-27.pdf'

# Only local historical artifacts are read. No credentials, API requests or model training.
with (ROOT / 'ml/data/nba_features.csv').open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))
cal = json.loads((ROOT / 'ml/models/calibration.json').read_text(encoding='utf-8'))
meta = cal['ensemble']['meta_params']
split1, split2 = int(len(rows) * .6), int(len(rows) * .8)
summary = {
    'as_of': '2026-09-27', 'audited_commit': 'ab9b63a4982cdb212c43a5f631507fa839e4e4aa',
    'rows': len(rows), 'unique_game_ids': len({x['_game_id'] for x in rows}),
    'date_range': [min(x['_date'] for x in rows), max(x['_date'] for x in rows)],
    'chronological': all(a['_date'] <= b['_date'] for a, b in zip(rows, rows[1:])),
    'empty_cells': sum(v == '' for x in rows for v in x.values()),
    'contains_market_line': 'line' in rows[0],
    'median_total': statistics.median(float(x['actual_total']) for x in rows),
    'fold_dates': [[rows[split1]['_date'], rows[split2-1]['_date']], [rows[split2]['_date'], rows[-1]['_date']]],
    'feature_count': cal['feature_count'], 'training_samples': cal['training_samples'],
    'archived_metrics_not_retrained': json.loads((ROOT / 'ml/models/training_results.json').read_text()),
    'controlled_example_not_live_prediction': {
        'base_full_predictions': [220] * 4, 'q1_line': 60, 'q1_projection_after_scaling': 55,
        'prob_over_before_scaling': 1 / (1 + math.exp(-(meta['intercept'][0] + sum((220-60)*c for c in meta['coef'][0]))))
    },
    'published_formula_recomputed': 1 / (1 + math.exp(-.163 * 6.7 + .256)),
    'global_score_weighted': sum(s*w for s,w in [(3,.35),(2,.15),(5,.15),(7,.15),(3,.10),(6,.10)])
}
(ROOT / 'docs/AUDIT_2026-09-27_DATA.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

font_dir = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Audit', str(font_dir / 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('AuditBold', str(font_dir / 'segoeuib.ttf')))
pdfmetrics.registerFontFamily('Audit', normal='Audit', bold='AuditBold', italic='Audit', boldItalic='AuditBold')
navy, teal, grey = '#13283E', '#157B80', '#4C5F70'
styles = {
    'body': ParagraphStyle('body', fontName='Audit', fontSize=10, leading=14, spaceAfter=9, textColor=colors.HexColor(navy), splitLongWords=True),
    'h1': ParagraphStyle('h1', fontName='AuditBold', fontSize=23, leading=28, spaceAfter=16, textColor=colors.HexColor(navy), keepWithNext=True),
    'h2': ParagraphStyle('h2', fontName='AuditBold', fontSize=13, leading=17, spaceBefore=4, spaceAfter=10, textColor=colors.HexColor(teal), keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='AuditBold', fontSize=11, leading=15, spaceBefore=4, spaceAfter=7, textColor=colors.HexColor(navy), keepWithNext=True),
    'cell': ParagraphStyle('cell', fontName='Audit', fontSize=9, leading=12, textColor=colors.HexColor(navy)),
    'head': ParagraphStyle('head', fontName='AuditBold', fontSize=9, leading=12, textColor=colors.white),
    'url': ParagraphStyle('url', fontName='Audit', fontSize=8.5, leading=12, textColor=colors.HexColor(teal), spaceAfter=9, splitLongWords=True),
}

def inline(s):
    s = escape(s.replace('\u2014', '-').replace('\u2013', '-').replace('\u2011', '-'))
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    return s

def blocks(section):
    lines = section.strip().splitlines()
    flows, i = [], 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith('|'):
            rows_table = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+', x) for x in row):
                    rows_table.append(row)
                i += 1
            count = len(rows_table[0])
            widths = {2:[175,324],3:[145,55,299],4:[136,59,64,240]}[count]
            if rows_table[0][0] == 'Métrica': widths = [112,80,80,227]
            if rows_table[0][0] == 'Bloque': widths = [80,290,129]
            if rows_table[0][0] == 'Aspecto adicional': widths = [145,83,271]
            data = [[Paragraph(inline(v), styles['head' if n == 0 else 'cell']) for v in row] for n,row in enumerate(rows_table)]
            table = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),colors.HexColor(navy)),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F0F5F8'),colors.white]),
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
                ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
                ('LINEBELOW',(0,0),(-1,0),1,colors.HexColor(teal)),
            ]))
            flows.extend([table, Spacer(1,12)])
            continue
        style = 'body'
        if line.startswith('### '): style, line = 'h3', line[4:]
        elif line.startswith('## '): style, line = 'h2', line[3:]
        elif line.startswith('# '): style, line = 'h1', line[2:]
        elif line.startswith('- '): line = '• ' + line[2:]
        if line.startswith('https://'):
            flows.append(Paragraph('<link href="'+escape(line, quote=True)+'">'+inline(line)+'</link>',styles['url']))
        else:
            flows.append(Paragraph(inline(line),styles[style]))
        i += 1
    return flows

def furniture(canvas, doc):
    w,h=A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor(teal))
    canvas.setLineWidth(2)
    canvas.line(48,h-37,w-48,h-37)
    canvas.setFont('AuditBold',8)
    canvas.setFillColor(colors.HexColor(grey))
    canvas.drawString(48,h-27,'NIOSPORTS PRO  /  AUDITORÍA CRÍTICA')
    canvas.setFont('Audit',8)
    canvas.drawRightString(w-48,h-27,'27 SEPTIEMBRE 2026')
    canvas.setStrokeColor(colors.HexColor('#D5DFE7'))
    canvas.setLineWidth(.5)
    canvas.line(48,37,w-48,37)
    canvas.drawString(48,23,'Evidencia revisada · No certifica rentabilidad ni precisión futura')
    canvas.drawRightString(w-48,23,str(doc.page))
    canvas.restoreState()

story=[]
for n, section in enumerate(SOURCE.read_text(encoding='utf-8').split('<!-- PAGE -->')):
    if n: story.append(PageBreak())
    story.append(KeepInFrame(A4[0]-96, A4[1]-122, blocks(section), mode='shrink'))
doc=SimpleDocTemplate(str(PDF), pagesize=A4, rightMargin=48,leftMargin=48,topMargin=57,bottomMargin=53,
    title='NioSports Pro - Auditoría crítica del producto y modelo predictivo',author='Revisión técnica asistida por Codex')
doc.build(story,onFirstPage=furniture,onLaterPages=furniture)
print(PDF)
print(json.dumps(summary,ensure_ascii=False,indent=2))
