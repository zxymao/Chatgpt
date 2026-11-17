#!/usr/bin/env python3
"""Render source-faithful Project3 teaching notes to offline HTML and Markdown."""
from pathlib import Path
from collections import Counter
import difflib
import hashlib
import html
import json
import tarfile
from pygments.formatters import HtmlFormatter
from book_style import p, paras, box, ul, table, source_code, CSS
from content_intro import STEPS_START, STEPS_END
from content_process import STEPS as PROCESS
from content_shell import STEPS as SHELL
from content_sync import STEPS as SYNC

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
STEM = 'Project3-关键步骤与逐句讲解'
TITLE = 'Project 3 S-Core：关键步骤与逐句讲解'
STEPS = STEPS_START + PROCESS + SHELL + SYNC + STEPS_END
esc = html.escape
ARCHIVES = {
    'P2': ('projects/Project2/Project2-Acore.tar.gz', '2ab7415ff127705c660a5ed35255e53beab81bf185b5ddcde4c9556a5cab9a20'),
    'P3': ('oslab/Project3-SCore-complete.tar.gz', 'b2c65f3c60162d92abe5abc479202e9d67c511ff55f9d8509a87855b107e4ba5'),
}


def read_archive(path):
    files = {}
    with tarfile.open(path) as tar:
        for member in tar.getmembers():
            if member.isfile():
                name = member.name.split('/', 1)[1]
                assert name not in files, name
                files[name] = tar.extractfile(member).read()
    return files


def process_diagram():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 260" role="img" aria-label="进程状态与延迟复用">
<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#30796f"/></marker></defs>
<style>text{font:15px 'Noto Sans CJK SC',sans-serif;fill:#25435d}.node{fill:#eef6fb;stroke:#86aabd}.edge{stroke:#30796f;fill:none;marker-end:url(#arrow)}.small{font-size:12px}</style>
<rect class="node" x="15" y="35" width="175" height="60" rx="6"/><text x="102" y="62" text-anchor="middle">READY</text><text class="small" x="102" y="82" text-anchor="middle">ready_queue</text>
<rect class="node" x="310" y="35" width="175" height="60" rx="6"/><text x="397" y="62" text-anchor="middle">RUNNING</text><text class="small" x="397" y="82" text-anchor="middle">current_running</text>
<rect class="node" x="610" y="35" width="175" height="60" rx="6"/><text x="697" y="62" text-anchor="middle">BLOCKED</text><text class="small" x="697" y="82" text-anchor="middle">锁 / sleep / waitpid / barrier</text>
<path class="edge" d="M190 52H310"/><text class="small" x="250" y="43" text-anchor="middle">调度选中</text>
<path class="edge" d="M310 84H190"/><text class="small" x="250" y="108" text-anchor="middle">让出 / 抢占</text>
<path class="edge" d="M485 52H610"/><text class="small" x="547" y="43" text-anchor="middle">等待条件</text>
<path class="edge" d="M697 95V135H102V95"/><text class="small" x="397" y="129" text-anchor="middle">解除等待后回 READY；不会立刻替换当前进程</text>
<rect class="node" x="310" y="173" width="175" height="55" rx="6"/><text x="397" y="195" text-anchor="middle">EXITED</text><text class="small" x="397" y="216" text-anchor="middle">清队列 / 释放锁 / 唤醒等待者</text>
<path class="edge" d="M397 95V173"/><text class="small" x="450" y="160">exit / kill</text>
<path class="edge" d="M485 200H750"/><text class="small" x="620" y="188" text-anchor="middle">切走后 reap：used=0</text><text class="small" x="620" y="219" text-anchor="middle">新 PID 可复用 PCB 和两页栈</text>
<text class="small" x="15" y="251">kill 也可结束 READY / BLOCKED；当前栈还在执行时，不能把它交给新进程。</text></svg>'''


def intro(stats):
    s = '<section class="chapter" id="intro"><h1>先建立 P3 的全景图</h1>'
    s += paras([
        'P1 解决“镜像里的程序怎样被装载并执行”；P2 解决“多个任务怎样保存现场并轮流运行”；P3 在这套机制上增加“谁创建、谁等待、怎样结束、怎样让一组进程反复会合”。本书沿用前两本的完整代码、原行号解释和现象依据形式，按 S-Core 的关键实现步骤组织。',
        '解释对象是仓库 oslab/Project3-SCore-complete.tar.gz 的完成版，含 GNU11 兼容修复；不是原始老师框架，也不修改其中任何内核或用户源码。主要范围为 Task1 进程管理与 shell、Task2 barrier。保留的条件变量、邮箱、SMP 文件或声明，不代表这些功能已经实现。',
        f'全书 {stats["steps"]} 步、{stats["blocks"]} 段连续原代码、{stats["quoted_lines"]} 个代码行次、{stats["explanations"]} 条解释。选中每段的所有非空行都通过恰好一次解释覆盖检查；这是关键块覆盖，不是整个仓库逐行覆盖。',
        '代码左侧“+”仅表示相对已归档 P2-Acore 的新增或替换行。P3 框架、合并适配、完成实现都可能贡献这些变化，不能把“+”全部说成学生或本次新写的代码。每段另说明它与 P3 原始框架文件的关系。',
    ])
    s += table(['概念', '决定什么', '不能混同'], [
        ['程序 ID / task_id', 'TASKS 的零基顺序，指向磁盘目录 tasks[]', '不是运行 PID，也不总等于 PCB 下标'],
        ['PID', '一次创建得到的进程身份，单调递增', 'PCB 槽复用不复用旧 PID'],
        ['PCB 槽位', '有限的进程状态存储，两页栈可保留复用', '不是可无限新增的对象'],
        ['pcb.list / pcb.wait_list', '自己排队的节点 / 等待我结束的队列头', '前者同一时间只能挂一条队列'],
        ['LAB_STAGE=4 / S_CORE', 'P2 的 U 态抢占基础 / P3 的整数参数接口', 'S_CORE 不是 S 模式开关'],
    ])
    s += '<h2>用一条命令串起整个实现</h2><div class="flow">shell 输入 exec 1\n→ sys_exec → ecall → handle_syscall → k_exec → do_exec\n→ PCB + 两页栈 + 两种初始帧 → ready_queue\n→ do_scheduler → switch_to → ret_from_exception → sret\n→ crt0 → 用户 main → sys_exit → finish_process\n→ 释放持有锁 / 解除屏障等待 / 唤醒 waitpid → 切走后复用槽位</div>'
    s += '<h2>状态变化与队列不变量</h2>' + process_diagram()
    s += '<h2>仍然沿用 P2 的基础</h2>'
    s += table(['基础', 'P3 中怎样继续使用'], [
        ['288 字节异常帧', '保存 32 个寄存器槽和 4 个 CSR 字段；首次启动也预置同一布局'],
        ['112 字节切换帧', '保存 ra、sp、s0—s11；首次 ra 指向统一异常返回入口'],
        ['U 态 ecall 与时钟抢占', '异常入口、服务分发、sret、timer 和 idle 仍提供动态进程的执行基础'],
        ['固定地址镜像', '不同程序使用不同槽；同程序多个实例共享映像，栈和 PCB 独立'],
    ])
    s += box('本包的能力边界', '没有页表隔离或每进程私有全局变量；同程序新实例的 crt0 仍会清共享 BSS。单核关中断保证这些路径不被本核抢占，不等于 SMP 同步。exec 创建新进程；waitpid 不返回退出状态，也不实施父子权限。', 'warn')
    s += '<h2>推荐阅读路线</h2>'+ul([
        '第01—07步：从开机到动态创建、调度、等待和结束，先守住 PCB / 栈 / 队列不变量。',
        '第08—11步：沿 shell 输入、ecall 接线、命令解析和 main 返回形成可交互闭环。',
        '第12—15步：把进程结束与锁/屏障资源管理接起来，推演正常、kill 和 destroy 分支。',
        '第16步和末尾：核对构建参数、ID、实际测试及课程机的验收边界。',
    ], True)
    return s+'</section>'


def conclusion(results):
    s = '<section class="chapter" id="validation"><h1>最后：现象、代码与本次验证</h1>'
    s += table(['观察现象', '对应代码', '需要区分'], [
        ['前台等结束，后台马上有提示符', 'shell.command / sys_waitpid / do_waitpid', '前台等待不等于关闭整个系统调度'],
        ['main 返回后进程从 ps 消失', 'crt0 → sys_exit → finish_process', '不能只 return 到未知 ra 或无限自旋'],
        ['kill 持有两把锁的睡眠任务后等待者继续', 'finish_process → mutex_release_all → owner 移交', '按目标 PID 释放，不能误用调用者 PID'],
        ['重复创建退出仍能工作', 'reap_exited / used / 两页栈基址保留', '复用槽位与栈，不复用 PID'],
        ['三参与者各完成十轮 barrier', 'arrived 达 goal → 归零 → 唤醒全部等待者', 'generation 本版没有被 wait 读取，不是额外检测机制'],
        ['销毁有等待者的屏障后继续', 'destroy 标 unused 并唤醒；kill 扣除 arrived', 'void 返回无法报告“取消”与“正常聚齐”的区别'],
    ])
    s += '<h2>本次重新执行，不引用历史 PASS</h2>'
    s += p('本次运行时间：2026年11月17日（北京时间）；GCC 14.2.0、QEMU 10.0.13。详细时间、命令和退出状态见 validation/results.json。')
    descriptions = ['原课程地址布局；内核 15,452 字节、默认六程序', '10 个镜像布局与错误处理用例', '8 组真实客体串口场景，见下表', 'P2 stage4 双 probe：抢占、寄存器、sleep 与锁移交']
    s += table(['检查', '本次结果', '退出码', '日志'], [
        [d, '通过' if r['passed'] else '失败', r['exit_code'], r['log']]
        for d, r in zip(descriptions, results['checks'])])
    p3 = results['checks'][2]
    scenarios = [
        ['shell 输入', 'ps、未知命令、退格、非法数字、长输入、clear、CR/LF/CRLF'],
        ['后台创建与终止', 'exec & 返回提示符，按实际 PID kill'],
        ['课程 waitpid', '正常退出、前台等待、ready_to_exit / wait_locks'],
        ['课程 barrier', '三个参与者分别完成十轮，等待后销毁'],
        ['参数与复用', '寄存器参数、动态 PID 字符串输出、40 次创建退出、旧 PID 等待'],
        ['持锁退出', '杀死睡眠且持两锁的进程，锁等待者恢复；随后 waitpid 接受已结束 PID'],
        ['容量与取消', 'PCB 耗尽后恢复、销毁有等待者屏障、kill 参与者'],
        ['后续可用', '测试结束 shell 仍响应，结束的测试进程不在 ps 中'],
    ]
    s += table(['P3 串口场景', '检查的实际行为'], scenarios)
    s += box('这些运行证明了什么', '运行器执行真实内核、用户程序、异常入口和上下文切换。在临时副本中把 0x50000000—0x52ffffff 加 0x30000000，并用 test/host-qemu 测试 BIOS 适配通用 QEMU。原包地址不变；课程专用 QEMU、课程 U-Boot、DASIC/loadbootd、Pynq 板端未运行。', 'warn')
    s += p('客体通常持续运行；运行器以观测到的标记、VT100 屏幕还原和断言决定结果，再主动结束模拟器。运行了几秒、未崩溃或超时本身都不是通过。每个 PASS 只对应所列用例，不代表任意执行顺序、SMP 或所有边界已被穷尽验证。')
    s += p('kill-locks 探针先调用 kill，再调用 waitpid，所以它证明的是“kill 后等待已结束 PID 立即返回”，没有直接覆盖“某进程已阻塞在被 kill 目标的 wait_list 上再被唤醒”的组合。源码中的统一清理会唤醒 wait_list；正常退出时的等待与唤醒另由课程 waitpid 场景覆盖。保留的运行器原始场景名称较宽泛，本书以实际调用顺序收窄解释。')
    s += '<h2>在本云环境重跑</h2><pre class="command">cd /workspace/Chatgpt\n. /workspace/cloud-tools/env.sh\n# 已校验解压的副本；不覆盖已有学生工程\ncd .local/Project3-SCore\nmake list-tasks CROSS_PREFIX=riscv64-linux-gnu-\nmake CROSS_PREFIX=riscv64-linux-gnu-\npython3 tools/test_image.py build/createimage\npython3 tools/host_qemu_p3.py --log-dir /tmp/p3-repeat\npython3 tools/host_qemu_smoke.py --stage 4 --seconds 8 --log /tmp/p3-p2-repeat.log</pre>'
    s += '<h2>在课程机交互检查</h2>'
    s += p('在你自己的 P3 完成工程根目录，使用课程工具链和课程 QEMU/U-Boot；make 与 make run 的前缀、TASKS 等参数保持一致。云端通用 QEMU 通过不保证这些路径已安装。先核对 make list-tasks，再 make、make run，进入课程 U-Boot 后按课程要求 loadboot。以下内容是在客体实验 shell 中输入。')
    s += '<pre class="command">ps\nexec 1\nclear\nexec 4\nexec 1 &amp;\nps\n# 读取 ps 中 ready_to_exit 的真实 PID 后输入 kill 数字PID</pre>'
    s += p('最后一行是操作说明，不是可直接输入的数字命令。默认 ID：0 shell、1 waitpid、2 ready_to_exit、3 wait_locks、4 barrier、5 test_barrier。课程 waitpid/barrier 示例优先使用上述不带位置参数的形式；老师测试的 argc==1 分支有特定约定，不应把它误解释成通用 shell 的 argc 含程序名。')
    s += '<h2>自己回答这些问题</h2>'+ul([
        '为什么 do_exec 返回的是 PID，而 k_write 查映像要用 task_id？',
        '为什么 EXITED 但 used 仍为 1 的 PCB 可能暂时不能分配？',
        'waitpid 把调用者的 list 挂在哪里？被等待者退出后由谁把它取出来？',
        'kill 一个持锁、睡眠或等 barrier 的进程，分别需要清理哪些东西？',
        'barrier 最后一个到达者为何先把 arrived 归零？为什么仅删除 generation 的记录不会改变本版 wait 判定？',
        '同程序两个实例为什么仍会互相影响 BSS？独立用户栈为何不等于私有地址空间？',
    ], True)
    return s+'</section>'


def build():
    raw = {}
    for version, (name, expected) in ARCHIVES.items():
        path = REPO/name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
        raw[version] = read_archive(path)
    framework = read_archive(REPO/'oslab/Project3-original.tar.gz')
    source = {}
    # Decode selected paths on demand, including Makefile.
    for step in STEPS:
        for block in step['blocks']:
            key = block['version']+':'+block['path']
            source[key] = raw[block['version']][block['path']].decode('utf-8')
    assert [s['number'] for s in STEPS] == [f'{i:02}' for i in range(1,17)]
    changed = {}
    for name in raw['P3']:
        if name not in {b['path'] for s in STEPS for b in s['blocks'] if b['version']=='P3'}:
            continue
        old = raw['P2'].get(name, b'').decode().splitlines()
        new = raw['P3'][name].decode().splitlines()
        changed[name] = set()
        for op, a, b, c, d in difflib.SequenceMatcher(None,old,new,autojunk=False).get_opcodes():
            if op in ('replace','insert'): changed[name].update(range(c+1,d+1))
    coverage=[]; unique=set()
    for step in STEPS:
        for block in step['blocks']:
            key=block['version']+':'+block['path']; lines=source[key].splitlines()
            assert 1 <= block['start'] <= block['end'] <= len(lines), (step['number'],key,block)
            counts=Counter()
            for note in block['notes']:
                assert block['start']<=note['start']<=note['end']<=block['end'], (step['number'],key,note)
                assert note['text'].strip() and '\ufffd' not in note['text']
                counts.update(range(note['start'], note['end']+1))
            missing=[n for n in range(block['start'],block['end']+1) if lines[n-1].strip() and counts[n]!=1]
            assert not missing,(step['number'],key,'missing/duplicate note coverage',missing)
            chosen='\n'.join(lines[block['start']-1:block['end']])
            unique.update((key,n) for n in range(block['start'],block['end']+1))
            coverage.append({'step':step['number'],'source':key,'first':block['start'],'last':block['end'],
                             'quote_sha256':hashlib.sha256(chosen.encode()).hexdigest(),
                             'explanations':len(block['notes']),'all_selected_nonblank_lines_explained_once':True})
    stats={'steps':len(STEPS),'blocks':len(coverage),'quoted_lines':sum(c['last']-c['first']+1 for c in coverage),
           'unique_source_lines':len(unique),'explanations':sum(c['explanations'] for c in coverage),
           'selected_source_files':len({c['source'] for c in coverage})}
    results=json.loads((ROOT/'validation/results.json').read_text())
    assert results['source_sha256']==ARCHIVES['P3'][1]
    assert all(r['passed'] and r['exit_code']==0 for r in results['checks'])
    cover='<section class="cover"><div class="eyebrow">PROJECT 3 · S-CORE · TASK 1—2</div><h1>从“轮流运行”<br>到“动态管理进程”</h1><p class="subtitle">进程生命周期 · 交互 shell · 可复用屏障<br>关键代码整段展示，逐句追到执行结果</p><div class="ribbon">目标 → 完整代码 → 原行号解释 → 执行推演 → 本次验证</div>'
    cover+=p(f'{stats["steps"]} 步 · {stats["blocks"]} 段原代码 · {stats["quoted_lines"]} 个代码行次 · {stats["explanations"]} 条解释')
    cover+='<p class="small">延续 Project1 / Project2 的讲义结构<br>2026年11月17日 · 彩色、可检索、离线阅读</p><div class="bottom">'+p('直接读取已校验的 P3 S-Core 完整包，与 P2-Acore 对照；不改原源码，不将框架占位接口写成已实现能力。')+'<p class="small">exec / waitpid / exit / kill / ps · ecall · 栈与槽复用 · 锁清理 · barrier</p></div></section>'
    toc='<nav class="chapter toc" id="toc"><h1>阅读路线与目录</h1><p><a href="#intro">先建立全景图：对象、状态、寄存器与执行链</a></p><ol>'
    for step in STEPS: toc+=f'<li><a href="#step-{step["number"]}">{esc(step["title"])}<br><span class="small">{esc(step["task"])}</span></a></li>'
    toc+='</ol><p><a href="#validation">最后：本次验证、课程机命令与自查</a></p><p><a href="#sources">来源、覆盖与许可</a></p></nav>'
    body=[cover,toc,intro(stats)]; markdown=['# '+TITLE,'','16 个关键步骤；源码行号均指向校验后的归档原文件。','']
    for step in STEPS:
        chunk=f'<section class="chapter" id="step-{step["number"]}"><div class="eyebrow">{esc(step["task"])}</div><h1>{step["number"]}　{esc(step["title"])}</h1>'
        chunk+=box('这一步要完成什么',step['goal'])+p('与 P2／前一步的关系：'+step['before'])+p('输入、输出与运行条件：'+step['contract'])
        markdown+=['## '+step['number']+' '+step['title'],'',step['goal'],'',step['before'],'',step['contract'],'']
        for j,block in enumerate(step['blocks'],1):
            key=block['version']+':'+block['path']; lines=source[key].splitlines()
            chosen='\n'.join(lines[block['start']-1:block['end']])
            if block['version']=='P2': origin='P2 原码：固定任务启动的对照起点'
            elif block['path'] not in framework: origin='该路径未见于 P3 原始框架；正文取自完成包'
            elif raw['P3'][block['path']]==framework[block['path']]: origin='与 P3 原始框架同名文件字节一致'
            else: origin='P3 原始框架中已有同名文件；完成包内容有改动（不据此推断作者）'
            chunk+=f'<h2>{j}. {esc(block["title"])}</h2><p class="source-meta">{esc(key)} · L{block["start"]}–L{block["end"]} · {esc(block["kind"])}<br>{esc(origin)}</p>'
            chunk+=source_code(chosen,block['path'],block['start'],changed.get(block['path'],set()) if block['version']=='P3' else set())
            chunk+='<h3>按原始行号逐句理解</h3>'
            markdown += ['### '+block['title'],'',f'{key} L{block["start"]}—L{block["end"]}；{origin}','', '```'+('asm' if block['path'].endswith('.S') else 'makefile' if block['path']=='Makefile' else 'c'),chosen,'```','']
            for note in block['notes']:
                label='L'+str(note['start'])+(('–'+str(note['end'])) if note['end']!=note['start'] else '')
                excerpt='\n'.join(lines[note['start']-1:note['end']]).expandtabs(4)
                code='<pre>'+esc(excerpt)+'</pre>' if note['end']-note['start']<=3 and len(excerpt)<430 else ''
                chunk+=f'<div class="explain"><div class="range">{label}</div><div class="explain-body">{code}{p(note["text"])}</div></div>'
                markdown += ['- **'+label+'**：'+note['text']]
            markdown += ['']
        chunk+='<h2>把执行过程手算一遍</h2>'+ul(step['trace'],True)
        chunk+='<h2>应该看到什么，由哪里保证</h2>'+ul(step['phenomena'])+p('验证对应：'+step['verify'])
        chunk+=box('理解边界',' '.join(step['pitfalls']),'warn')+'<p class="navback"><a href="#toc">返回目录</a></p></section>'
        body.append(chunk)
        markdown += ['### 执行推演','']+[str(i)+'. '+v for i,v in enumerate(step['trace'],1)]+['','### 现象与边界','']+['- '+v for v in step['phenomena']+step['pitfalls']]+['']
    body.append(conclusion(results))
    attribution='<section class="chapter" id="sources"><h1>来源、覆盖与原始许可</h1>'
    attribution+=p('主要讲解 P3 的动态生命周期、shell、锁退出清理和 barrier。P2 已详述的完整异常保存/恢复、switch_to 汇编、普通格式化库、P1 镜像格式不重复全篇解释；它们继续作为基础存在。所有代码块按原文件连续取出，不把删节伪代码冒充完整函数。')
    attribution+=table(['源材料','SHA-256'], [[name,sha] for name,sha in ARCHIVES.values()]+[['oslab/Project3-original.tar.gz',hashlib.sha256((REPO/'oslab/Project3-original.tar.gz').read_bytes()).hexdigest()]])
    attribution+=p('coverage.json 记录所选块的解释覆盖与内容散列；source-manifest.json 记录来源；steps.json 保留教学数据；Project2-to-Project3-key-files.diff 仅对比本书选取的关键 P3 文件，不是整个工程差异。代码行次包含重复引用，去重行数另记。')
    attribution+=p('本文是对仓库已有教学代码的解释，不是新的实现。代码版权、许可和作者归属以各归档原文件为准；P3 原始框架与完成包的文件对比不能单独证明每行作者。以下保留所引课程头文件中的许可文字。')
    license_text='\n'.join(raw['P3']['include/os/sched.h'].decode().splitlines()[:24])
    attribution+='<pre class="license">'+esc(license_text)+'</pre></section>'
    body.append(attribution)
    document='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+TITLE+'</title><style>'+CSS+HtmlFormatter(style='friendly').get_style_defs('.source')+'</style></head><body>'+''.join(body)+'</body></html>'
    assert '\x00' not in document and '\ufffd' not in document
    (ROOT/(STEM+'.html')).write_text(document)
    markdown+=['## 本次验证','', '各命令退出 0：原布局构建、10 项镜像检查、完整 P3 串口场景、P2 stage4 回归。','', '通用 QEMU 使用临时地址重定位与测试 BIOS；未验证课程 QEMU/U-Boot、DASIC/loadbootd 或 Pynq。详细用例、命令、结果和原始日志见 validation/results.json 及同目录日志。','']
    (ROOT/(STEM+'.md')).write_text('\n'.join(markdown))
    def dump(name,value): (ROOT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    dump('steps.json',STEPS); dump('coverage.json',{'statistics':stats,'blocks':coverage})
    selected_keys={c['source'] for c in coverage}
    dump('source-manifest.json',{'archives':{v:{'path':n,'sha256':sha} for v,(n,sha) in ARCHIVES.items()},
        'selected_sources':{key:{'sha256':hashlib.sha256(source[key].encode()).hexdigest(),'lines':len(source[key].splitlines())} for key in sorted(selected_keys)}})
    diffs=[]
    for name in sorted({b['path'] for s in STEPS for b in s['blocks'] if b['version']=='P3'}):
        old=raw['P2'].get(name,b'').decode().splitlines(True); new=raw['P3'][name].decode().splitlines(True)
        diffs.extend(difflib.unified_diff(old,new,fromfile='Project2-Acore/'+name,tofile='Project3-SCore/'+name))
    (ROOT/'Project2-to-Project3-key-files.diff').write_text(''.join(diffs))
    print(json.dumps(stats,ensure_ascii=False))


if __name__=='__main__': build()
