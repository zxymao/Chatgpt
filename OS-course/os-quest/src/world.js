(function(root){
  'use strict';
  const WIDTH=24,HEIGHT=16,TILE=48,SPAWN={x:3,y:8};
  const cast=[
    {id:'guide',name:'林岚',role:'远征引路人',x:6,y:5,portrait:0,color:'#c5df98'},
    {id:'engineer',name:'周衡',role:'系统工程师',x:17,y:5,portrait:1,color:'#e2b881'},
    {id:'archivist',name:'苏禾',role:'记忆档案员',x:7,y:11,portrait:2,color:'#b5c2ed'},
    {id:'ranger',name:'陈峻',role:'边界守望者',x:17,y:11,portrait:3,color:'#8dcac6'}
  ];
  const stories=[
    {title:'失灵的边界',place:'引导营地',incident:'营地的服务门失去了门禁，越权树灵正在误导新来的旅人。',problem:'要让普通应用安全地请求内核服务，应该怎样修复服务门？',choices:['设置系统调用号与参数，经过受控入口，由内核验证并执行','让应用直接改为内核态，再跳进任意内核地址'],right:0,lesson:'身份权限与 CPU 特权级不同。系统调用通过受控入口进入内核，也不必切换到另一个进程。',archive:'启动先经过固件与引导程序。进入营地后，记住同步异常由当前指令引起，外部中断则通常没有这种因果关系。'},
    {title:'等待中的旅人',place:'进程驿站',incident:'驿站把等待船只的旅人和只差通行证的旅人排进了同一队，调度石像无法分辨他们。',problem:'一个阻塞进程等到 I/O 完成，应该先把它送到哪里？',choices:['无条件立即运行，抢走当前进程的 CPU','先进入就绪队列，等调度器选中再运行'],right:1,lesson:'唤醒通常是阻塞→就绪，被调度才是就绪→运行。就绪主要缺 CPU，阻塞还缺某个事件或资源。',archive:'fork 创建新进程，exec 替换当前进程映像，wait/waitpid 等待并回收子进程。这三个动作的职责不要混在一起。'},
    {title:'双塔的回声',place:'线程庭院',incident:'两位记录员同时修改计数器，却发现两次加一只留下了一次记录。',problem:'两个线程都把 x=0 读进寄存器，再分别写回 1；问题出在哪里？',choices:['读—改—写没有正确同步，发生了丢失更新','线程必定拥有完全独立的进程地址空间'],right:0,lesson:'同一进程的线程共享地址空间，但各有 PC、SP、寄存器与栈。x++ 不是天然原子的复合操作。',archive:'join 等待指定线程结束；屏障让一组线程在某个阶段会合。M:1 的阻塞问题也不能直接推广到所有线程模型。'},
    {title:'被遗忘的队尾',place:'轮转集市',incident:'时间片的钟声停住了，长任务占着道路，短任务在队尾等不到回应。',problem:'RR 时间片结束后，当前任务尚未完成也没有阻塞，应该怎么办？',choices:['标为阻塞，等待一个并不存在的 I/O','保存上下文，进入就绪队尾，再调度队头任务'],right:1,lesson:'RR 用完时间片的可运行任务回到就绪队尾。响应时间只计到首次运行，等待时间则可以跨多次排队累计。',archive:'本课 STCF 是非抢占的最短作业优先，SRTCF 是抢占的最短剩余时间优先。比较算法时请先写清到达时刻和抢占规则。'},
    {title:'熔炉前的竞态',place:'互斥工坊',incident:'两位工匠同时进入熔炉操作区，刚刚完成的修改又被另一个人的旧结果覆盖。',problem:'要保护 counter++，锁应该覆盖哪一部分？',choices:['只在最终写回前加锁，读和计算留在外面','把读取、计算、写回整个读改写过程包在临界区中'],right:1,lesson:'所有冲突访问者都要遵守同一同步协议。普通布尔变量赋值和 volatile 都不能直接替代正确的原子锁。',archive:'自旋适合较短等待且持锁者可以继续运行的情形。只有本核关中断不能阻止另一核访问共享数据。'},
    {title:'环形等待之夜',place:'资源观察所',incident:'几支队伍各握着一把钥匙，等待另一队的钥匙，谁也走不出环形长廊。',problem:'统一要求所有线程按锁编号递增获取，主要破坏哪个条件？',choices:['环路等待','互斥'],right:0,lesson:'统一的资源获取顺序可破坏环路等待。安全状态有可保证完成的序列；不安全状态不等于已经死锁。',archive:'安全性检测令 Work=Available、Finish=false。假想某任务完成后 Work 增加 Allocation，不是 Max 或 Need。'},
    {title:'消失的通知',place:'同步水庭',incident:'仓库管理员在睡前错过了通知，货物明明已经到达，却再也没人叫醒他。',problem:'Mesa 条件变量 wait 返回后，应怎样检查是否真的有数据？',choices:['被唤醒就直接取数据，不必看共享状态','重新持锁，用 while 重查共享谓词'],right:1,lesson:'wait 原子释放关联锁并等待，返回前重新持锁；条件可能被别人改变，所以通常必须 while 重查。',archive:'信号量的许可可累计；条件变量 signal 通常不保留通知。生产者先等 empty，再取 mutex，避免持锁等空槽。'},
    {title:'星港的重复来信',place:'通信星港',incident:'一封确认信在途中丢失，同一条请求被重传，港口差点把同一批货物登记两次。',problem:'收到重传的相同请求 ID，接收方已经执行过业务，应怎样处理？',choices:['识别重复，避免重复执行，并再次发送匹配的 ACK','每次收到都重新执行，这样才算可靠'],right:0,lesson:'超时重传还需要考虑重复请求与 ACK 丢失。请求 ID、去重记录和幂等设计用于避免重复业务执行。',archive:'共享内存减少传递拷贝，但仍需同步。TCP 是字节流，消息边界和短读短写要由应用协议处理。'}
  ];
  const grid=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>
    x===0||y===0||x===WIDTH-1||y===HEIGHT-1?'#':'.'));
  // Solid scenery leaves the central cross and all four NPC approaches connected.
  for(let y=2;y<=5;y++)for(let x=10;x<=13;x++)grid[y][x]='~';
  for(const [x,y]of [[2,2],[3,2],[3,3],[4,12],[4,13],[10,12],[11,12],[12,12],[13,12],[20,3],[21,3],[21,4],[20,12],[21,12],[21,13]])grid[y][x]='#';
  for(let x=1;x<WIDTH-1;x++)grid[8][x]='=';
  for(let x=10;x<=13;x++)grid[4][x]='=';
  for(const x of [6,7,17])for(let y=4;y<=12;y++)if(grid[y][x]==='.')grid[y][x]='=';
  const rows=grid.map(row=>row.join(''));
  const byId=new Map(cast.map(n=>[n.id,n]));
  function create(zone=0){return {version:1,zone,x:SPAWN.x,y:SPAWN.y,facing:'down',active:false,met:[],quests:{},dialog:null};}
  function terrain(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<WIDTH&&y>=0&&y<HEIGHT?rows[y][x]:'#';}
  function walkable(x,y){return !(x===12&&y===8)&&!['#','~'].includes(terrain(x,y))&&!cast.some(n=>n.x===x&&n.y===y);}
  function nearby(w){return cast.filter(n=>Math.abs(n.x-w.x)+Math.abs(n.y-w.y)<=1)[0]||null;}
  function open(w,id){const n=nearby(w);if(w.dialog||!n||n.id!==id)return false;w.dialog={npcId:id,node:'start'};const key=`${w.zone}:${id}`;if(!w.met.includes(key))w.met.push(key);return true;}
  function move(w,direction){
    const offsets={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    if(w.dialog||!offsets[direction])return {moved:false};
    w.facing=direction;const [dx,dy]=offsets[direction];if(!walkable(w.x+dx,w.y+dy))return {moved:false};
    w.x+=dx;w.y+=dy;const n=nearby(w);
    if(n&&!w.met.includes(`${w.zone}:${n.id}`))open(w,n.id);
    return {moved:true,greeting:!!w.dialog,exit:w.y===8?(w.x===22?1:w.x===1?-1:0):0};
  }
  function enter(w,zone,unlocked){if(w.dialog||!Number.isInteger(zone)||zone<0||zone>7||zone>unlocked)return false;w.zone=zone;w.x=SPAWN.x;w.y=SPAWN.y;w.facing='right';return true;}
  function quest(w){return w.quests[w.zone]||{accepted:false,insight:false,claimed:false};}
  function progress(s){const w=s.world,q=quest(w);return [
    {label:'向林岚接下修复任务',done:q.accepted},
    {label:'与周衡讨论并修复控制台',done:q.insight},
    {label:'向苏禾查阅本章记忆',done:w.met.includes(`${w.zone}:archivist`)},
    {label:'答对本章任意一道流程题',done:Object.entries(s.records).some(([id,r])=>id.startsWith(`c${w.zone+1}-`)&&Number(id.split('-')[1])>=13&&r.right>0)}
  ];}
  function dialogue(s){
    const w=s.world,d=w.dialog;if(!d||!byId.has(d.npcId))return null;
    const n=byId.get(d.npcId),story=stories[w.zone],q=quest(w),choice=(id,label)=>({id,label});
    let text='',choices=[];
    if(n.id==='guide'){
      if(d.node==='accepted'){text=`任务已记下：${story.title}。先与周衡修复控制台，再找苏禾查阅记忆，并在本章答对一道流程题。最后去南侧找陈峻点亮锚点。`;choices=[choice('close','我出发了')];}
      else if(d.node==='lore'){text=`${story.incident} 每一章都有一枚记忆锚点。我们需要你理解其中的规则，再把正确流程带回这里。`;choices=[choice('accept','接下修复任务'),choice('close','先去看看')];}
      else{text=q.claimed?'锚点已恢复，这片土地又记起了自己的秩序。欢迎回来，守护者。':`欢迎来到${story.place}，${s.name}。${story.incident}`;choices=[choice('accept',q.accepted?'再确认一下任务':'接下修复任务'),choice('lore','这里发生了什么？'),choice('close','稍后再聊')];}
    }else if(n.id==='engineer'){
      if(d.node==='problem'){text=story.problem;choices=story.choices.map((label,i)=>choice(`solve-${i}`,label));choices.push(choice('close','我再想想'));}
      else if(d.node==='right'){text=`对，就是这个原理。${story.lesson} 控制台已恢复；再用一道流程题巩固它，就能为锚点补上执行记录。`;choices=[choice('battle','去答题远征，练习流程'),choice('close','继续探索')];}
      else if(d.node==='wrong'){text=`这个方案仍有问题。${story.lesson}`;choices=[choice('problem','重新检查方案'),choice('close','先查阅资料')];}
      else{text=q.insight?`控制台已修好。${story.lesson}`:'控制台只接受符合系统规则的修复方案。帮我检查一下？';choices=[choice('problem','检查控制台'),choice('battle','去练习流程题'),choice('close','稍后再聊')];}
    }else if(n.id==='archivist'){
      text=d.node==='notes'?`${story.archive} 图鉴还保存了每道题的完整过程与课件页码。`:`我替旅人保管每一次理解，而不只是一张答案。${story.lesson}`;
      choices=[choice('notes','继续阅读本章笔记'),choice('library','打开本章知识图鉴'),choice('wrongbook','打开我的错题本'),choice('close','谢谢，继续探索')];
    }else{
      const checks=progress(s),ready=checks.every(p=>p.done);
      if(d.node==='claimed'){text=`记忆锚点亮起来了！你获得了「${story.title}」记忆碎片。它将保存在远征纪事中。前方的章节仍由你在答题远征中的通关进度解锁。`;choices=[choice('close','收好碎片，继续前进')];}
      else{text=q.claimed?'这枚锚点已经恢复。你可以从东侧出口前往已解锁的下一章，也可以留在这里重温记忆。':ready?'四项修复记录都已齐备。要现在点亮记忆锚点吗？':`我在守护本章的记忆锚点。还需完成：${checks.filter(p=>!p.done).map(p=>p.label).join('；')}。`;
        choices=[...(ready&&!q.claimed?[choice('claim','点亮锚点，收集记忆碎片')]:[]),choice('battle','继续答题远征'),choice('close','继续探索')];}
    }
    return {npc:n,title:story.title,text,choices};
  }
  function respond(s,id){
    const w=s.world,d=w.dialog,shown=dialogue(s);if(!shown||!shown.choices.some(c=>c.id===id))return null;
    if(id==='close'){w.dialog=null;return {action:'close'};}
    if(['battle','library','wrongbook'].includes(id)){w.dialog=null;return {action:id,zone:w.zone};}
    if(!w.quests[w.zone])w.quests[w.zone]={accepted:false,insight:false,claimed:false};const q=w.quests[w.zone];
    if(id==='accept'){q.accepted=true;d.node='accepted';}
    else if(id.startsWith('solve-')){const right=Number(id.slice(6))===stories[w.zone].right;if(right)q.insight=true;d.node=right?'right':'wrong';}
    else if(id==='claim'){if(!progress(s).every(p=>p.done)||q.claimed)return null;q.claimed=true;d.node='claimed';}
    else d.node=id;
    return {action:'dialogue'};
  }
  function restore(value,chapter=0){
    const w=create(chapter),x=value;if(!x||x.version!==1)return w;
    const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
    if(integer(x.zone,0,7))w.zone=x.zone;
    if(integer(x.x,0,WIDTH-1)&&integer(x.y,0,HEIGHT-1)&&walkable(x.x,x.y)){w.x=x.x;w.y=x.y;}
    if(['up','down','left','right'].includes(x.facing))w.facing=x.facing;
    w.active=x.active===true;
    if(Array.isArray(x.met))w.met=[...new Set(x.met.filter(v=>typeof v==='string'&&/^[0-7]:(guide|engineer|archivist|ranger)$/.test(v)))];
    if(x.quests&&typeof x.quests==='object')for(const [id,q]of Object.entries(x.quests))if(/^[0-7]$/.test(id)&&q&&typeof q==='object')w.quests[id]={accepted:q.accepted===true,insight:q.insight===true,claimed:q.claimed===true};
    const nodes={guide:['start','accepted','lore'],engineer:['start','problem','right','wrong'],archivist:['start','notes'],ranger:['start','claimed']};
    if(x.dialog&&nodes[x.dialog.npcId]?.includes(x.dialog.node)&&nearby(w)?.id===x.dialog.npcId)w.dialog={npcId:x.dialog.npcId,node:x.dialog.node};
    return w;
  }
  const api={WIDTH,HEIGHT,TILE,SPAWN,cast,byId,stories,rows,create,terrain,walkable,nearby,open,move,enter,quest,progress,dialogue,respond,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OSQuestWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this);
