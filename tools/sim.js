const fs=require("fs");
const D=require('path').join(__dirname,'..','src')+'/';
eval(fs.readFileSync(D+"data.js","utf8")+fs.readFileSync(D+"engine.js","utf8")+fs.readFileSync(D+"realm4.js","utf8")+fs.readFileSync(D+"names.js","utf8")+`
FX=null; if(process.env.R) setRealm(+process.env.R); if(process.env.RD) Object.assign(REALM_DEF[REALM], JSON.parse(process.env.RD)); const DEATHS={}; const SB=+(process.env.SB||1), SBS=process.env.SBS?process.env.SBS.split(',').map(Number):null; if(process.env.AIW) Object.assign(AIW, JSON.parse(process.env.AIW));
function fight(team,foes){
  let r=0; team.forEach(p=>p._down=false); const mark=()=>team.forEach(p=>{if(p.hp<=0)p._down=true;});
  while(!battleOver(team,foes)&&r<60){r++;
    const order=roundOrder([...alive(team),...alive(foes)]);
    for(let oi=0;oi<order.length;oi++){ const u=order[oi]; reorderRest(order,oi); if(order[oi]!==u){ oi--; continue; } if(u.hp<=0)continue; const mine=u.side==='P', al=mine?team:foes, fo=mine?foes:team;
      const pl=planFor(u,al,fo,r); act(u,pl.m,pl.target,al,fo,[]); queueExtraTurns(order); mark(); if(battleOver(team,foes))break; }
    if(!battleOver(team,foes))[...team,...foes].forEach(u=>endRound(u,[])); mark();
  }
  return battleOver(team,foes)==='win';
}
const NOULTRA=!!process.env.NOULTRA;
function runOnce(starter, fixed, stats){ let ultraSeen=false;
  let party=fixed?fixed.map(([e,c,e2,c2],i)=>{const p=e2?absorbPending(fuseSlimes(newSlime(e,c),newSlime(e2,c2)),4):newSlime(e,c); ['hp','off','pdef','sdef','spd'].forEach(k=>p.base[k]*=SBS?SBS[i]:SB); derive(p); p.hp=p.max; return p;}):[(()=>{const p=newSlime(starter[0],starter[1]); ['hp','off','pdef','sdef','spd'].forEach(k=>p.base[k]*=SBS?SBS[0]:SB); derive(p); p.hp=p.max; return p;})()];
  for(let w=0;w<WORLDS.length;w++){ LV_WORLD=w;
    const map=genMap(fixed&&!isMoon(w)?1:w); let pos=null;
    { const real=genMap(w); ultraSeen=ensureUltra(real,w,ultraSeen)||ultraSeen; const has=real.some(r=>r.some(x=>x.type==='ultra'));
      if(has&&!NOULTRA){ const c=party.filter(p=>!p.ultra&&p.hp>0); if(c.length){ const u=c.reduce((x,y)=>x.lvl>=y.lvl?x:y); makeUltra(u, ultraChoices(u)[0]); } } }
    for(let f=0;f<map.length;f++){
      const opts=pos?pos.next:map[0]; let n=pick(opts);
      if(!fixed&&party.length<PARTY_MAX){const rc=opts.find(o=>o.type==='recruit'); if(rc) n=rc;}
      pos=n;
      if(n.type==='start') continue;
      if(n.type==='fight'&&fixed&&!isMoon(w)) n={...n,foe:rollFoe(w)};
      if(n.type==='boss'&&REALM===3&&w===7&&n.gi==null) n={...n,gi:0};   // reused map shape: mark the Neptune finale   // the fixed-shape map was rolled for world 2: re-roll its enemy for this world
      if(n.type==='choice'){ n={...n,type:Math.random()<0.5?'fight':'recruit',foe:rollFoe(w)}; }
      if(n.type==='mystery'){ const r=rollMystery(); if(r==='ambush'){ n={...n,type:'fight',foe:rollFoe(w)}; } else if(r==='trap'){ party.forEach(p=>{ if(p.hp>0) p.hp=Math.max(1,p.hp-Math.round(p.max*0.15)); }); continue; } else n={...n,type:r}; }
      if(n.type==='fuse') continue;
      if(n.type==='ultra') continue;   // handled per world below (a player routes to a crystal they can see)
      if(n.type==='dojo'){ const pp=pick(party); { const bm=pp.moves.filter(canBoost); if(bm.length) boostMove(pick(bm)); }; continue; }
      if(n.type==='item'){ const k=pick(itemOffers());
        if(k==='booster'){ const p=pick(party); { const bm=p.moves.filter(canBoost); if(bm.length) boostMove(pick(bm)); }; }
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
      if(n.type==='boss'&&REALM===3&&w===7&&n.gi===0){   // Realm 4 Neptune: Mother Earth right after the Dwarf Planet
        const n2={...n,gi:1}; party.forEach(p=>{const hp=p.hp;resetStatus(p);p.hp=hp;});
        const foes2=makeFoes(w,n2,party.length); battleStart(party,foes2,n2); const fl2=Math.max(...foes2.map(e=>e.lvl));
        if(!fight(party,foes2)){ const k='w8 boss1'; DEATHS[k]=(DEATHS[k]||0)+1; return w+f/FLOORS; }
        party.forEach(p=>{ fightRewards(p, fl2, 'boss', p._down).learns.forEach(m=>autoLearn(p,m)); });
      }
    }
    if(isMoon(w+1)) campHeal(party); else campHeal(party,.5,.5);
  }
  return 8;
}
const N=+process.argv[2]||100, mode=process.argv[3]||'mixed';
const avg=a=>(a.reduce((s,x)=>s+x,0)/a.length);
if(mode==='list'){   // LIST=file.json of [el,cls] or [el,cls,el2,cls2] entries, each with two random teammates
  const [si,sn]=(process.env.SHARD||'0/1').split('/').map(Number), list=JSON.parse(require('fs').readFileSync(process.env.LIST,'utf8')), cls=Object.keys(CLASSES);
  list.forEach((ent,i)=>{ if(i%sn!==si) return; const ys=[]; for(let t=0;t<N;t++) ys.push(runOnce(null,[ent,[pick(ALL_ELS),pick(cls)],[pick(ALL_ELS),pick(cls)]]));
    console.log('slime',ent.join('_'),avg(ys).toFixed(3),(100*ys.filter(y=>y>=8).length/N).toFixed(0)); });
} else if(mode==='multi'){   // every two-class fusion (random elements) with two random teammates
  const [si,sn]=(process.env.SHARD||'0/1').split('/').map(Number), cls=Object.keys(CLASSES), pairs=[];
  cls.forEach((a,i)=>cls.forEach((b,j)=>{ if(j>i) pairs.push([a,b]); }));
  pairs.forEach(([c1,c2],i)=>{ if(i%sn!==si) return; const ys=[]; for(let t=0;t<N;t++){ const e1=pick(ALL_ELS); let e2=pick(ALL_ELS); while(e2===e1) e2=pick(ALL_ELS);
      const team=[[e1,c1,e2,c2],[pick(ALL_ELS),pick(cls)],[pick(ALL_ELS),pick(cls)]]; ys.push(runOnce(null,team)); }
    console.log('multi',c1+'+'+c2,avg(ys).toFixed(3),(100*ys.filter(y=>y>=8).length/N).toFixed(0)); });
} else if(mode==='combo'){   // each element+class combo with two random teammates; SHARD=i/n splits the list across processes
  const [si,sn]=(process.env.SHARD||'0/1').split('/').map(Number), combos=[];
  ALL_ELS.forEach(e=>Object.keys(CLASSES).forEach(c=>combos.push([e,c])));
  combos.forEach(([e,c],i)=>{ if(i%sn!==si) return; if(process.env.ONLY && !(e+'_'+c).includes(process.env.ONLY)) return; const ys=[]; for(let t=0;t<N;t++){ const team=[[e,c],[pick(ALL_ELS),pick(Object.keys(CLASSES))],[pick(ALL_ELS),pick(Object.keys(CLASSES))]]; ys.push(runOnce(null,team)); }
    console.log('combo',e+'_'+c,avg(ys).toFixed(3),(100*ys.filter(y=>y>=8).length/N).toFixed(0)); });
} else if(mode==='mixed'){
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
