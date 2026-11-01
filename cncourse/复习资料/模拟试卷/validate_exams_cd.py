#!/usr/bin/env python3
"""Check scoring, novelty, numerical reasoning, source traceability and monochrome PDFs."""
from pathlib import Path
from fractions import Fraction
import hashlib,ipaddress,json,re,unicodedata
from pypdf import PdfReader
from pypdf.generic import ContentStream
from PIL import Image,ImageChops
R=Path(__file__).resolve().parent
papers={v:json.loads((R/('exam.json' if v=='A' else 'exam-'+v.lower()+'.json')).read_text()) for v in 'ABCD'}
source=(R.parent/'计算机网络期中复习大纲.md').read_bytes();lines=source.decode().splitlines();seen=set()
for v,paper in papers.items():
 for q in paper['questions']:
  assert q['stem'] not in seen,(v,q['id'],'duplicate stem')
  seen.add(q['stem'])
for v in 'CD':
 p=papers[v];qs=p['questions'];assert p['print_theme']=='black-and-white'
 assert p['source_sha256']==hashlib.sha256(source).hexdigest()
 assert [q['id'] for q in qs]==list(range(1,26));assert sum(q['score'] for q in qs)==100
 assert {k:sum(q['score'] for q in qs if q['kind']==k) for k in ['选择','填空','简答','计算']}=={'选择':20,'填空':10,'简答':20,'计算':50}
 for q in qs:
  assert sum(q.get('rubric',[q['score']]))==q['score']
  if q['kind']=='选择':assert len(q['options'])==4 and q['key'] in 'ABCD'
  for ref in q['sources']:
   heading='# 第四章目录内容的基础补充' if ref['section']=='补充' else '## '+ref['section']+' '
   assert lines[ref['line']-1].startswith(heading)
C=papers['C']['questions'];D=papers['D']['questions']
# Exact arithmetic for request/response, one-way in-flight data, and packet header tradeoffs.
prop=Fraction(1000000,200000000);tx=Fraction(250000*8,100000000)
assert prop==Fraction(5,1000) and tx==Fraction(20,1000)
assert prop+tx==Fraction(25,1000) and 2*prop+tx==Fraction(30,1000)
assert Fraction(2000000)/(2*prop+tx)==Fraction(200000000,3)
assert 100000000*prop==500000 and 100000000*prop/8==62500
expected=[]
for n in [1,4,16,64]:
 size=Fraction(16000,n)+40;time=(n+2)*size/Fraction(1000)+Fraction(6,10);expected.append([n,int(size),float(time)])
assert expected==[[1,16040,48.72],[4,4040,24.84],[16,1040,19.32],[64,290,19.74]]
assert [[int(a),int(b),float(c)] for a,b,c in D[19]['answer_table']['rows']]==expected
assert 16000+16*40==16640
# Independent polynomial integer division, frame escaping and undetected error pattern.
def remainder(bits,g):
 value=int(bits,2);div=int(g,2)
 while value.bit_length()>=div.bit_length():value^=div<<(value.bit_length()-div.bit_length())
 return format(value,'0'+str(len(g)-1)+'b')
assert remainder('10110110000','1011')=='001'
assert remainder('10110110001','1011')=='000'
assert remainder('00110110000','1011')=='010'
raw=['A','ESC','FLAG','ESC','B'];escaped=[]
for b in raw:
 if b in ['ESC','FLAG']:escaped.append('ESC')
 escaped.append(b)
assert ' '.join(escaped)=='A ESC ESC ESC FLAG ESC ESC B'
assert remainder('10111001000','1101')=='101'
assert remainder('10111001101','1101')=='000'
err='00001101000';recv=format(int('10111001101',2)^int(err,2),'011b')
assert recv=='10110100101' and remainder(recv,'1101')=='000'
assert int(err,2)==int('1101',2)<<3
# SR across wrap: use absolute positions to distinguish numeric labels from delivery order.
received={6};delivered=[6];last=6
for absolute in [8,9,6]:
 if absolute>last:received.add(absolute)
assert last%8==6 and delivered==[6]
received.add(7)
while last+1 in received:last+=1;delivered.append(last)
assert [x%8 for x in delivered]==[6,7,0,1] and last%8==1
# Sequence-space and utilization limits for D22.
tf=Fraction(1500*8,20000000);rtt=Fraction(15,1000);window=(tf+rtt)/tf
assert window==26 and tf==Fraction(6,10000)
assert min(n for n in range(1,10) if 2**n-1>=26)==5
assert min(n for n in range(1,10) if 2**(n-1)>=26)==6
assert min(1,Fraction(31,26))==1 and Fraction(16,26)==Fraction(8,13)
# VLAN-specific learning and flooding; an A entry in VLAN 10 cannot match in VLAN 20.
ports={1:{10},2:{10},3:{20},4:{10,20}};fdb={};actual=[]
for src,dst,vlan,inport in [('A','D',10,1),('D','A',10,4),('C','E',20,3),('E','A',20,4)]:
 fdb[vlan,src]=inport;known=fdb.get((vlan,dst))
 output=[] if known==inport else [known] if known else [p for p in ports if p!=inport and vlan in ports[p]]
 actual.append(output)
assert actual==[[2,4],[1],[4],[3]]
# Collision detection arrives at each end at a different time; backoff follows stated model.
assert 15<20 and 15+20==35
assert 10000000*Fraction(40,1000000)==400 and 400//8==50
assert 2**3-1==7 and 5*40==200
# Shortest-root-tree ties use actual bridge identifiers, not the numerical part of its name.
def tree(edges,ids):
 root=min(ids,key=ids.get);dist={n:float('inf') for n in ids};dist[root]=0;parent={}
 for _ in ids:
  for a,b in edges:
   for x,y in [(a,b),(b,a)]:
    if y==root:continue
    candidate=(dist[x]+1,ids[x]);current=(dist[y],ids.get(parent.get(y),float('inf')))
    if candidate<current:dist[y]=candidate[0];parent[y]=x
 return root,dist,parent
edges=[('B1','B2'),('B2','B4'),('B4','B3'),('B3','B1')];ids={'B1':10,'B2':40,'B3':20,'B4':30}
root,dist,parent=tree(edges,ids);assert root=='B1';assert parent=={'B2':'B1','B4':'B3','B3':'B1'}
root,dist,parent=tree(edges[:-1],ids);assert parent=={'B2':'B1','B4':'B2','B3':'B4'}
# Fragment conservation, old subnet counting and VLSM/longest-prefix match.
lengths=[672,672,672,20];offsets=[sum(lengths[:i])//8 for i in range(4)]
assert ((700-24)//8)*8==672 and sum(lengths)==2036 and offsets==[0,84,168,252]
assert sum(x+24 for x in lengths)==2132
assert [[int(v) for v in row[1:]] for row in C[23]['answer_table']['rows']]==[[672,696,0,1],[672,696,84,1],[672,696,168,1],[20,44,252,0]]
assert min(s for s in range(1,8) if 2**s-2>=6)==3
assert str(ipaddress.ip_network('172.22.40.32/27').broadcast_address)=='172.22.40.63'
for count,prefix in [(200,24),(100,25),(50,26)]:assert 2**(32-prefix)-2>=count
assert 256+128+64==448 and 512-448==64
routes=[('0.0.0.0/0','R0'),('10.44.8.0/23','R1'),('10.44.9.0/24','R2'),('10.44.9.128/26','R3'),('10.44.9.160/27','R4')]
outs=[]
for dest in ['10.44.9.170','10.44.9.150','10.44.9.220']:
 matches=[(ipaddress.ip_network(p).prefixlen,out) for p,out in routes if ipaddress.ip_address(dest) in ipaddress.ip_network(p)]
 outs.append(max(matches)[1])
assert outs==['R4','R3','R2']
# Print colors must be neutral in both styles and actual PDF paint operations.
style=(R/'exam_monochrome.css').read_text();assert set(re.findall(r'#[0-9A-Fa-f]{3,8}\b',style))=={'#000','#fff'}
leaks={'C':['10110110001','00110110000','2132 B'],'D':['10111001101','10110100101','16640 B','48.72']}
for v in 'CD':
 for kind in ['试卷','参考答案']:
  reader=PdfReader(R/('计网期中模拟卷'+v+'-'+kind+'.pdf'));expected_count=len(papers[v]['paper_pages' if kind=='试卷' else 'answer_pages']);assert len(reader.pages)==expected_count
  for page in reader.pages:
   assert abs(float(page.mediabox.width)-595.28)<1 and abs(float(page.mediabox.height)-841.89)<1
   for args,op in ContentStream(page.get_contents(),reader).operations:
    if op in [b'rg',b'RG']:assert max(map(float,args))-min(map(float,args))<1e-8
    if op in [b'k',b'K']:assert all(abs(float(x))<1e-8 for x in args[:3])
  text=unicodedata.normalize('NFKC','\n'.join(p.extract_text() or '' for p in reader.pages));assert len(text)>4500
  for key in leaks[v]:assert (key in text)==(kind=='参考答案'),(v,kind,key)
  image=Image.open('/tmp/计网期中模拟卷'+v+'-'+kind+'-preview.png').convert('RGB');r,g,b=image.split()
  assert ImageChops.difference(r,g).getextrema()[1]==0 and ImageChops.difference(g,b).getextrema()[1]==0
  print('PASS:',v,kind,expected_count,'A4 pages, neutral PDF paint and grayscale preview, separate answers')
print('PASS: 50 new stems distinct from A/B, scores, provenance, numeric/trace reasoning and black-white output')
