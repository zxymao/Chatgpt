# Chatgpt
My place for codex

## 在浏览器运行 A-Core

已提供 GitHub Codespaces 环境，自动安装 RISC-V 编译器、QEMU 并解压构建项目。

1. 点击仓库页面的 **Code → Codespaces → Create codespace on main**，等待环境创建和初始化完成。
2. 在底部终端输入 `python3 scripts/acore.py run`，实时观察内核任务的运行输出。
3. 退出模拟器：按 **Ctrl+A**，松开后再按 **X**。

[详细操作、分阶段运行和自动测试说明](projects/Project2/CODESPACES.md)

## 操作系统复习游戏：内核远征

[内核远征 · 玩法与发布方法](OS-course/os-quest/README.md)是基于操作系统期中复习内容制作的回合制打怪游戏，包含 8 个章节和 128 道选择、判断、填空及流程代码题。通过答对题目获取经验、升级角色，并在错题本中巩固知识。新增流程专项，支持执行顺序排列、代码块填充，并兼容原有游戏进度。

现已加入 **2D 探索**：用方向键/WASD 或手机方向按钮移动，遇见四位二次元女性 NPC，触发八章分支剧情、修复控制台并收集记忆碎片；地图、对话和任务进度自动保存。

新增 **唐宋诗苑**：12 位可选文人身份，NPC 按原本性别设计古风二次元形象，主角恢复最初的像素小人；与李白、杜甫、苏轼、李清照等相遇，随机吟诵本人作品并提出问题。共 36 篇诗词、72 道问答，首次答对获得经验，兼容原等级与存档。

下载 [独立游戏文件](OS-course/os-quest/index.html) 后即可在浏览器打开；也可按[发布说明](OS-course/os-quest/README.md#在-github-上打开游戏)启用 GitHub Pages，获得在线游玩地址。
