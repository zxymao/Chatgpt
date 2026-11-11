#!/usr/bin/env python3
"""Run on your own computer to copy the P3 archive to your SSH server."""

import argparse
from pathlib import Path
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description="把本地 P3 压缩包上传到 SSH 服务器的主目录；不解压、不修改代码。")
    parser.add_argument("archive", help="本地 Project3-SCore-changes.tar.gz 的路径")
    parser.add_argument("host", help="SSH 别名，或 stu@服务器地址")
    parser.add_argument("-P", "--port", type=int, help="SSH 端口；使用 SSH 别名时通常无需指定")
    args = parser.parse_args()

    archive = Path(args.archive).expanduser().resolve()
    if not archive.is_file():
        parser.error("本地文件不存在：" + str(archive))
    if args.host.startswith("-") or any(ch.isspace() for ch in args.host):
        parser.error("host 只填写 SSH 别名或 用户名@地址，不要填写整条 ssh 命令。")
    if args.port is not None and not 1 <= args.port <= 65535:
        parser.error("端口必须在 1～65535 之间。")
    client = shutil.which("scp")
    if client is None:
        parser.error("找不到 scp；请先安装或启用 OpenSSH 客户端。")

    command = [client]
    if args.port is not None:
        command += ["-P", str(args.port)]
    command += ["--", str(archive), args.host + ":Project3-SCore-changes.tar.gz"]
    print("开始上传；如有提示，请输入服务器的 SSH 密码。", flush=True)
    result = subprocess.run(command)
    if result.returncode:
        raise SystemExit(result.returncode)
    print("已上传到服务器：~/Project3-SCore-changes.tar.gz")


if __name__ == "__main__":
    main()
