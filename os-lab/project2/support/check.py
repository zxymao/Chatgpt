#!/usr/bin/env python3
"""Check guest assertions, exit status and stage markers; timeout is failure."""
import argparse
from pathlib import Path
import subprocess

p = argparse.ArgumentParser()
p.add_argument('--mode', choices=['student', 'reference'], required=True)
p.add_argument('--stage', type=int, choices=range(1, 5), required=True)
p.add_argument('--qemu', default='qemu-system-riscv64')
p.add_argument('--bios', default='default')
a = p.parse_args()
root = Path(__file__).resolve().parents[2]
build = root / 'build' / f'project2-{a.mode}-{a.stage}'
log = build / 'qemu.log'
cmd = [a.qemu, '-machine', 'virt', '-m', '128M', '-smp', '1', '-bios', a.bios,
       '-kernel', str(build / 'kernel.elf'), '-display', 'none', '-monitor', 'none',
       '-serial', 'stdio']
try:
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            timeout=15, check=False)
except subprocess.TimeoutExpired as error:
    log.write_bytes(error.stdout or b'')
    raise SystemExit(f'FAIL: timeout; inspect {log}')
log.write_bytes(result.stdout)
text = result.stdout.decode(errors='replace')
required = [f'[PASS P2 task{i}]' for i in range(1, a.stage + 1)]
required.append('[PROJECT2 CHECK PASS]')
if result.returncode or '[PANIC]' in text or any(s not in text for s in required):
    print(text[-5000:])
    raise SystemExit(f'FAIL: mode={a.mode}, stage={a.stage}, exit={result.returncode}; {log}')
print(f'PASS: mode={a.mode}, stage={a.stage}; actual QEMU log: {log}')
