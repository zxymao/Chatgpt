## TODO 导读：把“待补代码”变成能解释的契约

以下按你需要自己完成的TODO组织。`F2`表示从课程框架差异恢复的**未填实现版本**；`P1`是保存的实验一；`P2`是已完成的A-Core。后续代码直接摘自这些版本，保留文件行号，没有把伪代码冒充工程源码。

每组都先看原TODO，再读实现，最后回答三个问题：输入是什么；这段必须改变哪些状态；完成后下一步由谁继续。出现“节选”时，仅省略文中明确标出的行，完整文件仍可在源码索引打开。

## 按实验任务找对应代码

- **p1-task1**：BIOS打印与bootblock入口，见A2。
- **p1-task2**：读入内核、跳转、清BSS、建立C环境，见A2—A3。
- **p1-task3**：任务加载、crt0、任务main及返回，见A3—A4。
- **p1-task4**：task_info结构、镜像元信息、启动传参、跨扇区读取和按名称加载，见A1、A2、A4。
- **p2-task1**：链表、PCB、初始栈、调度、switch_to、早期跳转表，见A5—A10、A14、A20。
- **p2-task2**：自旋锁、互斥锁、阻塞与唤醒，见A9、A11—A13。
- **p2-task3**：用户调用封装、异常现场、系统调用、睡眠，见A7、A14—A20。
- **p2-task4**：时钟中断、重设定时器、轮转和安全地开启中断，见A8、A19。

完整的 [TODO任务清单](TODO任务清单.md) 逐条记录标记、文件位置、附录编号和状态；源码索引搜索 `TODO` 或 `F2:文件名` 可以查看原始空函数。A5中的PCB结构本身主要是框架提供的背景，列出它是为了读懂后续TODO会操作的字段。

## 写每一处TODO前，先填这五句话

1. 调用者传来什么，当前处于哪个特权级，使用哪个栈？
2. 当前任务/队列/锁的状态在进入时满足什么条件？
3. 我需要改哪些寄存器、内存字段或链表指针？
4. 这段可能阻塞、切换或永不返回吗？返回时结果放在哪里？
5. 哪个具体测试会在我漏写一步时失败？

**不要把TODO标记直接当成未完成清单。** P1里不少标记下已经有代码；P2中的部分标记被实现替换。屏幕退格的P3 TODO和预实验test.S的p0 TODO不属于本次A-Core Task1—4；README的TODO则是需要完成项目说明，不是内核函数。

<!-- PAGE -->

## A1. p1-task4：镜像中的任务表与启动元信息

{{todo:F2:tools/createimage.c:20}}

同文件79、125、216行还要求填写任务记录、处理padding并写回镜像信息。输入是各ELF的加载数据与当前镜像位置；输出是镜像尾部的任务表，以及bootblock尾部约定位置的数量、偏移和内核大小。

{{code:P1:tools/createimage.c:25-30,123-129,144-151}}

已完成P2保留相同磁盘协议，写回引导区的核心是：

{{code:P2:tools/createimage.c:136-141}}

**必须理解：** `task_start`是镜像中的字节位置；`entrypoint`来自ELF入口。这里记录的是磁盘任务元数据，并没有创建PCB。Task4阶段只要求bootblock补齐512B，不再给每个任务分配固定扇区数量。P2补齐镜像尾扇区是额外的完整读取处理。

**易错与检验：** 把内核字节数当扇区数写入，会让bootblock的向上取整再算错；改变结构体字段而不同时修改两端，会让名称之后的偏移全部错位。P1第230行TODO属于旧注释块，实际 `write_img_info()` 从267行起；不要只改那段已停用代码。

<!-- PAGE -->

## A2. p1-task1/2/4：bootblock的四个TODO

{{todo:F2:arch/riscv/boot/bootblock.S:22}}

同一文件的打印、传参和跳转TODO分别位于19、25、28行。下面是P1对应的完成代码，包含原有TODO标记。

{{code:P1:arch/riscv/boot/bootblock.S:21-52}}

**逐段看：** 21—31行调用BIOS打印；34—42行把内核字节数换算为扇区数，从扇区1读到kernel地址；44—47行重新准备内核main的a0/a1；51—52行跳转。调用BIOS时的参数会被消耗，不能沿用读盘前的a0充当任务数。

**不变量与检验：** 引导区字段宽度、内核链接地址和读入地址必须一致。只有看到内核main之后的输出，才证明完成了“读入并跳转”；仅出现bootblock打印只能证明第一个TODO工作了。

<!-- PAGE -->

## A3. p1-task2/3：为什么要先准备C运行环境

{{todo:F2:arch/riscv/kernel/head.S:17}}

下面先列P1内核入口的清零和建栈，再列任务crt0的保存、清零、调用与返回。

{{code:P1:arch/riscv/kernel/head.S:12-31}}

{{code:P1:arch/riscv/crt0/crt0.S:6-29}}

**进入/离开条件：** 内核main需要合法sp和已清零的BSS，同时必须保留a0/a1。任务crt0在P1中要维护加载器的返回链，所以先保存ra/s0，任务main返回后再恢复。

**不能机械迁移：** P2任务不是由加载器普通call启动，已由PCB提供独立栈；P2的crt0在main返回后循环yield。保留P1的“返回加载器”实现，会跳向不存在的调用者。验证时分别观察BSS检查、任务运行及返回行为，三者不是同一项检查。

<!-- PAGE -->

## A4. p1-task3/4：按名查找、跨扇区读入、执行

{{todo:F2:kernel/loader/loader.c:9}}

`init_task_info()`先用下列字节读取函数填充tasks数组；加载某任务时再查名称并读入代码。P1的核心实现如下。

{{code:P1:kernel/loader/loader.c:12-48}}

加载器取得入口后这样执行：

{{code:P1:init/main.c:129-135}}

**输入/输出：** `offset/size/dst`都是按字节描述；磁盘读盘接口则按扇区工作，临时sector_buf用于衔接二者。每轮推进out、offset并减少size，这三个动作缺一不可。按名查找返回入口，找不到返回0。

**检验：** 手算offset=1000、size=600的24/512/64字节三轮复制；用不存在的名字确认不会跳到0。P2完成版在复制任务后还执行fence.i，保证后续取指能看到刚写入的代码。

<!-- PAGE -->

## A5. 写调度TODO前：先读懂PCB里的对象

源码位置：{{ref:P2:include/os/sched.h:57}}。这组结构体是理解TODO的背景，不能把已有字段都算成需要重新编写的功能。

{{code:P2:include/os/sched.h:57-90}}

**按使用者理解字段：** 汇编用kernel_sp恢复内核调用链；异常入口用user_sp和trap_t0保存原用户现场；链表API操作list；调度器修改status；sleep修改wakeup_time；屏幕代码读取当前PCB里的cursor。

运行中、就绪、阻塞不是三份PCB。它们是同一对象在状态和队列中的不同位置。一个PCB只有一个list节点，不能同时把它挂进两个队列。

trap_t0和user_stack_base是完成版为异常入口和参数检查补充的辅助字段。扩展PCB后，供汇编使用的偏移也必须同步核对，不能只让C结构体单方面改变布局。

**检验：** 在纸上给A画一个PCB，跟踪一次yield、一次获取锁失败、一次唤醒。每一步都写明status及list所属队列。只改status或只改链表都会破坏下一次调度。

<!-- PAGE -->

## A6. p2-task1：链表API要维持什么

{{todo:F2:include/os/list.h:53}}

输入是内嵌在PCB中的链表节点或队列头，输出是指针连接关系的变化，不是复制PCB。完成版的核心操作如下。

{{code:P2:include/os/list.h:43-48,53-82}}

**不变量：** 空队列头的next/prev都指向自己；追加时四条连接关系必须成对更新；删除后把节点重新设为自环，后续do_block才能判断该节点尚未挂队列。

`list_entry`从成员地址减去成员偏移，得到PCB基址。它不会查表、不会分配内存，也不能把任意指针变成PCB。`list_pop_front`先判断空队列，返回的节点已经脱链。

**检验：** 给head、A、B画双向箭头，依次执行追加A、追加B、弹出A、删除B，核对head最终恢复自环。

<!-- PAGE -->

## A7. p2-task1/3：构造一次尚未发生过的返回

{{todo:F2:init/main.c:69}}

同文件60行还要求初始化任务寄存器。先看两个现场结构，再看如何在新任务栈中摆放它们。

{{code:P2:include/os/sched.h:38-55}}

{{code:P2:init/main.c:124-144}}

**关键语句：** `regs[2]`是任务sp槽，sepc指向首次入口；SPP决定sret返回U还是S。`sw->regs[0]`是未来ret要取出的ra，设为ret_from_exception；`sw->regs[1]`与kernel_sp共同指向预制切换帧。

**检验：** 沿 `switch_to→ret_from_exception→sret→crt0` 解释每一步谁提供跳转目标。如果把ra直接设成用户main，就绕开了异常现场恢复和特权级返回；如果把sp写成栈底，首次保存寄存器就会越过有效区域。

<!-- PAGE -->

## A8. p2-task1/4：把任务准备为可调度对象

{{todo:F2:init/main.c:80}}

83行还要求设置current_running。初始化全部完成之前，不应让时钟在半初始化的队列上运行。

{{code:P2:init/main.c:146-171,188-204}}

**逐步解释：** pid0先成为当前任务；每个普通任务分配两种栈、加载映像、构造初始现场，再进入ready_queue。`load_task_img()`只负责程序数据，`init_pcb_stack()`负责未来怎样开始执行，两者缺一不可。

**检验：** 逐个核对pid、entry、栈顶、status和队列。time_base必须先取得有效频率；锁、系统调用表、异常表和屏幕都准备好后，才设置定时器及使能抢占。这里使用的是P2实际实现顺序，不是按TODO在模板中的文字位置随意开中断。

<!-- PAGE -->

## A9. p2-task1/2：调度与阻塞/唤醒是一套协议

{{todo:F2:kernel/sched/sched.c:32}}

同文件35、50、55行分别要求切换、阻塞和唤醒。do_scheduler必须与do_block的状态修改保持一致。

{{code:P2:kernel/sched/sched.c:16-37,51-71}}

**不变量：** 只有仍为RUNNING的普通任务才回就绪队尾。do_block先标BLOCKED并进入等待队列，所以后续调度不会把它错误地再排回READY。do_unblock先从旧队列删除，再改READY并排队。

**检验：** 当前A持锁、B获取失败后，B必须只在锁等待队列中；如果这里无条件把prev加回ready_queue，B就会在条件仍不成立时继续执行。队列为空时选择pid0，不能解引用NULL。

<!-- PAGE -->

## A10. p2-task1：switch_to为何能返回另一个任务

{{todo:F2:arch/riscv/kernel/entry.S:55}}

58行是恢复下一任务的对应TODO。输入a0为prev、a1为next，输出不是普通计算值，而是CPU寄存器与执行栈改为next的现场。

{{code:P2:arch/riscv/kernel/entry.S:130-170}}

**分界点：** 146行把旧sp交给prev；147—149行取得next的身份和栈。后面的ld/ret都从next的栈读取。新任务取出预制ra，已运行过的任务取出自己上次暂停的ra。

**检验：** 用A、B交替yield检查所有s0—s11是否保留。漏掉某个s寄存器，计数短期正常也不代表切换正确；只改tp而不换sp，两个任务仍会踩在同一条调用栈上。

<!-- PAGE -->

## A11. p2-task2：自旋锁和锁数组初始化

{{todo:F2:kernel/locking/lock.c:20}}

同文件10、15、26、31行要求初始化锁数组、自旋锁初值、自旋获取与释放。它们是mutex下面的基础操作。

{{code:P2:kernel/locking/lock.c:8-29}}

队列和锁操作还依赖如下本地中断保护：

{{code:P2:include/os/irq.h:78-88}}

**输入/输出：** atomic_swap把新值写进去并返回旧值；旧值为UNLOCKED才代表成功。try只尝试一次，自旋获取则不断尝试。init_locks还必须初始化每把锁的block_queue，而非只清一个status。

**检验与边界：** 解锁把状态写回UNLOCKED；volatile不能替代原子读改写。irq_restore恢复的是进入前的使能情况，不能无条件开中断；这些约定服务于当前单核内核，不等价于多核同步已经完成。

<!-- PAGE -->

## A12. p2-task2：同key复用及获取失败后阻塞

{{todo:F2:kernel/locking/lock.c:36}}

42行继续要求获取mutex。初始化函数返回锁下标；获取函数在成功或未来被移交所有权后才继续返回。

{{code:P2:kernel/locking/lock.c:30-66}}

**为什么不能一律分配新锁：** A、B用相同key是为了竞争同一个对象，重复初始化必须返回已有下标。没有空槽时返回−1，调用者应检查。

**为什么这里是if而不是抢锁while：** 获取失败后do_block让出CPU，释放者之后会把owner直接交给当前等待者。该任务恢复时检查owner就是自己，因此不再用一轮自旋与后来者竞争。

**检验：** 持锁任务在临界区yield，让同key的另一任务确实走到do_block。若双方使用了不同槽位，两者都能打印“获取成功”，却完全没有实现共同互斥。

<!-- PAGE -->

## A13. p2-task2：释放时移交owner，唤醒不等于立刻运行

{{todo:F2:kernel/locking/lock.c:47}}

先对应锁对象的三个状态维度，再看释放函数：

{{code:P2:include/os/lock.h:45-52}}

{{code:P2:kernel/locking/lock.c:67-81}}

下面的测试安排能逼出竞争路径：

{{code:P2:test/validation/mutex1.c:6-16}}

**关键顺序：** 有等待者时先设owner，再do_unblock，底层status仍为LOCKED；没有等待者才清owner并真正解锁。否则新到达者可能抢在刚唤醒的B之前拿走锁。

**检验：** 手画A持锁、B阻塞、A释放、C到达、B恢复的五步，核对C不能偷走已移交给B的锁。释放者不是owner、重复获取等情况在本实现中触发断言；它不是支持递归的锁。

<!-- PAGE -->

## A14. p2-task1/3：用户封装与内核系统调用分派

{{todo:F2:tiny_libc/syscall.c:11}}

原框架还为各sys_*接口留下两类TODO：早期阶段经call_jmptab，阶段3/4经invoke_syscall。实现如下。

{{code:P2:tiny_libc/syscall.c:6-25,34-41}}

内核处理器对应 {{ref:F2:kernel/syscall/syscall.c:7}} 的TODO：

{{code:P2:kernel/syscall/syscall.c:3-14}}

**输入/输出：** 调用号放a7，参数放a0—a4，结果通过保存帧的a0再恢复到用户a0。`+r(a0)`说明它既是输入又是输出，memory约束阻止跨系统调用错误重排相关内存访问。

其余封装同样按接口传参：cursor传x/y，mutex传key或id，sleep传秒数；get_timebase/get_tick需返回结果。只写ecall却没放正确调用号，会落入错误服务；只调用内核函数指针，则没有完成U态受控入口。

<!-- PAGE -->

## A15. p2-task3：SAVE_CONTEXT完整宏（上半）

{{todo:F2:arch/riscv/kernel/entry.S:6}}

这是完整SAVE_CONTEXT宏的前半，下一页连续给出后半。硬件不会替这段代码保存全部GPR和选择本内核的栈。

{{code:P2:arch/riscv/kernel/entry.S:8-45}}

**先读前九行：** sscratch中的PCB被换进tp；原t0先放到PCB临时槽。根据SPP判断来源：来自U态时保存用户sp并取得kernel_sp，来自S态时沿用S栈；再减288字节分配异常帧。

**再读成组sd：** 每个寄存器都有固定槽位，偏移必须与regs_context_t、regs.h一致。用户可能在任意一条指令被时钟打断，所以这层不能只保存callee-saved寄存器。

**检验：** 分别设想U态ecall和S态idle被中断，确认不会把两种来源的栈混用。原t0、用户tp、原sp还未在本页全部恢复到最终槽位，必须继续读下一页。

<!-- PAGE -->

## A16. p2-task3：SAVE_CONTEXT后半及C处理入口

{{todo:F2:arch/riscv/kernel/entry.S:18}}

本页接上SAVE_CONTEXT，同时对应72、75、80行的“保存现场、安排返回、调用interrupt_helper”TODO。

{{code:P2:arch/riscv/kernel/entry.S:46-68,171-178}}

**关键还原：** 46—47行把原t0放进异常帧；48—50行把原用户tp从sscratch转存到帧，并重新让sscratch指向PCB。SPP为S时，原sp是建立帧前的栈地址；来自U时，原sp从PCB的user_sp取出。

**CSR与参数：** sepc决定之后从哪继续，stval/scause用于异常分派与诊断。a0传帧指针，a1传stval，a2传scause。不要在保存前覆盖这些原用户寄存器。

框架注释提出把ret_from_exception安排成返回去向；当前实现使用call之后显式跳转到ret_from_exception，达到相同控制流目标。理解返回链的含义，比机械照搬一句“把地址写入ra”更重要。

**检验：** 即便用户tp不是PCB，也必须保留它并在返回时恢复；中途sscratch约定若未恢复，下次异常就可能取错PCB。

<!-- PAGE -->

## A17. p2-task3：恢复现场与sret

{{todo:F2:arch/riscv/kernel/entry.S:23}}

66行还要求在ret_from_exception中使用宏并返回sepc。下面完整列出恢复宏和返回入口。

{{code:P2:arch/riscv/kernel/entry.S:70-109,167-170}}

**顺序不能随意换：** CSR先从当前异常帧恢复；利用仍有效的内核tp更新kernel_sp/sscratch，再恢复各GPR；原用户tp和sp最后恢复，避免过早失去PCB或当前帧的访问基址。

**检验：** 返回用户态靠sret解释sstatus/sepc，不是普通ret。ecall的sepc已在系统调用处理器加4；时钟路径不加4。恢复错误的a0会丢失返回值，恢复错误的sstatus会改变返回权限或中断使能。

<!-- PAGE -->

## A18. p2-task3：sleep等待的是绝对截止tick

{{todo:F2:kernel/sched/sched.c:41}}

同模块调度器26行及time.c第36行要求检查睡眠队列并唤醒到期者。三个函数联合完成该协议。

{{code:P2:kernel/sched/sched.c:39-49}}

{{code:P2:kernel/sched/time.c:8-14,34-44}}

**输入/输出：** sleep的参数是秒，rdtime返回tick，所以要乘time_base。seconds=0退化为yield；正值写绝对截止时刻，再用do_block进入sleep_queue，不是在原地忙等。

**遍历约束：** 先保留next，再可能do_unblock当前节点；一次扫描处理所有到期者。无排序保证时不能只看队首。阶段3由调度及pid0轮询检查，阶段4由定时器引发的调度反复检查。

**检验：** 让两个任务同刻到期，确认都变READY；让所有用户任务一起sleep，确认pid0仍能推动检查。把秒直接加到tick上，会导致睡眠时间远小于请求值。

<!-- PAGE -->

## A19. p2-task3/4：异常分派、时钟和入口安装

{{todo:F2:kernel/irq/irq.c:15}}

原框架还要求填好两张表、安装stvec、处理timer。完成版对应如下。

{{code:P2:kernel/irq/irq.c:15-46}}

{{code:P2:arch/riscv/kernel/trap.S:3-11}}

**三处关键：** scause最高位先区分中断和同步异常；所有未实现表项有默认错误处理器；时钟处理先重设下一次timer，再刷新和调度，不能只触发第一次。

**关于开中断的TODO：** 框架trap.S第8行要求实现全局使能，但当前版本把生效时机与主初始化、初始异常帧、idle结合安排。不能在表和队列尚未就绪时仅为了“填上这行”就打开中断。

**检验：** 非法原因落到handle_other；未知系统调用由syscall处理器返回错误；无yield计算仍能被轮转，才说明时钟抢占实际发生。TIMER_INTERVAL是tick，不是固定毫秒数。

<!-- PAGE -->

## A20. 两类服务表：TODO里相同的“初始化表”不代表同一件事

{{todo:F2:init/main.c:45}}

同文件89行是完整系统调用表的TODO。当前A-Core用两个函数分别安排早期跳转表和阶段3/4系统调用表。

{{code:P2:init/main.c:92-110,173-186}}

**输入/输出：** 第一张表存放固定内存位置上的函数指针，由call_jmptab间接调用；第二张表是内核syscall数组，只有ecall、异常保存和分派之后才访问。表项索引必须和两端头文件中的编号一致。

`k_*`包装把各服务统一成接收五个long参数、返回long的调用形状；写屏幕、yield等无有意义返回值的服务也显式返回0。指针检查在k_write中完成，表里存一个地址本身并不会校验用户参数。

**检验：** 对照sys_yield在两个阶段实际走的分支；再追一次sys_write的a7编号，核对syscall表对应k_write。两张表初始化互换后即使能编译，运行时也会调错服务。

框架README中的TODO需要你说明自己的构建、实现范围与验证；它属于项目文档任务。P3退格、p0汇编预实验不在本次A-Core任务范围内，仍在完整TODO清单中保留并标记。
