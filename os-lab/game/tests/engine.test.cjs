const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),{solutions}=require('./solutions.cjs');
test('24 unfinished starters fail and 24 independent implementations pass',()=>{
 assert.equal(E.lessons.length,24);
 for(const l of E.lessons){assert.equal(E.grade(l.starter,l).passed,false,l.title);const r=E.grade(solutions[l.id-1],l);assert.equal(r.passed,true,JSON.stringify(r));assert.equal(r.rows.length,l.tests.length);assert.equal(r.traces.length,l.tests.length);}
});
test('syntax errors and wrong function names are reported',()=>{
 assert.equal(E.grade('function {',E.lessons[0]).passed,false);assert.equal(E.grade('function wrong(){return 0}',E.lessons[0]).passed,false);
});
test('missing mutation, aliases, blocked requeue, broken handoff and bad sepc fail',()=>{
 const faults=[
 [2,'function takePage(a){return a.indexOf(0)}'],
 [8,'function saveContext(cpu){return {ra:cpu.ra,sp:cpu.sp,s:cpu.s}}'],
 [9,solutions[8].replace('nextPCB.context.s.slice()','nextPCB.context.s')],
 [11,solutions[10].replace("m.tasks[m.current].state==='RUNNING'",'true')],
 [15,solutions[14].replace('lock.owner=next===undefined?null:next','lock.owner=null')],
 [17,'function saveTrap(cpu){return cpu}'],
 [19,solutions[18].replace('frame.sepc+=4','frame.sepc+=8')],
 [22,solutions[21].replace('<=m.now','<m.now')],
 [23,solutions[22].replace('m.ticks++','m.sepc+=4;m.ticks++')],
 [24,solutions[23].replace('ready.push(pid)','ready.unshift(pid)')]];
 for(const [id,source] of faults)assert.equal(E.grade(source,E.lessons[id-1]).passed,false,'missed fault at '+id);
});
test('mainline starts at PCB; six warmups are independently optional',()=>{
 const s=E.create();assert.equal(s.lesson,7);assert.equal(E.unlocked(s,7),true);
 for(let n=1;n<=6;n++)assert.equal(E.unlocked(s,n),true);
 assert.equal(E.reward(s,8).ok,false);assert.equal(E.adopt(s,7).ok,false);
 for(let n=7;n<=11;n++)assert.equal(E.reward(s,n).ok,true);
 assert.equal(E.adopt(s,7).ok,true);assert.equal(s.selected,7);assert.equal(s.completed.some(n=>n<=6),false);
});
test('economy and milestone adoption retain real state and capped fullness',()=>{
 const s=E.create();assert.equal(E.adopt(s,1).ok,false);assert.equal(E.reward(s,1).first,true);assert.equal(s.food,16);
 assert.equal(E.adopt(s,1).ok,true);assert.equal(E.adopt(s,1).ok,false);assert.equal(E.feed(s,1).ok,true);assert.equal(s.food,15);assert.equal(s.stats[1].full,75);
 E.feed(s,1);E.feed(s,1);assert.equal(s.stats[1].full,100);const food=s.food;assert.equal(E.feed(s,1).ok,false);assert.equal(s.food,food);
 assert.equal(E.reward(s,1).first,false);assert.equal(s.food,food+2);
});
test('all 11 pets and 24 lessons survive save round trip',()=>{
 const s=E.create();for(let id=1;id<=24;id++)E.reward(s,id);for(const p of E.pets.slice(1))assert.equal(E.adopt(s,p.id).ok,true);
 s.lesson=24;s.drafts[24]='draft';assert.deepEqual(E.normalize(structuredClone(s)),s);assert.equal(s.adopted.length,11);
});
test('version1 migration preserves previous progress and drafts',()=>{
 const s=E.normalize({version:1,food:40,completed:[1,2,3,4,5,6],adopted:[0,6],selected:6,lesson:6,drafts:{3:'old draft'},stats:{}});
 assert.equal(s.version,2);assert.equal(s.food,40);assert.deepEqual(s.completed,[1,2,3,4,5,6]);assert.deepEqual(s.adopted,[0,6]);assert.equal(s.drafts[3],'old draft');assert.equal(E.unlocked(s,7),true);
});
test('malformed saves cannot skip mainline prerequisites or adopt locked pets',()=>{
 const s=E.normalize({version:2,food:-40,completed:[7,9,24,999],adopted:[0,7,10,999],selected:999,lesson:24,stats:{0:{full:999,bond:-1}}});
 assert.deepEqual(s.completed,[7]);assert.deepEqual(s.adopted,[0]);assert.equal(s.selected,0);assert.equal(s.food,0);assert.equal(s.stats[0].full,100);assert.equal(s.stats[0].bond,0);
 assert.equal(s.lesson,24);assert.equal(E.feed(s,0).ok,false);assert.equal(E.unlocked(s,9),false);
});
