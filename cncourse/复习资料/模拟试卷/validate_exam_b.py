#!/usr/bin/env python3
"""Independent numeric checks and final-document validation for paper B."""
from pathlib import Path
from fractions import Fraction
import hashlib,heapq,ipaddress,json,unicodedata
from pypdf import PdfReader
R=Path(__file__).resolve().parent
b=json.loads((R/'exam-b.json').read_text());a=json.loads((R/'exam.json').read_text());qs=b['questions']
assert [q['id'] for q in qs]==list(range(1,26))
assert sum(q['score'] for q in qs)==100
assert {k:sum(q['score'] for q in qs if q['kind']==k) for k in ['选择','填空','简答','计算']}=={'选择':20,'填空':10,'简答':20,'计算':50}
assert not {q['stem'] for q in qs}&{q['stem'] for q in a['questions']}
source=(R.parent/'计算机网络期中复习大纲.md').read_bytes();lines=source.decode().splitlines()
assert hashlib.sha256(source).hexdigest()==b['source_sha256']
for q in qs:
 assert sum(q.get('rubric',[q['score']]))==q['score']
 for ref in q['sources']:
  expected='# 第四章目录内容的基础补充' if ref['section']=='补充' else '## '+ref['section']+' '
  assert lines[ref['line']-1].startswith(expected)
# Q20: schedule every packet at every link, using exact rational milliseconds.
free=[Fraction(0)]*3;tf=[Fraction(1),Fraction(2),Fraction(1)];records=[]
for packet in range(4):
 arrive=Fraction(0);starts=[]
 for h in range(3):
  start=max(arrive,free[h]);starts.append(start);free[h]=start+tf[h];arrive=free[h]+Fraction(1,2)
 records.append((float(starts[1]),float(arrive)))
assert records==[(1.5,5.5),(3.5,7.5),(5.5,9.5),(7.5,11.5)]
assert [[float(row[1]),float(row[2])] for row in qs[19]['answer_table']['rows']]==[list(row) for row in records]
# Q21: integer polynomial division and end-around carry, independent of the lab engine.
def remainder(bits,g):
 word=int(bits,2);divisor=int(g,2)
 while word.bit_length()>=divisor.bit_length():word^=divisor<<(word.bit_length()-divisor.bit_length())
 return format(word,'0'+str(len(g)-1)+'b')
s=sum([0xF234,0x2345,0xABCD])
while s>0xffff:s=(s&0xffff)+(s>>16)
assert s==0xC147 and ((~s)&0xffff)==0x3EB8
assert remainder('110101100000','10011')=='0110'
assert remainder('110101100110','10011')=='0000'
assert remainder('010101100110','10011')=='1110'
# Q22: accept only consecutive data for GBN; buffer out-of-order data for SR.
for protocol,retransmissions in [('GBN',[2,3]),('SR',[2])]:
 expected=0;buffer=set();delivered=[]
 for frame in [0,1,3]+retransmissions:
  if protocol=='GBN':
   if frame==expected:delivered.append(frame);expected+=1
  else:
   if frame>=expected:buffer.add(frame)
   while expected in buffer:buffer.remove(expected);delivered.append(expected);expected+=1
 assert delivered==[0,1,2,3]
# Q23: verify orthogonality, decode superposition and derive the collision bound.
chips=[[1,1,1,1],[1,-1,1,-1],[1,1,-1,-1],[1,-1,-1,1]];signal=[1,1,-1,3]
for i,row in enumerate(chips):
 for j,other in enumerate(chips):assert sum(x*y for x,y in zip(row,other))==(4 if i==j else 0)
assert [sum(x*y for x,y in zip(signal,c))//4 for c in chips]==[1,-1,0,1]
assert Fraction(120,200000000)*2*100000000==120
# Q24: shortest paths, then independently check the designated side of each segment.
edges=[('B1','B2',4),('B1','B3',1),('B3','B2',1),('B2','B4',1),('B3','B4',5)]
graph={n:[] for n in ['B1','B2','B3','B4']}
for x,y,w in edges:graph[x].append((y,w));graph[y].append((x,w))
dist={n:float('inf') for n in graph};dist['B1']=0;queue=[(0,'B1')];parents={}
while queue:
 d,x=heapq.heappop(queue)
 if d!=dist[x]:continue
 for y,w in graph[x]:
  if d+w<dist[y]:dist[y]=d+w;parents[y]=x;heapq.heappush(queue,(d+w,y))
assert dist=={'B1':0,'B2':2,'B3':1,'B4':3}
assert parents=={'B2':'B3','B3':'B1','B4':'B2'}
blocked=[]
for x,y,w in edges:
 designated=min((x,y),key=lambda n:(dist[n],int(n[1:])))
 for owner,peer in [(x,y),(y,x)]:
  if owner!=designated and parents.get(owner)!=peer:blocked.append((owner,peer))
assert set(blocked)=={('B2','B1'),('B4','B3')}
# Q25: split data using absolute byte positions; MF inherits the parent's tail status.
def fragment(length,mtu,start=0,parent_mf=0):
 limit=((mtu-20)//8)*8;rows=[];cursor=0
 while cursor<length:
  n=min(limit,length-cursor);more=1 if cursor+n<length else parent_mf
  rows.append([n,n+20,(start+cursor)//8,more]);cursor+=n
 return rows
first=fragment(3000,1100);second=fragment(first[1][0],620,start=first[1][2]*8,parent_mf=first[1][3])
assert first==[[1080,1100,0,1],[1080,1100,135,1],[840,860,270,0]]
assert second==[[600,620,135,1],[480,500,210,1]]
for key,expected in [('answer_table',first),('answer_table2',second)]:assert [[int(v) for v in row[1:]] for row in qs[24][key]['rows']]==expected
# Subnet and aggregation facts in the conceptual questions.
assert ipaddress.ip_interface('10.20.5.70/26').network!=ipaddress.ip_interface('10.20.5.150/26').network
assert list(ipaddress.collapse_addresses([ipaddress.ip_network('198.51.100.0/25'),ipaddress.ip_network('198.51.100.128/25')]))==[ipaddress.ip_network('198.51.100.0/24')]
for kind in ['试卷','参考答案']:
 pdf=PdfReader(R/('计网期中模拟卷B-'+kind+'.pdf'));assert len(pdf.pages)==6
 assert all(abs(float(p.mediabox.width)-595.28)<1 and abs(float(p.mediabox.height)-841.89)<1 for p in pdf.pages)
 text=unicodedata.normalize('NFKC','\n'.join(p.extract_text() or '' for p in pdf.pages))
 assert len(text)>4500
 if kind=='试卷':
  for answer in ['参考答案与评分标准','3EB8','110101100110','11.5 ms']:assert answer not in text,answer
 else:
  for answer in ['3EB8','110101100110','1110','11.5']:assert answer in text,answer
 print('PASS:',kind,6,'A4 pages')
print('PASS: total scores, distinct questions, source lines, independent numeric/trace checks and answer separation')
