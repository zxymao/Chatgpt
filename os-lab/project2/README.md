# Project 2 主线：亲手实现调度、阻塞锁、系统调用与抢占

起步版六关只留下了几个 C 函数，把汇编入口和大部分调度器预先写好了。这个目录把真正的机制重新留给你实现：**PCB、就绪队列、上下文切换、阻塞/唤醒、锁、异常现场、系统调用、睡眠队列、定时抢占**。它仍是独立教学内核，不是老师的提交工程。

浏览器 [喵核工坊](../game/README.md) 的第 7～24 关用于推演这些机制；这里是另一条实际的 C/汇编实现和 QEMU 验收路径。网页不会编译 C、修改你的文件或自动认定内核通过。

## 先运行目标，再动手

在 GitHub Codespaces 的 Linux 终端，从仓库根目录执行：

```bash
cd os-lab/project2
make check MODE=reference STAGE=4  # 显式选择完整答案，观察真实验收
make check MODE=student STAGE=1   # 检查你的代码；初始应报告 TODO 并失败
```

`STAGE=1..4` 累积检查前置任务。`MODE=student` 是默认模式，只编译 `exercises/`；`MODE=reference` 只编译 `reference/`，不会复制或覆盖练习。编译产物分别在 `../build/project2-模式-阶段/`。

这是自动演示内核：启动后运行测试并退出 QEMU，**不会出现 `tinyrv>` 或 U-Boot 提示符**。详细串口输出在对应目录的 `qemu.log`；只看见编译成功并不算通过，必须出现对应 `[PASS P2 taskN]` 和 `[PROJECT2 CHECK PASS]`，且 QEMU 正常退出。无限循环或没有启用定时器会超时失败。

## 网页 18 关如何落到代码

| 网页关卡 | 你要理解和实现的内容 | 真实练习位置 |
| --- | --- | --- |
| 7 建立 PCB | 独立 context、初始 ra/sp、16 字节栈对齐 | `exercises/task1.c:p2_init_pcb` |
| 8 保存上下文 | ra/sp/s0～s11，不能丢失旧值 | `exercises/context.S` 保存部分 |
| 9 恢复上下文 | 载入新栈、返回地址；tp 指向当前 PCB | `exercises/context.S` 恢复部分 |
| 10 就绪队列 | FIFO、唯一入队、空队列 | `exercises/task1.c:p2_enqueue/p2_dequeue` |
| 11 协作调度 | RUNNING→READY→RUNNING，不能复活阻塞者 | `exercises/task1.c:p2_schedule` |
| 12 阻塞 | 改状态、等待队列、让出 CPU | `exercises/task2.c:p2_block` |
| 13 唤醒 | 等待队头→就绪队尾，唤醒不等于立即运行 | `exercises/task2.c:p2_unblock` |
| 14 获取锁 | 唯一 owner，竞争失败阻塞，临界区原子性 | `exercises/task2.c:p2_mutex_init/acquire` |
| 15 释放锁 | 验证 owner，FIFO 直接移交所有权 | `exercises/task2.c:p2_mutex_release` |
| 16 异常原因 | scause 最高位；timer 与 U-mode ecall | `exercises/trap.S` 保存 scause；阅读提供的 `trap_handler` |
| 17 保存异常现场 | 所有 GPR、CSR，先保存临时寄存器 | `exercises/trap.S` 入口部分 |
| 18 ecall ABI | a7 调用号、a0 开始的参数、a0 返回值 | `exercises/task3.c:p2_dispatch`；阅读 `../arch/user.S` |
| 19 分发与参数检查 | WRITE/TIME、错误码、保存的 a0、sepc+4 | `exercises/task3.c:p2_handle_ecall` |
| 20 返回用户态 | 正确恢复现场、SPP、SPIE、sscratch、sret | `exercises/trap.S` 返回部分 |
| 21 阻塞睡眠 | 绝对 deadline，睡眠期间离开 CPU | `exercises/task4.c:p2_sleep` |
| 22 唤醒全部到期者 | 安全遍历，等于截止时刻也唤醒 | `exercises/task4.c:p2_wake_expired` |
| 23 时钟与时间片 | SBI 定时器、STIE/SIE、再次设时 | `exercises/task4.c:p2_timer_start/p2_on_timer` |
| 24 综合抢占 | CPU-bound 线程没有 yield 也能交替执行 | `exercises/task4.c:p2_on_timer` 与真实线程测试 |

网页保留老师 Task3 的睡眠概念分组；**本独立内核的睡眠实现位于 task4.c，与硬件时钟一起在 STAGE=4 动态验收**。课程 Task3 可以在协作调度时扫描睡眠队列，两者触发方式有区别。网页第23关演示“多个 tick 一个时间片”的可配置策略；此 C 内核采用每个 tick 一个时间片。

## Task 1：先把上下文和调度器接通

从网页第7关开始，不用先做六关热身。每完成一个模型，立刻补对应真实函数，不要等24关做完再回头写 C。

1. 读 `include/p2.h`，画出 `p2_pcb`、`context` 与两个队列。PID 是数组下标；真实 `tp` 放 PCB 指针，网页为方便观察使用 PID。
2. 在 `p2_init_pcb` 中清空 PCB，填写 pid 和 READY，初始 ra=任务入口、sp=栈顶向下对齐。`context.s[12]` 是 s0～s11，初值为0。完成函数后删掉它末尾的 TODO panic。
3. 写 FIFO 入队/出队。入队检查 PID、容量、重复项；出队从头取，空队列返回 -1。课程使用链表，这里用最多三个元素的数组，保持相同队列不变量。
4. 补 `context.S`。调用时 a0 指向旧 context，a1 指向新 context；偏移 ra=0、sp=8、s0=16、s11=104。先存旧值再加载新值。例如保存 ra 是 `sd ra, 0(a0)`，其余按布局补齐；最后 `ret` 使用恢复后的 ra。
5. 写 `p2_schedule`：旧任务仅在 RUNNING 时才改 READY 并入队；取新队头、改 RUNNING，调用已提供的 `p2_switch_to(next)`。没有人就传 -1，回到 host/idle。该函数负责更新 current/tp、选择两份 context 并调用你写的汇编，不替你实现调度策略。
6. 执行 `make check STAGE=1`。必须得到轨迹 `012012012`，而且 s0～s11 的不同哨兵值在每次 yield 后仍正确。只是打印出三个任务名字不够。

验收时解释：为什么第一次进入任务用 ra 而不是 sepc？为什么调度切换只存 callee-saved，而异常入口要存全部寄存器？当前栈保存在哪个 PCB 中？

## Task 2：拿不到饭碗时真的阻塞

1. 先完成网页12、13关，补 `p2_block/p2_unblock`。阻塞要改 PCB 状态再切换；唤醒只进入 READY，不能直接修改 current。
2. 初始化锁 owner=-1、等待队列为空。获取空闲锁直接成为 owner；锁忙时进等待队列并切走，不写忙等循环。这个锁不支持递归获取。
3. 将“检查 owner→改状态→挂等待队列”放进 `irq_save/irq_restore` 保护区。这里只保证单核的局部中断原子性，不是 SMP 锁。
4. 释放先验证调用者，再把 owner 直接交给最早等待者；没有等待者则 owner=-1。直接移交策略下，被阻塞的 acquire 恢复后已经持锁，不要再把自己阻塞一次。
5. 执行 `make check STAGE=2`。框架会在持锁的临界区中故意 yield；别人应被阻塞，互斥不被破坏，获取顺序应为 `012012`，结束后无锁或队列泄漏。

验收时解释：阻塞进程的内核栈仍然存在吗？唤醒与运行有何差别？owner 提前设为等待者，是否意味着它已经占用 CPU？

## Task 3：从真实 U 态 ecall，再 sret 回去

1. 阅读给出的 `../arch/boot.S` 和 `../arch/user.S`：前者已安装 stvec；后者是寄存器传参和首次进入 U 态的测试程序。它们是平台/测试脚手架，不是本轮要补的答案。
2. 完成网页16～20关，再补 `trap.S`。sscratch=0 表示 S 态；执行 U 代码时 sscratch 存专用 trap 栈顶。先取到内核栈，预留288字节，保存全部通用寄存器及4个CSR，再把 frame 指针传给提供的 `trap_handler`。
3. 布局在题目注释中：x[i] 偏移8*i，sstatus=256、sepc=264、stval=272、scause=280。**先保存 t0，再拿它读 CSR**。S 态中断的原 sp 和 U 态原 sp 获取路径不同。
4. 补分发与返回值：WRITE 调用给定的 `sys_write_checked` 做区间检查；TIME 读取硬件时钟；未知调用 -38。`p2_handle_ecall` 从保存的 x17/x10/x11 读参数，返回值写回 x10，sepc 前进4字节且只前进一次。
5. 按返回目标设置 sscratch，恢复 CSR 与全部寄存器，最后恢复 sp 并 `sret`。不要用普通 ret 代替。通用返回入口还要支持 S 态中断，不能无条件清 SPP；网页第20关仅单独练习 U 返回情形。
6. `make check STAGE=3` 实际验证 U→S→U、合法写入、坏指针、未知调用、时间值及临时/保存寄存器恢复。SYS_EXIT 的单用户演示返回点由框架提供，不是完整进程退出。

验收时解释：ecall 的参数在进入 C 后从哪里取？为何 sepc+4？SPP/SPIE 的含义是什么？用户指针检查为何不等于地址空间隔离？

## Task 4：真正的时钟抢占与睡眠

1. 完成网页21、22关，补 `p2_sleep/p2_wake_expired`。睡眠保存 `ticks+duration`，进独立睡眠队列后调度。扫描要叫醒所有到期者，而不是只取一个；不要求队列按 deadline 排序。
2. 网页23关对应定时器初始化：设置未来的 SBI deadline，再使能 sie.STIE 和 sstatus.SIE。硬件周期在此平台是100Hz；已有平台函数负责向 OpenSBI 发出 TIME 请求。
3. 在 `p2_on_timer` 中重新设时、累加 tick、扫描到期者并调度。**异步中断不能修改 sepc**；被打断线程应从原位置继续。
4. `make check STAGE=4` 先检查相等时刻、同时到期、未排序队列，然后运行三个不含 yield 的计算线程。必须证明所有任务都在首个任务结束前启动，避免把串行执行误认为抢占。
5. 最后还有一个真实 sleep 线程与两个计算线程的组合：sleep 必须确实阻塞、不能提前返回，并能在其他线程运行时被时钟叫醒。网页24关的时间线只是它的确定性算法模型。

## 与学校工程和自己的 OS

两套代码可以逐函数对照，见 [课程映射](../docs/COURSE_MAP.md)。本目录使用 OpenSBI、0x80200000 和通用 QEMU virt；学校工程用自己的 BIOS/U-Boot 与地址布局，不应整目录覆盖。这里没有课程 jmptable 简易系统调用阶段，课程的那一阶段仍需在学校代码完成。

当前仍是单核、无分页：三个 S 态线程共享地址空间；U 态样例一次运行一个程序。下一步才是多 U 进程、每进程 trapframe/内核栈、Sv39 页表与独立地址空间，之后再增加文件系统。不要将线程调度测试称为完成了全套进程隔离。

保存自己的修改时只提交源码；构建目录已被忽略。GitHub Actions 的 Project2 reference job 检查教材答案；手动运行 workflow 并选择 project2_stage 才检查你提交的 `exercises/`。参考版通过不会改变你的练习进度。
