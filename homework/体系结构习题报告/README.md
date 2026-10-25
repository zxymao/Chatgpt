# 计算机体系结构习题实验报告

- [简洁作业版 PDF](体系结构作业.pdf)
- [简洁作业版 Word](体系结构作业.docx)
- [简洁作业版 Markdown](体系结构作业.md)
- [PDF 报告](体系结构习题实验报告.pdf)
- [Markdown 报告](体系结构习题实验报告.md)
- [验证脚本](verify.py)
- [本次仿真结果](results.json)
- [时空图与精确异常结构图](figures/)

报告对应上一级目录的[体系结构1](../体系结构1.png)、[体系结构2](../体系结构2.png)、[体系结构3](../体系结构3.png)三张图片，共 10 道题。

教材原图对应关系：[体系结构4.png](体系结构4.png)为图 9.6，[体系结构5.png](体系结构5.png)为图 9.4，[体系结构6.png](体系结构6.png)为图 9.13，[体系结构7.png](体系结构7.png)为图 9.18。已据五拍多周期控制将第 1 题修正为 1005 周期，并更新时空图。BHT 的分支形式、冷启动和第 10 题基础 CPI 在解答中说明。

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
