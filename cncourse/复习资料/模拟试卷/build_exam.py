#!/usr/bin/env python3
"""Build a source-backed 100-point networking mock exam and a separate answer booklet."""
from pathlib import Path
import hashlib, html, json
R=Path(__file__).resolve().parent
source=R.parent/'计算机网络期中复习大纲.md'
def q(i,kind,score,stem,**kwargs):return dict(id=i,kind=kind,score=score,stem=stem,**kwargs)
qs=[
q(1,'选择',2,'关于协议、服务与分层，下列说法正确的是：',options=[
'协议描述本系统中下层向上层提供的能力，服务描述不同系统间的规则。',
'协议约束不同系统的对等实体；服务是本系统下层向上层提供的能力。',
'所有以 RFC 形式发布的文档都是正式 Internet 标准。',
'路由器每转发一个 IP 数据报，都必须解封到应用层。'],key='B',answer=['协议横向约束对等实体，服务纵向描述层间能力。RFC 还可能是信息性、实验性等文档。'],ref='1.4;1.5'),
q(2,'选择',2,'某信道带宽为 4000 Hz，信噪比为 20 dB。按香农公式，其容量上限的正确表达式为：',options=['4000 × log₂(21) bit/s','8000 × log₂(2) bit/s','4000 × log₂(101) bit/s','4000 × 100 bit/s'],key='C',answer=['先换算线性功率比 S/N=10^(20/10)=100，再算 C=4000 log₂(101)≈26.63 kb/s。'],ref='2.1'),
q(3,'选择',2,'规定 Manchester 编码中，1 为高→低，0 为低→高。比特串 10 在两个位周期内的半位电平依次是：',options=['高、低｜低、高','低、高｜高、低','高、高｜低、低','低、低｜高、高'],key='A',answer=['逐位映射：1→高低，0→低高；每个位中点都有跳变。'],ref='2.2'),
q(4,'选择',2,'接收方用约定生成多项式对收到的 CRC 码字作模 2 除法，余数为 0。下列判断正确的是：',options=['已自动纠正所有发生的比特错误。','可以证明此次传输绝对没有差错。','CRC 会自动发起重传，保证可靠交付。','本次未检出差错，但仍存在漏检的可能。'],key='D',answer=['错误多项式恰为生成式的倍数时可能漏检；CRC 本身不负责纠错或重传。'],ref='2.5'),
q(5,'选择',2,'理想同步正交 CDMA 中，用户 A 的码片为 (1,−1,1,−1)，B 为 (1,1,−1,−1)。发送 1 用原向量，发送 0 用负向量，静默用零向量。收到 S=(0,−2,2,0)，则：',options=['A、B 均发送 1。','A 发送 1，B 发送 0。','A 发送 0，B 发送 1。','A 发送 1，B 静默。'],key='B',answer=['S·A/4=(0+2+2+0)/4=1；S·B/4=(0−2−2+0)/4=−1。−1 表示发送 0，0 才表示静默。'],ref='2.7'),
q(6,'选择',2,'关于以太网和共享介质，下列说法正确的是：',options=['CSMA 侦听到空闲后开始发送，就一定不会碰撞。','CSMA/CA 的“碰撞避免”保证完全没有碰撞。','现代交换式全双工以太网不需要进行 CSMA/CD 式的共享碰撞检测竞争。','Hub 通过读取目的 MAC，只从目标所在端口转发信号。'],key='C',answer=['CSMA/CD 主要适用于传统共享式半双工以太网；传播时延与隐藏终端等使本地侦听不等于全网无冲突。'],ref='2.8'),
q(7,'选择',2,'关于三张网络表，下列对应正确的是：',options=['FIB：目的前缀 → 下一跳或出接口。','交换机 FDB：IPv4 地址 → 本地链路 MAC。','ARP Cache：目的前缀 → 路由出口。','FIB：源 MAC → 交换机入端口。'],key='A',answer=['FDB 记录 MAC→端口；ARP Cache 记录本链路 IP→MAC；FIB 记录前缀→下一跳/接口。'],ref='3.1;4.2'),
q(8,'选择',2,'二层交换机端口 1、2 属于 VLAN 10，端口 3、4 属于 VLAN 20。所有端口允许转发，没有 VLAN 间三层转发。端口 1 收到有效广播帧，应从哪些端口发出？',options=['2、3、4','1、2','3、4','仅端口 2'],key='D',answer=['只在所属 VLAN 的其他允许端口泛洪，排除入端口；不能直接传播到 VLAN 20。'],ref='3.3'),
q(9,'选择',2,'某 IPv4 数据报 IHL=7、Total Length=1500 B。其数据部分长度及首部校验和覆盖范围分别为：',options=['1472 B；仅 IP 首部。','1480 B；仅 IP 首部。','1472 B；整个 IP 数据报。','1493 B；整个 IP 数据报。'],key='A',answer=['IHL 单位为 4 B，首部长 28 B，数据为 1500−28=1472 B；首部校验和不覆盖载荷。'],ref='4.3'),
q(10,'选择',2,'依据提纲中的基础补充，下列说法正确的是：',options=['RIP 中距离 16 表示仍可正常到达。','只要使用 VPN 隧道，就必然实现全部内容的端到端加密。','NAT 与防火墙是同一种机制。','IGMP 用于 IPv4 主机与相邻多播路由器之间的组成员管理。'],key='D',answer=['RIP 的 16 表示不可达；隧道不自动等于加密；NAT 不等于防火墙；IGMP 不负责全网最短路径计算。'],ref='补充'),
q(11,'填空',2,'DSL 的中文名称是________；FTTH 的中文含义是________。',key='数字用户线路；光纤到户',answer=['每空 1 分。'],ref='1.2'),
q(12,'填空',2,'比特填充遇到连续________个 1 后插入 0；普通无 VLAN 的 Ethernet II MAC 帧最短为________ B（不计前导码和帧开始定界符）。',key='5；64',answer=['每空 1 分。最短 MAC 帧包含 14 B 首部、46 B 数据及填充、4 B FCS。'],ref='2.4;2.8'),
q(13,'填空',2,'标准 CRC 生成多项式的最高次数为 5，其二进制表示长度为________ bit；所附 CRC 校验位长度为________ bit。',key='6；5',answer=['每空 1 分。次数 r 对应生成式 r+1 位、余数 r 位。'],ref='2.5'),
q(14,'填空',2,'以太网＋IPv4 的 ARP 报文中，硬件地址长度 HLen=________，协议地址长度 PLen=________；两个字段均以字节为单位。',key='6；4',answer=['每空 1 分。不能把地址的 48、32 比特长度填入这两个字段。'],ref='4.2'),
q(15,'填空',2,'从父网借 3 位划分等长子网，现代常规 CIDR 口径可使用________个子网；若题目明确采用提纲中的 RFC 950 旧计数规则，则为________个。',key='8；6',answer=['每空 1 分。分别用 2³ 和 2³−2；不要与单个子网的主机数减 2 混淆。'],ref='4.5'),
q(16,'简答',5,'解释 P2P 为什么可能比纯 C/S 更适合向大量用户分发同一文件。用户增多是否意味着不再需要服务器，也不受带宽限制？',answer=[
'纯 C/S 的服务器出站上传能力可能成为瓶颈。（1 分）',
'P2P 用户可把已经缓存的片段上传给其他用户，新增用户也可能带来上传能力和副本。（2 分）',
'实际收益受在线情况、片段可用性、上传/下载带宽和调度影响，并非无限扩展。（1 分）',
'混合 P2P 仍可依赖管理或协调服务器；用户上传片段不要求其原创。（1 分）'],rubric=[1,2,1,1],ref='1.2'),
q(17,'简答',5,'主机 A 经透明二层交换机 S、路由器 R 向异网主机 B 发包。假设不使用 NAT，且没有其他地址改写或隧道。说明第一跳与第二跳的源/目的 MAC、IP 地址如何变化，并指出 S 是否应改写源 MAC。',answer=[
'第一跳（A→R，经 S）源 MAC 为 A，目的 MAC 为 R 同侧接口。（1 分）',
'S 透明转发帧，不把源 MAC 改成 S 自己的 MAC。（1 分）',
'第二跳（R→B）源 MAC 为 R 出接口，目的 MAC 为 B。（1 分）',
'两跳 IP 源/目的均为 A/B，保持原通信端点。（1 分）',
'R 解开入链路封装并为出链路重新组帧；TTL 改变，首部校验和也需更新。（1 分）'],rubric=[1,1,1,1,1],ref='4.1;4.2;4.3'),
q(18,'简答',5,'Wi-Fi 为什么采用碰撞避免而不直接照搬传统以太网的碰撞检测？简述竞争退避、ACK 和可选 RTS/CTS 的作用，并解释“碰撞避免”为什么仍不能保证无碰撞。',answer=[
'无线发送时本机信号远强于远端信号，难以边发边可靠检测碰撞；隐藏终端又让本地侦听不能代表接收端。（2 分）',
'按规则等待 DIFS 并随机退避；遇忙冻结计数，重新空闲满足间隔后继续。（1 分）',
'发送后等 ACK，未获 ACK 按失败重试；RTS/CTS 可用于预约和缓解隐藏终端，并非所有帧必须使用。（1 分）',
'不同站仍可能选中同一退避槽等，因此仍可能碰撞。（1 分）'],rubric=[2,1,1,1],ref='2.8'),
q(19,'简答',5,'B1、B2、B3 的桥标识依次为 100、200、300，两两之间有独立等代价链路。按课件简化 STP 模型：谁是根桥，哪一端口阻塞？B1—B3 断开并重新收敛后，原阻塞端口怎样变化？STP 是否就是以总边权最小为目标的 Kruskal 算法？',answer=[
'B1 的标识最小，是根桥。（1 分）',
'B2、B3 均直连根；在 B2—B3 网段上路径代价相同，B2 标识小为指派桥，B3 侧端口阻塞。（1 分）',
'B1—B3 断开后，B3 经 B2 到根，原 B3→B2 端口成为根端口并转发。（1 分）',
'STP 先选根并选到根的优先路径和各网段指派端口；并非全图总边权最小的 Kruskal。此等权小例子可能也形成最小树，不能据此等同两种机制。（2 分）'],rubric=[1,1,1,2],ref='3.2'),
q(20,'计算',8,'A 经两个存储转发路由器向 B 发送一个 12 Mbit 文件。路径共 3 条串行链路，每条速率均为 10 Mb/s、单程传播时延均为 2 ms。文件切成 6 个等长分组，每组 2 Mbit；源连续发送，各跳收齐一组才转发，缓存足够。忽略首部、处理、排队及 ACK 开销。',parts=[
'求单个分组的发送时延，以及每条链路的传播时延，统一写成秒。（2 分）',
'第一分组的最后一比特何时到达 B？（2 分）',
'整个文件的最后一比特何时到达 B？写出流水线过程或适用公式。（3 分）',
'只把链路速率增大 10 倍，传播距离和介质不变，传播时延是否缩短？说明原因。（1 分）'],answer=[
'单组发送时延 t=2/10=0.2 s；每链路传播时延 0.002 s。两项各 1 分。',
'首组末比特到达需 3×(0.2+0.002)=0.606 s。式与结果各 1 分。',
'首组到达后，每隔 0.2 s 到达下一组；总时间 0.606+5×0.2=1.606 s。等价公式 (P+H−1)L/R+Σ传播=(6+3−1)×0.2+3×0.002。流水关系/公式 2 分，结果 1 分。',
'不缩短。传播时延 d/v 由距离和介质传播速度决定；增加速率只缩短发送时延。1 分。'],rubric=[2,2,3,1],ref='1.1;1.3',space=100),
q(21,'计算',8,'分别完成比特填充和 CRC 运算。以下序列均按从左至右的顺序书写；CRC 使用模 2 除法。',parts=[
'数据部分为 11111011111，写出按“五个 1 后插 0”得到的填充序列。本问不添加首尾标志。（2 分）',
'CRC 数据 M=110101，生成式 G=1011。求 CRC 余数及实际发送码字，写出主要 XOR 步骤。（3 分）',
'仅将上问发送码字的最后一位翻转。写出接收序列、接收除法余数及检错结论。（2 分）',
'若某次 CRC 检查余数为 0，能否保证完全无错？说明理由。（1 分）'],answer=[
'填充后为 1111100111110。两组五个 1 后各插一个 0；每处正确 1 分。',
'G 次数为 3，先补零得 110101000。依次 XOR 后：011001000 → 001111000 → 000100000 → 000001100 → 000000111。余数 111，发送 110101111。补零及正确运算步骤 1 分，余数 1 分，发送码字 1 分。',
'接收 110101110；除以 1011 得余数 001，非零，检测到差错。接收序列 0.5 分，余数 1 分，结论 0.5 分。',
'不能保证。若差错多项式恰好能被生成式整除，仍会得到零余数而漏检。1 分。'],rubric=[2,3,2,1],ref='2.4;2.5',space=100),
q(22,'计算',8,'链路速率 4 Mb/s，帧长 1000 B，RTT₀=18 ms；RTT₀ 不包含当前数据帧的发送时间，忽略 ACK 发送与处理开销。序号字段为 3 bit。前 3 问按无差错稳定发送分析。',parts=[
'求停等协议的理想利用率。（2 分）',
'若暂不考虑序号空间限制，保持发送端连续发送的最小窗口是多少帧？（2 分）',
'标准 GBN 的最大发送窗、等大发送接收窗 SR 的最大窗口分别是多少？能否在本题条件下满速？（2 分）',
'改为停等：接收方已交付序号 0 的帧，但 ACK 0 丢失。发送方超时后和接收方再次收到帧 0 时，各应做什么？（2 分）'],answer=[
'tf=8000/(4×10⁶)=2 ms（1 分）；U=2/(2+18)=10%（1 分）。',
'Wmin=ceil((2+18)/2)=10 帧。公式与结果各 1 分。',
'GBN≤2³−1=7；等窗 SR≤2²=4。各 0.5 分；两者都小于所需 10，因此都不能满速（1 分）。若给出利用率 70%、40%，也能支持结论。',
'发送方超时重发帧 0（1 分）；接收方用序号判重复，不再向上交付，但再次发送 ACK 0（1 分，三层意思须完整）。'],rubric=[2,2,2,2],ref='2.6',space=100),
q(23,'计算',8,'一台四端口交换机初始动态 FDB 为空。A 接端口 1；B、C 在端口 2 后同一共享网段；D 接端口 3；端口 4 在同一 VLAN 中并允许转发。所有帧均有效，表项不老化。依次发生下列传输。逐帧填写本次学习结果和转发端口；不转发时写“过滤”。每行 2 分。',table=dict(headers=['顺序 / 帧','入端口','本次源地址学习','输出端口或动作'],rows=[['1. B→D','2','________','________'],['2. D→B','3','________','________'],['3. C→B','2','________','________'],['4. A→D','1','________','________']]),answer=[
'每行源学习与输出动作各 1 分。顺序不能交换，学习看源、查询看目的。',
'第 3 帧已在 B 所在共享网段出现，因此交换机不应把它再次转发到其他端口。此解释用于帮助理解，不额外计分。'],answer_table=dict(headers=['帧','本次学习','输出动作'],rows=[['B→D','B→2','D 未知，向 1、3、4 泛洪'],['D→B','D→3','已知 B，仅从 2 出'],['C→B','C→2','B 也在入端口 2，过滤'],['A→D','A→1','已知 D，仅从 3 出']]),rubric=[8],ref='3.1',space=50),
q(24,'计算',9,'一个 IPv4 数据报的数据部分为 4200 B，原首部为 24 B（IHL=6），DF=0。出链路 MTU 为 1300 B，要求尽量装满各片。假定每个分片的首部均为 24 B，选项复制等处理已包含在此假设中。',parts=[
'非最后一片最多装多少字节数据？为什么不能直接用 MTU 减首部的结果？（2 分）',
'填写所有分片的数据长、IP 总长、片偏移字段值与 MF。（4 分）',
'全部分片合计发送多少字节 IP 层数据？（1 分）',
'若原数据报改为 DF=1，遇到同一出链路时应如何处理？（2 分）'],table=dict(headers=['分片','数据长 / B','IP 总长 / B','片偏移字段','MF'],rows=[[str(i),'________','________','________','____'] for i in range(1,5)]),answer=[
'Dmax=8×floor((1300−24)/8)=1272 B。直接相减得 1276，不是 8 的倍数；非末片数据须 8 B 对齐。公式/结果与对齐原因各 1 分。',
'下表每行 1 分，四个字段各 0.25 分；片偏移乘 8 应得到原数据起始位置。各片标识相同。',
'合计 4200+4×24=4296 B。相对未分片的 4224 B 增加 72 B 首部。1 分。',
'不能分片，应丢弃（1 分）；通常用 ICMP 提示“需要分片但 DF 已置位”（1 分）。'],answer_table=dict(headers=['片','数据长 / B','总长 / B','偏移字段','MF'],rows=[['1','1272','1296','0','1'],['2','1272','1296','159','1'],['3','1272','1296','318','1'],['4','384','408','477','0']]),rubric=[2,4,1,2],ref='4.3;4.4',space=90),
q(25,'计算',9,'使用现代 CIDR 口径。给定父网 192.168.60.0/24，三个部门分别需要 60、28、12 个普通可用主机地址，需求已包含网关等接口。',parts=[
'用 VLSM 按需求从大到小，从父网低地址开始紧凑分配，填写网络/前缀、可用主机范围与广播地址。不得重叠或越界。（4 分）',
'路由器具有下列转发表。分别为目的 192.168.60.105、192.168.60.106、192.168.60.80、192.168.60.150、8.8.8.8 选择出口。写明所匹配的最长前缀。（5 分）'],table=dict(headers=['部门需求','网络 / 前缀','可用主机范围','广播地址'],rows=[['60','________','________','________'],['28','________','________','________'],['12','________','________','________']]),table2=dict(headers=['目的前缀','出口'],rows=[['0.0.0.0/0','R0'],['192.168.60.0/24','R1'],['192.168.60.64/26','R2'],['192.168.60.96/28','R3'],['192.168.60.105/32','R4']]),answer=[
'三个部门分别需 6、5、4 个主机位，分配 /26、/27、/28。每个部门整行正确各 1 分；按要求对齐、紧凑且不重叠、越界 1 分。',
'最长前缀匹配见第二张表。每个目的的最长前缀与出口均正确得 1 分；二者只对其一得 0.5 分。/32 主机路由优先于 /28。'],answer_table=dict(headers=['需求','网络 / 前缀','可用范围','广播'],rows=[['60','192.168.60.0/26','.1–.62','192.168.60.63'],['28','192.168.60.64/27','.65–.94','192.168.60.95'],['12','192.168.60.96/28','.97–.110','192.168.60.111']]),answer_table2=dict(headers=['目的地址','最长匹配前缀','出口'],rows=[['192.168.60.105','192.168.60.105/32','R4'],['192.168.60.106','192.168.60.96/28','R3'],['192.168.60.80','192.168.60.64/26','R2'],['192.168.60.150','192.168.60.0/24','R1'],['8.8.8.8','0.0.0.0/0','R0']]),rubric=[4,5],ref='4.5;4.6',space=65)
]
assert len(qs)==25 and sum(x['score'] for x in qs)==100
for x in qs:
 if 'rubric' in x:assert sum(x['rubric'])==x['score'],x['id']
# Resolve section provenance to exact source lines; keep it out of the question paper.
lines=source.read_text().splitlines()
for x in qs:
 refs=[]
 for ref in x['ref'].split(';'):
  pattern='# 第四章目录内容的基础补充' if ref=='补充' else '## '+ref+' '
  line=next(i+1 for i,s in enumerate(lines) if s.startswith(pattern))
  refs.append(dict(section=ref,line=line))
 x['sources']=refs
meta=dict(title='计算机网络期中模拟试卷 A',duration=120,score=100,source='cncourse/复习资料/计算机网络期中复习大纲.md',source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),questions=qs)
(R/'exam.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
E=html.escape
def table(t):return '<table><thead><tr>'+''.join('<th>'+E(c)+'</th>' for c in t['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+E(str(c))+'</td>' for c in row)+'</tr>' for row in t['rows'])+'</tbody></table>'
def question(x,answers=False):
 out='<article class="question"><h3>'+str(x['id'])+'. '+E(x['stem'])+' <span class="points">（'+str(x['score'])+' 分）</span></h3>'
 if answers:
  if 'key' in x:out+='<p class="key">答案：'+E(x['key'])+'</p>'
  if 'answer_table' in x:out+=table(x['answer_table'])
  if 'answer_table2' in x:out+=table(x['answer_table2'])
  out+='<ul class="solutions">'+''.join('<li>'+E(s)+'</li>' for s in x['answer'])+'</ul>'
  out+='<p class="reference">提纲出处：'+E('；'.join(('基础补充' if r['section']=='补充' else '§ '+r['section'])+'，第 '+str(r['line'])+' 行' for r in x['sources']))+'</p>'
 else:
  if 'options' in x:out+='<div class="options">'+''.join('<p><b>'+chr(65+i)+'.</b> '+E(t)+'</p>' for i,t in enumerate(x['options']))+'</div>'
  if 'parts' in x:out+='<ol class="parts">'+''.join('<li>'+E(s)+'</li>' for s in x['parts'])+'</ol>'
  if 'table' in x:out+=table(x['table'])
  if 'table2' in x:out+='<p class="subcaption">第（2）问使用的转发表：</p>'+table(x['table2'])
  if x['id']==25:out+='<p class="subcaption">第（2）问作答：</p>'+table(dict(headers=['目的地址','最长匹配前缀','出口'],rows=[[ip,'________','____'] for ip in ['192.168.60.105','192.168.60.106','192.168.60.80','192.168.60.150','8.8.8.8']]))
  if x['kind']=='简答':out+='<div class="write-space" style="height:120px"></div>'
  elif x['kind']=='计算':out+='<div class="write-space" style="height:'+str(x.get('space',45))+'px"></div>'
 out+='</article>'
 return out
style='''
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#edf0f3;color:#172535;font-family:'Noto Serif CJK SC','Noto Sans CJK SC',serif;font-size:10pt;line-height:1.65}.sheet{position:relative;width:210mm;height:297mm;margin:16px auto;background:white;padding:13mm 15mm 17mm;break-after:page;box-shadow:0 4px 30px #10203014}.sheet:last-child{break-after:auto}.running-head{display:flex;justify-content:space-between;border-bottom:1px solid #193b5a;padding-bottom:5px;color:#415b70;font-size:8pt;letter-spacing:.03em}h1{text-align:center;font-size:20pt;margin:15px 0 4px;font-weight:700}.subtitle{text-align:center;font-size:10pt;color:#476077;margin:0 0 10px}.identity{display:flex;justify-content:space-between;padding:7px 0;font-size:9pt;border-bottom:1px solid #d7dee4}.instructions{font-size:8.6pt;line-height:1.7;margin:9px 0 13px}.instructions p{margin:4px 0}.section-title{font-size:12pt;color:#193b5a;border-left:3px solid #193b5a;padding:3px 8px;background:#f2f5f7;margin:13px 0 9px}.question{margin:10px 0 13px}.question h3{font-size:9.6pt;font-weight:500;line-height:1.7;margin:0 0 6px}.points{font-weight:600;white-space:nowrap}.options{display:grid;grid-template-columns:1fr;gap:0 12px;margin-left:16px;font-size:9.2pt}.options p{margin:1px 0}.parts{padding-left:23px;margin:5px 0;font-size:9.2pt}.parts li{padding-left:1px;margin:4px 0}table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:9px 0}th,td{border:1px solid #9daeba;padding:5px 7px;text-align:left;vertical-align:middle}th{font-weight:600;background:#f2f5f7}.write-space{background:repeating-linear-gradient(transparent,transparent 23px,#e4e9ee 23px,#e4e9ee 24px);margin-top:8px}.footer{position:absolute;bottom:7mm;left:15mm;right:15mm;border-top:1px solid #d7dee4;padding-top:5px;display:flex;justify-content:space-between;font-size:8pt;color:#607383}.answer h3{font-size:9.2pt}.answer .question{margin:9px 0 12px}.answer ul{padding-left:18px;margin:5px 0;font-size:9pt}.answer li{margin:4px 0}.key{font-weight:600;color:#173e61;margin:4px 0;font-size:9pt}.reference{font-family:'Noto Sans CJK SC',sans-serif;color:#647487;font-size:7.4pt;margin:4px 0}.answer .running-head{color:#3c566b}.subcaption{font-size:8.5pt;margin:8px 0 0}.notice{font-size:9pt;line-height:1.8;border:1px solid #cbd6df;background:#f6f8fa;padding:8px 11px;margin-top:10px}.compact .question{margin:8px 0}.compact .question h3{font-size:9.3pt}.compact .options{font-size:9pt}.answer-key-table td,.answer-key-table th{text-align:center}@media print{body{background:white}.sheet{margin:0;box-shadow:none}}@media screen and (max-width:820px){.sheet{transform-origin:top left;width:100%;height:auto;min-height:297mm;padding:22px 18px 60px}.identity{flex-wrap:wrap;gap:12px}}
'''
sections={1:'一、单项选择题（每题 2 分，共 20 分）',11:'二、填空题（每空 1 分，共 10 分）',16:'三、简答题（每题 5 分，共 20 分）',20:'四、计算与过程题（共 50 分，须写过程）'}
paper_pages=[list(range(1,6)),list(range(6,16)),list(range(16,20)),[20,21,22],[23,24],[25]]
answer_pages=[list(range(1,11)),list(range(11,18)),[18,19,20],[21,22],[23,24],[25]]
def doc(answers=False):
 pages=answer_pages if answers else paper_pages;all_pages=[]
 for pi,ids in enumerate(pages):
  content='<div class="running-head"><span>计算机网络 · 第一至四章</span><span>'+('参考答案与评分标准' if answers else '期中模拟试卷 A · 100 分 / 120 分钟')+'</span></div>'
  if pi==0:
   content+='<h1>'+('参考答案与评分标准' if answers else '计算机网络期中模拟试卷 A')+'</h1><p class="subtitle">'+('建议完成试卷后再打开 · 总分 100 分' if answers else '第一至四章 · 100 分 · 建议用时 120 分钟')+'</p>'
   if answers:content+='<div class="notice">评分原则：计算题按过程给分；非关键算术错误可保留正确方法分。后问沿用前问错误数值但方法正确时，不重复扣同一错误。简答题表述等价、机制正确可得分。补充框架题只按本卷明确要求评分。</div>'
   else:content+='<div class="identity"><span>姓名：____________</span><span>班级：____________</span><span>日期：____________</span></div><div class="instructions"><p>1. 本卷依据现有计网期中提纲编写，正文范围为第一至四章；目录补充只考基础辨析，不涉及第五章专门机制。</p><p>2. 本卷 25 题。单选只有一个正确选项；计算与过程题请保留单位和中间步骤，可使用普通计算器。</p><p>3. 无另行说明时，1 B=8 bit，M=10⁶，KB/MB 按十进制；各题局部假设优先。答案空间不足可另附纸。</p></div>'
  for id in ids:
   if id in sections:content+='<h2 class="section-title">'+sections[id]+'</h2>'
   elif id in [6,25] and not answers:content+='<h2 class="section-title">'+('一、单项选择题（续）' if id==6 else '四、计算与过程题（续）')+'</h2>'
   if answers and id<=15:
    x=qs[id-1];content+='<article class="question"><h3><b>'+str(id)+'. '+E(x['key'])+'</b> <span class="points">（'+str(x['score'])+' 分）</span></h3><p style="font-size:8.7pt;margin:3px 0">'+E(' '.join(x['answer']))+'</p></article>'
   else:content+=question(qs[id-1],answers)
  if answers and pi==len(pages)-1:
   content+='<div class="notice"><b>按失分点回到模型复盘</b><br>时延题 →「时延与交换」；填充/CRC →「组帧」「CRC 与检错」；滑窗 →「ARQ」；学习表/环路 →「交换机」「生成树」；分片 →「IPv4 分片」；地址规划 →「子网与地址规划」「路由、ARP 与 TTL」。<br>在线实验：https://zxymao.github.io/Chatgpt/cncourse/network-lab/</div><p class="reference">来源文件：'+E(meta['source'])+'<br>SHA-256：'+meta['source_sha256']+'</p>'
  all_pages.append('<section class="sheet '+('answer' if answers else '')+(' compact' if pi in [0,1] else '')+'"><div class="content">'+content+'</div><div class="footer"><span>NET / FIELD · '+('模拟卷 A 参考答案' if answers else '模拟卷 A · 试卷不含答案')+'</span><span>第 '+str(pi+1)+' / '+str(len(pages))+' 页</span></div></section>')
 return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+('计网期中模拟卷A-参考答案' if answers else '计网期中模拟卷A-试卷')+'</title><style>'+style+'</style></head><body>'+''.join(all_pages)+'</body></html>'
for answers in [False,True]:
 stem='计网期中模拟卷A-'+('参考答案' if answers else '试卷')
 (R/(stem+'.html')).write_text(doc(answers))
 md='# '+('参考答案与评分标准' if answers else meta['title'])+'\n\n第一至四章｜100 分｜120 分钟\n\n'
 if not answers:md+='1 B=8 bit，M=10⁶；计算题写过程和单位，答案空间不足可另附纸。\n\n'
 def mdtable(t):return '|'+ '|'.join(t['headers'])+'|\n|'+ '|'.join('---' for _ in t['headers'])+'|\n'+''.join('|'+ '|'.join(str(v) for v in row)+'|\n' for row in t['rows'])+'\n'
 for x in qs:
  if x['id'] in sections:md+='## '+sections[x['id']]+'\n\n'
  md+='### '+str(x['id'])+'. '+x['stem']+'（'+str(x['score'])+' 分）\n\n'
  if answers:
   if 'key' in x:md+='**答案：'+x['key']+'**\n\n'
   for key in ['answer_table','answer_table2']:
    if key in x:md+=mdtable(x[key])
   md+='\n'.join('- '+line for line in x['answer'])+'\n\n'
   md+='提纲出处：'+', '.join(('基础补充' if r['section']=='补充' else '§ '+r['section'])+'（第 '+str(r['line'])+' 行）' for r in x['sources'])+'。\n\n'
  else:
   if 'options' in x:md+='\n'.join(chr(65+i)+'. '+v for i,v in enumerate(x['options']))+'\n\n'
   if 'parts' in x:md+='\n'.join(str(i+1)+'. '+v for i,v in enumerate(x['parts']))+'\n\n'
   for key in ['table','table2']:
    if key in x:md+=mdtable(x[key])
 (R/(stem+'.md')).write_text(md.rstrip()+'\n')
print('Built 25 questions, 100 points; 6-page question paper and 6-page answer layout.')
