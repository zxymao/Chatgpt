# 六关：按接口补全，不靠替换整个工程

默认修改 `exercises/`。`reference/` 是明确分开的答案，可以在独立尝试后逐函数对照，但不要让构建系统悄悄替你选择参考版。

## 第 0 关：读懂已经给出的启动链

阅读顺序：`linker.ld` → `arch/boot.S` → `kernel/platform.c` → `kernel/main.c`。

OpenSBI 在 M 模式启动，进入我们位于 `0x80200000` 的 S 模式 `_start`。启动代码设置 `sp`、清零 BSS、安装 `stvec`，然后调用 C 函数 `kernel_main()`。串口是内存映射设备，`putchar_os()` 轮询 UART 状态后写入一个字节。

动手：修改启动问候语，加上自己的 OS 名字，再运行 `make boot-check`。请保留 `[TinyRV boot OK]` 这个测试标记；修改其下一行即可。用 `make disasm` 查看启动汇编对应的地址。

解释给老师听：为什么不能先调用 C 函数再初始化栈？BSS 与 `.data` 有什么区别？OpenSBI 是内核吗？

## 第 1 关：字符串与内存中的字节

接口：`lab_strlen(s)`、`lab_streq(a,b)`，文件 `exercises/01_strings.c`。

先按 START_HERE 的步骤自己完成。约定输入是有效的、以 NUL 结束的字符串；这两个基础函数不负责验证任意地址。字符串长度按字节计，不是 Unicode 字符数量。

检查：`make check LAB=1`。空串、相等、不同、前缀不等必须全部正确。

解释：`size_t` 为什么适合保存长度？`s++` 改变的是指针还是原字符串？为什么不能只比较到短字符串结束就判相等？

## 第 2 关：分配与释放物理页

接口：`lab_page_alloc()`、`lab_page_free(page)`，文件 `exercises/02_pages.c`。

基础设施提供 `page_pool[32][4096]` 和 `page_used[32]`，页池以 4096 字节对齐。它是专门预留的物理内存池，尚未使用分页。

实现顺序：

1. 调用 `irq_save()` 记录并关闭本地中断。
2. 扫描空闲标记，找到一个未分配的页。
3. 先标记已使用，再将整页清零并返回页地址。
4. 每条返回路径都调用 `irq_restore(saved)`；耗尽返回 `NULL`。
5. 释放时先验证范围与对齐，再计算槽号，拒绝未分配页的重复释放。

不要在验证范围之前就拿任意指针去做数组下标；地址范围计算可使用 `uintptr_t`。清零是为了不让新使用者看到上一使用者的数据。当前是单核，中断屏蔽保护元数据，不提供跨核心互斥。

检查：`make check LAB=2` 会申请全部页、写入不同内容、验证耗尽与非法释放、释放一页并检查清零复用。

解释：页池为什么要对齐？页分配与 `malloc` 有何区别？保存旧中断状态比一律开中断好在哪里？

## 第 3 关：从选择器走到真实线程切换

接口：`lab_choose_next(tasks,current,count)`，文件 `exercises/03_scheduler.c`。

先只实现选择策略：从 current 的后一个槽位开始，循环查找 `TASK_READY`，最多检查 count 个槽位。`current=-1` 表示从 0 开始；没有就绪任务返回 -1。只有一个 READY 时可以再次选择它。

然后读 `kernel/scheduler.c`：它把旧任务从 RUNNING 变成 READY，调用你的选择器，为新任务设置 RUNNING，再调用 `context_switch()`。

`arch/switch.S` 保存 `ra/sp/s0..s11` 共 112 字节的上下文。每个任务有独立栈；切换时只是保存寄存器和换栈，不会复制整个栈。新任务的初始 `ra` 指向 `task_entry()`。当前宿主内核的上下文也会保存，任务全部 DONE 后可回到命令行。

检查：`make check LAB=3` 不只是检查函数返回值，还启动三个线程，验证实际切换后的输出顺序为 `0,1,2,0,1,2,0,1,2`，每个线程各执行三步。

解释：READY 和 RUNNING 为什么要分开？第一次启动为什么要人工构造现场？这里为什么保存 callee-saved，而中断入口保存更多寄存器？

## 第 4 关：真正跨越 U/S 特权级的系统调用

接口：`lab_syscall(number,arg0,arg1)`，文件 `exercises/04_syscall.c`。

先读 `arch/user.S` 中的 U 模式小程序，再读 `arch/trap.S`、`kernel/trap.c`。

```text
run_user 保存内核继续点 → sret 到 U 模式
    → U 程序设置 a7/a0/a1，执行 ecall
    → trap_entry 换栈、保存通用寄存器和 CSR
    → trap_handler 识别 scause=8
    → lab_syscall 分发服务，结果写回 a0
    → sepc 跳过 ecall，恢复现场，sret 回 U 模式
```

实现三个分支：SYS_WRITE 调用 `sys_write_checked`；SYS_TIME 返回 `read_time()`；未知调用返回 -38。不要把用户地址直接传给无限读字符串的函数。

`sys_write_checked` 只接受链接脚本中 `.user` 区域里的数据，并用 `size <= end-address` 防止长度越界。框架中的 SYS_EXIT 会回到预留的内核继续点；这是演示约定，不是返回到调用 exec 前的程序，也不是完整的进程销毁。

检查：`make check LAB=4` 会真的运行 U 程序，验证正常输出、非法用户地址返回 -14、非法调用号返回 -38，以及 time 服务。不是仅从 S 模式直接调用一个 C 函数。

解释：ecall 与普通 call 有何区别？硬件会自动保存全部寄存器和切换栈吗？为什么 syscall 给 sepc 加 4，中断却不能这样做？stvec、sepc、scause、sscratch 分别负责什么？

## 第 5 关：硬件时钟、睡眠与抢占

接口：`lab_timer_start()`，文件 `exercises/05_timer.c`。前置条件：第三关已通过。

按顺序完成：

1. 用 `set_timer(read_time()+TIMER_INTERVAL)` 设置下一次硬件事件。
2. 设置 `sie.STIE`，允许 S 模式时钟中断。
3. 设置 `sstatus.SIE`，允许 S 模式响应中断。
4. 返回 0。反复调用不应将 `ticks` 清零。

`set_timer` 通过 SBI TIME 扩展请求 M 模式固件操作硬件。`kernel/trap.c` 的 handler 每次先重新设定下一次事件、增加 tick，再调用 `scheduler_tick()`；抢占演示中会主动切换当前内核线程。

这里的 preempt 任务在等待 tick 推进的计算循环里没有 `yield` 和系统调用。若只启动一个任务而无法切换，其余任务无法及时完成；检查具有超时保护。异步现场由 `trap_entry` 的 288 字节帧保护，`context_switch` 则继续负责线程调用链的切换。

检查：`make check LAB=5` 会观察多个真实中断、执行 `wfi` 睡眠、验证第三关，然后运行无主动 yield 的三线程抢占。`make check` 的全部模式还会检查命令行里的 sleep。

解释：时钟中断与时间片结束有什么关系？为何中断处理后要重设定时器？关本地中断为何不等于停止 CPU？为什么此处还不是多个 U 进程的抢占调度？

## 第 6 关：把已有能力组成命令行

接口：`lab_parse_command(line,&argument)`，文件 `exercises/06_shell.c`。

跳过前导空格，找到完整命令词，再处理剩余参数。echo 接受后面的文本；其他命令只允许尾随空格。未知或空输入返回 CMD_UNKNOWN。不要修改只读输入串，也不要让 `memory` 被误认为 `mem`。

`kernel/main.c` 已经负责串口行编辑和命令执行。你的函数只负责将文字转换为命令枚举，并把 echo 的参数地址写入 `*argument`；这里用到了“指向指针的指针”。

检查：`make check LAB=6` 检查解析边界；**六关完成后执行 `make check MODE=student`**，它还会真正发送每个命令到你的内核并检查输出。

完成后可以改 `kernel_main()` 中的问候语，新增 `about` 或自己的命令；同时扩展测试，证明实际行为，而不只是加一行固定的 PASS 输出。
