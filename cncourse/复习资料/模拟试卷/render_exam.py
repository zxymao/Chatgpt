"""Render new exam variants from structured data; paper A stays unchanged."""
from pathlib import Path
import html,json
E=html.escape
SECTIONS={1:'一、单项选择题（每题 2 分，共 20 分）',11:'二、填空题（每空 1 分，共 10 分）',16:'三、简答题（每题 5 分，共 20 分）',20:'四、计算与过程题（共 50 分，须写过程）'}
def table(t):
 return '<table><thead><tr>'+''.join('<th>'+E(c)+'</th>' for c in t['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+E(str(c))+'</td>' for c in row)+'</tr>' for row in t['rows'])+'</tbody></table>'
def references(x):
 return '；'.join(('基础补充' if r['section']=='补充' else '§ '+r['section'])+'，第 '+str(r['line'])+' 行' for r in x['sources'])
def question(x,answers=False):
 out='<article class="question"><h3>'+str(x['id'])+'. '+E(x['stem'])+' <span class="points">（'+str(x['score'])+' 分）</span></h3>'
 if answers:
  if 'key' in x:out+='<p class="key">答案：'+E(x['key'])+'</p>'
  for key in ['answer_table','answer_table2']:
   if key in x:out+=table(x[key])
  out+='<ul class="solutions">'+''.join('<li>'+E(s)+'</li>' for s in x['answer'])+'</ul><p class="reference">提纲出处：'+E(references(x))+'</p>'
 else:
  if 'options' in x:out+='<div class="options">'+''.join('<p><b>'+chr(65+i)+'.</b> '+E(t)+'</p>' for i,t in enumerate(x['options']))+'</div>'
  if 'parts' in x:out+='<ol class="parts">'+''.join('<li>'+E(s)+'</li>' for s in x['parts'])+'</ol>'
  for key in ['table','table2']:
   if key in x:
    if x.get(key+'_caption'):out+='<p class="subcaption">'+E(x[key+'_caption'])+'</p>'
    out+=table(x[key])
  if x['kind']=='简答':out+='<div class="write-space" style="height:120px"></div>'
  elif x['kind']=='计算':out+='<div class="write-space" style="height:'+str(x.get('space',60))+'px"></div>'
 return out+'</article>'
def doc(meta,style,answers=False):
 pages=meta['answer_pages' if answers else 'paper_pages'];qs={x['id']:x for x in meta['questions']};all_pages=[];v=meta['variant']
 for pi,ids in enumerate(pages):
  content='<div class="running-head"><span>计算机网络 · 第一至四章</span><span>'+('参考答案与评分标准' if answers else '期中模拟试卷 '+v+' · 100 分 / 120 分钟')+'</span></div>'
  if pi==0:
   content+='<h1>'+('模拟卷 '+v+' · 参考答案与评分标准' if answers else meta['title'])+'</h1><p class="subtitle">'+('建议完成试卷后再打开 · 总分 100 分' if answers else '第一至四章 · 100 分 · 建议用时 120 分钟')+'</p>'
   if answers:content+='<div class="notice">评分原则：按过程给分。方法正确但非关键算术失误可保留方法分；后问合理沿用前问错误数值时，不重复扣同一错误。简答允许等价表述。表格各字段分值见对应题目答案。</div>'
   else:content+='<div class="identity"><span>姓名：____________</span><span>班级：____________</span><span>日期：____________</span></div><div class="instructions"><p>1. 范围为计网提纲第一至四章；目录补充仅考基础辨析，不涉及第五章专门机制。</p><p>2. 共 25 题；单选只有一个正确选项。计算与过程题须写中间步骤和单位，可使用普通计算器。</p><p>3. 1 B=8 bit，M=10⁶；KB/MB 按十进制。各题局部假设优先；空间不足可另附纸。</p></div>'
  for id in ids:
   if id in SECTIONS:content+='<h2 class="section-title">'+SECTIONS[id]+'</h2>'
   elif id==6 and not answers:content+='<h2 class="section-title">一、单项选择题（续）</h2>'
   elif pi>0 and id==ids[0] and id>=20:content+='<h2 class="section-title">四、计算与过程题（续）</h2>'
   x=qs[id]
   if answers and id<=15:
    content+='<article class="question"><h3><b>'+str(id)+'. '+E(x['key'])+'</b> <span class="points">（'+str(x['score'])+' 分）</span></h3><p style="font-size:8.7pt;margin:3px 0">'+E(' '.join(x['answer']))+'</p></article>'
   else:content+=question(x,answers)
  if answers and pi==len(pages)-1:
   content+='<div class="notice"><b>按失分环节复盘</b><br>异速流水线 → 时延与交换；反码求和/CRC → CRC 与检错；丢帧过程 → ARQ；码片 → 复用；竞争条件 → 接入竞争；根端口 → 生成树；再次分片 → IPv4 分片。<br>实验入口：https://zxymao.github.io/Chatgpt/cncourse/network-lab/</div><p class="reference">来源：'+E(meta['source'])+'<br>SHA-256：'+meta['source_sha256']+'</p>'
  all_pages.append('<section class="sheet '+('answer' if answers else '')+(' compact' if pi<2 else '')+(' dense' if pi==4 and not answers else '')+'"><div class="content">'+content+'</div><div class="footer"><span>NET / FIELD · 模拟卷 '+v+(' 参考答案' if answers else ' · 试卷不含答案')+'</span><span>第 '+str(pi+1)+' / '+str(len(pages))+' 页</span></div></section>')
 return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>计网期中模拟卷'+v+('-参考答案' if answers else '-试卷')+'</title><style>'+style+'</style></head><body>'+''.join(all_pages)+'</body></html>'
def mdtable(t):
 return '|'+ '|'.join(t['headers'])+'|\n|'+ '|'.join('---' for _ in t['headers'])+'|\n'+''.join('|'+ '|'.join(str(v) for v in row)+'|\n' for row in t['rows'])+'\n'
def markdown(meta,answers=False):
 out='# '+meta['title']+(' · 参考答案与评分标准' if answers else '')+'\n\n第一至四章｜100 分｜120 分钟\n\n'
 if not answers:out+='1 B=8 bit，M=10⁶；计算题须写过程和单位；空间不足可另附纸。\n\n'
 for x in meta['questions']:
  if x['id'] in SECTIONS:out+='## '+SECTIONS[x['id']]+'\n\n'
  out+='### '+str(x['id'])+'. '+x['stem']+'（'+str(x['score'])+' 分）\n\n'
  if answers:
   if 'key' in x:out+='**答案：'+x['key']+'**\n\n'
   for key in ['answer_table','answer_table2']:
    if key in x:out+=mdtable(x[key])
   out+='\n'.join('- '+a for a in x['answer'])+'\n\n提纲出处：'+references(x)+'。\n\n'
  else:
   if 'options' in x:out+='\n'.join(chr(65+i)+'. '+v for i,v in enumerate(x['options']))+'\n\n'
   if 'parts' in x:out+='\n'.join(str(i+1)+'. '+v for i,v in enumerate(x['parts']))+'\n\n'
   for key in ['table','table2']:
    if key in x:
     if x.get(key+'_caption'):out+=x[key+'_caption']+'\n\n'
     out+=mdtable(x[key])
 return out.rstrip()+'\n'
def write_exam(meta,root):
 ids=[x['id'] for x in meta['questions']]
 for key in ['paper_pages','answer_pages']:assert [i for p in meta[key] for i in p]==ids
 (root/('exam-'+meta['variant'].lower()+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 style=(root/'exam_print.css').read_text()
 for answer in [False,True]:
  stem='计网期中模拟卷'+meta['variant']+('-参考答案' if answer else '-试卷')
  (root/(stem+'.html')).write_text(doc(meta,style,answer))
  (root/(stem+'.md')).write_text(markdown(meta,answer))
 print(f'Built paper {meta["variant"]}: {len(ids)} questions, {meta["score"]} points, {len(meta["paper_pages"])} question pages, {len(meta["answer_pages"])} answer pages')
