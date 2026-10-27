const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js');
const q=E.data.questions[0];
function ready(id=q.id){const s=E.create();s.questionId=id;return s;}
test('128 unique questions: each chapter has 4 choice / boolean / fill / flow',()=>{
  assert.equal(E.byId.size,128);
  for(let c=0;c<8;c++)for(const type of ['choice','boolean','fill','flow'])assert.equal(E.data.questions.filter(q=>q.chapter===c&&q.type===type).length,4);
  for(const x of E.data.questions){assert.ok(x.prompt&&x.explanation&&x.file.endsWith('.pdf')&&x.page>0);assert.equal(E.isCorrect(x,x.answer),true);assert.equal(E.isCorrect(x,'not-an-answer'),false);if(x.type==='choice')assert.equal(x.options.length,4);if(x.type==='flow'){assert.equal(x.layout.filter(r=>typeof r==='object').length,x.answer.length);assert.equal(new Set(x.blocks.map(b=>b.id)).size,x.blocks.length);assert.ok(x.blocks.every(b=>b.text));assert.ok(['sequence','code'].includes(x.variant));}}
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
test('original 96 questions keep every ID and content field for existing study records',()=>{
  const crypto=require('node:crypto'),fixture=require('./fixtures/v1-saves.json');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(E.data.questions.filter(q=>q.type!=='flow'))).digest('hex'),fixture.originalQuestionsSha256);
});
test('unmodified original v1 saves preserve all progression, feedback, review and victory fields',()=>{
  for(const [name,legacy] of Object.entries(require('./fixtures/v1-saves.json').saves)){
    const loaded=E.restore(JSON.stringify(legacy));assert.ok(loaded,name);
    for(const key of Object.keys(legacy))assert.deepEqual(loaded[key],legacy[key],`${name}: ${key}`);
    assert.equal(loaded.version,1);assert.equal(loaded.contentRevision,2);assert.equal(loaded.training,'mixed');
    assert.deepEqual(E.wrongIds(loaded),E.wrongIds(legacy));
    if(loaded.phase==='feedback'){const before=JSON.stringify(loaded);assert.equal(E.answer(loaded,E.byId.get(loaded.questionId).answer),null);assert.equal(JSON.stringify(loaded),before);}
  }
});
test('all 32 flow questions support atomic full-answer rewards and exact positional validation',()=>{
  for(const q of E.data.questions.filter(q=>q.type==='flow')){
    const s=ready(q.id);s.chapter=s.unlocked=q.chapter;s.monsterHp=E.monster(q.chapter,0).maxHp;
    const invalids=[null,'b0',[],q.answer.slice(1),Array(q.answer.length).fill('b0'),[...q.answer.slice(0,-1),'unknown']];
    for(const invalid of invalids){assert.equal(E.answer(s,invalid),null,q.id);assert.equal(s.answered,0);}
    const r=E.answer(s,q.answer);assert.equal(r.correct,true,q.id);assert.equal(r.xp,28);assert.ok(r.damage>0);assert.deepEqual(s.last.input,q.answer);
    const loaded=E.restore(JSON.stringify(s));assert.deepEqual(loaded.last,s.last);assert.equal(E.answer(loaded,q.answer),null);
    const wrong=ready(q.id);wrong.chapter=wrong.unlocked=q.chapter;wrong.monsterHp=E.monster(q.chapter,0).maxHp;
    const swapped=[...q.answer];[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
    const fail=E.answer(wrong,swapped);assert.equal(fail.correct,false,q.id);assert.equal(wrong.xp,0);assert.equal(fail.damage,0);assert.ok(E.wrongIds(wrong).includes(q.id));
    if(q.blocks.length>q.answer.length){const distract=[...q.answer];distract[0]=q.blocks.at(-1).id;assert.equal(E.isCorrect(q,distract),false);}
  }
});
test('flow placement supports shuffled blocks, replacement, clearing, reset and reload',()=>{
  const q=E.byId.get('c1-15'),s=ready(q.id);const d=E.flowDraft(s,()=>0);assert.notDeepEqual(d.order,q.blocks.map(b=>b.id));
  E.placeBlock(s,'b0');assert.equal(d.active,1);assert.equal(d.slots[0],'b0');assert.equal(E.placeBlock(s,'b0'),false);
  E.placeBlock(s,'b1');E.selectSlot(s,0);E.placeBlock(s,'b2');assert.equal(d.slots[0],'b2');assert.ok(!d.slots.includes('b0'));
  E.selectSlot(s,0,true);assert.equal(d.slots[0],null);E.placeBlock(s,'b0');
  const loaded=E.restore(JSON.stringify(s));assert.deepEqual(loaded.flowDraft,d);assert.deepEqual(E.flowDraft(loaded).order,d.order);
  E.setAction(loaded,'guard');assert.deepEqual(loaded.flowDraft,d);assert.equal(E.selectSlot(loaded,-1),false);assert.equal(E.selectSlot(loaded,999),false);
  E.resetFlow(loaded);assert.deepEqual(loaded.flowDraft.slots,Array(q.answer.length).fill(null));assert.deepEqual(loaded.flowDraft.order,d.order);
});
test('invalid optional flow drafts cannot erase existing character progression',()=>{
  const s=ready('c1-15');E.flowDraft(s);s.flowDraft.slots[0]='unknown';const loaded=E.restore(s);assert.ok(loaded);assert.equal(loaded.xp,s.xp);assert.equal(loaded.flowDraft,null);assert.ok(E.flowDraft(loaded));
  const wrongFeedback=ready('c1-15');E.answer(wrongFeedback,E.byId.get('c1-15').answer);wrongFeedback.last.input=['b0'];assert.equal(E.restore(wrongFeedback),null);
});
test('flow-only training filters questions while keeping HP, enemy, XP and records',()=>{
  const s=E.restore(require('./fixtures/v1-saves.json').saves.active);const prior={hp:s.hp,xp:s.xp,level:s.level,monsterHp:s.monsterHp,records:structuredClone(s.records),completed:[...s.completed]};
  assert.ok(E.setTraining(s,'flow',()=>0));assert.equal(E.byId.get(s.questionId).type,'flow');assert.equal(E.byId.get(s.questionId).chapter,s.chapter);
  for(const [k,v]of Object.entries(prior))assert.deepEqual(s[k],v);
  assert.equal(E.restore(s).training,'flow');E.answer(s,E.byId.get(s.questionId).answer);assert.equal(E.setTraining(s,'mixed'),false);
  E.advance(s,()=>0);assert.equal(E.byId.get(s.questionId).type,'flow');assert.ok(E.setTraining(s,'mixed',()=>0));assert.equal(E.byId.get(s.questionId).type,'choice');
});
test('wrong flow questions support two-step review with saved feedback and no damage',()=>{
  const q=E.byId.get('c1-13'),s=ready(q.id),wrong=[...q.answer].reverse();E.answer(s,wrong);E.advance(s);E.review(s,()=>0);
  const hp=s.hp;for(let i=0;i<2;i++){assert.equal(s.questionId,q.id);const r=E.answer(s,q.answer);assert.ok(r.correct);assert.equal(r.xp,10);assert.equal(s.hp,hp);const loaded=E.restore(JSON.stringify(s));assert.deepEqual(loaded.last.input,q.answer);E.advance(s,()=>0);}
  assert.deepEqual(E.wrongIds(s),[]);
});
