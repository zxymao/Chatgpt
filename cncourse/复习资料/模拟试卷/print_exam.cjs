const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const variant=process.argv[2]||'A';assert.ok(['A','B','C','D'].includes(variant),'Choose paper A, B, C or D');
const metadata=variant==='A'?null:JSON.parse(fs.readFileSync(path.join(__dirname,'exam-'+variant.toLowerCase()+'.json'),'utf8'));
const entries=[['试卷',metadata?.paper_pages.length||6],['参考答案',metadata?.answer_pages.length||6]];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1});await page.emulateMedia({media:'print'});
 for(const [kind,count]of entries){
  const stem='计网期中模拟卷'+variant+'-'+kind;
  await page.setContent(fs.readFileSync(path.join(__dirname,stem+'.html'),'utf8'));await page.evaluate(()=>document.fonts.ready);
  const layout=await page.locator('.sheet').evaluateAll(sheets=>sheets.map((sheet,i)=>({page:i+1,contentBottom:sheet.querySelector('.content').getBoundingClientRect().bottom,footerTop:sheet.querySelector('.footer').getBoundingClientRect().top,overflow:sheet.scrollWidth>sheet.clientWidth})));
  assert.equal(layout.length,count);
  for(const p of layout){assert.ok(!p.overflow,stem+' horizontal overflow page '+p.page);assert.ok(p.contentBottom<p.footerTop-6,stem+' content overlaps footer on page '+p.page+': '+JSON.stringify(p));}
  if(metadata?.print_theme==='black-and-white'){
   const colors=await page.locator('*').evaluateAll(els=>els.flatMap(el=>{const s=getComputedStyle(el);return ['color','backgroundColor','borderTopColor','borderLeftColor'].map(key=>s[key]);}));
   for(const color of colors){const v=color.match(/[\d.]+/g)?.map(Number);if(v?.length>=3&&!(v.length===4&&v[3]===0))assert.ok(v[0]===v[1]&&v[1]===v[2],stem+' non-neutral color '+color);}
  }
  await page.pdf({path:path.join(__dirname,stem+'.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.locator('.sheet').first().screenshot({path:'/tmp/'+stem+'-preview.png'});
  console.log('PASS:',stem,count,'pages, no content/footer overlap'+(metadata?.print_theme?' / '+metadata.print_theme:''));
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
