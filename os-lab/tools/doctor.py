#!/usr/bin/env python3
"""Check the real toolchain; no credentials or cloud service are needed."""
import argparse
import shutil
import subprocess

p = argparse.ArgumentParser()
p.add_argument('--cross-prefix', default='riscv64-linux-gnu-')
p.add_argument('--qemu', default='qemu-system-riscv64')
a = p.parse_args()
missing = []
for binary in (a.cross_prefix + 'gcc', a.cross_prefix + 'objdump', a.qemu, 'make'):
    path = shutil.which(binary)
    if not path:
        missing.append(binary)
        continue
    result = subprocess.run([path, '--version'], text=True, capture_output=True, check=True)
    print(result.stdout.splitlines()[0])
if missing:
    raise SystemExit('Missing tools: ' + ', '.join(missing) + '\nCreate/rebuild the Codespaces container.')
print('Tools found. Run make boot-check to verify firmware and actual kernel boot.')
