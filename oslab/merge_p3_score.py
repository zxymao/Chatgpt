#!/usr/bin/env python3
"""Resolve the known Project2 -> Project3 S-Core merge in this conversation.

Run from the course Git repository. Only the reviewed files are replaced;
current screen.c is preserved. The script backs up every touched file inside
the Git directory, stages those resolutions, and never commits or pushes.
The resulting framework still needs its Project3 kernel implementations.
"""

import base64
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


PAYLOAD = "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"

KEEP_P2 = [
    "arch/riscv/boot/bootblock.S",
    "test/test_project2/fly.c",
    "test/test_project2/lock1.c",
    "test/test_project2/lock2.c",
    "test/test_project2/print1.c",
    "test/test_project2/print2.c",
    "test/test_project2/sleep.c",
    "test/test_project2/timer.c",
]


def git(*args, cwd=None, check=True):
    result = subprocess.run(
        ["git", *args], cwd=cwd, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False,
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace").strip())
    return result


def unresolved(root):
    result = git("diff", "--name-only", "--diff-filter=U", "-z", cwd=root)
    return [p.decode() for p in result.stdout.split(b"\0") if p]


def main():
    root = Path(git("rev-parse", "--show-toplevel").stdout.decode().strip())
    branch = git("branch", "--show-current", cwd=root).stdout.decode().strip()
    if branch != "Project3-work":
        raise RuntimeError("请在 Project3-work 分支运行；当前分支为 " + branch)
    if git("rev-parse", "-q", "--verify", "MERGE_HEAD", cwd=root,
           check=False).returncode:
        raise RuntimeError("当前没有待完成的合并，脚本未修改文件。")

    data = json.loads(gzip.decompress(base64.b64decode(PAYLOAD)))
    contents = {rel: base64.b64decode(value)
                for rel, value in data["files"].items()}
    mismatches = []
    for rel, expected in data["expected_head"].items():
        result = git("show", "HEAD:" + rel, cwd=root, check=False)
        if result.returncode or hashlib.sha256(result.stdout).hexdigest() != expected:
            mismatches.append(rel)
    if mismatches:
        raise RuntimeError(
            "P2 底稿与已核对版本不一致，未修改文件。请贴出这些文件再核对：\n"
            + "\n".join(mismatches)
        )

    pending = unresolved(root)
    keep = {}
    for rel in KEEP_P2:
        if rel in pending:
            keep[rel] = git("show", ":2:" + rel, cwd=root).stdout
    touched = dict(keep)
    touched.update(contents)
    for rel in touched:
        path = root / rel
        if path.is_symlink():
            raise RuntimeError("发现符号链接，未修改文件：" + rel)

    gitdir = Path(git("rev-parse", "--absolute-git-dir", cwd=root)
                  .stdout.decode().strip())
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = Path(tempfile.mkdtemp(prefix="p3-merge-backup-" + stamp + "-",
                                   dir=gitdir))
    before = git("status", "--short", cwd=root).stdout
    (backup / "status-before.txt").write_bytes(before)
    (backup / "head-before.txt").write_bytes(
        git("rev-parse", "HEAD", cwd=root).stdout)
    for rel in touched:
        source = root / rel
        if source.exists():
            target = backup / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    print("替换前备份：", backup, flush=True)

    for rel, content in touched.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    git("add", "--", *touched, cwd=root)

    print("已整理并暂存：")
    for rel in touched:
        print("  " + rel)
    remaining = unresolved(root)
    if remaining:
        print("仍需单独处理的冲突：")
        for rel in remaining:
            print("  " + rel)
        return 2
    print("已知合并冲突已解决；screen.c 未被覆盖。")
    print("这只是框架合并，P3 内核功能仍需实现和验证。")
    print("下一步查看 git diff --cached --stat，再自行 git commit。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError, subprocess.SubprocessError) as error:
        print("停止：", error, file=sys.stderr)
        sys.exit(1)
