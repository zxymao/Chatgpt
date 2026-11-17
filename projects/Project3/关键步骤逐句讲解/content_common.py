"""Data helpers for hand-written notes attached to exact archived source lines."""
def notes(text):
    out=[]
    for line in text.strip().splitlines():
        location, explanation=line.split('|',1)
        numbers=location.strip().split('-')
        out.append({'start':int(numbers[0]),'end':int(numbers[-1]),'text':explanation.strip()})
    return out

def B(path,first,last,title,text,version='P3',kind='完整函数／连续实现块'):
    return dict(path=path,start=first,end=last,title=title,notes=notes(text),version=version,kind=kind)

def S(number,task,title,goal,before,contract,blocks,trace,phenomena,pitfalls,verify):
    return dict(number=number,task=task,title=title,goal=goal,before=before,contract=contract,blocks=blocks,trace=trace,phenomena=phenomena,pitfalls=pitfalls,verify=verify)
