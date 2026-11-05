# prj1 → prj2 代码阅读提纲

- [PDF提纲（14页）](prj1-prj2代码阅读提纲.pdf)
- [Markdown提纲](prj1-prj2代码阅读提纲.md)
- [HTML提纲](prj1-prj2代码阅读提纲.html)
- [可搜索的离线源码索引](源码索引.html)

提纲承接已有的操作系统期中复习知识，按真实调用链组织：镜像与加载、内核/任务入口、PCB及队列、首次启动、主动切换、锁阻塞与移交、系统调用、异常现场、睡眠和抢占。末尾含12个检查题与答案。

## 版本与来源

依据仓库 `zxymao/Chatgpt`，提交 `4d6cb77cd2cae538bec76a41cb6beda2846554a3`。正文里的prj1/prj2是实验简称，对应仓库 `projects/Project2/` 保存的两次实验资料。

prj2来自 `Project2-Acore.tar.gz`，SHA-256为 `2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20`。prj1的修改文件从 `Project1-to-Project2.diff` 严格反向恢复，其余共同文件依据仓库对照清单取自归档。对临时副本仅规范化换行后，反向与正向应用均未使用模糊匹配，所有被补丁定义的目标文件已与归档内容核对一致。

源码索引含prj1的29个文件和prj2的91个源码/说明/辅助文件，保留原文件版权与许可文本。它是阅读用快照，不是新建的工程实现，也不依赖云环境的临时路径。打开HTML提纲或PDF中的“P1/P2 文件:行号”链接即可跳到对应行；也可直接打开源码索引搜索文件或函数。PDF阅读器若不打开相对HTML链接，可在索引中按文件名定位。

- [GitHub源码包](https://github.com/zxymao/Chatgpt/blob/4d6cb77cd2cae538bec76a41cb6beda2846554a3/projects/Project2/Project2-Acore.tar.gz)
- [实验一到实验二差异](https://github.com/zxymao/Chatgpt/blob/4d6cb77cd2cae538bec76a41cb6beda2846554a3/projects/Project2/Project1-to-Project2.diff)
- [课程框架到实验二实现差异](https://github.com/zxymao/Chatgpt/blob/4d6cb77cd2cae538bec76a41cb6beda2846554a3/projects/Project2/Project2-framework-to-implementation.diff)

## 本次核对

静态核对包括归档摘要、实验一恢复的往返核对、52个源码行引用及节选、PDF分页和边界；源码索引还验证了链接跳转、搜索和离线切换。

2026-11-05重新执行了归档中通用QEMU测试适配器的四阶段检查。阶段1运行3秒、阶段2运行3秒、阶段3运行4秒、阶段4运行8秒；均按适配器预期的实际客户机输出通过。原始VT100日志与运行器输出保存在 `运行记录/`。这些内核持续运行，运行器在限定观察时间结束后检查输出，不把“内核自然退出”作为通过条件。

通用QEMU检查使用临时重定位副本和测试BIOS适配层，不改课程地址及源码，不代表课程QEMU、U-Boot、loadbootd/DASIC或Pynq板端验收。prj1本次只做恢复和静态阅读核对。

## 重建文档

在完整的 `Chatgpt` checkout中运行：

```bash
python3 OS-course/复习资料/prj1-prj2代码提纲/build_outline.py
python3 OS-course/复习资料/prj1-prj2代码提纲/check_outputs.py
```

构建需要Python 3.12+、GNU patch、Pandoc、Node.js、Playwright、Chromium、PyMuPDF和中文字体；检查脚本另外使用lxml。所有工具在当前云环境已具备。阅读已生成的PDF、HTML不需要安装这些工具。

`提纲正文.md`是正文模板，`build_outline.py`生成源码索引及报告，`prepare_sources.py`从仓库材料准备只读源码快照，`source-manifest.json`与`引用索引.json`记录证据。当前工程、原始源码包和已有作业文件均保持不变。
