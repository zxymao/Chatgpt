const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../src/engine.js');
const root=path.resolve(__dirname,'../../..');
const out=process.env.SCREENSHOT_DIR||path.resolve('/tmp/os-quest-screenshots');
const serve=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);});
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>serve.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${serve.address().port}/OS-course/os-quest/index.html`;
  const executable=process.env.CHROME_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
  const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const errors=[], ctx=await browser.newContext({viewport:{width:1440,height:1080}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const initial=E.create();initial.questionId='c1-01';delete initial.contentRevision;delete initial.training;delete initial.flowDraft;
    await ctx.addInitScript(s=>{if(!localStorage.getItem('os-quest-v1'))localStorage.setItem('os-quest-v1',JSON.stringify(s));},initial);
    await page.goto(url);await page.locator('#question-title').waitFor();assert.equal(await page.locator('.option').count(),4);
    const backupKey='os-quest-v1-before-world-update';
    assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),backupKey),initial);
    const beforeBackupDownload=await page.evaluate(()=>localStorage.getItem('os-quest-v1'));
    const backupDownload=page.waitForEvent('download');await page.locator('[data-do="export-backup"]').click();const backupFile=await backupDownload;
    assert.deepEqual(JSON.parse(fs.readFileSync(await backupFile.path(),'utf8')),initial);
    assert.equal(await page.evaluate(()=>localStorage.getItem('os-quest-v1')),beforeBackupDownload);
    assert.equal(await page.locator('#submit-answer').isDisabled(),true);
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    await page.keyboard.press('2');await page.keyboard.press('Enter');await page.locator('.feedback.success').waitFor();assert.ok((await page.locator('.feedback-numbers').textContent()).includes('EXP'));
    const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).xp);await page.reload();await page.locator('.feedback.success').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).xp),xp);
    await page.locator('[data-do="next"]').click();await page.locator('[data-view="map"]').first().click();assert.equal(await page.locator('.chapter-tile:disabled').count(),7);
    await page.locator('[data-view="library"]').first().click();assert.equal(await page.locator('.study-item').count(),16);await page.locator('summary').first().click();assert.ok(await page.locator('details[open]').count());
    await page.locator('[data-view="battle"]').first().click();await page.locator('[data-do="help"]').click();assert.equal(await page.locator('dialog').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);
    await page.locator('[data-do="rename"]').click();await page.locator('#hero-name').fill('<img onerror=1>');await page.locator('#rename-form button').click();assert.ok((await page.locator('.name-button').textContent()).includes('<img'));assert.equal(await page.locator('.name-button img').count(),0);
    const boolean=E.create();boolean.questionId='c1-05';await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),boolean);await page.reload();assert.equal(await page.locator('.option').count(),2);await page.keyboard.press('2');await page.keyboard.press('Enter');await page.locator('.feedback.success').waitFor();
    // A controlled fill question tests actual keyboard input, skill switching, failure, and review.
    const fill=E.create();fill.questionId='c1-09';await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),fill);await page.reload();await page.locator('#fill-answer').fill('wrong answer');await page.locator('[data-action="heavy"]').click();assert.equal(await page.locator('#fill-answer').inputValue(),'wrong answer');await page.locator('#fill-answer').press('Enter');await page.locator('.feedback.failure').waitFor();assert.ok((await page.locator('.feedback').textContent()).includes('bootloader'));await page.locator('[data-do="next"]').click();
    await page.locator('[data-view="wrong"]').first().click();assert.equal(await page.locator('.study-item').count(),1);await page.locator('[data-do="review"]').click();for(let i=0;i<2;i++){await page.locator('#fill-answer').fill('BOOT LOADER');await page.locator('#fill-answer').press('Enter');await page.locator('.feedback.success').waitFor();await page.locator('[data-do="next"]').click();}assert.ok((await page.locator('#question-panel').textContent()).includes('错题已巩固'));
    // Invalid import is rejected without losing the live progress.
    await page.locator('[data-do="return"]').click();const prior=await page.evaluate(()=>localStorage.getItem('os-quest-v1'));await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('无效'));assert.equal(await page.evaluate(()=>localStorage.getItem('os-quest-v1')),prior);
    // Valid import and export pass through their visible user controls.
    const imported=E.create();imported.name='存档测试';imported.questionId='c1-02';await page.locator('#import-file').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});await page.locator('#confirm-import').click();assert.ok((await page.locator('.name-button').textContent()).includes('存档测试'));
    const download=page.waitForEvent('download');await page.locator('[data-do="export"]').click();assert.ok((await download).suggestedFilename().endsWith('.json'));
    // A real old-engine save is migrated in-place, never overwriting the original backup.
    const legacy=require('./fixtures/v1-saves.json').saves.active;
    await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),legacy);await page.reload();
    let migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')));
    for(const key of Object.keys(legacy))assert.deepEqual(migrated[key],legacy[key],key);
    assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),backupKey),initial);
    await page.locator('[data-training="flow"]').click();await page.locator('.flow-bank').waitFor();
    migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')));assert.equal(migrated.hp,legacy.hp);assert.equal(migrated.level,legacy.level);assert.deepEqual(migrated.records,legacy.records);
    const flow=E.create();flow.questionId='c1-15';
    await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),flow);await page.reload();assert.equal(await page.locator('.type-badge').textContent(),'代码填充');
    assert.equal(await page.locator('.flow-block').count(),5);assert.equal(await page.locator('#submit-answer').isDisabled(),true);
    await page.locator('[data-flow-block="b0"]').click();await page.locator('[data-action="heavy"]').click();
    const partial=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).flowDraft);
    await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).flowDraft),partial);
    assert.equal(await page.locator('[data-flow-block="b0"]').isDisabled(),true);assert.equal(await page.locator('#submit-answer').isDisabled(),true);
    await page.locator('[data-flow-clear="0"]').click();assert.equal(await page.locator('[data-flow-block="b0"]').isDisabled(),false);
    await page.locator('[data-flow-block="b0"]').click();await page.locator('[data-do="reset-flow"]').click();assert.equal(await page.locator('.flow-slot.filled').count(),0);
    // Swap only two positions: no partial XP, and correct full solution is shown.
    for(const id of ['b1','b0','b2','b3'])await page.locator(`[data-flow-block="${id}"]`).click();
    await page.keyboard.press('Enter');await page.locator('.feedback.failure').waitFor();assert.equal(await page.locator('.slot-right').count(),2);assert.equal(await page.locator('.slot-wrong').count(),2);assert.equal(await page.locator('.feedback .solution-step').count(),4);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).xp),0);
    await page.reload();assert.equal(await page.locator('.slot-wrong').count(),2);await page.locator('[data-do="next"]').click();
    await page.locator('[data-view="wrong"]').first().click();await page.locator('summary').click();assert.equal(await page.locator('.solution-step').count(),4);await page.locator('[data-do="review"]').click();
    const reviewHp=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).hp);
    for(let i=0;i<2;i++){
      // Numeric shortcuts follow the displayed shuffled block order.
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')));
      for(const id of E.byId.get('c1-15').answer)await page.keyboard.press(String(saved.flowDraft.order.indexOf(id)+1));
      await page.keyboard.press('Enter');await page.locator('.feedback.success').waitFor();assert.equal(await page.locator('.slot-right').count(),4);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).hp),reviewHp);
      await page.locator('[data-do="next"]').click();
    }
    assert.ok((await page.locator('#question-panel').textContent()).includes('错题已巩固'));
    // A sequence question can be filled, corrected, and submitted with normal battle rewards.
    const sequence=E.create();sequence.questionId='c1-13';await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),sequence);await page.reload();
    await page.locator('[data-flow-block="b1"]').click();await page.locator('[data-flow-slot="0"]').click();await page.locator('[data-flow-block="b0"]').click();
    for(const id of ['b1','b2','b3','b4'])await page.locator(`[data-flow-block="${id}"]`).click();
    await page.screenshot({path:path.join(out,'flow-desktop.png'),fullPage:true});await page.keyboard.press('Enter');await page.locator('.feedback.success').waitFor();
    const flowXP=await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).xp);assert.equal(flowXP,28);await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).xp),flowXP);
    // Defeat and continue are not dead ends.
    const dead=E.create();dead.hp=1;dead.questionId='c1-01';E.answer(dead,'0');await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),dead);await page.reload();assert.ok((await page.locator('.next-button').textContent()).includes('恢复'));await page.locator('.next-button').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')).hp),100);
    await page.locator('[data-do="rest"]').click();await page.locator('[data-do="confirm-rest"]').click();assert.equal(await page.locator('dialog').isVisible(),false);
    const win=E.create();E.prepare(win,()=>0);let count=0;while(win.phase!=='victory'&&count++<1000){const q=E.byId.get(win.questionId);if(win.focus)E.setAction(win,'guard');E.answer(win,q.answer);E.advance(win,()=>0);}await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),win);await page.reload();assert.ok((await page.locator('.end-card h2').textContent()).includes('守护者'));await page.locator('[data-do="continue"]').click();await page.locator('#question-title').waitFor();
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mp=await mobile.newPage();await mp.goto(url);await mp.locator('#question-title').waitFor();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
    await mp.locator('[data-training="flow"]').tap();await mp.locator('.flow-bank').waitFor();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const mobileSave=await mp.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1'))),mobileQ=E.byId.get(mobileSave.questionId);
    await mp.locator(`[data-flow-block="${mobileQ.answer[0]}"]`).tap();await mp.locator('[data-flow-clear="0"]').tap();
    for(const id of mobileQ.answer)await mp.locator(`[data-flow-block="${id}"]`).tap();
    await mp.screenshot({path:path.join(out,'flow-mobile.png'),fullPage:true});await mp.locator('#submit-answer').tap();await mp.locator('.feedback.success').waitFor();
    await mp.locator('[data-view="map"]').first().tap();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();
    assert.deepEqual(errors,[]);await ctx.close();
    // Single-file distribution also works directly without a web server.
    const offline=await browser.newPage();let fileVerified=true;
    try{await offline.goto('file://'+path.resolve(__dirname,'../index.html'));}
    catch(error){
      if(!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw error;
      fileVerified=false;
      console.log('SKIP: direct file:// navigation is blocked by the managed browser policy.');
      await offline.route('**/*',route=>route.abort());
      await offline.setContent(fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'));
    }
    await offline.locator('#question-title').waitFor();await offline.close();
    console.log('PASS: legacy-save migration & original backup download; flow ordering/code-fill, partial drafts, replacement/reset, keyboard/touch, positional feedback, wrong-book review, no duplicate rewards.');
    console.log('PASS: desktop/mobile UI, skills, import/export, defeat/retry, victory, no console errors.');
    console.log(fileVerified?'PASS: direct offline file opens.':'PASS: standalone HTML renders with all network requests blocked (file navigation separately skipped).');
    console.log(`Screenshots: ${out}`);
  }finally{await browser.close();serve.close();}
})().catch(e=>{console.error(e);serve.close();process.exitCode=1;});
