# 与学校 A-Core 的对应关系

保留已有 `projects/Project2/Project2-Acore.tar.gz` 及 `scripts/acore.py`。TinyRV 的源码直接放在 GitHub，便于逐行修改；课程包仍可用原来的命令独立运行。两个工程地址布局和固件接口不同，迁移的是思想与算法，不是机械覆盖文件。

| 学校 A-Core 中的位置 | TinyRV 对应位置 | 如何借助已有代码学习 |
| --- | --- | --- |
| bootblock、head.S、课程 U-Boot | `arch/boot.S`、`linker.ld`、OpenSBI | 都要建立栈并进入 C；TinyRV 由固件直接加载 ELF，不做课程镜像磁盘引导 |
| `include/os/sched.h` 的 PCB | `include/os.h` 的 task/context | 先看身份、状态、栈指针；TinyRV 没有完整进程资源结构 |
| `init_pcb_stack` | `kernel/scheduler.c` 的初始化循环 | 给新线程构造 ra/sp；用户态程序首次进入另见 `arch/user.S` |
| `entry.S: switch_to` | `arch/switch.S: context_switch` | 比较 ra/sp/s0..s11 的保存顺序与 112 字节结构 |
| `sched.c: do_scheduler` | `lab_choose_next`＋`thread_yield` | 先实现数组轮转，理解后再改成课程链表队列 |
| `mm.c: allocKernelPage` | `lab_page_alloc/free` | 页对齐、清零、耗尽、释放校验；这里仅管理固定页池 |
| `trap.S: setup_exception` | `arch/boot.S` 设置 stvec | 理解异常入口地址的安装；不能直接搬课程 BIOS 地址 |
| `SAVE_CONTEXT/RESTORE_CONTEXT` | `arch/trap.S` | 这里也保存 32 个 GPR 槽位和 4 个 CSR，共 288 字节；内核入口的 sscratch 约定不同 |
| `invoke_syscall` | `arch/user.S` 的 ecall 调用点 | 先读汇编寄存器传参，再自行封装为 C 内联汇编 API |
| `handle_syscall` | `lab_syscall`＋`trap_handler` | 调用号检查、参数检查、a0 返回值、ecall 的 sepc+4 |
| `bios_set_timer` | `kernel/platform.c: set_timer` | 课程经 BIOS 跳转表；TinyRV 经 SBI TIME 扩展进入 M 模式固件 |
| Task4 时钟抢占 | `scheduler_tick`＋`trap_handler` | 先看 S 线程抢占，再扩展为每个 U 任务独立 trapframe/内核栈 |
| Task2 锁与阻塞队列 | 后续扩展目标 | TinyRV 起步版没有实现通用阻塞互斥锁；可在理解调度后迁入算法并新增测试 |
| 课程 `do_sleep/check_sleeping` | 简单 `sleep_ticks` 演示 | 起步版的命令行等待 tick，不是每个进程独立的睡眠队列 |

## 新增 Project 2 主线：这些部分现在由你亲手实现

上表描述原六关起步版。新增 [`project2/`](../project2/README.md) 是单独编译的内核练习，覆盖此前被提前给出或留作扩展的机制：

| 学校 Task | 独立内核练习入口 | 网页推演 | 验收 |
| --- | --- | --- | --- |
| 1 `init_pcb/switch_to/do_scheduler` | `project2/exercises/task1.c` 与 `context.S` | 7～11 | 真实线程轮转、独立栈、s0～s11哨兵、tp=当前PCB |
| 2 `do_block/do_unblock/do_mutex_*` | `project2/exercises/task2.c` | 12～15 | 持锁时主动切换、实际阻塞与FIFO交接 |
| 3 `SAVE/RESTORE_CONTEXT/handle_syscall` | `project2/exercises/trap.S` 与 `task3.c` | 16～20 | 真正U→S→U、ecall参数与错误值、sret |
| 3睡眠基础、4时钟抢占 | `project2/exercises/task4.c` | 21～24 | 每线程睡眠队列、全部到期者唤醒、无yield抢占 |

对应关系是机制与不变量，不是相同接口。课程采用链表队列及 BIOS 跳转表；新内核使用小型FIFO数组、OpenSBI，省略 jmptable 过渡阶段。睡眠概念在网页归入课程Task3；这个独立内核在 STAGE=4 用硬件时钟统一动态验证睡眠与抢占。

## 建议的阅读方法

一次只比一个函数。先写出输入、输出和必须保持的不变量，再读已有实现：

- 调度：只选择 READY；一个任务不能既运行又重复在就绪队列中。
- 锁：持有者唯一；阻塞任务从就绪集合移除；唤醒先进入 READY。
- 系统调用：U 程序给出的地址不能直接相信；所有返回路径要恢复正确现场。
- 中断：同步 ecall 跳过一条指令；异步时钟应继续被打断的位置。

不要将课程的 `0x50200000/0x52000000`、BIOS 跳转表或 DASIC 设置直接复制到 TinyRV。它的运行前提是 OpenSBI＋QEMU virt 的 `0x80200000` 入口。课程验收继续在 SSH:oslab 的课程环境完成。

## 六关之后如何往自己的 OS 扩展

先完成新增 Project 2 主线，亲手写阻塞锁、就绪/等待队列和每线程睡眠；对应测试已提供。之后再扩展为多个 U 进程，并为每个进程建立独立地址空间。这样每次失败都能对应到一个新概念。
