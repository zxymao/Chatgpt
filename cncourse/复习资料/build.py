#!/usr/bin/env python3
"""Rebuild the colored PDF and self-contained HTML using Pandoc + XeLaTeX."""
from pathlib import Path
import os
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
STEM = '计算机网络期中复习大纲'
base = ['pandoc', str(ROOT / (STEM + '.md')),
        '--from=markdown+tex_math_dollars+tex_math_single_backslash',
        '--resource-path=' + str(ROOT), '--data-dir=' + str(ROOT),
        '--lua-filter=' + str(ROOT / 'review.lua'),
        '--fail-if-warnings']
with tempfile.TemporaryDirectory(prefix='cn-review-') as build_dir:
    env = os.environ.copy()
    env['XDG_CACHE_HOME'] = str(Path(build_dir) / 'cache')
    Path(env['XDG_CACHE_HOME']).mkdir()
    template = (ROOT / 'template.html').read_text().replace(
        '/* REVIEW_CSS */', (ROOT / 'web.css').read_text())
    temp_template = Path(build_dir) / 'template.html'
    temp_template.write_text(template)
    subprocess.run(base + ['--to=html5', '--standalone', '--mathml', '--toc',
                           '--template=' + str(temp_template),
                           '--output=' + str(ROOT / (STEM + '.html'))],
                   check=True, cwd=ROOT, env=env)
    subprocess.run(base + ['--pdf-engine=xelatex',
                           '--output=' + str(ROOT / (STEM + '.pdf'))],
                   check=True, cwd=ROOT, env=env)
print('PASS: colored PDF and standalone HTML generated')
