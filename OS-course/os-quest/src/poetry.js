(function(root){
  'use strict';
  const authors=[
    ['libai','李白','唐','青莲诗仙','飘逸浪漫，以山川与想象拓开诗境。','#bcded3'],
    ['dufu','杜甫','唐','少陵诗圣','沉郁顿挫，在山河与人间留下深切关怀。','#cdb78a'],
    ['wangwei','王维','唐','山水诗佛','以清幽山水与细微声色，写出空灵意境。','#b8d09d'],
    ['menghaoran','孟浩然','唐','鹿门隐逸','山水田园之间，珍惜故人相邀与一夜春声。','#a8c3b2'],
    ['baijuyi','白居易','唐','香山居士','语言平易，细察生活，也关怀世间冷暖。','#b6c9e2'],
    ['dumu','杜牧','唐','樊川俊逸','俊爽清丽，在景物与咏史中寄托思考。','#d5a2ab'],
    ['sushi','苏轼','宋','东坡旷达','旷达的胸襟，容得下明月、风雨与人生。','#afc7e5'],
    ['liqingzhao','李清照','宋','易安词心','以清丽细腻的词笔，写欢乐、思念与家国之情。','#e4d3a8'],
    ['xinqiji','辛弃疾','宋','稼轩豪情','豪放词心中，有壮志，也有乡村夜行的清欢。','#b2b7e0'],
    ['luyou','陆游','宋','放翁丹心','心怀家国，也珍爱村落与一枝不改的梅香。','#9fc6bc'],
    ['wanganshi','王安石','宋','临川新声','由寻常景色写出新意，也在高处思考眼界。','#b9c994'],
    ['ouyangxiu','欧阳修','宋','醉翁清赏','以明快疏朗的诗词，细赏西湖春色与自然生趣。','#c9afcd']
  ].map((a,i)=>({id:a[0],name:a[1],dynasty:a[2],title:a[3],bio:a[4],color:a[5],sheet:Math.floor(i/4),portrait:i%4,gender:a[0]==='liqingzhao'?'female':'male'}));
  const authorById=new Map(authors.map(a=>[a.id,a]));
  const works=[];
  function poem(author,title,lines,missing,fillAnswer,question,options,right,explanation){
    const id=author+'-'+(works.filter(p=>p.author===author).length+1);
    works.push({id,author,title,lines:lines.split('|'),source:`https://zh.wikisource.org/w/index.php?search=${encodeURIComponent(authorById.get(author).name+' '+title)}`,questions:[
      {id:id+'-fill',type:'fill',prompt:`补全《${title}》中的诗句：${missing}`,answers:[fillAnswer],answer:fillAnswer,explanation:`原句为“${missing.replace('____',fillAnswer)}”。`},
      {id:id+'-choice',type:'choice',prompt:question,options,answer:String(right),explanation}
    ]});
  }
  poem('libai','静夜思','床前明月光，疑是地上霜。|举头望明月，低头思故乡。','举头望明月，____。','低头思故乡','这首诗由月色引出的主要情感是什么？',['思念故乡','赞美战争','欢庆丰收','讥讽科举'],0,'“低头思故乡”直接点明思乡之情。');
  poem('libai','望庐山瀑布','日照香炉生紫烟，遥看瀑布挂前川。|飞流直下三千尺，疑是银河落九天。','飞流直下三千尺，____。','疑是银河落九天','“三千尺”“银河落九天”主要表现了什么？',['瀑布纤弱无声','瀑布的雄奇壮丽','精确的测量结果','秋雨绵绵'],1,'夸张与想象突出瀑布高悬飞泻的雄奇气势。');
  poem('libai','早发白帝城','朝辞白帝彩云间，千里江陵一日还。|两岸猿声啼不住，轻舟已过万重山。','两岸猿声啼不住，____。','轻舟已过万重山','“轻舟已过万重山”与全诗的基调更接近哪一项？',['压抑凝滞','绝望悲苦','轻快畅达','冷峻讥刺'],2,'行舟迅疾与“轻舟”的形象，传达轻快畅达的感受。');
  poem('dufu','春望','国破山河在，城春草木深。|感时花溅泪，恨别鸟惊心。|烽火连三月，家书抵万金。|白头搔更短，浑欲不胜簪。','烽火连三月，____。','家书抵万金','“家书抵万金”主要写出什么？',['家书可以兑换黄金','战乱中家人消息珍贵','春日百花开放','诗人喜爱经商'],1,'战乱与离别使一封家书格外珍贵，体现忧国思家。');
  poem('dufu','绝句（两个黄鹂鸣翠柳）','两个黄鹂鸣翠柳，一行白鹭上青天。|窗含西岭千秋雪，门泊东吴万里船。','窗含西岭千秋雪，____。','门泊东吴万里船','下列哪组景物都出现在这首诗中？',['落雁、沙漠、孤城','梅花、古驿、断桥','黄鹂、白鹭、雪山','红豆、长亭、残月'],2,'前两句写黄鹂与白鹭，后两句写西岭积雪和门前船只。');
  poem('dufu','望岳','岱宗夫如何？齐鲁青未了。|造化钟神秀，阴阳割昏晓。|荡胸生曾云，决眦入归鸟。|会当凌绝顶，一览众山小。','会当凌绝顶，____。','一览众山小','“会当凌绝顶”表达了怎样的精神？',['安于退缩','畏惧登高','追求享乐','不畏困难、勇于攀登'],3,'末联由望岳生发登顶之志，表现昂扬进取的气概。“曾云”即层云。');
  poem('wangwei','鹿柴','空山不见人，但闻人语响。|返景入深林，复照青苔上。','空山不见人，____。','但闻人语响','“不见人”却“闻人语”，有什么表达效果？',['以声音衬托山林幽静','说明山中正在作战','否定声音的存在','描绘繁忙集市'],0,'人语反衬空山幽静；夕照又使深林中出现一束光亮。“返景”指夕照。');
  poem('wangwei','山居秋暝','空山新雨后，天气晚来秋。|明月松间照，清泉石上流。|竹喧归浣女，莲动下渔舟。|随意春芳歇，王孙自可留。','明月松间照，____。','清泉石上流','这首诗写的是怎样的环境？',['冬日边塞战场','雨后秋日晚间山居','盛夏城市街道','春日宫廷宴席'],1,'“新雨后”“晚来秋”交代时令与时间，松月清泉构成清幽山居。');
  poem('wangwei','相思','红豆生南国，春来发几枝。|愿君多采撷，此物最相思。','愿君多采撷，____。','此物最相思','诗中用什么寄托相思？',['柳絮','明镜','红豆','落日'],2,'全诗以红豆寄托相思，借具体物象表达情意。');
  poem('menghaoran','春晓','春眠不觉晓，处处闻啼鸟。|夜来风雨声，花落知多少。','夜来风雨声，____。','花落知多少','诗人由清晨鸟鸣想起了什么？',['昨夜风雨及落花','边关烽火','江上渔船','重阳登高'],0,'由清晨醒来所闻鸟鸣，回想夜间风雨，并牵挂花落。');
  poem('menghaoran','宿建德江','移舟泊烟渚，日暮客愁新。|野旷天低树，江清月近人。','野旷天低树，____。','江清月近人','“日暮客愁新”点明的情感是什么？',['凯旋喜悦','羁旅愁绪','愤怒讽刺','丰收欢庆'],1,'“客愁”点出旅途中的愁绪；江月与暮色烘托这种感受。');
  poem('menghaoran','过故人庄','故人具鸡黍，邀我至田家。|绿树村边合，青山郭外斜。|开轩面场圃，把酒话桑麻。|待到重阳日，还来就菊花。','待到重阳日，____。','还来就菊花','诗人与故人“把酒”主要谈论什么？',['宫廷礼仪','海上航线','农事生活','边塞布防'],2,'“桑麻”在这里指农事，体现田园生活的亲切与闲适。');
  poem('baijuyi','赋得古原草送别','离离原上草，一岁一枯荣。|野火烧不尽，春风吹又生。|远芳侵古道，晴翠接荒城。|又送王孙去，萋萋满别情。','野火烧不尽，____。','春风吹又生','“野火烧不尽，春风吹又生”突出草的什么特点？',['顽强的生命力','永远不会枯萎','只能长在水中','完全依赖人工栽培'],0,'草虽经历枯荣和野火，春来仍能再生，表现生命力。');
  poem('baijuyi','钱塘湖春行','孤山寺北贾亭西，水面初平云脚低。|几处早莺争暖树，谁家新燕啄春泥。|乱花渐欲迷人眼，浅草才能没马蹄。|最爱湖东行不足，绿杨阴里白沙堤。','乱花渐欲迷人眼，____。','浅草才能没马蹄','“早莺”“新燕”“浅草”共同提示了什么时令？',['深秋','早春','严冬','盛夏'],1,'“早”“新”“浅”等细节呈现西湖早春的生机。');
  poem('baijuyi','问刘十九','绿蚁新醅酒，红泥小火炉。|晚来天欲雪，能饮一杯无？','晚来天欲雪，____？','能饮一杯无','这首诗主要表现了什么场景？',['夜赴沙场','独登高楼','雪前邀友饮酒','清晨送别官员'],2,'新酒、火炉、将雪的天气与问句，构成温暖亲切的邀饮场景。');
  poem('dumu','山行','远上寒山石径斜，白云生处有人家。|停车坐爱枫林晚，霜叶红于二月花。','停车坐爱枫林晚，____。','霜叶红于二月花','“停车坐爱”中的“坐”是什么意思？',['坐下休息','乘坐车辆','因为','等待'],2,'“坐”在这里解释为“因为”，诗人因喜爱晚秋枫林而停车。');
  poem('dumu','清明','清明时节雨纷纷，路上行人欲断魂。|借问酒家何处有？牧童遥指杏花村。','借问酒家何处有？____。','牧童遥指杏花村','为行人指路的是谁？',['牧童','渔夫','僧人','樵夫'],0,'末句明确写出牧童遥指杏花村。');
  poem('dumu','泊秦淮','烟笼寒水月笼沙，夜泊秦淮近酒家。|商女不知亡国恨，隔江犹唱后庭花。','商女不知亡国恨，____。','隔江犹唱后庭花','“犹唱后庭花”在诗中引出的主要意味是什么？',['赞美歌舞升平','借历史兴亡寄托忧思','介绍采茶劳动','庆祝中秋团圆'],1,'《后庭花》与陈后主亡国的历史联系，使诗歌具有对兴亡的忧思。');
  poem('sushi','题西林壁','横看成岭侧成峰，远近高低各不同。|不识庐山真面目，只缘身在此山中。','不识庐山真面目，____。','只缘身在此山中','这首诗揭示的认识启发更接近哪一项？',['观察事物应注意角度与整体','只有近看才永远正确','山峰形状不会随视角改变','不需要观察就能了解全貌'],0,'从不同角度所见不同，身处局部也可能妨碍对整体的认识。');
  poem('sushi','饮湖上初晴后雨·其二','水光潋滟晴方好，山色空蒙雨亦奇。|欲把西湖比西子，淡妆浓抹总相宜。','欲把西湖比西子，____。','淡妆浓抹总相宜','词句中的“西子”在这里被用来比喻什么？',['庐山的险峻','西湖晴雨皆美','边关的孤寂','春草的顽强'],1,'以西施之美比西湖之美，强调晴与雨各有风姿。');
  poem('sushi','水调歌头·明月几时有','明月几时有？把酒问青天。|不知天上宫阙，今夕是何年。|我欲乘风归去，又恐琼楼玉宇，高处不胜寒。|起舞弄清影，何似在人间。|转朱阁，低绮户，照无眠。|不应有恨，何事长向别时圆？|人有悲欢离合，月有阴晴圆缺，此事古难全。|但愿人长久，千里共婵娟。','但愿人长久，____。','千里共婵娟','结尾“千里共婵娟”主要寄托什么愿望？',['独占明月','停止一切旅行','亲人平安、远隔也共赏明月','拒绝与家人来往'],2,'“婵娟”在此指明月，结尾借共赏明月表达对亲人的祝愿。');
  poem('liqingzhao','如梦令·常记溪亭日暮','常记溪亭日暮，沉醉不知归路。|兴尽晚回舟，误入藕花深处。|争渡，争渡，惊起一滩鸥鹭。','争渡，争渡，____。','惊起一滩鸥鹭','这首词回忆的情境是什么？',['溪亭游赏后误入荷花深处','独守边城','雪夜行军','登高望海'],0,'日暮回舟、误入藕花与惊起鸥鹭，展现富有生趣的游赏回忆。');
  poem('liqingzhao','夏日绝句','生当作人杰，死亦为鬼雄。|至今思项羽，不肯过江东。','生当作人杰，____。','死亦为鬼雄','诗中借哪位历史人物表达对气节的赞许？',['诸葛亮','项羽','陶渊明','王昭君'],1,'后两句点出项羽“不肯过江东”，寄托对人格气节的赞许。');
  poem('liqingzhao','武陵春·春晚','风住尘香花已尽，日晚倦梳头。|物是人非事事休，欲语泪先流。|闻说双溪春尚好，也拟泛轻舟。|只恐双溪舴艋舟，载不动许多愁。','只恐双溪舴艋舟，____。','载不动许多愁','“载不动许多愁”的表达特点是什么？',['把愁绪当作可承载的重量','精确计算船舶载重','赞美船只巨大','说明船上没有乘客'],0,'把无形愁绪写成有重量之物，突出其深重。');
  poem('xinqiji','西江月·夜行黄沙道中','明月别枝惊鹊，清风半夜鸣蝉。|稻花香里说丰年，听取蛙声一片。|七八个星天外，两三点雨山前。|旧时茅店社林边，路转溪桥忽见。','稻花香里说丰年，____。','听取蛙声一片','词中哪一组属于乡村夏夜的声音？',['驼铃、战鼓','鸣蝉、蛙声','钟鼓、车马','号角、枪声'],1,'鸣蝉与蛙声构成乡村夏夜的听觉景象，也渲染丰收希望。');
  poem('xinqiji','破阵子·为陈同甫赋壮词以寄之','醉里挑灯看剑，梦回吹角连营。|八百里分麾下炙，五十弦翻塞外声。沙场秋点兵。|马作的卢飞快，弓如霹雳弦惊。|了却君王天下事，赢得生前身后名。可怜白发生！','了却君王天下事，____。','赢得生前身后名','“可怜白发生”与前面的沙场画面形成什么关系？',['彻底否认壮志','欢庆战争已经结束','壮志与现实之间的反差','单纯描写春天景色'],2,'梦中沙场建功的壮烈与现实年老的感叹形成反差。');
  poem('xinqiji','青玉案·元夕','东风夜放花千树，更吹落、星如雨。|宝马雕车香满路。凤箫声动，玉壶光转，一夜鱼龙舞。|蛾儿雪柳黄金缕，笑语盈盈暗香去。|众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。','蓦然回首，那人却在，____。','灯火阑珊处','这首词描绘的节日背景是什么？',['清明','端午','重阳','元宵'],3,'词题“元夕”即元宵夜，灯火、乐声与鱼龙舞都呼应节日景象。');
  poem('luyou','游山西村','莫笑农家腊酒浑，丰年留客足鸡豚。|山重水复疑无路，柳暗花明又一村。|箫鼓追随春社近，衣冠简朴古风存。|从今若许闲乘月，拄杖无时夜叩门。','山重水复疑无路，____。','柳暗花明又一村','“柳暗花明又一村”后来常被借来表达什么？',['困境中出现转机','旅途永远没有终点','拒绝与人交往','秋日万物凋零'],0,'由山村行路的景象，可引申为困境中出现新的希望。');
  poem('luyou','示儿','死去元知万事空，但悲不见九州同。|王师北定中原日，家祭无忘告乃翁。','王师北定中原日，____。','家祭无忘告乃翁','全诗最突出的牵挂是什么？',['个人财富','国家统一','科举名次','宴席礼仪'],1,'“但悲不见九州同”点明对国家统一的深切牵挂。');
  poem('luyou','卜算子·咏梅','驿外断桥边，寂寞开无主。|已是黄昏独自愁，更著风和雨。|无意苦争春，一任群芳妒。|零落成泥碾作尘，只有香如故。','零落成泥碾作尘，____。','只有香如故','“只有香如故”主要寄托怎样的品格？',['依附权势','随波逐流','坚贞自守','争夺虚名'],2,'梅即使遭摧折仍芳香不改，寄托坚贞的品格。');
  poem('wanganshi','元日','爆竹声中一岁除，春风送暖入屠苏。|千门万户曈曈日，总把新桃换旧符。','千门万户曈曈日，____。','总把新桃换旧符','诗题“元日”指哪一天？',['正月初一','正月十五','五月初五','八月十五'],0,'“元日”指农历正月初一，诗中写爆竹、屠苏与换桃符等迎新习俗。');
  poem('wanganshi','泊船瓜洲','京口瓜洲一水间，钟山只隔数重山。|春风又绿江南岸，明月何时照我还？','春风又绿江南岸，____？','明月何时照我还','“春风又绿江南岸”中的“绿”写出了什么？',['江水结冰','春风使江南岸变绿','夏日草木枯萎','夜色遮住群山'],1,'“绿”把春风带来的江南生机写得鲜明而有动态感。');
  poem('wanganshi','登飞来峰','飞来山上千寻塔，闻说鸡鸣见日升。|不畏浮云遮望眼，自缘身在最高层。','不畏浮云遮望眼，____。','自缘身在最高层','这首诗中“身在最高层”所带出的启发更接近哪一项？',['身高决定知识','不必观察外界','站得高，眼界更开阔','云层永远不会移动'],2,'登高的画面寄托开阔眼界、不被遮蔽的精神。“自缘”亦有“只缘”异文，此处按本题文本。');
  poem('ouyangxiu','画眉鸟','百啭千声随意移，山花红紫树高低。|始知锁向金笼听，不及林间自在啼。','始知锁向金笼听，____。','不及林间自在啼','作者更欣赏怎样的鸟鸣？',['林间自由自在的啼鸣','锁在金笼后的啼鸣','完全没有声音','机械模仿的声音'],0,'“不及”明确比较笼中与林间，赞赏自然与自由。');
  poem('ouyangxiu','采桑子·轻舟短棹西湖好','轻舟短棹西湖好，绿水逶迤。芳草长堤，隐隐笙歌处处随。|无风水面琉璃滑，不觉船移。微动涟漪，惊起沙禽掠岸飞。','微动涟漪，____。','惊起沙禽掠岸飞','“无风水面琉璃滑”主要描写怎样的湖面？',['狂风巨浪','平静光滑','冰封坚硬','泥沙翻滚'],1,'以琉璃比喻无风时平静光滑的水面，突出游湖的清美闲适。');
  poem('ouyangxiu','浪淘沙·把酒祝东风','把酒祝东风，且共从容。垂杨紫陌洛城东。|总是当时携手处，游遍芳丛。|聚散苦匆匆，此恨无穷。今年花胜去年红。|可惜明年花更好，知与谁同？','可惜明年花更好，____？','知与谁同','“知与谁同”主要表达怎样的感慨？',['只关心花的价格','盼望独占春景','珍惜相聚、感叹聚散','赞颂边塞军旅'],2,'眼前春花与明年之想，引出对相聚难长、聚散匆匆的感慨。');
  const poemById=new Map(works.map(p=>[p.id,p]));
  const questions=works.flatMap(p=>p.questions.map(q=>({...q,poemId:p.id,author:p.author}))),questionById=new Map(questions.map(q=>[q.id,q]));
  const positions=[[5,3],[9,3],[16,3],[20,5],[4,6],[8,6],[15,7],[20,9],[4,11],[8,12],[15,12],[19,13]];
  const npcs=authors.map((a,i)=>({...a,id:'poet-'+a.id,authorId:a.id,role:a.dynasty+' · '+a.title,x:positions[i][0],y:positions[i][1],literary:true}));
  const WIDTH=24,HEIGHT=16,TILE=48,SPAWN={x:12,y:13};
  function terrain(x,y){
    if(x<=0||y<=0||x>=WIDTH-1||y>=HEIGHT-1)return '#';
    if(x>=10&&x<=13&&y>=3&&y<=5&&y!==4)return '~';
    if([[2,2],[3,2],[21,2],[21,3],[2,13],[3,13],[21,13],[21,14]].some(p=>p[0]===x&&p[1]===y))return '#';
    return y===8||y===4||x===12||x===6||x===18?'=':'.';
  }
  function walkable(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&!['#','~'].includes(terrain(x,y))&&!npcs.some(n=>n.x===x&&n.y===y);}
  function nearby(s){const w=s.poetry.realm;return npcs.find(n=>Math.abs(w.x-n.x)+Math.abs(w.y-n.y)<=1)||null;}
  function move(s,dir,rng){const w=s.poetry.realm,steps={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};if(w.openId||!steps[dir])return false;w.facing=dir;const [dx,dy]=steps[dir];if(!walkable(w.x+dx,w.y+dy))return false;w.x+=dx;w.y+=dy;const n=nearby(s);if(n&&n.authorId!==w.nearId)open(s,n.authorId,rng);w.nearId=n?.authorId||null;return true;}
  function open(s,id,rng){if(s.poetry.realm.openId||nearby(s)?.authorId!==id)return false;begin(s,id,rng);s.poetry.realm.openId=id;s.poetry.realm.nearId=id;return true;}
  function close(s){s.poetry.realm.openId=null;}
  function create(){return {heroId:null,active:false,realm:{x:SPAWN.x,y:SPAWN.y,facing:'up',nearId:null,openId:null},met:[],records:{},history:[],collected:[],encounter:null,correct:0,answered:0};}
  function normalize(v){return String(v).normalize('NFKC').toLowerCase().replace(/[\s，。！？、；：“”‘’《》,.;:!?"']/g,'');}
  function correct(q,input){return q.type==='fill'?q.answers.some(a=>normalize(a)===normalize(input)):String(input)===q.answer;}
  function begin(s,authorId,rng=Math.random){
    const a=authorById.get(authorId);if(!a)return null;let pool=works.filter(p=>p.author===authorId);
    const recent=s.poetry.history.at(-1),fresh=pool.filter(p=>p.id!==recent);if(fresh.length)pool=fresh;
    const unread=pool.filter(p=>!s.poetry.collected.includes(p.id));if(unread.length)pool=unread;
    const unseen=pool.filter(p=>p.questions.some(q=>!(s.poetry.records[q.id]?.right>0)));if(unseen.length)pool=unseen;
    const p=pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999,rng()))*pool.length))];
    let candidates=p.questions.filter(q=>!(s.poetry.records[q.id]?.right>0));if(!candidates.length)candidates=p.questions;
    const q=candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(.999999,rng()))*candidates.length))];
    s.poetry.encounter={authorId,poemId:p.id,questionId:q.id,phase:'recite',input:null,correct:null,xp:0,draft:'',selection:null};
    if(!s.poetry.collected.includes(p.id))s.poetry.collected.push(p.id);s.poetry.history.push(p.id);s.poetry.history=s.poetry.history.slice(-24);if(!s.poetry.met.includes(authorId))s.poetry.met.push(authorId);
    return s.poetry.encounter;
  }
  function ask(s){const e=s.poetry.encounter;if(!e||e.phase!=='recite'||s.phase==='feedback')return false;e.phase='question';return true;}
  function answer(s,input){
    const e=s.poetry.encounter,q=e&&questionById.get(e.questionId);if(!q||e.phase!=='question'||s.phase==='feedback')return null;
    if(q.type==='fill'&&!normalize(input))return null;if(q.type==='choice'&&!['0','1','2','3'].includes(String(input)))return null;
    const right=correct(q,input),r=s.poetry.records[q.id]||{right:0,wrong:0},xp=right&&r.right===0?12:0;
    if(right)r.right++;else r.wrong++;s.poetry.records[q.id]=r;s.poetry.answered++;if(right)s.poetry.correct++;
    Object.assign(e,{phase:'feedback',input:String(input).slice(0,100),correct:right,xp});return {correct:right,xp};
  }
  function restore(value){
    const s=create(),x=value;if(!x||typeof x!=='object')return s;
    s.active=x.active===true;
    if(authorById.has(x.heroId))s.heroId=x.heroId;
    if(Array.isArray(x.met))s.met=[...new Set(x.met.filter(id=>authorById.has(id)))];
    if(Array.isArray(x.collected))s.collected=[...new Set(x.collected.filter(id=>poemById.has(id)))];
    if(Array.isArray(x.history))s.history=x.history.filter(id=>poemById.has(id)).slice(-24);
    const integer=n=>Number.isInteger(n)&&n>=0&&n<=1000000;
    if(x.records&&typeof x.records==='object')for(const [id,r]of Object.entries(x.records))if(questionById.has(id)&&r&&integer(r.right)&&integer(r.wrong))s.records[id]={right:r.right,wrong:r.wrong};
    s.correct=integer(x.correct)?x.correct:0;s.answered=integer(x.answered)&&x.answered>=s.correct?x.answered:s.correct;
    const e=x.encounter,q=e&&questionById.get(e.questionId);
    if(q&&q.author===e.authorId&&q.poemId===e.poemId&&['recite','question','feedback'].includes(e.phase)){
      if(e.phase!=='feedback'||(typeof e.correct==='boolean'&&[0,12].includes(e.xp)))s.encounter={authorId:e.authorId,poemId:e.poemId,questionId:e.questionId,phase:e.phase,input:typeof e.input==='string'?e.input.slice(0,100):null,correct:e.phase==='feedback'?e.correct:null,xp:e.phase==='feedback'?e.xp:0,draft:typeof e.draft==='string'?e.draft.slice(0,100):'',selection:['0','1','2','3'].includes(e.selection)?e.selection:null};
    }
    const w=x.realm;if(w&&walkable(w.x,w.y)){s.realm.x=w.x;s.realm.y=w.y;if(['up','down','left','right'].includes(w.facing))s.realm.facing=w.facing;if(authorById.has(w.nearId))s.realm.nearId=w.nearId;if(s.encounter&&s.encounter.authorId===w.openId&&npcs.some(n=>n.authorId===w.openId&&Math.abs(n.x-w.x)+Math.abs(n.y-w.y)<=1))s.realm.openId=w.openId;}
    return s;
  }
  const api={authors,authorById,works,poemById,questions,questionById,npcs,WIDTH,HEIGHT,TILE,SPAWN,terrain,walkable,nearby,move,open,close,create,normalize,correct,begin,ask,answer,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OSQuestPoetry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
