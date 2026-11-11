# Project3 S-Core：逐项改动与作用

本文对照本次对话中的 Project2-Acore 底稿、已解决冲突的 P2＋P3 合并底稿，以及最终 S-Core 参考实现。最终版本包含 GNU C11 编译兼容性修复。路径均相对于课程仓库根目录。

代码来源分为：P2 已有基础、老师 P3 框架、合并时的接口适配、本次新增或改写的实现。末尾的全量源文件清单给出了每个变化文件的来源和作用。你在 SSH 上额外做的手工改动，应再结合当地的 git diff 查看。

本次系统行为的主要变化是：P2 启动时创建配置中的所有任务；P3 默认先创建 shell，之后由命令动态创建、等待、终止进程，并提供多轮屏障同步。

## 1. Makefile：选择程序、接口和编译标准

| 改动 | 作用 |
|---|---|
| PROJECT_IDX 从 2 改为 3 | 搜索并构建 test/test_project3 下的课程程序。 |
| 默认 TASKS 改为 shell waitpid ready_to_exit wait_locks barrier test_barrier | 把交互 shell、进程测试和屏障测试打入镜像；编号按列表从 0 开始。 |
| VALID_TASKS 包含 P3 程序和新增验证程序 | 保留原有任务名校验，让所选 P3 程序可以被构建。 |
| vpath 加入 test 和 test/test_project3 | 分别找到 test/shell.c 和 P3 测试源文件。 |
| 全局 CFLAGS 加 -DS_CORE | 内核和用户程序都选择按程序 ID、最多三个整数参数的 exec 接口。 |
| 保留 LAB_STAGE=4 | 继续使用 P2 的 U 态、ecall、时钟抢占；它和 P3 的 S_CORE 宏控制不同事情。 |
| 目标编译和主机 createimage 编译均加 -std=gnu11 | 固定 C 语言规则，解决新 GCC 默认 C23 导致的 bool typedef、空参数函数指针兼容错误。 |
| 新增 make list-tasks | 打印实际打包程序的 ID，避免把程序 ID 与运行时 PID 混用。 |

P2 的链接地址、每程序 64KiB 槽位、镜像元数据格式和 QEMU 启动参数继续沿用。make run 启动的是课程 U-Boot；用户通过 loadboot 进入实验内核，再在实验 shell 中执行 ps/exec。

## 2. include/os/sched.h：扩展 PCB

| 字段或接口 | 变化和作用 |
|---|---|
| kernel_stack_base | 新增。保存内核栈这一页的低地址，PCB 再利用时复用该页。 |
| wait_list | 新增。以这个 PCB 为目标执行 waitpid 的进程，挂在这个队列中。 |
| used | 新增。标识 PCB 槽位是否仍被占用，区分“已退出但当前栈还在使用”和“可重新分配”。 |
| task_id | 新增。保存镜像里的程序 ID，用来获取程序名、入口及合法字符串地址范围。 |
| barrier_idx | 新增。记录当前进程正在等待哪个屏障；不等待时为 -1，供退出/kill 清理使用。 |
| do_exec/do_exit/do_kill/do_waitpid/do_process_show/do_getpid | 补入进程管理的声明。 |
| init_process_table/init_pcb_stack | 声明公共初始化函数，使开机初始化和运行时 exec 共用相同规则。 |

保留原来的 kernel_sp、user_sp、trap_t0、user_stack_base、list、pid、status、光标及唤醒时间字段。TASK_EXITED 状态在这份 P2 底稿中已经存在，本次开始在完整退出流程中使用它。

PCB 的前几个字段与异常汇编有固定偏移：kernel_sp 在 0，user_sp 在 8，trap_t0 在 16。合并时同时保留 trap_t0 与新 kernel_stack_base，避免选择一侧冲突内容后破坏原汇编。

尤其要区分：list 是进程自己排队用的节点，同一时间挂在就绪、睡眠、锁、屏障或其他进程的 wait_list 中之一；wait_list 是一个队列头，收集正在等待“我”退出的其他进程。

## 3. kernel/sched/sched.c：进程管理主体

### 3.1 init_process_table：初始化进程表

新增集中初始化：清零 PCB 表，初始化就绪队列、睡眠队列、每个 PCB 的 list/wait_list；空槽设为未使用并清空程序/屏障索引；初始化 PID0 的 idle；设置 current_running 与 sscratch；把下一个 PID 设为 1。

作用是让动态 exec 有明确的空闲槽和队列状态，替代只适合“开机创建固定一组进程”的初始化方式。

### 3.2 init_pcb_stack：从 init/main.c 提取并扩展

P2 已有初始异常帧和切换帧的布置。本次把它变为公共函数，放到调度模块，并新增 argc、arg0、arg1、arg2 参数。

| 初始现场 | 设置与作用 |
|---|---|
| regs->regs[2] | 写入用户栈顶，即用户 sp。 |
| regs->regs[10..13] | 分别设置 a0=argc、a1=arg0、a2=arg1、a3=arg2，让子程序 main 收到参数。 |
| regs->sepc | 设置程序入口；异常返回时从这里开始执行。 |
| regs->sstatus | 默认阶段保留 SPP=0、SPIE=1 的设置，sret 后进入 U 态。 |
| sw->regs[0] | 初始 ra 指向 ret_from_exception，接上已有的异常返回汇编。 |
| sw->regs[1] 与 task->kernel_sp | 指向切换帧，供第一次 switch_to 恢复。 |
| task->user_sp | 保存用户栈初始位置。 |

两个现场结构体仍是 P2 的 288 字节异常帧和 112 字节切换帧。这里是在已分配的栈页内布置现场，不是调用 sw 函数；sw 是一个结构体指针。

### 3.3 do_exec：动态创建进程

新增完整创建路径：

1. 检查程序 ID、argc（0～3）及 PID 上限。
2. 清理已切走的退出槽位，查找未使用 PCB。
3. 根据程序 ID 找到 tasks[id]；需要装载时复用原来的 load_task_img。
4. 如果同程序仍有活实例，则复用已装入的入口，避免再次从磁盘装载覆盖其映像数据。
5. 第一次使用该 PCB 时，各分配一页内核栈、用户栈；后续复用该槽时保留两页栈的基址。
6. 重置 PCB，填写程序 ID、PID、队列、初始现场和参数，状态设为 READY，加入 ready_queue。
7. 返回新 PID；非法参数或没有槽位时返回 -1。

本课程 exec 的语义是创建新进程，shell 本身继续存在。同一程序可以有多个 PID。

映像仍使用课程固定地址的共享模型；每个实例有自己的 PCB 和栈。跳过重复装载并不等于实现了每进程私有全局变量或独立地址空间；用户 crt0 仍按原规则清零 BSS。

### 3.4 find_process：按 PID 查进程

新增内部查找函数，遍历 used 的 PCB，找到指定 PID。kill 和 waitpid 共用，避免把 PID 当作数组下标。

### 3.5 finish_process：统一清理出口

新增供 exit 与 kill 共用的清理函数：取消该进程的屏障等待计数；从原所在队列摘除；设置 EXITED；释放它持有的所有互斥锁；唤醒其 wait_list 上的等待者。

READY 进程可能在就绪队列，BLOCKED 进程可能在睡眠、锁、屏障或其他进程的等待队列。先摘除 list 节点，避免已退出进程留在队列中被再次唤醒。

如果清理的是其他进程，可以把槽位设为未使用；如果退出的是当前进程，则保留占用标记，直到它从内核栈上切换出去。

### 3.6 do_exit：主动退出

新增：关闭本地中断，清理当前普通进程，执行调度，转去运行其他进程。已经退出的任务不应再从 do_exit 返回。

### 3.7 do_kill：终止指定进程

新增：查找目标，拒绝 PID0、无效或已退出的目标，调用统一清理；杀死自己时立即调度出去。清理锁时使用目标 PID，而不是执行 kill 的 shell 的 PID。

### 3.8 do_waitpid：等待目标退出

新增：目标仍在运行或阻塞时，把调用者挂到目标的 wait_list，并通过已有 do_block 让出 CPU；目标结束时由 finish_process 唤醒。

本实现对已结束的有效 PID 立即返回，对 PID0、自身、未来或非法 PID 返回 -1。PID 从 1 单调递增且不复用，所以旧 PID 在槽位复用后仍表示原来那次进程；没有加入 POSIX 的父子权限和退出状态机制。

### 3.9 reap_exited 与 do_scheduler：安全复用

新增 reap_exited，扫描已经 EXITED 且不是 current_running 的 PCB，把 used 清零。在调度开始和 exec 找空槽前调用。

这是延迟复用当前内核栈的关键：当前进程退出时仍在自己的内核栈执行清理代码，必须切换到其他进程以后再允许新进程使用这页栈。

do_scheduler 的轮转逻辑沿用 P2；本次增加 reap_exited 调用。只有 RUNNING 的普通进程重新进入就绪队列，阻塞或退出进程不会重新入队。

### 3.10 do_getpid 与 do_process_show

- do_getpid：新增，返回 current_running->pid。
- do_process_show：新增，打印 PID、状态、程序名，显示 idle 和仍存活的用户进程，过滤已退出槽位。

do_sleep、do_block、do_unblock 的行为沿用 P2。P3 增加了它们的使用场景：等待退出、等待屏障、退出后唤醒等待者。do_unblock 只把 BLOCKED 改为 READY 并加入就绪队列，真正执行仍需调度器选中。

## 4. init/main.c：接入开机和系统调用

### 4.1 init_pcb：默认只启动 shell

P2 在开机循环创建镜像内全部程序。P3 改成初始化进程表、查找 shell、通过 do_exec 创建 PID1 后返回。其他程序由 shell 的 exec 创建。

为了继续使用 P2 小型验证镜像，若所选 TASKS 中没有 shell，仍会创建这些配置中的程序。默认 P3 镜像走的是只启动 shell 的路径。

### 4.2 k_write：按 task_id 校验输出地址

P2 通过 PID=i+1 推断程序映像槽。动态 exec 后，同一程序的第二次实例 PID 已变，这个关系失效。

现在通过 current_running->task_id 查 tasks[id]，再校验字符串完整落在该映像槽或进程用户栈内。作用是让重复创建、PID 增大后的程序仍能输出自己的字符串，同时保留原有地址检查。

### 4.3 新增统一签名的处理函数并注册

| 用户包装 | 系统调用号 | init/main.c 处理函数 | 最终动作 |
|---|---|---|---|
| sys_exec | 0 | k_exec | do_exec，创建进程。 |
| sys_exit | 1 | k_exit | do_exit，退出当前进程。 |
| sys_kill | 3 | k_kill | do_kill，终止目标。 |
| sys_waitpid | 4 | k_waitpid | do_waitpid，等待退出。 |
| sys_ps | 5 | k_ps | do_process_show，打印进程表。 |
| sys_getpid | 6 | k_getpid | do_getpid，返回当前 PID。 |
| sys_getchar | 21 | k_getchar | 复用已有 port_read_ch，从 BIOS 读串口字符。 |
| sys_clear | 24 | k_clear | screen_clear，清空屏幕。 |
| sys_barrier_init | 44 | k_barrier_init | 创建或获取屏障。 |
| sys_barrier_wait | 45 | k_barrier_wait | 等待本轮到齐。 |
| sys_barrier_destroy | 46 | k_barrier_destroy | 销毁屏障。 |

k_getchar 处理函数在 P2 底稿已存在，这次把读取接口注册到用户系统调用。其余表中新的 k_ 适配函数统一为五个 long 参数、返回 long，便于原有系统调用分发器调用。

### 4.4 初始化顺序及提示信息

main 中在 init_locks 后新增 init_barriers；保留系统调用表、异常、屏幕和时钟初始化；启动提示改为 P3 S-Core，以便判断启动的是哪一版镜像。

原有 ABI 大小和 PCB 偏移的编译期断言继续保留，帮助发现结构体与汇编不一致。

## 5. arch/riscv/crt0/crt0.S：main 返回后退出

保留用户 BSS 清零及初始寄存器参数。在 call main 后新增 call sys_exit。

作用：正常 return 0 的程序也能走退出清理、唤醒 waitpid 并释放 PCB 占用。P2 的程序返回后只是永久 yield，无法完成这个生命周期。后面的 yield 循环作为异常返回的兜底保留。

## 6. 用户调用声明、编号与跳转表

### 6.1 tiny_libc/syscall.c

保留 P2 的 invoke_syscall：a7 放编号，a0～a4 放参数，执行 ecall，a0 接收返回值。增加上表的用户包装，S-Core 的 sys_exec 原样传递 id、argc 和三个整数参数。

老师框架中的 condition、semaphore、mailbox 用户包装也一并保留。包装函数只是进入内核的入口；当前内核只登记已实现的 S-Core 功能，其他包装存在不代表对应功能已经完成。

### 6.2 tiny_libc/include/unistd.h

补 pid_t 定义及进程、输入、清屏、屏障等声明；通过 S_CORE 条件选择整数参数 exec 接口，补全 sys_clear 声明，使 shell 能在编译时找到对应函数。

### 6.3 arch/riscv/include/asm/unistd.h 与 tiny_libc/include/syscall.h

合入 P3 调用号，补全 CLEAR，保持已实现调用在内核和用户侧使用同一编号。其他档位预留编号并不表示已登记处理函数。

### 6.4 include/os/kernel.h 与 tiny_libc/include/kernel.h

合并冲突时保留 P2 跳转表既有编号，把 P3 枚举追加在 REFLUSH 后，两侧顺序一致，避免旧程序跳到错误函数。

默认 LAB_STAGE=4 的 P3 程序通过 ecall 使用新功能；本次没有把所有新增跳转表槽位都改为直接函数调用。

## 7. test/shell.c：交互式用户程序

这是从老师 shell 模板补齐的用户态程序。它通过 sys_ 接口请求服务，进程创建和队列操作在内核完成。

| 函数或分支 | 实现内容与作用 |
|---|---|
| main 输入循环 | 读串口字符；无输入时 sys_yield；回显可打印字符；Tab 转空格。 |
| 行缓冲 | 128 字节，最多存 127 个输入字符并留终止符；限制参数单词数。 |
| 回车/换行 | 支持 CR、LF、CRLF，避免一条命令被重复提交。 |
| 退格分支 | 仅在已有输入时删除一个字符，防止删掉提示符；同时输出退格让驱动擦除。 |
| split | 将输入按空格或 Tab 切成命令及参数，跳过多余空白。 |
| number | 解析正负号、十进制、十六进制整数，检查非法字符和溢出。 |
| banner | 把命令区放在第 21 行开始显示，与测试程序的上方输出区分开。 |
| command 的 ps 分支 | 请求内核打印真实进程表。 |
| clear 分支 | 清屏并重画命令区标题。 |
| exec 分支 | 解析程序 ID 和最多三个整数参数，调用 sys_exec；失败显示提示。 |
| 前台处理 | 无 & 时调用 sys_waitpid，子进程结束后才显示下一条提示符。 |
| 后台处理 | 末尾有 & 时立即打印新 PID 并继续接收命令。 |
| kill 分支 | 解析目标 PID，请求内核终止，显示成功或失败。 |
| help、错误提示 | 显示用法，对未知命令、参数过多和非法数字作出反馈。 |

程序 ID 由 TASKS 决定，PID 是一次运行的进程号。例如 exec 1 选择 waitpid 程序；重复执行会得到不同的 PID。整数参数数目不包含程序 ID，也不采用 POSIX argv 的计数方式。

## 8. drivers/screen.c：退格与清屏

- screen_write_ch：填入 P3 退格实现。识别退格及 DEL，光标左移；行首可退到上一行最后一列；屏幕原点不再前退；把对应 new_screen 字符改为空格。
- screen_clear：发送真实终端清屏转义序列，同时把 new_screen 和 old_screen 置为空格，复位当前进程光标，再刷新，避免内部缓冲与终端实际内容不同步。

80×50 的缓冲尺寸、光标边界处理和差量刷新机制来自 P2。驱动负责擦除字符，shell 负责决定哪些输入可以删。固定屏幕尺寸也解释了终端窗口太小时可能发生的显示重叠。

## 9. include/os/lock.h：屏障结构和清理接口

原有 mutex 的 used、owner、阻塞队列继续保留。增加 mutex_release_all 声明，以及屏障结构：

| 字段 | 作用 |
|---|---|
| used | 该屏障槽是否已分配。 |
| key | 多个进程用同一个 key 获取同一屏障。 |
| goal | 一轮需要到达的人数。 |
| arrived | 本轮已经到达且尚计入的参与者数。 |
| generation | 记录初始化、完成或销毁时的轮次变化；当前实际放行由 arrived 和等待队列完成。 |
| wait_queue | 保存已到达、等待其他参与者的进程。 |

增加 init/wait/destroy 和 barrier_cancel_wait 声明，屏障表为 16 项。condition、semaphore、mailbox 的老师预留结构和声明仍留在头文件中。

## 10. kernel/locking/lock.c：退出释放锁与可复用屏障

### 10.1 互斥锁的改动

| 函数 | 改动与作用 |
|---|---|
| release_owned_lock | 从原释放函数中提取共有逻辑。有等待者时直接移交 owner 并唤醒第一位，锁保持 LOCKED；无人等待才真正解锁。 |
| do_mutex_lock_release | 继续检查当前进程是否持有该锁，再调用共有释放逻辑。 |
| mutex_release_all(owner) | 新增，扫描锁表，释放指定 PID 持有的所有锁，供 exit/kill 清理使用。 |

同 key 复用、竞争失败后阻塞、FIFO 所有权移交等基础逻辑已经在 P2 实现。本次重点是让“当前进程主动释放”和“终止其他进程时释放”共用正确流程。

### 10.2 屏障的新增函数

| 函数 | 作用 |
|---|---|
| init_barriers | 初始化空闲标记、计数、轮次和等待队列。 |
| do_barrier_init(key, goal) | 校验人数；同 key、同 goal 返回同一屏障；同 key 不同 goal 拒绝；新 key 使用空槽。 |
| wake_barrier_waiters | 清除等待者的 barrier_idx，并逐个 do_unblock，放回就绪队列。 |
| do_barrier_wait(id) | 到达数加一；未到齐就 do_block；最后一个到达时清零本轮计数、推进轮次、唤醒全部等待者。 |
| do_barrier_destroy(id) | 标记槽位可释放、清空计数，并取消和唤醒尚在等待的进程。 |
| barrier_cancel_wait(task) | 被终止的进程若正在屏障队列中，将其从到达计数中扣除并清除记录；随后由统一清理摘除节点。 |

三人屏障的前两人阻塞，第三人到达后放行全体；计数重置使下一轮可以继续使用。同一个屏障因此能运行课程的十轮测试。

这些队列和计数操作保存并关闭本地中断，面向单核。被 kill 的参与者不会让 goal 自动减少；应用可补足参与者或销毁屏障。销毁时放行是本实现的取消约定。

## 11. 默认六个用户程序与测试源码来源

| 程序 ID | 文件 | 来源与作用 |
|---|---|---|
| 0 | test/shell.c | 补齐实现的交互 shell。 |
| 1 | test/test_project3/waitpid.c | 老师测试；本次只把 rte_id 改为 2、wl_id 改为 3。创建两个辅助进程，分别等待它们退出。 |
| 2 | test/test_project3/ready_to_exit.c | 老师测试原样保留。获取两把锁，循环输出，正常结束前释放；也可作为 kill 的目标。 |
| 3 | test/test_project3/wait_locks.c | 老师测试原样保留。分别等待、获取并释放两把锁，检查阻塞与唤醒。 |
| 4 | test/test_project3/barrier.c | 老师测试；本次只把 tb_id 改为 5。创建三人屏障和三个子进程，等待其结束后销毁屏障。 |
| 5 | test/test_project3/test_barrier.c | 老师测试原样保留。每轮等待屏障，随后随机睡眠 1～3 秒，共循环十轮（0～9）。 |

测试程序已经写好了“应当发生什么”，本次内核实现负责让这些行为真正成立。若修改 TASKS 顺序，必须同步修改三个程序 ID 占位值。

## 12. 新增的独立验证程序与运行工具

| 文件 | 本次编写或修改的内容与用途 |
|---|---|
| test/validation/p3_shared.h | 定义测试模式、通信字段、锁和屏障编号。它是头文件，不是独立可执行程序。 |
| test/validation/p3_worker.c | 新增辅助用户程序：验证参数与动态 PID 下的输出；可持两把锁睡眠、等待两把锁、单纯睡眠或等待屏障。 |
| test/validation/p3_probe.c | 新增主验证程序：非法参数；40 次 exec/exit/wait；旧 PID 等待；kill 持锁进程后唤醒等待者；PCB 耗尽与复用；屏障销毁和等待者终止。 |
| tools/host_qemu_p3.py | 新增真实串口自动化运行脚本，临时重定位副本以适配通用 QEMU，输入 shell 命令、还原 ANSI 屏幕并核对输出；原课程源码地址不变。 |
| test/host-qemu/firmware.S | 在原 P2 测试 BIOS 中增加真实 UART 字符读取，使自动测试可以输入命令；它不是老师的 U-Boot。 |

新增两个验证用户程序默认不打入课程六程序镜像，由自动验证脚本额外选择。原 P2 的 tools/host_qemu_smoke.py 保留，用于确认抢占、寄存器、睡眠和锁逻辑继续工作。

## 13. 随老师框架导入的支持代码

### 13.1 BIOS、CPU 与 SMP 预留

- arch/riscv/bios/common.c：增加 send_ipi 的 BIOS 包装。
- arch/riscv/include/asm/biosdef.h：增加 BIOS_SEND_IPI 编号。
- arch/riscv/include/common.h：增加 send_ipi 声明。
- arch/riscv/include/csr.h：增加 CSR_MHARTID 定义。
- arch/riscv/kernel/smp.S：提供读取当前 hart ID 的汇编函数。
- include/os/smp.h：多核相关声明。
- kernel/smp/smp.c：老师的多核初始化、唤醒其他 hart、内核锁预留函数。

这些属于合并进来的课程扩展。默认 S-Core 不调用多核初始化，不能据此认定已实现多核或 CPU 亲和性。

### 13.2 用户库支持

| 文件 | 导入或扩展内容 |
|---|---|
| tiny_libc/atoi.c | 老师提供的 atoi/atol 转换函数；新 shell 使用自己的 number 解析器。 |
| tiny_libc/itoa.c | 整数转字符串。 |
| tiny_libc/rand.c | srand/rand，供屏障测试选择随机睡眠时间。 |
| tiny_libc/string.c | 增加 strrev，为 itoa 反转数字字符串。 |
| tiny_libc/include/string.h | 增加 strrev 声明。 |
| tiny_libc/include/stdlib.h | 转换函数与随机数声明。 |
| tiny_libc/include/stdint.h | 增加 size_t 类型。 |
| tiny_libc/include/stddef.h | 提供 NULL。 |
| tiny_libc/include/ctype.h | 字符分类支持。 |
| tiny_libc/include/mailbox.h | 邮箱测试消息头及校验、随机字符串辅助函数声明。 |
| tiny_libc/mailbox.c | 消息校验与随机字符串辅助实现。 |

邮箱的辅助库并不等于内核邮箱实现；S-Core 的内核没有登记邮箱、条件变量、信号量处理函数。

### 13.3 其他测试和压缩库

add/multicore、affinity/test_affinity、condition/producer/consumer、mbox_client/mbox_server 都来自老师框架，分别用于其他档位的多核计算、亲和性、条件变量和邮箱测试，未加入本次 S-Core 默认任务列表。

tools/deflate 下的压缩库、适配头和 example 也随框架导入，未接入本版本默认的 createimage 构建。当前 tools/createimage.c 仍是 P2 的平坦镜像打包实现，不能把导入压缩库等同于增加压缩镜像功能。

合并时老师还删除了 test/test_project2/fly1.c～fly5.c；这是上游目录调整，本次 S-Core 不依赖这些文件。

## 14. 辅助脚本、说明与打包文件

- oslab/merge_p3_score.py：为这次已知底稿编写的冲突处理脚本。核对底稿、备份被替换文件到 .git 下、合并兼容接口并暂存；保留当时的 screen.c 修改，不自动提交或推送。
- oslab/upload_p3.py：在本地电脑运行，使用 scp 把下载的压缩包传到 SSH 服务器主目录，可指定端口；不解压或修改服务器代码。
- README.md：改为 P3 的构建、程序编号、shell 使用说明。
- docs/P2-README-history.md：保留 P2 的历史说明。
- docs/P3-SCore-code.md 与 oslab/Project3-SCore-code.md：按顺序给出完整实现代码。
- docs/P3-VALIDATION.md：记录验证方式、结果、接口约定和边界。
- docs/p3-validation 与 docs/p3-gnu11-validation：编译日志、原始串口、还原屏幕、结果 JSON；它们是证据文件，不是内核逻辑。
- CHANGES-P3-SCORE.txt：相对合并底稿的文件清单。
- Project3-SCore-changes.tar.gz / changes.patch：相对已合并底稿的改动包和补丁。
- Project3-SCore-complete.tar.gz：可独立阅读的完整源码。
- Project3-SCore-gnu11.patch：给已经应用旧包的工程补 C 标准选项的小补丁。
- Project3-SCore-SHA256SUMS：核对下载文件内容。

## 15. 本次继续复用的 P2 基础

| 文件或函数 | 在 P3 中的用途 |
|---|---|
| arch/riscv/boot/bootblock.S | BIOS 读内核，向内核传任务数量和任务表偏移。冲突解决时保留已有实现。 |
| arch/riscv/kernel/head.S | 内核入口、BSS 清理和启动栈。 |
| arch/riscv/kernel/entry.S、trap.S | 保存/恢复现场、系统调用和中断入口、上下文切换。 |
| arch/riscv/include/asm/regs.h | 固定上下文和 PCB 的汇编偏移。 |
| kernel/irq/irq.c | 时钟中断与异常分发。 |
| kernel/syscall/syscall.c、include/sys/syscall.h | 继续按 a7 和 a0～a4 分发系统调用；新增功能通过注册表接入。 |
| kernel/loader/loader.c | 按名称从镜像读取程序；do_exec 用程序 ID 查表后复用它。 |
| kernel/mm/mm.c | 原来的页分配器；本次在 PCB 层复用栈页，没有编写通用 free。 |
| kernel/sched/time.c | 睡眠到期检查。 |
| include/os/list.h | 就绪、睡眠、锁、waitpid、屏障共用的链表操作。 |
| include/type.h | bool 等底层类型继续保留，用 GNU C11 保持兼容。 |
| tools/createimage.c、riscv.lds | 平坦镜像格式和链接布局继续沿用；仅主机编译选项补 GNU C11。 |

## 16. 与当前运行现象对应的完整路径

创建：shell 的 command → sys_exec → ecall → 已有异常入口与 handle_syscall → k_exec → do_exec → READY 队列 → do_scheduler/switch_to → ret_from_exception/sret → 用户 crt0 → main。

正常结束：用户 main 返回 → crt0 调用 sys_exit → k_exit/do_exit → finish_process → 释放锁、唤醒 waitpid → 调度其他任务 → 后续复用退出槽位和栈页。

终止：shell 的 kill → sys_kill → do_kill → 同一 finish_process 清理流程。

屏障：sys_barrier_wait → do_barrier_wait → 未到齐则 do_block；最后一人到齐后 wake_barrier_waiters → do_unblock → 等待调度继续执行。

主机验证已完成完整串口测试、三参与者十轮屏障、进程资源复用及 P2 回归；GNU C11 修复后重新做完整构建与 shell/进程回归。用户日志已经确认 GCC15 下编译成功、loadboot 进入课程内核，截图显示 ps、退出/锁测试及至少三轮屏障输出；这些截图尚不单独证明课程环境已完成全部十轮和所有 kill 路径。当前实现范围是单核 S-Core 的进程管理、shell 和屏障。

## 附录：相对 P2 的全部源文件变化

以下逐文件核对了新增、修改和删除；不把文档、构建产物或二进制框架归档混入源文件清单。“本次实现或合并适配”也包括为保留 P2 机制而调整的接口，不表示该文件所有原有内容都是新写的。

| 路径 | 变化 | 来源 | 作用 |
|---|---|---|---|
| Makefile | 修改 | 本次实现或合并适配 | P3 默认任务、搜索路径、S_CORE、GNU C11、验证任务与 list-tasks。 |
| arch/riscv/bios/common.c | 修改 | 老师框架原样合入 | 导入 send_ipi 的 BIOS 包装。 |
| arch/riscv/crt0/crt0.S | 修改 | 本次实现或合并适配 | main 返回后调用 sys_exit。 |
| arch/riscv/include/asm/biosdef.h | 修改 | 老师框架原样合入 | 导入 BIOS_SEND_IPI 编号。 |
| arch/riscv/include/asm/unistd.h | 修改 | 老师框架原样合入 | 内核侧新增 P3 系统调用号及 CLEAR。 |
| arch/riscv/include/common.h | 修改 | 老师框架原样合入 | 导入 send_ipi 声明。 |
| arch/riscv/include/csr.h | 修改 | 老师框架原样合入 | 导入 CSR_MHARTID 定义。 |
| arch/riscv/kernel/smp.S | 新增 | 老师框架原样合入 | 导入读取 hart ID 的汇编，默认单核路径不调用。 |
| drivers/screen.c | 修改 | 本次实现或合并适配 | 补退格，清屏同时同步终端与两份屏幕缓冲。 |
| include/os/kernel.h | 修改 | 本次实现或合并适配 | 保留 P2 跳转表编号并追加 P3 枚举。 |
| include/os/lock.h | 修改 | 本次实现或合并适配 | 屏障结构、屏障接口与按 owner 清理锁的接口。 |
| include/os/sched.h | 修改 | 本次实现或合并适配 | 新增栈基址、等待队列、槽位/程序/屏障标记和进程管理声明，保持汇编 ABI。 |
| include/os/smp.h | 新增 | 老师框架原样合入 | 导入多核接口预留声明。 |
| init/main.c | 修改 | 本次实现或合并适配 | 默认创建 shell、修正字符串校验、增加系统调用适配与注册、初始化屏障。 |
| kernel/locking/lock.c | 修改 | 本次实现或合并适配 | 重构锁释放，新增目标 PID 锁清理与可复用屏障。 |
| kernel/sched/sched.c | 修改 | 本次实现或合并适配 | 动态创建/终止/等待/显示进程、公共初始栈、槽位与栈复用。 |
| kernel/smp/smp.c | 新增 | 老师框架原样合入 | 老师的多核 TODO 框架，S-Core 未实现或启用。 |
| test/host-qemu/firmware.S | 修改 | 本次实现或合并适配 | 测试 BIOS 增加 UART 输入，用于真实串口自动化。 |
| test/shell.c | 新增 | 本次实现或合并适配 | 实现交互输入、命令解析、前后台 exec、ps/clear/kill/help。 |
| test/test_project2/fly1.c | 删除 | 上游删除 | 老师 Project3 合并时删除的旧测试文件；S-Core 不依赖。 |
| test/test_project2/fly2.c | 删除 | 上游删除 | 老师 Project3 合并时删除的旧测试文件；S-Core 不依赖。 |
| test/test_project2/fly3.c | 删除 | 上游删除 | 老师 Project3 合并时删除的旧测试文件；S-Core 不依赖。 |
| test/test_project2/fly4.c | 删除 | 上游删除 | 老师 Project3 合并时删除的旧测试文件；S-Core 不依赖。 |
| test/test_project2/fly5.c | 删除 | 上游删除 | 老师 Project3 合并时删除的旧测试文件；S-Core 不依赖。 |
| test/test_project3/add.c | 新增 | 老师框架原样合入 | 老师的多核测试计算子程序，不在 S-Core 默认任务中。 |
| test/test_project3/affinity.c | 新增 | 老师框架原样合入 | 老师的 CPU 亲和性测试入口，不在本次范围。 |
| test/test_project3/barrier.c | 新增 | 本次实现或合并适配 | 老师测试入口；填写 test_barrier 的程序 ID=5。 |
| test/test_project3/condition.c | 新增 | 老师框架原样合入 | 老师的条件变量测试入口，不在本次范围。 |
| test/test_project3/consumer.c | 新增 | 老师框架原样合入 | 老师的条件变量消费者测试，不在本次范围。 |
| test/test_project3/mbox_client.c | 新增 | 老师框架原样合入 | 老师的邮箱客户端测试，不在本次范围。 |
| test/test_project3/mbox_server.c | 新增 | 老师框架原样合入 | 老师的邮箱服务端测试，不在本次范围。 |
| test/test_project3/multicore.c | 新增 | 老师框架原样合入 | 老师的单/多核计算对照测试，不在本次范围。 |
| test/test_project3/producer.c | 新增 | 老师框架原样合入 | 老师的条件变量生产者测试，不在本次范围。 |
| test/test_project3/ready_to_exit.c | 新增 | 老师框架原样合入 | 老师测试原样保留；持两把锁循环输出，可正常返回或被 kill。 |
| test/test_project3/test_affinity.c | 新增 | 老师框架原样合入 | 老师的亲和性计算子程序，不在本次范围。 |
| test/test_project3/test_barrier.c | 新增 | 老师框架原样合入 | 老师测试原样保留；三进程分别十轮屏障与随机睡眠。 |
| test/test_project3/wait_locks.c | 新增 | 老师框架原样合入 | 老师测试原样保留；等待、获取并释放两把互斥锁。 |
| test/test_project3/waitpid.c | 新增 | 本次实现或合并适配 | 老师测试入口；填写 ready_to_exit ID=2、wait_locks ID=3。 |
| test/validation/p3_probe.c | 新增 | 本次实现或合并适配 | 新增生命周期、资源复用、kill 锁清理与屏障取消验证程序。 |
| test/validation/p3_shared.h | 新增 | 本次实现或合并适配 | 新增测试通信结构及模式定义。 |
| test/validation/p3_worker.c | 新增 | 本次实现或合并适配 | 新增验证辅助用户程序，执行返回、持锁睡眠、等待锁、睡眠和屏障模式。 |
| tiny_libc/atoi.c | 新增 | 老师框架原样合入 | 导入老师 atoi/atol，shell 用独立 number 解析器。 |
| tiny_libc/include/ctype.h | 新增 | 老师框架原样合入 | 导入字符分类支持。 |
| tiny_libc/include/kernel.h | 修改 | 本次实现或合并适配 | 用户侧跳转表枚举保持旧 ABI 并追加 P3 项。 |
| tiny_libc/include/mailbox.h | 新增 | 老师框架原样合入 | 导入邮箱消息头及辅助函数声明，非内核邮箱实现。 |
| tiny_libc/include/stddef.h | 新增 | 老师框架原样合入 | 导入 NULL 定义。 |
| tiny_libc/include/stdint.h | 修改 | 老师框架原样合入 | 导入 size_t 类型。 |
| tiny_libc/include/stdlib.h | 新增 | 老师框架原样合入 | 导入转换、随机数函数声明。 |
| tiny_libc/include/string.h | 修改 | 老师框架原样合入 | 导入 strrev 声明。 |
| tiny_libc/include/syscall.h | 修改 | 老师框架原样合入 | 用户侧 P3 编号与 CLEAR，保留其他档位预留。 |
| tiny_libc/include/unistd.h | 修改 | 本次实现或合并适配 | 补用户进程、输入、清屏和屏障接口，适配 S-Core exec。 |
| tiny_libc/itoa.c | 新增 | 老师框架原样合入 | 导入整数转字符串函数。 |
| tiny_libc/mailbox.c | 新增 | 老师框架原样合入 | 导入校验和及随机字符串辅助函数，不启用内核邮箱。 |
| tiny_libc/rand.c | 新增 | 老师框架原样合入 | 导入 srand/rand，供屏障测试等使用。 |
| tiny_libc/string.c | 修改 | 老师框架原样合入 | 导入 strrev，为数字转字符串提供支持。 |
| tiny_libc/syscall.c | 修改 | 本次实现或合并适配 | 保留真实 ecall 包装，补进程、输入、清屏、屏障及框架预留用户接口。 |
| tools/deflate/common_defs.h | 新增 | 老师框架原样合入 | 老师框架附带，压缩库公共定义。 当前默认构建未启用。 |
| tools/deflate/example/Makefile | 新增 | 老师框架原样合入 | 老师框架附带，压缩/解压示例的构建规则。 当前默认构建未启用。 |
| tools/deflate/example/test.c | 新增 | 老师框架原样合入 | 老师框架附带，库的独立压缩/解压示例。 当前默认构建未启用。 |
| tools/deflate/lib/bt_matchfinder.h | 新增 | 老师框架原样合入 | 老师框架附带，二叉树匹配查找器。 当前默认构建未启用。 |
| tools/deflate/lib/decompress_template.h | 新增 | 老师框架原样合入 | 老师框架附带，解压实现模板。 当前默认构建未启用。 |
| tools/deflate/lib/deflate_compress.c | 新增 | 老师框架原样合入 | 老师框架附带，DEFLATE 压缩实现。 当前默认构建未启用。 |
| tools/deflate/lib/deflate_compress.h | 新增 | 老师框架原样合入 | 老师框架附带，压缩内部接口。 当前默认构建未启用。 |
| tools/deflate/lib/deflate_constants.h | 新增 | 老师框架原样合入 | 老师框架附带，DEFLATE 格式常量。 当前默认构建未启用。 |
| tools/deflate/lib/deflate_decompress.c | 新增 | 老师框架原样合入 | 老师框架附带，DEFLATE 解压实现。 当前默认构建未启用。 |
| tools/deflate/lib/hc_matchfinder.h | 新增 | 老师框架原样合入 | 老师框架附带，哈希链匹配查找器。 当前默认构建未启用。 |
| tools/deflate/lib/ht_matchfinder.h | 新增 | 老师框架原样合入 | 老师框架附带，哈希表匹配查找器。 当前默认构建未启用。 |
| tools/deflate/lib/lib_common.h | 新增 | 老师框架原样合入 | 老师框架附带，库内部公共支持。 当前默认构建未启用。 |
| tools/deflate/lib/matchfinder_common.h | 新增 | 老师框架原样合入 | 老师框架附带，匹配查找器公共支持。 当前默认构建未启用。 |
| tools/deflate/lib/utils.c | 新增 | 老师框架原样合入 | 老师框架附带，库工具和分配器等支持。 当前默认构建未启用。 |
| tools/deflate/libdeflate.h | 新增 | 老师框架原样合入 | 老师框架附带，库公共 API 头文件。 当前默认构建未启用。 |
| tools/deflate/stdbool.h | 新增 | 老师框架原样合入 | 老师框架附带，库配套布尔类型兼容头。 当前默认构建未启用。 |
| tools/deflate/stddef.h | 新增 | 老师框架原样合入 | 老师框架附带，库配套基础定义。 当前默认构建未启用。 |
| tools/deflate/tinylibdeflate.c | 新增 | 老师框架原样合入 | 老师框架附带，精简适配层实现。 当前默认构建未启用。 |
| tools/deflate/tinylibdeflate.h | 新增 | 老师框架原样合入 | 老师框架附带，精简适配层接口。 当前默认构建未启用。 |
| tools/deflate/type.h | 新增 | 老师框架原样合入 | 老师框架附带，库配套类型定义。 当前默认构建未启用。 |
| tools/host_qemu_p3.py | 新增 | 本次实现或合并适配 | 新增临时重定位及真实 UART 自动验证脚本。 |
