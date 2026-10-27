const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js');
const q=E.data.questions[0];
function ready(id=q.id){const s=E.create();s.questionId=id;return s;}
test('96 unique questions: each of 8 chapters has 4 choice / boolean / fill',()=>{
  assert.equal(E.byId.size,96);
  for(let c=0;c<8;c++)for(const type of ['choice','boolean','fill'])assert.equal(E.data.questions.filter(q=>q.chapter===c&&q.type===type).length,4);
  for(const x of E.data.questions){assert.ok(x.prompt&&x.explanation&&x.file.endsWith('.pdf')&&x.page>0);assert.equal(E.isCorrect(x,x.answer),true);assert.equal(E.isCorrect(x,'not-an-answer'),false);if(x.type==='choice')assert.equal(x.options.length,4);}
});
test('fill accepts declared aliases, case / whitespace / full-width normalization',()=>{
  const pcb=E.data.questions.find(q=>q.type==='fill'&&q.answer==='PCB');
  assert.ok(E.isCorrect(pcb,' Ｐ Ｃ Ｂ '));assert.equal(E.isCorrect(pcb,'PC'),false);
  for(const x of E.data.questions.filter(q=>q.type==='fill'))for(const a of x.answers)assert.ok(E.isCorrect(x,a));
});
test('all cited lecture PDFs exist and question page numbers stay within lecture bounds',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const pages={'Intro02 操作系统结构与组成.pdf':46,'Proc01 进程.pdf':36,'Proc02 线程 (1).pdf':35,'Proc03 CPU调度.pdf':34,'Sync01 临界区与锁.pdf':46,'Sync01 临界区与锁-扩展.pdf':9,'Sync02 死锁.pdf':37,'Sync03 信号量-条件变量-屏障.pdf':44,'Sync04 进程间通信.pdf':41};
  for(const q of E.data.questions){assert.ok(fs.existsSync(path.resolve(__dirname,'../..',q.file)));assert.ok(q.page<=pages[q.file],q.id);}
});
test('correct answer earns XP and attacks, duplicate submit cannot farm rewards',()=>{
  const s=ready(), before=s.monsterHp;const r=E.answer(s,q.answer);assert.ok(r.correct&&r.xp>0&&r.damage>0);assert.ok(s.monsterHp<before);const snapshot=JSON.stringify(s);assert.equal(E.answer(s,q.answer),null);assert.equal(JSON.stringify(s),snapshot);
});
test('wrong answer gives no XP, takes damage and enters wrong notebook',()=>{
  const s=ready();const r=E.answer(s,'0');assert.equal(r.correct,false);assert.equal(s.xp,0);assert.equal(s.monsterHp,46);assert.ok(s.hp<100);assert.deepEqual(E.wrongIds(s),[q.id]);
});
test('invalid answer is not a turn; empty fill input cannot be submitted',()=>{
  const s=ready();assert.equal(E.answer(s,'bogus'),null);assert.equal(s.answered,0);s.questionId='c1-09';assert.equal(E.answer(s,'  '),null);assert.equal(s.phase,'question');
});
test('level-up improves stats; only correct answers cause XP progression',()=>{
  const s=ready();s.xp=E.need(1)-1;const before=E.stats(1);E.answer(s,q.answer);assert.equal(s.level,2);assert.ok(E.stats(2).attack>before.attack);assert.ok(E.stats(2).maxHp>before.maxHp);assert.ok(E.stats(2).defense>before.defense);
});
test('skills require focus and guard heals/reduces retaliation',()=>{
  const s=ready();s.focus=0;assert.equal(E.setAction(s,'heavy'),false);assert.equal(s.action,'strike');s.focus=3;s.hp=50;assert.ok(E.setAction(s,'guard'));const r=E.answer(s,q.answer);assert.ok(s.hp>50);assert.ok(r.incoming<9);assert.equal(s.focus,2);
});
test('correct answer kills enemy without an enemy retaliation; advance selects next encounter',()=>{
  const s=ready();s.monsterHp=1;const hp=s.hp;const r=E.answer(s,q.answer);assert.ok(r.killed);assert.equal(r.incoming,0);assert.equal(s.hp,hp);E.advance(s,()=>0);assert.equal(s.encounter,1);assert.equal(s.monsterHp,E.monster(0,1).maxHp);
});
test('chapter boss unlocks next chapter; future chapters remain locked',()=>{
  const s=ready();assert.equal(E.travel(s,1),false);s.encounter=2;s.monsterHp=1;E.answer(s,q.answer);E.advance(s,()=>0);assert.equal(s.chapter,1);assert.equal(s.unlocked,1);assert.deepEqual(s.completed,[0]);
});
test('two consecutive correct review attempts clear wrong item without taking damage',()=>{
  const s=ready();E.answer(s,'0');E.advance(s,()=>0);const hp=s.hp;assert.ok(E.review(s,()=>0));for(let i=0;i<2;i++){assert.equal(s.questionId,q.id);E.answer(s,q.answer);assert.equal(s.hp,hp);E.advance(s,()=>0);}assert.deepEqual(E.wrongIds(s),[]);assert.equal(s.questionId,null);assert.equal(s.mode,'review');
});
test('defeat preserves level/study records and retry heals/reset current enemy',()=>{
  const s=ready();s.hp=1;E.answer(s,'0');assert.equal(s.hp,0);assert.ok(s.last.defeated);const saved=E.restore(JSON.stringify(s));assert.ok(saved);E.advance(saved);assert.equal(saved.hp,100);assert.equal(saved.monsterHp,46);assert.equal(saved.records[q.id].wrong,1);
});
test('reload preserves feedback lock, preventing duplicate XP / monster rewards',()=>{
  const s=ready();E.answer(s,q.answer);const reloaded=E.restore(JSON.stringify(s));assert.equal(reloaded.phase,'feedback');assert.equal(E.answer(reloaded,q.answer),null);assert.equal(reloaded.xp,s.xp);assert.equal(reloaded.monsterHp,s.monsterHp);
});
test('invalid/corrupt saves rejected; stats derived rather than accepted from imported fields',()=>{
  assert.equal(E.restore('{broken'),null);assert.equal(E.restore(null),null);const s=ready();s.hp=999999;assert.equal(E.restore(s),null);s.hp=100;s.attack=999999;const safe=E.restore(s);assert.equal(safe.attack,undefined);s.chapter=7;assert.equal(E.restore(s),null);
});
test('fresh question rotation avoids immediate repetition and preserves selected question on reload',()=>{
  const s=ready();E.answer(s,q.answer);E.advance(s,()=>0);assert.notEqual(s.questionId,q.id);assert.equal(E.restore(s).questionId,s.questionId);
});
test('a full all-correct campaign is playable and victory can be reloaded',()=>{
  const s=E.create();E.prepare(s,()=>0);let turns=0;
  while(s.phase!=='victory'&&turns++<1000){const x=E.byId.get(s.questionId);assert.ok(x);if(s.focus>=1)E.setAction(s,'guard');const r=E.answer(s,x.answer);assert.equal(r.defeated,false);E.advance(s,()=>0);}
  assert.equal(s.phase,'victory');assert.equal(s.completed.length,8);assert.equal(s.kills,24);assert.ok(s.level>1);assert.ok(E.restore(s));assert.equal(E.restore(s).phase,'victory');assert.ok(E.travel(s,0));assert.equal(s.phase,'question');
});
