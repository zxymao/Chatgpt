#!/usr/bin/env python3
from html import escape
from pathlib import Path
import json
import re
import subprocess

from prepare_sources import prepare
from todo_catalog import catalog, todo_block

HERE = Path(__file__).resolve().parent
sources, manifest = prepare()
figures = HERE / "figures"
figures.mkdir(exist_ok=True)


def file_id(key):
    return re.sub(r"[^a-z0-9_-]", "-", key.lower())


assert len({file_id(k) for k in sources}) == len(sources)


def svg(content, height):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="{height}" '
            f'viewBox="0 0 900 {height}"><style>'
            'text{font:18px "Noto Sans CJK SC",sans-serif;fill:#183047}'
            '.box{fill:#f0f4f7;stroke:#7f99ac;stroke-width:1.4}'
            '.small{font-size:15px;fill:#5f7586}'
            'line,path{stroke:#7891a3;stroke-width:1.5;fill:none}</style>' + content + '</svg>')


(figures / "disk_image.svg").write_text(svg('''
<rect class="box" x="5" y="12" width="175" height="72" rx="5"/>
<rect class="box" x="185" y="12" width="175" height="72" rx="5"/>
<rect class="box" x="365" y="12" width="145" height="72" rx="5"/>
<rect class="box" x="515" y="12" width="145" height="72" rx="5"/>
<rect class="box" x="665" y="12" width="230" height="72" rx="5"/>
<text x="92" y="42" text-anchor="middle">bootblock</text>
<text class="small" x="92" y="67" text-anchor="middle">第0扇区 · 512B</text>
<text x="272" y="42" text-anchor="middle">kernel</text>
<text class="small" x="272" y="67" text-anchor="middle">起点offset=512</text>
<text x="438" y="42" text-anchor="middle">task 0</text>
<text class="small" x="438" y="67" text-anchor="middle">代码/数据</text>
<text x="588" y="42" text-anchor="middle">task 1…</text>
<text class="small" x="588" y="67" text-anchor="middle">代码/数据</text>
<text x="780" y="42" text-anchor="middle">task_info[]</text>
<text class="small" x="780" y="67" text-anchor="middle">名称 · 偏移 · 大小 · 入口</text>
<text class="small" x="450" y="116" text-anchor="middle">读取位置由字节偏移描述；按512B扇区读取后，还要处理扇区内偏移</text>
''', 135))
(figures / "initial_stack.svg").write_text(svg('''
<line x1="65" y1="20" x2="795" y2="20"/>
<text x="555" y="13">高地址：ktop（内核栈顶）</text>
<rect class="box" x="65" y="20" width="450" height="106"/>
<text x="85" y="52">regs_context_t · 288字节</text>
<text class="small" x="85" y="80">sepc=entry，保存的任务sp=utop</text>
<text class="small" x="85" y="106">32个GPR槽位 + sstatus/sepc/stval/scause</text>
<text x="555" y="130">regs = ktop − 288</text>
<rect class="box" x="65" y="126" width="450" height="85"/>
<text x="85" y="157">switchto_context_t · 112字节</text>
<text class="small" x="85" y="186">ra=ret_from_exception，保存的sp=sw</text>
<line x1="515" y1="211" x2="795" y2="211"/>
<text x="555" y="202">sw = regs − 112</text>
<text class="small" x="555" y="237">初始task-&gt;kernel_sp指向这里</text>
<text class="small" x="85" y="256">低地址方向：后续内核调用继续向下使用栈空间 ↓</text>
''', 278))

articles = []
buttons = []
for key, content in sources.items():
    prefix = file_id(key)
    buttons.append(f'<button data-file="{prefix}" type="button">{escape(key)}</button>')
    rows = []
    for number, line in enumerate(content.splitlines(), 1):
        anchor = f"{prefix}-L{number}"
        rows.append(f'<tr id="{anchor}"><th><a href="#{anchor}">{number}</a></th>'
                    f'<td><code>{escape(line) or " "}</code></td></tr>')
    articles.append(f'<article id="{prefix}" hidden><h2>{escape(key)}</h2>'
                    '<table>' + ''.join(rows) + '</table></article>')
index_html = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>prj1 / prj2 源码索引</title><style>
*{box-sizing:border-box}body{margin:0;color:#193047;font:14px/1.65 system-ui,"Noto Sans CJK SC",sans-serif}
header{padding:16px 22px;border-bottom:1px solid #d3dde5;background:#f1f5f8}
h1{font-size:22px;margin:0 0 5px}header p{margin:3px 0}a{color:#245d8a}
.layout{display:grid;grid-template-columns:340px minmax(0,1fr);height:calc(100vh - 140px)}
nav{overflow:auto;border-right:1px solid #d3dde5;padding:14px}
nav input{width:100%;padding:10px;border:1px solid #9dafbd;border-radius:5px;font:inherit}
#count{padding:6px 0;color:#6a7c8c}nav button{display:block;width:100%;text-align:left;overflow-wrap:anywhere;
padding:7px 9px;background:white;border:0;cursor:pointer;color:#294a61;font:12px/1.55 monospace}
nav button.active{background:#e5eef5;font-weight:700}nav button[hidden]{display:none}
main{overflow:auto;padding:12px 20px 50px}article[hidden]{display:none}h2{font-size:17px;overflow-wrap:anywhere}
table{border-collapse:collapse;width:max-content;min-width:100%;font:12px/1.65 "DejaVu Sans Mono","Noto Sans Mono CJK SC",monospace}
th{width:48px;text-align:right;background:#f3f6f8;font-weight:400;padding:0 9px;color:#7c8c98;vertical-align:top}
th a{color:inherit;text-decoration:none}td{white-space:pre;padding:0 10px}tr:target{background:#fff0bc}
code{font:inherit}#empty{padding:25px;color:#60778a}
@media(max-width:760px){.layout{grid-template-columns:1fr;height:auto}nav{max-height:250px;border-right:0;border-bottom:1px solid #ccc}main{max-height:75vh;padding:10px}header{padding:12px}h1{font-size:20px}}
</style><header><h1>prj1 / prj2 源码索引</h1>
<p>搜索文件名、函数名或TODO，选择文件；点击行号可复制定位链接。P1为实验一，F2为未填实现的实验二原框架，P2为完成版。</p>
<p><a href="prj1-prj2代码阅读提纲.html">返回阅读提纲</a> · 原文件中的版权与许可证文字均保留。</p></header>
<div class="layout"><nav><label for="search">搜索源码</label><input id="search" placeholder="例如 do_scheduler 或 init/main.c">
<div id="count"></div><div id="files">''' + ''.join(buttons) + '''</div></nav>
<main><p id="empty">选择左侧文件开始阅读。</p>''' + ''.join(articles) + '''</main></div>
<script>
const buttons=[...document.querySelectorAll('button[data-file]')];
const articles=[...document.querySelectorAll('article')];
const haystack=new Map(articles.map(a=>[a.id,(a.id+' '+a.textContent).toLowerCase()]));
function openHash(){
 const id=decodeURIComponent(location.hash.slice(1));
 const node=document.getElementById(id);
 if(!node)return;
 const article=node.matches('article')?node:node.closest('article');
 if(!article)return;
 document.getElementById('empty').hidden=true;
 articles.forEach(a=>a.hidden=a!==article);
 buttons.forEach(b=>b.classList.toggle('active',b.dataset.file===article.id));
 requestAnimationFrame(()=>node.scrollIntoView({block:'center'}));
}
buttons.forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.file+'-L1';openHash()}));
document.getElementById('search').addEventListener('input',event=>{
 const q=event.target.value.toLowerCase();let n=0;
 buttons.forEach(b=>{b.hidden=!haystack.get(b.dataset.file).includes(q);if(!b.hidden)n++});
 document.getElementById('count').textContent=n+' 个文件';
});
document.getElementById('count').textContent=buttons.length+' 个文件';
addEventListener('hashchange',openHash);
if(location.hash)openHash();else{location.hash='p1-init-main-c-L50';openHash()}
</script></html>'''
(HERE / "源码索引.html").write_text(index_html)

references = []
snippets = []
todos = catalog(sources)


def replace_ref(match):
    project, path, number = match.groups()
    key = project + ":" + path
    number = int(number)
    assert key in sources and 1 <= number <= len(sources[key].splitlines()), match[0]
    anchor = f"{file_id(key)}-L{number}"
    references.append({"source": key, "line": number, "anchor": anchor})
    return f"[{project} {path}:{number}](源码索引.html#{anchor})"


def replace_todo(match):
    project, path, number = match.groups()
    key = project + ":" + path
    lines = sources[key].splitlines()
    number = int(number)
    assert "TODO" in lines[number - 1], match[0]
    original = todo_block(lines, number)
    clean = []
    for line in original.splitlines():
        line = line.replace("*/", "")
        line = re.sub(r"^\s*(?:/\*|//|\*)?\s*", "", line)
        if line.strip():
            clean.append(line.strip())
    marker = " ".join(clean).strip()
    ref = replace_ref(re.match(r"(P1|P2|F2):([^:]+):(\d+)", f"{project}:{path}:{number}"))
    return f'> **原TODO**（{ref}）：<br>\n> <code>{escape(marker)}</code>'


def replace_code(match):
    project, path, selection = match.groups()
    key = project + ":" + path
    lines = sources[key].splitlines()
    output = []
    for index, part in enumerate(selection.split(",")):
        start, end = map(int, part.split("-"))
        assert 1 <= start <= end <= len(lines)
        if index:
            output.append("    …")
        output += [f"{number:3d}  {lines[number-1]}" for number in range(start, end + 1)]
    text = "\n".join(output)
    identifier = f"source-code-{len(snippets) + 1}"
    snippets.append({"id": identifier, "source": key, "selection": selection,
                     "source_lines": [],
                     "rendered": text})
    source_lines = []
    for part in selection.split(","):
        start, end = map(int, part.split("-"))
        source_lines.extend(range(start, end + 1))
    snippets[-1]["source_lines"] = source_lines
    encoded = escape(text).replace("\t", "&#9;")
    encoded = re.sub(r" +(?=\n|$)", lambda match: "&#32;" * len(match[0]), encoded)
    return f'<pre class="source-snippet" id="{identifier}"><code>{encoded}</code></pre>'


overview = (HERE / "提纲正文.md").read_text()
overview_pages = len(overview.split("<!-- PAGE -->"))
appendix = (HERE / "TODO代码附录.md").read_text()
body = overview + "\n\n<!-- PAGE -->\n\n" + appendix
body = body.replace("{{COMMIT}}", manifest["commit"][:12])
body = re.sub(r"\{\{ref:(P1|P2|F2):([^:}]+):(\d+)\}\}", replace_ref, body)
body = re.sub(r"\{\{todo:(P1|P2|F2):([^:}]+):(\d+)\}\}", replace_todo, body)
body = re.sub(r"\{\{code:(P1|P2|F2):([^:}]+):([\d,-]+)\}\}", replace_code, body)
assert "{{" not in body
(HERE / "prj1-prj2代码阅读提纲.md").write_text(body)
(HERE / "引用索引.json").write_text(json.dumps(references, ensure_ascii=False, indent=2) + "\n")
(HERE / "代码节选.json").write_text(json.dumps(snippets, ensure_ascii=False, indent=2) + "\n")
(HERE / "TODO清单.json").write_text(json.dumps(todos, ensure_ascii=False, indent=2) + "\n")
todo_markdown = ["# 原源码TODO任务清单", "",
                 "P1为实验一，F2为未填实现的实验二原框架，P2为完成版。每个标记都列出归属，已完成和后续项目的标记分别注明。", ""]
last_source = None
for item in todos:
    key = item["source"]
    if key != last_source:
        todo_markdown.extend(["## " + key, ""])
        last_source = key
    location = f"源码索引.html#{file_id(key)}-L{item['line']}"
    todo_markdown.extend([
        f"- [{key}:{item['line']}]({location}) · {item['appendix']} · {item['status']}",
        "", "```text", "\n".join(line.rstrip() for line in item["original_block"].splitlines()), "```", "",
    ])
(HERE / "TODO任务清单.md").write_text("\n".join(todo_markdown))

sections = []
for number, section in enumerate(body.split("<!-- PAGE -->"), 1):
    rendered = subprocess.run(["pandoc", "-f", "markdown+raw_html", "-t", "html5"],
                              input=section, text=True, capture_output=True, check=True).stdout
    rendered = re.sub(r'<img\s+[^>]*src="figures/([^"/]+\.svg)"[^>]*>',
                      lambda m: (figures / m[1]).read_text(), rendered)
    section_class = "sheet code-appendix" if number > overview_pages + 1 else "sheet"
    sections.append(f'<section class="{section_class}" data-page="{number}">' + rendered + '</section>')
css = '''
@page{size:A4;margin:14mm 17mm 19mm}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:9.6pt/1.65 "Noto Sans CJK SC",sans-serif;color:#172d41}
.sheet{break-after:page}.sheet:last-child{break-after:auto}
h1{font-size:22pt;line-height:1.4;margin:5px 0 15px}
h2{font-size:14pt;line-height:1.45;margin:13px 0 10px;break-after:avoid}
.sheet>h2:first-child{font-size:17pt;margin-top:5px;margin-bottom:14px}
p{margin:8px 0;text-align:left}a{color:#2d6082;text-decoration:none;overflow-wrap:anywhere}
code,pre{font-family:"DejaVu Sans Mono","Noto Sans Mono CJK SC",monospace}
p code,li code,td code{font-size:8.3pt;overflow-wrap:anywhere}
pre{font-size:8pt;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;
margin:9px 0;padding:9px 11px;background:#f1f5f8;break-inside:avoid}
.code-appendix pre{font-size:7.7pt;line-height:1.4;padding:7px 10px}
.code-appendix>h2:first-child{font-size:16pt;margin-bottom:10px}
.code-appendix p{margin:7px 0}
blockquote{margin:8px 0;padding:6px 10px;border-left:2px solid #8395a4;background:#f7f9fb;
font-size:8.7pt;line-height:1.5;break-inside:avoid}
blockquote p{margin:0}blockquote code{font-size:8pt;overflow-wrap:anywhere}
ul,ol{padding-left:20px;margin:8px 0}li{margin:5px 0}
table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:9px 0}
th{background:#eaf0f5;text-align:left}th,td{padding:6px 8px;border-bottom:1px solid #cfdae2}
tr{break-inside:avoid}figure{margin:12px 0}svg{width:100%;height:auto;display:block}
figcaption{font-size:8pt;text-align:center;color:#667f91;margin-top:4px}
@media screen{body{max-width:900px;margin:auto;padding:28px;background:#fff}
.sheet{padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid #d5e0e8}}
'''
html = ('<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>prj1 → prj2 代码阅读提纲</title><style>' + css + '</style><body>'
        + ''.join(sections) + '</body></html>')
(HERE / "prj1-prj2代码阅读提纲.html").write_text(html)

renderer = r'''
const fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  await page.setContent(fs.readFileSync('prj1-prj2代码阅读提纲.html','utf8'));
  await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
  await page.pdf({path:'prj1-prj2代码阅读提纲.pdf',format:'A4',preferCSSPageSize:true,
   printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
   footerTemplate:'<div style="width:100%;font-size:8px;text-align:right;color:#71808d;margin:0 17mm">'+
   '<span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
'''
subprocess.run(["node", "-e", renderer], cwd=HERE, check=True)

# Chromium's about:blank print job omits relative HTML link annotations.
# Add portable relative targets explicitly to the generated PDF.
import fitz
with fitz.open(HERE / "prj1-prj2代码阅读提纲.pdf") as pdf:
    for ref in {(r["source"], r["line"]): r for r in references}.values():
        project, path = ref["source"].split(":", 1)
        label = f'{project} {path}:{ref["line"]}'
        found = False
        for page in pdf:
            for rect in page.search_for(label):
                page.insert_link({"kind": fitz.LINK_URI, "from": rect,
                                  "uri": "源码索引.html#" + ref["anchor"]})
                found = True
        assert found, f"PDF source reference not found: {label}"
    for page in pdf:
        for rect in page.search_for("源码索引.html"):
            page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": "源码索引.html"})
    pdf.set_metadata({"title": "prj1 → prj2 代码阅读提纲"})
    pdf.saveIncr()
print(f"PASS: {len(sections)} guide sections, {len(references)} source references, {len(sources)} source files")
metadata = {"pages": len(sections), "overview_pages": overview_pages,
            "todo_intro_pages": 1, "code_appendix_pages": len(sections) - overview_pages - 1,
            "references": len(references), "source_files": len(sources),
            "snippets": len(snippets), "quoted_source_lines": sum(len(s["source_lines"]) for s in snippets),
            "todo_markers": len(todos),
            "todo_by_version": {key: sum(t["source"].startswith(key + ":") for t in todos)
                                for key in ["P1", "F2", "P2"]}}
(HERE / "提纲元数据.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
print("TODO / code appendix:", json.dumps(metadata, ensure_ascii=False))
