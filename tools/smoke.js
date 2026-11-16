const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{})});const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+require('path').resolve(__dirname,'..','index.html'));await p.waitForTimeout(800);
// stress: run many battles through the engine with combos in page context
const r=await p.evaluate(()=>{let n=0;for(let k=0;k<200;k++){const ks=Object.keys(COMBO_MOVES);const t=[0,1,2].map(()=>{const [e,c]=pick(ks).split('_');const s=newSlime(e,c,30);s.moves[0]=clone(pick(COMBO_MOVES[e+'_'+c]));return s;});
 const f=makeFoes(3,{type:'fight',f:4,foe:rollFoe(3)},3);let r=0;while(!battleOver(t,f)&&r<40){r++;for(const u of [...alive(t),...alive(f)]){if(u.hp<=0)continue;const mine=u.side==='P';const pl=planFor(u,mine?t:f,mine?f:t,r);act(u,pl.m,pl.target,mine?t:f,mine?f:t,[]);if(battleOver(t,f))break;}[...t,...f].forEach(u=>endRound(u,[]));} n++; t.forEach(u=>statusTags(u)); }return n;});
console.log('battles',r);await p.screenshot({path:'/tmp/smoke.png'});console.log('errors',errs.slice(0,5));await b.close();})();
