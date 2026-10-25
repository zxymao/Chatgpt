#!/bin/bash
set -euo pipefail
report_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
build_dir="$(mktemp -d /tmp/architecture-report.XXXXXX)"
trap 'rm -rf -- "$build_dir"' EXIT
export XDG_CACHE_HOME="$build_dir/cache"
mkdir -p "$XDG_CACHE_HOME"
cd "$report_dir"
python3 verify.py
for figure in q1 q2 q3 q5 q7; do
    magick -background white "figures/$figure.svg" "figures/$figure.png"
done
dot -Tsvg figures/precise_exception.dot -o figures/precise_exception.svg
dot -Gdpi=160 -Tpng figures/precise_exception.dot -o figures/precise_exception.png
pandoc 体系结构习题实验报告.md \
    --from=markdown+tex_math_dollars+tex_math_single_backslash \
    --resource-path="$report_dir" \
    --pdf-engine=xelatex \
    --fail-if-warnings \
    --output=体系结构习题实验报告.pdf
for format in pdf docx; do
    options=()
    if [ "$format" = pdf ]; then
        options+=(--pdf-engine=xelatex)
    fi
    pandoc 体系结构作业.md \
        --data-dir="$report_dir" \
        --from=markdown+tex_math_dollars+tex_math_single_backslash \
        --resource-path="$report_dir" \
        "${options[@]}" \
        --fail-if-warnings \
        --output="体系结构作业.$format"
done
printf '%s\n' 'PASS: report PDF and homework PDF/Word generated'
