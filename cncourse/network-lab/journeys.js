/* Whole-path teaching narratives. Stage terms are curated; extension terms reuse source-backed lab associations. */
(function(root){
'use strict';
const n=(id,x,y,z=0)=>({id,x,y,z});
const phase=(title,summary,why,lab,terms,from,to,options={})=>({title,summary,why,lab,terms,from,to,...options});
const journeys=[
{id:'internet',overall:'发送端先把应用消息封装成包，确定网关并查询它的 MAC；交换机把帧送到网关，路由器逐跳换用链路封装并选择出口。遇到更小的 MTU 时把包分片，最后由目的端重组、解封，取出原消息。',name:'跨子网分组传输',subtitle:'一个 UDP 消息怎样到达另一张网络？',goal:'把主机 H1 的 1200 B 应用消息送到远端 H2。沿着一个包，把分层、ARP、交换、路由、分片和重组连成一条线。',example:'H1 192.168.1.10 → H2 206.0.71.200；UDP；出口 MTU=600 B。',result:'目的端按偏移重组，移除 IP 和 UDP 首部，把原来的 1200 B 消息交给应用。',scope:'总览以正常交付为主线。细节实验可单独改参数、注入故障；参数实验不会改写总览的固定示例。',nodes:[n('H1 · 192.168.1.10',-4,0),n('二层交换机',-2.4,0),n('本地网关 R1',-.8,0),n('远端路由器 R2',.8,0),n('MTU 600 链路',2.4,0),n('H2 · 206.0.71.200',4,0)],edges:[[0,1],[1,2],[2,3],[3,4],[4,5]],stages:[
phase('封装消息','1200 B 应用数据，加 8 B UDP 首部和 20 B IPv4 首部，IP 总长 1228 B。','不同层各自补充交付需要的控制信息。','encap',['封装','UDP','传输层','IP（','IHL','帧','载荷'],0,0,{config:{payload:1200,protocol:'UDP'}}),
phase('找到本地下一跳','H2 不在 H1 子网内；H1 先选网关，再用 ARP 查询网关 MAC。','IP 决定下一跳，MAC 才能把帧交给本链路接收者。','route',['ARP（','下一跳','默认网关','ARP Cache','HLen','FIB'],0,2,{flows:[{from:0,to:2,label:'ARP 请求'},{from:2,to:0,label:'ARP 应答'}]}),
phase('交换机送到网关','交换机从源 MAC 学习入端口，再按目的 MAC 转发；不替主机计算 IP 路径。','先认识源端的位置，随后才知道应从哪个端口送出。','switch',['FDB','MAC 地址','网桥','未知单播','泛洪','过滤'],0,2,{flows:[{from:0,to:1,label:'以太网帧'},{from:1,to:2,label:'转发'}]}),
phase('路由器逐跳转发','R1 解开链路帧，最长前缀匹配，TTL 减一，再以新的 MAC 头封装。普通路由保持 IP 端点。','不同网络之间需要层次化地址和逐跳选路。','route',['最长前缀','TTL','路由表','Header Checksum','Source','CIDR'],2,3),
phase('穿过更小的 MTU','1228 B 包遇到 MTU 600 B；DF=0 时，1208 B IP 数据拆成 576、576、56 B 三片。','每片含 20 B IP 头，非末片数据必须按 8 B 对齐。','fragment',['MTU','DF','MF','Fragment Offset','Identification','IP 分片'],3,4,{config:{data:1208,mtu:600,header:20,df:'0',missing:0}}),
phase('目的端重组并解封','H2 按偏移 0、72、144 重组 1208 B IP 数据，去掉 UDP 头后交付原消息。','只有全部分片到齐才能完成重组；缺片不会由 IP 自动重传。','fragment',['重组','IP 分片','尽力交付','端到端可靠性','Protocol'],4,5,{config:{data:1208,mtu:600,header:20,df:'0',missing:0}})
]},
{id:'reliable',overall:'发送端先划出帧边界并附加检错信息，再连续发送允许窗口内的数据。接收方确认收到的帧；发送方遇到确认缺口就等待或超时重传，接收方识别重复帧，保证本例数据只交付一次。',name:'带丢失的可靠链路',subtitle:'帧丢了，或确认丢了，怎样保证只交付一次？',goal:'把连续数据组成帧，并在信道发生丢失时借助确认、序号和重传恢复交付。',example:'发送端 → 有差错的链路 → 接收端；依次比较停等、GBN 和 SR。',result:'数据按协议交付；重传的旧帧能够被识别，不会重复交给上层。',scope:'演示可靠链路的设计思路，并不声称普通以太网有逐帧 ACK 或自动重传。',nodes:[n('发送端',-3,0),n('信道 / 可丢失',0,0),n('接收端',3,0)],edges:[[0,1],[1,2]],stages:[
phase('划出帧边界','用首尾标志标识帧；数据中的相同模式通过填充或转义透明传输。','接收方首先必须知道哪里是一帧的开头与结尾。','framing',['组帧','透明传输','比特填充','字符填充','PPP','HDLC'],0,0),
phase('附加检错信息','发送端计算 CRC 或校验和；接收端检测出坏帧时按协议丢弃。','检错只能说明是否发现错误，不能自行补回丢失的数据。','crc',['CRC','Internet 校验和','奇偶校验','XOR','FCS','漏检'],0,2),
phase('发送一窗数据','发送窗口限定未确认帧数；接收窗口决定乱序帧能否缓存。','流水发送减少等待 RTT 的空闲时间，同时需要序号区分帧。','arq',['滑动窗口','SWS','RWS','LFS','LAF','SeqNum'],0,2,{config:{mode:'SR',loss:'无丢失'}}),
phase('发现确认缺口','数据或 ACK 丢失，发送方未按时获确认；超时不证明一定是数据丢了。','发送方只能根据可见反馈行动，不能直接知道链路上发生了什么。','arq',['ACK','RTT','超时','LAR','LFR','累计确认'],2,0,{config:{mode:'停等',loss:'丢 ACK'}}),
phase('重传、去重、推进','停等重发一帧；GBN 回退一批；SR 缓存乱序并补缺帧，确认后窗口推进。','恢复交付的同时，必须避免把重传帧当成新消息。','arq',['ARQ','停等','GBN','SR','重传','去重','端到端可靠性'],0,2,{config:{mode:'SR',loss:'丢数据帧'}})
]},
{id:'wireless',overall:'设备把比特映射成信号，发送前侦听信道并随机退避；获得发送机会后传出一帧。接收点校验后返回确认；若没有获得确认，发送者按规则再次竞争并重试。',name:'多用户无线发送',subtitle:'几台设备同时想发送，如何共享空气？',goal:'从数据变成信号，到争用信道和等待确认，理解 Wi-Fi 发送为什么仍可能失败。',example:'终端 A 与 C 向接收点 B 发送；A、C 可能互相听不到。',result:'接收方收到一帧并返回 ACK；未获确认的发送者按规则重试。',scope:'Wi-Fi 接入和码分复用是共享介质的不同方案，码分放在延伸术语中，不把它当作所有 Wi-Fi 帧的必经步骤。',nodes:[n('终端 A',-3,0),n('接收点 B',0,0),n('终端 C',3,0)],edges:[[0,1],[2,1]],stages:[
phase('将比特变成信号','编码与载波调制把比特映射成可在介质中传送的变化。','接收方既要区分信号状态，也要定位码元或比特边界。','encoding',['数据','信号','码元','ASK','FSK','PSK','SNR','Baud'],0,0),
phase('侦听并随机退避','采用 CSMA/CA：满足 DIFS 等规则后竞争；忙时冻结退避计数。','本地听到空闲不代表接收点一定没有冲突。','access',['Wi-Fi','CSMA/CA','DIFS','退避','隐藏终端','RTS/CTS'],0,1,{config:{mode:'CSMA/CA',backoff:3}}),
phase('竞争发送可能碰撞','A、C 若选择同一槽，仍可能同时发送；隐藏终端让侦听更不可靠。','碰撞避免用于降低风险，不是无碰撞保证。','access',['CA','CSMA','隐藏终端','共享链路'],2,1,{config:{mode:'CSMA/CA',backoff:0}}),
phase('接收校验，返回确认','接收方校验通过后按协议返回 ACK；坏帧不能仅靠 CRC 修好。','完整接收和可靠恢复是两件事。','crc',['CRC','FCS','ACK','检错','前向纠错'],1,0),
phase('未获确认则重试','发送者按失败处理，调整竞争等待后重试；这里用停等模型观察确认丢失与去重。','重复发送不应让应用重复收到相同数据。','arq',['ACK','ARQ','停等','超时','去重'],0,1,{config:{mode:'停等',loss:'丢 ACK'}})
],extraLabs:['multiplex']},
{id:'lan',overall:'交换机先通过生成树确定无环的活动路径，再按 VLAN 限定转发范围。帧进入时学习源地址的位置，随后查目的地址：已知则定向转发，未知则在本 VLAN 泛洪；链路变化后重新计算路径。',name:'带 VLAN 的交换网络',subtitle:'同一交换网络里，帧会到哪些端口？',goal:'先消除冗余链路的转发环路，再观察交换机如何学习位置，以及 VLAN 如何限制广播。',example:'三台交换机组成三角形，两个终端属于不同逻辑 VLAN。',result:'已知单播按 FDB 送达；广播只在所属 VLAN 的允许转发端口传播。',scope:'生成树采用课件等代价三桥模型；VLAN 间通信需要三层转发。',nodes:[n('主机 A · V10',-3.8,0),n('交换机 B1',-1.6,-1),n('交换机 B2',1.6,-1),n('交换机 B3',0,1.3),n('主机 D · V10/20',3.8,0)],edges:[[0,1],[1,2],[1,3],[2,3],[2,4]],stages:[
phase('先形成无环转发拓扑','选根桥、根端口和指派端口，阻塞一侧冗余端口，保留物理电缆。','普通 MAC 帧没有逐跳递减的 IP TTL，环路可造成广播风暴。','stp',['STP','根桥','根端口','指派端口','广播风暴','RSTP'],1,3),
phase('确认广播所属 VLAN','接入口确定所属 VLAN；Trunk 可带 802.1Q 标签承载多个 VLAN。','物理上连在同一交换机，不代表处于同一广播域。','switch',['VLAN','802.1Q','VID','Trunk','接入口','广播域'],0,1),
phase('用源地址学习位置','每收到有效帧，学习或刷新源 MAC 与入端口关系。','FDB 的学习依据源地址，不是目的地址。','switch',['FDB','MAC','老化时间','网桥'],0,1,{config:{frame:'A→D'}}),
phase('查目的地址再转发','未知目的泛洪，已知目的定向转发；若目的也在入端口一侧则过滤。','泛洪不会将原单播目的 MAC 改成广播地址。','switch',['未知单播','泛洪','过滤','单播','广播'],1,4,{config:{frame:'C→B'}}),
phase('隔离 VLAN 与恢复故障','不同 VLAN 不直接二层互通；断链后生成树可重新计算活动路径。','VLAN 隔离广播域，STP 处理拓扑环路，是两个不同问题。','stp',['VLAN','三层交换','碰撞域','配置消息','桥标识'],1,2,{config:{broken:'B1-B3'}})
]},
{id:'delivery',overall:'源服务器准备文件，将其封装为分组并沿网络流水发送给用户。C/S 由服务器承担分发；P2P 允许已经收到片段的用户继续上传。最后比较服务器与用户的能力，找出限制分发的瓶颈。',name:'一份文件的 C/S 与 P2P 分发',subtitle:'用户越多，哪里先变成瓶颈？',goal:'把同一文件交给多个用户，比较服务器集中上传和用户协作分发。',example:'40 Mbit 文件，4 个接收用户，服务器上传 20 Mb/s。',result:'找出服务器、用户下载或全系统上传能力造成的理想分发时间下界。',scope:'时间数值采用理想流体下界；分组实验用于理解路径时延，不将下界冒充真实完整调度时间。',nodes:[n('源服务器',0,-1.6),n('用户 1',-3,0),n('用户 2',-1.1,1.3),n('用户 3',1.1,1.3),n('用户 4',3,0)],edges:[[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4]],stages:[
phase('源提供原始内容','客户进程请求文件，服务器读取并准备通过网络分发。','C/S 和 P2P 描述应用组织方式，不是集线器的物理复制动作。','distribution',['C/S','客户','进程','服务器','上传带宽'],0,0,{config:{mode:'C/S'}}),
phase('切分并封装数据','文件切成可转发分组，加各层首部；不同链路可并行推进不同包。','分组可形成流水线，但首部与处理同样带来开销。','encap',['分组','报文','封装','TCP/IP','首部'],0,1),
phase('沿路径流水传送','区分发送、传播、排队与处理；速率增加不使已在光纤中的比特传播更快。','吞吐量、额定带宽和一次传输的时延不能互换。','pipeline',['流水线','发送时延','传播时延','排队','瓶颈速率','吞吐量','时延带宽积'],0,2),
phase('用户协作转发缓存','P2P 中用户可把已得到的片段上传给其他用户，减少源服务器压力。','新增用户既带来需求，也可能贡献上传能力。','distribution',['P2P','缓存','上传带宽','下载','云计算','边缘计算'],1,2,{config:{mode:'P2P'}}),
phase('比较瓶颈与时间','改变用户数、服务器出站和用户上传/下载能力，比较两种组织方式的下界。','协作收益受在线情况、片段和调度制约，P2P 不等于无限带宽。','distribution',['带宽','吞吐量','bit / B','Mb/s','MB','RTT'],0,4,{config:{mode:'P2P'}})
]},
{id:'edge',overall:'主机先判断目的是否在本地网段，再将异网数据交给边界路由器。边界为每个会话分配公网端口、改写后发出；回包到达时反查映射，恢复内部地址和端口并交给正确主机。隧道作为后续对比方案单独解释。',name:'私网通信与边界转换',subtitle:'两台内网主机怎样共享一个公网地址？',goal:'让两台使用私有地址的主机通过边界路由器访问外部，再正确接收各自的回包。',example:'10.0.0.2:5000 与 10.0.0.3:5000，映射到 203.0.113.1 的不同端口。',result:'边界根据目的公网端口反查会话，将回包还原并交给正确内网主机。',scope:'VPN 隧道和多播是边界通信的延伸分支，不是 NAPT 的必经步骤；公网地址使用文档示例范围。',nodes:[n('10.0.0.2',-3,-1),n('10.0.0.3',-3,1),n('边界路由器',0,0),n('外部网络',3,0)],edges:[[0,2],[1,2],[2,3]],stages:[
phase('先确定本地网络','根据地址和掩码判断对方是否同网段，异网目标交给默认网关。','私有地址可以在不同私网复用，不能直接推出全局可达。','subnet',['私有地址','子网掩码','网络地址','AND','默认网关'],0,2,{config:{addr:'10.0.0.2',prefix:24}}),
phase('为每个内部会话建映射','NAPT 将两台主机相同的内部端口映射到 40001、40002，区分会话。','仅共用公网 IP 不足以区分多个并发会话。','nat',['NAT','NAPT','端口号','Source','Destination'],0,2,{config:{mode:'NAPT'},flows:[{from:0,to:2,label:'5000 → 40001'},{from:1,to:2,label:'5000 → 40002'}]}),
phase('改写后向公网转发','边界改写源地址和端口，更新受影响校验和；外部看到公网端点。','NAT 是普通路由保持 IP 端点不变这一说法的例外。','nat',['NAPT','NAT','Header Checksum','IP（'],2,3),
phase('回包按映射返回','目的 203.0.113.1:40002 的回包应还原为 10.0.0.3:5000。','映射必须让回程找到正确内网会话；NAT 不等于防火墙。','nat',['NAPT','端口号','私有地址'],3,1),
phase('延伸：隧道如何不同','VPN 隧道增加外层包；中间网络看外层地址，出口解封保留内层端点。','封装不自动等于加密；也不等于 NAPT 的地址端口改写。','nat',['VPN','隧道','多播','IGMP'],2,3,{config:{mode:'VPN 隧道'}})
]},
{id:'physical',overall:'发送适配器把数据编码或调制成介质可承载的信号，必要时用复用方案区分不同用户。接收方恢复时钟、解码信号，再按帧边界取出数据并检查差错；每一步解决的问题不同。',name:'直连链路的信号传输',subtitle:'0 和 1 怎样通过一条实际介质？',goal:'理解数据如何映射成信号，如何共享传输资源，并在接收端重新找到比特与帧边界。',example:'发送端 → 共享或点对点介质 → 接收端；各编码与复用方案是可比较的选项。',result:'接收方恢复位边界、解码数据、识别帧，再检查有无可检测差错。',scope:'不同编码、介质和复用方法是替代方案；这里只连接共同流程，不声称某条链路同时采用所有方法。',nodes:[n('发送适配器',-3,0),n('传输介质',0,0),n('接收适配器',3,0)],edges:[[0,1],[1,2]],stages:[
phase('选择介质与信号映射','双绞线、电缆、光纤或无线承载不同信号；码元状态数影响每码元承载的比特数。','数据、信号和码元不是同一个对象。','encoding',['NIC','网络适配器','双绞线','同轴电缆','光纤','单模','多模','码元','Baud'],0,0),
phase('编码、调制与时钟','逐位观察 NRZ、NRZI、Manchester 及 ASK/FSK/PSK；自同步帮助接收端对准时钟。','仅能区分高低电平，不代表能识别每个比特的边界。','encoding',['NRZ','NRZI','Manchester','ASK','FSK','PSK','时钟恢复','自同步'],0,1),
phase('按需选择复用方案','用频率、时隙、波长或正交码片区分用户；CDMA 接收端相关解码。','不同用户共享介质时，仍要能恢复每一位的归属。','multiplex',['FDM','TDM','STDM','WDM','CDM','CDMA','码片','正交'],0,2),
phase('恢复帧并检错','通过帧边界与透明传输还原内容，再检查 CRC 等冗余。','编码与检错的目的不同；检出差错并不自动可靠交付。','framing',['帧定界','组帧','透明传输','CRC','前向纠错'],1,2)
],extraLabs:['crc']},
{id:'routing',overall:'路由器先交换邻居、拓扑或路径信息，再按所选协议计算或选择可达路径。数据包真正到达时，查 FIB 选最长匹配前缀，然后解析本地下一跳的 MAC，重新封装并发出。',name:'先算路，再转发',subtitle:'路由信息从哪里来，为什么能查到下一跳？',goal:'把控制平面的路由计算与数据平面逐包查 FIB 分开，再连接成完整交付过程。',example:'A、B、C、D 四结点网络，可改链路代价或断链；BGP 则以 AS 路径为示意。',result:'路由计算产生可达信息，实际分组按最长前缀匹配选下一跳并在本链路交付。',scope:'RIP、OSPF、BGP 是不同路由方案；提纲中仅作补充框架，不把三者串成同一算法的必经阶段。',nodes:[n('源端 A',-3,0),n('路由器 B',-1,-1),n('路由器 C',1,1),n('目的侧 D',3,0)],edges:[[0,1],[1,2],[2,3],[0,3]],stages:[
phase('收集拓扑或邻居信息','链路状态传播拓扑；距离向量交换邻居距离；路径向量交换 AS 路径等属性。','路由器必须先有可用信息，才可能形成转发选择。','routing',['距离向量','RIP','链路状态','OSPF','路径向量','BGP','AS（'],0,1),
phase('计算或选择路由','Dijkstra 逐轮松弛，RIP 使用跳数，BGP 要考虑策略和 AS 路径防环。','不同协议度量与决策依据不同，不能一概等同最少跳数。','routing',['Dijkstra','无穷计数','AS 路径防环','路由选择'],1,2),
phase('目的地址查 FIB','对所有可匹配的目的前缀，取位数最多的一项；默认 /0 最不具体。','选路计算与逐个包转发的查询是两个阶段。','route',['FIB','路由表','CIDR','最长前缀','默认路由'],0,1),
phase('解析本跳并重新组帧','ARP 查本链路下一跳的 MAC，TTL 递减，重新封装链路帧继续交付。','FIB、ARP Cache、交换机 FDB 的键和值不同，不能互换。','route',['ARP','ARP Cache','FDB','下一跳','TTL','ICMP','traceroute'],2,3)
]}
];
function stageTerms(journey,index,terms){const stage=journey.stages[index];return terms.filter(t=>{const name=t.name.split('（')[0];return stage.terms.some(key=>{if(key.includes('（'))return name.trim()===key.replace('（','');if(/^[A-Za-z][A-Za-z0-9]*$/.test(key))return new RegExp('(^|[^A-Za-z0-9])'+key+'($|[^A-Za-z0-9])').test(name);return name.includes(key);});});}
function groups(journey,terms){let used=new Set();let result=journey.stages.map((s,i)=>({title:s.title,stage:i,terms:stageTerms(journey,i,terms).filter(t=>{if(used.has(t.id))return false;used.add(t.id);return true;})}));let labs=new Set([...journey.stages.map(s=>s.lab),...(journey.extraLabs||[])]);result.push({title:'相关原理与延伸术语',stage:null,terms:terms.filter(t=>labs.has(t.lab)&&!used.has(t.id))});return result.filter(g=>g.terms.length);}
function overview(j){return {nodes:j.nodes,edges:j.edges,metrics:[['整体流程',j.stages.length+' 个阶段'],['学习目标','先理解全程，再拆开细看'],['交付结果',j.result]],steps:j.stages.map(s=>({title:s.title,detail:s.summary+' '+s.why,from:s.from,to:s.to,...(s.flows?{flows:s.flows}:{})}))};}
const api={journeys,stageTerms,groups,overview};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NetJourneys=api;
})(typeof window==='undefined'?globalThis:window);
