(function(root){
  'use strict';
  const ctx=(ra=100,sp=8192,n=0)=>({ra,sp,s:Array.from({length:12},(_,i)=>n+i)});
  const pcb=(pid,state='READY')=>({pid,state,context:ctx(100+pid,8192+pid*4096),deadline:0});
  const frame=(patch={},sepc=4096,sstatus=32)=>{
    const x=Array.from({length:32},(_,i)=>i*7);x[0]=0;
    for(const [i,n] of Object.entries(patch))x[i]=n;
    return {x,sepc,sstatus};
  };
  const t=(name,args,want,after)=>({name,args,want,...(after===undefined?{}:{after})});
  const machine=(states,current,ready,wait=[])=>({tasks:states.map((s,i)=>pcb(i,s)),current,ready,wait});
  const lock=(owner=null,waiters=[],states=['RUNNING','RUNNING','RUNNING'])=>({owner,waiters,states});
  const lessons=[];
  function add(id,title,concept,entry,signature,goal,invariant,question,hints,tests,extra={}){
    const stage=id<=11?1:id<=15?2:id<=22?3:4;
    const files=id<=7?'task1.c':id<=9?'context.S':id<=11?'task1.c':id<=15?'task2.c':id===16||id===17||id===20?'trap.S':id<=19?'task3.c':'task4.c';
    lessons.push({id,title,concept,entry,pet:null,stage,group:'p2-'+stage,
      file:'project2/exercises/'+files,
      story:extra.story||'宠物店里的每只宠物代表一条执行流。你写的状态转换将决定谁使用 CPU、谁等待、谁被唤醒。',
      goal,invariant,question,hints,tests,
      starter:`function ${entry}(${signature}) {\n  // TODO: ${concept}\n  throw new Error("请实现这一关的 OS 规则");\n}`,
      ...extra});
  }
  add(7,'给新店员建立 PCB','PCB、入口与栈对齐','initPCB','pid, entry, stackTop',
    '返回 {pid,state:"READY",context:{ra:entry,sp:向下按16字节对齐的stackTop,s:12个0}}。输入是安全整数。不要把栈顶当成入口地址。',
    '首次切入依靠 ra 找到入口；sp 必须对齐；每个 PCB 拥有独立 context。',
    '新任务从未调用 switch_to，为什么仍能通过 ret 进入任务函数？',
    ['先创建全新的 context 对象。','sp = Math.floor(stackTop / 16) * 16；不要对地址用 32 位按位运算。','C 中 ra/sp 对应 struct context 的前两个 uint64_t，s0～s11 清零。'],[
      t('对齐的栈',[2,4096,12288],{pid:2,state:'READY',context:{ra:4096,sp:12288,s:Array(12).fill(0)}}),
      t('栈顶向下对齐',[0,8192,12303],{pid:0,state:'READY',context:{ra:8192,sp:12288,s:Array(12).fill(0)}}),
      t('不能截断为32位',[1,4294971392,4294975503],{pid:1,state:'READY',context:{ra:4294971392,sp:4294975488,s:Array(12).fill(0)}})
    ],{story:'新来的边牧需要一张“工作档案”和自己的栈。初始化错一个地址，它就无法开始工作。'});
  add(8,'把寄存器装进背包','ABI 与 callee-saved 上下文','saveContext','cpu',
    'cpu={ra,sp,s:[12项],a:[8项],t:[7项],tp}。返回独立副本 {ra,sp,s}，不修改 cpu，不共享数组；此处是普通函数调用式切换，不是异常现场。',
    '协作式 context 保存 ra/sp/s0～s11；完整 trap frame 还需要 caller-saved 寄存器。',
    '为什么 switch_to 可以只保存一部分寄存器，而中断入口不可以？',
    ['只取 context 所需的三个字段。','数组要复制，不能让 PCB.s 与 CPU.s 指向同一个数组。','RISC-V sd/ld 每次处理 8 字节，s0 的偏移是 16，s11 是 104。'],[
      {...t('保存12个s寄存器',[{...ctx(91,8000,10),a:[1,2],t:[3,4],tp:2}],ctx(91,8000,10)),detached:true},
      {...t('所有寄存器都可为0',[{ra:0,sp:0,s:Array(12).fill(0),a:[],t:[],tp:0}],{ra:0,sp:0,s:Array(12).fill(0)}),detached:true}
    ]);
  {
    const cpu={...ctx(900,16384,20),tp:0},old=pcb(0,'RUNNING'),next=pcb(1);
    const saved={...old,context:ctx(900,16384,20)};
    add(9,'切换背包，接着执行','switch_to：先存后取','switchContext','cpu, oldPCB, nextPCB',
      '原地把 cpu 的 ra/sp/s 保存到 oldPCB.context，再恢复 nextPCB.context 到 cpu，cpu.tp=nextPCB.pid。返回 nextPCB.pid；不能修改 nextPCB 或共享 s 数组。tp 在模型中用 PID 表示，真实 C 中是 PCB 指针。',
      '先保存旧现场，再加载新现场；tp 必须与 current_running 对应。',
      '恢复 sp 后，代码正在使用谁的栈？ret 会回到哪一条指令？',
      ['保存阶段不能先覆盖 CPU。','oldPCB.context.s 和 cpu.s 都要使用副本。','真实汇编恢复 sp、ra、s0～s11，最后 ret；调度器先设置 tp。'],[
        {...t('完整切换',[cpu,old,next],1),afters:[{...next.context,tp:1},saved,next],separate:true},
        {...t('目标PID为0',[{...ctx(44,9008,5),tp:0},pcb(0),pcb(0)],0),afters:[{...ctx(100,8192),tp:0},{...pcb(0),context:ctx(44,9008,5)},pcb(0)],separate:true}
      ]);
  }
  add(10,'维护就绪队列','FIFO 与队列唯一性','enqueueReady','tasks, ready, pid',
    'tasks 下标等于 PID。仅当对应任务为 READY 且 ready 中不存在它时，追加 PID 并返回 true；否则返回 false，保持队列不变。任务本身不应被修改。',
    '一个 PCB 不能同时出现在多个队列，也不能在同一就绪队列重复出现。',
    '仅修改 PCB 的状态而不把它加入就绪队列，会出现什么现象？',
    ['先判断 PID 是否存在，再判断 state。','重复入队也要拒绝。','课程链表中的 node 同时挂入两个队列会破坏链表；数组模型也应保持同一不变量。'],[
      {...t('合法加入队尾',[[pcb(0),pcb(1)], [0],1],true),afters:[[pcb(0),pcb(1)],[0,1],1]},
      {...t('重复入队拒绝',[[pcb(0)],[0],0],false),afters:[[pcb(0)],[0],0]},
      {...t('睡眠任务不能就绪',[[pcb(0,'SLEEPING')],[],0],false),afters:[[pcb(0,'SLEEPING')],[],0]},
      t('无效PID',[[pcb(0)],[],5],false)
    ]);
  {
    const a=machine(['RUNNING','READY','BLOCKED'],0,[1]);
    const b=machine(['READY','RUNNING','BLOCKED'],1,[0]);
    const blocked=machine(['BLOCKED','READY'],null,[1]);
    const out=machine(['BLOCKED','RUNNING'],1,[]);
    add(11,'让调度器真正轮转','do_scheduler 状态机','schedule','m',
      'm={tasks,current,ready,wait}，current 为 PID 或 null。仅将当前 RUNNING 任务改为 READY 并入队尾；弹出就绪队头，改 RUNNING、更新 current 并返回 PID。无人可运行时 current=null，返回 -1。原地更新 m。',
      'BLOCKED/SLEEPING/DONE 不得重新入队；RUNNING 在单核上至多一个。',
      '为什么 do_block 后调用调度器时，不能无条件把原任务放回就绪队列？',
      ['先处理旧 current，再选择队头。','已经 BLOCKED 的 current 不能入 ready。','只有一个可运行任务时可以再次选中自己。'],[
        t('RUNNING排到队尾',[a],1,b),t('被阻塞任务不入队',[blocked],1,out),
        t('只有自己',[machine(['RUNNING'],0,[])],0,machine(['RUNNING'],0,[])),
        t('空队列进入idle',[machine(['BLOCKED'],null,[])],-1,machine(['BLOCKED'],null,[])),
        t('DONE任务不能复活',[machine(['DONE','READY'],0,[1])],1,machine(['DONE','RUNNING'],1,[]))
      ],{story:'通过本关，边牧才能让三名店员依次工作。真实验收要得到 012012012，且每条线程从原来暂停的位置继续。'});
  }
  add(12,'等饭时离开 CPU','do_block 与等待队列','blockCurrent','m',
    '若 current 指向 RUNNING 任务：改为 BLOCKED，加入 wait 队尾，current=null，返回 PID。没有运行任务返回 -1。这里只建模挂起步骤，下一次调度由调用者触发。',
    '阻塞的执行流离开 CPU，等待期间不消耗自旋时间。',
    '阻塞是线程自己停在那里循环，还是内核保存现场后让另一条线程执行？',
    ['取得当前 PID 后再清空 current。','状态、等待队列和 current 三者都要更新。','真实 p2_block 还要调用 p2_schedule 保存当前内核栈。'],[
      t('阻塞当前任务',[machine(['RUNNING','READY'],0,[1])],0,machine(['BLOCKED','READY'],null,[1],[0])),
      t('追加到等待队尾',[machine(['BLOCKED','RUNNING'],1,[],[0])],1,machine(['BLOCKED','BLOCKED'],null,[],[0,1])),
      t('idle不能阻塞',[machine(['BLOCKED'],null,[],[0])],-1,machine(['BLOCKED'],null,[],[0]))
    ]);
  add(13,'叫醒队头等待者','do_unblock：就绪不等于运行','wakeOne','m',
    '从 wait 队头取一个 PID，状态改 READY 并加到 ready 队尾，返回 PID；空 wait 返回 -1。不要改变 current，也不要立即把被唤醒任务改为 RUNNING。',
    '唤醒只获得被调度资格，不保证立即占用 CPU。',
    'do_unblock 为什么通常不直接调用 switch_to？',
    ['wait.shift() 取得最早等待者。','更新 state 后追加 ready。','保持当前 RUNNING 不变。'],[
      t('FIFO唤醒',[machine(['BLOCKED','BLOCKED','RUNNING'],2,[],[0,1])],0,machine(['READY','BLOCKED','RUNNING'],2,[0],[1])),
      t('保持原就绪队列',[machine(['BLOCKED','READY'],null,[1],[0])],0,machine(['READY','READY'],null,[1,0],[])),
      t('无等待者',[machine(['RUNNING'],0,[])],-1,machine(['RUNNING'],0,[]))
    ]);
  add(14,'一只饭碗只能一只占用','阻塞式互斥锁 acquire','acquire','lock, pid',
    'lock={owner:null或PID,waiters:[],states:按PID索引}。空闲则 owner=pid 返回 true；被别人持有则将 pid 置 BLOCKED、只入队一次，返回 false；owner===pid 时拒绝递归请求，返回 false 且不改动。',
    '互斥保护整个临界区；拿不到锁的线程必须离开就绪队列，而非忙等。',
    '单核上关闭中断是否等价于“任何时候都不需要锁”？',
    ['先判断 owner 是否为空。','重复请求不能在 waiters 中重复插入同一个 PID。','真实实现必须把判锁、入队和状态更新放在一个原子区间。'],[
      t('首次获得锁',[lock(),0],true,lock(0)),
      t('竞争失败并阻塞',[lock(0),1],false,lock(0,[1],['RUNNING','BLOCKED','RUNNING'])),
      t('重复等待不入两次',[lock(0,[1],['RUNNING','BLOCKED','RUNNING']),1],false,lock(0,[1],['RUNNING','BLOCKED','RUNNING'])),
      t('非递归锁不自锁',[lock(0),0],false,lock(0))
    ]);
  add(15,'把饭碗直接交给队头','release 与锁所有权移交','release','lock, pid',
    '只有 owner 能释放。非 owner 返回 false，不改动。合法释放返回 true：若有人等，先出队并将 owner 直接交给它，状态改 READY；无人等待则 owner=null。不要将新 owner 直接改 RUNNING。',
    '唤醒者获得锁的所有权，但仍需要等待 CPU 调度；新来的请求不能插队偷锁。',
    '先解锁再唤醒，和直接移交所有权，各自需要什么额外处理？',
    ['验证调用者是 owner。','新 owner 是 waiters.shift()，不是释放者。','直接交接策略下，acquire 从阻塞返回后已经拥有锁。'],[
      t('交给最早等待者',[lock(0,[1,2],['RUNNING','BLOCKED','BLOCKED']),0],true,lock(1,[2],['RUNNING','READY','BLOCKED'])),
      t('没有等待者则空闲',[lock(0),0],true,lock()),
      t('非所有者不能释放',[lock(0,[1]),2],false,lock(0,[1]))
    ],{story:'真实 QEMU 测试会在持锁时故意 yield，让其他线程争抢。正确代码应维持临界区互斥，并按 012012 的顺序交接饭碗。'});
  add(16,'看懂异常门牌号','RV64 scause 的中断位','decodeCause','hex',
    '输入 RV64 scause 的十六进制字符串。返回 {interrupt:Boolean,code:Number}；最高位 bit63 表示中断，其余63位是原因。测试原因号较小。请用 BigInt，避免 JS 32位位运算截断。',
    'ecall 是同步异常；Supervisor timer 是中断，不能仅比较低位。',
    'scause=8 与 0x8000000000000005 分别代表什么？',
    ['BigInt(hex) 转换完整64位整数。','1n << 63n 得到中断标志位。','真实 C 用 uint64_t；trap.S 要保留完整 scause。'],[
      t('U态ecall',['0x8'],{interrupt:false,code:8}),t('S态定时器中断',['0x8000000000000005'],{interrupt:true,code:5}),
      t('非法指令不是中断',['0x2'],{interrupt:false,code:2}),t('外部中断',['0x8000000000000009'],{interrupt:true,code:9})
    ]);
  add(17,'完整保存突发中断现场','SAVE_CONTEXT 与 trap frame','saveTrap','cpu',
    '返回独立副本 {x:[32个通用寄存器],sepc,sstatus}；x[0] 必须为0，不修改 cpu，也不能共享 x 数组。t/a 寄存器同样必须保存。浏览器省略 stval/scause 字段；真实汇编两者也要保存。',
    '异步中断可以出现在任意指令之间，不能依赖函数调用 ABI 帮你保住 caller-saved 寄存器。',
    '在保存 t0 之前，先用 t0 读取 sstatus，会丢掉什么？',
    ['复制全部32项，而不是只保存 s 寄存器。','把副本 x[0] 改为0。','先保存临时寄存器，再拿它读取 CSR。'],[
      {...t('完整现场',[frame({0:99,5:12345,10:600})],frame({5:12345,10:600})),detached:true},
      {...t('保存不同异常地址',[frame({31:8765},8192,256)],frame({31:8765},8192,256)),detached:true}
    ]);
  add(18,'把 ecall 参数交给内核','a7 调用号与 a0～a4 参数','syscallArgs','frame',
    '读取 frame.x，返回 {number:x[17],args:[x[10],x[11],x[12],x[13],x[14]]}，不要改动 frame。RISC-V ABI 中 a7=x17，a0=x10；返回值写回 a0。',
    '陷入内核时，必须从保存的用户寄存器中读取参数。',
    '为什么不能在 interrupt_helper 中随意读取“现在 CPU 的 a0”来当用户参数？',
    ['数组下标就是寄存器编号。','args 包含5项，不能把调用号混在里面。','C 与汇编必须约定同一个 trap frame 偏移布局。'],[
      t('提取调用号与5参数',[frame({17:1,10:4096,11:12,12:7,13:8,14:9})],{number:1,args:[4096,12,7,8,9]}),
      t('零值参数也须保留',[frame({17:99,10:0,11:0,12:0,13:0,14:0})],{number:99,args:[0,0,0,0,0]})
    ]);
  {
    const cases=[
      ['合法write',frame({17:1,10:5000,11:16}),4096,8192,100,16],
      ['边界长度为0',frame({17:1,10:8192,11:0}),4096,8192,100,0],
      ['起点越界',frame({17:1,10:1,11:5}),4096,8192,100,-14],
      ['长度越界',frame({17:1,10:8190,11:3}),4096,8192,100,-14],
      ['负长度',frame({17:1,10:4096,11:-1}),4096,8192,100,-14],
      ['读当前时钟',frame({17:2}),4096,8192,12345,12345],
      ['先识别调用号',frame({17:99,10:1,11:-1}),4096,8192,100,-38]
    ];
    add(19,'检查参数并越过 ecall','系统调用分发与 sepc+4','handleSyscall','frame, begin, end, now',
      '调用1=WRITE：a0地址和a1长度均须非负安全整数，要求 begin<=地址<=end 且 长度<=end-地址；合法返回长度，否则-14。调用2=TIME返回 now；其他-38。所有情况将结果写 frame.x[10]，sepc+=4，返回结果。只允许修改这两处。',
      '先检号再验参，检查在访问内存之前；ecall 地址必须前进一次，否则反复陷入。',
      '为何用 length <= end-address 检查范围，优于直接计算 address+length？',
      ['先 switch 调用号，未知号直接产生 -38。','只有 WRITE 才检查指针，TIME 不应被旧的 a0/a1 拦住。','最后统一写回 x[10]，把 sepc 加4；不要改其他寄存器。'],cases.map(([name,f,b,e,n,r])=>t(name,[f,b,e,n],r,{...f,x:f.x.map((v,i)=>i===10?r:v),sepc:f.sepc+4})));
  }
  add(20,'把结果带回用户态','RESTORE_CONTEXT、SPP 与 SPIE','userReturn','frame',
    '返回新的 {x,sepc,sstatus}：复制全部 x 并将 x0置0，sepc保持不变，sstatus清除SPP(bit8)、置SPIE(bit5)，保留其他位；不修改 frame，不共享数组。本题状态值小于2^31。真正改变特权级的是 sret。',
    '返回 U 态应有 SPP=0；SPIE 决定 sret 后的中断使能，不能把 sepc 再加4。',
    'sret 和普通 ret 在 PC、特权级与中断状态上有哪些区别？',
    ['status & ~(1<<8) 清除 SPP。','再 | (1<<5) 设置 SPIE。','恢复 a0 的系统调用返回值，包括负错误码。'],[
      {...t('清SPP保留其他位',[frame({10:-14},4100,0x502)],frame({10:-14},4100,0x422)),detached:true},
      {...t('已是U返回状态',[frame({10:12},9000,32)],frame({10:12},9000,32)),detached:true}
    ]);
  {
    const m={...machine(['RUNNING','READY'],0,[1]),now:10,sleepers:[]};
    const a=structuredClone(m);a.tasks[0].state='SLEEPING';a.tasks[0].deadline=13;a.sleepers=[0];a.current=null;
    const z=structuredClone(m);z.tasks[0].state='READY';z.ready.push(0);z.current=null;
    add(21,'安排睡眠，不空转等待','do_sleep 与绝对唤醒时刻','sleepTask','m, delay',
      '输入 m 含 now/tasks/current/ready/sleepers。正整数 delay：当前 RUNNING 改 SLEEPING，deadline=now+delay，加入 sleepers，current=null，返回0。delay=0：改 READY 放队尾并清 current。负数/非整数/无当前任务返回-22且不改动。',
      'sleep 的线程等待时不应占用 CPU；deadline 是绝对时刻。',
      '把 while(now<deadline) 放在用户代码里，与系统调用 sleep 有什么区别？',
      ['先验证全部输入，再改变状态。','睡眠者不放在 ready 队列。','课程 Task3 可以在调度时扫描唤醒，Task4 再由时钟触发调度。'],[
        t('睡3个tick',[m,3],0,a),t('零延迟只让出CPU',[m,0],0,z),t('拒绝负数',[m,-1],-22,m),
        t('拒绝小数',[m,1.5],-22,m),t('idle不可sleep',[{...m,current:null},1],-22,{...m,current:null})
      ]);
  }
  {
    const m={...machine(['SLEEPING','SLEEPING','SLEEPING','READY'],null,[3]),now:10,sleepers:[0,1,2]};
    m.tasks[0].deadline=10;m.tasks[1].deadline=14;m.tasks[2].deadline=8;
    const out=structuredClone(m);out.sleepers=[1];out.ready=[3,0,2];out.tasks[0].state=out.tasks[2].state='READY';
    add(22,'一次叫醒所有到期者','check_sleeping 与安全遍历','wakeExpired','m',
      '按 sleepers 的原顺序扫描全部睡眠者，将 deadline<=now 的任务改 READY 并加 ready 队尾；未来任务保留原次序。返回本次唤醒的 PID 数组；不改变 current。',
      '同一时刻到期的任务必须全部唤醒；删除队列节点不能漏掉紧随的下一个节点。',
      '遍历链表时先删除当前节点再取 next，可能造成什么错误？',
      ['构造一个新的 remaining 列表保存未到期者。','等于 deadline 就应唤醒；不能只判断大于。','不要找到一个就 return；扫描所有人。'],[
        t('未排序队列也全部唤醒',[m],[0,2],out),t('无睡眠者',[{...machine(['RUNNING'],0,[]),now:0,sleepers:[]}],[],{...machine(['RUNNING'],0,[]),now:0,sleepers:[]})
      ]);
  }
  add(23,'时间片到期再抢占','定时器重设与中断返回地址','timerEvent','m',
    'm={now,interval,ticks,remaining,quantum,needResched,sepc}。每次定时中断 ticks++、nextTimer=now+interval、remaining--；若减到0，重置为 quantum 且 needResched=true。其他情况保留 needResched。原地更新并返回 needResched；sepc绝不可增加。',
    '时钟中断是触发机制，时间片耗尽是调度策略；重新设置下一次硬件中断。',
    '为什么系统调用返回需要 sepc+=4，而时钟中断返回不能这样做？',
    ['先更新 tick 和 nextTimer。','remaining 耗尽时才设置调度标志。','这里没有 ecall 指令需要跳过。'],[
      t('尚未耗尽时间片',[{now:100,interval:10,ticks:7,remaining:2,quantum:3,needResched:false,sepc:8192}],false,{now:100,interval:10,ticks:8,remaining:1,quantum:3,needResched:false,sepc:8192,nextTimer:110}),
      t('时间片耗尽',[{now:150,interval:10,ticks:9,remaining:1,quantum:3,needResched:false,sepc:8194}],true,{now:150,interval:10,ticks:10,remaining:3,quantum:3,needResched:true,sepc:8194,nextTimer:160})
    ]);
  add(24,'没有 yield 也能轮流开店','综合：抢占、睡眠与就绪队列','runShop','tasks, budget',
    '每 tick 一个时间片，t=0..budget-1。tasks 含 {pid,state,remaining,wakeAt}。初始 READY 按数组顺序入队；每 tick 开始按数组顺序唤醒所有 wakeAt<=t 的 SLEEPING；运行队头一单位，remaining--；为0改 DONE，否则 READY 并排到队尾。无人运行记录 "idle"。原地更新 tasks，返回逐 tick PID/"idle" 数组。不要修改 wakeAt。',
    'CPU-bound 任务无需主动 yield；睡眠者不能被提前运行；每 tick 至多一个 RUNNING。',
    '模型里的一次 tick，在真实 OS 中对应哪条硬件中断路径？如何证明代码真的被抢占了？',
    ['初始化一次 FIFO ready 队列，不要每 tick 重建。','先唤醒，再运行；排队与任务完成都要更新状态。','真实 QEMU 用两个不调用 yield 的计算线程，验证所有任务在首个任务结束前就已开始。'],[
      t('两个计算任务轮转',[[{pid:0,state:'READY',remaining:2,wakeAt:0},{pid:1,state:'READY',remaining:2,wakeAt:0}],4],[0,1,0,1],[{pid:0,state:'DONE',remaining:0,wakeAt:0},{pid:1,state:'DONE',remaining:0,wakeAt:0}]),
      t('睡眠者到期加入队尾',[[{pid:0,state:'READY',remaining:3,wakeAt:0},{pid:1,state:'SLEEPING',remaining:1,wakeAt:2}],5],[0,0,0,1,'idle'],[{pid:0,state:'DONE',remaining:0,wakeAt:0},{pid:1,state:'DONE',remaining:0,wakeAt:2}]),
      t('同tick醒来不能漏人',[[{pid:0,state:'SLEEPING',remaining:1,wakeAt:1},{pid:1,state:'SLEEPING',remaining:1,wakeAt:1}],4],['idle',0,1,'idle'],[{pid:0,state:'DONE',remaining:0,wakeAt:1},{pid:1,state:'DONE',remaining:0,wakeAt:1}]),
      t('不能复活已完成任务',[[{pid:0,state:'DONE',remaining:0,wakeAt:0}],2],['idle','idle'],[{pid:0,state:'DONE',remaining:0,wakeAt:0}]),
      t('预算耗尽保留未完成任务',[[{pid:0,state:'READY',remaining:5,wakeAt:0}],2],[0,0],[{pid:0,state:'READY',remaining:3,wakeAt:0}])
    ],{story:'最后验收：三个班次中，有人一直计算、有人睡觉，到点后仍应继续营业。测试看的是你代码产生的执行时间线，不能用固定输出代替调度。'});
  const groups=[
    {id:'warmup',name:'选修热身 · 1–6',description:'字符串、页分配、选择器；不作为主线通关前提。'},
    {id:'p2-1',name:'Task 1 · 7–11',description:'PCB → 保存/恢复寄存器 → 就绪队列 → 协作调度'},
    {id:'p2-2',name:'Task 2 · 12–15',description:'挂起 → 唤醒 → 竞争锁 → FIFO 所有权交接'},
    {id:'p2-3',name:'Task 3 · 16–22',description:'异常现场 → ecall ABI → 参数检查 → sret → 阻塞睡眠'},
    {id:'p2-4',name:'Task 4 · 23–24',description:'定时器中断 → 时间片 → 无 yield 抢占综合验收'}
  ];
  const api={lessons,groups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PetCoreLessons=api;
})(globalThis);
