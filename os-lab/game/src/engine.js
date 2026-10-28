(function (root) {
  'use strict';
  const core=typeof module!=='undefined'&&module.exports?require('./project2.js'):root.PetCoreLessons;
  const pets = [
    {id:0,name:'小码',species:'cat',color:'#e6ab72',title:'你的第一位店员',lesson:0},
    {id:1,name:'串口奶猫',species:'cat',color:'#f0ce8e',title:'听见你的第一行代码',lesson:1},
    {id:2,name:'页页仓鼠',species:'hamster',color:'#c6a17c',title:'每颗粮都有自己的格子',lesson:2},
    {id:3,name:'轮转柯基',species:'dog',color:'#cb824a',title:'轮到每一位小伙伴',lesson:3},
    {id:4,name:'守门兔',species:'rabbit',color:'#dcc6de',title:'检查每一个服务请求',lesson:4},
    {id:5,name:'时钟狐狸',species:'fox',color:'#ec8c5d',title:'到时间就醒来',lesson:5},
    {id:6,name:'内核小龙',species:'dragon',color:'#78b7a1',title:'热身毕业的小伙伴',lesson:6},
    {id:7,name:'上下文边牧',species:'dog',color:'#8293a1',title:'真正轮转，不丢现场',lesson:11},
    {id:8,name:'锁锁浣熊',species:'hamster',color:'#9ca29a',title:'等到饭碗再开饭',lesson:15},
    {id:9,name:'异常守门兔',species:'rabbit',color:'#ceb3cb',title:'安全地走进内核，再返回',lesson:22},
    {id:10,name:'抢占星龙',species:'dragon',color:'#8b91c3',title:'没有 yield 也能公平营业',lesson:24}
  ];
  const lessons = [
    {id:1,title:'数一袋猫粮',concept:'字符串与结束符',entry:'measure',pet:1,file:'01_strings.c',
      story:'第一袋猫粮上的标签坏了。写一个函数数出有效字节，让小码知道要准备多少份粮。',
      goal:'返回字符串第一个 \\0 之前的长度；没有 \\0 就数到末尾。练习输入只使用 ASCII。',
      starter:'function measure(text) {\n  // 从 0 开始，遇到 "\\0" 或字符串末尾就停\n  return 0;\n}',
      hints:['准备一个计数器，从第一个位置开始。','同时检查是否到达末尾，以及当前字符是否为 "\\0"。','每前进一步加一；结束后返回计数。对应 C 内核里的 lab_strlen。'],
      tests:[{name:'空袋标签',args:[''],want:0},{name:'三份猫粮',args:['cat'],want:3},{name:'提前出现结束符',args:['ab\0cd'],want:2},{name:'首字节就是结束符',args:['\0milk'],want:0},{name:'标签包含空格',args:['pet food'],want:8}]},
    {id:2,title:'整理粮仓格子',concept:'物理页分配模型',entry:'takePage',pet:2,file:'02_pages.c',
      story:'仓鼠把粮仓分成了小格子。0 表示空闲，1 表示占用，不能把同一个格子重复发给两只宠物。',
      goal:'找到第一个 0，把它改成 1 并返回下标；没有空位返回 -1，且不改动数组。',
      starter:'function takePage(used) {\n  // 找到空格子后，别忘记标记为占用\n  return -1;\n}',
      hints:['从下标 0 开始扫描数组。','发现 used[i] === 0 时，先写入 1，再返回 i。','扫完仍未找到，才返回 -1。真实内核还要验证页对齐、清零和释放。'],
      tests:[{name:'第一格空闲',args:[[0,0,0]],want:0,after:[1,0,0]},{name:'跳过已占用格子',args:[[1,0,1]],want:1,after:[1,1,1]},{name:'只剩最后一格',args:[[1,1,0]],want:2,after:[1,1,1]},{name:'粮仓已满',args:[[1,1]],want:-1,after:[1,1]},{name:'空粮仓',args:[[]],want:-1,after:[]}]},
    {id:3,title:'轮流开饭',concept:'READY 与轮转调度',entry:'chooseNext',pet:3,file:'03_scheduler.c',
      story:'柯基总想第一个吃饭。请让 READY 的宠物轮流吃，睡着或正在忙的宠物暂时跳过。',
      goal:'从 current 的后一位循环查找 READY，最多看一圈；current=-1 从 0 开始；没有就返回 -1。',
      starter:'function chooseNext(states, current) {\n  // 只选择 "READY"，记得绕回数组开头\n  return -1;\n}',
      hints:['先处理空数组，避免对 0 求余。','检查 (起点 + 偏移) % states.length，偏移最多到长度减一。','只有一个 READY 时，也可以再次选择它；不能选择 BLOCKED。'],
      tests:[{name:'第一次调度',args:[['READY','READY'],-1],want:0},{name:'让下一位先来',args:[['READY','READY','READY'],0],want:1},{name:'跳过睡着的伙伴',args:[['READY','BLOCKED','READY'],0],want:2},{name:'绕回开头',args:[['READY','BLOCKED','READY'],2],want:0},{name:'只有自己就绪',args:[['BLOCKED','READY'],1],want:1},{name:'没有就绪宠物',args:[['BLOCKED','DONE'],0],want:-1},{name:'没有宠物',args:[[],-1],want:-1}]},
    {id:4,title:'兔子的服务窗口',concept:'系统调用与参数检查',entry:'service',pet:4,file:'04_syscall.c',
      story:'守门兔只接受合法的喂食请求。宠物不能跳过服务窗口，直接拿走别人的粮。',
      goal:'调用号 1 是喂食：petId 必须是 0～2 的整数，返回 "feed:编号"；坏参数返回 -14；未知调用号返回 -38。先判断调用号。',
      starter:'function service(number, petId) {\n  // 先分发，再检查参数\n  return -38;\n}',
      hints:['number !== 1 时立即返回 -38。','使用 Number.isInteger 检查整数，再检查范围。','返回值是 "feed:" + petId。真实内核还会发生 ecall 和特权级切换。'],
      tests:[{name:'合法喂食请求',args:[1,0],want:'feed:0'},{name:'最后一只宠物',args:[1,2],want:'feed:2'},{name:'负数编号',args:[1,-1],want:-14},{name:'越界编号',args:[1,3],want:-14},{name:'小数不是编号',args:[1,1.5],want:-14},{name:'未知调用',args:[99,0],want:-38},{name:'先检查调用号',args:[99,-1],want:-38}]},
    {id:5,title:'叫醒午睡狐狸',concept:'时间与唤醒条件',entry:'canWake',pet:5,file:'05_timer.c',
      story:'狐狸想睡到约定时刻。你要判断何时可以叫醒它，既不能提前，也不能错过刚好到点。',
      goal:'now 和 deadline 是同一时钟下的非负计数；到达或超过 deadline 返回 true，否则 false。本模型不考虑计数器回绕。',
      starter:'function canWake(now, deadline) {\n  // 刚好到点，也应该醒来\n  return false;\n}',
      hints:['比较的是绝对时刻，不是要再等待多久。','now 小于 deadline 表示尚未到期。','边界必须包含相等；真实内核第五关还要设置硬件定时器并处理中断。'],
      tests:[{name:'还没到点',args:[4,5],want:false},{name:'刚好到点',args:[5,5],want:true},{name:'已经超过时间',args:[7,5],want:true},{name:'从零开始',args:[0,0],want:true},{name:'较大时钟计数',args:[4294967300,4294967301],want:false}]},
    {id:6,title:'宠物店指令台',concept:'命令行解析',entry:'parseCommand',pet:6,file:'06_shell.c',
      story:'小龙要把宠物店变成能听懂文字的工坊。把一行文字解析成命令和参数，完成你的第一套指令台。',
      goal:'返回 {command, argument}。支持 feed 名字、echo 文本、help。忽略首尾空格；feed/echo 要有参数，help 不接受参数；其他返回 {command:"unknown",argument:""}。',
      starter:'function parseCommand(line) {\n  return {command: "unknown", argument: ""};\n}',
      hints:['先 trim()，再区分第一个单词和后面的文本。','必须匹配整个命令词，不能把 feedback 当作 feed。','保留参数内部空格；help extra 应判为 unknown。'],
      tests:[{name:'给小码喂食',args:['feed 小码'],want:{command:'feed',argument:'小码'}},{name:'忽略外侧空格',args:['  feed   小码  '],want:{command:'feed',argument:'小码'}},{name:'保留文本内部空格',args:['echo hello  pet'],want:{command:'echo',argument:'hello  pet'}},{name:'打开帮助',args:[' help '],want:{command:'help',argument:''}},{name:'缺少名字',args:['feed'],want:{command:'unknown',argument:''}},{name:'命令边界',args:['feedback cat'],want:{command:'unknown',argument:''}},{name:'多余参数',args:['help cat'],want:{command:'unknown',argument:''}},{name:'空命令',args:[''],want:{command:'unknown',argument:''}}]}
  ];
  for(const l of lessons)l.group='warmup';
  lessons.push(...core.lessons);
  function create() {
    return {version:2,food:8,completed:[],adopted:[0],selected:0,lesson:7,drafts:{},stats:{0:{full:60,bond:30}}};
  }
  function normalize(raw) {
    const s=create();
    if(!raw || typeof raw!=='object' || ![1,2].includes(raw.version)) return s;
    s.food=Number.isFinite(raw.food)?Math.max(0,Math.min(999,Math.floor(raw.food))):8;
    const allowed=new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=lessons.length));
    // Optional warmups are independent; the Project 2 mainline starts at 7.
    s.completed=[...allowed].filter(n=>n<=6).sort((a,b)=>a-b);
    for(let n=7;n<=lessons.length&&allowed.has(n);n++)s.completed.push(n);
    s.adopted=[0,...new Set((Array.isArray(raw.adopted)?raw.adopted:[]).filter(n=>Number.isInteger(n)&&n>0&&pets[n]&&s.completed.includes(pets[n].lesson)))];
    s.selected=s.adopted.includes(raw.selected)?raw.selected:0;
    s.lesson=Number.isInteger(raw.lesson)&&raw.lesson>=1&&raw.lesson<=lessons.length?raw.lesson:Math.min(24,7+s.completed.filter(n=>n>=7).length);
    for(const l of lessons) if(typeof raw.drafts?.[l.id]==='string')s.drafts[l.id]=raw.drafts[l.id].slice(0,12000);
    for(const id of s.adopted){const st=raw.stats?.[id]||{};s.stats[id]={full:Number.isFinite(st.full)?Math.max(0,Math.min(100,st.full)):60,bond:Number.isFinite(st.bond)?Math.max(0,Math.min(100,st.bond)):30};}
    return s;
  }
  function unlocked(s,id){return Number.isInteger(id)&&id>=1&&id<=lessons.length&&(id<=7||s.completed.includes(id-1));}
  function reward(s,id){
    if(!unlocked(s,id))return {ok:false,message:'先完成前一关。'};
    const first=!s.completed.includes(id);
    if(first)s.completed.push(id);
    s.completed.sort((a,b)=>a-b);s.food=Math.min(999,s.food+(first?8:2));
    const pet=pets.find(p=>p.lesson===id);
    return {ok:true,first,message:first?(pet?`解锁 ${pet.name}！`:'OS 主线推进一步！')+'获得 8 份饲料。':'再次验证成功，获得 2 份练习饲料。'};
  }
  function adopt(s,id){
    if(!Number.isInteger(id)||id<1||!pets[id]||!s.completed.includes(pets[id].lesson))return {ok:false,message:'完成对应关卡后才能领养。'};
    if(s.adopted.includes(id))return {ok:false,message:'它已经在你的店里啦。'};
    s.adopted.push(id);s.stats[id]={full:60,bond:30};s.selected=id;
    return {ok:true,message:`${pets[id].name} 搬进宠物店啦！`};
  }
  function feed(s,id){
    if(!s.adopted.includes(id))return {ok:false,message:'先领养这只宠物。'};
    if(s.food<1)return {ok:false,message:'饲料用完了，运行一关正确代码再赚一些。'};
    if(s.stats[id].full>=100)return {ok:false,message:'已经吃饱啦，可以摸摸它。'};
    s.food--;s.stats[id].full=Math.min(100,s.stats[id].full+15);s.stats[id].bond=Math.min(100,s.stats[id].bond+5);
    return {ok:true,message:`${pets[id].name} 开心地吃掉一份粮！`};
  }
  function pet(s,id){
    if(!s.adopted.includes(id))return {ok:false,message:'先领养它。'};
    s.stats[id].bond=Math.min(100,s.stats[id].bond+3);
    return {ok:true,message:`${pets[id].name} 蹭了蹭你的手。`};
  }
  // Run only in a disposable browser Worker (or controlled Node test process).
  // This checks behavior on multiple inputs, never source keywords or fixed PASS text.
  function grade(source,lesson){
    const rows=[],traces=[];
    let fn;
    try { fn=new Function('"use strict";\n'+source+'\nreturn typeof '+lesson.entry+' === "function" ? '+lesson.entry+' : null;')(); }
    catch(e){return {passed:false,rows:[{name:'代码能否运行',ok:false,detail:String(e.message)}]};}
    if(!fn)return {passed:false,rows:[{name:'找到指定函数',ok:false,detail:'请保留函数名 '+lesson.entry}]};
    const same=(a,b)=>{
      if(Object.is(a,b))return true;
      if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
      const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
      return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&same(a[k],b[k]));
    };
    const objects=value=>{
      const found=new Set();
      function walk(v){if(v&&typeof v==='object'&&!found.has(v)){found.add(v);for(const x of Object.values(v))walk(x);}}
      walk(value);return found;
    };
    for(const test of lesson.tests){
      const args=structuredClone(test.args);
      try{
        const got=fn(...args);
        const expected=structuredClone(test.afters??test.args);
        if(test.after!==undefined)expected[0]=test.after;
        let isolated=true;
        if(test.detached){const inputs=objects(args);isolated=![...objects(got)].some(v=>inputs.has(v));}
        if(test.separate)for(let i=0;i<args.length;i++)for(let j=i+1;j<args.length;j++){
          const left=objects(args[i]);if([...objects(args[j])].some(v=>left.has(v)))isolated=false;
        }
        const ok=same(got,test.want)&&same(args,expected)&&isolated;
        rows.push({name:test.name,ok,detail:ok?'通过':`输入 ${JSON.stringify(test.args)}；期望返回 ${JSON.stringify(test.want)}，实际 ${String(JSON.stringify(got))}`+(!same(args,expected)?`；期望执行后参数 ${JSON.stringify(expected)}，实际 ${JSON.stringify(args)}`:'')+(!isolated?'；出现了不允许的共享对象/数组引用':'')});
        traces.push({name:test.name,before:structuredClone(test.args),output:structuredClone(got),after:structuredClone(args),ok});
      }catch(e){rows.push({name:test.name,ok:false,detail:String(e.message)});}
    }
    return {passed:rows.length===lesson.tests.length&&rows.every(r=>r.ok),rows,traces};
  }
  const api={pets,lessons,groups:core.groups,create,normalize,unlocked,reward,adopt,feed,pet,grade};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PetKernel=api;
})(globalThis);
