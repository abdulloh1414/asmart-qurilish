import { bar, btn, pill, rowActs, sel, stat, table, tr } from "./ui.js";
import { F, S } from "./store.js";
import { CATS_IN, CATS_OUT, MONTHS, ST, TODAY, byId, daysTo, esc, fd, money, monthLabel, pc, qn, short, sum } from "./util.js";
import { brName, brStat, breakdown, doneQty, isBrPay, objName, objProgress, planQty, rest, stockIn, stockOf, stockOut, supName, supStat, unitOf, workName } from "./calc.js";
export const VIEWS={};
export const noObjects=()=>`<div class="panel empty"><p>Аввал объект (дом) қўшинг.</p>${btn("+ Объект қўшиш","new",'data-t="objects"',"primary")}</div>`;
VIEWS.dashboard=()=>{
  const act=S.objects.filter(o=>o.status==="active");
  const cin=sum(S.cash.filter(c=>c.type==="in"),c=>c.amount),cout=sum(S.cash.filter(c=>c.type==="out"),c=>c.amount);
  const stats=S.brigades.map(b=>brStat(b));
  const earned=sum(stats,s=>s.earned),given=sum(stats,s=>s.adv+s.paid),owedBr=sum(stats,s=>Math.max(0,s.net));
  const low=S.materials.filter(m=>m.min>0&&stockOf(m.id)<=m.min).length;
  const supDebt=sum(S.suppliers,x=>Math.max(0,supStat(x).debt));
  const al=[];
  S.materials.forEach(m=>{const s=stockOf(m.id);if(m.min>0&&s<=m.min)al.push({k:s<=0?0:1,t:`Омборда тугаяпти: ${esc(m.name)}`,d:`қолдиқ ${qn(s)} ${esc(m.unit)}, минимум ${qn(m.min)}`,go:"stock"})});
  S.brigades.forEach((b,i)=>{if(stats[i].net<-1)al.push({k:1,t:`Аванс ҳисобланганидан ошган: ${esc(b.name)}`,d:`ортиқча берилган ${money(-stats[i].net)} сўм`,go:"payroll"})});
  S.debts.forEach(d=>{const r=rest(d);if(r<=0||!d.due)return;const dd=daysTo(d.due);
    if(d.kind==="owe"){if(dd<0)al.push({k:0,t:`Қарз муддати ўтган: ${esc(d.party)}`,d:`${money(r)} сўм, ${-dd} кун кечикди`,go:"debts"});else if(dd<=7)al.push({k:1,t:`Тўлов муддати яқин: ${esc(d.party)}`,d:`${money(r)} сўм, ${dd} кундан кейин`,go:"debts"})}
    else if(dd<0)al.push({k:1,t:`Мижоз тўлови кечикмоқда: ${esc(d.party)}`,d:`${money(r)} сўм, ${-dd} кун кечикди`,go:"debts"})});
  act.forEach(o=>{if(o.budget>0){const c=breakdown(o.id).cost;if(c>o.budget)al.push({k:0,t:`Шартнома суммасидан ошди: ${esc(o.name)}`,d:`сарф ${short(c)} / шартнома ${short(o.budget)} сўм`,go:"objects"})}});
  al.sort((a,b)=>a.k-b.k);
  const matrix=S.works.length&&act.length?`<section class="block"><h2>Иш турлари бўйича тайёрлик <small>бажарилган / режа</small></h2><div class="tw"><table><thead><tr><th>Объект</th>${S.works.map(w=>`<th class="c">${esc(w.name)}</th>`).join("")}<th class="n">Умумий</th></tr></thead><tbody>${act.map(o=>{const op=objProgress(o.id);
    return `<tr><td><b>${esc(o.name)}</b></td>${S.works.map(w=>{const p=planQty(o.id,w.id);if(!p)return `<td class="c"><span class="hint">—</span></td>`;const pr=doneQty(o.id,w.id)/p*100;return `<td class="c">${pill(pc(pr),pr>=100?"ok":pr>0?"info":"")}</td>`}).join("")}<td class="n"><b>${op==null?"—":pc(op)}</b></td></tr>`}).join("")}</tbody></table></div></section>`:"";
  const bars=act.map(o=>{const b=breakdown(o.id),pr=objProgress(o.id);
    return `<div><div class="bar-top"><b>${esc(o.name)}</b><span>${pr==null?"режа йўқ":"тайёрлик "+pc(pr)} · сарф ${short(b.cost)} сўм</span></div>${bar(pr||0,pr>=100?"ok":"")}</div>`}).join("");
  const recent=[...S.cash].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(c=>tr([fd(c.date),c.type==="in"?pill("Кирим","ok"):pill("Харажат","bad"),esc((c.type==="in"?CATS_IN:CATS_OUT)[c.cat]||c.cat),esc(c.brigadeId?brName(c.brigadeId):c.supplierId?supName(c.supplierId):c.objectId?objName(c.objectId):"—"),money(c.amount)],[4]));
  return {eyebrow:"Бугунги ҳолат",title:"Бошқарув панели",actions:btn("+ Иш ҳажми ёзиш","new",'data-t="logs"')+btn("Омборга кирим","move-in","","primary"),
  body:`<div class="stats s6">${stat("Бригадаларга ҳисобланган",short(earned),"бажарилган ҳажм бўйича")}${stat("Аванс ва тўловлар",short(given),"бригадирларга берилган")}${stat("Бригадирларга қолган ҳақ",short(owedBr),"аванс чегирилган",true)}${stat("Етказиб берувчиларга қарз",short(supDebt),"қарзга олинган материал")}${stat("Омборда кам қолган",low+" та","материал тури")}${stat("Касса қолдиғи",short(cin-cout),`кирим ${short(cin)}`)}</div>
  ${matrix}
  <div class="cols"><section class="block"><h2>Объектлар тайёрлиги</h2><div class="panel">${bars?`<div class="bars">${bars}</div>`:`<p class="hint">Фаол объект йўқ. «Объектлар» бўлимидан қўшинг.</p>`}</div></section>
  <section class="block"><h2>Диққат талаб қилади <small>${al.length} та</small></h2><div class="panel alerts">${al.length?al.map(a=>`<a class="alert" href="#${a.go}"><i class="dot ${a.k===0?"b":""}"></i><div><b>${a.t}</b><span>${a.d}</span></div></a>`).join(""):`<p class="hint">Ҳозирча огоҳлантиришлар йўқ.</p>`}</div></section></div>
  <section class="block"><h2>Сўнгги касса ҳаракатлари <small><a href="#cash">барчаси</a></small></h2>${table(["Сана","Тури","Тоифа","Объект / бригада","Сумма, сўм"],recent,[4])}</section>`};
};
VIEWS.objects=()=>{
  const rows=S.objects.map(o=>{const b=breakdown(o.id),pr=objProgress(o.id),st=ST[o.status]||ST.active;
    return tr([`<div class="nm"><b>${esc(o.name)}</b><span>${esc(o.client||"")}${o.client&&o.address?" · ":""}${esc(o.address||"")}</span><span>${fd(o.start)} — ${fd(o.end)}</span></div>`,pill(st[0],st[1]),`<div style="min-width:110px">${bar(pr||0,pr>=100?"ok":"")}<span class="hint">${pr==null?"режа йўқ":pc(pr)}</span></div>`,money(b.labour),money(b.mat),money(b.other),`<b>${money(b.cost)}</b>`+(o.budget>0?`<br><span class="hint">${pc(b.cost/o.budget*100)} шартномадан</span>`:""),money(b.income),rowActs("objects",o.id,`<button class="btn sm ghost" data-act="plan-of" data-id="${o.id}">Режа</button>`)],[3,4,5,6,7])});
  return {eyebrow:`${S.objects.length} та объект`,title:"Объектлар",actions:btn("+ Янги объект","new",'data-t="objects"',"primary"),
    body:table(["Объект","Ҳолати","Тайёрлик","Бригада ҳақи","Материал","Бошқа","Жами сарф","Мижоз тўловлари",""],rows,[3,4,5,6,7])+`<p class="hint" style="margin-top:10px">Бригада ҳақи бажарилган иш ҳажмидан, материал омбордан чиқимдан ҳисобланади. Суммалар сўмда.</p>`};
};
VIEWS.plan=()=>{
  if(!S.objects.length)return {eyebrow:"Ҳажм режаси ва бажарилиши",title:"Иш режаси",actions:"",body:noObjects()};
  if(!byId(S.objects,F.planObj))F.planObj=S.objects[0].id;
  const o=byId(S.objects,F.planObj),L=S.plan.filter(p=>p.objectId===o.id);
  const earnedOf=(oid,wid)=>sum(S.logs.filter(l=>l.objectId===oid&&l.workId===wid),l=>l.qty*l.rate);
  const paidOf=(oid,wid)=>sum(S.cash.filter(c=>isBrPay(c)&&c.objectId===oid&&c.workId===wid),c=>c.amount);
  const rows=L.map(p=>{const d=doneQty(o.id,p.workId),pr=p.qty?d/p.qty*100:0,e=earnedOf(o.id,p.workId),pd=paidOf(o.id,p.workId);
    return tr([`<b>${esc(workName(p.workId))}</b>`,esc(unitOf(p.workId)),qn(p.qty),qn(d),qn(Math.max(0,p.qty-d)),`<div style="min-width:100px">${bar(pr,pr>=100?"ok":"")}<span class="hint">${pc(pr)}</span></div>`,money(e),money(pd),`<b>${money(e-pd)}</b>`,rowActs("plan",p.id)],[2,3,4,6,7,8])});
  const e=sum(L,p=>earnedOf(o.id,p.workId)),pd=sum(L,p=>paidOf(o.id,p.workId));
  const eAll=sum(S.logs.filter(l=>l.objectId===o.id),l=>l.qty*l.rate);
  const pAll=sum(S.cash.filter(c=>isBrPay(c)&&c.objectId===o.id),c=>c.amount);
  const pv=sum(L,p=>p.qty*p.price),op=objProgress(o.id);
  const loose=pAll-pd;
  return {eyebrow:"Ҳажм режаси ва бажарилиши",title:"Иш режаси",actions:btn("Excel'дан режа юклаш","import-plan")+btn("+ Режа банди","new",`data-t="plan" data-obj="${o.id}"`,"primary"),
  body:`<div class="filters">${sel("po","planObj",S.objects.map(x=>[x.id,x.name]),o.id,"Объект")}</div>
  <div class="stats">${stat("Тайёрлик",op==null?"—":pc(op),"режа ҳажми бўйича")}${stat("Ҳисобланган иш ҳақи",short(eAll),"бажарилган ҳажм бўйича")}${stat("Бригадирларга тўланган",short(pAll),"аванс ва иш ҳақи")}${stat("Тўлашга қолган",short(eAll-pAll),"сўм",true)}${pv?stat("Режа қиймати",short(pv),"мижозга нарх бўйича"):""}</div>
  ${table(["Иш тури","Бирлик","Режа ҳажми","Бажарилган","Қолган","Тайёрлик","Ҳисобланган, сўм","Тўланган, сўм","Қолган, сўм",""],rows,[2,3,4,6,7,8],L.length?`<tfoot><tr><td colspan="6">Жами</td><td class="n">${money(e)}</td><td class="n">${money(pd)}</td><td class="n">${money(e-pd)}</td><td></td></tr></tfoot>`:"")}
  <p class="hint" style="margin-top:10px">Бажарилган ҳажм ва ҳисобланган ҳақ «Бажарилган ишлар» ёзувларидан олинади. «Тўланган» устуни аванс ва тўловда иш тури кўрсатилган бўлса тўлади.${loose>0?` Иш турига боғланмаган тўловлар: ${money(loose)} сўм.`:""}</p>`};
};
VIEWS.brigades=()=>{
  const wrows=S.works.map(w=>{const n=S.brigades.filter(b=>b.workId===w.id).length;
    return tr([`<b>${esc(w.name)}</b>`,esc(w.unit),money(w.rate),n+" та"+(n<2?` <span class="hint">(2–3 та тавсия)</span>`:""),rowActs("works",w.id)],[2])});
  const brows=S.brigades.map(b=>{const s=brStat(b);
    return tr([`<div class="nm"><b>${esc(b.name)}</b><span>${b.leader?"бригадир: "+esc(b.leader):""}${b.phone?" · "+esc(b.phone):""}</span></div>`,esc(workName(b.workId)),b.rate>0?money(b.rate):`<span class="hint">${money((byId(S.works,b.workId)||{}).rate)} (стандарт)</span>`,b.active==="no"?pill("Ишламайди"):pill("Ишлайди","ok"),money(s.earned),`<b>${money(s.net)}</b>`,rowActs("brigades",b.id,`<button class="btn sm ghost" data-act="statement" data-id="${b.id}">Варақ</button>`)],[2,4,5])});
  const emptyWorks=!S.works.length?`<div class="panel empty"><p>Иш турлари ҳали киритилмаган. Стандарт рўйхатни қўшиш мумкин: шпатлевка, ротбанд, гипсокартон, фасад, эмульсия, травертин, кафел.</p>${btn("Стандарт иш турларини қўшиш","seed-works","","primary")}</div>`:"";
  return {eyebrow:`${S.brigades.length} та бригада · ${S.works.length} та иш тури`,title:"Бригадалар",actions:btn("+ Иш тури","new",'data-t="works"')+btn("+ Бригада","new",'data-t="brigades"',"primary"),
  body:`<section class="block"><h2>Иш турлари ва стандарт ставкалар <small>ҳар бир иш тури учун 2–3 бригада</small></h2>${emptyWorks||table(["Иш тури","Бирлик","Ставка, сўм / бирлик","Бригадалар",""],wrows,[2])}</section>
  <section class="block"><h2>Бригадалар</h2>${table(["Бригада / бригадир","Иш тури","Ставка, сўм","Ҳолат","Ҳисобланган, сўм","Тўлашга қолган, сўм",""],brows,[2,4,5])}</section>`};
};
VIEWS.logs=()=>{
  const months=[...new Set(S.logs.map(l=>l.date.slice(0,7)))].sort().reverse();
  let L=S.logs;
  if(F.logObj)L=L.filter(l=>l.objectId===F.logObj);if(F.logWork)L=L.filter(l=>l.workId===F.logWork);
  if(F.logBrigade)L=L.filter(l=>l.brigadeId===F.logBrigade);if(F.logMonth)L=L.filter(l=>l.date.startsWith(F.logMonth));
  L=[...L].sort((a,b)=>b.date.localeCompare(a.date));
  const total=sum(L,l=>l.qty*l.rate);
  const rows=L.slice(0,200).map(l=>tr([fd(l.date),esc(brName(l.brigadeId)),esc(objName(l.objectId)+(l.zone?", "+l.zone:"")),esc(workName(l.workId)),qn(l.qty)+" "+esc(unitOf(l.workId)),money(l.rate),money(l.qty*l.rate),rowActs("logs",l.id)],[4,5,6]));
  return {eyebrow:"Ҳажм бўйича ҳисоб",title:"Бажарилган ишлар",actions:btn("+ Иш ҳажми ёзиш","new",'data-t="logs"',"primary"),
  body:`<div class="filters">${sel("fl1","logMonth",[["","Барчаси"],...months.map(m=>[m,monthLabel(m)])],F.logMonth,"Ой")}${sel("fl2","logObj",[["","Барчаси"],...S.objects.map(o=>[o.id,o.name])],F.logObj,"Объект")}${sel("fl3","logWork",[["","Барчаси"],...S.works.map(w=>[w.id,w.name])],F.logWork,"Иш тури")}${sel("fl4","logBrigade",[["","Барчаси"],...S.brigades.map(b=>[b.id,b.name])],F.logBrigade,"Бригада")}</div>
  ${table(["Сана","Бригада","Объект / жой","Иш тури","Ҳажм","Ставка, сўм","Сумма, сўм",""],rows,[4,5,6],L.length?`<tfoot><tr><td colspan="6">Жами (${L.length} та ёзув)</td><td class="n">${money(total)}</td><td></td></tr></tfoot>`:"")}${L.length>200?`<p class="hint">Охирги 200 та ёзув кўрсатилган. Фильтрдан фойдаланинг.</p>`:""}`};
};
export function payDoc(){
  const inP=d=>!F.payMonth||(d||"").startsWith(F.payMonth);
  const period=F.payMonth?monthLabel(F.payMonth):"барча давр";
  const L=(F.payBrigade?S.brigades.filter(b=>b.id===F.payBrigade):S.brigades).map(b=>({b,s:brStat(b,inP)})).filter(x=>x.s.earned||x.s.adv||x.s.paid);
  const rows=L.map((x,i)=>({c:[i+1,x.b.name,x.b.leader||"—",workName(x.b.workId),[x.s.qty,"q"],[x.s.earned,"m"],[x.s.adv,"m"],[x.s.paid,"m"],[x.s.net,"m"],""]}));
  const T=k=>sum(L,x=>x.s[k]);
  rows.push({b:1,c:["","Жами","","",[T("qty"),"q"],[T("earned"),"m"],[T("adv"),"m"],[T("paid"),"m"],[T("net"),"m"],""]});
  return {key:"pay",title:"Ведомость",lines:["ИШ ҲАҚИ ВЕДОМОСТИ","TRIUMF ENGINEERING · Давр: "+period,"Тўлов бригадирларга бажарилган ҳажм бўйича амалга оширилади"],
    cols:["№","Бригада","Бригадир","Иш тури","Ҳажм","Ҳисобланган, сўм","Аванс, сўм","Аввал тўланган, сўм","Тўлашга, сўм","Бригадир имзоси"],rows,
    sign:["Раҳбар  ______________________","Ҳисобчи  ______________________","Сана: "+fd(TODAY)]};
}
VIEWS.payroll=()=>{
  const months=[...new Set([...S.logs,...S.cash.filter(isBrPay)].map(x=>x.date.slice(0,7)).filter(Boolean))].sort().reverse();
  const inP=d=>!F.payMonth||(d||"").startsWith(F.payMonth);
  const period=F.payMonth?monthLabel(F.payMonth):"Барча давр";
  const filters=`<div class="filters">${sel("pm","payMonth",[["","Барча давр"],...months.map(m=>[m,monthLabel(m)])],F.payMonth,"Давр")}${sel("pb","payBrigade",[["","Барча бригадалар"],...S.brigades.map(b=>[b.id,b.name])],F.payBrigade,"Бригада")}</div>`;
  const b=byId(S.brigades,F.payBrigade);
  if(b){
    const s=brStat(b,inP);
    const wl=S.logs.filter(l=>l.brigadeId===b.id&&inP(l.date)).sort((x,y)=>x.date.localeCompare(y.date));
    const pl=S.cash.filter(c=>c.type==="out"&&c.brigadeId===b.id&&(c.cat==="advance"||c.cat==="wage")&&inP(c.date)).sort((x,y)=>x.date.localeCompare(y.date));
    const byWork={};wl.forEach(l=>{const g=byWork[l.workId]=byWork[l.workId]||{q:0,a:0};g.q+=l.qty;g.a+=l.qty*l.rate});
    const lrows=wl.map(l=>tr([fd(l.date),esc(objName(l.objectId)),esc(workName(l.workId)),qn(l.qty)+" "+esc(unitOf(l.workId)),money(l.rate),money(l.qty*l.rate)],[3,4,5]));
    const prows=pl.map(c=>tr([fd(c.date),c.cat==="advance"?pill("Аванс","warn"):pill("Иш ҳақи","info"),esc(c.note||""),"−"+money(c.amount),`<div class="rowacts"><button class="btn sm ghost danger" data-act="del" data-t="cash" data-id="${c.id}">Ўчириш</button></div>`],[3]));
    const netTxt=s.net<0?`−${money(-s.net)}`:money(s.net);
    return {eyebrow:"Ҳисоб-китоб варағи",title:"Иш ҳақи ҳисоби",actions:btn("Ведомость","act-print",'data-id="pay"')+btn("← Барча бригадалар","all-brigades")+btn("Бригадирга аванс","advance",`data-id="${b.id}"`)+btn("Бригадирга иш ҳақи","wage",`data-id="${b.id}"`,"primary"),
    body:filters+`<div class="statement-head"><h2>${esc(b.name)}</h2><span class="hint">${b.leader?"бригадир: "+esc(b.leader):"бригадир кўрсатилмаган"}${b.phone?" · "+esc(b.phone):""} · давр: ${esc(period)}</span></div>
    <div class="stats">${stat("Бажарилган иш ҳақи",money(s.earned),`${qn(s.qty)} ҳажм бўйича`)}${stat("Бригадир олган аванс","−"+money(s.adv),"")}${stat("Тўланган иш ҳақи","−"+money(s.paid),"")}${stat(s.net<0?"Ортиқча берилган":"Тўлашга қолди",netTxt,"сўм",true)}</div>
    <section class="block"><h2>Бажарилган ишлар <small>ҳажм × ставка</small></h2>${table(["Сана","Объект","Иш тури","Ҳажм","Ставка, сўм","Сумма, сўм"],lrows,[3,4,5],wl.length?`<tfoot><tr><td colspan="5">Жами ҳисобланган</td><td class="n">${money(s.earned)}</td></tr></tfoot>`:"")}</section>
    ${Object.keys(byWork).length>1?`<section class="block"><h2>Иш турлари бўйича</h2>${table(["Иш тури","Ҳажм","Сумма, сўм"],Object.keys(byWork).map(k=>tr([esc(workName(k)),qn(byWork[k].q)+" "+esc(unitOf(k)),money(byWork[k].a)],[1,2])),[1,2])}</section>`:""}
    <section class="block"><h2>Бригадирга берилган аванс ва тўловлар <small>ҳисобдан чегирилади</small></h2>${table(["Сана","Тури","Изоҳ","Сумма, сўм",""],prows,[3],pl.length?`<tfoot><tr><td colspan="3">Жами чегирма</td><td class="n">−${money(s.adv+s.paid)}</td><td></td></tr></tfoot>`:"")}</section>
    <section class="panel"><b>Тўлашга: ${netTxt} сўм</b><p class="hint">${money(s.earned)} (иш ҳақи) − ${money(s.adv)} (аванс) − ${money(s.paid)} (аввал тўланган).</p></section>`};
  }
  const rows=S.brigades.map(br=>{const s=brStat(br,inP);
    return tr([`<div class="nm"><b>${esc(br.name)}</b><span>${esc(workName(br.workId))}${br.leader?" · "+esc(br.leader):""}</span></div>`,qn(s.qty),money(s.earned),money(s.adv),money(s.paid),`<b style="color:var(--${s.net<0?"bad":"ink"})">${s.net<0?"−":""}${money(Math.abs(s.net))}</b>`,`<div class="rowacts"><button class="btn sm ghost" data-act="statement" data-id="${br.id}">Варақ</button><button class="btn sm ghost" data-act="advance" data-id="${br.id}">Аванс</button><button class="btn sm ghost" data-act="wage" data-id="${br.id}">Тўлаш</button></div>`],[1,2,3,4,5])});
  const T={e:sum(S.brigades,x=>brStat(x,inP).earned),a:sum(S.brigades,x=>brStat(x,inP).adv),p:sum(S.brigades,x=>brStat(x,inP).paid)};
  return {eyebrow:`Давр: ${esc(period)}`,title:"Иш ҳақи ҳисоби",actions:btn("Ведомость","act-print",'data-id="pay"')+btn("Бригадирга аванс","advance")+btn("Бригадирга иш ҳақи","wage","","primary"),
  body:filters+`<div class="stats">${stat("Ҳисобланган",short(T.e),"ҳажм бўйича")}${stat("Бригадирларга аванс","−"+short(T.a),"")}${stat("Тўланган","−"+short(T.p),"")}${stat("Тўлашга қолган",short(T.e-T.a-T.p),"сўм",true)}</div>
  ${table(["Бригада","Ҳажм","Ҳисобланган, сўм","Аванс, сўм","Тўланган, сўм","Тўлашга, сўм",""],rows,[1,2,3,4,5])}
  <p class="hint" style="margin-top:10px">Иш ҳақи = бажарилган ҳажм × ставка. Аванс ва иш ҳақи фақат бригадирга берилади, аванслар ва аввалги тўловлар ҳисобдан чегирилади. Тўлиқ ҳисоб учун «Варақ» тугмасини босинг.</p>`};
};
VIEWS.stock=()=>{
  const low=S.materials.filter(m=>m.min>0&&stockOf(m.id)<=m.min).length;
  const val=sum(S.materials,m=>Math.max(0,stockOf(m.id))*(m.price||0));
  const mq=F.matQ.toLowerCase();
  const ML=S.materials.filter(m=>!mq||m.name.toLowerCase().includes(mq));
  const mrows=ML.slice(0,200).map(m=>{const i=stockIn(m.id),o=stockOut(m.id),s=i-o;
    return tr([`<b>${esc(m.name)}</b>`,esc(m.unit),qn(i),qn(o),`<b>${qn(s)}</b>`,qn(m.min),m.price>0?money(m.price):"—",s<0?pill("Минус қолдиқ","bad"):s===0?pill("Тугаган","bad"):m.min>0&&s<=m.min?pill("Кам қолган","warn"):pill("Етарли","ok"),rowActs("materials",m.id)],[2,3,4,5,6])});
  let V=S.moves;
  if(F.mvType)V=V.filter(m=>m.type===F.mvType);if(F.mvObj)V=V.filter(m=>m.objectId===F.mvObj);
  if(F.mvQ){const q=F.mvQ.toLowerCase();V=V.filter(m=>((byId(S.materials,m.materialId)||{}).name||"").toLowerCase().includes(q)||(m.supplier||"").toLowerCase().includes(q)||(m.receiver||"").toLowerCase().includes(q))}
  V=[...V].sort((a,b)=>b.date.localeCompare(a.date));
  const vrows=V.slice(0,150).map(v=>{const m=byId(S.materials,v.materialId)||{name:"—",unit:""};
    return tr([fd(v.date),v.type==="in"?pill("Кирим","ok"):pill("Чиқим","info"),esc(m.name),qn(v.qty)+" "+esc(m.unit),esc(v.objectId?objName(v.objectId):"—"),v.type==="out"?`<div class="nm"><b>${esc(v.brigadeId?brName(v.brigadeId):"—")}</b>${v.receiver?`<span>олган: ${esc(v.receiver)}</span>`:""}</div>`:esc(v.supplierId?supName(v.supplierId):(v.supplier||"—")),v.price>0?money(v.qty*v.price):pill("нархсиз","warn"),rowActs("moves",v.id)],[3,6])});
  const empty=!S.materials.length?`<div class="panel empty"><p>Омбор бўш. Келган ва чиққан материаллар жадвалини Excel файлидан юклаш ёки қўлда ёзиш мумкин.</p>${btn("Excel'дан юклаш","import-xl","","primary")}</div>`:"";
  /* issued, by brigade */
  const outMonths=[...new Set(S.moves.filter(m=>m.type==="out"&&m.date).map(m=>m.date.slice(0,7)))].sort().reverse();
  let O=S.moves.filter(m=>m.type==="out"&&(!F.outMonth||m.date.startsWith(F.outMonth)));
  let outBody="";
  if(F.outBr){
    O=O.filter(m=>F.outBr==="none"?!m.brigadeId:m.brigadeId===F.outBr);
    const g={};O.forEach(m=>{const k=m.materialId;(g[k]=g[k]||{q:0,v:0,n:0});g[k].q+=m.qty;g[k].v+=m.qty*m.price;g[k].n++});
    const rows=Object.keys(g).sort((a,b)=>((byId(S.materials,a)||{}).name||"").localeCompare((byId(S.materials,b)||{}).name||"")).map(k=>{const m=byId(S.materials,k)||{name:"—",unit:""};return tr([`<b>${esc(m.name)}</b>`,esc(m.unit),qn(g[k].q),g[k].n,g[k].v>0?money(g[k].v):"—"],[2,3,4])});
    outBody=`<p class="hint" style="margin-bottom:8px">${F.outBr==="none"?"Бригадасиз чиқимлар":esc(brName(F.outBr))}: ${O.length} та ёзув. <button class="btn sm ghost" data-act="out-of" data-id="">Барча бригадалар</button></p>${table(["Материал","Бирлик","Чиқарилган","Ёзувлар","Сумма, сўм"],rows,[2,3,4])}`;
  }else{
    const g={};O.forEach(m=>{const k=m.brigadeId||"none";(g[k]=g[k]||{n:0,mats:new Set(),v:0});g[k].n++;g[k].mats.add(m.materialId);g[k].v+=m.qty*m.price});
    const rows=Object.keys(g).sort((a,b)=>g[b].n-g[a].n).map(k=>tr([`<b>${k==="none"?"Бригадасиз":esc(brName(k))}</b>`,g[k].n,g[k].mats.size,g[k].v>0?money(g[k].v):"—",`<div class="rowacts"><button class="btn sm ghost" data-act="out-of" data-id="${k}">Материаллар</button></div>`],[1,2,3]));
    outBody=table(["Бригада","Чиқим ёзувлари","Материал турлари","Сумма, сўм",""],rows,[1,2,3]);
  }
  return {eyebrow:`Омбор қиймати: ${short(val)} сўм${low?` · ${low} та материал кам`:""}`,title:"Омбор",actions:btn("Excel'дан юклаш","import-xl")+btn("+ Материал","new",'data-t="materials"')+btn("Кирим","move-in")+btn("Чиқим","move-out","","primary"),
  body:`<section class="block"><h2>Материаллар ҳисоби</h2>${empty?empty:`<div class="filters"><div><label for="mqq">Материал қидириш (Enter)</label><input id="mqq" type="search" data-filter="matQ" value="${esc(F.matQ)}" placeholder="масалан, цемент"></div></div>${table(["Материал","Бирлик","Қабул қилинган","Чиқарилган","Қолдиқ","Минимум","Нарх, сўм","Ҳолат",""],mrows,[2,3,4,5,6])}${ML.length>200?`<p class="hint">${ML.length} та материалдан 200 таси кўрсатилган. Қидирувдан фойдаланинг.</p>`:""}`}</section>
  <section class="block" id="outsec"><h2>Чиқим бригадалар кесимида</h2>
  <div class="filters">${sel("ob","outBr",[["","Барча бригадалар"],["none","Бригадасиз"],...S.brigades.map(b=>[b.id,b.name])],F.outBr,"Бригада")}${sel("om","outMonth",[["","Барча давр"],...outMonths.map(m=>[m,monthLabel(m)])],F.outMonth,"Давр")}</div>${outBody}</section>
  <section class="block"><h2>Кирим ва чиқим журнали <small>${V.length} та ёзув</small></h2>
  <div class="filters">${sel("mt","mvType",[["","Барчаси"],["in","Кирим"],["out","Чиқим"]],F.mvType,"Тури")}${sel("mo","mvObj",[["","Барчаси"],...S.objects.map(o=>[o.id,o.name])],F.mvObj,"Объект (дом)")}<div><label for="mq">Қидириш (Enter)</label><input id="mq" type="search" data-filter="mvQ" value="${esc(F.mvQ)}" placeholder="материал, етказувчи ёки ишчи"></div></div>
  ${table(["Сана","Тури","Материал","Миқдор","Объект (дом)","Бригада / етказувчи","Сумма, сўм",""],vrows,[3,6])}${V.length>150?`<p class="hint">Охирги 150 та ёзув кўрсатилган. Фильтрдан фойдаланинг.</p>`:""}</section>`};
};
VIEWS.cash=()=>{
  const months=[...new Set(S.cash.map(c=>c.date.slice(0,7)))].sort().reverse();
  let L=S.cash;if(F.cashMonth)L=L.filter(c=>c.date.startsWith(F.cashMonth));
  if(F.cashObj==="none")L=L.filter(c=>!c.objectId);else if(F.cashObj)L=L.filter(c=>c.objectId===F.cashObj);
  L=[...L].sort((a,b)=>b.date.localeCompare(a.date));
  const cin=sum(L.filter(c=>c.type==="in"),c=>c.amount),cout=sum(L.filter(c=>c.type==="out"),c=>c.amount);
  const rows=L.slice(0,150).map(c=>tr([fd(c.date),c.type==="in"?pill("Кирим","ok"):pill("Харажат","bad"),esc((c.type==="in"?CATS_IN:CATS_OUT)[c.cat]||c.cat),esc(c.brigadeId?brName(c.brigadeId):c.supplierId?supName(c.supplierId):c.objectId?objName(c.objectId):"—"),esc(c.note||""),(c.type==="in"?"+":"−")+money(c.amount),rowActs("cash",c.id)],[5]));
  return {eyebrow:"Кирим ва чиқим журнали",title:"Касса",actions:btn("+ Кирим","new",'data-t="cash" data-type="in"')+btn("+ Харажат","new",'data-t="cash" data-type="out"',"primary"),
  body:`<div class="filters">${sel("fm","cashMonth",[["","Барчаси"],...months.map(m=>[m,monthLabel(m)])],F.cashMonth,"Ой")}${sel("fo","cashObj",[["","Барчаси"],["none","Объектсиз"],...S.objects.map(o=>[o.id,o.name])],F.cashObj,"Объект")}</div>
  <div class="stats">${stat("Кирим",short(cin),"сўм")}${stat("Харажат",short(cout),"сўм")}${stat("Фарқ",(cin-cout<0?"−":"")+short(Math.abs(cin-cout)),"сўм")}</div>
  ${table(["Сана","Тури","Тоифа","Объект / бригада","Изоҳ","Сумма, сўм",""],rows,[5])}${L.length>150?`<p class="hint">Охирги 150 та ёзув кўрсатилган.</p>`:""}`};
};
VIEWS.debts=()=>{
  const sect=(kind,title)=>{const L=S.debts.filter(d=>d.kind===kind).sort((a,b)=>(a.due||"9").localeCompare(b.due||"9"));
    const rows=L.map(d=>{const r=rest(d),dd=d.due?daysTo(d.due):null;
      const st=r<=0?pill("Ёпилган","ok"):dd!=null&&dd<0?pill(`${-dd} кун кечикди`,"bad"):dd!=null&&dd<=7?pill(`${dd} кун қолди`,"warn"):"";
      return tr([`<div class="nm"><b>${esc(d.party)}</b><span>${esc(d.note||"")}${d.objectId?(d.note?" · ":"")+esc(objName(d.objectId)):""}</span></div>`,money(d.amount),money(d.paid),`<b>${money(r)}</b>`,fd(d.due)+" "+st,rowActs("debts",d.id,r>0?`<button class="btn sm ghost" data-act="debt-pay" data-id="${d.id}">${kind==="owe"?"Тўлаш":"Қайтарди"}</button>`:"")],[1,2,3])});
    return `<section class="block"><h2>${title} <small>қолган: ${money(sum(L,rest))} сўм</small></h2>${table(["Ким билан","Сумма, сўм","Тўланган, сўм","Қолган, сўм","Муддат",""],rows,[1,2,3])}</section>`};
  return {eyebrow:"Қарз дафтари",title:"Қарзлар",actions:btn("+ Қарз ёзиш","new",'data-t="debts"',"primary"),body:sect("owe","Биз қарздормиз")+sect("owed","Бизга қарздорлар")};
};
export function monthlyChart(){
  const dates=S.cash.map(c=>c.date).sort();const end=dates.length?dates[dates.length-1]:TODAY;
  const y0=+end.slice(0,4),m0=+end.slice(5,7)-1;const ms=[];
  for(let i=5;i>=0;i--){let mm=m0-i,yy=y0;while(mm<0){mm+=12;yy--}ms.push({key:`${yy}-${String(mm+1).padStart(2,"0")}`,label:MONTHS[mm]})}
  const data=ms.map(x=>({...x,in:sum(S.cash.filter(c=>c.type==="in"&&c.date.startsWith(x.key)),c=>c.amount),out:sum(S.cash.filter(c=>c.type==="out"&&c.date.startsWith(x.key)),c=>c.amount)}));
  const max=Math.max(1,...data.flatMap(d=>[d.in,d.out]));
  const raw=max/4,pw=Math.pow(10,Math.floor(Math.log10(raw)));
  const step=[1,2,2.5,5,10].map(f=>f*pw).find(s=>s>=raw),top=step*Math.ceil(max/step);
  const W=640,H=250,L=62,R=10,T=12,B=28,iw=W-L-R,ih=H-T-B,Y=v=>T+ih-ih*v/top,gw=iw/6,bw=gw*.28;
  let g="";
  for(let v=0;v<=top+1e-6;v+=step)g+=`<line class="gl" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v===0?"0":short(v)}</text>`;
  data.forEach((d,i)=>{const x=L+gw*i+gw*.18;
    g+=`<rect class="bi" x="${x}" y="${Y(d.in)}" width="${bw}" height="${ih+T-Y(d.in)}"><title>${d.label}: кирим ${money(d.in)} сўм</title></rect><rect class="bo" x="${x+bw+4}" y="${Y(d.out)}" width="${bw}" height="${ih+T-Y(d.out)}"><title>${d.label}: харажат ${money(d.out)} сўм</title></rect><text x="${x+bw+2}" y="${H-8}" text-anchor="middle">${d.label}</text>`});
  return {svg:`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ойлар бўйича кирим ва харажат">${g}</svg>`,data};
}
VIEWS.reports=()=>{
  const wrows=S.works.map(w=>{const P=sum(S.plan.filter(p=>p.workId===w.id),p=>p.qty),D=sum(S.logs.filter(l=>l.workId===w.id),l=>l.qty),A=sum(S.logs.filter(l=>l.workId===w.id),l=>l.qty*l.rate);
    return tr([`<b>${esc(w.name)}</b>`,esc(w.unit),qn(P),qn(D),P?pc(D/P*100):"—",S.brigades.filter(b=>b.workId===w.id).length,money(A),D?money(A/D):"—"],[2,3,4,5,6,7])});
  const rows=S.objects.map(o=>{const b=breakdown(o.id);const d=b.income-b.cost;
    return tr([`<b>${esc(o.name)}</b>`,o.budget>0?money(o.budget):"—",money(b.income),money(b.labour),money(b.mat),money(b.other),money(b.cost),`<b style="color:var(--${d<0?"bad":"good"})">${d<0?"−":""}${money(Math.abs(d))}</b>`],[1,2,3,4,5,6,7])});
  const T=S.objects.reduce((t,o)=>{const b=breakdown(o.id);t.bud+=o.budget;t.inc+=b.income;t.lab+=b.labour;t.mat+=b.mat;t.oth+=b.other;return t},{bud:0,inc:0,lab:0,mat:0,oth:0});
  const tc=T.lab+T.mat+T.oth,tp=T.inc-tc;
  const foot=S.objects.length?`<tfoot><tr><td>Жами</td><td class="n">${money(T.bud)}</td><td class="n">${money(T.inc)}</td><td class="n">${money(T.lab)}</td><td class="n">${money(T.mat)}</td><td class="n">${money(T.oth)}</td><td class="n">${money(tc)}</td><td class="n">${tp<0?"−":""}${money(Math.abs(tp))}</td></tr></tfoot>`:"";
  const st=S.objects.filter(o=>breakdown(o.id).cost>0).map(o=>{const b=breakdown(o.id);const w=v=>(v/b.cost*100).toFixed(1);
    return `<div><div class="bar-top"><b>${esc(o.name)}</b><span>${short(b.cost)} сўм</span></div><div class="stack"><i style="width:${w(b.labour)}%;background:var(--c1)" title="Бригада ҳақи"></i><i style="width:${w(b.mat)}%;background:var(--c2)" title="Материал"></i><i style="width:${w(b.other)}%;background:var(--c3)" title="Бошқа"></i></div></div>`}).join("");
  const mc=monthlyChart();
  const mrows=mc.data.map(d=>tr([monthLabel(d.key),money(d.in),money(d.out),(d.in-d.out<0?"−":"")+money(Math.abs(d.in-d.out))],[1,2,3]));
  return {eyebrow:"Иш турлари, объектлар ва касса бўйича",title:"Ҳисоботлар",actions:"",
  body:`<section class="block"><h2>Иш турлари бўйича <small>барча объектлар</small></h2>${table(["Иш тури","Бирлик","Режа ҳажми","Бажарилган","Тайёрлик","Бригадалар","Ҳисобланган, сўм","Ўртача ставка, сўм"],wrows,[2,3,4,5,6,7])}</section>
  <section class="block"><h2>Объектлар бўйича натижа <small>сўм</small></h2>${table(["Объект","Шартнома","Мижоз тўловлари","Бригада ҳақи","Материал","Бошқа","Жами сарф","Фарқ"],rows,[1,2,3,4,5,6,7],foot)}</section>
  <div class="cols"><section class="block"><h2>Сўнгги 6 ой: кирим ва харажат</h2><div class="panel"><div class="legend"><span><i style="background:var(--good)"></i>Кирим</span><span><i style="background:var(--accent)"></i>Харажат</span></div>${mc.svg}</div></section>
  <section class="block"><h2>Сарф таркиби</h2><div class="panel"><div class="legend"><span><i style="background:var(--c1)"></i>Бригада ҳақи</span><span><i style="background:var(--c2)"></i>Материал</span><span><i style="background:var(--c3)"></i>Бошқа</span></div><div class="bars">${st||`<p class="hint">Ҳали сарф ёзилмаган.</p>`}</div></div></section></div>
  <section class="block"><h2>Ойлар бўйича рақамлар</h2>${table(["Ой","Кирим, сўм","Харажат, сўм","Фарқ, сўм"],mrows,[1,2,3])}</section>`};
};


