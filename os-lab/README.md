# TinyRV：亲手补全一个 RISC-V 教学操作系统

这是一个真实在 QEMU 中启动的 freestanding 内核，不是运行在 Linux 上的模拟调度程序。目标是让你读懂每一步、补全六个小模块，最后得到带串口命令行、页分配、线程调度、用户态系统调用和时钟的简易 OS。

**第一次使用请从 [START_HERE](docs/START_HERE.md) 开始。**

## 两套代码、两套产物

| 模式 | 参与编译的练习代码 | 输出目录 | 初始状态 |
| --- | --- | --- | --- |
| `student`（默认） | `exercises/*.c` | `build/student/` | 能启动、输入命令，六关 TODO 尚未实现 |
| `reference`（显式选择） | `reference/*.c` | `build/reference/` | 完成版，可运行六关演示和检查 |

`kernel/`、`arch/` 是两种模式共同使用的基础设施。参考模式不会复制、覆盖或暗中替代你的练习文件。`make check` 默认检查练习版，未完成时失败是正常状态；`make boot-check` 只验证基础启动。

```bash
cd os-lab
make doctor
make boot-check                  # 应通过：真实启动、help/info、正常退出
make run                         # 在 tinyrv> 输入 help、check 1、quit
make check LAB=1                 # 完成第一关后应通过
make run MODE=reference          # 看最终目标的实际效果
make check MODE=reference        # 参考版全部检查
```

## 六关路线

| 关卡 | 你补的文件 | 学习内容 | 实际检查 |
| --- | --- | --- | --- |
| 0 | 阅读 `arch/boot.S` 和链接脚本 | 从 OpenSBI 进入 S 模式内核、建立栈、清 BSS、串口 | 看见内核提示符并处理输入 |
| 1 | `exercises/01_strings.c` | 指针、字节、字符串结束符、无 libc 编程 | 空串、等串、不等串与前缀 |
| 2 | `exercises/02_pages.c` | 固定页池、分配/释放、边界检查、临界区 | 耗尽、复用、清零、非法释放和重复释放 |
| 3 | `exercises/03_scheduler.c` | READY 状态、轮转选择、独立栈、上下文切换 | 三个真实内核线程按 0→1→2 循环运行 |
| 4 | `exercises/04_syscall.c` | U/S 模式、ecall、参数、返回值、用户指针检查 | 真正进入 U 模式并完成 write/time/错误返回 |
| 5 | `exercises/05_timer.c` | SBI 定时器、时钟中断、wfi、抢占 | 多次 IRQ、延时唤醒、三个不主动 yield 的线程完成 |
| 6 | `exercises/06_shell.c` | 命令解析、复用已完成模块 | 命令边界、参数处理及端到端交互 |

[逐关提示与口头验收](docs/LESSONS.md) · [学校 A-Core 对照](docs/COURSE_MAP.md)

也可以先从 [喵核宠物工坊](game/README.md) 开始：浏览器里写算法、领养喂养宠物，再到对应的 C 关卡完成真实 QEMU 验收。[本次核验记录](docs/VERIFICATION.md) 区分参考版通过、练习版待完成与远程尚未验证的结果。

## 完成后的命令

内核中的 `help/info/check/quit` 从起点就有，以下命令在第六关完成后可用：

```text
echo hello       输出自己的文字
mem              分配一页，显示地址，再释放
threads          三个内核线程主动 yield 的轮转演示
user             U 模式程序通过 ecall 请求服务，然后退出演示
ticks            显示硬件时钟中断次数
sleep            等待 100 个 100 Hz 时钟 tick（约 1 秒）
preempt          三个没有主动 yield 的内核线程通过时钟抢占运行
```

## 设计边界

- 平台是 **RV64、QEMU virt、128 MiB RAM、单 hart、OpenSBI**。内核入口为 `0x80200000`，UART 为 `0x10000000`。时间基准使用该平台的 10 MHz 常量；移植其他平台要解析设备树并修改平台层。
- 页分配练习管理内核预留的 32 页物理页池，不是整个物理 RAM 管理器。尚未开启分页、虚拟地址空间、进程间内存隔离，也没有磁盘文件系统和网络。
- 三个调度演示任务是 **S 模式内核线程**，共享地址空间；U 模式演示一次运行一个小程序，并非多用户进程调度器。
- `SYS_EXIT` 是 U 模式演示框架的返回机制：恢复进入演示前的内核继续点。它不是可直接扩展为完整进程管理的通用 exit 实现。
- 中断入口代码已经给出，用它观察现场保存，再回头理解课程代码。指针边界检查只约束演示的 `SYS_WRITE`，不构成硬件内存保护。
- OpenSBI 是 M 模式固件；UART/定时器接口是平台层；我们编写的是 S 模式内核。它不使用学校的 U-Boot、课程 BIOS 或 DASIC，因此不能替代课程 `loadbootd`/Pynq 验收。

## 后续扩展

六关全过之后，每次只增加一个目标：

1. 把固定数组调度器改为 PCB＋就绪/阻塞队列，实现锁和睡眠队列。
2. 为多个 U 模式任务分别保存陷阱现场、内核栈和用户栈，再接入抢占调度。
3. 实现 Sv39 页表、独立地址空间、页故障处理与进程生命周期。
4. 接入 virtio-blk，建立只读文件系统，再设计文件描述符和 read/write。

每项都需要新的功能测试；本仓库没有把这些未来能力标成已完成。

## 自动测试和调试

GitHub 的 **Actions → Learning OS / QEMU** 在相关提交后检查“练习版启动”和“参考版六关”，日志作为 artifacts 提供。要检查你自己的某一关，在该页面点击 **Run workflow** 并选择关卡。参考版通过不代表练习版 TODO 已完成。

GDB 使用两个 Codespaces 终端：

```bash
# 终端 1：在 os-lab 中，启动后等待调试器
make debug
```

```bash
# 终端 2：同样在 os-lab 中
gdb-multiarch build/student/kernel.elf \
  -ex 'target remote localhost:1234' \
  -ex 'break kernel_main' -ex continue
```

GDB 中可用 `info registers`、`x/8gx $sp`、`break lab_choose_next`、`step`、`next`、`continue`。`make disasm` 生成带源码的反汇编。调试端口只在环境内部使用，不需要公开转发。

退出运行中的内核用 `quit`，或按 **Ctrl+A**，松开，再按 **X**。完成后停止 Codespace，保留需要的修改并提交；被忽略的构建日志不应作为源码提交。
