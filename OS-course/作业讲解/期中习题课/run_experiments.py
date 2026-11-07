import os,subprocess,pathlib,json,array,platform,time,statistics,re
root=pathlib.Path(__file__).resolve().parent;code=root/'code';out=root/'results';out.mkdir(exist_ok=True)
subprocess.run(['make','-j2'],cwd=code,check=True)
metadata={'kernel':platform.release(),'machine':platform.machine(),'glibc':platform.libc_ver(),'allowed_cpus':sorted(os.sched_getaffinity(0)),'compiler':subprocess.check_output(['gcc','--version'],text=True).splitlines()[0],'cpu_max':pathlib.Path('/sys/fs/cgroup/cpu.max').read_text().strip(),'cgroup_writable':os.access('/sys/fs/cgroup',os.W_OK),'iostat_available':bool(__import__('shutil').which('iostat'))}
(out/'environment.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
def run(name,args,timeout=90,expected=0):
 r=subprocess.run(args,cwd=code,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=timeout)
 (out/name).write_text(r.stdout)
 assert r.returncode==expected,(args,r.returncode,r.stdout[-1000:])
 print('PASS',name,flush=True)
 return r.stdout
run('syscalls.csv',['./syscalls'])
run('threads.csv',['./threads'])
run('elf-layout.txt',['./elf_layout'])
run('readelf-sections.txt',['readelf','-SW','elf_layout'])
run('readelf-symbols.txt',['readelf','-sW','elf_layout'])
run('objdump-symbols.txt',['objdump','-t','elf_layout'])
run('objdump-data.txt',['objdump','-s','-j','.data','elf_layout'])
run('fork-sum.txt',['./fork_exec'])
text=run('fork-exec-ls.txt',['./fork_exec','--ls'])
assert text.splitlines()[0]=='child sum=903' and text.splitlines()[-1]=='parent process finishes'
for mode in ['peterson','mutex','atomic1','atomic200']:
 run('odd-even-'+mode+'.txt',['./odd_even',mode])
text=run('alternating.txt',['./alternating'])
writes={}
for line in text.splitlines():
 m=re.match(r'write round=(\d+) data=([\d,]+) expected=(\d+)',line)
 if m:
  values=list(map(int,m[2].split(',')));assert len(values)==5 and all(1<=x<=20 for x in values)
  assert sum(values)==int(m[3]);writes[int(m[1])]=sum(values)
 m=re.match(r'read  round=(\d+) sum=(\d+) PASS',line)
 if m:assert writes[int(m[1])]==int(m[2])
assert len(writes)==5
rows=[];checksum={}
for affinity in ['same','spread']:
 for work in [0,500]:
  for repeat in range(3):
   for lock in (['spin','mutex'] if repeat%2 else ['mutex','spin']):
    r=subprocess.run(['./locks',lock,'100000',str(work),affinity],cwd=code,capture_output=True,text=True,check=True,timeout=120)
    row=dict(x.split('=',1) for x in r.stdout.strip().split());row.update(repeat=repeat,affinity=affinity);rows.append(row)
    assert int(row['counter'])==200000
    value=int(row['checksum']);assert checksum.setdefault(work,value)==value
(out/'locks.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS locks: 24 runs, counter/checksum verified',flush=True)
import tempfile,shutil
datadir=pathlib.Path(tempfile.mkdtemp(prefix='os-midterm-map-'))
state=20261107;maxima=[]
for i in range(8):
 data=array.array('i')
 assert data.itemsize==4
 for k in range(262144):
  state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff
  data.append(state%1000000+1)
 maxima.append(max(data))
 with (datadir/f'map-{i}.bin').open('wb') as f:data.tofile(f)
(out/'map-input.json').write_text(json.dumps({'format':'native little-endian int32 on this x86_64 host','files':8,'bytes_per_file':1048576,'elements_per_file':262144,'local_max':maxima,'global_max':max(maxima)},indent=2)+'\n')
for mode in ['barrier','monitor']:
 text=run('mapreduce-'+mode+'.txt',['./mapreduce',mode,str(datadir)])
 assert f'global_max={max(maxima)} ' in text
 missing=datadir/'map-0.bin';backup=missing.with_suffix('.saved');missing.rename(backup)
 try:run('mapreduce-'+mode+'-missing.txt',['./mapreduce',mode,str(datadir)],timeout=10,expected=1)
 finally:backup.rename(missing)
for mode in ['original','expanded']:
 text=run('fork-tree-'+mode+'.txt',['./fork_tree']+(['--expand'] if mode=='expanded' else []),timeout=40)
 nodes=re.findall(r'CREATE pid=(\d+) parent=(\d+) iteration=(\d+)',text)
 assert len(nodes)==(7 if mode=='expanded' else 3)
 rootpid=re.search(r'ROOT pid=(\d+)',text)[1]
 assert sum(parent==rootpid for pid,parent,iteration in nodes)==3
 if mode=='original':assert all(parent==rootpid for pid,parent,iteration in nodes)
shutil.rmtree(datadir)
print('ALL PROGRAM CHECKS PASSED',flush=True)
