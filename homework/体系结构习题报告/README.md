# 计算机体系结构习题实验报告

- [PDF 报告](体系结构习题实验报告.pdf)
- [Markdown 报告](体系结构习题实验报告.md)
- [验证脚本](verify.py)
- [本次仿真结果](results.json)
- [时空图与精确异常结构图](figures/)

报告对应上一级目录的[体系结构1](../体系结构1.png)、[体系结构2](../体系结构2.png)、[体系结构3](../体系结构3.png)三张图片，共 10 道题。

**注意：**题目引用的图 9.4、9.6、9.13、9.18 未随图片提供；第二张图片实际为图 9.26。报告对依赖处理器结构的题目采用了明确标注的参考模型。BHT 的分支形式、冷启动和第 10 题基础 CPI 假设也在正文说明。结果属于教学模型分析与仿真，不是真实硬件测量。

仅复核数值，需 Python 3，无第三方 Python 依赖：

```bash
python3 homework/体系结构习题报告/verify.py
```

重新生成 PDF：

```bash
bash homework/体系结构习题报告/build.sh
```

排版需 Pandoc、XeLaTeX（含 `ctex`、`xeCJK`）、Graphviz、ImageMagick 及 SVG 转换器 `rsvg-convert`。字体使用 Noto Serif、Noto Serif CJK SC、Noto Sans CJK SC、DejaVu Sans Mono。Debian 对应软件包包括 `pandoc texlive-xetex texlive-lang-chinese graphviz imagemagick librsvg2-bin fonts-noto-core fonts-noto-cjk fonts-dejavu-core`。

本次云机器的中文 LaTeX 与 SVG 转换依赖安装在仓库外的 `/workspace/report-tools`；在该机器重新排版前可先执行 `source /workspace/report-tools/activate.sh`。已有 PDF 和仅使用标准库的数值验证不依赖此路径。
