# Project 3（S-Core）

[彩色 PDF 讲义](./关键步骤逐句讲解/Project3-关键步骤与逐句讲解.pdf) · [离线 HTML](./关键步骤逐句讲解/Project3-关键步骤与逐句讲解.html) · [Markdown 正文](./关键步骤逐句讲解/Project3-关键步骤与逐句讲解.md)

沿用 Project1、Project2 的“完整代码 → 原行号逐句解释 → 执行推演 → 现象与依据”结构。本书按 16 个关键步骤讲解进程管理、shell、退出时的锁清理和可复用 barrier：46 段连续原代码、1,139 个代码行次、469 条解释，彩色 PDF 共 111 页。详见[讲义说明与重建方法](./关键步骤逐句讲解/README.md)。

讲解对象是仓库已有的 [Project3-SCore-complete.tar.gz](../../oslab/Project3-SCore-complete.tar.gz)，已包含 GNU11 编译兼容修复；对照 [Project2-Acore.tar.gz](../Project2/Project2-Acore.tar.gz)。没有修改这两份归档或其应用源码。

完整包 SHA-256：`b2c65f3c60162d92abe5abc479202e9d67c511ff55f9d8509a87855b107e4ba5`。

## 阅读主线

程序 ID / PID / PCB 槽位 → 两种初始帧与参数 → 动态 exec → 延迟回收与调度 → waitpid → exit/kill → 系统调用接线 → shell 输入与前后台 → main 返回 → 锁所有权移交 → barrier 的创建、重复等待、销毁与取消 → 构建及验收。

本包 `exec` 创建新进程，不替换当前进程；`S_CORE` 选择整数参数接口，默认用户程序仍在 U 态。固定地址共享映像没有页表隔离，独立 PCB/栈不等于私有全局变量。barrier 的 `generation` 当前只被更新，没有被等待逻辑读取比较。

## 本次验证

2026 年 11 月 17 日重新执行，四条运行命令均退出 0：原课程地址布局构建、10 个镜像用例、完整 P3 串口测试、P2 stage4 抢占回归。P3 场景包括三参与者各十轮屏障、40 次创建/退出、kill 持锁睡眠进程、PCB 容量恢复和屏障取消。结果及原始日志见 [validation/results.json](./关键步骤逐句讲解/validation/results.json)。

通用 QEMU 检查使用临时副本重定位与测试 BIOS；课程 QEMU、U-Boot、DASIC/loadbootd 和 Pynq 板端未执行，不把云端测试等同课程硬件验收。
