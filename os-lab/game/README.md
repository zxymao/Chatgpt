# 喵核宠物工坊：用代码经营一家 OS 宠物店

现在有 **6关选修热身＋18关 Project 2 主线**。新玩家从第7关 PCB 开始；原有六关、宠物和存档保留。主线按 OS 机制推进，不需要先刷简单字符串题。

![喵核宠物工坊：PCB、调度与真实内核练习](preview.png)

## 开始

打开本目录 `index.html`，或在 Codespaces 的仓库根目录运行：

```bash
python3 -m http.server 8000 --directory os-lab/game
```

通过 **Ports → 8000** 打开网页。支持离线使用；受管理浏览器若禁止 file://，使用 HTTP 或 Pages。

每关都给出输入、输出、不变量、逐步提示及口头验收问题。编写 JavaScript 函数后点击“运行 & 检查”，实际检查多个输入的返回值、队列/PCB变化、不能共享的寄存器数组和边界情况。死循环超过1.2秒会被终止，不会奖励饲料。

“OS状态观察台”展示**你的函数执行前后快照**，可切换测试场景；综合关有可点选的逐tick执行时间线。输出错了也可以看它究竟把谁放进了什么状态。它不是预设的正确通关动画。

## 主线对应 OS lab 的什么

| 课程任务 | 网页关卡 | 机制 | 真实练习 |
| --- | --- | --- | --- |
| Task 1 | 7～11 | PCB、保存/恢复寄存器、就绪队列、协作调度 | `../project2/exercises/task1.c`、`context.S` |
| Task 2 | 12～15 | 挂起/唤醒、阻塞锁、FIFO所有权移交 | `../project2/exercises/task2.c` |
| Task 3 | 16～22 | scause、完整现场、ecall ABI、参数、sret、睡眠条件 | `../project2/exercises/trap.S`、`task3.c`、`task4.c` |
| Task 4 | 23～24 | 硬件定时、时间片、无yield抢占综合 | `../project2/exercises/task4.c` |

**网页运行的是 JS 算法与状态模型，不是 C 编译器或 RISC-V 模拟器。** 每学会一个模型，立即补它指向的 C/汇编函数，再在 Codespaces 中用 QEMU 验收整组机制。完整步骤、每个函数的实现路线与课程差异见 [Project 2 手把手实验](../project2/README.md)。睡眠概念属于课程Task3，本独立内核将动态睡眠与硬件时钟统一在STAGE=4验收；没有把这一差异隐藏起来。

```bash
# 仓库根目录，明确区分你的练习与教材答案
make -C os-lab/project2 check MODE=student STAGE=1
make -C os-lab/project2 check MODE=reference STAGE=4
```

主线首次通过一关得8份饲料，重复通过得2份。通过11/15/22/24关分别解锁上下文边牧、锁锁浣熊、异常守门兔和抢占星龙；热身的6只宠物继续保留，共11位小伙伴。宠物可以领养、喂食和互动，不会离线挨饿或死亡。关卡都能打开预习；主线按顺序记录奖励进度，热身不做前置条件。

进度、宠物和草稿保存在当前浏览器，支持导入导出和旧存档升级。网页通过不代表你的真实内核已完成；两者独立验收。

## 开发和检查

```bash
cd os-lab/game
node build.mjs                   # 生成独立单文件 index.html
node build.mjs --check
node --test tests/engine.test.cjs # 无需 npm install
# 安装有 Playwright + Chromium 时
node tests/browser.cjs
```

`src/project2.js` 定义18关主线；`src/engine.js` 管理热身、行为检查、存档和经营；`src/app.js` 展示编辑器、状态轨迹和像素宠物店。测试包含24关正例、未完成代码、典型错误注入、旧存档迁移，以及实际浏览器全流程、手机布局与离线运行。测试答案只由测试进程加载，不被打包进网页。

## GitHub Pages

仓库的 **Deploy OS Quest to GitHub Pages** 工作流保留原复习游戏首页，并发布此游戏到：

<https://zxymao.github.io/Chatgpt/pet-kernel/>

以 Actions 部署结果及 **Settings → Pages** 为准。若看到“只有六关”的旧页面，请等部署完成后强制刷新；下载的旧HTML需要换成新文件，存档可以先导出再导入。
