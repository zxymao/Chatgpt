# Project 3：关键步骤与逐句讲解

- [彩色 PDF](./Project3-关键步骤与逐句讲解.pdf)：111 页、可检索、带页码与 153 个书签。
- [离线 HTML](./Project3-关键步骤与逐句讲解.html)：单文件，含目录、代码高亮及进程状态图。
- [Markdown 正文](./Project3-关键步骤与逐句讲解.md)：相同 16 步的代码与逐句解释，便于文本检索；全景图和详细验证表见 PDF / HTML。

延续前两本的讲解方式，聚焦 P3 S-Core 的 Task1 进程管理与 shell、Task2 barrier。每步说明目标、相对 P2 的变化、输入输出、不变量、连续完整代码块、原始行号解释、执行推演和可观察现象。

## 内容与来源

共 16 步、46 段连续原代码、1,139 个代码行次、469 条解释，涉及 18 个 P2/P3 源文件。所选非空行的解释覆盖检查全部通过。覆盖范围是本书选取的关键块，不是整个工程所有文件。

原文直接读取仓库中的 `oslab/Project3-SCore-complete.tar.gz` 和 `projects/Project2/Project2-Acore.tar.gz`，固定核对 SHA-256。`oslab/Project3-original.tar.gz` 只用于区分完成包与课程框架的同名文件关系，不据此推断每行作者。代码左侧 `+` 表示相对 P2 的新增或替换行。

- [source-manifest.json](./source-manifest.json)：归档和所选原文件的散列。
- [coverage.json](./coverage.json)：逐段行号、引用内容散列、解释覆盖统计。
- [steps.json](./steps.json)：全部步骤和人工编写的说明数据。
- [Project2-to-Project3-key-files.diff](./Project2-to-Project3-key-files.diff)：仅比较所选关键 P3 文件，不是全工程差异。
- [pdf-quality.json](./pdf-quality.json)：页数、散列、书签及文字完整性检查。

讲义明确区分程序 ID、运行 PID 和可复用 PCB 槽位；解释当前内核栈为什么必须切走后才可复用、waitpid 的历史 PID 语义、kill 的锁/队列/屏障清理，以及为什么 barrier 的 generation 不是当前代码实际执行的代数检查。

未实现的条件变量、信号量、邮箱、SMP 与地址空间隔离不作为已完成能力讲解；P2 已详解的完整异常与切换汇编不重复全篇展开。

## 本次功能验证

[validation/results.json](./validation/results.json) 汇总本次新运行的四个结果，全部退出 0：

1. 原课程地址布局交叉编译：默认六个程序，内核跨度 15,452 字节。
2. 镜像布局与错误处理测试：10 个用例通过。
3. 完整 P3 串口测试：8 组场景，包括三个参与者各十轮屏障、40 次 exec/exit、整数参数、动态 PID 输出、持两锁睡眠进程的 kill 清理、容量恢复与屏障取消。
4. P2 stage4 双 probe 回归：寄存器、异步抢占、睡眠和锁所有权移交。

串口与运行器日志均来自本次执行，未使用包内的历史验证结果冒充本次测试。运行器只在临时副本重定位地址，并使用测试 BIOS。课程专用 QEMU、U-Boot、DASIC/loadbootd 和板端仍未验证。

## 重建讲义

使用 Python 3、Pygments、PyMuPDF、Node、Playwright、`/usr/bin/chromium` 及 Noto CJK 字体；本次云环境已提供这些工具。构建不会修改归档或应用源码：

```bash
cd /workspace/Chatgpt/projects/Project3/关键步骤逐句讲解
python3 build_book.py
node render_pdf.cjs
python3 finalize_pdf.py
```

`build_book.py` 先校验来源及每段非空行的解释覆盖，再生成 HTML、Markdown 和记录文件。`finalize_pdf.py` 规范化书签并检查中文/代码可提取、替代字符、异常空白页、纸张外文字；代表性页面另做了视觉检查。

## 重跑功能验证

使用现有 checkout；每个云任务已有独立环境，不需要另建 worktree。已校验解压的 P3 副本位于被忽略的 `.local/Project3-SCore`。在实际 shell 激活工具后运行：

```bash
cd /workspace/Chatgpt
. /workspace/cloud-tools/env.sh
cd .local/Project3-SCore
make list-tasks CROSS_PREFIX=riscv64-linux-gnu-
make CROSS_PREFIX=riscv64-linux-gnu-
python3 tools/test_image.py build/createimage
python3 tools/host_qemu_p3.py --log-dir /tmp/p3-repeat
python3 tools/host_qemu_smoke.py --stage 4 --seconds 8 --log /tmp/p3-p2-repeat.log
```

若在其他机器解压，请先核对完整包散列，并使用独立目录，保留原有工程和学生改动。课程机的 `make run` 需要课程 QEMU 与 U-Boot；详细 shell 命令、实际 PID 的用法和验收边界见讲义末尾。
