# 第一次：从打开 GitHub 到补完第一关

**现在的主线从网页第7关 PCB 开始。** 环境开好后，直接按 [Project 2 手把手实验](../project2/README.md) 补 C/汇编并逐阶段验收。下文的六关属于基础路线，仍保留给需要字符串、页分配等预习的同学；不需要先完成它们才能进入新主线。

## 1. 打开正确的环境

在 `zxymao/Chatgpt` 仓库首页，点击绿色 **Code → Codespaces → Create codespace on main**。不用在学校的 SSH:oslab 中执行这份教程，也不用把它复制进学校提交仓库。

如果已经有旧 Codespace，先保存已有工作、拉取本次提交，再通过命令面板（Ctrl+Shift+P）执行 **Codespaces: Rebuild Container**。只有在确实需要更新容器时才重建；不要丢弃未提交修改。

初始化会检查 RISC-V GCC/QEMU，并实际启动练习内核做一次基本检查。它还保留原来的课程 A-Core 安装流程。等创建日志结束、出现终端提示符再继续。

## 2. Linux 终端和自己的内核是两层

在 Codespaces 的 Linux 终端里输入：

```bash
cd os-lab
make doctor
make run
```

先出现 OpenSBI 的固件信息，然后应看到：

```text
[TinyRV boot OK]
You are running your own freestanding kernel. Type help.
tinyrv>
```

现在输入 `info` 并回车，再输入 `help`。这是你自己的内核处理串口输入，不是 Linux，也没有 U-Boot 的 `=>` 提示符。**这里不输入 `make` 或 `loadbootd`。**

输入 `quit` 返回 Linux 终端；如果内核写错而卡住，用 Ctrl+A，再 X 退出 QEMU。修改源码以后要退出并重新 `make run`；已经启动的虚拟机不会自动加载新代码。

## 3. 先看参考版的目标

在 Linux 终端运行：

```bash
make run MODE=reference
```

在 `tinyrv>` 中逐条输入：

```text
echo hello from my OS
mem
threads
user
preempt
sleep
quit
```

重点观察：`threads` 的轮转顺序、`user` 的 U→S 系统调用输出，以及 `preempt` 中三个线程都能完成。之后回到练习版：`make run`。参考文件从未替换你的练习文件。

## 4. 真正动手：第一关

在 VS Code 左侧打开 `os-lab/exercises/01_strings.c`。

先处理 `lab_strlen()`：

1. 输入 `s` 是指向字符串第一个字节的地址。
2. 定义一个从 0 开始的 `size_t` 计数变量。
3. 只要当前字节不是 `\0` 就推进计数。
4. 返回计数，不包含结束符。

再处理 `lab_streq()`：

1. 比较两串当前位置的字符。
2. 相同且未结束时，两个指针同时向后移动。
3. 退出循环后，检查两串是否在相同位置结束。
4. 相等返回 1，不等返回 0；`"a"` 和 `"ab"` 不相等。

这里没有宿主系统的 libc。不要直接调用 Linux 的 `strlen()` 或 `strcmp()`；本关就是让你实现最小版本。基础串口函数 `puts_os()` 已经给出，可以用它观察执行路径。

保存文件，然后在 Linux 终端执行：

```bash
make check LAB=1
```

正确时看到 `PASS: mode=student, lab=1`。失败时查看 `build/student/check-1.log` 中的 `[detail]`：它会指出空串、前缀或长度等具体问题。**超时、PANIC、FAIL 都不算通过。**

遇到问题时，把这三样发给我：关卡号、你改过的函数、完整报错或日志。我会先解释失败原因，再带你改这一关；不会直接用参考版覆盖你的文件。

## 5. 每一关都用同一个节奏

```text
读目标 → 找函数 → 写出伪代码 → 实现 → 保存 → make check LAB=N
       → 观察 QEMU 行为 → 用自己的话解释 → git commit 保存进度
```

提交第一关时只选择对应练习文件：

```bash
# 回到仓库根目录后执行
git status --short
git add os-lab/exercises/01_strings.c
git diff --cached
git commit -m "Complete TinyRV lab 1 strings"
git push origin HEAD
```

如果还有其他人的改动或无关文件，分别处理；不要为了完成实验把整个工作区一并提交。接下来打开 [LESSONS.md](LESSONS.md) 做第二关。

## 常见卡点

- `command not found`：执行 `make doctor`；Codespaces 中确认已重建新容器。在你自己的 Debian/Ubuntu 主机上，可通过发行版包管理器安装 `gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu qemu-system-misc opensbi make python3 gdb-multiarch`。
- `bool` 或旧式函数声明报错：本实验 Makefile 已显式使用 GNU C11；检查是否误运行了课程 A-Core 的 Makefile。
- QEMU 找不到 BIOS：确认已安装 `opensbi`。必要时显式传入 `BIOS=/实际路径/fw_dynamic.bin`。不要关闭下载校验来解决工具链问题。
- 编译成功但某关 FAIL：编译只说明语法和链接正确，不说明算法正确；按 `[detail]` 找到失败行为。
- `make check` 一开始就失败：默认检查全部六关。初始只应通过 `make boot-check`；每完成一关再检查该关。
- 第五关 FAIL：先确认第三关已完成；抢占演示也需要有效的轮转选择器。
- 看到六关全过但练习文件仍有 TODO：检查是否使用了 `MODE=reference`，然后重新执行 `make check MODE=student`。
