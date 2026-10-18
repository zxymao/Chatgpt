# Project 2（A-Core）

[下载完整源码包](./Project2-Acore.tar.gz)。在GitHub文件页面点击“Download raw file”即可下载；包内含Task 1—4源码、README、设计说明及验证记录。

将压缩包传到lab后，在独立目录解压，避免覆盖实验1：

```bash
cd ~
tar -xzf Project2-Acore.tar.gz
cd Project2-Acore
make
make run
```

依赖现有课程工具链、QEMU与U-Boot。路径与编译器覆盖方式详见包内README。

已完成四阶段交叉编译、通用QEMU运行检查及10项镜像格式检查。通用QEMU使用测试适配层，不代表通过课程环境验收；课程专用QEMU、loadbootd/DASIC与Pynq板端尚需实际验证。

SHA-256：`2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20`

## 查看相对实验一的变化

- [实验一到实验二修改对照](./实验一到实验二修改对照.md)：功能变化、阅读顺序及文件分类清单。
- [实验一到最终实验二的逐行差异](./Project1-to-Project2.diff)。
- [实验二课程框架到本次实现的逐行差异](./Project2-framework-to-implementation.diff)。

对照以实际上传的两份工程和已发布压缩包生成，区分课程框架新增内容与本次实现。
