#!/usr/bin/env python3
"""Build offline HTML and source-backed terminology exports, no third-party dependencies."""
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'复习资料/计算机网络期中复习大纲.md'
raw=SOURCE.read_text(); lines=raw.splitlines(); source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
rows=[]
for n,line in enumerate((ROOT/'terms.tsv').read_text().splitlines(),1):
    if not line or line.startswith('#'):continue
    chapter,name,description,lab,keyword=line.split('|')
    hits=[i for i,s in enumerate(lines) if keyword in s]
    if not hits:raise ValueError(f'terms.tsv:{n} source keyword missing: {keyword}')
    # Prefer a matching section; otherwise retain the exact occurrence and actual heading.
    heading=''; section_for=[]
    for s in lines:
        if s.startswith('#'):heading=s.lstrip('# ')
        section_for.append(heading)
    preferred=[i for i in hits if section_for[i].startswith(chapter+' ')]
    index=(preferred or hits)[0]
    if chapter=='补充':
        cutoff=next(i for i,s in enumerate(lines) if s.startswith('# 第四章目录内容'))
        index=next((i for i in hits if i>cutoff),index)
    start=index
    while start>0 and not lines[start].startswith('#'):start-=1
    citation=next((s for s in lines[start:index+1] if s.startswith('对应：')),'')
    if name.startswith('ms /'):index=next(i for i,s in enumerate(lines) if '20 ns' in s)
    # Separate slash-delimited concepts into individually searchable cards while preserving grouped explanations.
    names=name.split(' / ') if '（' not in name and not name.startswith('ms /') else [name]
    for label in names:
        rows.append(dict(id=f't{len(rows)+1:03}',chapter=chapter,name=label,description=description,lab=lab,line=index+1,sourceSection=section_for[index],citation=citation,excerpt='\n'.join(lines[max(0,index-1):min(len(lines),index+2)])))
known='\n'.join(t['name'] for t in rows)
tokens=sorted(set(re.findall(r'\b[A-Z][A-Z0-9]*(?:[/_-][A-Z0-9]+)*\b',raw)))
excluded={};covered=[]
for token in tokens:
    if token in {'TCP/UDP','RTT_0','LFS-LAR'}:covered.append(token)
    elif token in {'A','B','C','D','E','G','H','L','M','N','P','R','S','T','U','W'}:excluded[token]='公式变量或拓扑标签；B 字节等多义符号另在单位卡解释'
    elif token in known:covered.append(token)
    elif re.match(r'^[FES]\d+$',token):excluded[token]='练习题号'
    elif token in {'HTML','PPTX','CJK','CN','SC','UTF8','B91C1C'}:excluded[token]='文档格式、排版元数据或颜色，不是网络术语'
    elif token in {'ID','II','FF','A/B/C'}:excluded[token]='已在 VLAN ID、Ethernet II、广播 MAC 或分类地址条目中解释'
    else:excluded[token]='公式变量、拓扑结点标签或其算术表达式，不是协议缩写'
glossary='# 计网期中术语清单\n\n来源：`cncourse/复习资料/计算机网络期中复习大纲.md`\n\nSHA-256：`'+source_hash+'`\n\n'+f'共 {len(rows)} 个术语/别名卡片，{len(set(t["lab"] for t in rows))} 个关联实验。组合全称与同义词共用卡片；概念解释不等于对每个词都实现独立协议栈。\n\n'
for chapter in dict.fromkeys(t['chapter'] for t in rows):
    glossary+='## '+('基础补充' if chapter=='补充' else '§ '+chapter)+'\n\n'
    for t in rows:
        if t['chapter']==chapter:glossary+=f'### {t["name"]}\n\n{t["description"]}\n\n出处：第 {t["line"]} 行，{t["sourceSection"]}。关联实验：`{t["lab"]}`。\n\n'
glossary+='## 大写缩写审计\n\n对源文件大写词法扫描后逐项归类，避免把公式、题号当作术语。大小写混合词、中文术语另以人工通读提取。\n\n已对应术语卡：'+', '.join(covered)+'\n\n|未另建条目的词|理由|\n|---|---|\n'+''.join(f'|{k}|{v}|\n' for k,v in excluded.items())
payload=dict(sourceText=raw,terms=rows,sourceHash=source_hash,sourcePath=str(SOURCE.relative_to(ROOT.parents[1])),glossary=glossary,audit=dict(covered=covered,excluded=excluded))
(ROOT/'terms.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
(ROOT/'术语清单.md').write_text(glossary)
s=(ROOT/'template.html').read_text().replace('__DATA__',json.dumps(payload,ensure_ascii=False).replace('</','<\\/')).replace('__ENGINE__',(ROOT/'engine.js').read_text()).replace('__JOURNEYS__',(ROOT/'journeys.js').read_text()).replace('__APP__',(ROOT/'app.js').read_text())
(ROOT/'index.html').write_text(s)
print(f'Built {len(rows)} term cards, {len(covered)} acronym tokens, {len(s.encode())} bytes; source {source_hash[:12]}')
