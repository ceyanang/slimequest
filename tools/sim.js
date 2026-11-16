const fs=require("fs");
const D=require('path').join(__dirname,'..','src')+'/';
eval(fs.readFileSync(D+"data.js","utf8")+fs.readFileSync(D+"engine.js","utf8")+fs.readFileSync(D+"names.js","utf8")+`
FX=null; if(process.env.R) setRealm(+process.env.R); if(process.env.RD) Object.assign(REALM_DEF[REALM], JSON.parse(process.env.RD)); const DEATHS={}; const SB=+(process.env.SB||1), SBS=process.env.SBS?process.env.SBS.split(',').map(Number):null; if(process.env.AIW) Object.assign(AIW, JSON.parse(process.env.AIW));
function fight(team,foes){
  let r=0; team.forEach(p=>p._down=false); const mark=()=>team.forEach(p=>{if(p.hp<=0)p._down=true;});
  while(!battleOver(team,foes)&&r<60){r++;
    const order=roundOrder([...alive(team),...alive(foes)]);
    for(let oi=0;oi<order.length;oi++){ const u=order[oi]; reorderRest(order,oi); if(order[oi]!==u){ oi--; continue; } if(u.hp<=0)continue; const mine=u.side==='P', al=mine?team:foes, fo=mine?foes:team;
      const pl=planFor(u,al,fo,r); act(u,pl.m,pl.target,al,fo,[]); mark(); if(battleOver(team,foes))break; }
    if(!battleOver(team,foes))[...team,...foes].forEach(u=>endRound(u,[])); mark();
  }
  return battleOver(team,foes)==='win';
}
function runOnce(starter, fixed, stats){
  let party=fixed?fixed.map(([e,c],i)=>{const p=newSlime(e,c); ['hp','off','pdef','sdef','spd'].forEach(k=>p.base[k]*=SBS?SBS[i]:SB); derive(p); p.hp=p.max; return p;}):[(()=>{const p=newSlime(starter[0],starter[1]); ['hp','off','pdef','sdef','spd'].forEach(k=>p.base[k]*=SBS?SBS[0]:SB); derive(p); p.hp=p.max; return p;})()];
  for(let w=0;w<WORLDS.length;w++){ LV_WORLD=w;
    const map=genMap(fixed&&!isMoon(w)?1:w); let pos=null;
    for(let f=0;f<map.length;f++){
      const opts=pos?pos.next:map[0]; let n=pick(opts);
      if(!fixed&&party.length<PARTY_MAX){const rc=opts.find(o=>o.type==='recruit'); if(rc) n=rc;}
      pos=n;
      if(n.type==='start') continue;
      if(n.type==='choice'){ n={...n,type:Math.random()<0.5?'fight':'recruit',foe:rollFoe(w)}; }
      if(n.type==='mystery'){ const r=rollMystery(); if(r==='ambush'){ n={...n,type:'fight',foe:rollFoe(w)}; } else if(r==='trap'){ party.forEach(p=>{ if(p.hp>0) p.hp=Math.max(1,p.hp-Math.round(p.max*0.15)); }); continue; } else n={...n,type:r}; }
      if(n.type==='fuse') continue;
      if(n.type==='dojo'){ const pp=pick(party); boostMove(pick(pp.moves)); continue; }
      if(n.type==='item'){ const k=pick(itemOffers());
        if(k==='booster'){ const p=pick(party); boostMove(pick(p.moves)); }
        else if(k==='potion'||k==='revive'){ const lo=party.reduce((x,y)=>x.lvl<=y.lvl?x:y); if(k==='revive') lo.hp=lo.max; gainLevels(lo,k==='potion'?2:1).forEach(m=>autoLearn(lo,m)); }
        else { const free=party.find(p=>!p.item); if(free) free.item=k; else if(Math.random()<0.5) pick(party).item=k; }
        continue; }
      if(n.type==='camp'){campHeal(party);continue;}
      if(n.type==='treasure'){upgradePool(party)[0].f();continue;}
      if(n.type==='train'){ const lo=party.reduce((x,y)=>x.lvl<=y.lvl?x:y); gainLevels(lo,TRAIN_LEVELS).forEach(m=>autoLearn(lo,m)); continue;}
      if(n.type==='recruit'){ if(!fixed&&party.length<PARTY_MAX) party.push(recruitOffers(party)[0]); continue;}
      party.forEach(p=>{const hp=p.hp;resetStatus(p);p.hp=hp;});
      const foes=makeFoes(w,n,party.length); battleStart(party,foes,n); const fl=Math.max(...foes.map(e=>e.lvl));
      if(stats){stats.gap.push(avgLvl(party)-lvlOf(w,f)); const k=w*FLOORS+f; (stats.at[k]=stats.at[k]||[]).push(avgLvl(party));}
      if(!fight(party,foes)){ const k='w'+(w+1)+(n.type==='boss'?(n.gi!=null?' boss'+n.gi:' boss'):' '+n.type); DEATHS[k]=(DEATHS[k]||0)+1; return w+f/FLOORS; }
      party.forEach(p=>{ fightRewards(p, fl, n.type, p._down).learns.forEach(m=>autoLearn(p,m)); });
      if(n.type!=='fight') upgradePool(party)[0].f();
    }
    if(isMoon(w+1)) campHeal(party); else campHeal(party,.5,.5);
  }
  return 8;
}
const N=+process.argv[2]||100, mode=process.argv[3]||'mixed';
const avg=a=>(a.reduce((s,x)=>s+x,0)/a.length);
if(mode==='mixed'){
  const rec=[], st={gap:[],at:{}};
  for(let t=0;t<N;t++){const comp=[0,1,2].map(()=>[pick(ALL_ELS),pick(Object.keys(CLASSES))]);rec.push([comp,runOnce(null,comp,st)]);}
  for(const k of [...ALL_ELS,...Object.keys(CLASSES)]){
    let sx=0,sy=0,sxx=0,sxy=0,n=rec.length;
    for(const [c,y] of rec){const x=c.filter(([e,cl])=>e===k||cl===k).length;sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;}
    console.log(k.padEnd(8),"effect/member",((n*sxy-sx*sy)/(n*sxx-sx*sx)).toFixed(2));
  }
  const ys=rec.map(r=>r[1]);
  for(const k of ['bulwark','fighter','cleric','bard']){ for(const c of [0,1,2]){ const g=rec.filter(([cm])=>cm.filter(x=>x[1]===k).length===c).map(r=>r[1]); if(g.length) console.log('#'+k,c,'n',g.length,'avg',avg(g).toFixed(2),'clear%',(100*g.filter(y=>y>=8).length/g.length).toFixed(0)); } }
  console.log("avg worlds",avg(ys).toFixed(2),"clear%",(100*ys.filter(y=>y>=8).length/N).toFixed(0),"avg lvl gap (party-enemy)",avg(st.gap).toFixed(1));
  for(const k in st.at){ if(k%FLOORS===0||k%FLOORS===FLOORS-1) console.log("w"+(Math.floor(k/FLOORS)+1)+" f"+(k%FLOORS+1), "party lvl", avg(st.at[k]).toFixed(1), "enemy", lvlOf(Math.floor(k/FLOORS),k%FLOORS), "n", st.at[k].length);}
console.log("deaths:",Object.entries(DEATHS).sort().map(([k,v])=>k+":"+v).join("  "));
const hist=Array(9).fill(0); ys.forEach(y=>hist[Math.floor(y)]++); console.log("died in world:",hist.join(" "));
} else {
  const ys=[];for(let t=0;t<N;t++)ys.push(runOnce([pick(ALL_ELS),pick(Object.keys(CLASSES))]));
  console.log("starter runs avg worlds",avg(ys).toFixed(2),"clear%",(100*ys.filter(y=>y>=8).length/N).toFixed(0));
  console.log("deaths:",Object.entries(DEATHS).sort().map(([k,v])=>k+":"+v).join("  "));
}
`);
