# 期中习题课：题目与参考答案

- **[阅读／下载 PDF](期中习题课-题目与参考答案.pdf)**：13 页 A4，含全部 7 组、19 道题目的题干、答案与关键解释。
- [可编辑 Markdown](期中习题课-题目与参考答案.md) · [离线打印 HTML](期中习题课-题目与参考答案.html)。
- [下载完整包：PDF、答案、代码与实测记录](../期中习题课-答案与代码.zip)。
- [仅看简要讲解](简要讲解与参考答案.md)。

题目依据上传的《期中习题课.pptx》及《作业2 (2).docx》整理；2.3 包含补充文档中的原程序。表格和程序图已转写，原文件摘要记录在 [results/sources.json](results/sources.json)。

## 代码与验证

[code](code) 包含 Linux C 示例；[results](results) 包含真实运行记录及计算题验证结果。耗时依赖硬件、系统负载与计时口径，不作为固定标准答案。cgroup 配置因环境不可写未执行；锁实验未将进程 CPU 时间冒充 iostat 的系统级数据。

在本目录运行：

```bash
make -C code -j2
python3 verify_models.py
python3 run_experiments.py
```

实验程序依赖 Linux、GCC、pthread，内联汇编示例针对 x86-64。计算题验证只需 Python 标准库。重跑实验会更新 results，耗时与 PID 等不保证重复一致。

## 重建文档

```bash
python3 build_pdf.py
node render_pdf.cjs
```

Markdown／HTML 生成使用 Python 标准库，题干读取自已保存的 [handout-questions.json](results/handout-questions.json)，不依赖上传文件的临时路径。PDF 导出使用 Playwright、`/usr/bin/chromium` 和 Noto 中文字体。
