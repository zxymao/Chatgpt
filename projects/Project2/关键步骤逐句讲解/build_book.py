#!/usr/bin/env python3
"""Build a task-oriented book from exact archived source and hand-written notes."""
from pathlib import Path
from collections import Counter
import hashlib
import html
import json
import re
import tarfile
import unicodedata
from pygments import lex
from pygments.lexers import get_lexer_for_filename, TextLexer
from pygments.formatters import HtmlFormatter
from content_task1 import STEPS as PART1
from content_task2 import STEPS as PART2
from content_task3 import STEPS as PART3
from content_task4 import STEPS as PART4

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
STEM = 'Project2-关键步骤与逐句讲解'
TITLE = 'Project 2：关键步骤与逐句讲解'
STEPS = PART1 + PART2 + PART3 + PART4
esc = html.escape


def p(text):
    return '<p>'+esc(str(text))+'</p>'


def paras(texts):
    return ''.join(p(text) for text in texts)


def box(title, text, kind='note'):
    return f'<aside class="{kind}"><strong>{esc(title)}</strong>{p(text)}</aside>'


def ul(items, ordered=False):
    tag = 'ol' if ordered else 'ul'
    return '<'+tag+'>'+''.join('<li>'+esc(str(item))+'</li>' for item in items)+'</'+tag+'>'


def table(headers, rows):
    return '<table><thead><tr>'+''.join('<th>'+esc(s)+'</th>' for s in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(str(s))+'</td>' for s in row)+'</tr>' for row in rows)+'</tbody></table>'


def archive_sources(path):
    data = {}
    with tarfile.open(path) as tar:
        for member in tar.getmembers():
            if member.isfile():
                name = '/'.join(member.name.split('/')[1:])
                data[name] = tar.extractfile(member).read()
    return data


def validate_and_mark(diff_text, raw):
    """Check every saved hunk against both archives; mark exact '+' source lines."""
    lines=diff_text.splitlines();i=0;patches=0;hunks=0;marked={}
    while i<len(lines):
        if not lines[i].startswith('--- '):i+=1;continue
        old,new=lines[i][4:],lines[i+1][4:];i+=2;patches+=1
        op=old.split('/',1)[1] if old!='/dev/null' else None
        np=new.split('/',1)[1] if new!='/dev/null' else None
        aa=raw['P1'][op].decode().splitlines() if op else []
        bb=raw['P2'][np].decode().splitlines() if np else []
        if np:marked.setdefault(np,set())
        while i<len(lines) and not lines[i].startswith('--- '):
            match=re.match(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',lines[i])
            if not match:i+=1;continue
            a,b=int(match[1]),int(match[3]);na,nb=int(match[2] or 1),int(match[4] or 1)
            i+=1;oldpart=[];newpart=[];pos=b
            while i<len(lines) and not lines[i].startswith(('@@ ','--- ')):
                value=lines[i]
                if value.startswith(' '):oldpart.append(value[1:]);newpart.append(value[1:]);pos+=1
                elif value.startswith('-'):oldpart.append(value[1:])
                elif value.startswith('+'):
                    newpart.append(value[1:])
                    if np:marked[np].add(pos)
                    pos+=1
                i+=1
            assert len(oldpart)==na and len(newpart)==nb,(op,np,'hunk size')
            assert oldpart==aa[max(0,a-1):max(0,a-1)+len(oldpart)],(op,a)
            assert newpart==bb[max(0,b-1):max(0,b-1)+len(newpart)],(np,b)
            hunks+=1
    return marked,{'file_patches':patches,'hunks':hunks,'all_old_and_new_hunk_lines_match_archives':True}


def source_code(text, filename, first, changed):
    try:
        lexer = get_lexer_for_filename(filename, stripnl=False, ensurenl=False)
    except Exception:
        lexer = TextLexer(stripnl=False, ensurenl=False)
    formatter = HtmlFormatter(style='friendly')
    rows = []
    number = first
    width = 0
    continuation = False
    fragments = []

    def emit():
        nonlocal fragments
        label = '&gt;' if continuation else str(number)
        marker = '+' if number in changed else ''
        cls = 'code-line changed' if number in changed else 'code-line'
        rows.append(f'<div class="{cls}"><span class="marker">{marker}</span><span class="lineno">{label}</span><code>'+''.join(fragments)+'</code></div>')
        fragments = []

    for token, value in lex(text.expandtabs(4), lexer):
        css = formatter._get_css_class(token)
        part = ''

        def flush():
            nonlocal part
            if part:
                fragments.append(f'<span class="{css}">{esc(part)}</span>')
                part = ''

        for ch in value:
            if ch == '\n':
                flush(); emit()
                number += 1; width = 0; continuation = False
                continue
            size = 2 if unicodedata.east_asian_width(ch) in 'WF' else 1
            if width + size > 87:
                flush(); emit(); width = 0; continuation = True
            part += ch; width += size
        flush()
    if fragments:
        emit()
    return '<div class="source">'+''.join(rows)+'</div>'


def diagrams():
    # Static SVG is embedded in both offline HTML and printable PDF.
    common = '<style>text{font-family:"Noto Sans CJK SC",sans-serif;fill:#25435d;font-size:16px}.small{font-size:13px}.box{fill:#eef6fb;stroke:#8baebf;stroke-width:1.5}.green{fill:#eaf6f1;stroke:#65a58f;stroke-width:1.5}</style>'
    stack = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 315">'+common+'''
<text x="20" y="25">高地址：ktop（内核栈顶）</text>
<rect class="box" x="20" y="38" width="425" height="104" rx="5"/>
<text x="40" y="68">regs_context_t：288 字节</text>
<text class="small" x="40" y="96">32 个 GPR 槽 + sstatus / sepc / stval / scause</text>
<text class="small" x="40" y="121">保存的 sp = utop；sepc = entry；SPP 决定模式</text>
<text x="470" y="140">regs = ktop − 288</text>
<rect class="green" x="20" y="145" width="425" height="82" rx="5"/>
<text x="40" y="175">switchto_context_t：112 字节</text>
<text class="small" x="40" y="201">ra = ret_from_exception；保存的 sp = sw</text>
<text x="470" y="224">sw = regs − 112</text>
<text x="20" y="257">task-&gt;kernel_sp 初始指向 sw；栈继续向低地址增长。</text>
<text class="small" x="20" y="289">另有一页任务栈：PCB 记录其基址，utop 为高地址栈顶；与这页内核栈分开。</text>
</svg>'''
    transition = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 190">'+common+'''
<rect class="box" x="10" y="50" width="205" height="62" rx="6"/><text x="112" y="88" text-anchor="middle">READY：在就绪队列</text>
<rect class="green" x="300" y="50" width="205" height="62" rx="6"/><text x="402" y="88" text-anchor="middle">RUNNING：当前执行</text>
<rect class="box" x="590" y="50" width="200" height="62" rx="6"/><text x="690" y="88" text-anchor="middle">BLOCKED：在等待队列</text>
<text class="small" x="238" y="72">调度 →</text><text class="small" x="235" y="108">← yield</text>
<text class="small" x="523" y="72">阻塞 →</text><text class="small" x="260" y="153">唤醒：BLOCKED → READY；不是立刻变 RUNNING</text>
<text class="small" x="22" y="184">同一个 PCB 在状态与队列间迁移；一个 list 节点不能同时挂到两个队列。</text>
</svg>'''
    return stack, transition


def intro(stats, sha):
    stack, transition = diagrams()
    s = '<section class="chapter" id="intro"><h1>先看目标，再沿执行链读代码</h1>'
    s += paras([
        '这份讲义按当前Project2-Acore的Task1—4组织：主动切换、互斥阻塞、U态系统调用与睡眠、时钟抢占。依据是仓库README、完成版源码及课程框架差异文件；本包没有实现Task5，不能把保留的fly1—fly5文件当成已完成接口。',
        '你要求的是“如何完成实验的关键步骤”，所以这里不按diff里每一个加减号逐行扫。格式调整、版权头、一般输出库和保留原样的P1链接脚本不重复深讲；任务栈、队列、异常与锁等关键依赖，即使部分声明来自框架，也完整展示并说明来源。',
        f'全书选出{stats["steps"]}个步骤、{stats["blocks"]}段连续原代码，共{stats["quoted_lines"]}个代码行次、{stats["explanations"]}条解释。每个关键函数或宏先整段列出，再按原行号解释；所选代码没有插入省略号。重复寄存器搬运按相同规则分组，原始每条指令仍保留。',
        '原文直接从两个压缩包读取，保留文件路径和行号。代码左侧“+”表示该行相对P1新增或替换；未标记行是保留的必要上下文。这不代表所有“+”都由本次编写：文件来源标签还区分课程框架与后续实现。',
    ])
    s += table(['任务', '要形成的闭环', '重点步骤'],[
        ['Task1','PCB / 独立栈 → 初始现场 → 就绪队列 → 调度 → 保存/恢复 → 主动yield','02—08'],
        ['Task2','同key同锁 → 原子竞争 → 失败阻塞 → 释放移交 → 唤醒后继续','09—11'],
        ['Task3','U态ecall → 选内核栈/保存 → 服务分发 → 恢复/sret；sleep到期回就绪','12—16'],
        ['Task4','注册timer → 设置下一次时刻 → 抢占调度 → idle也能唤醒','17—18'],
        ['共同前提','构建任务与地址对应、装载可取指、用户输出参数检查','19—20'],
    ])
    s += '<h2>读每一段时，先回答四个问题</h2>'+ul([
        '输入是什么：参数、当前PCB、队列和寄存器在进入前是什么状态？',
        '改变什么：写了哪个字段、哪个寄存器、哪几条链表连接？',
        '下一步由谁执行：普通return、换到另一任务、异常返回，还是继续等待？',
        '哪项现象能验证它：双计数、持锁竞争、非法调用返回、睡眠下界还是异步抢占？',
    ], True)
    s += '<h2>任务状态图</h2>'+transition
    s += '<h2>两种帧先分开记</h2>'+stack
    s += table(['对象','含义','典型写入者'],[
        ['task_info_t（48字节）','程序在镜像里的名字/偏移/大小/入口；不是运行中的任务','宿主createimage'],
        ['pcb_t','任务身份、状态、栈位置、队列节点、唤醒时刻','初始化与调度/锁/sleep'],
        ['switchto_context_t（112字节）','C调用边界的ra/sp/s0—s11','switch_to或首次预制'],
        ['regs_context_t（288字节）','被打断时全部GPR槽与返回相关CSR','SAVE_CONTEXT或首次预制'],
    ])
    s += box('代码读法', 'x->field表示访问指针x所指对象的成员；&x取地址；*p访问p指向的对象。函数指针表中存的是入口地址，填表不执行服务。ret取ra为PC，sret取sepc并恢复特权级相关状态；sp决定从哪块栈读回保存的数据。')
    s += '<h2>反复出现的寄存器，先查这张表</h2>'
    s += table(['名称','本书中的用途'],[
        ['ra / sp / tp','普通返回地址 / 栈顶 / 内核current_running绑定的PCB指针；用户tp要原样保存'],
        ['a0—a4 / a7','系统调用参数 / 系统调用号；返回值用a0'],
        ['CSR','控制与状态寄存器的统称；不是普通的C内存变量'],
        ['stvec / sscratch','S态异常入口 / 正常边界上用于定位当前PCB的锚点'],
        ['sepc','异常返回PC；ecall处理后加4，时钟中断不跳过用户指令'],
        ['sstatus.SPP','记录陷入前模式，也决定sret回U态还是S态'],
        ['sstatus.SIE / SPIE','S态全局中断允许 / 异常返回时恢复SIE所用的保存位'],
        ['sie.STIE','单独允许S态定时中断源；与全局SIE不是同一寄存器中的同一位'],
        ['rdtime / time_base','硬件tick读数 / 每秒tick数；两者配合才可换算秒数'],
    ])
    s += p('三层接口要分开：BIOS入口提供固件服务；固定地址jmptab是普通函数指针表；syscall[]是内核在ecall异常之后使用的服务分发表。号码相似或都用a7，并不表示它们属于同一层。')
    s += box('本书的验证范围', '本次重新执行了镜像10项检查、四阶段通用QEMU检查、默认六任务组合和单probe的idle唤醒。运行器在临时副本中明确重定位地址并使用独立测试BIOS；原课程源码不变。课程QEMU/U-Boot、实际块设备、loadbootd/DASIC和Pynq板端仍未实测。', 'warn')
    s += '<p class="small">Project2-Acore压缩包 SHA-256：<span class="hash">'+sha+'</span></p></section>'
    return s


def conclusion(results):
    s = '<section class="chapter" id="conclusion"><h1>最后：现象、原因、验证一一对应</h1>'
    s += table(['观察什么','由什么代码保证','只看到什么还不够'],[
        ['两个协作计数都增长','步骤03队列、06调度、07切栈、08主动yield共同形成闭环','仅有两个LOAD打印不证明两任务已执行'],
        ['锁等待者不能提前进临界区','步骤11先BLOCKED再等待，释放时先交owner再READY，底层锁保持占用','只跑无竞争的单任务锁测试'],
        ['系统调用后回到下一条用户指令','步骤12传参、13保存、14写a0并sepc+=4、15恢复和sret','只确认ecall进入内核但没有正确返回'],
        ['睡眠时其他任务继续，到期后恢复','步骤16设置绝对tick并阻塞，调度前检查到期并回READY','用户忙等若干秒后输出'],
        ['没有主动yield也能切换','步骤17周期重设timer、完整现场保护、调用do_scheduler','仅看printf计数，不覆盖无系统调用的计算段'],
        ['全体用户任务sleep后仍会醒','步骤18空队列选pid0，Task3轮询或Task4 WFI/IRQ重新调度','只有两任务互相轮转、从未遇到空队列'],
        ['非法调用号与坏字符串得到明确错误','步骤14未注册/越界号码返回-38；步骤20越界字符串返回-14','没有异常不等于指针检查确实执行'],
    ])
    s += '<h2>本次重新运行的证据</h2>'
    s += table(['检查','本次结果','退出码'],[(r['name'],r['result'],r['exit_code']) for r in results['records']])
    s += p(results['scope'])+p(results['exit_status_note'])
    s += box('从两个PASS还能读出什么', '阶段4的probe1/probe2先后start、在双方无系统调用的CPU循环结束前都已开始，然后检查用户寄存器、ENOSYS/EFAULT、锁与sleep并各自PASS。单probe另覆盖所有用户任务睡眠后的idle路径。它们比“屏幕上有输出”覆盖更多关键失误。', 'ok')
    s += '<h2>真正到lab时怎样分阶段观察</h2>'
    s += p('在解压的Project2-Acore根目录运行，使用课程现有编译器/QEMU/U-Boot配置。以下是课程环境预期命令，不代表本云环境已经直接运行了课程专用QEMU。')
    s += '<pre class="command">make run LAB_STAGE=1\nmake run LAB_STAGE=2\nmake run LAB_STAGE=3\nmake run LAB_STAGE=4\nmake run LAB_STAGE=4 TASKS=\'probe1 probe2\'\nmake run LAB_STAGE=4 TASKS=\'probe1\'</pre>'
    s += table(['阶段','应该看到的现象'],[
        ['1','[COOP 1]、[COOP 2]计数都更新，主动让出后从原位置继续'],
        ['2','两个mutex任务轮流出现acquired/release；持锁yield时另一个任务等待'],
        ['3','sleep暂停后继续计数；coop_timer超过2秒；此阶段没有定时抢占'],
        ['4默认','print1/2、lock1/2、sleep、timer各行持续变化，不依赖打印任务主动yield'],
        ['4双probe','两个start、计算结束标志、锁交接与两个PASS'],
        ['4单probe','唯一用户任务睡眠后恢复并出现PASS，验证idle及唤醒'],
    ])
    s += p('这些任务往往通过VT100光标定位更新同一行，并不总是向下追加日志。观察画面时给终端足够行数；机器检查使用现有运行器重建屏幕，而不是把“运行了几秒没退出”当作通过。')
    s += '<h2>把整条链自己讲一遍</h2>'+ul([
        'TASKS决定映像里有哪些程序；boot传任务记录；内核把每个程序变成PCB、两块栈和两个初始帧。',
        '就绪队列选中任务，switch_to换成其内核帧，首次ret进入ret_from_exception，sret进入crt0，再call用户main。',
        '主动yield或阻塞请求先进入内核；调度器根据状态决定是否回队尾，并保存当前调用链。',
        '锁与sleep把暂不可运行的任务挂到等待队列；唤醒只让其READY，以后调度回来从原来的do_block之后继续。',
        'Task4的时钟不需要用户同意：入口保存完整现场，处理器重设下次时钟并调度，最终恢复被打断的任务。',
    ],True)
    s += '<h2>不属于本书已证明的能力</h2>'+ul([
        'Task5接口、动态创建/退出/kill、退出时自动释放锁。',
        '页表带来的完整地址空间隔离、SMP多核同步、任意FPU程序上下文。',
        '课程QEMU/U-Boot真实磁盘路径、loadbootd/DASIC及Pynq硬件验收。',
    ])
    s += '</section>'
    return s


CSS = r'''
@page{size:A4;margin:17mm 14mm 18mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Noto Sans CJK SC',sans-serif;color:#23384c;font-size:10pt;line-height:1.72;margin:0}h1,h2,h3{line-height:1.4;break-after:avoid}h1{color:#143f64;font-size:23pt;margin:0 0 6mm}h2{color:#106b61;font-size:14.5pt;border-bottom:1px solid #b9d8d5;padding-bottom:2mm;margin:7mm 0 3mm}h3{font-size:11.5pt;color:#27577b;margin:5mm 0 2mm}p{margin:2mm 0 3mm;orphans:3;widows:3}a{color:#155e91;text-decoration:none;overflow-wrap:anywhere}li{margin:1.5mm 0;orphans:2;widows:2}ul,ol{padding-left:6mm}table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:9pt;line-height:1.65;margin:3mm 0 5mm}th,td{border:1px solid #d2e1e9;padding:2mm 2.5mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e8f1f8;color:#194b6e}thead{display:table-header-group}tr{break-inside:avoid}aside{padding:3mm 4mm;background:#eef6fb;border-left:1.2mm solid #2787a4;border-radius:1.5mm;margin:4mm 0;break-inside:avoid}aside p:last-child{margin-bottom:0}aside.warn{background:#fff5e1;border-color:#d5972d}aside.ok{background:#edf8f1;border-color:#29866e}.chapter{break-before:page}.eyebrow{font-size:9.5pt;color:#148378;font-weight:700;letter-spacing:1px}.cover{min-height:244mm;padding-top:22mm;break-after:page}.cover h1{font-size:33pt;margin:12mm 0 8mm;line-height:1.45}.cover .subtitle{font-size:17pt;color:#4d6f86}.ribbon{background:linear-gradient(105deg,#173f66,#157b72);color:white;border-radius:3mm;padding:6mm;margin:14mm 0 10mm;font-size:13pt}.small{font-size:8.8pt;color:#58728a}.hash{font-family:monospace;font-size:7.6pt;word-break:break-all}.cover .bottom{border-top:1px solid #c9dce8;margin-top:16mm;padding-top:5mm}.role{background:#f1f6f9;border-left:1mm solid #85aec2;padding:3mm 4mm}.stage{display:inline-block;background:#126d63;color:white;padding:1mm 3mm;border-radius:1mm;font-size:10pt}.source-meta{font-size:8.5pt;color:#526f84;overflow-wrap:anywhere}.source{border:1px solid #cbdce7;background:#f5f8fb;padding:3mm 1mm;font-size:8.2pt;line-height:1.53;margin:3mm 0 5mm}.code-line{display:flex;break-inside:avoid;min-height:12.6pt}.code-line.changed{background:#fff6e2}.marker{flex:0 0 3mm;color:#b47716;font:8pt/1.55 monospace;text-align:center}.lineno{flex:0 0 9mm;text-align:right;padding-right:2mm;color:#6f8aa1;font:7.5pt/1.68 'DejaVu Sans Mono',monospace}.code-line code{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;font-family:'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace}.explain{display:flex;border-bottom:1px solid #dbe7ee;padding:3mm 0;break-inside:avoid}.range{flex:0 0 16mm;color:#117469;font-size:9pt;font-weight:700;padding-right:2mm}.explain-body{flex:1;min-width:0}.explain-body pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;background:#f0f5fa;padding:2mm;margin:0 0 2mm;font:8pt/1.55 'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace;color:#285573}.explain-body p{margin:0;font-size:9.6pt}.command{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef5fa;padding:4mm;font:9pt/1.7 'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace}.toc li{font-size:9.4pt}.tocgroup{margin-top:4mm}.code-part{margin-top:7mm}.qa{background:#fff5e9;border-left:1mm solid #d08a3b;padding:3mm 5mm}.flow{padding:4mm;border:1px solid #add2c9;background:#eef8f3;border-radius:2mm;white-space:pre-wrap;font-size:10pt;line-height:1.9}svg{display:block;width:100%;height:auto;break-inside:avoid;margin:4mm 0}.license{font:7.5pt/1.5 monospace;white-space:pre-wrap}.navback{font-size:8pt;margin-top:5mm}@media print{.navback{display:none}}@media screen{body{max-width:920px;margin:25px auto;padding:35px;box-shadow:0 0 22px #d2dce4}.chapter{margin-top:55px}.cover{min-height:720px}}
'''


def build():
    p1archive = REPO/'projects/Project1/Project1-current.tar.gz'
    p2archive = REPO/'projects/Project2/Project2-Acore.tar.gz'
    expected = {'P1':'11cffe9e85474e2f24b3b6ea528495b4b332f2c0839a064c336a92c8888d4f94',
                'P2':'2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20'}
    raw = {'P1':archive_sources(p1archive),'P2':archive_sources(p2archive)}
    for version, path in [('P1',p1archive),('P2',p2archive)]:
        assert hashlib.sha256(path.read_bytes()).hexdigest()==expected[version]
    source = {}
    for version, data in raw.items():
        for name, content in data.items():
            try: source[version+':'+name] = content.decode('utf-8')
            except UnicodeDecodeError: pass
    # Classify file provenance from the framework comparison, not from assumptions.
    fw = (REPO/'projects/Project2/Project2-framework-to-implementation.diff').read_text()
    fw_old = set(re.findall(r'^--- Project2-framework/(.+)$',fw,re.M))
    fw_new = set(re.findall(r'^\+\+\+ Project2-Acore/(.+)$',fw,re.M))
    added_by_impl = fw_new-fw_old
    changed,diff_check=validate_and_mark((REPO/'projects/Project2/Project1-to-Project2.diff').read_text(),raw)
    (ROOT/'diff-check.json').write_text(json.dumps(diff_check,ensure_ascii=False,indent=2)+'\n')

    def provenance(block):
        name=block['path']
        if block['version']=='P1':return 'P1原实现：对比起点'
        p1='相对P1修改的文件' if name in raw['P1'] else '相对P1新增的文件'
        if name in raw['P1'] and raw['P1'][name].decode().splitlines()==raw['P2'][name].decode().splitlines():p1='沿用P1的背景文件'
        if name in added_by_impl: origin='完成版新增'
        elif name in fw_old: origin='课程框架基础上修改／补全'
        else: origin='课程框架保留的关键依赖'
        return p1+'；'+origin

    def check_text(value):
        if isinstance(value,str): assert all(ord(ch)>=32 for ch in value), repr(value)
        elif isinstance(value,list):
            for x in value: check_text(x)
        elif isinstance(value,dict):
            for x in value.values():check_text(x)
    check_text(STEPS)
    coverage=[]; unique=set(); block_count=0
    for step in STEPS:
        for block in step['blocks']:
            block_count+=1
            key=block['version']+':'+block['path']; lines=source[key].splitlines()
            assert 1<=block['start']<=block['end']<=len(lines),(step['number'],key)
            counts=Counter()
            for note in block['notes']:
                assert block['start']<=note['start']<=note['end']<=block['end'], (key,note)
                counts.update(range(note['start'],note['end']+1))
            assert all(counts[n]==1 for n in range(block['start'],block['end']+1) if lines[n-1].strip()), (step['number'],key)
            selected='\n'.join(lines[block['start']-1:block['end']])
            assert '\x00' not in selected
            unique.update((key,n) for n in range(block['start'],block['end']+1))
            coverage.append({'step':step['number'],'source':key,'first':block['start'],'last':block['end'],
                             'quote_sha256':hashlib.sha256(selected.encode()).hexdigest(),
                             'explanations':len(block['notes']),'all_selected_nonblank_lines_explained_once':True})
    stats={'steps':len(STEPS),'blocks':len(coverage),'quoted_lines':sum(c['last']-c['first']+1 for c in coverage),
           'unique_source_lines':len(unique),'explanations':sum(c['explanations'] for c in coverage),
           'selected_source_files':len({c['source'] for c in coverage})}
    cover='<section class="cover"><div class="eyebrow">PROJECT 2 · TASK 1—4 · 按关键步骤学习</div><h1>从“调用程序”<br>到“管理任务”</h1><p class="subtitle">关键代码整段展示<br>逐句理解每一次启动、暂停与恢复</p><div class="ribbon">目标 → 完整实现块 → 行号解释 → 状态推演 → 验证现象</div>'
    cover+=p(f'{stats["steps"]}个步骤 · {stats["blocks"]}段原代码 · {stats["quoted_lines"]}个代码行次 · {stats["explanations"]}条解释')
    cover+='<p class="small">依据你的Project1-current与当前Project2-Acore源码包<br>2026年11月12日 · 原代码不改 · 彩色可检索PDF</p><div class="bottom">'+p('围绕实验目标挑选代码，不把每个文本差异都当重点。完整宏与函数保留，重复寄存器指令按规则解释。')+'<p class="small">第一次启动 · PCB与队列 · switch_to · 互斥阻塞 · ecall/sret · sleep · timer/idle</p></div></section>'
    toc='<nav class="chapter toc" id="toc"><h1>阅读路线与目录</h1><p><a href="#intro">先看目标、状态图与两种栈帧</a></p><ol>'
    for step in STEPS:toc+=f'<li><a href="#step-{step["number"]}">{esc(step["task"])}：{esc(step["title"])}</a></li>'
    toc+='</ol><p><a href="#sources">来源、选择范围与许可证</a></p><p><a href="#conclusion">最后：现象、对应代码、本次运行结果与lab命令</a></p></nav>'
    body=[cover,toc,intro(stats,expected['P2'])]
    for step in STEPS:
        chunk=f'<section class="chapter" id="step-{step["number"]}"><div class="eyebrow">{esc(step["task"])}</div><h1>{step["number"]}　{esc(step["title"])}</h1>'
        chunk+=box('这一步要完成什么',step['goal'])+p('与P1／前一步的关系：'+step['before'])+p('输入、输出与运行条件：'+step['contract'])
        for j,block in enumerate(step['blocks'],1):
            key=block['version']+':'+block['path']; lines=source[key].splitlines()
            chosen='\n'.join(lines[block['start']-1:block['end']])
            chunk+=f'<div class="code-part"><h2>{j}. {esc(block["title"])}</h2><p class="source-meta">{esc(key)} · L{block["start"]}–L{block["end"]} · {esc(block["kind"])}<br>{esc(provenance(block))}</p>'
            chunk+=source_code(chosen,block['path'],block['start'],changed.get(block['path'],set()) if block['version']=='P2' else set())
            chunk+='<h3>按原始行号逐句理解</h3>'
            for note in block['notes']:
                label='L'+str(note['start'])+(('–'+str(note['end'])) if note['end']!=note['start'] else '')
                quoted='\n'.join(lines[note['start']-1:note['end']]).expandtabs(4)
                excerpt=''
                if note['end']-note['start']<=3 and len(quoted)<430:excerpt='<pre>'+esc(quoted)+'</pre>'
                chunk+=f'<div class="explain"><div class="range">{label}</div><div class="explain-body">{excerpt}{p(note["text"])}</div></div>'
            chunk+='</div>'
        chunk+='<h2>把执行过程手算一遍</h2>'+ul(step['trace'],True)
        chunk+='<h2>应该看到什么，由哪里保证</h2>'+ul(step['phenomena'])+p('对应本次验证：'+step['verify']+'（详细范围和结果见末尾）。')
        chunk+='<div class="qa" style="font-size:9pt;line-height:1.6;padding:2mm 3mm;margin-top:3mm"><strong>理解边界：</strong>'+esc(' '.join(step['pitfalls']))+'</div><p class="navback"><a href="#toc">返回目录</a></p></section>'
        body.append(chunk)
    results=json.loads((ROOT/'validation/results.json').read_text())
    attribution='<section class="chapter" id="sources"><h1>来源、选择范围与原始许可</h1>'
    attribution+=p('本书是教学解释，不是新的内核实现。对比来源为projects/Project1/Project1-current.tar.gz与projects/Project2/Project2-Acore.tar.gz，另外用Project2-framework-to-implementation.diff区分框架与完成实现。原上传源与工程源码均未改动。')
    attribution+=table(['材料','SHA-256'],[
        ['Project1-current.tar.gz',expected['P1']],['Project2-Acore.tar.gz',expected['P2']],
        *[(name,hashlib.sha256((REPO/'projects/Project2'/name).read_bytes()).hexdigest()) for name in ['Project1-to-Project2.diff','Project2-framework-to-implementation.diff']],
    ])
    attribution+=p('选择范围：包括实际完成任务所需的函数、宏、类型和构建逻辑；不承诺覆盖整个工程所有差异。844行是代码行次，重复展示的统一返回入口计入两次；coverage.json另记录去重行数。每段都从归档连续取出，不把拼接后的伪代码当原函数。')
    attribution+=p('没有展开讲解的一般格式化库、屏幕绘制细节、注释排版和保留原样P1节布局，可回到源码包查阅。工具链与镜像检查在第19步交代关键前提，不替代完整镜像格式手册。')
    attribution+=p('框架源码保留原作者版权与许可。下列为本书所引课程C/头文件中的原始许可声明；各原文件的其他许可标记仍以压缩包为准。')
    license_text='\n'.join(re.sub(r'^\s*\* ?', '',line) for line in source['P2:include/os/sched.h'].splitlines()[1:25] if line.strip().strip('*').strip())
    attribution+='<pre class="license">'+esc(license_text)+'</pre></section>'
    body.append(attribution)
    body.append(conclusion(results))
    editorial_css='#step-11 .explain{padding-top:2.6mm;padding-bottom:2.6mm}'
    document='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+TITLE+'</title><style>'+CSS+editorial_css+HtmlFormatter(style='friendly').get_style_defs('.source')+'</style></head><body>'+''.join(body)+'</body></html>'
    assert '\x00' not in document
    (ROOT/(STEM+'.html')).write_text(document)
    (ROOT/'steps.json').write_text(json.dumps(STEPS,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'coverage.json').write_text(json.dumps({'statistics':stats,'blocks':coverage},ensure_ascii=False,indent=2)+'\n')
    selectedkeys={r['source'] for r in coverage}
    manifest={'archives':expected,'selected_sources':{key:{'sha256':hashlib.sha256(source[key].encode()).hexdigest(),'lines':len(source[key].splitlines())} for key in sorted(selectedkeys)}}
    (ROOT/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(stats,ensure_ascii=False))


if __name__=='__main__':
    build()
