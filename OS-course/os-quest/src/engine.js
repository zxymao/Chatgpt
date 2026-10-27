(function (root) {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('./questions.js') : root.OSQuestData;
  const byId = new Map(data.questions.map(q => [q.id,q]));
  const LIMIT = 50;
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const need = level => 45 + level * 15;
  const stats = level => ({maxHp:100+(level-1)*12,attack:17+(level-1)*3,defense:3+(level-1),maxFocus:5});
  function monster(chapter,encounter) {
    const boss = encounter === 2;
    return {name:boss?data.chapters[chapter].boss:data.chapters[chapter].enemy,maxHp:46+chapter*13+(boss?40:encounter*10),attack:12+chapter*3+(boss?4:0),defense:2+chapter,boss};
  }
  function create() {
    return {version:1,contentRevision:2,name:'见习守护者',level:1,xp:0,hp:100,focus:3,chapter:0,encounter:0,unlocked:0,completed:[],monsterHp:46,phase:'question',questionId:null,action:'strike',mode:'battle',training:'mixed',flowDraft:null,history:[],records:{},correct:0,answered:0,combo:0,bestCombo:0,kills:0,log:[],last:null,sound:false};
  }
  function normalize(value) {return String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,'');}
  function validFlow(q,input){return Array.isArray(input)&&input.length===q.answer.length&&new Set(input).size===input.length&&input.every(id=>q.blocks.some(b=>b.id===id));}
  function isCorrect(q,input) {return q.type==='flow'?validFlow(q,input)&&q.answer.every((id,i)=>input[i]===id):q.type==='fill'?q.answers.some(a=>normalize(a)===normalize(input)):String(input)===q.answer;}
  function flowDraft(s,rng=Math.random){
    const q=byId.get(s.questionId);if(q?.type!=='flow')return null;
    if(s.flowDraft?.questionId===q.id)return s.flowDraft;
    const order=q.blocks.map(b=>b.id);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(clamp(rng(),0,.999999)*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    s.flowDraft={questionId:q.id,slots:Array(q.answer.length).fill(null),order,active:0};return s.flowDraft;
  }
  function placeBlock(s,id){
    if(s.phase!=='question')return false;const d=flowDraft(s),q=byId.get(s.questionId);
    if(!d||!q.blocks.some(b=>b.id===id)||d.slots.includes(id))return false;
    d.slots[d.active]=id;
    const next=d.slots.findIndex((v,i)=>i>d.active&&!v);const empty=d.slots.findIndex(v=>!v);
    d.active=next>=0?next:empty>=0?empty:d.active;return true;
  }
  function selectSlot(s,index,clear=false){
    if(s.phase!=='question')return false;const d=flowDraft(s);
    if(!d||!Number.isInteger(index)||index<0||index>=d.slots.length)return false;
    d.active=index;if(clear)d.slots[index]=null;return true;
  }
  function resetFlow(s){if(s.phase!=='question')return false;const d=flowDraft(s);if(!d)return false;d.slots.fill(null);d.active=0;return true;}
  function wrongIds(s) {return Object.keys(s.records).filter(id=>byId.has(id)&&s.records[id].wrong>0&&s.records[id].streak<2);}
  function pick(s,rng=Math.random) {
    let pool = s.mode==='review'?wrongIds(s).map(id=>byId.get(id)):data.questions.filter(q=>q.chapter===s.chapter&&(s.training!=='flow'||q.type==='flow'));
    if (!pool.length) return null;
    const fresh=pool.filter(q=>!s.history.slice(-6).includes(q.id));
    if(fresh.length) pool=fresh;
    const weights=pool.map(q=>1+Math.min(3,s.records[q.id]?.wrong||0));
    let ticket=clamp(rng(),0,0.999999)*weights.reduce((a,b)=>a+b,0), chosen=pool[0];
    for(let i=0;i<pool.length;i++){ticket-=weights[i];if(ticket<0){chosen=pool[i];break;}}
    return chosen;
  }
  function prepare(s,rng) {
    if(s.phase!=='question') return null;
    if(s.questionId&&byId.has(s.questionId)){flowDraft(s,rng);return byId.get(s.questionId);}
    const q=pick(s,rng);
    s.questionId=q?.id||null;s.flowDraft=null;flowDraft(s,rng);
    return q;
  }
  function addLog(s,text,tone='neutral') {s.log.unshift({text,tone});s.log=s.log.slice(0,12);}
  function gain(s,xp) {
    s.xp+=xp;let levels=0;
    while(s.level<LIMIT&&s.xp>=need(s.level)){s.xp-=need(s.level);s.level++;levels++;s.hp=Math.min(stats(s.level).maxHp,s.hp+28);}
    if(s.level===LIMIT)s.xp=Math.min(s.xp,need(LIMIT));
    return levels;
  }
  function setAction(s,action){if(s.phase!=='question'||!['strike','heavy','guard'].includes(action))return false;const cost=action==='heavy'?2:action==='guard'?1:0;if(s.focus<cost)return false;s.action=action;return true;}
  function answer(s,input) {
    if(s.phase!=='question'||!s.questionId||!byId.has(s.questionId))return null;
    const q=byId.get(s.questionId);
    if(q.type==='fill'&&!normalize(input))return null;
    if(q.type==='choice'&&!['0','1','2','3'].includes(String(input)))return null;
    if(q.type==='boolean'&&!['true','false'].includes(String(input)))return null;
    if(q.type==='flow'&&!validFlow(q,input))return null;
    const correct=isCorrect(q,input), st=stats(s.level), enemy=monster(s.chapter,s.encounter);
    const r=s.records[q.id]||{right:0,wrong:0,streak:0};
    if(correct){r.right++;r.streak++;}else{r.wrong++;r.streak=0;}
    s.records[q.id]=r;s.answered++;s.correct+=Number(correct);s.combo=correct?s.combo+1:0;s.bestCombo=Math.max(s.bestCombo,s.combo);
    s.history.push(q.id);s.history=s.history.slice(-24);
    let damage=0,incoming=0,xp=0,levels=0,cost=0;
    if(correct){
      xp=s.mode==='review'?10:({choice:18,boolean:16,fill:22,flow:28}[q.type]+Math.min(10,(s.combo-1)*2));
      if(s.mode==='battle'){
        cost=s.action==='heavy'?2:s.action==='guard'?1:0;
        // Recheck cost at the transaction boundary; UI cannot grant free skills.
        if(s.focus<cost){s.action='strike';cost=0;}
        damage=Math.max(1,Math.round(st.attack*(s.action==='heavy'?1.8:s.action==='guard'?0.8:1))-enemy.defense);
        s.monsterHp=Math.max(0,s.monsterHp-damage);
        s.focus=clamp(s.focus-cost+(s.action==='strike'?1:0),0,5);
        if(s.action==='guard')s.hp=Math.min(st.maxHp,s.hp+8+s.level*2);
      }
      levels=gain(s,xp);
    }
    const killed=s.mode==='battle'&&s.monsterHp===0;
    if(s.mode==='battle'&&!killed){
      incoming=Math.max(2,enemy.attack-stats(s.level).defense+(correct?0:4));
      if(correct&&s.action==='guard')incoming=Math.ceil(incoming*0.4);
      s.hp=Math.max(0,s.hp-incoming);
    }
    if(killed){s.kills++;s.focus=Math.min(5,s.focus+1);}
    s.last={questionId:q.id,input:q.type==='flow'?[...input]:String(input),correct,damage,incoming,xp,levels,killed,defeated:s.hp===0,mode:s.mode};
    s.phase='feedback';
    addLog(s,correct?`${s.mode==='review'?'复习正确':'命中'} · ${q.type==='flow'?'流程':q.type==='fill'?'填空':q.type==='boolean'?'判断':'选择'}题 +${xp} EXP${damage?`，造成 ${damage} 伤害`:''}`:`答错了，已记入错题本${incoming?`，受到 ${incoming} 伤害`:''}`,correct?'good':'bad');
    if(levels)addLog(s,`等级提升至 Lv.${s.level}！攻击、防御、生命上限提高。`,'gold');
    if(killed)addLog(s,`击败 ${enemy.name}！`,'gold');
    return s.last;
  }
  function advance(s,rng) {
    if(s.phase!=='feedback')return false;
    const last=s.last;
    if(last?.mode==='battle'){
      if(last.defeated){s.hp=stats(s.level).maxHp;s.focus=3;s.monsterHp=monster(s.chapter,s.encounter).maxHp;addLog(s,'在营地恢复体力。保留等级与学习记录，重新挑战当前敌人。');}
      else if(last.killed){
        s.encounter++;
        if(s.encounter===3){
          if(!s.completed.includes(s.chapter))s.completed.push(s.chapter);
          s.unlocked=Math.min(7,Math.max(s.unlocked,s.chapter+1));
          if(s.chapter===7){s.encounter=2;s.phase='victory';s.questionId=null;return true;}
          s.chapter++;s.encounter=0;s.hp=stats(s.level).maxHp;s.focus=3;
          addLog(s,`抵达${data.chapters[s.chapter].name}。`,'gold');
        }
        s.monsterHp=monster(s.chapter,s.encounter).maxHp;
      }
    }
    s.phase='question';s.last=null;s.questionId=null;s.action='strike';prepare(s,rng);return true;
  }
  function travel(s,chapter,rng){if(!Number.isInteger(chapter)||chapter<0||chapter>s.unlocked||s.phase==='feedback')return false;s.chapter=chapter;s.encounter=0;s.mode='battle';s.phase='question';s.questionId=null;s.last=null;s.action='strike';s.monsterHp=monster(chapter,0).maxHp;prepare(s,rng);return true;}
  function review(s,rng){if(s.phase==='feedback'||!wrongIds(s).length)return false;s.mode='review';s.phase='question';s.questionId=null;s.last=null;s.action='strike';prepare(s,rng);return true;}
  function rest(s,rng){if(s.phase==='feedback')return false;s.mode='battle';s.hp=stats(s.level).maxHp;s.focus=3;s.monsterHp=monster(s.chapter,s.encounter).maxHp;s.phase='question';s.questionId=null;s.last=null;s.action='strike';addLog(s,'营地休整完成，当前敌人也已恢复。');prepare(s,rng);return true;}
  function setTraining(s,training,rng){if(s.phase!=='question'||s.mode!=='battle'||!['mixed','flow'].includes(training))return false;if(s.training===training)return true;s.training=training;s.questionId=null;s.flowDraft=null;prepare(s,rng);return true;}
  function mastery(s,chapter){const pool=data.questions.filter(q=>q.chapter===chapter);return {seen:pool.filter(q=>s.records[q.id]).length,learned:pool.filter(q=>(s.records[q.id]?.streak||0)>=2).length,total:pool.length};}
  function restore(value){
    let x;try{x=typeof value==='string'?JSON.parse(value):value;}catch{return null;}
    if(!x||x.version!==1||!Number.isInteger(x.level)||x.level<1||x.level>LIMIT)return null;
    const s=create(), int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
    if(!int(x.unlocked,0,7)||!int(x.chapter,0,x.unlocked)||!int(x.encounter,0,2)||!int(x.xp,0,need(x.level)))return null;
    Object.assign(s,{level:x.level,xp:x.xp,chapter:x.chapter,unlocked:x.unlocked,encounter:x.encounter});
    const st=stats(s.level),mo=monster(s.chapter,s.encounter);
    if(!int(x.hp,0,st.maxHp)||!int(x.focus,0,5)||!int(x.monsterHp,0,mo.maxHp))return null;
    s.hp=x.hp;s.focus=x.focus;s.monsterHp=x.monsterHp;s.name=typeof x.name==='string'?x.name.slice(0,16):s.name;s.sound=x.sound===true;
    s.completed=Array.isArray(x.completed)?[...new Set(x.completed.filter(v=>int(v,0,7)&&v<=s.unlocked))]:[];
    for(const k of ['correct','answered','bestCombo','combo','kills'])s[k]=int(x[k],0,1000000)?x[k]:0;
    if(s.correct>s.answered)return null;
    if(x.records&&typeof x.records==='object')for(const [id,r] of Object.entries(x.records))if(byId.has(id)&&r&&['right','wrong','streak'].every(k=>int(r[k],0,1000000)))s.records[id]={right:r.right,wrong:r.wrong,streak:r.streak};
    s.history=Array.isArray(x.history)?x.history.filter(id=>byId.has(id)).slice(-24):[];
    s.log=Array.isArray(x.log)?x.log.slice(0,12).filter(v=>v&&typeof v.text==='string').map(v=>({text:v.text.slice(0,180),tone:['good','bad','gold'].includes(v.tone)?v.tone:'neutral'})):[];
    s.mode=x.mode==='review'?'review':'battle';s.training=x.training==='flow'?'flow':'mixed';
    // Persist the feedback phase so reloading cannot redeem a submitted answer twice.
    if(x.phase==='feedback'&&x.last&&byId.has(x.last.questionId)&&typeof x.last.correct==='boolean'){
      const l=x.last;
      if(!['damage','incoming','xp','levels'].every(k=>int(l[k],0,100000)))return null;
      const q=byId.get(l.questionId);
      if(q.type==='flow'&&!validFlow(q,l.input))return null;
      s.phase='feedback';s.questionId=l.questionId;s.last={questionId:l.questionId,input:q.type==='flow'?[...l.input]:String(l.input||'').slice(0,120),correct:l.correct,damage:l.damage,incoming:l.incoming,xp:l.xp,levels:l.levels,killed:l.killed===true,defeated:s.hp===0,mode:s.mode};
    }else if(x.phase==='victory'&&s.completed.includes(7)){s.phase='victory';}
    else{
      if(s.hp===0||s.monsterHp===0)return null;
      const q=byId.get(x.questionId);
      if(q&&(s.mode==='review'||q.chapter===s.chapter))s.questionId=q.id;
    }
    if(['strike','heavy','guard'].includes(x.action))s.action=x.action;
    const q=byId.get(s.questionId),d=x.flowDraft;
    if(q?.type==='flow'&&d&&d.questionId===q.id&&Array.isArray(d.slots)&&d.slots.length===q.answer.length){
      const valid=id=>q.blocks.some(b=>b.id===id),filled=d.slots.filter(id=>id!==null);
      if(filled.every(valid)&&new Set(filled).size===filled.length&&Array.isArray(d.order)&&d.order.length===q.blocks.length&&d.order.every(valid)&&new Set(d.order).size===d.order.length){
        s.flowDraft={questionId:q.id,slots:[...d.slots],order:[...d.order],active:int(d.active,0,q.answer.length-1)?d.active:0};
      }
    }
    return s;
  }
  const api={data,byId,create,stats,need,monster,normalize,isCorrect,validFlow,flowDraft,placeBlock,selectSlot,resetFlow,prepare,answer,advance,setAction,travel,rest,review,setTraining,wrongIds,mastery,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OSQuestEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
