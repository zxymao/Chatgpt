import random
import struct
from pathlib import Path

N = 250000
rng = random.Random(20261028)
root = Path('data')
root.mkdir(exist_ok=True)
for i in range(8):
    values = [rng.randint(1, 1000000) for _ in range(N)]
    (root / f'map{i}.bin').write_bytes(struct.pack(f'<{N}I', *values))
