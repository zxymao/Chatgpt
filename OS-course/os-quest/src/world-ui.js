(function(root){
  'use strict';
  const W=root.OSQuestWorld,T=W.TILE;
  const palettes=[['#233e35','#304d3d','#a4946b','#293f3a'],['#303b3d','#3e4a43','#ad9a7a','#303e45'],['#303c49','#3e5052','#a7a28c','#303f53'],['#45402f','#56503a','#bba477','#414d41'],['#43362c','#514337','#b59a73','#39413b'],['#302f42','#413e51','#9992a7','#333a4c'],['#263e3e','#36514b','#a9ab88','#28434a'],['#29384a','#374b58','#a4a7a5','#2c4257']];
  function create({getState,save,changeView,train,esc}){
    let frame=0,observer,abort,canvas,ctx,npcDialog,lastTick=0,held=null,drawX=0,drawY=0,lastZone=-1,camX=0,camY=0,lastAnnouncement='';
    // Large embedded atlases can exceed CSS custom-property limits; keep the URL short.
    const encoded=root.OSQuestNpcAtlas.slice(root.OSQuestNpcAtlas.indexOf(',')+1),binary=root.atob(encoded),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const atlasURL=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    document.documentElement.style.setProperty('--npc-atlas',`url("${atlasURL}")`);
    document.documentElement.style.setProperty('--atlas-columns',W.ATLAS_COLUMNS);
    document.documentElement.style.setProperty('--atlas-gaps',W.ATLAS_COLUMNS-1);
    const reducedMotion=root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const atlas=new Image();atlas.src=atlasURL;root.OSQuestLegacyAtlas=atlas;
    function html(){const s=getState(),w=s.world,story=W.stories[w.zone];return `<section class="world-view" aria-label="2D 地图探索"><div class="world-intro"><div><span class="eyebrow">A WORLD WORTH EXPLORING</span><h2>走进故事，遇见同行的人。</h2><p>在地图中自由移动，与二次元风格的女性旅伴交谈，把每一章的记忆重新点亮。</p></div><button class="world-battle-link" data-view="battle">继续答题远征 ↗</button></div><div class="world-layout"><div class="world-main"><div class="world-toolbar"><span><i class="live-dot"></i> <b id="world-place">${esc(story.place)}</b></span><label>前往 <select id="world-zone" aria-label="探索区域">${W.stories.map((z,i)=>`<option value="${i}" ${i===w.zone?'selected':''} ${i>s.unlocked?'disabled':''}>${i+1}. ${esc(z.place)}${i>s.unlocked?' · 未解锁':''}</option>`).join('')}</select></label></div><div class="world-viewport"><canvas id="world-canvas" tabindex="0" role="application" aria-label="2D 探索地图，用方向键或 WASD 移动，E 或空格与相邻人物对话。树木、水池和人物不可穿过。"></canvas><div class="world-map-tag"><span>LIVE EXPLORATION</span><b>第 <span id="world-zone-number">${w.zone+1}</span> 章 · <span id="world-story-title">${esc(story.title)}</span></b></div><div class="world-map-hint" id="world-map-hint">靠近人物会触发初次对话</div></div><div class="world-control-bar"><div class="world-dpad" role="group" aria-label="移动方向"><button data-move="up" aria-label="向上移动">↑</button><button data-move="left" aria-label="向左移动">←</button><span aria-hidden="true">✧</span><button data-move="right" aria-label="向右移动">→</button><button data-move="down" aria-label="向下移动">↓</button></div><div class="world-control-copy"><b>方向键 / WASD 移动</b><span>长按连续移动 · E / 空格交谈</span><button id="world-spawn" class="world-text-button">返回出生点</button></div><button id="world-interact" class="world-interact">交谈 <kbd>E</kbd></button></div><p id="world-status" class="world-status" role="status" aria-live="polite"></p></div><aside class="world-sidebar"><div class="world-quest-card"><span class="eyebrow">CHAPTER QUEST</span><h3 id="quest-title">${esc(story.title)}</h3><p id="quest-intro"></p><ol id="world-quest-list"></ol><div id="world-fragment-status"></div></div><div class="world-companions"><h3>本章同行者</h3>${W.cast.map(n=>`<div class="world-companion"><span class="npc-mini npc-art" style="--portrait:${n.portrait}"></span><span><b>${n.name}</b><small>${n.role}</small></span><span id="met-${n.id}" class="met-marker">未遇见</span></div>`).join('')}</div><details class="world-journal"><summary>远征纪事 <span id="fragment-count"></span></summary><div id="world-journal-list"></div></details><p class="world-note">探索不消耗生命。经验与能力成长仍来自答对复习题，收集碎片记录你的剧情进度。</p></aside></div><dialog id="npc-dialog" class="npc-dialog" aria-labelledby="npc-name"></dialog></section>`;}
    function stop(){cancelAnimationFrame(frame);frame=0;observer?.disconnect();abort?.abort();held=null;if(npcDialog?.open)npcDialog.close();canvas=null;}
    function announce(text){const el=document.getElementById('world-status');if(el&&text!==lastAnnouncement){el.textContent=text;lastAnnouncement=text;}}
    function update(){
      const s=getState(),w=s.world,story=W.stories[w.zone],q=W.quest(w),near=W.nearby(w);
      document.querySelector('.breadcrumb').innerHTML=`<span>CHAPTER ${String(w.zone+1).padStart(2,'0')}</span><i>/</i>${esc(root.OSQuestData.chapters[w.zone].name)}`;
      document.querySelectorAll('.chapter-pips>i').forEach((el,i)=>el.className=s.completed.includes(i)?'done':i===w.zone?'here':'');
      document.getElementById('world-place').textContent=story.place;document.getElementById('world-zone').value=w.zone;
      document.getElementById('world-zone-number').textContent=w.zone+1;document.getElementById('world-story-title').textContent=story.title;
      document.getElementById('quest-title').textContent=story.title;
      document.getElementById('quest-intro').textContent=q.claimed?'锚点已点亮，记忆碎片已收好。':q.accepted?'修复本章记忆锚点，最后向陈星遥确认。':'找到北侧的林岚，听听营地的故事。';
      document.getElementById('world-quest-list').innerHTML=W.progress(s).map(p=>`<li class="${p.done?'done':''}"><span>${p.done?'✓':'○'}</span>${esc(p.label)}</li>`).join('');
      document.getElementById('world-fragment-status').innerHTML=q.claimed?'<span class="fragment-complete">✧ 本章记忆已修复</span>':'<span class="fragment-pending">完成四项记录后，前往南侧点亮锚点</span>';
      for(const n of W.cast)document.getElementById('met-'+n.id).textContent=w.met.includes(`${w.zone}:${n.id}`)?'已遇见':'未遇见';
      const completed=Object.entries(w.quests).filter(([,q])=>q.claimed);document.getElementById('fragment-count').textContent=`${completed.length} / 8`;
      document.getElementById('world-journal-list').innerHTML=completed.length?completed.map(([id])=>`<p>✧ ${esc(W.stories[Number(id)].title)}</p>`).join(''):'<p>每点亮一枚锚点，就在这里留下一段记忆。</p>';
      const button=document.getElementById('world-interact');button.disabled=!near||!!w.dialog;button.innerHTML=near?`与${near.name}交谈 <kbd>E</kbd>`:'靠近人物交谈';
      document.getElementById('world-map-hint').textContent=near?`E / 空格 · 与${near.name}交谈`:'东侧出口前往下一章 · 西侧出口返回上一章';
      announce(`当前位置 ${w.x}, ${w.y}。${near?near.name+'在你身旁。':'可用方向键移动。'}`);
    }
    function showConversation(){
      const d=W.dialogue(getState());if(!d){if(npcDialog.open)npcDialog.close();return;}
      held=null;
      npcDialog.innerHTML=`<div class="npc-dialog-shell"><div class="npc-portrait-column"><div class="npc-art npc-portrait" style="--portrait:${d.npc.portrait}" role="img" aria-label="${d.npc.name}的二次元女性角色立绘"></div><span>${d.npc.role}</span></div><div class="npc-conversation"><div class="npc-dialog-top"><span class="eyebrow">${esc(d.title)}</span><button class="npc-close" data-npc-choice="close" aria-label="结束对话">×</button></div><h2 id="npc-name">${d.npc.name}<small>${d.npc.role}</small></h2><p class="npc-speech">${esc(d.text)}</p><div class="npc-choices">${d.choices.map(c=>`<button data-npc-choice="${c.id}">${esc(c.label)}<span>↗</span></button>`).join('')}</div><span class="npc-dialog-note">对话与任务自动保存 · Esc 暂停交谈</span></div></div>`;
      if(!npcDialog.open)npcDialog.showModal();npcDialog.querySelector('.npc-choices button')?.focus({preventScroll:true});
    }
    function interact(){const w=getState().world,n=W.nearby(w);if(n&&W.open(w,n.id)){held=null;save();update();showConversation();}else announce('靠近人物后，按 E 或点击交谈。');}
    function step(direction){
      const s=getState();if(npcDialog.open||document.getElementById('dialog').open)return;
      const result=W.move(s.world,direction);if(result.moved){let notice='';
        if(result.exit){const target=s.world.zone+result.exit;if(!W.enter(s.world,target,s.unlocked))notice=target<0?'这里是远征的起点。':target>7?'你已抵达最后一章。':'前方尚未解锁，请先在答题远征击败本章首领。';}
        save();update();if(notice)announce(notice);if(result.greeting)showConversation();
      }else if(!s.world.dialog)announce('前方有树木、水池、锚点或人物，请换个方向。');
    }
    function changeZone(zone){const s=getState();if(W.enter(s.world,zone,s.unlocked)){held=null;save();update();canvas.focus({preventScroll:true});}}
    function mount(){
      stop();canvas=document.getElementById('world-canvas');if(!canvas)return;ctx=canvas.getContext('2d');npcDialog=document.getElementById('npc-dialog');abort=new AbortController();const opts={signal:abort.signal};
      const w=getState().world;drawX=w.x;drawY=w.y;lastZone=w.zone;lastTick=0;lastAnnouncement='';
      observer=new ResizeObserver(()=>{const dpr=Math.min(2,root.devicePixelRatio||1);canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);});observer.observe(canvas);
      const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
      document.addEventListener('keydown',event=>{
        if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||npcDialog.open||document.getElementById('dialog').open||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
        const direction=keys[event.key]||keys[event.key.toLowerCase()];if(direction){event.preventDefault();if(!event.repeat){held=direction;step(direction);lastTick=performance.now();}}
        else if(event.key.toLowerCase()==='e'||(event.key===' '&&!['BUTTON','A','SUMMARY'].includes(event.target.tagName))){event.preventDefault();if(!event.repeat)interact();}
      },opts);
      document.addEventListener('keyup',e=>{if((keys[e.key]||keys[e.key.toLowerCase()])===held)held=null;},opts);
      root.addEventListener('blur',()=>{held=null;},opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)held=null;},opts);
      for(const button of document.querySelectorAll('[data-move]')){
        button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held=button.dataset.move;step(held);lastTick=performance.now();},opts);
        for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{held=null;},opts);
        button.addEventListener('click',e=>{if(e.detail===0)step(button.dataset.move);},opts);
      }
      document.getElementById('world-interact').addEventListener('click',interact,opts);
      document.getElementById('world-zone').addEventListener('change',e=>changeZone(Number(e.target.value)),opts);
      document.getElementById('world-spawn').addEventListener('click',()=>{const w=getState().world;if(w.dialog)return;w.x=W.SPAWN.x;w.y=W.SPAWN.y;held=null;save();update();canvas.focus({preventScroll:true});},opts);
      canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}),opts);
      npcDialog.addEventListener('click',e=>{
        const button=e.target.closest('[data-npc-choice]');if(!button)return;const result=W.respond(getState(),button.dataset.npcChoice);if(!result)return;save();
        if(result.action==='battle'){
          if(getState().phase==='feedback'){changeView('battle');return;}
          if(result.zone===getState().chapter&&getState().phase==='question')train('flow');
          changeView('battle');return;
        }
        if(result.action==='library'||result.action==='wrongbook'){changeView(result.action==='library'?'library':'wrong',result.zone);return;}
        update();showConversation();if(!getState().world.dialog)canvas.focus({preventScroll:true});
      },opts);
      npcDialog.addEventListener('cancel',()=>{getState().world.dialog=null;held=null;save();update();},opts);
      update();showConversation();frame=requestAnimationFrame(tick);
    }
    function tick(now){if(!canvas?.isConnected)return;if(held&&now-lastTick>=145){step(held);lastTick=now;}draw(now);frame=requestAnimationFrame(tick);}
    function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function tree(x,y,seed){ellipse(x+24,y+35,27,13,'#0b1c194d');ctx.fillStyle='#504b32';ctx.fillRect(x+20,y+6,9,30);ellipse(x+24,y-2,26,31,seed%2?'#264b3c':'#1c4036');ellipse(x+14,y-6,19,23,'#2d5540');ellipse(x+28,y-17,20,23,'#3b6044');ellipse(x+29,y-24,9,10,'#496b4b');}
    function draw(now){
      const s=getState(),w=s.world,cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return;
      const dpr=canvas.width/cw;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
      if(lastZone!==w.zone){drawX=w.x;drawY=w.y;lastZone=w.zone;}
      drawX+=(w.x-drawX)*(reducedMotion?1:.28);drawY+=(w.y-drawY)*(reducedMotion?1:.28);
      if(reducedMotion)now=0;
      const scale=Math.max(cw<500?.85:1,cw/(W.WIDTH*T));const vw=cw/scale,vh=ch/scale;
      camX=Math.max(0,Math.min(W.WIDTH*T-vw,drawX*T+T/2-vw/2));camY=Math.max(0,Math.min(W.HEIGHT*T-vh,drawY*T+T/2-vh*.58));
      ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);const p=palettes[w.zone];
      for(let y=0;y<W.HEIGHT;y++)for(let x=0;x<W.WIDTH;x++){
        const tile=W.terrain(x,y),px=x*T,py=y*T,seed=(x*37+y*19)%17;
        ctx.fillStyle=(x+y)%2?p[0]:p[1];ctx.fillRect(px,py,T,T);
        if(tile==='='){ctx.fillStyle=p[2];ctx.fillRect(px,py,T,T);ctx.fillStyle='#ffffff0a';ctx.fillRect(px+3,py+3,20,18);ctx.fillRect(px+26,py+25,18,19);ctx.strokeStyle='#223b2930';ctx.strokeRect(px+2,py+2,T-4,T-4);}
        else if(tile==='~'){ctx.fillStyle=p[3];ctx.fillRect(px,py,T,T);ctx.strokeStyle='#81bdbb28';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+4,py+16+Math.sin(now/1200+x)*3);ctx.quadraticCurveTo(px+24,py+23,px+44,py+15);ctx.stroke();}
        else{ctx.fillStyle='#9bb77420';ctx.fillRect(px+seed+7,py+seed+10,2,5);ctx.fillRect(px+seed+11,py+seed+7,2,7);if(seed%5===0)ellipse(px+33,py+31,2,2,'#cbbd7b55');}
      }
      // Pool edging, a crossing, lanterns and the memory obelisk give each village a readable silhouette.
      ctx.strokeStyle='#798372';ctx.lineWidth=4;ctx.strokeRect(10*T,2*T,4*T,4*T);
      ctx.fillStyle='#6f674d';ctx.fillRect(10*T-8,4*T,4*T+16,22);for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#95856a':'#817257';ctx.fillRect(10*T+i*16,4*T+2,14,18);}
      for(const [x,y]of [[5,7],[9,7],[15,7],[19,7]]){ctx.fillStyle='#655a42';ctx.fillRect(x*T+22,y*T+6,4,39);ellipse(x*T+24,y*T+6,7,10,'#dbbd79');ellipse(x*T+24,y*T+6,17,20,'#f8d68b0d');}
      const lit=W.quest(w).claimed,bx=12*T+24,by=8*T+24;ellipse(bx,by+8,34,15,'#101e25a8');rounded(bx-22,by-10,44,24,5,'#6d7865');
      ctx.fillStyle=lit?'#c6eaa0':'#75847b';ctx.beginPath();ctx.moveTo(bx,by-88);ctx.lineTo(bx+15,by-45);ctx.lineTo(bx,by-13);ctx.lineTo(bx-15,by-45);ctx.closePath();ctx.fill();if(lit){ellipse(bx,by-46,27+Math.sin(now/700)*3,48,'#d4f5a31c');}
      // Sort by feet for correct overlap with foreground trees and other people.
      const objects=[];for(let y=0;y<W.HEIGHT;y++)for(let x=0;x<W.WIDTH;x++)if(W.terrain(x,y)==='#')objects.push({y:y*T+35,draw:()=>tree(x*T,y*T,(x+y)%3)});
      for(const n of W.cast)objects.push({y:n.y*T+35,draw:()=>{
        const x=n.x*T+24,y=n.y*T+36;ellipse(x,y,20,8,'#071c1a80');
        if(atlas.complete&&atlas.naturalWidth){const sw=atlas.naturalWidth/W.ATLAS_COLUMNS,dw=124*sw/atlas.naturalHeight;ctx.drawImage(atlas,n.portrait*sw,0,sw,atlas.naturalHeight,x-dw/2,y-116,dw,124);}else{rounded(x-12,y-65,24,60,8,n.color);ellipse(x,y-72,11,13,'#ddc8a1');}
        const near=Math.abs(w.x-n.x)+Math.abs(w.y-n.y)<=1;rounded(x-43,y-151,86,22,6,near?'#b8d596':'#152c25dc');ctx.textAlign='center';ctx.font='11px system-ui';ctx.fillStyle=near?'#203c26':'#e5e9d6';ctx.fillText(n.name,x,y-136);
        if(!w.met.includes(`${w.zone}:${n.id}`)){ellipse(x+31,y-155,8,8,'#ddc381');ctx.fillStyle='#34442a';ctx.font='bold 11px system-ui';ctx.fillText('!',x+31,y-151);}
      }});
      objects.push({y:drawY*T+35,draw:()=>{
        const x=drawX*T+24,y=drawY*T+34,bob=held?Math.sin(now/80)*2:Math.sin(now/650);ellipse(x,y+1,19,8,'#0b2520a0');ctx.strokeStyle='#d1e59d9c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+2,24,10,0,0,Math.PI*2);ctx.stroke();
        const poet=root.OSQuestPoetry.authorById.get(s.poetry.heroId),heroAtlas=poet?root.OSQuestPoetArt.sheets[poet.sheet]:atlas,columns=poet?4:W.ATLAS_COLUMNS,index=poet?poet.portrait:W.HERO_PORTRAIT;
        if(heroAtlas.complete&&heroAtlas.naturalWidth){const sw=heroAtlas.naturalWidth/columns,dw=124*sw/heroAtlas.naturalHeight;ctx.save();ctx.translate(x,y+bob);if(w.facing==='left')ctx.scale(-1,1);ctx.drawImage(heroAtlas,index*sw,0,sw,heroAtlas.naturalHeight,-dw/2,-116,dw,124);ctx.restore();}
        else{rounded(x-12,y-45,24,42,6,'#bace91');ellipse(x,y-52,11,12,'#dec39b');}
        ctx.textAlign='center';ctx.font='bold 10px system-ui';ctx.fillStyle='#e3eccb';ctx.fillText('你',x,y-123);
      }});objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.draw());
      for(const [x,delta,label]of [[1,-1,'上一章'],[22,1,'下一章']]){const px=x*T+24,py=8*T+24,locked=w.zone+delta<0||w.zone+delta>s.unlocked||w.zone+delta>7;ellipse(px,py,18,22,locked?'#7a867344':'#bcdb9355');ctx.textAlign='center';ctx.font='10px system-ui';ctx.fillStyle=locked?'#a8b5a2':'#e4eecb';ctx.fillText(label,px,py-30);ctx.font='22px system-ui';ctx.fillText(delta<0?'‹':'›',px,py+7);}
      ctx.restore();const shade=ctx.createRadialGradient(cw/2,ch/2,ch*.25,cw/2,ch/2,cw*.8);shade.addColorStop(0,'#08171000');shade.addColorStop(1,'#07151080');ctx.fillStyle=shade;ctx.fillRect(0,0,cw,ch);
    }
    return {html,mount,stop};
  }
  root.OSQuestWorldUI={create};
})(window);
