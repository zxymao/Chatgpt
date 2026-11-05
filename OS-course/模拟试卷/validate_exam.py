#!/usr/bin/env python3
"""Check exam math independently and validate sources and final PDF geometry."""
from collections import deque
import hashlib
import itertools
import json
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent
exam = json.loads((ROOT / 'exam.json').read_text())
questions = [q for section in ('choice', 'fill', 'long') for q in exam[section]]
assert [q['n'] for q in questions] == list(range(1, 31))
assert sum(q['points'] for q in questions) == exam['points'] == 100
assert len(exam['choice']) == 15 and len(exam['fill']) == 10 and len(exam['long']) == 5
assert all(q['stem'].count('________') == 1 for q in exam['fill'])
assert all(len(q['options']) == 4 and q['answer'] in 'ABCD' for q in exam['choice'])
manifest = json.loads((ROOT / 'sources.json').read_text())
assert manifest['commit'] == exam['commit']
assert sum(s['pages'] for s in manifest['sources']) == 378
seen = set()
for q in questions:
    for s in q['sources']:
        seen.add(s['id'])
        for part in s['pages'].split('、'):
            for n in part.split('—'):
                assert 1 <= int(n) <= exam['sources'][s['id']]['pages']
assert seen == set(exam['sources'])
for source in manifest['sources']:
    p = ROOT.parent / source['file']
    assert hashlib.sha256(p.read_bytes()).hexdigest() == source['sha256']
    with fitz.open(p) as pdf:
        assert len(pdf) == source['pages']
print('PASS: 30 questions, 100 points, one blank each, 10 verified PDF sources and page citations')


def simulate(algorithm):
    arrivals = [0, 1, 3, 5]
    bursts = [7, 4, 1, 4]
    remaining = bursts.copy()
    ready, done, timeline = deque(), {}, []
    t, running, used = 0, None, 0
    while len(done) < 4:
        assert t < 100
        for i, a in enumerate(arrivals):
            if a == t:
                ready.append(i)
        if running is not None and remaining[running] == 0:
            done[running] = t
            running, used = None, 0
        if algorithm == 'rr' and running is not None and used == 2:
            ready.append(running)
            running, used = None, 0
        if algorithm == 'srtcf' and running is not None and ready:
            best = min(ready, key=lambda i: (remaining[i], arrivals[i], i))
            if remaining[best] < remaining[running]:
                ready.append(running)
                running = None
        if running is None and ready:
            if algorithm == 'rr':
                running = ready.popleft()
            else:
                running = min(ready, key=lambda i: (remaining[i], arrivals[i], i))
                ready.remove(running)
        if running is not None:
            if timeline and timeline[-1][2] == running and timeline[-1][1] == t:
                timeline[-1][1] = t + 1
            else:
                timeline.append([t, t+1, running])
            remaining[running] -= 1
            used += 1
        t += 1
    completions = [done[i] for i in range(4)]
    turnaround = [completions[i] - arrivals[i] for i in range(4)]
    waiting = [turnaround[i] - bursts[i] for i in range(4)]
    return timeline, completions, turnaround, waiting


solutions = exam['long'][1]['solution']
tables = [b['rows'] for b in solutions if b['type'] == 'table']
for index, algorithm in enumerate(('srtcf', 'rr')):
    timeline, c, turn, wait = simulate(algorithm)
    published = tables[index]
    assert [[c[i], turn[i], wait[i]] for i in range(4)] == [r[1:] for r in published]
    expected_timeline = (
        [[0,1,0],[1,3,1],[3,4,2],[4,6,1],[6,10,3],[10,16,0]] if index == 0 else
        [[0,2,0],[2,4,1],[4,6,0],[6,7,2],[7,9,1],[9,11,3],[11,13,0],[13,15,3],[15,16,0]]
    )
    assert timeline == expected_timeline
    text = ' '.join(b.get('text', '') for b in solutions)
    assert f'{sum(turn)/4:.2f} ms' in text and f'{sum(wait)/4:.2f} ms' in text
    print(f'PASS Q27 {algorithm}: timeline, completions, turnaround, waiting; means {sum(turn)/4:.2f}, {sum(wait)/4:.2f} ms')

allocation = [[1,0,1],[1,1,0],[1,1,1],[1,1,1]]
maximum = [[1,2,1],[3,1,1],[2,2,2],[1,1,3]]
need = [[m-a for m,a in zip(mr, ar)] for mr,ar in zip(maximum, allocation)]
assert need == [[0,2,0],[2,0,1],[1,1,1],[0,0,2]]


def safe_sequences(available, alloc, demand):
    sequences = []
    for sequence in itertools.permutations(range(4)):
        work = available.copy()
        trace = [work.copy()]
        for i in sequence:
            if not all(n <= w for n,w in zip(demand[i], work)):
                break
            work = [w+a for w,a in zip(work, alloc[i])]
            trace.append(work.copy())
        else:
            sequences.append((sequence, trace))
    return sequences


safe = safe_sequences([1,1,1], allocation, need)
assert ((2,0,1,3), [[1,1,1],[2,2,2],[3,2,3],[4,3,3],[5,4,4]]) in safe
trial_a = [r.copy() for r in allocation]
trial_a[0] = [1,1,1]
trial_n = [r.copy() for r in need]
trial_n[0] = [0,1,0]
assert not safe_sequences([1,0,1], trial_a, trial_n)
print('PASS Q29: Need matrix, safe sequence and Work trace; unsafe trial confirmed across all 24 permutations')

for stem in ('操作系统模拟试卷A-试卷', '操作系统模拟试卷A-参考答案'):
    with fitz.open(ROOT / (stem+'.pdf')) as doc:
        assert len(doc) == 9
        assert '\ufffd' not in ''.join(p.get_text() for p in doc)
        for page in doc:
            assert abs(page.rect.width-595.28) < 1 and abs(page.rect.height-841.89) < 1
            assert page.get_text().strip()
            for x0,y0,x1,y1,*_ in page.get_text('blocks'):
                assert 35 <= x0 < x1 <= page.rect.width-35
                assert 25 <= y0 < y1 <= page.rect.height-12
        text = ''.join(p.get_text() for p in doc)
        for n in range(26, 31):
            assert f'{n}.' in text
    print(f'PASS PDF: {stem}; 9 A4 pages, extractable text, no replacement characters or text overflow')
