# Project 3 S-Core：关键步骤与逐句讲解

16 个关键步骤；源码行号均指向校验后的归档原文件。

## 01 镜像里有程序，不等于已经创建了进程

把 P2 的开机批量建任务，推进到 P3 的交互创建、等待和结束；先弄清程序、进程和 PCB 槽位三个对象。

P1 加载后直接调用程序；P2 为镜像里的每个程序建任务并调度。P3 沿用加载、切栈、U 态 ecall 和抢占，增加动态生命周期；并非从头再写一个调度器。

本段是 P2 对照代码：输入任务目录 tasks[]，输出每个程序对应一个初始 READY 任务。P3 的新 init_pcb 在第02步完整列出，只先创建 shell。

### P2 的 init_pcb：开机遍历目录创建所有任务

P2:init/main.c L146—L171；P2 原码：固定任务启动的对照起点

```c
static void init_pcb(void)
{
    list_init(&ready_queue);
    list_init(&sleep_queue);
    list_init(&pid0_pcb.list);
    pid0_pcb.status = TASK_RUNNING;
    current_running = &pid0_pcb;
    __asm__ volatile ("csrw sscratch, %0" :: "r"(current_running) : "memory");
    for (int i = 0; i < task_num; ++i) {
        pcb_t *task = &pcb[i];
        bzero(task, sizeof(*task));
        task->pid = process_id++;
        task->status = TASK_READY;
        task->cursor_y = i * 2;
        list_init(&task->list);
        ptr_t ktop = allocKernelPage(1) + PAGE_SIZE;
        task->user_stack_base = allocUserPage(1);
        ptr_t utop = task->user_stack_base + PAGE_SIZE;
        uint64_t entry = load_task_img(tasks[i].task_name);
        assert(entry);
        init_pcb_stack(ktop, utop, entry, task);
        list_add_tail(&task->list, &ready_queue);
        printk("[LOAD] pid=%d task=%s entry=0x%lx\n\r", task->pid,
               tasks[i].task_name, entry);
    }
}
```

- **L146–147**：定义仅在本文件可见的开机初始化函数，不接受运行时命令或用户参数。
- **L148–149**：初始化就绪和睡眠队列，空队列头指回自身；队列不是任务的代码存储区。
- **L150–151**：初始化 PID0 的节点并标为运行中，作为尚未切到用户任务时的当前任务。
- **L152–153**：把 current_running 和异常锚点 sscratch 都指向 PID0，保持 C 和汇编看到同一个当前对象。
- **L154–156**：遍历 task_num 个磁盘任务记录；第 i 个记录固定占用第 i 个 PCB，先把这个 PCB 清零。
- **L157–159**：分配 PID、标 READY、分配屏幕行。这里的 pid 与 i 有规律对应，P3 动态创建后不能继续依赖这一巧合。
- **L160**：把进程的唯一排队节点 list 初始化为脱队自环，随后才能安全入就绪队列。
- **L161–163**：为任务分别分配内核栈和用户栈，保存用户栈基址，再计算栈顶。两种栈各自承担不同执行阶段。
- **L164–165**：按程序名装载磁盘镜像并取得入口；断言入口有效。取到数值入口不意味着已经执行到入口。
- **L166**：在两块栈上布置首次切换现场；这里还没有 argc 和整数参数的传递。
- **L167**：将 PCB 节点放到就绪队尾，真正执行要等调度器选中并恢复现场。
- **L168–169**：打印本次加载的 PID、程序名和入口，仅用于诊断。LOAD 输出不能代替任务实际运行证据。
- **L170–171**：结束循环和初始化。函数返回时，镜像目录中所有程序都已有对应任务。

### 执行推演

1. P2：TASKS 中有 A、B → 开机创建 A/B 两个 PCB → 两者交替运行。
2. P3：TASKS 中仍可打包六个程序 → 开机先创建 shell → 输入 exec 1 → 新建 waitpid 进程 → 它再按 ID 创建测试子进程。
3. 同一个程序可以得到多个 PID；某个 PCB 槽结束后可装入新 PID；程序 ID 仍是镜像目录下标。

### 现象与边界

- 启动时先看到 shell；ps 显示实际活进程，而不是把磁盘里六个程序都列为正在运行。
- 前台命令使 shell 等待，后台命令让 shell 继续接收输入；两条路径调用同一个 do_exec。
- 这里的 exec 是创建新进程，不是 POSIX exec 替换当前映像；waitpid 也没有实现 POSIX 的父子权限和退出码。
- S_CORE 是本包的接口选择宏，不代表让程序改在 S 态运行。默认 LAB_STAGE=4，用户程序仍通过 U 态 ecall 陷入。

## 02 把程序、进程和可复用的槽位分开

扩展 P2 的 PCB，使一次进程运行既有独立身份，也能在结束后把槽位和栈交给后来者；然后让开机路径只创建 shell。

P2 已有任务状态、独立栈、调度队列和两种现场。P3 增加的是动态生命周期：程序映像编号不再等同 PID，PCB 数组位置也不再固定对应某个程序。

输入是镜像中的 task_info_t 表与固定大小的 PCB 数组；输出是初始化后的空进程表、运行中的 PID0 和 READY 的 shell。普通任务尚未执行。

### 两种现场、状态、PCB 与进程表声明

P3:include/os/sched.h L35—L111；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
#define NUM_MAX_TASK 16

/* used to save register infomation */
typedef struct regs_context
{
    /* Saved main processor registers.*/
    reg_t regs[32];

    /* Saved special registers. */
    reg_t sstatus;
    reg_t sepc;
    reg_t sbadaddr;
    reg_t scause;
} regs_context_t;

/* used to save register infomation in switch_to */
typedef struct switchto_context
{
    /* Callee saved registers.*/
    reg_t regs[14];
} switchto_context_t;

typedef enum {
    TASK_BLOCKED,
    TASK_RUNNING,
    TASK_READY,
    TASK_EXITED,
} task_status_t;

/* Process Control Block */
typedef struct pcb
{
    /* register context */
    // NOTE: this order must be preserved, which is defined in regs.h!!
    reg_t kernel_sp;
    reg_t user_sp;
    reg_t trap_t0; /* offset 16: required by the P2 trap assembly */
    ptr_t kernel_stack_base;
    ptr_t user_stack_base;

    /* previous, next pointer */
    list_node_t list;
    list_head wait_list;

    /* process id */
    pid_t pid;

    /* BLOCK | READY | RUNNING */
    task_status_t status;

    /* cursor position */
    int cursor_x;
    int cursor_y;

    /* time(seconds) to wake up sleeping PCB */
    uint64_t wakeup_time; /* absolute rdtime ticks */

    /* A PCB slot and a program image have different lifetimes. */
    int used;
    int task_id;
    int barrier_idx; /* -1 unless queued at a barrier */

} pcb_t;

/* ready queue to run */
extern list_head ready_queue;

/* sleep queue to be blocked in */
extern list_head sleep_queue;

/* current running task PCB */
register pcb_t * current_running asm("tp");
extern pid_t process_id;

extern pcb_t pcb[NUM_MAX_TASK];
extern pcb_t pid0_pcb;
extern const ptr_t pid0_stack;
```

- **L35**：普通进程共有16个PCB槽位。PID0单独使用pid0_pcb，不占用这个数组中的一个元素；16不是PID的永久上限。
- **L37–39**：声明异常现场结构体。它描述被打断时的CPU状态，不是PCB，也不是正在执行的保存动作。
- **L40–41**：为x0—x31留出32个reg_t槽位。RV64每槽8字节；下标2、10、17分别对应sp、a0、a7。
- **L43–45**：保存返回相关CSR：sstatus控制恢复模式和中断状态，sepc决定恢复后的指令地址。
- **L46–48**：sbadaddr实际保存STVAL，scause保存异常原因。32个普通寄存器槽加4个CSR槽共288字节，类型名为regs_context_t。
- **L50–52**：定义switch_to使用的另一种现场，只覆盖C调用边界必须保持的寄存器。
- **L53–55**：14个槽保存ra、sp、s0—s11，共112字节。用户完整现场由上面的异常帧保护，不能把两种帧合并理解为同一个对象。
- **L57–59**：列出阻塞和运行两种状态。枚举顺序也被ps的状态字符串表使用，不能随意交换名称却不改打印表。
- **L60–62**：READY表示可调度，EXITED表示生命周期结束。EXITED并不直接等于used=0：当前进程退出时还在使用自己的内核栈。
- **L64–66**：开始定义pcb_t。它保存一次运行实例的状态，不保存镜像里的全部机器代码。
- **L67–70**：kernel_sp和user_sp是可恢复的栈位置。前两个字段的偏移必须保持为0和8，与P2异常/切换汇编一致。
- **L71**：trap_t0在偏移16处临时保存原t0，使异常入口能用t0计算切栈而不丢失用户寄存器值。
- **L72–73**：两项base保存已分配页的低地址。运行时sp会变化，重用栈页需要稳定的基址，不能把当前sp当作页起点。
- **L75–76**：list是“我自己排队”的内嵌节点，同一时刻只能属于一个就绪、睡眠、锁或其他等待队列。
- **L77**：wait_list是“别人在等我退出”的队列头。它不是第二个用于让我同时排队的节点；等待者放入的是等待者各自的list。
- **L79–80**：pid标识这一次创建的进程。槽位复用后会获得新的PID，所以旧PID不会突然指向新实例。
- **L82–83**：status决定调度资格。上面的旧注释只列了三项，但实际枚举还包含TASK_EXITED，不能据注释漏掉退出状态。
- **L85–87**：保存每个进程的屏幕光标位置，继续沿用P2的按任务输出机制。它不是硬件显卡上下文或独立终端。
- **L89–90**：wakeup_time保存绝对rdtime tick。seconds是旧注释；do_sleep负责把秒数乘time_base后加到当前tick。
- **L92–94**：used表示槽位仍被占用；task_id是程序在镜像表中的下标。used为0的旧槽可能仍留有栈页基址，但不再是可查找的活进程。
- **L95–97**：barrier_idx记录当前在哪个屏障排队，未等待时为-1。退出清理利用它撤销计数；结束pcb_t定义。
- **L99–100**：就绪队列包含可运行普通进程的list节点。extern只声明对象，真正的队列头在sched.c中定义。
- **L102–103**：睡眠队列保存等待时钟到期的进程。一个进程不应同时出现在这里和ready_queue中。
- **L105–107**：current_running绑定到RISC-V的tp寄存器，内核通过它找到当前PCB；process_id是下一个待分配的PID。用户tp另由异常现场保存和恢复。
- **L109–111**：声明16槽PCB数组、独立PID0对象与idle栈顶。PID0是没有普通用户程序可选时的调度后备。

### 静态存储与两个队列头

P3:kernel/sched/sched.c L18—L24；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
pcb_t pcb[NUM_MAX_TASK];
const ptr_t pid0_stack = INIT_KERNEL_STACK + PAGE_SIZE;
pcb_t pid0_pcb = { .pid = 0, .kernel_sp = INIT_KERNEL_STACK + PAGE_SIZE,
                   .user_sp = INIT_KERNEL_STACK + PAGE_SIZE };
LIST_HEAD(ready_queue);
LIST_HEAD(sleep_queue);
pid_t process_id = 1;
```

- **L18**：真正分配16份PCB存储。定义数组本身不会创建16个可运行进程。
- **L19**：保存idle内核栈的高地址，PAGE_SIZE来自课程页大小约定。
- **L20–21**：定义PID0的初始PCB；内核栈和初始栈位置均指向启动栈顶。PID0不需要通过普通程序ID去装载一个用户映像。
- **L22–23**：LIST_HEAD让两个哨兵头的next/prev都指向自己，因此初始为空队列。
- **L24**：第一个普通进程将获得PID1。只有创建成功后才递增这个计数器。

### 集中初始化进程表和idle

P3:kernel/sched/sched.c L35—L56；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void init_process_table(void)
{
    list_init(&ready_queue);
    list_init(&sleep_queue);
    bzero(pcb, sizeof(pcb));
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        pcb[i].status = TASK_EXITED;
        pcb[i].task_id = -1;
        pcb[i].barrier_idx = -1;
        list_init(&pcb[i].list);
        list_init(&pcb[i].wait_list);
    }
    list_init(&pid0_pcb.list);
    list_init(&pid0_pcb.wait_list);
    pid0_pcb.status = TASK_RUNNING;
    pid0_pcb.used = 1;
    pid0_pcb.task_id = -1;
    pid0_pcb.barrier_idx = -1;
    current_running = &pid0_pcb;
    process_id = 1;
    __asm__ volatile ("csrw sscratch, %0" :: "r"(current_running) : "memory");
}
```

- **L35–36**：定义只在开机调用的进程表初始化函数。运行时exec不会再次清空整张表。
- **L37–39**：重置就绪/睡眠队列并清零全部PCB，因而初始used和两页栈基址都是0。
- **L40–43**：遍历普通槽，把状态设为EXITED，把程序和屏障下标设为-1；这里表示“尚未分配”，不是16个已运行过的僵尸进程。
- **L44–46**：每个槽的list和wait_list都初始化为自环，分别保证以后可以安全入队和收集退出等待者。
- **L47–48**：单独初始化PID0的节点与等待头，不把它接进普通就绪队列。
- **L49–52**：PID0标为RUNNING和used；它没有普通程序映像，也不参加屏障等待。
- **L53–54**：把内核tp所代表的current_running设为PID0，并把下一个普通PID重置为1。
- **L55–56**：写sscratch，使P2异常入口也能定位当前PCB；memory约束阻止编译器把相关内存访问随意跨过这个汇编边界。

### 有shell时只创建shell；无shell时保留P2回归路径

P3:init/main.c L144—L156；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static void init_pcb(void)
{
    init_process_table();
    for (int i = 0; i < task_num; ++i) {
        if (!strcmp(tasks[i].task_name, "shell")) {
            assert(do_exec(i, 0, 0, 0, 0) == 1);
            return;
        }
    }
    /* Keeps small P2 regression images usable when no shell is included. */
    for (int i = 0; i < task_num; ++i)
        assert(do_exec(i, 0, 0, 0, 0) > 0);
}
```

- **L144–146**：开机建进程的入口先初始化进程表。此时只是准备对象，还没有通过switch_to运行用户代码。
- **L147–149**：按程序名扫描镜像表，发现shell后用它的实际下标调用do_exec；断言首次成功创建返回PID1。
- **L150–152**：立即返回，避免再把waitpid、barrier等镜像程序自动创建一遍。它们将由shell命令动态启动。
- **L153–155**：如果镜像不含shell，则按表为所有程序建进程。这条显式回退路径让P2双probe等小镜像仍可用于回归。
- **L156**：结束初始化函数。是否开机创建所有程序，取决于镜像是否含shell，而不是只看PROJECT_IDX的数字。

### 执行推演

1. 默认镜像有6个程序记录，但init_pcb只把程序ID0的shell变为PID1。其余5个只是可以被exec选择的映像。
2. shell执行exec 1时，找到的是镜像中的waitpid程序；新进程通常获得PID2，使用第一个空闲PCB槽，而不是pcb[1]这个固定位置。
3. PID2结束并切走后，该槽可以用于PID3、PID4等；镜像ID1仍是原来的waitpid程序，三类编号各自保持含义。

### 现象与边界

- ps应能看到idle和shell；默认启动时不应已经出现全部课程测试进程。代码依据是init_pcb发现shell后的return。
- 重复exec/exit后进程号增长而槽位可继续使用；身份来自pid字段，容量来自used字段。
- S_CORE选择本课程的整数参数接口，不表示用户程序运行在S态。默认LAB_STAGE=4时首次返回仍进入U态。
- wait_list是等待我的人组成的队列头；list是我加入别人队列的节点。两者用法颠倒会破坏链表。

## 03 先造好两种现场，再让新进程进入用户态

把程序入口和最多三个整数参数放进初始现场，让新进程第一次被调度时沿P2返回路径进入自己的crt0。

P2已有两页栈、288字节异常帧和112字节切换帧。P3把初始栈函数移到公共调度模块，并补上argc、arg0、arg1、arg2。

ktop/utop分别是内核栈页和用户栈页的高地址，entry是已装载程序入口；输出是页内的两个帧以及PCB里的栈位置。这个函数不立即跳转或调用用户main。

### 完整初始现场构造函数

P3:kernel/sched/sched.c L58—L81；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void init_pcb_stack(ptr_t ktop, ptr_t utop, ptr_t entry, pcb_t *task,
                    int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    regs_context_t *regs = (regs_context_t *)(ktop - sizeof(*regs));
    switchto_context_t *sw = (switchto_context_t *)((ptr_t)regs - sizeof(*sw));
    bzero(regs, sizeof(*regs));
    bzero(sw, sizeof(*sw));
    regs->regs[2] = utop;
    regs->regs[10] = argc;
    regs->regs[11] = arg0;
    regs->regs[12] = arg1;
    regs->regs[13] = arg2;
    regs->sepc = entry;
#if LAB_STAGE >= 3
    regs->sstatus = SR_SPIE;
#else
    regs->regs[4] = (ptr_t)task;
    regs->sstatus = SR_SPP;
#endif
    sw->regs[0] = (ptr_t)ret_from_exception;
    sw->regs[1] = (ptr_t)sw;
    task->kernel_sp = (ptr_t)sw;
    task->user_sp = utop;
}
```

- **L58–60**：声明两种栈顶、入口、目标PCB以及整数参数。uint64_t承载寄存器位模式；参数不是char **argv，也没有在这里复制字符串数组。
- **L61**：把异常帧放到内核栈顶以下sizeof(*regs)字节处。这里只计算地址，还没有执行异常返回。
- **L62**：再把切换帧放在异常帧下面。RV64本实现两帧合计400字节，ktop往低地址依次是异常帧、切换帧。
- **L63–64**：清零两个帧，避免初次恢复读到旧寄存器或旧CSR值。这里不清零整页用户栈。
- **L65**：异常帧里的x2槽写入用户栈顶；RESTORE_CONTEXT恢复它后，用户程序使用独立的用户栈。
- **L66**：用户初始a0设为argc。sys_exec自己的第一个参数id用于选择映像，不会作为子程序argc传入。
- **L67–69**：用户初始a1、a2、a3分别接收三个整数槽arg0、arg1、arg2。main是否使用后几个槽，由argc和用户代码决定。
- **L70**：把异常返回地址sepc设为entry，它通常指向用户crt0入口，而不是直接指向C的main。
- **L71–72**：默认LAB_STAGE=4满足条件，sstatus只设置SPIE，SPP保持0，因此首次sret回到U态，并按异常返回规则恢复中断允许状态。
- **L73–76**：保留P2早期阶段路径：将tp预置为PCB并设置SPP，返回S态运行。它不是当前P3默认用户模式路径。
- **L77**：切换帧中的初始ra指向ret_from_exception。第一次switch_to恢复ra再ret，就会走既有异常恢复汇编。
- **L78–79**：切换帧里的sp及PCB.kernel_sp都指向这个sw地址，使恢复代码从正确的帧位置取回寄存器。
- **L80–81**：PCB同时记住用户栈初始sp。以后U态陷入时，异常入口会更新相关栈位置。

### C布局与P2汇编偏移的编译期约束

P3:init/main.c L24—L29；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
_Static_assert(sizeof(regs_context_t) == OFFSET_SIZE, "trap ABI size");
_Static_assert(sizeof(switchto_context_t) == SWITCH_TO_SIZE, "switch ABI size");
_Static_assert(__builtin_offsetof(pcb_t, kernel_sp) == PCB_KERNEL_SP, "kernel_sp ABI");
_Static_assert(__builtin_offsetof(pcb_t, user_sp) == PCB_USER_SP, "user_sp ABI");
_Static_assert(__builtin_offsetof(pcb_t, trap_t0) == PCB_TRAP_T0, "trap scratch ABI");
_Static_assert(sizeof(task_info_t) == 48, "disk task metadata ABI");
```

- **L24–25**：分别核对异常帧和切换帧大小与汇编常量一致；布局错误会在编译阶段停止，而不是等异常返回后才随机崩溃。
- **L26–28**：核对PCB前3个字段的偏移0、8、16。新增kernel_stack_base必须放在它们之后，不能把trap_t0挤到别的位置。
- **L29**：任务镜像记录必须是48字节。它属于磁盘/装载协议，与内存中PCB的大小不是同一件事。

### 沿用的线性页分配器：为何P3必须记住栈基址

P3:kernel/mm/mm.c L3—L20；与 P3 原始框架同名文件字节一致

```c
static ptr_t kernMemCurr = FREEMEM_KERNEL;
static ptr_t userMemCurr = FREEMEM_USER;

ptr_t allocKernelPage(int numPage)
{
    // align PAGE_SIZE
    ptr_t ret = ROUND(kernMemCurr, PAGE_SIZE);
    kernMemCurr = ret + numPage * PAGE_SIZE;
    return ret;
}

ptr_t allocUserPage(int numPage)
{
    // align PAGE_SIZE
    ptr_t ret = ROUND(userMemCurr, PAGE_SIZE);
    userMemCurr = ret + numPage * PAGE_SIZE;
    return ret;
}
```

- **L3–4**：两个游标分别从内核和用户可用内存起点开始；它们不是每个进程独有的页表。
- **L6–8**：定义内核页分配函数，按PAGE_SIZE对齐当前游标。
- **L9–11**：返回对齐后的旧位置，并把游标向后推进numPage页。它没有释放接口，也没有在这里检查内存总量或返回分配失败码。
- **L12**：结束内核分配函数；返回值是页低地址，不是栈顶。
- **L14–16**：用户页分配使用另一个游标，算法与内核页相同。
- **L17–19**：为用户区域对齐并前移游标。所谓UserPage是本课程分配区域命名，不会自动建立U态页权限或地址空间隔离。
- **L20**：结束用户分配函数。P3通过复用PCB槽已持有的页避免每次exec都推进这两个游标。

### 执行推演

1. 假设内核页低地址为K，ktop=K+PAGE_SIZE，regs放在ktop−288，sw再放到regs−112；把task.kernel_sp指向sw。
2. 新PCB进入就绪队列后，被选中时switch_to恢复sw.ra与sw.sp；ret先到ret_from_exception。
3. RESTORE_CONTEXT读回a0—a3、sepc、sstatus和用户sp；sret进入crt0；crt0清BSS后调用main。
4. 若exec给argc=2、arg0=7、arg1=9，用户main进入时a0=2、a1=7、a2=9；不是a0=程序ID。

### 现象与边界

- 参数探针应在用户态读到argc与对应整数值；依据是初始帧x10—x13的赋值，而不是在内核直接调用用户函数。
- 重复使用PCB槽时，仍能创建可运行进程；栈基址被保留，但两种初始帧被重新清零并填写。
- sw是switchto_context_t指针，sw->regs[0]是内存写入，不是执行名为sw的函数。
- 线性分配器没有完整回收机制；复用这两页栈解决的是本实现反复创建的资源增长，不代表通用物理内存管理已经完成。

## 04 exec返回新PID，shell继续运行

完成“选择程序—找空槽—取得栈—建立现场—就绪入队—返回PID”的创建闭环。

P2在开机时为镜像中的所有任务建PCB；P3将它变成可由系统调用随时请求的do_exec，开机创建shell也复用同一函数。

输入是有效程序ID、0—3的argc及三个整数槽；成功返回一个新PID，失败返回-1。此课程exec创建新进程，不替换调用者当前程序。

### 完整动态创建路径

P3:kernel/sched/sched.c L134—L181；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
pid_t do_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    uint64_t flags = irq_save();
    if (id < 0 || id >= task_num || argc < 0 || argc > 3 ||
        process_id == INT32_MAX) {
        irq_restore(flags);
        return -1;
    }
    reap_exited();
    pcb_t *task = NULL;
    int image_in_use = 0;
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        if (!pcb[i].used && !task) task = &pcb[i];
        if (pcb[i].used && pcb[i].status != TASK_EXITED && pcb[i].task_id == id)
            image_in_use = 1;
    }
    if (!task) {
        irq_restore(flags);
        return -1;
    }
    /* Flat shared images: do not overwrite another live instance's data. */
    ptr_t entry = image_in_use ? tasks[id].entrypoint :
                                load_task_img(tasks[id].task_name);
    if (!entry) {
        irq_restore(flags);
        return -1;
    }
    ptr_t kbase = task->kernel_stack_base;
    ptr_t ubase = task->user_stack_base;
    if (!kbase) kbase = allocKernelPage(1);
    if (!ubase) ubase = allocUserPage(1);
    bzero(task, sizeof(*task));
    task->kernel_stack_base = kbase;
    task->user_stack_base = ubase;
    task->task_id = id;
    task->barrier_idx = -1;
    list_init(&task->list);
    list_init(&task->wait_list);
    init_pcb_stack(kbase + PAGE_SIZE, ubase + PAGE_SIZE, entry,
                   task, argc, arg0, arg1, arg2);
    task->pid = process_id++;
    task->used = 1;
    task->status = TASK_READY;
    list_add_tail(&task->list, &ready_queue);
    pid_t pid = task->pid;
    irq_restore(flags);
    return pid;
}
```

- **L134–136**：定义创建函数并保存/屏蔽中断。单核内核修改槽位、PID和链表期间不允许时钟切换到另一请求者。
- **L137–138**：拒绝越界程序ID、负argc、超过3个参数及即将达到INT32_MAX的PID分配器。程序ID上限来自task_num，不是当前活进程数。
- **L139–141**：失败前恢复调用前的中断状态并返回-1，没有消耗PID，也没有创建PCB。
- **L142**：回收已退出且不再使用当前CPU栈的槽位；它只使槽可用，不释放页或重置PID分配器。
- **L143–144**：task将指向找到的第一个空槽，image_in_use记录同程序是否还有活实例；初值分别为空和否。
- **L145–146**：扫描固定16槽，记录首个used=0的PCB。继续扫描不是为了换成更靠后的空槽，而是还要检测活映像。
- **L147–149**：发现used且非EXITED、task_id相同的进程，就标记映像仍被使用。不同PID可以对应同一个程序ID。
- **L150–153**：没有空槽时恢复中断并返回-1。退出进程释放槽后可以再创建；这里的容量耗尽不是PID号码达到16。
- **L154–156**：同程序有活实例时直接复用tasks[id].entrypoint；否则按名字装载。固定地址共享映像不能在活实例执行时重新读盘覆盖其数据。
- **L157–160**：入口为0表示装载失败，恢复中断并返回-1；仍没有分配新PID。
- **L161–162**：在清空PCB前取出该槽以前保留的两页栈基址。空槽不等于这些页从未分配过。
- **L163–164**：基址为0时才分别分配一页内核/用户栈。已有基址直接复用，使长期exec/exit不再为同一槽无限分配页。
- **L165**：清零旧PCB内容，清掉旧PID、状态、光标、唤醒时刻等；上面已临时保存的栈基址不会丢失。
- **L166–167**：把两页基址写回新PCB，建立这个槽以后可继续复用的资源记录。
- **L168–169**：设置当前程序ID并标明没有屏障等待。这里不把PID当tasks数组下标。
- **L170–171**：重新初始化自身节点和退出等待头；旧实例的等待者应已由退出清理唤醒，不能遗留进新进程。
- **L172–173**：用两页的高地址、程序入口及参数构造初始帧。只是准备将来恢复的现场，尚未运行新程序。
- **L174**：分配当前process_id后再递增。仅成功走到这里的创建占用PID，因此所有更早的正PID都确实创建过。
- **L175–176**：将槽标为占用、新进程标为READY。它不应在创建时直接成为current_running。
- **L177**：把新进程唯一的list节点追加到就绪队尾，以后由调度器选择它。
- **L178–180**：先保存返回值，再恢复中断状态，最后返回新PID。调用者能继续执行，也可用这个PID执行waitpid或kill。
- **L181**：结束创建函数。是否前台等待由shell后续是否调用waitpid决定，不由do_exec偷偷阻塞调用者。

### 执行推演

1. shell是PID1，输入exec 1：程序ID1定位waitpid映像；do_exec找到一个空槽，为本次运行分配PID2。
2. 如果没有同程序活实例，装载其映像；写入task_id=1、pid=2、used=1、status=READY，再加入ready_queue。
3. shell拿到返回值2；前台命令接着waitpid(2)，后台命令则立即回到读命令循环。
4. PID2退出且切走后，同一PCB槽可以装入另一个程序ID并获得PID3；新PID不等于“原槽编号加一”。

### 现象与边界

- 进程表满时exec返回-1；结束部分进程后应能重新创建。依据是used查槽与退出/延迟回收流程。
- 动态PID已经大于程序数时，用户输出仍应正常；task_id继续标识映像范围，不应再使用pid−1查程序表。
- 多个同程序实例有独立PCB和栈，但仍共享固定地址代码、全局变量和BSS；每次crt0还会清BSS。跳过重新装载不能把这种模型变成私有地址空间。
- do_exec不实现POSIX exec替换映像语义，也不实现fork复制地址空间；请按这份课程接口理解。

## 05 退出后先切走，再让槽位变成可复用

把P3的延迟回收接入P2调度，并确认阻塞、唤醒和idle在动态进程全部等待时仍能闭合。

P2已经能轮转、阻塞、睡眠和时钟抢占。P3多了一种必须排除出队列的状态EXITED，也必须避免正在执行退出函数的内核栈被新exec覆盖。

调用时current_running仍指向正在使用CPU和内核栈的PCB；调度根据状态决定是否重新入队，空就绪队列选PID0。回收必须跳过current_running。

### 延迟回收：只放开已经切走的EXITED槽

P3:kernel/sched/sched.c L26—L33；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
/* Interrupts are masked. Never recycle the currently executing stack. */
static void reap_exited(void)
{
    for (int i = 0; i < NUM_MAX_TASK; ++i)
        if (&pcb[i] != current_running && pcb[i].used &&
            pcb[i].status == TASK_EXITED)
            pcb[i].used = 0;
}
```

- **L26–28**：说明调用者应在屏蔽中断的区域内执行此内部函数，且绝不能回收当前CPU正在使用的栈。
- **L29–31**：逐槽检查三个条件：不是current_running、仍used、状态为EXITED。当前退出进程即使已标EXITED，也因第一个条件而保留。
- **L32–33**：仅把used清为0，不把栈页交回分配器，也不清掉两页基址。下次exec会重置PCB并复用原页。

### 完整调度器：只有RUNNING普通进程回队尾

P3:kernel/sched/sched.c L83—L99；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void do_scheduler(void)
{
    uint64_t flags = irq_save();
    reap_exited();
    check_sleeping();
    pcb_t *prev = current_running;
    if (prev->status == TASK_RUNNING && prev != &pid0_pcb) {
        prev->status = TASK_READY;
        list_add_tail(&prev->list, &ready_queue);
    }
    list_node_t *node = list_pop_front(&ready_queue);
    pcb_t *next = node ? list_entry(node, pcb_t, list) : &pid0_pcb;
    if (prev == &pid0_pcb && next != prev) prev->status = TASK_READY;
    next->status = TASK_RUNNING;
    if (prev != next) switch_to(prev, next);
    irq_restore(flags);
}
```

- **L83–85**：进入调度器并保存/屏蔽中断。队列检查和切换选择形成单核临界区。
- **L86–87**：先清理安全退出槽，再检查睡眠到期。check_sleeping可把到期BLOCKED进程移回ready_queue。
- **L88**：prev保存本次切出者的PCB指针。后面的switch_to需要它来记录旧内核sp。
- **L89–92**：只有仍RUNNING且不是PID0的进程改为READY并尾插。BLOCKED和EXITED都不重新入队，避免等待者忙轮转或死进程复活。
- **L93–94**：弹出队首并由list_entry找回PCB；没有普通就绪节点时选择独立PID0对象。弹出后节点已脱链。
- **L95**：idle切给普通进程时将自身标为READY，但并不把idle节点放进普通就绪队列。
- **L96**：被选中者标为RUNNING；状态转换并不自己执行用户代码，真正切栈在下一句。
- **L97**：prev和next不同时调用switch_to。P2汇编负责保存旧现场、更新当前PCB与sscratch、切换内核sp并恢复新现场。
- **L98–99**：恢复的是沿当前内核调用链保存的flags。切出的进程通常要等以后再次被选中，才会从自己的switch_to之后继续执行此句。

### 保留的sleep、block和unblock完整实现

P3:kernel/sched/sched.c L101—L132；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void do_sleep(uint32_t seconds)
{
    uint64_t flags = irq_save();
    if (!seconds) do_scheduler();
    else {
        current_running->wakeup_time = get_ticks() + (uint64_t)seconds * time_base;
        do_block(&current_running->list, &sleep_queue);
    }
    irq_restore(flags);
}

void do_block(list_node_t *node, list_head *queue)
{
    uint64_t flags = irq_save();
    assert(node == &current_running->list && current_running != &pid0_pcb);
    assert(list_empty(node));
    current_running->status = TASK_BLOCKED;
    list_add_tail(node, queue);
    do_scheduler();
    irq_restore(flags);
}

void do_unblock(list_node_t *node)
{
    uint64_t flags = irq_save();
    pcb_t *task = list_entry(node, pcb_t, list);
    assert(task->status == TASK_BLOCKED);
    list_del(node);
    task->status = TASK_READY;
    list_add_tail(node, &ready_queue);
    irq_restore(flags);
}
```

- **L101–103**：sleep以秒为参数，并进入中断保护区。嵌套irq_save会记住之前已关闭中断的状态。
- **L104–105**：秒数为0时只主动让出CPU；非0才进入实际睡眠分支。
- **L106**：把秒数转成tick后加到当前读数，保存绝对到期时刻。先转uint64_t避免乘法按较窄整数计算。
- **L107–110**：把自己放入sleep_queue并调度；醒来、再次被调度后才从do_block返回，最后恢复flags。
- **L112–114**：定义通用阻塞操作；输入是当前进程唯一节点和等待队列头。
- **L115–116**：断言只能阻塞当前普通进程，而且节点必须脱链。若一个节点同时挂两队，这里会提前暴露错误。
- **L117–119**：先改BLOCKED，再把节点尾插到等待队列，最后调度。顺序使调度器不会把它误当RUNNING再次放回就绪队列。
- **L120–121**：以后被唤醒并选中后，沿保存的内核调用链恢复，才执行irq_restore并返回阻塞前的调用者。
- **L123–125**：唤醒操作保存中断状态，输入是某个等待队列中的节点，而非任意PID。
- **L126–127**：从内嵌list地址还原PCB，并要求它确实处于BLOCKED状态。
- **L128–130**：从原队列摘下节点，状态改READY，再入就绪队列。唤醒不是当场切换，也不等于直接恢复RUNNING。
- **L131–132**：恢复调用前中断状态。退出时可循环调用它唤醒所有waitpid等待者。

### 完整开机收尾与idle循环

P3:init/main.c L184—L216；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
int main(int count, uint32_t app_offset)
{
    init_jmptab();
    init_task_info(count, app_offset);
    init_pcb();
    time_base = bios_read_fdt(TIMEBASE);
    assert(time_base > 0);
    init_locks();
    init_barriers();
    init_syscall();
    init_exception();
    init_screen();
    printk("[INIT] P3 S-Core, stage %d, %d images, timebase=%lu\n\r",
           LAB_STAGE, task_num, time_base);
#if LAB_STAGE >= 4
    bios_set_timer(get_ticks() + TIMER_INTERVAL);
    enable_preempt();
#endif
    /************************************************************/
    /* Do not touch this comment. Reserved for future projects. */
    /************************************************************/
    while (1) {
        disable_interrupt();
        do_scheduler();
#if LAB_STAGE >= 4
        /* WFI may wake on a pending individually enabled interrupt even
         * with global SIE clear. Enable after WFI to service it safely. */
        __asm__ volatile ("wfi");
        enable_interrupt();
#endif
        /* Stage 3 deliberately polls here when every task is asleep. */
    }
}
```

- **L184–185**：内核main接收装载器传入的程序数和元数据偏移，运行在初始内核栈上。
- **L186–188**：先建立课程服务跳转表、读任务信息，再创建shell或回归进程。创建只做准备，用户代码此时还没有运行。
- **L189–190**：从BIOS读取时钟频率并断言有效；以后sleep把秒换成tick必须使用这个值。
- **L191–193**：初始化互斥锁、屏障和系统调用表。在第一次调度用户进程前，这些服务都已就绪。
- **L194–195**：接好异常入口并初始化屏幕，用户ecall和定时中断才有正确处理路径。
- **L196–197**：打印当前P3、P2机制阶段和映像数量。这里的images计数不是活进程数。
- **L198–201**：默认阶段4安排下一次定时器并允许抢占源；S_CORE和LAB_STAGE两个宏分别控制P3接口与P2机制阶段。
- **L202–204**：保留课程要求的预留注释。它们没有执行作用，也不意味着注释处还缺本节实现。
- **L205–207**：进入PID0的循环：先关中断再调度。若存在就绪进程会切走；若没有，仍在idle栈继续下一句。
- **L208–210**：阶段4采用WFI等待。注释说明全局SIE关着时，单独已启用且pending的中断也可使WFI醒来，随后再开全局中断处理它。
- **L211–213**：执行wfi后开启中断，让时钟处理器唤醒睡眠进程并调度；这样避免先开中断与执行WFI之间的错过唤醒窗口。
- **L214–216**：阶段3不走WFI而轮询调度。默认P3走阶段4；循环属于PID0，普通用户main返回走sys_exit，不回到这里。

### 执行推演

1. PID2调用exit：先被标成EXITED，但finish_process保留used=1，因为CPU还在PID2的内核栈。
2. 进入do_scheduler时reap_exited仍跳过PID2；调度器也不会把EXITED的prev重新入队，随后switch_to选中PID1。
3. 以后PID1调用exec或再次调度，reap_exited看到PID2不再是current_running，清used；这时覆盖旧帧和重用栈才安全。
4. 如果所有用户进程都sleep或等待屏障，ready_queue为空，PID0仍能等待时钟；睡眠到期进程被unblock后再次参与调度。

### 现象与边界

- 反复创建/退出超过16次仍可继续，且用户寄存器/栈没有突然损坏；关键是延迟复用，而不是单纯增加PCB数量。
- 被阻塞或已退出进程不应因一次timer调度重新成为可运行；依据是调度器的TASK_RUNNING条件。
- TASK_EXITED与used=0是两个时刻，不能在当前进程exit时立即把它的栈分给新进程。
- 关本hart的中断足以保护本实现的单核队列，不是SMP锁；这段代码不能据此宣称多核进程管理已完成。

## 06 waitpid等的是一次进程，不是某个数组位置

让调用者在目标存活时睡眠，在目标结束后继续，同时支持目标PCB早已被复用的旧PID等待。

P2的阻塞队列被复用为每个目标PCB的wait_list；P3的单调PID让目标消失后仍能区分“早先创建过”和“尚未创建”。

输入为正PID。0、自身、未来或非法PID返回-1；已有目标存活时阻塞，目标已经结束则立即返回该PID。此接口不返回退出码，也不要求父子关系。

### 按pid字段查找，而不是直接索引pcb

P3:kernel/sched/sched.c L183—L188；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static pcb_t *find_process(pid_t pid)
{
    for (int i = 0; i < NUM_MAX_TASK; ++i)
        if (pcb[i].used && pcb[i].pid == pid) return &pcb[i];
    return NULL;
}
```

- **L183–184**：定义仅调度模块内部使用的查找函数；返回值是PCB指针或NULL。
- **L185–186**：遍历16槽，只匹配used且pid相等的对象。PID17也可能位于pcb[1]，所以不能写pcb[pid]或pcb[pid−1]。
- **L187–188**：找不到返回NULL。目标已完成并释放槽时也是这种结果，waitpid还要结合PID范围判断其历史合法性。

### 完整waitpid：目标存活就挂到目标的等待头

P3:kernel/sched/sched.c L229—L243；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
int do_waitpid(pid_t pid)
{
    uint64_t flags = irq_save();
    if (pid <= 0 || pid >= process_id || pid == current_running->pid) {
        irq_restore(flags);
        return -1;
    }
    pcb_t *task = find_process(pid);
    /* Every earlier PID was created; PIDs are monotonic and never reused.
     * A completed PID can still be waited on after its PCB slot is recycled. */
    if (task && task->status != TASK_EXITED)
        do_block(&current_running->list, &task->wait_list);
    irq_restore(flags);
    return pid;
}
```

- **L229–231**：定义等待函数并进入中断保护区，使检查目标和把自己入队之间不会被时钟切换打断。
- **L232**：排除非正PID、尚未分配的PID以及等待自己。process_id是下一个PID，因此pid>=process_id不曾成功创建。
- **L233–235**：非法参数恢复原中断状态并返回-1，不让当前进程进入等待队列。
- **L236**：查找仍占用槽位的目标。找不到不一定是非法PID，可能是结束后槽位已回收。
- **L237–238**：注释明确依赖单调且不复用的PID规则：所有更早的正PID都创建过，因此能辨认“早已完成”的旧目标。
- **L239–240**：目标仍存在且未EXITED时，把当前进程的list挂到目标wait_list并阻塞。入队者是调用者，不是被等待目标自身。
- **L241–243**：被目标退出流程唤醒、再被调度回来后恢复flags并返回pid；若目标原本已结束，则无需阻塞，直接走到这里。

### getpid与ps：观察身份、状态和程序名

P3:kernel/sched/sched.c L245—L263；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
pid_t do_getpid(void)
{
    return current_running->pid;
}

void do_process_show(void)
{
    static const char *states[] = {"BLOCKED", "RUNNING", "READY", "EXITED"};
    uint64_t flags = irq_save();
    printk("PID  STATUS   PROGRAM\n");
    printk("0    %s idle\n", states[pid0_pcb.status]);
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        pcb_t *task = &pcb[i];
        if (task->used && task->status != TASK_EXITED)
            printk("%d    %s %s\n", task->pid, states[task->status],
                   tasks[task->task_id].task_name);
    }
    irq_restore(flags);
}
```

- **L245–248**：getpid直接返回current_running的pid。返回的不是task_id，也不是PCB在数组中的位置。
- **L250–252**：ps使用与task_status_t顺序对应的四项状态字符串，打印时通过枚举值索引。
- **L253–255**：在中断保护下输出表头和PID0信息，避免遍历期间被其他进程修改表项。
- **L256–257**：依次取得各PCB地址，没有为打印复制或新建进程。
- **L258**：只列used且未EXITED的普通进程。延迟回收期间的EXITED槽即使used仍为1，也不会继续显示为活进程。
- **L259–260**：程序名通过task_id索引tasks表，PID和状态来自运行实例。因此PID增长超过程序数量后仍能正确打印名称。
- **L261–263**：结束遍历并恢复中断状态。ps只观察，不负责把退出槽真正回收。

### 执行推演

1. PID1等待PID2：确认2<process_id后找到目标，把PID1.list放到PID2.wait_list；PID1变BLOCKED。
2. PID2退出时finish_process把等待头中的PID1节点unblock，PID1变READY；以后的调度恢复它的do_waitpid调用链。
3. PID1从waitpid返回2；若稍后再次waitpid(2)，即使旧槽已成为PID3，只要2是早先分配过的PID，就直接返回2。
4. 输入waitpid(0)、waitpid(自己的PID)、waitpid(下一个尚未分配的PID)均返回-1；不是等待某个“未来第n号槽”。

### 现象与边界

- shell前台exec在子程序结束前不重新接收下一条命令；具体阻塞由shell随后waitpid和本函数共同完成。
- ps里已结束进程消失，但旧PID仍可被waitpid立即接受；两者分别是活对象枚举和历史身份判断，行为一致。
- 这里只提供课程需要的等待语义，没有POSIX waitpid的父子权限、退出状态、WNOHANG或僵尸回收协议。
- 查找与入等待队列在同一单核关中断区间内完成，避免目标恰好退出导致漏唤醒；不能把这个保证套到未经锁保护的多核实现。

## 07 exit和kill共用一条清理协议

让终止对就绪、睡眠、锁、屏障和waitpid都一致生效，并禁止被终止进程继续从原调用点返回。

P2长期运行的固定任务不用完整退出；P3必须移除旧队列节点、交还持有的锁、唤醒等待者，再安全处理当前栈。

finish_process接收目标PCB且要求调用者已屏蔽中断。exit终止自己并不返回；kill成功终止别人返回目标PID，非法目标返回-1，自杀成功同样不返回。

### 完整统一清理出口

P3:kernel/sched/sched.c L190—L200；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
/* One termination protocol for exit and kill; caller masks interrupts. */
static void finish_process(pcb_t *task)
{
    barrier_cancel_wait(task);
    if (!list_empty(&task->list)) list_del(&task->list);
    task->status = TASK_EXITED;
    mutex_release_all(task->pid);
    while (!list_empty(&task->wait_list)) do_unblock(task->wait_list.next);
    /* Reuse the slot's stacks only when no CPU is executing on them. */
    if (task != current_running) task->used = 0;
}
```

- **L190–192**：说明exit和kill共用这个内部函数，调用者负责先关中断。它操作传入的task，不能把所有动作错误写成current_running。
- **L193**：先通知屏障撤销这个目标的等待计数。目标可能正在屏障队列中，必须在丢掉节点关系前处理该专项状态。
- **L194**：目标节点若非自环，就从所在队列摘除；它可能在就绪、睡眠、锁、屏障或另一目标的wait_list中。
- **L195**：将目标标为EXITED。后续调度不会再把它当RUNNING重入就绪队列。
- **L196**：按目标PID释放它持有的所有互斥锁，并按锁的移交规则唤醒等待者。kill别人时不能误用发起kill的调用者PID。
- **L197**：反复unblock目标wait_list里的等待者，直到队列为空。可以有多个进程等待同一目标，不能只唤醒第一个。
- **L198–200**：目标不是当前运行者时立即清used；目标是当前进程则暂不复用槽/栈，等切走后由reap_exited处理。

### 完整exit：切走后禁止返回

P3:kernel/sched/sched.c L202—L209；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void do_exit(void)
{
    irq_save();
    assert(current_running != &pid0_pcb);
    finish_process(current_running);
    do_scheduler();
    assert(0);
}
```

- **L202–204**：退出函数屏蔽中断，不保存供普通返回使用的flags，因为这个进程不会再返回用户态。
- **L205**：禁止PID0走普通退出路径；系统必须保留idle以应对没有就绪用户进程的情况。
- **L206–207**：统一清理自己，然后调度到其他可运行进程或idle。EXITED状态使调度器不把它重新排队。
- **L208–209**：若竟然从这次调度返回到已退出的调用链，就以assert(0)明确失败。正常情况下这一行不可达，不是用它模拟退出。

### 完整kill：他杀返回PID，自杀切走

P3:kernel/sched/sched.c L211—L227；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
int do_kill(pid_t pid)
{
    uint64_t flags = irq_save();
    pcb_t *task = find_process(pid);
    if (pid <= 0 || !task || task->status == TASK_EXITED) {
        irq_restore(flags);
        return -1;
    }
    int self = task == current_running;
    finish_process(task);
    if (self) {
        do_scheduler();
        assert(0);
    }
    irq_restore(flags);
    return pid;
}
```

- **L211–214**：保存/屏蔽中断并按PID查找目标。屏蔽范围覆盖判断、清理和必要的调度。
- **L215**：拒绝PID0/负数、不存在或已EXITED目标。不会允许杀死系统idle，也不会把重复kill当成功。
- **L216–218**：非法目标恢复flags并返回-1，当前进程仍继续运行。
- **L219**：清理之前记住目标是否为current_running，随后用它区分自杀与终止他人。
- **L220**：调用同一finish_process，因此kill睡眠进程也会移除等待节点并释放它持有的锁。
- **L221–224**：如果杀的是自己，就调度离开并以不可达断言保护；成功自杀不会带着一个返回值重新进入用户程序。
- **L225–227**：若终止别人，则恢复中断状态并返回目标PID。此函数的成功返回值不是固定0。

### 执行推演

1. A持有两把锁并睡眠，B等待其中一把，C等待A退出；shell对A的PID执行kill。
2. finish_process先处理A可能的屏障状态，从sleep_queue摘掉A.list，标记EXITED，再把两把锁按各自等待队列交还。
3. B因锁移交进入READY，C因A.wait_list被清空进入READY；A不是当前shell，因此其used可立即清0。
4. A本来未来还会到达睡眠截止时刻，但节点已被摘除，不能再被check_sleeping唤醒复活；shell拿到kill返回的A.PID。
5. 如果A自己执行exit或kill(getpid())，清理相同，但used暂留1；切走后再回收，避免还在使用的内核栈被覆盖。

### 现象与边界

- 杀死持锁的睡眠进程后，锁等待者应继续；若此前已有进程阻塞在目标wait_list上，代码也会唤醒它们。后一个组合本次未直接测试，kill探针实际是在kill之后才调用waitpid。
- kill完成后ps不再显示目标，目标也不会从sleep或其他等待队列重新出现；节点摘除和EXITED状态缺一不可。
- 退出不是只改一个status字段；遗漏锁或wait_list清理会让其他进程永久等待，遗漏脱链会使退出者再次被唤醒。
- 杀死屏障等待者只撤销其本轮到达计数，屏障目标人数不自动降低；其余参与者是否补足或销毁由应用决定，详见屏障章节。

## 08 同一组寄存器，接上新的进程服务

把用户sys_exec/sys_waitpid等调用接到已有ecall链，并修正动态PID下的输出地址校验。

P2已经有异常入口、保存/恢复和handle_syscall；P3复用这条通道，扩充服务表。P2按pid=i+1推算映像；动态创建后这个对应关系不再成立，必须使用task_id。

用户调用封装时a7是服务号、a0到a4是五个参数。内核读取异常帧、调用对应k_*，返回值写回异常帧a0。S_CORE选择程序ID和整数参数接口，并不把用户程序改成S态。

### invoke_syscall：沿用P2的完整ecall封装

P3:tiny_libc/syscall.c L6—L17；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static long invoke_syscall(long number, long p0, long p1, long p2, long p3, long p4)
{
    register long a0 asm("a0") = p0;
    register long a1 asm("a1") = p1;
    register long a2 asm("a2") = p2;
    register long a3 asm("a3") = p3;
    register long a4 asm("a4") = p4;
    register long a7 asm("a7") = number;
    asm volatile ("ecall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a3),
                  "r"(a4), "r"(a7) : "memory");
    return a0;
}
```

- **L6–7**：统一封装接收一个服务号和五个long参数。它自身不判断exec、kill或barrier的具体含义。
- **L8**：把p0绑定到硬件a0；该寄存器还要承接服务返回值。
- **L9–12**：将p1到p4依次绑定a1到a4，顺序与内核从异常帧取参数的顺序一致。
- **L13**：把number放入a7；这是内核系统调用号，不是程序ID或PID。
- **L14–15**：ecall触发异常进入S态。+r声明a0既输入也输出，其余寄存器为输入；memory限制编译器把内存访问跨调用重排，volatile要求保留这次有副作用的汇编。
- **L16–17**：内核最终sret回用户后，读取a0作为C函数返回值；中间即使发生阻塞和调度，也不改变这个返回约定。

### P3的exec、进程与输入封装：保留条件编译原文

P3:tiny_libc/syscall.c L90—L136；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
/* P3 user wrappers. S-Core handlers are registered by init_syscall(). */
#ifdef S_CORE
pid_t sys_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    return invoke_syscall(SYSCALL_EXEC, id, argc, arg0, arg1, arg2);
}
#else
pid_t sys_exec(char *name, int argc, char **argv)
{
    return invoke_syscall(SYSCALL_EXEC, (long)name, argc, (long)argv, 0, 0);
}
#endif

void sys_exit(void)
{
    invoke_syscall(SYSCALL_EXIT, 0, 0, 0, 0, 0);
}

int sys_kill(pid_t pid)
{
    return invoke_syscall(SYSCALL_KILL, pid, 0, 0, 0, 0);
}

int sys_waitpid(pid_t pid)
{
    return invoke_syscall(SYSCALL_WAITPID, pid, 0, 0, 0, 0);
}

void sys_ps(void)
{
    invoke_syscall(SYSCALL_PS, 0, 0, 0, 0, 0);
}

pid_t sys_getpid(void)
{
    return invoke_syscall(SYSCALL_GETPID, 0, 0, 0, 0, 0);
}

int sys_getchar(void)
{
    return invoke_syscall(SYSCALL_READCH, 0, 0, 0, 0, 0);
}

void sys_clear(void)
{
    invoke_syscall(SYSCALL_CLEAR, 0, 0, 0, 0, 0);
}
```

- **L90–91**：这一组是P3用户接口。S_CORE由Makefile全局定义，决定下面实际编译哪个sys_exec版本。
- **L92–95**：S-Core的五个服务参数是id、argc、arg0、arg1、arg2。返回值转换成pid_t交给调用者；它表示新进程PID，不是原程序ID。
- **L96–101**：非S-Core分支保留按名字和argv指针的接口。本讲义的构建选择上面的整数版本；存在此分支不证明另一个核心版本已经实现。
- **L103–106**：sys_exit不接收退出状态，只发出SYSCALL_EXIT。其C声明为void，正常终止后不会返回用户调用点。
- **L108–111**：sys_kill把目标PID放在第一个参数槽，其余补0；结果直接来自内核。
- **L113–116**：sys_waitpid同样仅传PID，没有POSIX的status指针、options或父子权限参数。
- **L118–121**：sys_ps只发请求，由内核读取并显示进程表，用户层没有直接遍历PCB。
- **L123–126**：sys_getpid请求当前PID。不要把它和从镜像编号得到task_id混为一谈。
- **L128–131**：sys_getchar请求一个输入字符；无字符的返回值留给shell决定是否让出CPU。
- **L133–136**：sys_clear请求清屏。用户shell不会直接写内核屏幕数组。

### handle_syscall：沿用的五参数分发与返回

P3:kernel/syscall/syscall.c L1—L14；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
#include <sys/syscall.h>
long (*syscall[NUM_SYSCALLS])();
void handle_syscall(regs_context_t *regs, uint64_t stval, uint64_t cause)
{
    (void)stval; (void)cause;
    uint64_t number = regs->regs[17]; /* a7 */
    regs->sepc += 4; /* ecall is always a 32-bit instruction */
    if (number >= NUM_SYSCALLS || !syscall[number]) {
        regs->regs[10] = (reg_t)-38; /* ENOSYS */
        return;
    }
    regs->regs[10] = syscall[number](regs->regs[10], regs->regs[11],
                                    regs->regs[12], regs->regs[13], regs->regs[14]);
}
```

- **L1–2**：声明系统调用函数指针表。这里存入口地址，填表时并不会执行服务函数。
- **L3–5**：处理器拿到已保存的异常帧，当前不使用stval和cause，所以显式标记避免警告。
- **L6**：regs[17]是用户a7；从保存值取号，不能从已被C调用使用过的临时硬件寄存器猜。
- **L7**：把返回PC越过32位ecall指令。即使这次服务随后阻塞，恢复后也从调用之后继续。
- **L8–11**：越界号码或空表项返回-38。条件变量等包装虽可能存在，未注册的服务仍不能使用。
- **L12–14**：依次取异常帧a0到a4调用服务，并把结果写回a0槽，最终由异常返回汇编恢复给用户。这里沿用旧式函数指针写法，项目显式用GNU11编译。

### 内核适配器：统一ABI转为具体接口

P3:init/main.c L80—L99；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static long k_exec(long id, long argc, long a0, long a1, long a2)
{ return do_exec((int)id, (int)argc, a0, a1, a2); }
static long k_exit(long a, long b, long c, long d, long e)
{ do_exit(); return 0; }
static long k_kill(long pid, long b, long c, long d, long e)
{ return do_kill((pid_t)pid); }
static long k_waitpid(long pid, long b, long c, long d, long e)
{ return do_waitpid((pid_t)pid); }
static long k_ps(long a, long b, long c, long d, long e)
{ do_process_show(); return 0; }
static long k_getpid(long a, long b, long c, long d, long e)
{ return do_getpid(); }
static long k_clear(long a, long b, long c, long d, long e)
{ screen_clear(); return 0; }
static long k_barrier_init(long key, long goal, long c, long d, long e)
{ return do_barrier_init((int)key, (int)goal); }
static long k_barrier_wait(long id, long b, long c, long d, long e)
{ do_barrier_wait((int)id); return 0; }
static long k_barrier_destroy(long id, long b, long c, long d, long e)
{ do_barrier_destroy((int)id); return 0; }
```

- **L80–81**：k_exec的五个long参数一一转交do_exec；前两项收窄成int，后三项是传给子程序的整数值。
- **L82–83**：k_exit调用终止流程。后面的return 0满足统一函数签名，不代表正常退出还能回到已结束的用户程序。
- **L84–85**：k_kill把第一个参数转换为目标PID，并保留do_kill返回结果。
- **L86–87**：k_waitpid同样转发目标PID，允许在内核服务中阻塞等待。
- **L88–89**：k_ps执行进程表输出，再给统一ABI定义返回0；用户接口本身是void。
- **L90–91**：k_getpid返回当前进程号，无需从用户传入PCB地址。
- **L92–93**：k_clear清除屏幕；shell随后负责重新打印自己的分隔栏和提示符。
- **L94–95**：k_barrier_init把key和goal收窄为int，并返回屏障表索引。
- **L96–97**：k_barrier_wait以索引等待，底层返回后统一返回0；该接口没有向用户提供取消原因值。
- **L98–99**：k_barrier_destroy调用销毁与唤醒逻辑，再返回0。内核只实现这里接线的范围。

### init_syscall：完整注册表

P3:init/main.c L158—L182；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static void init_syscall(void)
{
    bzero(syscall, sizeof(long (*)()) * NUM_SYSCALLS);
    syscall[SYSCALL_YIELD] = k_yield;
    syscall[SYSCALL_WRITE] = k_write;
    syscall[SYSCALL_CURSOR] = k_cursor;
    syscall[SYSCALL_REFLUSH] = k_refresh;
    syscall[SYSCALL_SLEEP] = k_sleep;
    syscall[SYSCALL_LOCK_INIT] = k_lock_init;
    syscall[SYSCALL_LOCK_ACQ] = k_lock_acq;
    syscall[SYSCALL_LOCK_RELEASE] = k_lock_rel;
    syscall[SYSCALL_GET_TIMEBASE] = k_timebase;
    syscall[SYSCALL_GET_TICK] = k_ticks;
    syscall[SYSCALL_EXEC] = k_exec;
    syscall[SYSCALL_EXIT] = k_exit;
    syscall[SYSCALL_KILL] = k_kill;
    syscall[SYSCALL_WAITPID] = k_waitpid;
    syscall[SYSCALL_PS] = k_ps;
    syscall[SYSCALL_GETPID] = k_getpid;
    syscall[SYSCALL_READCH] = k_getchar;
    syscall[SYSCALL_CLEAR] = k_clear;
    syscall[SYSCALL_BARR_INIT] = k_barrier_init;
    syscall[SYSCALL_BARR_WAIT] = k_barrier_wait;
    syscall[SYSCALL_BARR_DESTROY] = k_barrier_destroy;
}
```

- **L158–160**：初始化时把全部表项清零。未注册项保持空指针，分发器可明确返回ENOSYS。
- **L161–165**：注册沿用的yield、字符串输出、光标、刷新和sleep服务，让shell既能交互也能让出CPU。
- **L166–170**：保留互斥锁、时间基准和tick查询；P3进程测试继续依赖P2已有能力。
- **L171–174**：把EXEC、EXIT、KILL、WAITPID分别接到上面的适配器。仅在头文件写声明不够，这些表项决定号码能否实际到达实现。
- **L175–178**：注册PS、GETPID、READCH、CLEAR，分别支撑进程观察、身份查询、键盘读取和清屏。
- **L179–182**：登记屏障初始化、等待、销毁并结束函数。表中没有条件变量、信号量、邮箱服务，不把保留的用户包装算作已实现能力。

### k_write：按task_id检查字符串所属范围

P3:init/main.c L34—L56；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static long k_write(long p, long b, long c, long d, long e)
{
    /* No page tables in P2. Validate the complete string against this task's
     * user image or user stack before dereferencing it, also for loadbootd. */
    uint64_t begin = (uint64_t)p, limit = 0;
    int id = current_running->task_id;
    if (id >= 0 && id < task_num && begin >= tasks[id].entrypoint &&
        begin < tasks[id].entrypoint + TASK_SIZE)
        limit = tasks[id].entrypoint + TASK_SIZE;
    if (begin >= current_running->user_stack_base &&
        begin < current_running->user_stack_base + PAGE_SIZE)
        limit = current_running->user_stack_base + PAGE_SIZE;
    if (!limit) return -14;
    char *text = (char *)p;
    uint64_t i = 0;
    while (begin + i < limit && text[i]) ++i;
    if (begin + i == limit) return -14;
    screen_write(text);
#if LAB_STAGE < 4
    screen_reflush();
#endif
    return 0;
}
```

- **L34–37**：这是字符串输出服务的完整实现。注释沿用P2背景：当前没有页表，因此在解引用前做软件范围检查。
- **L38–39**：begin记录用户传来的数值地址，limit先为0；id从当前PCB.task_id取得，而不使用pid减1。
- **L40–42**：若程序ID有效且起始地址位于该程序固定TASK_SIZE槽内，设定可读上界。一个程序的多个PID仍对应同一task_id。
- **L43–45**：若地址落在当前进程自己的用户栈页，改用该栈页末尾为上界。独立栈的基址来自PCB。
- **L46**：两种范围都不匹配时返回-14，不继续访问该地址。
- **L47–49**：把地址转成字符指针，并只在上界之前扫描结束符。检查的是完整字符串，不只是第一个字节。
- **L50–51**：扫描到上界仍无结束符则返回-14；已确认终止后才把字符串交给屏幕输出。
- **L52–54**：阶段低于4时立即刷新；默认阶段4由已有周期刷新机制更新串口画面。
- **L55–56**：正常完成返回0。此检查保护这一项输出服务，不能据此宣称已实现内存隔离或所有用户指针都被检查。

### 执行推演

1. 以sys_exec(2,3,7,20,22)为例：用户a7=EXEC，a0到a4依次是2、3、7、20、22。
2. handle_syscall读取异常帧，调用k_exec，再到do_exec；子进程初始a0=3、a1=7、a2=20、a3=22，程序ID不会被算进子程序argc。
3. 创建者最后从自己的sys_exec获得新PID。将来子进程输出时，k_write根据它的task_id=2查映像槽，而不是假定新PID等于3。

### 现象与边界

- 同一程序反复创建得到越来越大的PID，仍能打印映像里的字符串，才覆盖了旧PID到映像推算失效的场景。
- shell能输入、清屏、创建和等待，需要用户包装、异常分发、注册表和具体实现全部接通。
- S_CORE是课程核心版本的宏，U态/S态是处理器特权级，两个概念不同。
- 这里只传整数值；没有把命令行字符串数组自动复制成子程序argv。
- 本服务表不等于BIOS跳转表，内核调用固件与用户ecall请求内核是不同层次。

## 09 把按键变成一条可靠的命令行

让CR、LF、CRLF、退格和超长输入都能保持缓冲区及屏幕一致。

P2由构建配置决定开机任务；P3让用户态shell持续读取串口。命令提交和字符编辑属于shell，真正移动光标、擦除屏幕字符属于驱动。

line容量128字节，只接纳最多127个可打印字符并保留结束符。length只计算用户已输入的内容，提示符不计入其中；无输入时主动yield。

### shell的行、单词和显示起点

P3:test/shell.c L34—L36；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
#define SHELL_BEGIN 20
#define LINE_SIZE 128
#define MAX_WORDS 8
```

- **L34**：SHELL_BEGIN=20是显示分隔栏所用的屏幕行坐标，不是输入缓冲区长度。
- **L35**：LINE_SIZE=128决定line数组容量；实际输入必须给末尾空字符留一位。
- **L36**：MAX_WORDS=8是分词数组容量。它不等于exec可传给子程序的整数参数个数。

### banner：输出shell分隔栏

P3:test/shell.c L77—L81；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static void banner(void)
{
    sys_move_cursor(0, SHELL_BEGIN);
    printf("------------------- COMMAND -------------------\n");
}
```

- **L77–78**：定义无参数的小函数，初始化和clear命令都会复用。
- **L79**：经系统调用把当前shell光标移到第20行，屏幕驱动按零起点坐标处理。
- **L80–81**：输出分隔栏并换行；它只排版，不创建另一进程或清理命令缓冲区。

### main：完整输入与编辑循环

P3:test/shell.c L125—L153；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
int main(void)
{
    char line[LINE_SIZE];
    int length = 0, skip_lf = 0;
    banner();
    printf("> root@UCAS_OS: ");
    for (;;) {
        int ch = sys_getchar();
        if (ch < 0) { sys_yield(); continue; }
        if (skip_lf && ch == '\n') { skip_lf = 0; continue; }
        skip_lf = 0;
        if (ch == '\r' || ch == '\n') {
            skip_lf = ch == '\r';
            line[length] = '\0';
            printf("\n");
            command(line);
            length = 0;
            printf("> root@UCAS_OS: ");
        } else if (ch == '\b' || ch == 127) {
            if (length > 0) { --length; printf("\b"); }
        } else {
            if (ch == '\t') ch = ' ';
            if (ch >= 32 && ch <= 126 && length < LINE_SIZE - 1) {
                line[length++] = ch;
                printf("%c", ch);
            }
        }
    }
}
```

- **L125–128**：shell使用私有栈上的line数组；length是有效字符数，skip_lf记录上一条是否由CR提交。
- **L129–130**：先画分隔栏和提示符。提示符不放入line，所以后来length归零不会把提示符变成命令内容。
- **L131–133**：不断读字符；没有输入时sys_getchar返回负值，shell主动yield后继续，避免在用户态忙等独占执行机会。
- **L134**：若上一字符CR已经提交命令，紧跟的LF只消耗掉，防止CRLF被当成两次回车。
- **L135**：除了上面被消耗的LF，其余新字符都结束skip_lf状态；单独CR后继续输入也能工作。
- **L136–137**：CR或LF都提交命令。只有CR设置skip_lf，兼容终端发送CR、LF和CRLF三种形式。
- **L138–140**：在已预留的位置写空字符，显示换行，再调用command解析这条完整字符串；此刻line成为合法C字符串。
- **L141–142**：命令处理返回后清空逻辑长度，重新显示提示符。前台waitpid尚未返回时不会走到这里。
- **L143–144**：识别BS或DEL；只有length大于0才减一并输出退格。输入为空时无动作，因此用户不能倒删提示符。
- **L145–146**：其余字符走普通输入分支；把Tab统一成空格，避免回显制表和分词行为不一致。
- **L147–149**：只接纳ASCII可打印范围并检查length<127，随后存入并回显；超出的字符直接忽略，不写越界、不增加length。
- **L150–153**：收束普通字符分支和无限循环。shell本身没有在这里返回，也没有后台输入线程。

### screen_write_ch：退格不仅要移动，还要擦除

P3:drivers/screen.c L39—L68；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void screen_write_ch(char ch)
{
    if (ch == '\n')
    {
        current_running->cursor_x = 0;
        if (current_running->cursor_y < SCREEN_HEIGHT - 1)
            current_running->cursor_y++;
    }
    else if (ch == '\b' || ch == '\177')
    {	
        int x = current_running->cursor_x;
        int y = current_running->cursor_y;
        if (x > 0) --x;
        else if (y > 0) { --y; x = SCREEN_WIDTH - 1; }
        else return;
        current_running->cursor_x = x;
        current_running->cursor_y = y;
        new_screen[SCREEN_LOC(x, y)] = ' ';
    }
    else
    {
        new_screen[SCREEN_LOC(current_running->cursor_x, current_running->cursor_y)] = ch;
        if (++current_running->cursor_x >= SCREEN_WIDTH)
        {
            current_running->cursor_x = 0;
            if (current_running->cursor_y < SCREEN_HEIGHT - 1)
                current_running->cursor_y++;
        }
    }
}
```

- **L39–40**：驱动逐字符操作当前PCB的光标与全局屏幕缓冲区；它不知道shell的命令长度。
- **L41–46**：换行把x设为0，并在尚未到屏幕最后一行时增加y；没有在此实现无限向下滚屏。
- **L47–50**：遇到BS或DEL，先取得当前光标位置，准备计算前一个字符的格子。
- **L51–53**：本行x>0就左移；行首则退到上一行最后一列；屏幕左上角无可退位置，立即返回。
- **L54–56**：把计算后的坐标写回当前PCB，并在目标格写空格，完成真正的字符擦除。
- **L57–60**：普通字符写入当前位置。这里的写入对象是new_screen，实际串口输出由刷新逻辑完成。
- **L61–65**：字符写完后光标右移；越过80列则回到下一行开头，最末行不再继续增加y。
- **L66–68**：结束普通字符分支和函数。驱动允许跨行退格，而禁止删提示符的策略由shell的length检查保证。

### 执行推演

1. 输入p、s、CR：缓冲区依次成为ps，CR处写入空字符，command只收到ps。紧接LF被skip_lf吃掉。
2. 输入p、x、BS、s、LF：BS把length从2减为1并请求擦除x，后来s覆盖同一缓冲位置；提交时仍是ps。
3. 连续输入超过127个可打印字符：剩余字符不入缓冲区；回车写line[127]=0仍在数组内，退格后可以再继续输入。

### 现象与边界

- CR、LF和CRLF都应只提交对应命令；空输入时按退格不应删除提示符。
- 退格后被删字符应消失，不能只看到光标左移而旧字还留在屏幕上。
- 超长输入不应触发越界异常；命令可能被截成127个字符，但后续输入仍可继续。
- 这里支持ASCII可打印输入，不把字节级长度控制说成完整中文编辑器。
- screen_write_ch只处理屏幕，不会同步替shell修改line；两个层次都要正确。
- 所有进程共用屏幕，独立cursor字段不能提供终端会话隔离。

## 10 先分词和验数，再决定前台还是后台

把命令字符串安全地分成词，校验数值范围，再调用系统服务；用waitpid形成前台等待。

P1按名字装载后直接调用；P3的shell不直接跳到用户入口，而是请求内核创建新PID。后台仅表示shell不等待，不需要另做一套调度器。

输入是以空字符结束的可写line。split原地把分隔符改为0，words保存各词首地址；number只解析整数，command最多给exec传三个整数参数。

### number：完整十进制／十六进制与溢出检查

P3:test/shell.c L38—L61；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static int number(const char *s, uint64_t *out)
{
    int negative = 0, base = 10, digits = 0;
    uint64_t value = 0;
    if (*s == '+' || *s == '-') { negative = *s == '-'; ++s; }
    if (s[0] == '0' && (s[1] == 'x' || s[1] == 'X')) {
        base = 16;
        s += 2;
    }
    uint64_t limit = negative ? (1ULL << 63) : ~0ULL;
    for (; *s; ++s) {
        unsigned digit;
        if (*s >= '0' && *s <= '9') digit = *s - '0';
        else if (*s >= 'a' && *s <= 'f') digit = *s - 'a' + 10;
        else if (*s >= 'A' && *s <= 'F') digit = *s - 'A' + 10;
        else return 0;
        if (digit >= (unsigned)base || value > (limit - digit) / base) return 0;
        value = value * base + digit;
        ++digits;
    }
    if (!digits) return 0;
    *out = negative ? 0 - value : value;
    return 1;
}
```

- **L38–41**：s指向一个词，out用于返回解析值；初始按十进制，digits统计实际数字，value从0累加。
- **L42**：允许可选正负号，并越过符号。只输入符号仍不能成功，因为后面要求至少有一个数字。
- **L43–46**：识别0x或0X前缀，将进制改为16并跳过前缀；不把普通前导0当成八进制。
- **L47**：负数幅值最大允许2的63次方，正数可到无符号64位上限；稍后ID和PID另有更小的约束。
- **L48–49**：逐字符扫描，digit用于暂存当前位的值。
- **L50–53**：将0—9、a—f、A—F分别转换成0—15；遇到其他字符立即失败，不接受部分解析后忽略后缀。
- **L54**：先拒绝不适用于当前进制的位，再用value>(limit-digit)/base预判乘加溢出，避免先发生溢出才比较。
- **L55–57**：本位合法后更新value并增加digits，继续下一字符。
- **L58**：空串、单独符号或只有0x前缀都没有数字，返回失败。
- **L59–61**：负数用无符号减法形成64位补码值，写入out并返回成功；程序参数保留该位模式，ID/PID则须继续校验范围。

### split：完整原地分词器

P3:test/shell.c L63—L75；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static int split(char *line, char **words)
{
    int count = 0;
    while (*line) {
        while (*line == ' ' || *line == '\t') ++line;
        if (!*line) break;
        if (count == MAX_WORDS) return -1;
        words[count++] = line;
        while (*line && *line != ' ' && *line != '\t') ++line;
        if (*line) *line++ = '\0';
    }
    return count;
}
```

- **L63–65**：line可写，words由调用者提供；count从0开始记录词数。
- **L66–68**：外层扫描整行，先跳过空格或Tab；只剩分隔符就结束，不产生空词。
- **L69**：数组已满仍遇到新词时返回-1；不能先写越界再检查。
- **L70**：记录本词首地址并增加计数，字符串内容仍留在原line缓冲区。
- **L71–72**：向后找到词尾；若不是整行终止符，就把分隔符改成0并前进一位，使该词可直接交给strcmp或number。
- **L73–75**：继续寻找下个词，最后返回词数；没有为每个词另行分配内存，也不支持引号或转义。

### command：完整命令分派、参数校验与前后台

P3:test/shell.c L83—L123；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static void command(char *line)
{
    char *words[MAX_WORDS];
    int count = split(line, words);
    if (!count) return;
    if (count < 0) { printf("Too many arguments\n"); return; }
    if (!strcmp(words[0], "ps") && count == 1) sys_ps();
    else if (!strcmp(words[0], "clear") && count == 1) {
        sys_clear();
        banner();
    } else if (!strcmp(words[0], "help") && count == 1) {
        printf("ps | clear | exec ID [arg0 arg1 arg2] [&] | kill PID\n");
        printf("Use 'make list-tasks' in the Linux terminal to see program IDs.\n");
    } else if (!strcmp(words[0], "exec")) {
        int background = !strcmp(words[count - 1], "&");
        if (background) --count;
        uint64_t id, args[3] = {0};
        if (count < 2 || count > 5 || !number(words[1], &id) || id > INT32_MAX) {
            printf("Usage: exec ID [arg0 arg1 arg2] [&]\n");
            return;
        }
        for (int i = 2; i < count; ++i) {
            if (!number(words[i], &args[i - 2])) {
                printf("Invalid numeric argument\n");
                return;
            }
        }
        pid_t pid = sys_exec((int)id, count - 2, args[0], args[1], args[2]);
        if (pid < 0) printf("exec failed\n");
        else if (background) printf("[shell] started pid=%d\n", pid);
        else sys_waitpid(pid);
    } else if (!strcmp(words[0], "kill")) {
        uint64_t pid;
        if (count != 2 || !number(words[1], &pid) || pid == 0 || pid > INT32_MAX) {
            printf("Usage: kill PID\n");
            return;
        }
        if (sys_kill((pid_t)pid) < 0) printf("kill failed\n");
        else printf("[shell] killed pid=%d\n", (int)pid);
    } else printf("Unknown command\n");
}
```

- **L83–86**：准备最多8个词的指针数组，split会原地修改本条命令字符串。
- **L87–88**：空行直接返回；词数过多则报错并返回，不继续访问不完整的words数组。
- **L89**：只有恰好一个词的ps才调用sys_ps；ps后额外带参数不匹配这个分支。
- **L90–92**：clear同样不接受额外参数；先请求驱动清屏，再重画shell分隔栏。
- **L93–95**：help显示当前支持的命令和查程序ID的方法。make list-tasks应在Linux终端运行，不是本shell的命令。
- **L96–98**：exec分支只把最后一个独立词&看成后台标志，并从有效词数中扣除；附着在数字后的&不会自动分开。
- **L99**：为程序ID和三个参数准备数值存储，未提供的参数默认0。
- **L100–103**：扣除后台标志后，exec必须有ID且最多三个额外参数；ID必须是合法数值且不超过INT32_MAX，否则给出用法并返回。
- **L104–109**：逐个解析实际整数参数；任何一个失败就停止，避免携带半套参数创建进程。
- **L110**：argc=count-2只计算用户参数数目，既不含exec命令词，也不含程序ID；五项依次发给sys_exec。
- **L111–113**：创建失败打印错误；后台成功只报告新PID；前台成功对该PID执行waitpid，shell阻塞到目标结束后才返回提示符。
- **L114–115**：kill分支另设目标PID数值变量；它不接收镜像程序ID。
- **L116–119**：要求恰好一个非零、未超INT32_MAX的数值PID；格式错误只给用法，不向内核发起kill。
- **L120–121**：调用sys_kill后，根据返回值报告失败或目标已被终止；是否允许终止目标由内核实现判断。
- **L122–123**：其余命令、或不满足前面精确词数的ps/clear/help，统一显示Unknown command，然后返回输入循环。

### 执行推演

1. 输入exec 2 7 20 22 &：split得到6词，末尾&使count减到5；argc=3，程序ID=2，三个参数为7、20、22。
2. 删去末尾&后请求仍创建同一类进程，但成功后shell调用waitpid而阻塞；运行权交给调度器选择的就绪进程。
3. 输入kill 4：4按PID解释；输入exec 4：4按镜像程序ID解释。数字相同也不能互换含义。
4. 输入exec 2 hello：number拒绝非数值参数，不执行sys_exec。输入exec 9999格式可能正确，但是否有该程序由内核进一步检查。

### 现象与边界

- 前台exec直到目标结束才重现提示符；后台exec应先报告PID并继续接收命令。
- 带非法数字、过量参数、未知命令时有明确反馈，随后输入ps仍能响应。
- 被创建者main返回或被kill后，前台shell的waitpid才能完成；仅看到started并不能证明退出与等待链正确。
- &只改变shell是否等待，不意味着额外CPU，也不是POSIX作业控制、管道或重定向。
- split不处理引号、反斜杠和环境变量；把含空格字符串当成一个参数不在当前语法内。
- 本shell把程序ID限制为非负int范围，内核还检查实际tasks数量；格式校验不能代替服务层校验。

## 11 main返回、等待结束与持锁终止的完整闭环

把crt0的退场动作与课程waitpid、ready_to_exit、wait_locks三个程序连起来，理解正常退出和强制终止各验证什么。

P2通常把用户main视作不返回的任务，返回后只不断yield；P3增加sys_exit，正常return也能触发清理并唤醒等待者。课程测试则让进程等待和互斥锁清理发生在同一条链上。

默认镜像ID为1=waitpid、2=ready_to_exit、3=wait_locks。后两者通过整数参数接收显示行及两把锁的句柄。这里只展示waitpid的S_CORE完整函数；另外两个文件的条件编译头保留原样。

### crt0：完整用户入口和正常退场

P3:arch/riscv/crt0/crt0.S L1—L19；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```asm
#include <asm.h>
.section ".entry_function","ax"
ENTRY(_start)
    /* The kernel already supplied a private aligned stack. */
    la t0, __bss_start
    la t1, __BSS_END__
1:  bgeu t0, t1, 2f
    sb zero, 0(t0)
    addi t0, t0, 1
    j 1b
2:  call main
    /* main's return value is not an exit status in this course interface. */
    call sys_exit
3:  call sys_yield
    j 3b
    /************************************************************/
    /* Do not touch this comment. Reserved for future projects. */
    /************************************************************/
ENDPROC(_start)
```

- **L1–3**：引入汇编宏，把_start放入可执行入口段并建立符号；内核初始sepc指向这个入口。
- **L4**：内核已经给本进程设置私有、对齐的用户栈，入口不再随意覆盖sp。
- **L5–6**：取用户程序BSS起止地址；这些地址属于程序固定映像，并没有每PID一份独立全局数据区。
- **L7–10**：按字节把BSS区清零，空区直接越过。这里使用t0/t1，不破坏内核放进a0到a3的argc和整数参数。
- **L11**：普通call把控制交给main，返回地址保存在ra；main的形参由此前设置的a寄存器提供。
- **L12–13**：main返回后显式调用sys_exit。当前课程接口不传退出状态，因此main返回的int不会作为waitpid结果交给别人。
- **L14–15**：若sys_exit意外返回，退回不断yield的防护循环，避免从伪造的用户调用者返回或执行无意义后续字节。
- **L16–19**：保留课程预留注释，结束入口符号；这里没有把注释当成额外逻辑。

### waitpid：S_CORE下完整main

P3:test/test_project3/waitpid.c L12—L54；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
int main(int argc, int arg0)
{
    int print_location = (argc == 1) ? 0 : arg0;

    // Init two mutex locks, and convert decimal handle to string via itoa
    int handle1 = sys_mutex_init(LOCK1_KEY);
    int handle2 = sys_mutex_init(LOCK2_KEY);


    // Launch two assistant processes, and pass mutex handles to them
    // TODO: [P3-TASK1 S-core] use your "ready_to_exit" id here
    int rte_id = 2;
    assert(rte_id != -1);
    pid_t pid1 = sys_exec(rte_id, 3, print_location + 1, handle1, handle2);

    sys_sleep(1);  // wait enough time for task1 to acquire locks
    

    // TODO: [P3-TASK1 S-core] use your "wait_locks" id here
    int wl_id = 3;
    assert(wl_id != -1);
    pid_t pid2 = sys_exec(wl_id, 3, print_location + 2, handle1, handle2);

    // Start to waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid1);
    sys_waitpid(pid1);

    // Finish waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid1);

    // Start to waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid2);
    sys_waitpid(pid2);

    // Finish waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid2);

    return 0;
}
```

- **L12–14**：这个测试的main按整数接口收参。原文写argc==1时显示在第0行，否则使用arg0；按现有实现理解，不把它改写成常见的argv规则。
- **L16–18**：以固定key初始化两把互斥锁，得到内核锁表句柄。注释提及转字符串，是兼容另一个分支留下的文字；本S-Core路径直接传整数句柄。
- **L21–24**：准备启动ready_to_exit，原-1占位已配置为默认程序ID2，并用断言防止忘记填写。
- **L25**：启动第一个助手，argc=3，参数依次是显示行、锁1句柄、锁2句柄；pid1记录本次动态创建的进程号。
- **L27**：主动sleep一秒，给助手获取锁的机会。它是测试顺序安排，不是内核互斥正确性依赖的同步原语。
- **L30–33**：将wait_locks的默认ID设为3并启动第二个助手，用同一对锁句柄；pid2与程序ID3是两个概念。
- **L35–38**：移动测试输出光标，显示正要等待pid1，然后通过sys_waitpid阻塞；目标已结束时则可立即返回。
- **L40–42**：waitpid返回后显示pid1已经退出，说明测试程序已经越过第一个等待点。
- **L44–47**：继续等待pid2；它只有完成两把锁的获取、释放及main返回后才会结束。
- **L49–51**：第二次等待结束后显示pid2退出，不等于必须观察到屏幕上每一次中间刷新。
- **L53–54**：main返回0，控制回crt0再调用sys_exit；等待该waitpid测试进程的前台shell随后可被唤醒。

### ready_to_exit：持有两把锁后计算或等待被杀

P3:test/test_project3/ready_to_exit.c L6—L38；与 P3 原始框架同名文件字节一致

```c
#ifdef S_CORE
int main(int argc, int arg0, int arg1, int arg2)
{
    assert(argc >= 3);
    int print_location = arg0;
    int handle1 = arg1;
    int handle2 = arg2;
#else
int main(int argc, char *argv[])
{
    assert(argc >= 4);
    int print_location = atoi(argv[1]);
    int handle1 = atoi(argv[2]);
    int handle2 = atoi(argv[3]);
#endif

    // Acquire two mutex locks
    sys_mutex_acquire(handle1);
    sys_mutex_acquire(handle2);

    // Start for-loop, wait for timeup or being killed
    for (int i = 0; i < 10000; ++i)
    {
        sys_move_cursor(0, print_location);
        printf("> [TASK] I am task with pid %d, I have acquired two mutex locks. (%d)", sys_getpid(), i);
    }

    // If timeup, release two mutex locks
    sys_mutex_release(handle1);
    sys_mutex_release(handle2);

    return 0;
}
```

- **L6–8**：S_CORE选择main(argc,arg0,arg1,arg2)，这是一组整数参数，不是argc加char**argv。
- **L9–12**：要求至少3个参数，并分别取显示行、锁1句柄、锁2句柄。
- **L13–20**：保留的非S-Core分支使用字符串argv并经atoi转换；默认Makefile不会编译这个分支。#endif之后共用同一函数主体。
- **L22–24**：顺序获取两把锁。持有者PID由锁实现维护，供后续释放或退出清理识别。
- **L26–28**：循环10000次；这是有限循环，既可以正常跑完，也可能在运行期间被shell用实际PID终止。
- **L29–31**：每轮定位输出并打印自身PID和循环计数，便于ps与kill对应；输出系统调用本身也会经过已有异常机制。
- **L33–35**：若循环正常结束，用户代码主动释放两把锁，唤醒等待者；若此前被kill，这两句不会执行，必须由内核清理代劳。
- **L37–38**：返回到crt0触发exit。正常结束场景能证明return链接通；kill场景则另外考察finish_process与mutex_release_all。

### wait_locks：逐把等待并完成main

P3:test/test_project3/wait_locks.c L6—L45；与 P3 原始框架同名文件字节一致

```c
#ifdef S_CORE
int main(int argc, int arg0, int arg1, int arg2)
{
    assert(argc >= 3);
    int print_location = arg0;
    int handle1 = arg1;
    int handle2 = arg2;
#else
int main(int argc, char *argv[])
{
    assert(argc >= 4);
    int print_location = atoi(argv[1]);
    int handle1 = atoi(argv[2]);
    int handle2 = atoi(argv[3]);
#endif

    // Try to acquire and release mutex lock1
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to acquire mutex lock1 (handle=%d).", handle1);

    sys_mutex_acquire(handle1);

    sys_move_cursor(0, print_location);
    printf("> [TASK] I have acquired mutex lock1 (handle=%d).  ", handle1);

    sys_mutex_release(handle1);

    // Try to acquire and release mutex lock2
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to acquire mutex lock2 (handle=%d).", handle2);

    sys_mutex_acquire(handle2);

    sys_move_cursor(0, print_location);
    printf("> [TASK] I have acquired mutex lock2 (handle=%d).  ", handle2);

    sys_mutex_release(handle2);

    return 0;
}
```

- **L6–8**：选择S-Core整数形参版本，和ready_to_exit使用相同参数布局。
- **L9–12**：检查参数数目，取显示行及两把锁句柄；这里传的是同一锁表的索引。
- **L13–20**：非S-Core分支保留argv转换形式，默认不生效；随后的锁操作由两个分支共用。
- **L22–24**：先显示将要获取锁1，不要把这条提示误当成已经进入临界区。
- **L26**：真正请求锁1；若仍由另一个进程持有，内核会把当前任务阻塞在锁等待队列。
- **L28–29**：获得执行权并从acquire返回后才显示已持有锁1，这条现象比前面的want更有证明力。
- **L31**：释放锁1，后续才进入第二把锁的测试。
- **L33–35**：显示希望获取锁2，其句柄与创建者传入的第二把锁相同。
- **L37**：实际获取锁2，可能再次阻塞；两把锁不是因为字符串提示就自动同时获得。
- **L39–40**：成功返回后显示已持有锁2。
- **L42**：释放第二把锁，清理本程序主动获得的资源。
- **L44–45**：main返回，crt0发出sys_exit；等待pid2的测试进程因此能够继续。

### 执行推演

1. 前台执行exec 1：shell创建waitpid进程后等它；waitpid再创建两个助手，并依次等pid1、pid2。实际形成多层等待关系，但内核waitpid并不强制父子关系。
2. 正常路径：ready_to_exit拿两锁、完成循环、主动释放、return；wait_locks得到两锁并return；waitpid两次返回并return；最后shell重现提示符。
3. 强制终止路径：后台执行exec 1 &，用ps找到此轮ready_to_exit的实际PID，在它仍存活时kill它。它的用户release语句不会再执行，内核必须替它释放锁并唤醒锁等待者与PID等待者。
4. 课程输出可能完成得很快，来不及手动kill；本书验证程序另用可控的持锁sleep场景检查这条内核清理路径，不能仅以一次手动操作推断通过。

### 现象与边界

- 前台返回提示符验证了main→crt0→exit→唤醒waitpid的整条退场链，而不是只显示程序加载成功。
- 目标被kill后，锁等待者应继续、PID等待者应返回，退出目标不应再列于ps。
- 一个程序的多次实例具有独立PCB和栈，但crt0仍清理共享BSS；这些测试没有建立私有地址空间。
- 程序ID是构建时的顺序；更改TASKS后必须同步修改rte_id、wl_id，不能继续照抄2和3。
- 测试程序没有检查每个sys_exec返回值，资源不足时现象可能不同；容量和错误恢复由专门探针检查。
- ready_to_exit正常释放锁后退出，与持锁状态被kill是两种不同覆盖，不能相互替代。

## 12 结束一个持锁进程，也要交还它占住的资源

把P2的互斥所有权移交，接到P3正常退出与kill的共同清理路径。不能只把进程标成EXITED而让它的锁永久保持占用。

P2已有原子尝试、等待队列和owner；P3抽出release_owned_lock，并增加按指定PID扫描释放的mutex_release_all。释放目标可以是另一个被kill的进程，不能一律使用current_running的PID。

锁表中的owner是拥有者PID；block_queue保存竞争失败的PCB节点。本实现单核，通过irq_save保护检查、排队与移交的组合；等待者恢复后应已经拥有锁。

### 互斥锁的完整结构

P3:include/os/lock.h L45—L52；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
typedef struct mutex_lock
{
    spin_lock_t lock;
    list_head block_queue;
    int key;
    int used;
    pid_t owner;
} mutex_lock_t;
```

- **L45–46**：开始定义mutex_lock结构。一个锁对象既保存底层占用状态，也保存逻辑拥有者和睡眠等待者。
- **L47**：lock的LOCKED/UNLOCKED状态用于原子竞争；它不是owner PID的另一种写法。
- **L48**：block_queue是这个锁自己的等待队列头。排进去的是PCB中唯一的list节点，不会复制PCB。
- **L49**：key用于让不同进程取得同一把逻辑锁；用户取得的id则是锁表槽位，两者不能混用。
- **L50**：used标记此锁表槽是否已初始化，供查找和退出扫描使用。
- **L51**：owner保存持锁进程的PID。P3杀死另一个进程时靠它定位应释放的资源。
- **L52**：结束结构定义并取类型名mutex_lock_t。

### 获取、所有权移交、主动释放与退出扫描

P3:kernel/locking/lock.c L53—L96；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void do_mutex_lock_acquire(int id)
{
    uint64_t flags = irq_save();
    mutex_lock_t *lock = get_lock(id);
    assert(lock->owner != current_running->pid); /* non-recursive */
    if (spin_lock_try_acquire(&lock->lock)) {
        lock->owner = current_running->pid;
    } else {
        do_block(&current_running->list, &lock->block_queue);
        /* release handed ownership to us; no stealing by a new arrival. */
        assert(lock->owner == current_running->pid);
    }
    irq_restore(flags);
}
/* The owner has already been checked by the caller. */
static void release_owned_lock(mutex_lock_t *lock)
{
    if (!list_empty(&lock->block_queue)) {
        list_node_t *node = lock->block_queue.next;
        lock->owner = list_entry(node, pcb_t, list)->pid;
        do_unblock(node); /* lock remains LOCKED until this owner releases */
    } else {
        lock->owner = 0;
        spin_lock_release(&lock->lock);
    }
}

void do_mutex_lock_release(int id)
{
    uint64_t flags = irq_save();
    mutex_lock_t *lock = get_lock(id);
    assert(lock->owner == current_running->pid);
    release_owned_lock(lock);
    irq_restore(flags);
}

void mutex_release_all(pid_t owner)
{
    uint64_t flags = irq_save();
    for (int i = 0; i < LOCK_NUM; ++i)
        if (mlocks[i].used && mlocks[i].owner == owner)
            release_owned_lock(&mlocks[i]);
    irq_restore(flags);
}
```

- **L53–54**：获取指定id的互斥锁；调用者进入此函数还不代表已经取得锁。
- **L55**：保存原中断状态并关闭当前核中断，避免竞争结果与入队之间插入一次时钟调度。
- **L56**：get_lock检查编号和used后返回锁地址。现有接口对非法锁编号使用断言，不是返回错误码。
- **L57**：非递归锁禁止同一PID再次获取自己已经持有的锁；否则会把自己阻塞在自己后面。
- **L58–59**：原子交换看到原状态为UNLOCKED时获取成功，立刻把逻辑owner记为当前PID。
- **L60–61**：已有持有者时将当前PCB挂入此锁等待队列并调度出去。do_block返回发生在未来重新获得CPU之后。
- **L62**：注释规定恢复协议：释放方先把owner交给队首，不允许刚到的新竞争者抢走这次交接。
- **L63**：检查恢复后的PID确实是owner。这条断言是移交协议的运行时证据，不是在此处重新竞争底层锁。
- **L64–66**：结束分支，恢复进入函数之前的中断状态并返回；不是无条件打开中断。
- **L67**：下面的内部助手不再重复检查owner，要求调用者已确认要释放的确实是这把锁。
- **L68–69**：release_owned_lock只接收锁指针，不依赖当前执行者就是原持锁进程。
- **L70**：先看是否有人等待。有人时走直接移交，无人时才真正改成UNLOCKED。
- **L71**：取等待队首的节点地址；此时节点仍在锁的队列中。
- **L72**：从节点反推PCB，先将其PID写入owner。先交接再唤醒，恢复的等待者才会满足第63行断言。
- **L73**：do_unblock把该节点从等待队列移到就绪队列，锁的底层状态仍是LOCKED；READY也不等于马上执行。
- **L74–76**：无人等待时清空owner，并用原子释放把底层锁设成UNLOCKED，后来的进程才可以重新竞争。
- **L77–78**：结束分支和移交助手；一次调用至多唤醒一位锁等待者。
- **L80–81**：这是普通进程主动释放锁的系统调用实现，参数仍是锁表id。
- **L82–83**：屏蔽当前核中断后检查锁id，取得稳定的锁对象。
- **L84**：只有owner自己能主动释放，避免一个普通进程解开别人的锁。
- **L85**：复用上面的统一助手：有人等待就交owner，无人等待就解锁。
- **L86–87**：恢复原中断状态，结束主动释放。
- **L89–90**：P3的退出清理入口接收目标owner PID；目标未必等于当前PID。
- **L91**：保存并屏蔽中断，使整次扫描不会与同核上的调度/锁操作交错。
- **L92–94**：遍历固定锁表，只处理已使用且owner匹配的项。每一把都调用同一移交助手，因此一个进程持有多把锁时会全部处理。
- **L95–96**：恢复调用前的中断状态后返回。它没有结束进程，结束状态与队列清理由finish_process负责。

### 执行推演

1. A拥有锁L，B获取失败：B的list进入L.block_queue，状态变BLOCKED。
2. 另一个进程kill A：finish_process以A的PID调用mutex_release_all，找到L。
3. L的owner先改为B，再把B移到ready_queue；L仍LOCKED，新来的C不能越过B。
4. 以后B被调度回来，do_block返回，检查owner==B成立；B最终释放时再交给下一个等待者或解锁。

### 现象与边界

- 杀死一个同时持有两把锁的睡眠进程后，两个锁上的等待链可以继续推进；依据是按owner遍历整个锁表，而非只释放一把。
- 等待者不会因清理而直接变成RUNNING；其运行时机仍由P2调度器决定。
- irq_save保护的是本单核上的临界序列，不自动实现多核共享锁表的互斥。
- 底层LOCKED与逻辑owner必须一起解释。移交时若先解锁再唤醒，会允许新到者偷走本应交给队首的锁。
- 释放自己持有的所有锁不等于释放其他进程的锁，也不等于销毁锁对象。

## 13 先约定“几个人集合”，再取得共同屏障

建立有限屏障表，区分key、返回句柄、目标人数goal、当前到达数arrived和等待队列。

P2只有互斥的“一个owner进入”。P3新增的是“凑齐goal个到达者后一起放行”，并不把临界区串行化。头文件里保留的condition、semaphore和mailbox占位声明不表示这些机制已经实现。

do_barrier_init输入任意整数key和1到NUM_MAX_TASK之间的goal；相同key且相同goal返回同一槽位id。参数冲突、目标非法或表满时返回-1。

### 屏障结构、表容量与接口的连续声明

P3:include/os/lock.h L70—L87；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
typedef struct barrier
{
    int used;
    int key;
    int goal;
    int arrived;
    unsigned generation;
    list_head wait_queue;
} barrier_t;

#define BARRIER_NUM 16

void init_barriers(void);
int do_barrier_init(int key, int goal);
void do_barrier_wait(int bar_idx);
void do_barrier_destroy(int bar_idx);
struct pcb;
void barrier_cancel_wait(struct pcb *task);
```

- **L70–71**：定义屏障对象，和互斥锁是不同类型；这里没有owner字段。
- **L72**：used表示屏障槽当前有效。destroy清除此位，后续init可以复用该槽。
- **L73**：key是调用者约定的共享标识，不要求等于数组下标。
- **L74**：goal是每一轮需要的参与者数量；等待中有人被kill时也不会自动减少它。
- **L75**：arrived统计当前尚未完成这一轮的到达者，包括已在等待队列中的进程。
- **L76**：generation记录轮次或重新初始化/销毁的推进。当前代码只更新它，没有在wait中读取比较，不能把它讲成实际生效的代数校验。
- **L77**：wait_queue存尚未凑齐人数而阻塞的PCB节点。
- **L78**：结束结构定义，类型名为barrier_t。
- **L80**：固定表容量为16；它是可同时存在的屏障对象数，不是每个屏障的goal。
- **L82–85**：分别声明开机初始化、按key创建/查找、到达等待和销毁接口。wait与destroy是void，没有取消原因返回值。
- **L86–87**：前置声明PCB类型并声明终止等待者时的内部清理接口，避免把完整PCB定义硬塞进本头文件。

### 屏障表、开机初始化和按key取得对象

P3:kernel/locking/lock.c L98—L137；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static barrier_t barriers[BARRIER_NUM];

void init_barriers(void)
{
    for (int i = 0; i < BARRIER_NUM; ++i) {
        barriers[i].used = 0;
        barriers[i].arrived = 0;
        barriers[i].generation = 0;
        list_init(&barriers[i].wait_queue);
    }
}

int do_barrier_init(int key, int goal)
{
    uint64_t flags = irq_save();
    if (goal < 1 || goal > NUM_MAX_TASK) {
        irq_restore(flags);
        return -1;
    }
    int free_slot = -1;
    for (int i = 0; i < BARRIER_NUM; ++i) {
        if (barriers[i].used && barriers[i].key == key) {
            int result = barriers[i].goal == goal ? i : -1;
            irq_restore(flags);
            return result;
        }
        if (!barriers[i].used && free_slot < 0) free_slot = i;
    }
    if (free_slot >= 0) {
        barrier_t *bar = &barriers[free_slot];
        bar->used = 1;
        bar->key = key;
        bar->goal = goal;
        bar->arrived = 0;
        ++bar->generation;
        list_init(&bar->wait_queue);
    }
    irq_restore(flags);
    return free_slot;
}
```

- **L98**：为本文件分配固定屏障表。static限制名称的外部可见性，不表示对象会按进程各有一份。
- **L100–101**：开机初始化所有屏障槽，尚未产生某个应用专用的屏障。
- **L102–104**：遍历表，先标成未使用，并把当前到达数归零。
- **L105**：初始代数设为0，供后续记录对象初始化、轮次完成和销毁。
- **L106**：每个等待队列头必须初始化成自环；只把used写0不能替代链表初始化。
- **L107–108**：结束循环与开机初始化。
- **L110–111**：用户创建接口接收key和goal，返回的是屏障表id。
- **L112**：保存并屏蔽同核中断，整个查找/创建过程都处于保护内。
- **L113**：只接受1到NUM_MAX_TASK的人数；goal=1合法，表示每次到达都立即完成一轮。
- **L114–116**：人数非法时恢复中断状态并返回-1，不占用表项。
- **L117**：先记“尚未发现空槽”为-1；后面既要查同key，也要记住第一个空闲项。
- **L118–119**：遍历屏障表，对已使用且key相同的对象优先执行复用检查。
- **L120**：已有对象的goal必须与本次请求完全一致。同key不同goal返回-1，不在有人等待时暗改人数。
- **L121–123**：恢复中断状态并返回已有id或参数冲突错误；不会再创建第二个同key对象。
- **L124**：只记录第一个空槽，仍继续扫描，防止后面的槽已经存在相同key。
- **L125**：结束查找循环；到这里才知道应新建，还是表已经满了。
- **L126–127**：发现空槽时取得其地址，准备初始化一份新的逻辑屏障。
- **L128–130**：标为有效，写入key与goal。槽位id来自free_slot，不是把key强制取模。
- **L131–132**：当前到达数归零并推进代数；复用旧槽也被记作新的对象使用阶段。
- **L133–134**：重建空等待队列，结束创建分支。
- **L135–137**：恢复原中断状态并返回槽位；表满时free_slot仍为-1。

### 执行推演

1. A请求key=58、goal=3，在空表得到id=0；B用相同参数再请求，也得到0。
2. C请求key=58、goal=2，命中已有对象但人数冲突，返回-1；原对象仍goal=3。
3. 一个屏障经destroy后，该id可以给另一次init使用；key只是查找约定，用户应使用这次返回的有效句柄。

### 现象与边界

- 课程barrier父程序创建一次屏障后，把返回句柄传给三个子进程；三个子进程因此在同一个对象上集合。
- 同key调用返回相同句柄由查重分支保证；固定表容量耗尽由free_slot=-1路径明确报告。
- 拿到同一个屏障不代表已经等待；真正增加arrived的是下一步do_barrier_wait。
- 本接口返回裸数组id，没有把generation编码进用户句柄；旧句柄若误用于已重新分配的同一槽，不能靠generation自动检测出来。
- generation是当前实现的记录字段，不是可凭名字推断的防竞态算法。

## 14 每轮凑齐以后，先重置计数，再唤醒等待者

把三人集合扩展为可重复十轮的同步点：前goal-1个到达者阻塞，最后一个到达者完成本轮并唤醒它们。

P2的do_block/do_unblock已经能迁移队列；P3将它们用于屏障队列。与互斥锁不同，最后一人不是把owner交给一人，而是让这一轮全部等待者恢复就绪。

等待入口输入屏障id。有效对象在关中断保护内更新arrived；非最后一人记住barrier_idx并阻塞，最后一人先归零、推进代数、摘空等待队列。当前wait没有返回值可表示取消或成功。

### 完整的屏障唤醒助手和等待函数

P3:kernel/locking/lock.c L139—L166；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
static void wake_barrier_waiters(barrier_t *bar)
{
    while (!list_empty(&bar->wait_queue)) {
        list_node_t *node = bar->wait_queue.next;
        list_entry(node, pcb_t, list)->barrier_idx = -1;
        do_unblock(node);
    }
}

void do_barrier_wait(int id)
{
    uint64_t flags = irq_save();
    if (id < 0 || id >= BARRIER_NUM || !barriers[id].used) {
        irq_restore(flags);
        return;
    }
    barrier_t *bar = &barriers[id];
    if (++bar->arrived == bar->goal) {
        bar->arrived = 0;
        ++bar->generation;
        wake_barrier_waiters(bar);
    } else {
        current_running->barrier_idx = id;
        do_block(&current_running->list, &bar->wait_queue);
        current_running->barrier_idx = -1;
    }
    irq_restore(flags);
}
```

- **L139–140**：内部助手负责唤醒一个屏障上的全部等待者；调用者已经屏蔽中断。
- **L141**：只要队列非空就继续，每次do_unblock会把取到的节点从本队列移走。
- **L142**：取当前队首，不提前缓存下一个节点，避免脱链后继续沿旧连接遍历。
- **L143**：先清PCB的barrier_idx。这个进程已不再被计作仍挂在屏障队列中的等待者，后续kill不应再次扣除其到达数。
- **L144**：将节点移到就绪队列；进程稍后恢复，而不是助手直接调用子进程函数。
- **L145–146**：循环到等待队列变空，结束批量唤醒。
- **L148–149**：这是用户屏障等待的内核实现。每次有效调用代表当前进程的一次到达。
- **L150**：保存中断状态并屏蔽同核中断，保护检查、计数、队列变化这一整段操作。
- **L151**：同时检查id下界、表上界和used，避免访问非法数组项或已销毁对象。
- **L152–154**：非法对象只恢复状态并返回；由于接口是void，调用者拿不到错误码。
- **L155**：得到有效屏障对象的指针。
- **L156**：先递增arrived，再与goal比较；这次到达可能正好凑齐当前一轮。
- **L157**：最后一个到达者先把arrived归零，为下一轮准备计数起点。
- **L158**：推进generation作为轮次记录。这里并没有读取旧generation来决定哪个进程可以返回。
- **L159**：在同一保护区内清空等待队列并唤醒本轮等待者，然后最后一人自己也继续执行。
- **L160–162**：尚未凑齐时，把屏障id记入当前PCB，再将其list挂入此屏障的等待队列并切走。
- **L163**：未来被唤醒并重新调度后，do_block返回，再把本进程的barrier_idx归为-1；唤醒助手也已清过它。
- **L164–166**：结束分支，恢复进入wait前的中断状态并返回用户路径。

### 课程测试：S_CORE分支的完整父程序main

P3:test/test_project3/barrier.c L11—L41；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
#ifdef S_CORE
int main(int argc, int arg0)
{
    int print_location = (argc == 1) ? 0 : arg0;

    // Initialize barrier
    int handle = sys_barrier_init(BARR_KEY, NUM_TB);

    // Launch child processes
    pid_t pids[NUM_TB];
    
    // Start three test programs
    for (int i = 0; i < NUM_TB; ++i)
    {
        // TODO: [P3-TASK2 S-core] use your "test_barrier" id here        
        int tb_id = 5;
        assert(tb_id != -1);
        pids[i] = sys_exec(tb_id, 2, print_location + i, handle, 0);       
    }

    // Wait child processes to exit
    for (int i = 0; i < NUM_TB; ++i)
    {
        sys_waitpid(pids[i]);
    }

    // Destroy barrier
    sys_barrier_destroy(handle);

    return 0;
}
```

- **L11**：本书默认Makefile定义S_CORE，因此编译这个整数参数分支；后面的字符串argv分支不在默认执行路径。
- **L12–13**：父程序入口接收argc与第一个整数参数，argc不是标准POSIX字符串数组的长度约定。
- **L14**：源码按argc==1选择默认行0，否则用arg0指定第一条输出行。这里应按原条件阅读，不把它改写成别的判断。
- **L16–17**：注释后创建key为BARR_KEY、goal为NUM_TB的屏障；本文件常量分别为58和3。
- **L19–20**：为三个子进程的PID留栈上数组。数组位置i不是子进程PID。
- **L22–24**：循环创建三个参与者，每个参与者占不同输出行。
- **L25–27**：课程原占位程序号已配置为5，对应默认TASKS中的test_barrier；断言只排除未填的-1。
- **L28**：动态创建一个test_barrier，传两个整数：输出行print_location+i和共同的屏障句柄handle。最后的0是第三参数占位，不计入argc=2。
- **L29**：结束创建循环；此时父进程并没有亲自调用屏障wait。
- **L31–35**：按保存的PID等待三个子进程各自退出。等待顺序不要求它们按同一顺序结束。
- **L37–38**：全部waitpid返回后才销毁屏障，正常测试不会提前取消仍在进行的一轮。
- **L40–41**：main正常返回；P3的crt0再把返回接到sys_exit，父进程也结束。

### 课程参与者：完整main（含两种接口的条件编译）

P3:test/test_project3/test_barrier.c L7—L41；与 P3 原始框架同名文件字节一致

```c
#ifdef S_CORE
int main(int argc, int arg0, int arg1)
{
    assert(argc >= 2);
    int print_location = arg0;
    int handle = arg1;
#else
int main(int argc, char *argv[])
{
    assert(argc >= 3);
    int print_location = atoi(argv[1]);
    int handle = atoi(argv[2]);
#endif

    // Set random seed
    srand(clock());

    // Enter and exit target barrier
    for (int i = 0; i < 10; ++i)
    {
        int sleep_time = rand() % 3 + 1;
        sys_move_cursor(0, print_location);
        printf("> [TASK] Ready to enter the barrier.(%d) ", i);

        sys_barrier_wait(handle);

        sys_move_cursor(0, print_location);
        printf("> [TASK] Exited barrier (%d).(sleep %d s)",
               i, sleep_time);

        sys_sleep(sleep_time);
    }

    return 0;
}
```

- **L7–9**：默认S_CORE分支开始：入口用argc、arg0、arg1三个整数接收参数。
- **L10**：至少需要两个整数实参：显示行和屏障句柄。
- **L11–12**：把arg0解释成显示行，把arg1解释成屏障id；不是重新通过key创建另一份屏障。
- **L13–15**：非S_CORE的备用入口采用字符串argv。本书将原条件编译全文保留，默认构建不会执行这一支。
- **L16–18**：备用分支要求包含程序名的三个参数，再用atoi转成行号与句柄；不要套到当前整数接口上。
- **L19**：结束接口分支，下面的十轮循环为两个分支共用。
- **L21–22**：用clock为伪随机序列设种子，制造各进程轮次之间不同的睡眠时长。随机等待用来扰动先后次序，不是同步正确性的前提。
- **L24–26**：执行i=0到9，共十次屏障等待；每个子进程都必须完成十轮。
- **L27**：每轮生成1到3秒的睡眠时长，稍后才使用。
- **L28–29**：移动到这个参与者自己的行，显示准备进入第i轮；看到这句不代表已经通过屏障。
- **L31**：真正进入内核屏障wait，前两位到达者会在这里暂停，第三位完成这一轮并唤醒它们。
- **L33–35**：wait返回后显示Exited barrier与轮次。三个参与者最终都出现轮次9，才覆盖每个参与者的十轮返回。
- **L37**：本轮通过之后才睡眠，故下一轮到达顺序会变化，需要可重复使用同一个屏障。
- **L38**：结束本轮循环体，继续下一轮；这里没有重新init或destroy。
- **L40–41**：十轮后正常返回，crt0触发退出，父程序的waitpid因此可以继续。

### 执行推演

1. goal=3时，A第一次到达令arrived从0变1，进入等待队列；B令1变2，也阻塞。
2. C令2变3，先写arrived=0，再推进generation并把A/B全部移到就绪队列；C自己不阻塞。
3. 即使C较早再次到达，也只能进入新的arrived计数和新的等待队列。上一轮A/B已被摘出，不会被新一轮的唤醒重复取到。
4. 下一轮仍要凑齐三次到达；每个参与者在wait返回后睡1—3秒，重复十次。

### 现象与边界

- 三个参与者最终各自显示Exited barrier (9)，并都正常退出；父程序随后返回提示符。
- 跨轮正确性来自“关中断期间先清计数、再摘空旧队列后唤醒”的顺序，而不是来自当前代码没有使用的generation比较。
- barrier不是互斥锁：它保证此前这一组到达齐全，不保证通过后只有一个进程运行临界区。
- 最后到达者唤醒别人后可以较早进入下一轮；不能假定各进程输出严格按A、B、C循环。
- 当前课程程序共享固定地址映像和全局区，rand的状态也不是凭三个PCB就获得各自隔离；这里验证的是屏障控制流。
- test_barrier.c中的备用argv分支只是框架兼容代码，默认S_CORE接口没有构造字符串argv。

## 15 销毁负责唤醒，kill负责撤销被杀者的到达

给屏障的异常生命周期一个明确收尾：销毁取消所有等待；kill一个等待者则撤销它尚未完成的到达记录，再由统一退出流程将它脱链。

只实现“最后一人唤醒”不够。动态进程可以在屏障中途被kill，如果不扣除arrived，下一位到达者可能替一个已消失的进程凑数；如果销毁不唤醒，旧等待者会永远卡住。

destroy输入屏障id并在关中断区取消对象；barrier_cancel_wait输入目标PCB，是finish_process在保护区内调用的内部助手，自己不负责list_del、不唤醒其余参与者，也不降低goal。

### 完整销毁与终止等待者清理函数

P3:kernel/locking/lock.c L168—L190；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```c
void do_barrier_destroy(int id)
{
    uint64_t flags = irq_save();
    if (id >= 0 && id < BARRIER_NUM && barriers[id].used) {
        barrier_t *bar = &barriers[id];
        bar->used = 0;
        bar->arrived = 0;
        ++bar->generation;
        wake_barrier_waiters(bar); /* Destroy cancels outstanding waits. */
    }
    irq_restore(flags);
}

/* Termination removes a waiting participant; it does not silently count that
 * participant as an arrival. The application can destroy/cancel the barrier. */
void barrier_cancel_wait(pcb_t *task)
{
    int id = task->barrier_idx;
    if (id >= 0 && id < BARRIER_NUM && barriers[id].used &&
        barriers[id].arrived > 0)
        --barriers[id].arrived;
    task->barrier_idx = -1;
}
```

- **L168–169**：销毁指定槽位的屏障；函数返回void，不报告取消原因。
- **L170**：保存并屏蔽当前核中断，使取消对象和唤醒队列成为不可被同核调度穿插的一段。
- **L171**：只处理编号有效且used的对象；重复destroy同一已失效槽不会再次遍历等待者。
- **L172**：取得目标对象指针。
- **L173**：先把used清零，新的wait调用会被有效性检查挡住。
- **L174**：丢弃本轮到达计数。销毁是取消，不是把不足人数的一轮伪装成正常聚齐。
- **L175**：推进代数，记录对象生命周期发生了变化；仍没有给用户返回一个带代数的句柄。
- **L176**：调用上一节的批量唤醒助手，清PCB中的barrier_idx并使所有等待者READY。它们以后从wait返回，但无法通过此void接口分辨取消和正常完成。
- **L177–179**：结束有效对象分支，恢复原中断状态并返回。
- **L181–182**：原注释强调：终止应移除等待参与者，而不是假装它依然有效到达；应用可以决定销毁屏障结束等待。
- **L183–184**：这是内部的目标PCB清理助手，不是直接接收用户id的系统调用。
- **L185**：从目标PCB读取其barrier_idx；未在屏障中等待时通常为-1。
- **L186–187**：确认该id有效、对象仍存在且arrived大于0，才允许递减，避免非法访问或负数。
- **L188**：撤销这个即将结束的参与者对当前轮的那一次到达。goal保持不变，也不会在这里自动放行其他进程。
- **L189–190**：把目标PCB的barrier_idx清为-1。随后finish_process还会将它的list从原等待队列摘除；本助手本身没有做这一步。

### 执行推演

1. goal=3时，A/B已到达，arrived=2且都阻塞；kill A先撤销A的到达，arrived变1，再把A从屏障队列摘掉。
2. C后来到达令arrived变2，仍不足3，不应因A已死而让B/C提前通过。应用须补足另外一个有效参与者，或销毁屏障取消等待。
3. destroy把used置0、arrived置0，唤醒剩余B/C，并清它们的barrier_idx；它们可以回到用户代码，不会继续睡在失效对象上。
4. 若被kill的进程早已由正常完成或destroy唤醒，其barrier_idx已清为-1，不会再误扣一遍当前轮的arrived。

### 现象与边界

- 销毁有等待者的屏障后，等待进程能够恢复，shell仍可响应；这是取消路径，不能据此宣称人数已经凑齐。
- 杀死屏障参与者后，剩余者不会凭空过关；只有补足有效到达或显式销毁才会改变其等待状态。
- barrier_cancel_wait没有自己的irq_save。它依赖finish_process调用时已在保护区内，不能当作任意并发上下文都安全的公开函数。
- 本实现没有取消错误码、POSIX屏障返回常量或旧句柄代数验证；应用需要自己约定取消后如何继续。
- 无论是等待锁、waitpid还是屏障，同一PCB的list节点都只能在一个队列中。取消计数和真正脱链必须由统一清理链配合完成。

## 16 把程序编号、编译标准和启动环境对上

使本书的代码、镜像程序顺序和可运行命令一致，避免把普通 QEMU 与课程 U-Boot 路线混为一谈。

P3 保留 P2 的链接地址、每程序 64 KiB 槽位和镜像格式；主要变化是选择 Project3 程序、S_CORE 接口和明确 GNU C11。

输入 TASKS / LAB_STAGE / CROSS_PREFIX 等构建参数；输出内核、用户 ELF、镜像与反汇编。课程运行还需要课程 QEMU 和 U-Boot，云端测试则走独立的现有适配脚本。

### 项目、阶段、任务集合与编译参数

P3:Makefile L1—L56；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```makefile
PROJECT_IDX = 3
SHELL = /bin/sh
.DEFAULT_GOAL := all
.NOTPARALLEL:
DIR_OSLAB ?= $(HOME)/OSLab-RISC-V
QEMU ?= $(DIR_OSLAB)/qemu/riscv64-softmmu/qemu-system-riscv64
UBOOT ?= $(DIR_OSLAB)/u-boot/u-boot
CROSS_PREFIX ?= riscv64-unknown-linux-gnu-
CC = $(CROSS_PREFIX)gcc
AR = $(CROSS_PREFIX)ar
OBJDUMP = $(CROSS_PREFIX)objdump
GDB = $(CROSS_PREFIX)gdb
HOST_CC ?= gcc
LAB_STAGE ?= 4
ifeq ($(filter $(LAB_STAGE),1 2 3 4),)
$(error LAB_STAGE must be 1, 2, 3 or 4)
endif
ifeq ($(LAB_STAGE),1)
TASKS ?= coop1 coop2
else ifeq ($(LAB_STAGE),2)
TASKS ?= mutex1 mutex2
else ifeq ($(LAB_STAGE),3)
TASKS ?= sleep coop_timer
else
TASKS ?= $(P3_TASKS)
endif
P3_TASKS = shell waitpid ready_to_exit wait_locks barrier test_barrier
COURSE_TASKS = fly lock1 lock2 print1 print2 sleep timer
VALIDATION_TASKS = coop1 coop2 mutex1 mutex2 coop_timer probe1 probe2 p3_probe p3_worker
VALID_TASKS = $(P3_TASKS) $(COURSE_TASKS) $(VALIDATION_TASKS)
ifneq ($(filter-out $(VALID_TASKS),$(TASKS)),)
$(error Unknown task: $(filter-out $(VALID_TASKS),$(TASKS)))
endif
ifeq ($(strip $(TASKS)),)
$(error TASKS must not be empty)
endif
ifneq ($(words $(TASKS)),$(words $(sort $(TASKS))))
$(error TASKS must not contain duplicates)
endif

RISCV_ARCH ?= rv64imac_zicsr_zifencei
CFLAGS = -std=gnu11 -O1 -g -Wall -Wextra -Wno-unused-parameter -ffreestanding -fno-builtin \
         -nostdlib -nostdinc -fno-pie -fno-stack-protector -fno-common \
         -mcmodel=medany -msmall-data-limit=0 -mno-relax \
         -march=$(RISCV_ARCH) -mabi=lp64 -DLAB_STAGE=$(LAB_STAGE)
CFLAGS += -DS_CORE
LDFLAGS = -static -no-pie -Wl,--build-id=none -Wl,--no-relax -T riscv.lds
KINC = -Iarch/riscv/include -Iinclude -Idrivers
UINC = -Itiny_libc/include
KERNEL_SRC = $(wildcard arch/riscv/kernel/*.S arch/riscv/bios/*.c drivers/*.c \
                        init/*.c kernel/*/*.c libs/*.c)
USER_SRC = $(wildcard tiny_libc/*.c)
USER_OBJ = $(patsubst tiny_libc/%.c,build/libc_%.o,$(USER_SRC))
USER_ELF = $(addprefix build/,$(TASKS))
HEADERS = $(shell find include arch/riscv/include drivers tiny_libc/include test/validation -name '*.h')
vpath %.c test test/test_project$(PROJECT_IDX) test/test_project2 test/validation
```

- **L1–4**：项目号选 3；明确默认目标 all，并要求串行构建。本文不擅自提高 make 并发度或忽略配置依赖。
- **L5–7**：设置课程工具目录、QEMU 和 U-Boot 的可覆盖默认路径；?= 允许命令行指定实际位置。
- **L8–12**：由交叉编译前缀构造 gcc、ar、objdump、gdb 名称。这些工具生成或读取 RISC-V 程序，不能直接用宿主 gcc 替代。
- **L13–17**：HOST_CC 编译宿主镜像制作工具；默认 LAB_STAGE=4，并拒绝范围外的阶段号。
- **L18–26**：按 P2 阶段选默认任务；阶段 4 走 P3_TASKS。LAB_STAGE 影响特权级/时钟基础机制，不等于 P3 的 Task1/Task2 编号。
- **L27**：六个默认程序按此顺序进入目录：shell、waitpid、ready_to_exit、wait_locks、barrier、test_barrier，对应 ID0—5。
- **L28–30**：保留课程任务与验证任务清单，并合并合法名称。列在合法清单不代表默认会被打包或开机创建。
- **L31–33**：若 TASKS 中有未知名称，make 在执行编译前报错，避免错误名字进入镜像命令。
- **L34–36**：拒绝空任务列表，保证镜像具有可供内核读取的任务记录。
- **L37–39**：比较原列表与去重列表的长度，拒绝重复程序名；多个运行实例要用运行时 exec，而不是在 TASKS 重复名字。
- **L41**：允许覆盖目标指令集；默认显式列出 CSR 与指令同步扩展。旧课程工具链可按其实际支持情况覆盖。
- **L42–45**：使用 GNU C11、裸机编译和 RV64 LP64 ABI。-nostdlib/-nostdinc 排除宿主运行库/头文件；地址模型等保持课程布局。
- **L46**：全局定义 S_CORE，确保内核和用户库编译成同一套按 ID 加整数参数的接口，不能只给其中一侧定义。
- **L47**：静态链接，不生成 PIE，关闭 build-id 与松弛，并使用课程链接脚本。链接参数影响入口与布局。
- **L48–49**：内核和用户态分别使用自己的头文件目录，用户程序经 tiny_libc 调用系统服务。
- **L50–51**：收集内核汇编、驱动、初始化、内核子目录与公共库源码；通配符只是选输入文件，不会执行代码。
- **L52–54**：收集用户库对象，并按 TASKS 得到用户 ELF 目标列表，保持列表顺序。
- **L55**：把相关头文件作为重建依赖；声明变化也应触发编译。
- **L56**：为用户目标搜索 shell、P3 测试、旧 P2 课程测试与额外验证程序。

### 用户程序固定地址、镜像和两类启动入口

P3:Makefile L79—L106；P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）

```makefile
build/%: %.c build/crt0.o build/libtinyc.a riscv.lds $(HEADERS) build/config
	$(CC) $(CFLAGS) $(UINC) $(LDFLAGS) -Wl,--defsym=TEXT_START=$$(python3 -c 'import sys; print(hex(0x52000000+sys.argv[2:].index(sys.argv[1])*0x10000))' '$*' $(TASKS)) -o $@ build/crt0.o $< -Lbuild -ltinyc
build/createimage: tools/createimage.c
	$(HOST_CC) -std=gnu11 -O2 -g -Wall -Wextra -Werror $< -o $@
elf: build/bootblock build/main $(USER_ELF)
image: elf build/createimage
	cd build && ./createimage --extended bootblock main $(TASKS)
asm: elf
	@for name in bootblock main $(TASKS); do $(OBJDUMP) -d build/$$name > build/$$name.txt; done

QEMU_LOG_FILE ?= $(CURDIR)/build/oslab-log.txt
QEMU_OPTS ?= -nographic -machine virt -m 256M -kernel $(UBOOT) -bios none \
             -drive if=none,format=raw,id=image,file=build/image \
             -device virtio-blk-device,drive=image -monitor none -serial stdio \
             -D $(QEMU_LOG_FILE) -d oslab
run: image
	$(QEMU) $(QEMU_OPTS)
debug: image
	$(QEMU) $(QEMU_OPTS) -s -S
gdb:
	$(GDB) build/main -ex 'target remote :1234'
clean:
	rm -rf build
.PHONY: all elf image asm run debug gdb clean

list-tasks:
	@python3 -c 'import sys; [print(i, name) for i, name in enumerate(sys.argv[1:])]' $(TASKS)
.PHONY: list-tasks
```

- **L79–80**：每个程序链接到 0x52000000 加目录下标乘 0x10000 的固定槽位，并与用户入口和 tiny_libc 链接。这个布局解释了为何同程序实例共享映像。
- **L81–82**：createimage 在宿主机执行，因此用 HOST_CC，并同样指定 GNU C11；它不在 RISC-V 客体里运行。
- **L83–85**：先生成 bootblock、内核和用户 ELF，再在 build 目录按 TASKS 顺序制作扩展镜像。顺序必须和测试中的程序 ID 相符。
- **L86–87**：对每个 ELF 生成反汇编文件，供检查实际指令和源码逻辑；反汇编并不自动运行任务。
- **L89–93**：课程运行参数加载 U-Boot，并把镜像挂到 virtio 块设备，还使用课程的 oslab 日志类别。这不是通用 QEMU 的直接内核命令。
- **L94–95**：run 依赖镜像再调用 QEMU；只有课程路径和配套固件真实存在时，才使用这条路线。
- **L96–97**：debug 沿用课程启动，额外开启 GDB 端口并暂停 CPU 等待连接。
- **L98–99**：用交叉 GDB 打开内核 ELF 并连接内部调试端口；符号地址对应所选构建布局。
- **L100–102**：clean 删除本工程生成的 build；本文验证不要求清理或覆盖学生的源码。
- **L104–106**：list-tasks 用 enumerate 打印当前 TASKS 的零基 ID。它显示程序目录，不显示运行 PID；修改顺序后须核对课程测试内硬编码 ID。

### 执行推演

1. 先 make list-tasks CROSS_PREFIX=riscv64-linux-gnu-，核对 0—5；再 make CROSS_PREFIX=riscv64-linux-gnu-。
2. waitpid.c 的 rte_id=2 / wl_id=3，barrier.c 的 tb_id=5；改变 TASKS 时这些关联必须保持一致。
3. 课程机：make run 后进入课程 U-Boot，再按课程要求 loadboot；云端：运行 host_qemu_p3.py，它在临时副本中重定位并使用测试 BIOS。

### 现象与边界

- 原布局编译成功说明源码、工具链和镜像制作闭合；镜像布局测试检查字段和错误路径；客体串口测试再验证实际进程与屏障行为。
- GNU11 避免新编译器默认 C23 与课程 bool typedef、旧式函数声明不兼容，但不替代 ABI 或运行测试。
- 通用 QEMU 的 -d 不支持课程 oslab 类别，且课程地址布局也不同，不能只把 QEMU 变量换成宿主命令就认定等价。
- 不要复制旧文档中的 git commit、覆盖工作树等历史合并操作来启动已完成包；本书使用现有 checkout 和安全解压副本。

## 本次验证

各命令退出 0：原布局构建、10 项镜像检查、完整 P3 串口场景、P2 stage4 回归。

通用 QEMU 使用临时地址重定位与测试 BIOS；未验证课程 QEMU/U-Boot、DASIC/loadbootd 或 Pynq。详细用例、命令、结果和原始日志见 validation/results.json 及同目录日志。
