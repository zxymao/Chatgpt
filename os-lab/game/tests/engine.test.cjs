const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js');
const solutions=[
  'function measure(s){let n=0;while(n<s.length&&s[n]!=="\\0")n++;return n;}',
  'function takePage(a){for(let i=0;i<a.length;i++)if(a[i]===0){a[i]=1;return i;}return -1;}',
  'function chooseNext(s,c){if(!s.length)return -1;for(let n=1;n<=s.length;n++){let i=(c+n)%s.length;if(s[i]==="READY")return i;}return -1;}',
  'function service(n,p){if(n!==1)return -38;if(!Number.isInteger(p)||p<0||p>2)return -14;return "feed:"+p;}',
  'function canWake(n,d){return n>=d;}',
  'function parseCommand(line){const s=line.trim(),i=s.indexOf(" "),c=i<0?s:s.slice(0,i),a=i<0?"":s.slice(i+1).trim();if((c==="feed"||c==="echo")&&a)return {command:c,argument:a};if(c==="help"&&!a)return {command:c,argument:""};return {command:"unknown",argument:""};}'
];
module.exports={solutions};
test('all six starter functions fail behavioral checks',()=>{
  for(const l of E.lessons){const r=E.grade(l.starter,l);assert.equal(r.passed,false,l.title);assert.ok(r.rows.some(row=>!row.ok));}
});
test('all six independent working solutions pass',()=>{
  for(const l of E.lessons){const r=E.grade(solutions[l.id-1],l);assert.equal(r.passed,true,JSON.stringify(r));assert.equal(r.rows.length,l.tests.length);}
});
test('syntax errors and wrong names are reported as failures',()=>{
  assert.equal(E.grade('function {',E.lessons[0]).passed,false);
  assert.equal(E.grade('function wrong(){return 0}',E.lessons[0]).passed,false);
});
test('the allocator must mutate state, not merely return a plausible number',()=>{
  assert.equal(E.grade('function takePage(a){return a.indexOf(0)}',E.lessons[1]).passed,false);
});
test('rewards, adoption, feeding and capped fullness use real state changes',()=>{
  const s=E.create();assert.equal(E.reward(s,2).ok,false);assert.equal(E.adopt(s,1).ok,false);
  const r=E.reward(s,1);assert.equal(r.first,true);assert.equal(s.food,16);assert.deepEqual(s.completed,[1]);
  assert.equal(E.adopt(s,1).ok,true);assert.equal(s.selected,1);assert.equal(E.adopt(s,1).ok,false);
  assert.equal(E.feed(s,1).ok,true);assert.equal(s.food,15);assert.equal(s.stats[1].full,75);
  E.feed(s,1);E.feed(s,1);assert.equal(s.stats[1].full,100);
  const food=s.food;assert.equal(E.feed(s,1).ok,false);assert.equal(s.food,food);
  assert.equal(E.reward(s,1).first,false);assert.equal(s.completed.length,1);assert.equal(s.food,food+2);
});
test('all pets unlock only after sequential lessons and valid save round-trip',()=>{
  const s=E.create();for(let id=1;id<=6;id++){assert.equal(E.unlocked(s,id),true);E.reward(s,id);E.adopt(s,id);}
  s.drafts[1]='my code';const restored=E.normalize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored,s);assert.equal(restored.adopted.length,7);
});
test('invalid and nonconsecutive saves cannot produce invalid pets or counters',()=>{
  const s=E.normalize({version:1,food:-40,completed:[1,3,4,999],adopted:[0,3,999],selected:999,lesson:6,stats:{0:{full:999,bond:-1}}});
  assert.deepEqual(s.completed,[1]);assert.deepEqual(s.adopted,[0]);assert.equal(s.selected,0);assert.equal(s.food,0);assert.equal(s.stats[0].full,100);assert.equal(s.stats[0].bond,0);
  assert.equal(E.feed(s,0).ok,false);assert.equal(E.unlocked(s,3),false);
});
