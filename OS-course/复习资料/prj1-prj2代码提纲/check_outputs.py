#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess

import fitz
from lxml import html
from prepare_sources import prepare
from todo_catalog import catalog

HERE = Path(__file__).resolve().parent
sources, manifest = prepare()
references = json.loads((HERE / "引用索引.json").read_text())
snippets = json.loads((HERE / "代码节选.json").read_text())
metadata = json.loads((HERE / "提纲元数据.json").read_text())
todos = json.loads((HERE / "TODO清单.json").read_text())
index = html.fromstring((HERE / "源码索引.html").read_text())
guide = html.fromstring((HERE / "prj1-prj2代码阅读提纲.html").read_text())
assert len(guide.xpath('//section[contains(@class,"sheet")]')) == metadata["pages"]
assert metadata["overview_pages"] == 14 and metadata["code_appendix_pages"] == 20
assert not guide.xpath('//h3|//*[@class="eyebrow"]')
articles = {a.xpath('./h2')[0].text_content(): a for a in index.xpath('//article')}
assert set(articles) == set(sources)
for key, text in sources.items():
    actual = [cell.text_content() for cell in articles[key].xpath('.//td/code')]
    expected = text.splitlines()
    assert [s.rstrip() for s in actual] == [s.rstrip() for s in expected], key
for ref in references:
    target = index.get_element_by_id(ref["anchor"])
    assert target.xpath('./td/code')[0].text_content().rstrip() == \
        sources[ref["source"]].splitlines()[ref["line"] - 1].rstrip()
    assert guide.xpath('//a[@href=$href]', href="源码索引.html#" + ref["anchor"])
for snippet in snippets:
    node = guide.get_element_by_id(snippet["id"])
    assert node.text_content().rstrip() == snippet["rendered"].rstrip(), snippet["id"]
    expected = []
    for index, selection in enumerate(snippet["selection"].split(",")):
        if index:
            expected.append("    …")
        start, end = map(int, selection.split("-"))
        lines = sources[snippet["source"]].splitlines()
        expected += [f"{n:3d}  {lines[n-1]}" for n in range(start,end+1)]
    assert "\n".join(expected) == snippet["rendered"]
assert todos == catalog(sources)
assert all(t["appendix"] in {f"A{i}" for i in range(1,21)} | {"DOC","OUT"} for t in todos)
assert any(t["source"].startswith("F2:") and 'save all general purpose' in t["marker"] for t in todos)
print(f"PASS: {len(sources)} snapshots, {len(references)} source references, {len(snippets)} verbatim snippets and {len(todos)} TODO classifications")

with fitz.open(HERE / "prj1-prj2代码阅读提纲.pdf") as pdf:
    assert len(pdf) == metadata["pages"], (len(pdf), metadata["pages"])
    for number, page in enumerate(pdf, 1):
        text = page.get_text()
        assert len(text) > 300 and "\ufffd" not in text
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    x0, y0, x1, y1 = span["bbox"]
                    assert 40 <= x0 <= x1 <= page.rect.width - 35, (number, span)
                    assert 25 <= y0 <= y1 <= page.rect.height - 8, (number, span)
    assert sum(bool(page.get_links()) for page in pdf) >= 10
print(f'PASS: {metadata["pages"]} PDF pages, original guide and 20 TODO code groups, links and page bounds')

for stage in range(1, 5):
    log = HERE / f"运行记录/stage{stage}-runner.txt"
    assert f"PASS: relocated upstream-QEMU smoke stage {stage}" in log.read_text()
print("PASS: each of four recorded QEMU stages has a successful runner result")

browser_check = r'''
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');const {chromium}=require('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const name=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(name,(err,data)=>{
  if(err){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(data)
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/prj1-prj2代码阅读提纲.html');
  await page.locator('a[href="源码索引.html#f2-arch-riscv-kernel-entry-s-L55"]').click();
  await page.waitForFunction(()=>!document.getElementById('f2-arch-riscv-kernel-entry-s').hidden);
  assert.match(await page.locator('#f2-arch-riscv-kernel-entry-s-L55').textContent(),/TODO.*callee save/);
  await page.locator('#search').fill('TODO');
  assert.equal(await page.locator('button[data-file="f2-kernel-locking-lock-c"]').isVisible(),true);
  await page.locator('button[data-file="f2-kernel-locking-lock-c"]').click();
  await page.waitForFunction(()=>!document.getElementById('f2-kernel-locking-lock-c').hidden);
  assert.match(await page.locator('#f2-kernel-locking-lock-c').textContent(),/TODO:.*acquire mutex/);
  await page.goto(base+'/prj1-prj2代码阅读提纲.html');
  await page.locator('a[href="源码索引.html#p1-init-main-c-L50"]').click();
  await page.waitForURL(/源码索引|%E6%BA%90/);
  await page.waitForFunction(()=>!document.getElementById('p1-init-main-c').hidden);
  assert.match(await page.locator('#p1-init-main-c-L50').textContent(),/int main/);
  await page.goto(base+'/源码索引.html#p2-arch-riscv-kernel-entry-s-L130');
  await page.waitForFunction(()=>!document.getElementById('p2-arch-riscv-kernel-entry-s').hidden);
  assert.match(await page.locator('#p2-arch-riscv-kernel-entry-s-L130').textContent(),/ENTRY\(switch_to\)/);
  await page.locator('#search').fill('do_scheduler');
  assert.ok(await page.locator('button[data-file]:visible').count()>1);
  await page.locator('button[data-file="p2-kernel-sched-sched-c"]').click();
  await page.waitForFunction(()=>!document.getElementById('p2-kernel-sched-sched-c').hidden);
  assert.equal(await page.locator('article:visible').count(),1);
  await context.setOffline(true);
  await page.locator('#search').fill('P1:init/main.c');
  await page.locator('button[data-file="p1-init-main-c"]').click();
  await page.waitForFunction(()=>!document.getElementById('p1-init-main-c').hidden);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/prj-source-index-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'/tmp/prj-source-index-mobile.png'});
  console.log('PASS: original F2 TODO links/search, P1/P2 links, line anchors, symbol search, switching, offline and mobile');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err);server.close();process.exit(1)});
'''
subprocess.run(["node", "-e", browser_check], cwd=HERE, check=True)
(HERE / "核对记录.json").write_text(json.dumps({
    "source_roundtrip": manifest["roundtrip"], "source_files": len(sources),
    "framework_roundtrip": manifest["framework_roundtrip"],
    "references": len(references), "pdf_pages": metadata["pages"],
    "snippets":len(snippets), "quoted_source_lines":metadata["quoted_source_lines"],
    "todo_markers":len(todos),"code_groups":metadata["code_appendix_pages"],
    "qemu_stages": [1, 2, 3, 4],
    "browser": "PASS: original F2 TODO links/search, P1/P2 links, anchors, switching, offline, mobile",
    "project1_runtime": "not run; source reading and reconstruction only",
    "course_hardware_validation": "not claimed",
}, ensure_ascii=False, indent=2) + "\n")
