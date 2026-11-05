#!/usr/bin/env python3
"""Build editable Markdown and self-contained print HTML from exam.json."""
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'exam.json').read_text())
CSS = '''
@page {size:A4; margin:16mm 17mm 17mm}
*{box-sizing:border-box} body{margin:0;color:#000;background:#fff;font-family:'Noto Serif CJK SC','Noto Sans CJK SC',serif;font-size:11pt;line-height:1.65}
.page{width:176mm;break-after:page}.page:last-child{break-after:auto}
h1{font-size:22pt;line-height:1.35;text-align:center;margin:0 0 5mm}h2{font-size:15pt;margin:0 0 4mm;border-bottom:1.1pt solid #000;padding-bottom:2mm}
h3{font-size:12pt;margin:4mm 0 2mm}p{margin:1.5mm 0 3mm}.meta{text-align:center;font-size:10pt;margin-bottom:4mm}.small,.source{font-size:9pt;line-height:1.5}.source{margin-top:3mm}
.note{border:1pt solid #000;padding:2mm 3mm;margin:3mm 0}.question{break-inside:avoid;margin:3mm 0 4mm}.stem{margin:0 0 1mm}.options{display:grid;grid-template-columns:1fr 1fr;gap:0.6mm 5mm;font-size:10pt;line-height:1.55}.option{break-inside:avoid}
table{border-collapse:collapse;width:100%;margin:3mm 0;font-size:10pt;line-height:1.55;break-inside:avoid}th,td{border:.6pt solid #000;padding:1.7mm 2mm;text-align:center}th{font-weight:bold}td.left{text-align:left}
.source-table{font-size:8.7pt}.source-table td{padding:1.5mm 2mm}
pre{font-family:'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace;font-size:9pt;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;border:.6pt solid #000;padding:3mm;margin:3mm 0;break-inside:avoid}
ol,ul{padding-left:6mm;margin:2mm 0 3mm}li{margin-bottom:1.5mm}.rule{height:9mm;border-bottom:.4pt solid #bbb}
.fill{margin:4mm 0;break-inside:avoid}.answergrid td{height:7mm}.rubric{border-top:.5pt solid #000;margin-top:4mm;padding-top:2mm;font-size:9.5pt}.gantt{font-family:'DejaVu Sans Mono',monospace;font-size:9pt;line-height:1.7}
'''


def esc(text):
    return html.escape(str(text))


def table(headers, rows, klass=''):
    return '<table class="' + klass + '"><thead><tr>' + ''.join('<th>'+esc(x)+'</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join('<td>'+esc(x)+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table>'


def blocks(items):
    out = []
    for block in items:
        kind = block['type']
        if kind == 'p': out.append('<p>'+esc(block['text'])+'</p>')
        elif kind == 'h3': out.append('<h3>'+esc(block['text'])+'</h3>')
        elif kind == 'code': out.append('<pre>'+esc(block['text'])+'</pre>')
        elif kind == 'list': out.append('<ul>'+''.join('<li>'+esc(x)+'</li>' for x in block['items'])+'</ul>')
        elif kind == 'table': out.append(table(block['headers'], block['rows']))
        elif kind == 'space': out.append('<div class="space" style="height:'+str(block['mm'])+'mm">'+'<div class="rule"></div>'*(block['mm']//9)+'</div>')
        else: raise ValueError(kind)
    return ''.join(out)


def md_blocks(items):
    out = []
    for b in items:
        if b['type'] == 'p': out.append(b['text'])
        elif b['type'] == 'h3': out.append('### '+b['text'])
        elif b['type'] == 'code': out.append('```text\n'+b['text']+'\n```')
        elif b['type'] == 'list': out.append('\n'.join('- '+x for x in b['items']))
        elif b['type'] == 'table':
            out.append('| '+' | '.join(b['headers'])+' |\n| '+' | '.join('---' for _ in b['headers'])+' |\n'+'\n'.join('| '+' | '.join(map(str,row))+' |' for row in b['rows']))
        elif b['type'] == 'space': out.append('（答题区域）')
    return '\n\n'.join(out)


def sources(q):
    return '；'.join(DATA['sources'][s['id']]['file']+'，PDF 第 '+str(s['pages'])+' 页' for s in q['sources'])


def document(title, pages):
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+CSS+'</style></head><body>'+''.join('<section class="page">'+p+'</section>' for p in pages)+'</body></html>'


def build():
    exam, answer, md_exam, md_answer = [], [], [], []
    intro = '<h1>操作系统模拟试卷 A</h1><div class="meta">100 分 · 120 分钟 · 闭卷练习</div><p>姓名：________________　学号：________________</p>'
    intro += table(['题型','单项选择','填空','解答','总分'],[['分值','30','20','50','100'],['得分','','','','']])
    intro += '<div class="note small">范围：仓库 OS-course 根目录的 10 份课件。涵盖系统结构、进程与线程、调度、并发同步、死锁及 IPC。<br>单选题每题只有一个正确选项；填空题每题仅设一空；解答题写出过程。具体模型以各题说明为准。本卷为依据课件编制的模拟题。</div>'
    md_exam.append('# 操作系统模拟试卷 A\n\n满分 100 分，时间 120 分钟，闭卷练习。\n\n单项选择 15×2=30 分；填空 10×2=20 分；解答 5×10=50 分。')
    md_exam.append('范围：OS-course 根目录 10 份课件，涵盖系统结构、进程与线程、CPU 调度、同步、死锁、IPC。具体模型以各题说明为准。')
    md_answer.append('# 操作系统模拟试卷 A：参考答案与评分标准\n\n总分 100 分。课件引用均使用 PDF 文件页序（从 1 起），不使用幻灯片印刷页码。')
    for index, group in enumerate([DATA['choice'][:4], DATA['choice'][4:9], DATA['choice'][9:]]):
        page = (intro if index == 0 else '<h2>一、单项选择题（续）</h2>')
        if index == 0: page += '<h2>一、单项选择题（每题 2 分，共 30 分）</h2>'
        for q in group:
            page += '<div class="question"><p class="stem"><b>'+str(q['n'])+'.</b> '+esc(q['stem'])+'（　　）</p><div class="options">'
            page += ''.join('<div class="option">'+letter+'. '+esc(option)+'</div>' for letter,option in zip('ABCD',q['options']))+'</div></div>'
            md_exam.append(f"**{q['n']}. {q['stem']}（　　）**\n\n"+'\n\n'.join(letter+'. '+option for letter,option in zip('ABCD',q['options'])))
        page += table(['题号']+[q['n'] for q in group],[['答案']+['' for _ in group]],'answergrid')
        exam.append(page)
    for index, group in enumerate([DATA['choice'][:8], DATA['choice'][8:]]):
        head = '<h1>参考答案与评分标准</h1><div class="meta">操作系统模拟试卷 A · 共 100 分</div>' if index == 0 else ''
        answer.append(head+'<h2>一、单项选择题（'+('30 分' if index == 0 else '续')+'）</h2><p class="small">每题 2 分。错选、漏选或多选均不得分。</p>'+table(['题号','答案','解析'],[[q['n'],q['answer'],q['explain']] for q in group])+'<p class="source">逐题课件出处见文末索引及可编辑答案 Markdown；解答题亦附主要出处。</p>')
    md_answer.append('## 一、单项选择题（每题 2 分，共 30 分）')
    for q in DATA['choice']: md_answer.append(f"**{q['n']}. {q['answer']}**　{q['explain']}\n\n出处：{sources(q)}。")
    page = '<h2>二、填空题（每题 2 分，共 20 分）</h2><p class="small">第 16—25 题每题仅设一空。填写名称、数值、公式或 API 名称；含义一致的规范表达可得分。</p>'
    md_exam.append('## 二、填空题（每题 2 分，共 20 分）')
    md_answer.append('## 二、填空题（每题 2 分，共 20 分）')
    for q in DATA['fill']:
        page += '<p class="fill"><b>'+str(q['n'])+'.</b> '+esc(q['stem'])+'</p>'
        md_exam.append(f"{q['n']}. {q['stem']}")
        md_answer.append(f"**{q['n']}. {q['answer']}**\n\n{q['explain']}\n\n出处：{sources(q)}。")
    exam.append(page)
    answer.append('<h2>二、填空题（20 分）</h2><p class="small">每题 2 分；规范同义表述可得分。符号题须表达完整关系。</p>'+table(['题号','参考答案','说明'],[[q['n'],q['answer'],q['explain']] for q in DATA['fill']]))
    md_exam.append('## 三、解答题（每题 10 分，共 50 分）')
    md_answer.append('## 三、解答题（每题 10 分，共 50 分）')
    for q in DATA['long']:
        title=f"{q['n']}. {q['title']}（10 分）"
        exam.append('<h2>'+esc(title)+'</h2>'+blocks(q['question']))
        answer.append('<h2>'+esc(title)+'</h2>'+blocks(q['solution'])+'<p class="rubric"><b>评分标准：</b>'+esc(q['rubric'])+'</p><p class="source"><b>课件出处：</b>'+esc(sources(q))+'。</p>')
        md_exam.append('### '+title+'\n\n'+md_blocks(q['question']))
        md_answer.append('### '+title+'\n\n'+md_blocks(q['solution'])+'\n\n**评分标准：**'+q['rubric']+'\n\n**课件出处：**'+sources(q)+'。')
    # A dedicated source page makes the printed answer booklet traceable as well.
    source_rows = []
    for q in DATA['choice']+DATA['fill']:
        short='；'.join(s['id']+' p.'+str(s['pages']) for s in q['sources'])
        source_rows.append([q['n'],short])
    source_page='<h2>附：客观题出处与课件索引</h2><p class="small">页码为 PDF 文件页序，从 1 开始。每题均由课件概念改编；计算数据为本卷自行设定。</p>'
    paired = [source_rows[i]+(source_rows[i+13] if i+13<len(source_rows) else ['','']) for i in range(13)]
    source_page+=table(['题号','出处','题号','出处'],paired,'source-table')
    source_page+='<div class="small">'+''.join('<div>'+esc(key+'　'+val['file'])+'</div>' for key,val in DATA['sources'].items())+'</div>'
    answer.append(source_page)
    for stem,pages,md in [('操作系统模拟试卷A-试卷',exam,md_exam),('操作系统模拟试卷A-参考答案',answer,md_answer)]:
        (ROOT/(stem+'.html')).write_text(document(stem,pages))
        (ROOT/(stem+'.md')).write_text('\n\n'.join(md)+'\n')
    manifest=[]
    for key, source in DATA['sources'].items():
        p=ROOT.parent/source['file']
        manifest.append({'id':key,'file':source['file'],'pages':source['pages'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    (ROOT/'sources.json').write_text(json.dumps({'repository':'zxymao/Chatgpt','commit':DATA['commit'],'scope':'OS-course/*.pdf（原始课件）','sources':manifest},ensure_ascii=False,indent=2)+'\n')
    print(f'Built exam: {len(exam)} pages; answer: {len(answer)} pages; total points: 100')


if __name__ == '__main__':
    build()
