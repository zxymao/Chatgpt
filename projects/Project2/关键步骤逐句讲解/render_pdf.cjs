const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');
const stem='Project2-关键步骤与逐句讲解';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    await page.setContent(fs.readFileSync(path.join(__dirname,stem+'.html'),'utf8'),{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const headings=await page.locator('h1,h2,h3').evaluateAll(nodes=>nodes.map(n=>({level:Number(n.tagName.slice(1)),title:n.textContent.trim()})));
    fs.writeFileSync(path.join(__dirname,'outline-headings.json'),JSON.stringify(headings,null,2)+'\n');
    await page.emulateMedia({media:'print'});
    await page.pdf({path:path.join(__dirname,stem+'.pdf'),format:'A4',printBackground:true,tagged:true,outline:true,displayHeaderFooter:true,
      headerTemplate:'<div style="width:100%;font:8px sans-serif;color:#6c8396;padding:0 14mm">PROJECT 2　｜　关键步骤 · 完整代码 · 逐句理解</div>',
      footerTemplate:'<div style="width:100%;font:8px sans-serif;color:#6c8396;text-align:center">Task 1—4　 ·　<span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
    console.log('Rendered colored PDF with page numbers and an outline.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
