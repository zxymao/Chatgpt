# Project 2：关键步骤与逐句讲解

- [彩色 PDF](./Project2-关键步骤与逐句讲解.pdf)
- [同内容 HTML](./Project2-关键步骤与逐句讲解.html)：单文件、带目录，可搜索、离线阅读。

按当前 `Project2-Acore` 的 Task 1—4 组织，而不是按所有文本差异展开。共20个关键步骤、49段连续原代码、844个代码行次（840个去重源码行）、464条解释，涉及22个P1/P2源文件。

每个步骤依次给出目标、相对P1/前一步的变化、输入输出与条件、完整函数/宏/逻辑块、原行号逐句解释、执行推演、现象与代码依据。重复寄存器指令按规则分组，原始指令全部列出；不把带省略号的伪代码冒充完整实现。`+`来自实际 `Project1-to-Project2.diff` 中的新增行，文件来源另区分课程框架与完成实现。

阅读主线：PCB及两种帧 → 链表 → 分栈建任务 → 首次启动 → 调度和switch_to → 主动yield → 原子操作与互斥阻塞 → ecall及异常现场 → 内核分发与sret → sleep → 时钟抢占和idle。最后补充构建/装载前提、输出指针边界与验收现象。

本书不展开所有格式调整、普通格式化库或P1节布局；Task5、完整地址空间隔离、多核、动态退出不是本次已实现能力。原应用源码没有修改。

## 来源与校验

正文直接从上级 `Project2-Acore.tar.gz` 与仓库中的 `projects/Project1/Project1-current.tar.gz` 读取；压缩包SHA-256固定核对。`diff-check.json`验证80个文件补丁、86个hunk的旧/新内容与两份归档一致。`coverage.json`逐段检查所选非空行恰好被解释一次，`source-manifest.json`与`steps.json`保存来源和讲解数据。

覆盖统计针对“本书选取的关键块”，不是宣称整个工程每一行都已讲解。

## 本次重新运行

`validation/results.json`和运行器日志记录本次结果：镜像10项、四阶段通用QEMU运行、默认六课程任务组合、单probe idle唤醒，运行器均返回0。压缩串口日志在`validation/*-serial.log.gz`，解压后的摘要记录在JSON中。

这些检查在临时副本中重定位地址，使用独立测试BIOS；真正执行当前内核的上下文切换、异常、系统调用、队列、锁和定时器逻辑。客体内核持续运行，运行器在观察时限后重建VT100屏幕并判断标记；超时本身不代表通过。课程QEMU/U-Boot、真实块设备、loadbootd/DASIC、Pynq板端仍未执行。

两份本地解压工程中的归档原文件也逐一核对，保持字节一致。测试只增加ignored构建产物。

## 重建讲义

当前云环境已提供Python/Pygments/PyMuPDF、Node/Playwright、Chromium及中文字体：

```bash
cd /workspace/Chatgpt/projects/Project2/关键步骤逐句讲解
python3 build_book.py
node render_pdf.cjs
python3 finalize_pdf.py
```

`finalize_pdf.py`规范化书签，检查可提取中文/代码、替代字、异常空白页和纸张外文字，输出`pdf-quality.json`。

## 重跑功能检查

```bash
cd /workspace/Chatgpt
. /workspace/.cloud-setup/env.sh
python3 scripts/acore.py test
python3 .local/Project2-Acore/tools/host_qemu_smoke.py \
  --stage 4 --tasks probe1 --seconds 6 --log /tmp/project2-idle.log
```

通用QEMU适配器由仓库已有脚本提供，运行前应已完成A-Core源码归档的校验解压。课程环境的实际启动命令及各阶段现象见PDF最后一章。
