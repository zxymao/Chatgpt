const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const E=require('../src/engine.js');
// Kept separate from the test runner so browser verification has no Node test side effects.
const solutions=[
 'function measure(s){let n=0;while(n<s.length&&s[n]!=="\\0")n++;return n;}',
 'function takePage(a){for(let i=0;i<a.length;i++)if(a[i]===0){a[i]=1;return i;}return -1;}',
 'function chooseNext(s,c){for(let n=1;n<=s.length;n++){const i=(c+n)%s.length;if(s[i]==="READY")return i;}return -1;}',
 'function service(n,p){if(n!==1)return -38;if(!Number.isInteger(p)||p<0||p>2)return -14;return "feed:"+p;}',
 'function canWake(n,d){return n>=d;}',
 'function parseCommand(s){s=s.trim();const i=s.indexOf(" "),c=i<0?s:s.slice(0,i),a=i<0?"":s.slice(i+1).trim();if((c==="feed"||c==="echo")&&a)return {command:c,argument:a};if(c==="help"&&!a)return {command:c,argument:""};return {command:"unknown",argument:""};}'
];
const html=fs.readFileSync(path.join(__dirname,'../index.html'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const executablePath=process.env.CHROME_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('dialog',d=>d.accept());
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('#editor').waitFor();
  assert.equal(await page.locator('.chapter:disabled').count(),5);
  await page.locator('#run').click();await page.locator('.result.failed').waitFor();assert.equal(await page.locator('#food-count').textContent(),'8');
  await page.locator('#editor').fill('function measure(s){while(true){} }');await page.locator('#run').click();await page.locator('#result').getByText('在限定时间内完成').waitFor();
  assert.equal(await page.locator('#run').isEnabled(),true);assert.equal(await page.locator('#food-count').textContent(),'8');
  for(let id=1;id<=6;id++){
   await page.locator('#editor').fill(solutions[id-1]);await page.locator('#run').click();await page.locator('.result.success').waitFor();
   await page.locator(`[data-action="adopt"][data-pet="${id}"]`).click();
   assert.equal(await page.locator('#selected-name').textContent(),E.pets[id].name);
   const before=Number(await page.locator('#food-count').textContent());await page.locator('#feed').click();assert.equal(Number(await page.locator('#food-count').textContent()),before-1);
   if(id<6)await page.locator('#next-lesson').click();
  }
  assert.equal(await page.locator('#progress-count').textContent(),'6 / 6');assert.equal(await page.locator('#adopted-count').textContent(),'已领养 7 / 7');
  await page.locator('.kernel-link summary').click();assert.ok((await page.locator('#kernel-command').textContent()).includes('LAB=6'));
  await page.reload();assert.equal(await page.locator('#progress-count').textContent(),'6 / 6');assert.equal(await page.locator('#selected-name').textContent(),'内核小龙');
  const download=page.waitForEvent('download');await page.locator('#export-save').click();const exported=await download;
  const saved=JSON.parse(fs.readFileSync(await exported.path(),'utf8'));assert.equal(saved.completed.length,6);
  await page.locator('#save-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('格式无效'));assert.equal(await page.locator('#progress-count').textContent(),'6 / 6');
  const target=E.create();target.drafts[1]='saved test code';
  await page.locator('#save-file').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(target))});await page.waitForFunction(()=>document.querySelector('#editor').value==='saved test code');assert.equal(await page.locator('#progress-count').textContent(),'0 / 6');
  await page.locator('#editor').fill(solutions[0]);await page.locator('#run').click();await page.locator('.result.success').waitFor();await page.locator('[data-action="adopt"][data-pet="1"]').click();
  await page.screenshot({path:'/tmp/pet-kernel-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/pet-kernel-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile horizontal overflow');
  assert.deepEqual(errors,[]);
  // No backend/network is needed after loading the standalone page.
  await context.setOffline(true);
  await page.locator('#next-lesson').click();await page.locator('#editor').fill(solutions[1]);
  await page.locator('#run').click();await page.locator('.result.success').waitFor();
  console.log('PASS: browser failures/timeouts, six levels, adoption, feeding, save reload/import/export, mobile, offline execution');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
