const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const E=require('../src/engine.js'),W=require('../src/world.js');
const out=process.env.SCREENSHOT_DIR||'/tmp/os-quest-world-screenshots';
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const ctx=await browser.newContext({viewport:{width:1440,height:1080}}),page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const s=require('./fixtures/v2-saves.json').saves.draft,olderBackup=require('./fixtures/v1-saves.json').saves.feedback;
    await ctx.addInitScript(({s,olderBackup})=>{if(!localStorage.getItem('os-quest-v1'))localStorage.setItem('os-quest-v1',JSON.stringify(s));if(!localStorage.getItem('os-quest-v1-before-flow-update'))localStorage.setItem('os-quest-v1-before-flow-update',JSON.stringify(olderBackup));},{s,olderBackup});
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1')));
    await page.goto(url);await page.locator('[data-view="world"]').click();await page.locator('#world-canvas').waitFor();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1-before-poetry-update'))),s);
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('os-quest-v1-before-flow-update'))),olderBackup);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#world-canvas').focus();
    for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<2;i++)await page.keyboard.press('ArrowUp');
    await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('#npc-name').textContent()).includes('林岚'));
    assert.ok(await page.locator('.npc-portrait').evaluate(el=>{const r=el.getBoundingClientRect();return getComputedStyle(el).backgroundImage!=='none'&&r.width>0&&r.height>0;}),'NPC dialogue portrait must display the character atlas');
    let before=await saved();assert.equal(before.world.x,6);assert.equal(before.world.y,6);assert.deepEqual(before.flowDraft,s.flowDraft);assert.equal(before.monsterHp,s.monsterHp);
    await page.keyboard.press('ArrowLeft');assert.equal((await saved()).world.x,6);
    await page.locator('[data-npc-choice="lore"]').click();await page.locator('[data-npc-choice="accept"]').click();assert.ok((await saved()).world.quests[0].accepted);
    await page.reload();await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('.npc-speech').textContent()).includes('任务已记下'));
    await page.screenshot({path:path.join(out,'npc-dialog-desktop.png')});await page.locator('[data-npc-choice="close"]').last().click();
    // The first-approach popup does not recur, but E reopens the conversation.
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');assert.equal(await page.locator('#npc-dialog').isVisible(),false);await page.keyboard.press('e');await page.locator('#npc-dialog[open]').waitFor();await page.keyboard.press('Escape');assert.equal((await saved()).world.dialog,null);
    // Walk to the engineer along the northern path, using actual keys.
    for(let i=0;i<10;i++)await page.keyboard.press('d');await page.keyboard.press('w');
    await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('#npc-name').textContent()).includes('周澄'));
    await page.locator('[data-npc-choice="problem"]').click();await page.locator('[data-npc-choice="solve-1"]').click();assert.equal((await saved()).world.quests[0].insight,false);
    await page.locator('[data-npc-choice="problem"]').click();await page.locator('[data-npc-choice="solve-0"]').click();assert.ok((await saved()).world.quests[0].insight);
    await page.reload();await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('.npc-speech').textContent()).includes('控制台已恢复'));
    await page.locator('[data-npc-choice="battle"]').click();await page.locator('#question-panel').waitFor();let now=await saved();assert.equal(now.training,'flow');assert.equal(now.hp,s.hp);assert.equal(now.monsterHp,s.monsterHp);assert.equal(now.world.active,false);
    // Only the actual answer earns EXP; carry that evidence back to the map.
    const q=E.byId.get(now.questionId);for(const id of q.answer)await page.locator(`[data-flow-block="${id}"]`).click();await page.locator('#submit-answer').click();await page.locator('.feedback.success').waitFor();await page.locator('[data-do="next"]').click();
    const battle=await saved();await page.locator('[data-view="world"]').click();assert.equal((await saved()).world.x,16);assert.equal((await saved()).world.y,5);
    await page.locator('#world-spawn').click();
    // A held key repeats and keyup stops. Map boundaries still block movement.
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');const stopped=await saved();assert.equal(stopped.world.x,1);await page.waitForTimeout(200);assert.equal((await saved()).world.x,1);
    await page.locator('#world-spawn').click();
    for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<2;i++)await page.keyboard.press('ArrowDown');
    await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('#npc-name').textContent()).includes('苏禾'));await page.locator('[data-npc-choice="notes"]').click();await page.locator('[data-npc-choice="library"]').click();await page.locator('.library-summary').waitFor();assert.equal((await saved()).world.active,false);
    await page.locator('[data-view="world"]').click();await page.locator('#world-spawn').click();
    // Reach the ranger via row 9, passing below the solid memory anchor.
    await page.keyboard.press('ArrowDown');for(let i=0;i<14;i++)await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
    await page.locator('#npc-dialog[open]').waitFor();assert.ok((await page.locator('#npc-name').textContent()).includes('陈星遥'));await page.locator('[data-npc-choice="claim"]').click();assert.ok((await saved()).world.quests[0].claimed);await page.locator('[data-npc-choice="close"]').last().click();
    now=await saved();for(const key of ['level','xp','hp','monsterHp','chapter','encounter','records'])assert.deepEqual(now[key],battle[key],key);assert.ok((await page.locator('#fragment-count').textContent()).includes('1 / 8'));
    await page.reload();assert.ok((await saved()).world.quests[0].claimed);await page.locator('#world-spawn').click();
    // Importing a map save resumes its view and quest state, without dropping battle progress.
    const mapSave=await saved();await page.locator('[data-view="battle"]').first().click();
    await page.locator('#import-file').setInputFiles({name:'world-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mapSave))});await page.locator('#confirm-import').click();await page.locator('#world-canvas').waitFor();assert.ok((await saved()).world.active);assert.ok((await saved()).world.quests[0].claimed);
    // Verify NPC image embedding and draw a real map screenshot, not a placeholder.
    assert.ok(await page.evaluate(()=>window.OSQuestNpcAtlas.startsWith('data:image/png;base64,')));
    await page.waitForFunction(()=>document.getElementById('world-canvas').width>0);await page.waitForTimeout(200);
    await page.screenshot({path:path.join(out,'world-desktop.png'),fullPage:true});
    // Blocked exit cannot unlock the next combat chapter; then an already-unlocked save can cross.
    const portal=await saved();portal.world.x=21;portal.world.y=8;await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),portal);await page.reload();await page.locator('#world-canvas').focus();await page.keyboard.press('ArrowRight');assert.equal((await saved()).world.zone,0);assert.equal((await saved()).unlocked,0);assert.ok((await page.locator('#world-status').textContent()).includes('尚未解锁'));
    portal.unlocked=1;portal.world.x=21;await page.evaluate(s=>localStorage.setItem('os-quest-v1',JSON.stringify(s)),portal);await page.reload();await page.locator('#world-canvas').focus();await page.keyboard.press('ArrowRight');assert.equal((await saved()).world.zone,1);assert.equal((await saved()).chapter,0);assert.ok((await page.locator('.breadcrumb').textContent()).includes('CHAPTER 02'));
    assert.deepEqual(errors,[]);await ctx.close();
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(String(e)));
    await mp.goto(url);await mp.locator('[data-view="world"]').tap();await mp.locator('#world-canvas').waitFor();
    for(let i=0;i<3;i++)await mp.locator('[data-move="right"]').tap();for(let i=0;i<2;i++)await mp.locator('[data-move="up"]').tap();
    await mp.locator('#npc-dialog[open]').waitFor();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(out,'npc-dialog-mobile.png')});
    await mp.locator('[data-npc-choice="accept"]').tap();await mp.locator('[data-npc-choice="close"]').last().tap();await mp.locator('#world-spawn').tap();assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(out,'world-mobile.png'),fullPage:true});
    await mobile.close();assert.deepEqual(errors,[]);
    console.log('PASS: 2D keyboard/held-key/touch movement, collision, automatic and repeat NPC dialogue, wrong/right branches, complete quest/fragment, battle and codex integration, saved dialogue/position/quests, locked/unlocked portals, desktop/mobile layout, no console errors.');
    console.log(`World screenshots: ${out}`);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
