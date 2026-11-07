#!/usr/bin/env python3
"""Independent finite-state/exhaustive checks for the paper exercises."""
from collections import deque
from fractions import Fraction
from itertools import permutations
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parent
answer={}

# 4.1: all jobs arrive at zero; non-preemptive execution, no context-switch cost.
def totals(order):
    t=0;response=0;turnaround=0
    for duration in order:
        response+=t;t+=duration;turnaround+=t
    return response,turnaround
for x in range(16):
    jobs=(2,6,9,11,x);best=totals(sorted(jobs))
    assert best[0]==min(totals(p)[0] for p in permutations(jobs))
    assert best[1]==min(totals(p)[1] for p in permutations(jobs))
answer['4.1']={'rule':'SJF for both objectives under simultaneous-arrival non-preemptive model',
               'tested_X':list(range(16))}

# 4.2: exact RR simulation and non-preemptive schedules.
bursts=dict(zip('ABCDE',[10,8,4,12,15]))
def fixed(order):
    t=0;wait={};finish={};timeline=[]
    for job in order:
        wait[job]=t;timeline.append((t,t+bursts[job],job));t+=bursts[job];finish[job]=t
    return {'order':''.join(order),'timeline':timeline,'finish':finish,'wait':wait,
            'average_wait':sum(wait.values())/5}
rows={'priority':fixed('BEDAC'),'FCFS':fixed('ABCDE'),'SJF':fixed('CBADE')}
ready=deque('ABCDE');remain=bursts.copy();t=0;timeline=[];finish={}
while ready:
    job=ready.popleft();end=t+min(3,remain[job]);timeline.append((t,end,job))
    remain[job]-=end-t;t=end
    if remain[job]:ready.append(job)
    else:finish[job]=t
wait={j:finish[j]-bursts[j] for j in 'ABCDE'}
rows['RR(q=3)']={'timeline':timeline,'finish':finish,'wait':wait,'average_wait':sum(wait.values())/5}
assert rows['RR(q=3)']['average_wait']==27.6
assert rows['priority']['average_wait']==22.2
assert rows['FCFS']['average_wait']==16.8
assert rows['SJF']['average_wait']==14.4
answer['4.2']=rows

# 4.3: utilization and fixed-priority response-time iteration.
assert Fraction(5,20)*2+Fraction(24*20,1000)==Fraction(98,100)
assert Fraction(5,20)*2+Fraction(60*20,1000)==Fraction(170,100)
response=[20]
while True:
    next_r=20+((response[-1]+19)//20)*10
    response.append(next_r)
    if next_r==response[-2]:break
assert response==[20,30,40,40] and response[-1]<=Fraction(1000,24)
answer['4.3']={'U24':0.98,'U60':1.70,'RM_video_response_iteration':response,'max_ideal_fps':25}

# 6.1: search X and enumerate every complete safety sequence.
alloc=[[5,4,2,5,3],[3,1,3,2,5],[2,0,3,4,1],[4,2,3,5,2]]
maximum=[[5,5,2,5,5],[3,3,4,2,5],[6,0,6,4,1],[10,2,4,6,11]]
need=[[m-a for m,a in zip(mr,ar)] for mr,ar in zip(maximum,alloc)]
safe={}
for x in range(4):
    options=[]
    for seq in permutations(range(4)):
        work=[0,x,1,0,0];trace=[work.copy()]
        for i in seq:
            if any(n>w for n,w in zip(need[i],work)):break
            work=[w+a for w,a in zip(work,alloc[i])];trace.append(work.copy())
        else:options.append({'sequence':''.join('ABCD'[i] for i in seq),'work':trace})
    safe[x]=options
assert not safe[0] and not safe[1] and safe[2]
assert any(o['sequence']=='BACD' for o in safe[2])
answer['6.1']={'need':need,'minimum_X':2,'safe_sequences_at_minimum':safe[2]}

# 6.2: locks are held until all three resources have been acquired.
def possible_deadlock(order_b):
    orders=[(1,2,3),order_b]
    initial=(0,0,(-1,-1,-1))
    queue=deque([(initial,[]) ])
    seen={initial}
    while queue:
        (pa,pb,owners),trace=queue.popleft();pcs=[pa,pb];successors=[]
        for thread in range(2):
            pc=pcs[thread]
            if pc==4:continue
            newowners=list(owners);newpcs=pcs.copy()
            if pc==3:
                newowners=[-1 if o==thread else o for o in owners]
                action='AB'[thread]+' releases all'
            else:
                resource=orders[thread][pc]-1
                if owners[resource]!=-1:continue
                newowners[resource]=thread
                action='AB'[thread]+' takes '+str(resource+1)
            newpcs[thread]+=1
            successors.append(((newpcs[0],newpcs[1],tuple(newowners)),trace+[action]))
        if not successors and pcs!=[4,4]:return trace
        for state,steps in successors:
            if state not in seen:seen.add(state);queue.append((state,steps))
    return None
orders=[]
for order in permutations((1,2,3)):
    trace=possible_deadlock(order)
    orders.append({'B_order':order,'guaranteed_deadlock_free':trace is None,'one_deadlock_trace':trace})
assert {tuple(o['B_order']) for o in orders if o['guaranteed_deadlock_free']}=={(1,2,3),(1,3,2)}
answer['6.2']=orders

# 7.1: each assignment is one indivisible textbook operation; P blocks at zero.
initial=(0,0,0,0,2,0,0) # pc1, pc2, x, y, z, S1, S2
queue=deque([(initial,[]) ]);seen={initial};results={}
names=[['x=1','x=x+1','P(S1)','x=x+y','V(S2)','z=x+z'],
       ['y=1','y=y+2','V(S1)','z=y+1','P(S2)','y=z+y']]
while queue:
    state,trace=queue.popleft();p1,p2,x,y,z,s1,s2=state
    if p1==p2==6:
        results.setdefault((x,y,z),trace);continue
    for thread in range(2):
        p=[p1,p2];xx,yy,zz,ss1,ss2=x,y,z,s1,s2;pc=p[thread]
        if pc==6:continue
        if thread==0:
            if pc==0:xx=1
            elif pc==1:xx=x+1
            elif pc==2:
                if not s1:continue
                ss1-=1
            elif pc==3:xx=x+y
            elif pc==4:ss2+=1
            elif pc==5:zz=x+z
        else:
            if pc==0:yy=1
            elif pc==1:yy=y+2
            elif pc==2:ss1+=1
            elif pc==3:zz=y+1
            elif pc==4:
                if not s2:continue
                ss2-=1
            elif pc==5:yy=z+y
        p[thread]+=1;new=(p[0],p[1],xx,yy,zz,ss1,ss2)
        if new not in seen:
            seen.add(new);queue.append((new,trace+[f'T{thread+1}: '+names[thread][pc]]))
assert set(results)=={(5,7,4),(5,7,9),(5,12,9)}
answer['7.1']=[{'final':values,'one_trace':trace} for values,trace in sorted(results.items())]
(ROOT/'results'/'models.json').write_text(json.dumps(answer,ensure_ascii=False,indent=2)+'\n')
for q in answer:print('PASS model',q)
print('PASS: scheduling, banker minimum X, all six resource orders and all textbook semaphore outcomes')
