#!/usr/bin/env python3
"""Boot the actual kernel; assert guest behavior and preserve QEMU exit status."""
import argparse
import os
from pathlib import Path
import select
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--mode', choices=('student', 'reference'), default='student')
p.add_argument('--lab', choices=('boot', 'all', '1', '2', '3', '4', '5', '6'), default='all')
p.add_argument('--qemu', default='qemu-system-riscv64')
p.add_argument('--bios', default='default')
a = p.parse_args()
build = ROOT / 'build' / a.mode
command = [a.qemu, '-machine', 'virt', '-m', '128M', '-smp', '1', '-bios', a.bios,
           '-kernel', str(build / 'kernel.elf'), '-display', 'none', '-monitor', 'none',
           '-serial', 'stdio']
request = 'info\nhelp\n'
if a.lab != 'boot':
    request += 'check ' + a.lab + '\n'
if a.lab == 'all':
    request += 'echo hello from my OS\nmem\nthreads\nuser\nticks\nsleep\npreempt\n'
request += 'quit\n'
log = build / ('check-' + a.lab + '.log')
process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                           stderr=subprocess.STDOUT)
prefix = bytearray()
deadline = time.monotonic() + 20
try:
    # Firmware can consume input during boot. Wait for OUR kernel's prompt.
    while b'tinyrv> ' not in prefix:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise subprocess.TimeoutExpired(command, 20)
        ready, _, _ = select.select([process.stdout], [], [], remaining)
        if not ready:
            raise subprocess.TimeoutExpired(command, 20)
        chunk = os.read(process.stdout.fileno(), 65536)
        if not chunk:
            raise RuntimeError('QEMU exited before the kernel prompt')
        prefix.extend(chunk)
    tail, _ = process.communicate(request.encode(), timeout=max(0.1, deadline - time.monotonic()))
    output = bytes(prefix) + tail
except (subprocess.TimeoutExpired, RuntimeError) as error:
    process.kill()
    tail, _ = process.communicate()
    log.write_bytes(bytes(prefix) + tail)
    raise SystemExit(f'FAIL: {error}; timeout is not a pass. Inspect {log}')
log.write_bytes(output)
text = output.decode(errors='replace').replace('\r\n', '\n')
expected = ['[TinyRV boot OK]', 'TinyRV: RV64', 'Built in:', 'Bye from TinyRV']
if a.lab == 'all':
    expected += [f'[PASS lab{i}]' for i in range(1, 7)]
    expected += ['[ALL LABS PASS]', '\nhello from my OS\n', 'page returned to pool',
                 '[threads] round-robin verified', '[user] write, time, EFAULT, ENOSYS verified',
                 'awake after 100 timer ticks', '[preempt] overlap verified before first completion',
                 '[preempt] all tasks completed without yield']
elif a.lab != 'boot':
    expected.append(f'[PASS lab{a.lab}]')
missing = [s for s in expected if s not in text]
failed = process.returncode != 0 or missing or '[FAIL' in text or '[PANIC]' in text
if failed:
    sys.stdout.write(text[-6000:])
    raise SystemExit(f'FAIL: QEMU exit={process.returncode}; missing={missing}; log={log}')
print(f'PASS: mode={a.mode}, lab={a.lab}; actual guest log={log.relative_to(ROOT)}')
