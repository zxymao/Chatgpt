const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const E=require('../src/engine.js'),{solutions}=require('./solutions.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const executablePath=process.env.CHROME_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('#editor').waitFor();
  assert.ok((await page.locator('#lesson-title').textContent()).includes('PCB'));assert.equal(await page.locator('#groups button').count(),5);
  await page.locator('#run').click();await page.locator('.result.failed').waitFor();assert.equal(await page.locator('#food-count').textContent(),'8');
  await page.locator('#editor').fill('function initPCB(){while(true){} }');await page.locator('#run').click();
  await page.locator('#result').getByText('在限定时间内完成').waitFor();assert.equal(await page.locator('#run').isEnabled(),true);
  async function complete(id){
   const group=E.lessons[id-1].group,groupIndex=E.groups.findIndex(g=>g.id===group);
   await page.locator('#groups button').nth(groupIndex).click();await page.locator(`[data-lesson="${id}"]`).click();
   await page.locator('#editor').fill(solutions[id-1]);await page.locator('#run').click();await page.locator('.result.success').waitFor();
   assert.equal(await page.locator('#trace-panel').isVisible(),true);assert.equal(await page.locator('#trace-case option').count(),E.lessons[id-1].tests.length);
   const pet=E.pets.find(p=>p.lesson===id);
   if(pet){await page.locator(`[data-action="adopt"][data-pet="${pet.id}"]`).click();assert.equal(await page.locator('#selected-name').textContent(),pet.name);
    const before=Number(await page.locator('#food-count').textContent());await page.locator('#feed').click();assert.equal(Number(await page.locator('#food-count').textContent()),before-1);}
  }
  for(let id=7;id<=24;id++)await complete(id);
  assert.equal(await page.locator('#progress-count').textContent(),'18 / 24');
  await page.locator('#trace-case').selectOption('2');assert.equal(await page.locator('.tick').count(),4);
  await page.locator('.tick').nth(1).click();assert.ok((await page.locator('#trace-caption').textContent()).includes('宠物 0'));
  await page.locator('.kernel-link summary').click();assert.ok((await page.locator('#kernel-command').textContent()).includes('MODE=student STAGE=4'));
  for(let id=1;id<=6;id++)await complete(id);
  assert.equal(await page.locator('#progress-count').textContent(),'24 / 24');assert.equal(await page.locator('#adopted-count').textContent(),'已领养 11 / 11');
  await page.reload();assert.equal(await page.locator('#progress-count').textContent(),'24 / 24');
  const download=page.waitForEvent('download');await page.locator('#export-save').click();const exported=await download;
  const saved=JSON.parse(fs.readFileSync(await exported.path(),'utf8'));assert.equal(saved.completed.length,24);
  await page.locator('#save-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('格式无效'));assert.equal(await page.locator('#progress-count').textContent(),'24 / 24');
  const target=E.create();target.drafts[7]='saved test code';
  await page.locator('#save-file').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(target))});
  await page.waitForFunction(()=>document.querySelector('#editor').value==='saved test code');assert.equal(await page.locator('#progress-count').textContent(),'0 / 24');
  const old={...target,version:1,completed:[1,2,3,4,5,6],adopted:[0,6],selected:6,lesson:6};
  await page.locator('#save-file').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
  await page.waitForFunction(()=>document.querySelector('#progress-count').textContent==='6 / 24');
  for(let id=7;id<=11;id++)await complete(id);
  await page.locator('.kernel-link').evaluate(el=>el.open=true);
  await page.screenshot({path:'/tmp/pet-kernel-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/pet-kernel-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile horizontal overflow');assert.deepEqual(errors,[]);
  await context.setOffline(true);await complete(12);
  console.log('PASS: 24 lessons, optional warmups, PCB/queue traces, tick replay, adoption/feeding, timeouts, save migration/import/export, mobile and offline');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
