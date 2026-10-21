#!/usr/bin/env python3
"""Codespaces entry point for the archived A-Core project (Python 3.12+)."""
import argparse
import hashlib
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile

REPO = Path(__file__).resolve().parents[1]
LOCAL = REPO / ".local"
PROJECT = LOCAL / "Project2-Acore"
ARCHIVE = REPO / "projects/Project2/Project2-Acore.tar.gz"
SHA256 = "2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20"
PREFIX = "riscv64-linux-gnu-"
STAGE_TASKS = {
    1: "coop1 coop2",
    2: "mutex1 mutex2",
    3: "sleep coop_timer",
    4: "print1 print2 lock1 lock2 sleep timer",
}


def run(command, cwd=PROJECT):
    subprocess.run(command, cwd=cwd, check=True)


def setup():
    if hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != SHA256:
        raise RuntimeError("Source archive checksum mismatch; refusing extraction.")
    LOCAL.mkdir(exist_ok=True)
    if PROJECT.exists():
        if not (PROJECT / "Makefile").is_file():
            raise RuntimeError(f"Incomplete existing project: {PROJECT}; inspect it before retrying.")
        print(f"Keeping existing source and edits: {PROJECT}", flush=True)
        return
    # Stage extraction first so an interrupted extraction cannot overwrite edits.
    with tempfile.TemporaryDirectory(dir=LOCAL) as tmp:
        with tarfile.open(ARCHIVE) as archive:
            archive.extractall(tmp, filter="data")
        shutil.move(str(Path(tmp) / "Project2-Acore"), PROJECT)
    print(f"Source extracted to {PROJECT}", flush=True)


def build(stage=4, tasks=None, tree=PROJECT):
    run(["make", f"CROSS_PREFIX={PREFIX}", f"LAB_STAGE={stage}",
         f"TASKS={tasks or STAGE_TASKS[stage]}"], cwd=tree)


def live(stage, tasks):
    # Same test-only relocation/firmware as tools/host_qemu_smoke.py.
    # The editable source and course address layout are left intact.
    with tempfile.TemporaryDirectory(prefix="acore-live-") as tmp:
        tree = Path(tmp) / "Project2-Acore"
        shutil.copytree(PROJECT, tree, ignore=shutil.ignore_patterns(
            "build", "*.log", "__pycache__", ".git"))

        def relocate(match):
            value = int(match[0], 16)
            return hex(value + 0x30000000) if 0x50000000 <= value < 0x53000000 else match[0]

        for path in tree.rglob("*"):
            if (path.is_file() and "host-qemu" not in path.parts
                    and (path.suffix in (".c", ".h", ".S") or path.name == "Makefile")):
                path.write_text(re.sub(r"0[xX][0-9a-fA-F]+", relocate, path.read_text()))
        build(stage, tasks, tree)
        firmware = PROJECT / "test/host-qemu"
        elf = tree / "firmware.elf"
        run([PREFIX + "gcc", "-nostdlib", "-static", "-fno-pie", "-no-pie",
             "-march=rv64imac_zicsr_zifencei", "-mabi=lp64", "-Wl,--build-id=none",
             "-Wl,--no-relax", "-T", str(firmware / "firmware.lds"),
             str(firmware / "firmware.S"), "-o", str(elf)])
        print("\nQEMU live console: press Ctrl+A, release, then X to exit.\n", flush=True)
        try:
            run(["qemu-system-riscv64", "-machine", "virt", "-m", "256M",
                 "-display", "none", "-serial", "mon:stdio", "-bios", str(elf),
                 "-device", f"loader,file={tree}/build/image,addr=0x84000000,force-raw=on"])
        finally:
            print("\033[?25h", end="", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["setup", "build", "image-test", "test", "run"])
    parser.add_argument("--stage", type=int, choices=range(1, 5), default=4)
    parser.add_argument("--tasks", help="Space-separated task names, quoted as one argument")
    args = parser.parse_args()
    if args.command == "setup":
        setup()
        return
    if not PROJECT.is_dir():
        parser.error("Run python3 scripts/acore.py setup first.")
    if args.command == "build":
        build(args.stage, args.tasks)
    elif args.command == "image-test":
        run(["make", "build/createimage"])
        run(["python3", "tools/test_image.py", "build/createimage"])
    elif args.command == "run":
        live(args.stage, args.tasks)
    else:
        logs = LOCAL / "logs"
        logs.mkdir(exist_ok=True)
        build()
        run(["python3", "tools/test_image.py", "build/createimage"])
        for stage in range(1, 5):
            run(["python3", "tools/host_qemu_smoke.py", "--stage", str(stage),
                 "--seconds", "8", "--log", str(logs / f"stage{stage}.log")])
        run(["python3", "tools/host_qemu_smoke.py", "--stage", "4",
             "--tasks", STAGE_TASKS[4], "--seconds", "5",
             "--log", str(logs / "course.log")])
        print(f"All checks passed. Logs: {logs}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit(130)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
