const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
const page=await b.newPage();await page.route('**/*',r=>r.abort());
const stem=path.join(__dirname,'期中习题课-题目与参考答案');
await page.setContent(fs.readFileSync(stem+'.html','utf8'),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
await page.pdf({path:stem+'.pdf',format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-family:sans-serif;font-size:9px;text-align:center;width:100%;color:#333">期中习题课 · 题目与参考答案　|　第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</div>'});
console.log('PDF generated:',stem+'.pdf');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
