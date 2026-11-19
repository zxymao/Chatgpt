from collections import defaultdict
import random
from pathlib import Path
text = Path("corpus.txt).read_text(encoding="utf-8")
order = 2
transitions = defaultdict(list)
for i in range(len(text)-order):
  context = text[i:i+order]
  nextchar = text[i+order]
  transitions[context].append(nextchar)
seed = input("請輸入文本！")
context = seed[-order:]
result = seed
for _ in range(300):
  candidates = transitions.get(context)
  if not candidates:
    break
  nextchar = random.choice(candidates)
  result += nextcahr
  context = result[-order:]
print(result)
