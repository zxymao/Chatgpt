(() => {
  'use strict';
  const E=globalThis.PetKernel, $=id=>document.getElementById(id), KEY='pet-kernel-v1';
  let state=E.create(), hintCount=0, worker=null, running=false, toastTimer, sparkle=0, traces=[];
  try{const raw=localStorage.getItem(KEY);if(raw)state=E.normalize(JSON.parse(raw));}
  catch{ $('storage-note').hidden=false;$('storage-note').textContent='存档暂时无法读取，本次可以继续玩；导出存档可保存进度。'; }
  const lesson=()=>E.lessons[state.lesson-1];
  let activeGroup=lesson().group;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{$('storage-note').hidden=false;$('storage-note').textContent='浏览器不允许自动存档，请使用“导出存档”保存进度。';}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);$('scene-caption').textContent=text;}
  function drawPet(ctx,x,y,scale,p,selected=false){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle=selected?'#6a957e55':'#494b3820';ctx.beginPath();ctx.ellipse(0,18,20,6,0,0,Math.PI*2);ctx.fill();
    const color=p.color, dark=p.species==='dragon'?'#538f7c':'#8f6c51';
    ctx.fillStyle=dark;
    if(p.species==='dragon'){ctx.beginPath();ctx.moveTo(-13,1);ctx.lineTo(-28,-10);ctx.lineTo(-21,10);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(13,1);ctx.lineTo(28,-10);ctx.lineTo(21,10);ctx.closePath();ctx.fill();}
    else {ctx.fillRect(12,4,10,5);ctx.fillRect(18,-2,5,9);}
    ctx.fillStyle=color;ctx.fillRect(-13,-2,26,19);ctx.fillRect(-15,-21,30,25);
    if(p.species==='rabbit'){ctx.fillRect(-12,-44,8,25);ctx.fillRect(4,-44,8,25);ctx.fillStyle='#e9a7a3';ctx.fillRect(-10,-40,4,16);ctx.fillRect(6,-40,4,16);}
    else if(p.species==='dog'){ctx.fillStyle=dark;ctx.fillRect(-19,-23,9,19);ctx.fillRect(10,-23,9,19);}
    else if(p.species==='hamster'){ctx.fillRect(-17,-26,10,10);ctx.fillRect(7,-26,10,10);}
    else{ctx.beginPath();ctx.moveTo(-15,-18);ctx.lineTo(-13,-33);ctx.lineTo(-2,-21);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(15,-18);ctx.lineTo(13,-33);ctx.lineTo(2,-21);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#fff4dc';ctx.fillRect(-9,-1,18,11);ctx.fillRect(-8,10,16,5);
    ctx.fillStyle='#344438';ctx.fillRect(-9,-13,4,5);ctx.fillRect(5,-13,4,5);ctx.fillRect(-2,-5,4,3);
    ctx.fillStyle='#ffffff';ctx.fillRect(-9,-13,1,2);ctx.fillRect(5,-13,1,2);
    ctx.fillStyle='#eeb7a1';ctx.fillRect(-13,-6,5,3);ctx.fillRect(8,-6,5,3);
    ctx.fillStyle=dark;ctx.fillRect(-11,15,7,4);ctx.fillRect(4,15,7,4);
    if(selected){ctx.fillStyle='#52765c';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('♥',0,-50);}
    ctx.restore();
  }
  function avatar(p){const c=document.createElement('canvas');c.width=112;c.height=100;c.className='avatar';drawPet(c.getContext('2d'),56,62,1.5,p);return c;}
  function renderShop(){
    $('food-count').textContent=state.food;$('progress-count').textContent=`${state.completed.length} / ${E.lessons.length}`;
    $('adopted-count').textContent=`已领养 ${state.adopted.length} / ${E.pets.length}`;
    const p=E.pets[state.selected],st=state.stats[state.selected];
    $('selected-name').textContent=p.name;$('full-meter').value=st.full;$('bond-meter').value=st.bond;
    $('feed').disabled=state.food<1||st.full>=100;
    $('pet-list').replaceChildren();
    for(const pet of E.pets){
      const adopted=state.adopted.includes(pet.id), unlocked=pet.id===0||state.completed.includes(pet.lesson);
      const card=document.createElement('div');card.className='pet-card'+(adopted&&state.selected===pet.id?' selected':'')+(!unlocked?' locked':'');card.dataset.pet=pet.id;
      card.append(avatar(pet));
      const name=document.createElement('div');name.className='pet-name';name.textContent=pet.name;card.append(name);
      const status=document.createElement('div');status.className='pet-status';status.textContent=adopted?'已在店里':unlocked?'等你接回家':`第 ${pet.lesson} 关解锁`;card.append(status);
      if(unlocked){const b=document.createElement('button');b.className=adopted?'quiet':'secondary';b.textContent=adopted?'选中它':'领养';b.dataset.action=adopted?'select':'adopt';b.dataset.pet=pet.id;b.addEventListener('click',()=>{if(adopted){state.selected=pet.id;toast(`${pet.name} 正看着你。`);}else{const r=E.adopt(state,pet.id);toast(r.message);sparkle=performance.now();}save();renderShop();});card.append(b);}
      $('pet-list').append(card);
    }
    renderChapters();
  }
  function renderChapters(){
    $('groups').replaceChildren();
    for(const group of E.groups){const b=document.createElement('button');b.textContent=group.name;b.className=activeGroup===group.id?'active':'';b.disabled=running;b.setAttribute('aria-pressed',String(activeGroup===group.id));b.addEventListener('click',()=>{activeGroup=group.id;renderChapters();});$('groups').append(b);}
    $('group-description').textContent=E.groups.find(g=>g.id===activeGroup).description+' · 可点任一关预习；主线按顺序领取通关奖励。';
    $('chapters').replaceChildren();
    for(const l of E.lessons.filter(l=>l.group===activeGroup)){const b=document.createElement('button');b.className='chapter'+(state.lesson===l.id?' active':'')+(state.completed.includes(l.id)?' completed':'')+(!E.unlocked(state,l.id)?' preview':'');b.disabled=running;b.dataset.lesson=l.id;b.title=E.unlocked(state,l.id)?'编写并验证':'可预习；完成前一关后可领取通关奖励';b.setAttribute('aria-current',state.lesson===l.id?'step':'false');
      const n=document.createElement('span');n.className='chapter-index';n.textContent=state.completed.includes(l.id)?'✓':String(l.id).padStart(2,'0');
      const t=document.createElement('span');t.textContent=l.title;b.append(n,t);b.addEventListener('click',()=>selectLesson(l.id));$('chapters').append(b);}
  }
  function lineNumbers(){$('line-numbers').textContent=$('editor').value.split('\n').map((_,i)=>i+1).join('\n');}
  function selectLesson(id){
    if(running||!E.lessons[id-1])return;
    state.drafts[state.lesson]=$('editor').value;
    state.lesson=id;activeGroup=lesson().group;hintCount=0;save();renderLesson();renderChapters();
  }
  function renderLesson(){
    const l=lesson();$('lesson-number').textContent=`${l.id<=6?'选修热身':'OS 主线'} · ${l.id} / ${E.lessons.length}`;$('lesson-title').textContent=l.title;$('lesson-concept').textContent=l.concept;$('lesson-story').textContent=l.story;$('lesson-goal').textContent=l.goal;
    $('invariant').hidden=!l.invariant;$('invariant').textContent=l.invariant?'必须保持：'+l.invariant:'';
    $('oral-question').hidden=!l.question;$('oral-question').textContent=l.question?'验收追问：'+l.question:'';
    $('sample').textContent=JSON.stringify({arguments:l.tests[0].args,return:l.tests[0].want,expectedFirstArgumentAfter:l.tests[0].after},null,2);
    $('trace-panel').hidden=true;traces=[];
    $('editor').value=state.drafts[l.id]??l.starter;lineNumbers();$('hint-panel').hidden=true;
    $('result').className='result';$('result').replaceChildren();const p=document.createElement('p');p.textContent=state.completed.includes(l.id)?'这一关已经通过。可以再改进代码，运行后还能获得练习饲料。':'先试着运行一次，看看哪些情况还需要处理。';$('result').append(p);
    $('next-lesson').hidden=!state.completed.includes(l.id)||l.id===E.lessons.length;
    const path=l.id<=6?`os-lab/exercises/${l.file}`:`os-lab/${l.file}`;
    $('kernel-file').textContent=path;$('kernel-source').href='https://github.com/zxymao/Chatgpt/blob/main/'+path;
    $('kernel-command').textContent=l.id<=6?`cd os-lab\nmake check LAB=${l.id}`:`cd os-lab/project2\nmake check MODE=student STAGE=${l.id>=21?4:l.stage}`;
    $('kernel-note').textContent=l.id<=6?'热身只对应基础练习。想实现完整的 Project 2 机制，请从第7关主线开始。':`先完成 Task ${l.stage} 的 C / 汇编练习，再运行整组验收；前置任务也会检查。${l.id===21||l.id===22?'本内核的睡眠动态测试与 Task 4 的时钟一起验收。':''}网页通过不会自动补全内核。`;
    const guide=l.id<=6?'docs/LESSONS.md':'project2/README.md';
    document.querySelector('.kernel-link > a:last-child').href='https://github.com/zxymao/Chatgpt/blob/main/os-lab/'+guide;
  }
  function renderTrace(){
    const trace=traces[Number($('trace-case').value)||0];if(!trace)return;
    $('trace-data').textContent=JSON.stringify({before:trace.before,returned:trace.output,after:trace.after},null,2);
    $('trace-lanes').replaceChildren();$('trace-timeline').replaceChildren();$('trace-caption').textContent='这份快照来自你的函数调用，不是预设的正确动画。';
    const before=trace.before[0],after=trace.after[0];
    if(after&&typeof after==='object'&&!Array.isArray(after)){
      const fields=after.tasks?['current','ready','wait','sleepers']:after.waiters?['owner','waiters','states']:after.context?['pid','state','context']:after.s?['ra','sp','s']:after.x?['sepc','sstatus']:['ticks','remaining','nextTimer','needResched'];
      for(const field of fields)if(field in after){const box=document.createElement('div'),label=document.createElement('strong'),value=document.createElement('code');label.textContent=field;value.textContent=JSON.stringify(before?.[field])+' → '+JSON.stringify(after[field]);box.append(label,value);$('trace-lanes').append(box);}
      if(after.tasks)for(const p of after.tasks){const chip=document.createElement('span');chip.className='pcb-state state-'+p.state;chip.textContent=`宠物 ${p.pid} · ${p.state}`;$('trace-lanes').append(chip);}
    }
    if(lesson().id===24&&Array.isArray(trace.output))for(const [tick,pid] of trace.output.entries()){
      const b=document.createElement('button');b.className='tick';b.textContent=`${tick}: ${pid==='idle'?'idle':'宠物 '+pid}`;b.addEventListener('click',()=>{for(const n of $('trace-timeline').children)n.classList.remove('active');b.classList.add('active');$('trace-caption').textContent=`tick ${tick}：${pid==='idle'?'没有就绪任务，CPU idle。':`宠物 ${pid} 获得这一时间片。`}`;});$('trace-timeline').append(b);
    }
  }
  $('trace-case').addEventListener('change',renderTrace);
  function showResult(result){
    $('result').className='result '+(result.passed?'success':'failed');$('result').replaceChildren();
    const title=document.createElement('h3');title.textContent=result.passed?'全部检查通过，小伙伴听懂了！':'还差一点，看看下面的具体情况';$('result').append(title);
    for(const row of result.rows){const box=document.createElement('div');box.className='test-row'+(row.ok?'':' bad');const mark=document.createElement('b');mark.textContent=row.ok?'✓':'×';const text=document.createElement('span');text.textContent=row.name;if(!row.ok){const detail=document.createElement('span');detail.className='test-detail';detail.textContent=row.detail;text.append(detail);}box.append(mark,text);$('result').append(box);}
    traces=result.traces||[];$('trace-panel').hidden=traces.length===0;$('trace-case').replaceChildren();
    traces.forEach((trace,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(trace.ok?'✓ ':'× ')+trace.name;$('trace-case').append(option);});renderTrace();
  }
  function run(){
    if(running)return;
    const l=lesson();state.drafts[l.id]=$('editor').value;save();running=true;$('run').disabled=true;$('run').textContent='正在检查…';renderChapters();
    $('result').className='result';$('result').replaceChildren();$('trace-panel').hidden=true;const pending=document.createElement('p');pending.textContent='正在运行多个测试输入并记录状态变化…';$('result').append(pending);
    for(const id of ['editor','import-save','reset-code'])$(id).disabled=true;
    const source=`const grade=${E.grade.toString()}; const reply=self.postMessage.bind(self); self.onmessage=e=>{const result=grade(e.data.source,e.data.lesson);reply(result);};`;
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{worker=new Worker(url);}catch(e){URL.revokeObjectURL(url);running=false;$('run').disabled=false;$('run').textContent='▶ 运行 & 检查';for(const id of ['editor','import-save','reset-code'])$(id).disabled=false;renderChapters();showResult({passed:false,rows:[{name:'浏览器运行环境',ok:false,detail:'无法启动练习，请使用较新的 Chrome、Edge 或 Firefox 打开此页面。'}]});return;}
    URL.revokeObjectURL(url);
    let ended=false;
    const finish=result=>{
      if(ended)return;ended=true;clearTimeout(timer);worker.terminate();worker=null;running=false;$('run').disabled=false;$('run').textContent='▶ 运行 & 检查';
      for(const id of ['editor','import-save','reset-code'])$(id).disabled=false;
      showResult(result);
      if(result.passed){const reward=E.reward(state,l.id);toast(reward.message);sparkle=performance.now();save();$('next-lesson').hidden=!reward.ok||l.id===E.lessons.length;}
      renderShop();
    };
    const timer=setTimeout(()=>finish({passed:false,rows:[{name:'在限定时间内完成',ok:false,detail:'代码运行超过 1.2 秒，已停止。检查循环条件和计数器是否向前推进。'}]}),1200);
    worker.onmessage=e=>finish(e.data);
    worker.onerror=e=>{e.preventDefault();finish({passed:false,rows:[{name:'代码可以运行',ok:false,detail:e.message||'运行异常'}]});};
    worker.postMessage({source:$('editor').value,lesson:structuredClone(l)});
  }
  $('run').addEventListener('click',run);
  $('editor').addEventListener('input',()=>{state.drafts[state.lesson]=$('editor').value;lineNumbers();save();});
  $('editor').addEventListener('scroll',()=>{$('line-numbers').scrollTop=$('editor').scrollTop;});
  $('editor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target,start=t.selectionStart,end=t.selectionEnd;t.setRangeText('  ',start,end,'end');t.dispatchEvent(new Event('input'));}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run();}});
  $('hint').addEventListener('click',()=>{const hints=lesson().hints;$('hint-panel').hidden=false;$('hint-panel').textContent=hints[Math.min(hintCount++,hints.length-1)];});
  $('reset-code').addEventListener('click',()=>{if(confirm('只重置这一关的代码？宠物和已通过的关卡会保留。')){$('editor').value=lesson().starter;state.drafts[state.lesson]=lesson().starter;save();lineNumbers();}});
  $('next-lesson').addEventListener('click',()=>{selectLesson(Math.min(E.lessons.length,state.lesson+1));$('lesson-title').scrollIntoView({behavior:'smooth',block:'center'});});
  $('feed').addEventListener('click',()=>{const r=E.feed(state,state.selected);toast(r.message);if(r.ok)sparkle=performance.now();save();renderShop();});
  $('pat').addEventListener('click',()=>{toast(E.pet(state,state.selected).message);sparkle=performance.now();save();renderShop();});
  $('copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('kernel-command').textContent);toast('已复制，在 Codespaces 的 Linux 终端执行。');}catch{toast('浏览器未允许复制，请选中上面的命令手动复制。');}});
  $('export-save').addEventListener('click',()=>{state.drafts[state.lesson]=$('editor').value;const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pet-kernel-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档已导出，包含宠物和代码草稿。');});
  $('import-save').addEventListener('click',()=>$('save-file').click());
  $('save-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>500000)throw Error();const raw=JSON.parse(await file.text());if(![1,2].includes(raw.version)||!Array.isArray(raw.completed)||!Array.isArray(raw.adopted))throw Error();if(!confirm('导入会替换当前进度和代码草稿，确定继续吗？'))return;state=E.normalize(raw);activeGroup=lesson().group;save();renderLesson();renderShop();toast('存档已恢复，欢迎回店。');}catch{toast('存档格式无效，当前进度已保留。');}finally{e.target.value='';}});
  const canvas=$('shop'),ctx=canvas.getContext('2d');let petPositions=[];
  function scene(time){
    const w=960,h=520;ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#dfe8cf';ctx.fillRect(0,0,w,235);ctx.fillStyle='#b2c3a1';ctx.fillRect(0,222,w,15);
    ctx.fillStyle='#e6cda7';ctx.fillRect(0,237,w,h-237);
    for(let y=240;y<h;y+=45){ctx.fillStyle='#d4b993';ctx.fillRect(0,y,w,2);for(let x=(y/45%2)*60;x<w;x+=120)ctx.fillRect(x,y,2,45);}
    ctx.fillStyle='#fbf4dc';ctx.fillRect(622,38,250,150);ctx.fillStyle='#98b6a1';ctx.fillRect(632,48,230,130);ctx.fillStyle='#e9eacc';ctx.fillRect(644,60,206,106);ctx.fillStyle='#a8c0a0';ctx.fillRect(644,129,206,37);ctx.fillStyle='#f0cb80';ctx.beginPath();ctx.arc(798,86,21,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fbf4dc';ctx.fillRect(740,48,8,130);
    ctx.fillStyle='#819974';ctx.fillRect(59,72,254,16);ctx.fillRect(59,148,254,13);
    const bags=['#e4aa7b','#b4c6a2','#e6ca85','#d8afa0'];for(let i=0;i<4;i++){ctx.fillStyle=bags[i];ctx.fillRect(74+i*57,94,39,54);ctx.fillStyle='#fff0d2';ctx.fillRect(82+i*57,109,23,17);ctx.fillStyle='#7f8b66';ctx.fillRect(92+i*57,112,5,10);}
    ctx.fillStyle='#f9f4df';ctx.fillRect(365,49,177,96);ctx.strokeStyle='#a9b58d';ctx.lineWidth=5;ctx.strokeRect(365,49,177,96);ctx.fillStyle='#46664c';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('小 码 的 店',453,92);ctx.font='12px sans-serif';ctx.fillText('CODE · CARE · GROW',453,120);
    ctx.fillStyle='#87966a';ctx.fillRect(75,183,65,55);ctx.fillStyle='#c9a580';ctx.fillRect(87,221,41,40);ctx.fillStyle='#7eaa7c';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(106+(i-1.5)*12,190+(i%2)*15,15,30,(i-1.5)*.4,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#c5b390';ctx.fillRect(719,194,160,60);ctx.fillStyle='#f1dfbd';ctx.fillRect(709,184,180,35);ctx.fillStyle='#687f62';ctx.fillRect(785,162,45,27);ctx.fillStyle='#374f3e';ctx.fillRect(789,166,37,18);
    ctx.fillStyle='#c9d0a7';ctx.beginPath();ctx.ellipse(475,354,265,103,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#edf0d5';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(475,354,246,87,0,0,Math.PI*2);ctx.stroke();
    if(state.completed.includes(2)){ctx.fillStyle='#b79870';ctx.fillRect(37,359,93,78);ctx.fillStyle='#e9cf9d';ctx.fillRect(43,365,81,28);ctx.fillRect(43,400,81,29);ctx.fillStyle='#886e50';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('粮仓',83,386);ctx.fillText('PAGE',83,420);}
    if(state.completed.includes(19)){ctx.fillStyle='#faf3d8';ctx.fillRect(353,162,198,34);ctx.fillStyle='#6b8c6b';ctx.font='12px sans-serif';ctx.fillText('✓ 内核服务窗口已开放',452,184);}
    if(state.completed.includes(23)){ctx.fillStyle='#f9f3dc';ctx.beginPath();ctx.arc(570,92,23,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b8c6b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(570,76);ctx.lineTo(570,92);ctx.lineTo(581,98);ctx.stroke();}
    if(state.completed.includes(24)){ctx.fillStyle='#cfa77b';ctx.fillRect(816,347,106,58);ctx.fillStyle='#a5c2a4';ctx.fillRect(822,340,94,30);ctx.fillStyle='#f6ebc9';ctx.font='12px sans-serif';ctx.fillText('抢占内核之家',869,361);}
    petPositions=[];
    for(let index=0;index<state.adopted.length;index++){
      const id=state.adopted[index],p=E.pets[id];
      const x=state.adopted.length===1?475:230+(index%4)*160;
      const y=state.adopted.length===1?354:state.adopted.length>8?280+Math.floor(index/4)*80:310+Math.floor(index/4)*110;
      const bob=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(time/430+id)*3;
      drawPet(ctx,x,y+bob,1.65,p,id===state.selected);petPositions.push({id,x,y});
      ctx.fillStyle='#4a6750';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,x,y+46);
      if(time-sparkle<1600&&id===state.selected){ctx.fillStyle='#d77f73';ctx.font='22px sans-serif';ctx.fillText('♥',x+35,y-60-(time-sparkle)/65);}
    }
    requestAnimationFrame(scene);
  }
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*520/r.height;const p=petPositions.find(p=>Math.abs(p.x-x)<55&&Math.abs(p.y-y)<65);if(p){state.selected=p.id;toast(`${E.pets[p.id].name}：今天也一起写代码吧！`);save();renderShop();}});
  renderLesson();renderShop();requestAnimationFrame(scene);
})();
