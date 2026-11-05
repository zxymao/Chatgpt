#!/usr/bin/env python3
"""Recover the source versions used by the guide without changing either project."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ARCHIVE = REPO / "projects/Project2/Project2-Acore.tar.gz"
DIFF = REPO / "projects/Project2/Project1-to-Project2.diff"
EXPECTED = "2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20"
UNCHANGED = {
    "arch/riscv/include/asm.h", "arch/riscv/include/csr.h", "include/os/loader.h",
    "include/os/string.h", "include/os/task.h", "include/type.h", "riscv.lds",
    "test/test_project1/2048.c", "test/test_project1/auipc.c",
    "test/test_project1/bss.c", "test/test_project1/data.c",
}


def normalized(text):
    return text.replace("\r\n", "\n").rstrip("\n") + "\n"


def prepare():
    assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == EXPECTED
    patch = DIFF.read_text()
    old = set(re.findall(r"^--- Project1/(.+)$", patch, re.M))
    new = set(re.findall(r"^\+\+\+ Project2-Acore/(.+)$", patch, re.M))
    with tempfile.TemporaryDirectory(prefix="prj-code-outline-") as tmp:
        base = Path(tmp)
        with tarfile.open(ARCHIVE) as archive:
            archive.extractall(base, filter="data")
        p2 = base / "Project2-Acore"
        p1 = base / "Project1"
        shutil.copytree(p2, p1)
        # The saved diff omits end-of-file newline markers. Normalize only
        # the temporary copy's line endings before strict reverse application.
        for path in p1.rglob("*"):
            if path.is_file():
                try:
                    content = path.read_text()
                except UnicodeError:
                    continue
                path.write_text(normalized(content))
        reverse = subprocess.run(
            ["patch", "--batch", "--reverse", "--fuzz=0", "-p1", "-d", str(p1),
             "-i", str(DIFF)], text=True, capture_output=True, check=True)
        assert not re.search(r"FAILED|fuzz|offset|Ignoring", reverse.stdout)
        roundtrip = base / "roundtrip"
        shutil.copytree(p1, roundtrip)
        forward = subprocess.run(
            ["patch", "--batch", "--forward", "--fuzz=0", "-p1", "-d", str(roundtrip),
             "-i", str(DIFF)], text=True, capture_output=True, check=True)
        assert not re.search(r"FAILED|fuzz|offset|Ignoring", forward.stdout)
        for name in new:
            assert normalized((roundtrip / name).read_text()) == normalized((p2 / name).read_text()), name
        for name in old - new:
            assert not (roundtrip / name).exists(), name

        sources = {}
        for name in sorted(old | UNCHANGED):
            sources["P1:" + name] = (p1 / name).read_text()
        for path in sorted(p2.rglob("*")):
            if path.is_file() and (path.suffix in {".c", ".h", ".S", ".lds", ".py", ".md"}
                                   or path.name in {"Makefile", ".gitignore"}):
                sources["P2:" + str(path.relative_to(p2))] = path.read_text()
    manifest = {
        "repository": "https://github.com/zxymao/Chatgpt",
        "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
        "archive_sha256": EXPECTED,
        "diff_sha256": hashlib.sha256(DIFF.read_bytes()).hexdigest(),
        "project1_origin": "Strict reverse of saved Project1-to-Project2.diff; unchanged files copied from archive. LF/end-of-file newline normalized only.",
        "roundtrip": "PASS: strict reverse and forward; all patched target files match archive after newline normalization",
        "files": {name: {"lines": len(text.splitlines()),
                         "sha256": hashlib.sha256(text.encode()).hexdigest()}
                  for name, text in sources.items()},
    }
    (HERE / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return sources, manifest


if __name__ == "__main__":
    sources, manifest = prepare()
    print(manifest["roundtrip"])
    print("P1 files:", sum(name.startswith("P1:") for name in sources))
    print("P2 files:", sum(name.startswith("P2:") for name in sources))
