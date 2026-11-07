#!/usr/bin/env python3
"""Assemble supplied questions and verified answers into a printable handout."""
from pathlib import Path
import html,json,re
ROOT=Path(__file__).resolve().parent
source=(ROOT/'简要讲解与参考答案.md').read_text()
question_data=json.loads((ROOT/'results'/'handout-questions.json').read_text())
questions=question_data['questions']
slide_refs=question_data['sources']
headings=re.findall(r'^## 作业 ([1-7])：([^\n]+)',source,re.M)
headings={int(n):re.sub(r'（.*','',s).strip() for n,s in headings}
positions=list(re.finditer(r'^\*\*([1-7]\.[1-4])\s',source,re.M))
answers={}
for i,m in enumerate(positions):
    end=positions[i+1].start() if i+1<len(positions) else source.index('\n## 附件与复现')
    a=source[m.start():end]
    a=re.sub(r'^## .*\n','',a,flags=re.M).strip()
    a=re.sub(r'^\*\*\d\.\d\s*','**参考答案：',a)
    answers[m[1]]=a
assert set(answers)==set(questions) and len(questions)==19
intro='''# 期中习题课：题目与参考答案

**题干 · 结论 · 关键解释**

依据《期中习题课.pptx》和补充的《作业2 (2).docx》整理，共 7 组、19 题。2.3 原代码取自 DOCX；图片中的表格和伪代码已转写，保留必要条件。参考解法保持简洁，实验数字沿用已验证的实际运行记录。

阅读提示：先看题目，再看紧接的答案；编程题给出关键思路与示意，完整 C 文件和原始日志在配套代码包中。各题的来源按 PPT 文件页序标注。

'''
parts=[intro]
for group in range(1,8):
    parts.append(f'## 作业 {group}：{headings[group]}\n')
    for q,question in questions.items():
        if int(q[0])!=group:continue
        assert len(question)>30, q
        parts.append(f'### 题目 {q}\n\n来源：{slide_refs[q]}。\n\n'+question+'\n\n'+answers[q]+'\n')
parts.append('''## 使用说明

本资料侧重理解，不把实验耗时当作固定标准答案。完整程序、真实输出与复核脚本见同目录 code、results；4.4 因 cgroup 不可写未执行配置实验，5.3 的 CPU 时间来自 getrusage，未冒充 iostat 数据。

编译：`make -C code -j2`。数学与交错验证：`python3 verify_models.py`。重跑实验：`python3 run_experiments.py`。

环境：Linux 6.18.57、x86-64、glibc 2.41、GCC 14.2.0。原始参考答案与运行记录保留在配套文件夹中。
''')
md='\n\n'.join(parts)
(ROOT/'期中习题课-题目与参考答案.md').write_text(md)

# A small renderer for the Markdown constructs used in this handout.
def inline(s):
    s=html.escape(s)
    s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'\[([^]]+)\]\((https?://[^)]+)\)',r'<a href="\2">\1</a>',s)
    return s
lines=md.splitlines();out=[];i=0
while i<len(lines):
    line=lines[i]
    if not line.strip():i+=1;continue
    if line.startswith('```'):
        content=[];i+=1
        while i<len(lines) and not lines[i].startswith('```'):content.append(lines[i]);i+=1
        out.append('<pre>'+html.escape('\n'.join(content))+'</pre>');i+=1;continue
    if line.startswith('#'):
        level=len(line)-len(line.lstrip('#'));title=line[level:].strip()
        out.append(f'<h{level}>'+inline(title)+f'</h{level}>');i+=1;continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].startswith('|'):
            cells=[x.strip() for x in lines[i].strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?',x) for x in cells):rows.append(cells)
            i+=1
        out.append('<table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in r)+'</tr>' for r in rows[1:])+'</tbody></table>');continue
    if re.match(r'^(- |\d+\. )',line):
        ordered=bool(re.match(r'^\d+\. ',line));tag='ol' if ordered else 'ul';items=[]
        pattern=r'^\d+\. ' if ordered else r'^- '
        while i<len(lines) and re.match(pattern,lines[i]):
            items.append(re.sub(pattern,'',lines[i]));i+=1
        out.append('<'+tag+'>'+''.join('<li>'+inline(x)+'</li>' for x in items)+'</'+tag+'>');continue
    p=[]
    while i<len(lines) and lines[i].strip() and not re.match(r'^(#|```|\||- |\d+\. )',lines[i]):p.append(lines[i]);i+=1
    if p:out.append('<p>'+inline('<br>'.join(p)).replace('&lt;br&gt;','<br>')+'</p>')
    else:i+=1
css='''
@page{size:A4;margin:16mm 17mm 17mm}*{box-sizing:border-box}
body{font-family:'Noto Serif CJK SC','Noto Sans CJK SC',serif;color:#111;font-size:10.5pt;line-height:1.55;margin:0}
h1{font-size:22pt;margin:0 0 5mm;line-height:1.35}h2{font-size:15pt;border-bottom:1pt solid #222;padding:0 0 2mm;margin:7mm 0 4mm;break-after:avoid}
h2:not(:first-of-type){break-before:auto}h3{font-size:12.5pt;margin:6mm 0 2mm;break-after:avoid}
p{margin:1.5mm 0 2mm;orphans:3;widows:3}h3+p{font-size:8.5pt;color:#444;margin:0 0 3mm;break-after:avoid}
pre{font-family:'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace;font-size:8.5pt;line-height:1.5;background:#f7f7f7;border:.5pt solid #bbb;padding:3mm;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid;margin:3mm 0}
code{font-family:'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace;font-size:.88em}pre code{font-size:inherit}
table{border-collapse:collapse;width:100%;font-size:9.3pt;line-height:1.55;margin:3mm 0;break-inside:avoid}th,td{border:.5pt solid #888;padding:1.7mm 2mm;text-align:left;overflow-wrap:anywhere}th{background:#f0f0f0}
ul,ol{padding-left:6mm;margin:2mm 0 3mm}li{margin-bottom:1.5mm;orphans:2;widows:2}a{color:#111;text-decoration:underline}
'''
(ROOT/'期中习题课-题目与参考答案.html').write_text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>期中习题课：题目与参考答案</title><style>'+css+'</style></head><body>'+''.join(out)+'</body></html>')
(ROOT/'results'/'handout-questions.json').write_text(json.dumps({'questions':questions,'sources':slide_refs},ensure_ascii=False,indent=2)+'\n')
print('Built 19 questions with corresponding verified answers.')
