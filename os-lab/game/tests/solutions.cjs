// Controlled test fixtures. The browser receives student code, never these answers.
const solutions=[
 function measure(s){let n=0;while(n<s.length&&s[n]!=="\0")n++;return n;},
 function takePage(a){for(let i=0;i<a.length;i++)if(a[i]===0){a[i]=1;return i;}return -1;},
 function chooseNext(s,c){for(let n=1;n<=s.length;n++){const i=(c+n)%s.length;if(s[i]==="READY")return i;}return -1;},
 function service(n,p){if(n!==1)return -38;if(!Number.isInteger(p)||p<0||p>2)return -14;return "feed:"+p;},
 function canWake(n,d){return n>=d;},
 function parseCommand(s){s=s.trim();const i=s.indexOf(" "),c=i<0?s:s.slice(0,i),a=i<0?"":s.slice(i+1).trim();if((c==="feed"||c==="echo")&&a)return {command:c,argument:a};if(c==="help"&&!a)return {command:c,argument:""};return {command:"unknown",argument:""};},
 function initPCB(pid,entry,stackTop){return {pid,state:'READY',context:{ra:entry,sp:Math.floor(stackTop/16)*16,s:Array(12).fill(0)}};},
 function saveContext(cpu){return {ra:cpu.ra,sp:cpu.sp,s:cpu.s.slice()};},
 function switchContext(cpu,oldPCB,nextPCB){oldPCB.context={ra:cpu.ra,sp:cpu.sp,s:cpu.s.slice()};cpu.ra=nextPCB.context.ra;cpu.sp=nextPCB.context.sp;cpu.s=nextPCB.context.s.slice();cpu.tp=nextPCB.pid;return nextPCB.pid;},
 function enqueueReady(tasks,ready,pid){if(!tasks[pid]||tasks[pid].state!=='READY'||ready.includes(pid))return false;ready.push(pid);return true;},
 function schedule(m){
   if(m.current!==null && m.tasks[m.current].state==='RUNNING'){
     m.tasks[m.current].state='READY';
     m.ready.push(m.current);
   }
   const next=m.ready.shift();
   if(next===undefined){ m.current=null; return -1; }
   m.current=next;
   m.tasks[next].state='RUNNING';
   return next;
 },
 function blockCurrent(m){if(m.current===null||m.tasks[m.current].state!=='RUNNING')return -1;const id=m.current;m.tasks[id].state='BLOCKED';m.wait.push(id);m.current=null;return id;},
 function wakeOne(m){if(!m.wait.length)return -1;const id=m.wait.shift();m.tasks[id].state='READY';m.ready.push(id);return id;},
 function acquire(lock,pid){if(lock.owner===null){lock.owner=pid;return true;}if(lock.owner!==pid){lock.states[pid]='BLOCKED';if(!lock.waiters.includes(pid))lock.waiters.push(pid);}return false;},
 function release(lock,pid){if(lock.owner!==pid)return false;const next=lock.waiters.shift();lock.owner=next===undefined?null:next;if(next!==undefined)lock.states[next]='READY';return true;},
 function decodeCause(hex){const n=BigInt(hex),flag=1n<<63n;return {interrupt:(n&flag)!==0n,code:Number(n&(flag-1n))};},
 function saveTrap(cpu){const x=cpu.x.slice();x[0]=0;return {x,sepc:cpu.sepc,sstatus:cpu.sstatus};},
 function syscallArgs(frame){return {number:frame.x[17],args:frame.x.slice(10,15)};},
 function handleSyscall(frame,begin,end,now){const number=frame.x[17],ptr=frame.x[10],size=frame.x[11];let r=-38;if(number===2)r=now;else if(number===1)r=Number.isSafeInteger(ptr)&&Number.isSafeInteger(size)&&size>=0&&ptr>=begin&&ptr<=end&&size<=end-ptr?size:-14;frame.x[10]=r;frame.sepc+=4;return r;},
 function userReturn(frame){const x=frame.x.slice();x[0]=0;return {x,sepc:frame.sepc,sstatus:(frame.sstatus&~256)|32};},
 function sleepTask(m,delay){if(!Number.isInteger(delay)||delay<0||m.current===null||m.tasks[m.current].state!=='RUNNING')return -22;const pid=m.current;if(delay===0){m.tasks[pid].state='READY';m.ready.push(pid);}else{m.tasks[pid].state='SLEEPING';m.tasks[pid].deadline=m.now+delay;m.sleepers.push(pid);}m.current=null;return 0;},
 function wakeExpired(m){const remaining=[],woken=[];for(const pid of m.sleepers){if(m.tasks[pid].deadline<=m.now){m.tasks[pid].state='READY';m.ready.push(pid);woken.push(pid);}else remaining.push(pid);}m.sleepers=remaining;return woken;},
 function timerEvent(m){m.ticks++;m.nextTimer=m.now+m.interval;m.remaining--;if(m.remaining===0){m.remaining=m.quantum;m.needResched=true;}return m.needResched;},
 function runShop(tasks,budget){const ready=tasks.filter(p=>p.state==='READY').map(p=>p.pid),trace=[];for(let t=0;t<budget;t++){for(const p of tasks)if(p.state==='SLEEPING'&&p.wakeAt<=t){p.state='READY';ready.push(p.pid);}const pid=ready.shift();if(pid===undefined){trace.push('idle');continue;}const p=tasks.find(p=>p.pid===pid);trace.push(pid);p.remaining--;if(p.remaining===0)p.state='DONE';else{p.state='READY';ready.push(pid);}}return trace;}
].map(f=>f.toString());
module.exports={solutions};
