# 在 GitHub Codespaces 中观察 A-Core 运行

## 创建环境

在仓库的 `main` 分支点击 **Code → Codespaces → Create codespace on main**，使用默认机器规格即可。首次构建会安装 Debian 13 的 RISC-V GCC、binutils、通用 QEMU、GDB 和 Python，然后核对源码包 SHA-256、解压、构建 Task 4 并执行10项镜像测试。等待初始化结束再运行下面的命令。

已有 Codespace 的用户先拉取最新代码，再通过命令面板执行 **Codespaces: Rebuild Container**，使新配置生效。如果自动初始化中断，可在仓库根目录重试：

```bash
python3 scripts/acore.py setup
python3 scripts/acore.py build
python3 scripts/acore.py image-test
```

源码解压到 `.local/Project2-Acore/`，构建产物在其 `build/` 中；重复初始化保留已有源码和修改。该目录被 Git 忽略，重要修改应另行备份，删除 Codespace 会失去其中尚未保存的工作。

## 实时观察（推荐先运行这个）

在仓库根目录的终端执行：

```bash
python3 scripts/acore.py run
```

编译完成后，QEMU 串口会直接显示在当前终端。默认运行 Task 4 的 `print1 print2 lock1 lock2 sleep timer`：可以看到调度测试计数、锁的获取与释放、睡眠计数及时间更新。终端以光标定位的方式刷新固定行，内容可能在原位置变化，而非不断追加新行。建议放大终端面板，至少保留80列、30行。

**退出：按 Ctrl+A，松开，再按 X。** 如果终端光标在退出后隐藏，可执行 `printf '\033[?25h'` 恢复。模拟器运行期间不需要打开端口或浏览器预览。

也可以使用 VS Code 的 **Terminal → Run Task**，选择 **A-Core: 实时运行课程任务**。

## 切换阶段或任务

所有命令都在仓库根目录执行：

| 命令 | 观察内容 |
| --- | --- |
| `python3 scripts/acore.py run --stage 1` | 两个协作任务主动 yield，计数交替更新 |
| `python3 scripts/acore.py run --stage 2` | 两个互斥任务获取、释放同一把锁 |
| `python3 scripts/acore.py run --stage 3` | 系统调用、睡眠恢复和协作计时 |
| `python3 scripts/acore.py run --stage 4` | 时钟抢占下的六个课程任务 |
| `python3 scripts/acore.py run --stage 4 --tasks 'probe1 probe2'` | 寄存器、抢占、锁与睡眠探针，最终显示两个 PASS |
| `python3 scripts/acore.py run --stage 4 --tasks 'fly print1 print2'` | 字符飞机与调度任务共同运行 |

探针显示 PASS 后内核仍继续运行，需要手动退出。这里没有图形桌面或交互式 shell，画面是内核通过串口输出的文本。

## 自动判断是否通过

```bash
python3 scripts/acore.py test
```

这会构建默认镜像，执行10项镜像测试，再运行四阶段 QEMU 测试和课程六任务组合。运行约一分钟，末尾应显示 `All checks passed`；缺少预期输出或出现异常时返回非零。完整测试日志保存在 `.local/logs/`，也可通过 **Terminal → Run Task → A-Core: 自动测试全部阶段** 启动。

原始日志包含终端控制序列，直接打开可能看起来杂乱。要在终端中回放某次画面（显示最终屏幕状态），可以运行：

```bash
cat .local/logs/stage4.log
printf '\033[?25h\n'
```

## 修改和构建

可在文件浏览器中打开 `.local/Project2-Acore/` 修改源码，然后从仓库根目录重新执行运行命令。运行脚本每次使用当前源码的临时副本构建，因此会使用你的修改，并在退出后清理临时文件。

如需仅生成课程地址布局的镜像和反汇编，运行 `python3 scripts/acore.py build --stage 4`。这些产物保存在 `.local/Project2-Acore/build/`。

## 测试范围

此环境使用通用 QEMU 和源码包自带的测试 BIOS 适配层；实时运行使用与原 `host_qemu_smoke.py` 相同的地址重定位方法。它用于观察和测试真实内核的调度、异常与系统调用，不检验课程块设备、课程 QEMU/U-Boot、loadbootd/DASIC 或 Pynq 板端。

不要直接执行项目默认的 `make run`：该命令需要课程专用 QEMU 和 U-Boot。这里使用 `python3 scripts/acore.py run` 即可。
