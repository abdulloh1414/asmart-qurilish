import { F, S } from "./store.js";
import { $, CATS_IN, CATS_OUT, DEFAULT_WORKS, TODAY, byId, money, qn, uid } from "./util.js";
import { brName, brStat, objName, rateFor, rest, stockOf, supStat, supplierByName, workName } from "./calc.js";
import { ask, info, openForm } from "./ui.js";
import { clone, commit } from "./sync.js";
import { contractView } from "./contracts.js";
import { actExcel, actPrint } from "./acts.js";
import { render } from "./main.js";
import { XL } from "./importer.js";
export const optObj=none=>[...(none?[["","— Объектсиз —"]]:[]),...S.objects.map(o=>[o.id,o.name])];
export const optMat=()=>S.materials.map(m=>[m.id,`${m.name} (${m.unit})`]);
export const optBr=none=>[...(none?[["","— Танланмаган —"]]:[]),...S.brigades.map(b=>[b.id,b.leader?`${b.name} (бригадир ${b.leader})`:b.name])];
export const optSup=none=>[...(none?[["","— Танланмаган —"]]:[]),...S.suppliers.map(x=>[x.id,x.name])];
export const optWork=none=>[...(none?[["","— Танланмаган —"]]:[]),...S.works.map(w=>[w.id,`${w.name} (${w.unit})`])];
export const needWorks=()=>S.works.length?"":"Аввал «Бригадалар» бўлимида иш турларини қўшинг.";
export const FORMS={
  objects:()=>({title:"объект (дом)",defaults:{status:"active",start:TODAY},fields:[
    {k:"name",l:"Номи (масалан, 35-дом)",req:1,full:1},{k:"clientId",l:"Заказчик (ҳисобот учун)",t:"select",o:[["","— Танланмаган —"],...S.clients.map(c=>[c.id,c.name])]},{k:"address",l:"Манзил / блок"},
    {k:"budget",l:"Шартнома суммаси (сўм)",t:"number",min:0,hint:"Ихтиёрий. Бўш қолса, фақат сарфлар ҳисобланади."},
    {k:"status",l:"Ҳолати",t:"select",o:[["active","Жараёнда"],["paused","Тўхтатилган"],["done","Тугалланган"]]},
    {k:"start",l:"Бошланиши",t:"date"},{k:"end",l:"Тугаш муддати",t:"date"}]}),
  works:()=>({title:"иш тури",defaults:{unit:"м²"},fields:[
    {k:"name",l:"Иш тури",req:1,full:1},{k:"unit",l:"Ўлчов бирлиги",req:1},
    {k:"rate",l:"Бригада учун стандарт ставка (сўм / бирлик)",t:"number",req:1,min:0}]}),
  brigades:()=>({title:"бригада",defaults:{active:"yes",workId:(S.works[0]||{}).id},fields:[
    {k:"name",l:"Бригада номи",req:1,full:1},{k:"leader",l:"Бригадир (аванс ва иш ҳақи шунга берилади)"},{k:"phone",l:"Бригадир телефони"},
    {k:"workId",l:"Асосий иш тури",t:"select",o:optWork(true)},
    {k:"rate",l:"Ставка (сўм / бирлик)",t:"number",min:0,hint:"Бўш қолса, иш турининг стандарт ставкаси олинади."},
    {k:"active",l:"Ишлаяптими",t:"select",o:[["yes","Ҳа"],["no","Йўқ"]],full:1}]}),
  plan:(r,p)=>({title:"режа банди",defaults:{objectId:p.objectId||F.planObj||(S.objects[0]||{}).id,workId:(S.works[0]||{}).id},
    need:()=>!S.objects.length?"Аввал объект қўшинг.":needWorks(),fields:[
    {k:"objectId",l:"Объект",t:"select",o:optObj(),req:1},{k:"workId",l:"Иш тури",t:"select",o:optWork(),req:1},
    {k:"qty",l:"Режа ҳажми",t:"number",req:1,min:0.01},{k:"price",l:"Мижозга нарх (сўм / бирлик)",t:"number",min:0,hint:"Ихтиёрий. Қиймат ва тайёрлик ҳисоби учун."},{k:"matBy",l:"Материал кимники (ҳисоботдаги изоҳ)",t:"select",o:[["","—"],["customer","Заказчик материали"],["contractor","Подрядчик материали"]],full:1}],
    check:(v,rec)=>S.plan.some(x=>x!==rec&&x.objectId===v.objectId&&x.workId===v.workId)?"Бу объектда шу иш тури учун режа бор. Уни таҳрирланг.":""}),
  logs:()=>{const b0=S.brigades.find(b=>b.active!=="no")||S.brigades[0]||{};
    return {title:"бажарилган иш",defaults:{date:TODAY,brigadeId:b0.id,workId:b0.workId||(S.works[0]||{}).id,objectId:(S.objects.filter(o=>o.status==="active")[0]||S.objects[0]||{}).id},
    need:()=>!S.objects.length?"Аввал объект қўшинг.":needWorks()||(!S.brigades.length?"Аввал бригада қўшинг.":""),fields:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"brigadeId",l:"Бригада",t:"select",o:optBr(),req:1},
    {k:"objectId",l:"Объект",t:"select",o:optObj(),req:1},{k:"workId",l:"Иш тури",t:"select",o:optWork(),req:1},
    {k:"qty",l:"Бажарилган ҳажм",t:"number",req:1,min:0.01},
    {k:"rate",l:"Ставка (бўш қолса, бригада ставкаси)",t:"number",min:0},
    {k:"zone",l:"Жой: блок, қават, хонадон (ихтиёрий)",full:1}],
    hook:(form,name)=>{if(name==="brigadeId"){const b=byId(S.brigades,form.querySelector('[name="brigadeId"]').value);if(b&&b.workId)form.querySelector('[name="workId"]').value=b.workId}},
    build:v=>({...v,rate:rateFor(v.brigadeId,v.workId,v.rate)})}},
  suppliers:()=>({title:"етказиб берувчи",fields:[{k:"name",l:"Номи",req:1,full:1},{k:"phone",l:"Телефон"},{k:"note",l:"Изоҳ"}],
    check:(v,rec)=>S.suppliers.some(x=>x!==rec&&x.name.toLowerCase()===v.name.toLowerCase())?"Бундай етказиб берувчи бор.":""}),
  moves:(r)=>{const inn=r&&r.type==="in";return {title:inn?"кирим":"чиқим",fields:inn?[
    {k:"date",l:"Сана",t:"date",req:1},{k:"qty",l:"Миқдори",t:"number",req:1,min:0.0001},
    {k:"objectId",l:"Қайси дом учун",t:"select",o:optObj(true)},{k:"price",l:"Бирлик нархи (сўм)",t:"number",min:0},
    {k:"supplier",l:"Етказиб берувчи",list:S.suppliers.map(x=>x.name),full:1},{k:"note",l:"Изоҳ",full:1}]:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"qty",l:"Миқдори",t:"number",req:1,min:0.0001},
    {k:"objectId",l:"Объект",t:"select",o:optObj(true)},{k:"brigadeId",l:"Бригада",t:"select",o:optBr(true)},
    {k:"receiver",l:"Материални олган ишчи",full:1},{k:"note",l:"Изоҳ",full:1}],
    build:v=>{if(inn){const x=supplierByName(S,v.supplier,true);return {...v,supplier:v.supplier,supplierId:x?x.id:""}}return v}}},
  materials:()=>({title:"материал",defaults:{unit:"шт",min:0},fields:[
    {k:"name",l:"Материал номи",req:1,full:1},{k:"unit",l:"Ўлчов бирлиги",req:1},
    {k:"min",l:"Минимал қолдиқ",t:"number",min:0,hint:"Қолдиқ шундан тушса, огоҳлантириш чиқади."},
    {k:"price",l:"Нархи (сўм), ихтиёрий",t:"number",min:0}]}),
  cash:(r,p)=>{const type=r?r.type:p.type;const out=type==="out";return {title:out?"харажат":"кирим",defaults:{type,date:TODAY,cat:out?"material":"client"},fields:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"amount",l:"Сумма (сўм)",t:"number",req:1,min:1},
    {k:"cat",l:"Тоифа",t:"select",o:Object.entries(out?CATS_OUT:CATS_IN),req:1},
    {k:"objectId",l:"Объект",t:"select",o:optObj(true),hint:out?"Омборга олинган материал учун объектни танламанг: у омбордан чиқимда ҳисобланади.":""},
    ...(out?[{k:"supplierId",l:"Етказиб берувчи (унга тўлов учун)",t:"select",o:optSup(true),full:1},{k:"brigadeId",l:"Бригада (аванс ёки иш ҳақи учун)",t:"select",o:optBr(true),full:1},{k:"workId",l:"Иш тури (аванс ёки иш ҳақи учун, ихтиёрий)",t:"select",o:optWork(true),full:1}]:[]),
    {k:"note",l:"Изоҳ",full:1}],
    check:v=>out&&v.cat==="supplier"&&!v.supplierId?"Тўлов учун етказиб берувчини танланг.":out&&(v.cat==="advance"||v.cat==="wage")&&!v.brigadeId?"Аванс ёки иш ҳақи учун бригадани танланг.":"",
    build:v=>{const bp=out&&(v.cat==="advance"||v.cat==="wage");return {...v,type,brigadeId:bp?v.brigadeId:"",workId:bp?v.workId:"",supplierId:out&&v.cat==="supplier"?v.supplierId:""}}}},
  contracts:(r)=>({title:"меҳнат шартномаси",defaults:{no:String(1+Math.max(0,...S.contracts.map(c=>parseInt(c.no)||0))),date:TODAY,hireDate:TODAY,termType:"open",city:"Toshkent shahri"},fields:[
    {k:"no",l:"Шартнома рақами",req:1},{k:"date",l:"Шартнома санаси",t:"date",req:1},
    {k:"fio",l:"Ходим: Ф.И.Ш.",req:1,full:1,hint:"Шартнома матни лотин ёзувида чиқади, шунинг учун Ф.И.Ш.ни лотинда ёзинг."},
    {k:"passport",l:"Паспорт / ID карта (серия, рақам)"},{k:"passDate",l:"Берилган сана",t:"date"},
    {k:"passBy",l:"Ким томонидан берилган",full:1},{k:"pinfl",l:"ЖШШИР"},{k:"phone",l:"Телефон"},
    {k:"address",l:"Ходим яшаш манзили",full:1},{k:"card",l:"Банк картаси / ҳ/р"},{k:"bank",l:"Банк"},
    {k:"position",l:"Лавозими / касби",list:["Shpatlevkachi","Rotbandchi","Gipsokartonchi","Fasadchi","Emulsiyachi","Travertinchi","Kafelchi","Yordamchi ishchi","Usta","Bригадир"].map(x=>x==="Bригадир"?"Brigadir":x),full:1},
    {k:"objectId",l:"Объект (дом)",t:"select",o:optObj(true)},{k:"objAddr",l:"Объект манзили",hint:"Бўш қолса, объект манзили олинади."},
    {k:"place",l:"Иш жойи (бино, блок, қават, хоналар)",full:1},
    {k:"termType",l:"Шартнома муддати",t:"select",o:[["open","Номуайян муддатга"],["fixed","Муддатли"]]},{k:"hireDate",l:"Ишга кирган сана",t:"date"},
    {k:"from",l:"Муддатли бўлса: бошланиши",t:"date"},{k:"to",l:"Муддатли бўлса: тугаши",t:"date"},
    {k:"payNote",l:"Иш ҳақи келишуви (шартномага ёзилади)",full:1,hint:"Масалан: bajarilgan hajm bo‘yicha, 1 m² uchun 14 000 so‘m."}],
    check:v=>v.termType==="fixed"&&v.from&&v.to&&v.to<v.from?"Тугаш санаси бошланишидан олдин бўлмаслиги керак.":S.contracts.some(c=>c!==r&&c.no===v.no&&(c.date||"").slice(0,4)===(v.date||"").slice(0,4))?"Бу рақамли шартнома шу йилда бор.":""}),
  clients:()=>({title:"заказчик",defaults:{vatIncl:"yes"},fields:[
    {k:"name",l:"Номи",req:1,full:1},{k:"address",l:"Манзил",full:1},{k:"bank",l:"Банк"},{k:"account",l:"Ҳисоб рақами"},{k:"mfo",l:"МФО"},{k:"inn",l:"ИНН"},{k:"oked",l:"ОКЭД коди"},
    {k:"head",l:"Заказчик раҳбари (Ф.И.Ш.)"},{k:"contractNo",l:"Шартнома №"},{k:"contractDate",l:"Шартнома санаси",t:"date"},
    {k:"contractSum",l:"Шартнома суммаси (сўм)",t:"number",min:0},{k:"vatIncl",l:"Режадаги нархлар",t:"select",o:[["yes","ҚҚС билан киритилган"],["no","ҚҚСсиз киритилган"]]}]}),
  debts:()=>({title:"қарз",defaults:{kind:"owe",paid:0},fields:[
    {k:"kind",l:"Тури",t:"select",o:[["owe","Биз қарздормиз"],["owed","Бизга қарздор"]],full:1},
    {k:"party",l:"Ким билан",req:1,full:1},{k:"amount",l:"Қарз суммаси (сўм)",t:"number",req:1,min:1},
    {k:"paid",l:"Тўланган (сўм)",t:"number",min:0},{k:"due",l:"Тўлаш муддати",t:"date"},
    {k:"objectId",l:"Объект",t:"select",o:optObj(true)},{k:"note",l:"Изоҳ",full:1}],
    check:v=>v.paid>v.amount?"Тўланган сумма қарздан катта бўлиши мумкин эмас.":""})
};
export function openEntity(t,rec,preset){
  const cfg=FORMS[t](rec,preset||{});
  const n=cfg.need&&cfg.need();if(n)return info(n);
  const values=rec?clone(rec):(cfg.defaults||{});
  openForm({title:(rec?"Таҳрирлаш: ":"Янги: ")+cfg.title,fields:cfg.fields,values,onChange:cfg.hook,onSave:v=>{
    const err=cfg.check&&cfg.check(v,rec);if(err)return err;
    const out=cfg.build?cfg.build(v):v;
    if(rec)Object.assign(rec,out);else S[t].push({id:uid(),...out});
    commit();}});
}
export function moveForm(type){
  if(!S.materials.length)return info("Аввал материал қўшинг ёки Excel'дан юкланг.");
  if(type==="out"&&!S.objects.length)return info("Аввал объект қўшинг.");
  const m0=S.materials[0];const inn=type==="in";
  const fields=inn?[
    {k:"date",l:"Сана",t:"date",req:1},{k:"materialId",l:"Материал",t:"select",o:optMat(),req:1},
    {k:"qty",l:"Миқдори",t:"number",req:1,min:0.0001},{k:"objectId",l:"Қайси дом учун (ихтиёрий)",t:"select",o:optObj(true)},
    {k:"supplier",l:"Етказиб берувчи",list:S.suppliers.map(x=>x.name),full:1},
    {k:"price",l:"Бирлик нархи (сўм)",t:"number",min:0},{k:"total",l:"ёки накладной суммаси (сўм)",t:"number",min:0,hint:"Қарз ҳисоби учун нарх ёки умумий суммадан бирини киритинг."},
    {k:"paidNow",l:"Шу заҳоти тўланган (сўм)",t:"number",min:0,hint:"Қолгани етказиб берувчига қарз бўлиб ёзилади.",full:1},
    {k:"note",l:"Изоҳ",full:1}]:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"materialId",l:"Материал",t:"select",o:optMat(),req:1},
    {k:"qty",l:"Миқдори",t:"number",req:1,min:0.0001},{k:"objectId",l:"Қайси объектга",t:"select",o:optObj(),req:1},
    {k:"brigadeId",l:"Қайси бригадага",t:"select",o:optBr(true)},{k:"receiver",l:"Материални олган ишчи (ихтиёрий)"},
    {k:"note",l:"Изоҳ",full:1}];
  openForm({title:inn?"Омборга кирим":"Омбордан чиқим",values:{date:TODAY,materialId:m0.id,price:m0.price||""},fields,onSave:v=>{
    const m=byId(S.materials,v.materialId);
    if(!inn){
      if(v.qty>stockOf(m.id)+1e-9)return `Омборда етарли эмас. Қолдиқ: ${qn(stockOf(m.id))} ${m.unit}`;
      S.moves.push({id:uid(),type,date:v.date,materialId:m.id,qty:v.qty,price:m.price||0,objectId:v.objectId||"",brigadeId:v.brigadeId||"",receiver:v.receiver||"",supplier:"",supplierId:"",note:v.note||""});
      return commit();
    }
    const price=v.total>0?v.total/v.qty:(v.price||0);
    if(v.paidNow>0&&!(v.supplier||"").trim())return "Тўлов ёзиш учун етказиб берувчини киритинг.";
    if(v.paidNow>price*v.qty+1&&price>0)return "Тўланган сумма накладной суммасидан катта.";
    const sp=supplierByName(S,v.supplier,true);
    S.moves.push({id:uid(),type,date:v.date,materialId:m.id,qty:v.qty,price,objectId:v.objectId||"",brigadeId:"",receiver:"",supplier:(v.supplier||"").trim(),supplierId:sp?sp.id:"",note:v.note||""});
    if(price>0)m.price=price;
    if(v.paidNow>0)S.cash.push({id:uid(),date:v.date,type:"out",cat:"supplier",amount:v.paidNow,objectId:"",brigadeId:"",workId:"",supplierId:sp.id,note:"Етказиб беришда тўланган"});
    commit();}});
}
export function supPayForm(sid){
  if(!S.suppliers.length)return info("Аввал етказиб берувчи қўшинг ёки омборга кирим ёзинг.");
  const sp=byId(S.suppliers,sid)||byId(S.suppliers,F.supId)||S.suppliers[0];const st=supStat(sp);
  openForm({title:"Етказиб берувчига тўлов",values:{date:TODAY,supplierId:sp.id,amount:st.debt>0?Math.round(st.debt):""},fields:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"supplierId",l:"Етказиб берувчи",t:"select",o:optSup(),req:1},
    {k:"amount",l:"Сумма (сўм)",t:"number",req:1,min:1,hint:"Дастлабки сумма: жорий қарз."},{k:"note",l:"Изоҳ",full:1}],
    onSave:v=>{S.cash.push({id:uid(),date:v.date,type:"out",cat:"supplier",amount:v.amount,objectId:"",brigadeId:"",workId:"",supplierId:v.supplierId,note:v.note});commit()}});
}
export function payForm(kind,bid){
  if(!S.brigades.length)return info("Аввал бригада қўшинг.");
  const b=byId(S.brigades,bid)||byId(S.brigades,F.payBrigade)||S.brigades[0];
  const net=brStat(b).net;
  openForm({title:kind==="advance"?"Бригадирга аванс бериш":"Бригадирга иш ҳақи тўлаш",values:{date:TODAY,brigadeId:b.id,amount:kind==="wage"&&net>0?Math.round(net):"",objectId:"",workId:""},fields:[
    {k:"date",l:"Сана",t:"date",req:1},{k:"brigadeId",l:"Бригада (пул бригадирга берилади)",t:"select",o:optBr(),req:1},
    {k:"amount",l:"Сумма (сўм)",t:"number",req:1,min:1,hint:kind==="wage"?"Дастлабки сумма: аванслар чегирилгандан кейинги қолдиқ.":""},
    {k:"objectId",l:"Қайси объект учун (ихтиёрий)",t:"select",o:optObj(true)},
    {k:"workId",l:"Қайси иш тури учун (ихтиёрий)",t:"select",o:optWork(true),full:1},
    {k:"note",l:"Изоҳ",full:1}],
    onSave:v=>{S.cash.push({id:uid(),date:v.date,type:"out",cat:kind,amount:v.amount,objectId:v.objectId||"",workId:v.workId||"",brigadeId:v.brigadeId,note:v.note});commit()}});
}
export function debtPayForm(id){
  const d=byId(S.debts,id);if(!d)return;const r=rest(d);
  openForm({title:d.kind==="owe"?"Қарзга тўлов":"Қарз қайтиши",values:{amount:r},fields:[
    {k:"amount",l:`Сумма (қолган: ${money(r)} сўм)`,t:"number",req:1,min:1,full:1}],
    onSave:v=>{if(v.amount>r+1e-9)return "Сумма қолган қарздан катта.";d.paid+=v.amount;commit()}});
}
export const label=(t,r)=>!r?"":t==="contracts"?(r.fio||"шартнома"):t==="cash"?`${money(r.amount)} сўм`:t==="moves"?((byId(S.materials,r.materialId)||{}).name||"ҳаракат"):t==="logs"?(brName(r.brigadeId)+", "+qn(r.qty)):t==="plan"?(objName(r.objectId)+": "+workName(r.workId)):t==="debts"?r.party:r.name;
export const ACTIONS={
  new:(id,t,b)=>openEntity(t,null,{type:b.dataset.type,objectId:b.dataset.obj}),
  edit:(id,t)=>openEntity(t,byId(S[t],id)),
  del:(id,t)=>{const r=byId(S[t],id);ask(`«${label(t,r)}» ўчирилсинми?`,()=>{S[t]=S[t].filter(x=>x.id!==id);commit()})},
  "move-in":()=>moveForm("in"),"move-out":()=>moveForm("out"),
  advance:(id)=>payForm("advance",id),wage:(id)=>payForm("wage",id),
  "debt-pay":id=>debtPayForm(id),
  "sup-pay":id=>supPayForm(id),
  "ct-view":id=>contractView(id),
  "act-print":k=>actPrint(k),
  "act-xls":k=>actExcel(k),
  "sup-statement":id=>{F.supId=id;if(location.hash==="#suppliers")render();else location.hash="suppliers"},
  "all-suppliers":()=>{F.supId="";render()},
  "plan-of":id=>{F.planObj=id;location.hash="plan"},
  statement:id=>{F.payBrigade=id;if(location.hash==="#payroll")render();else location.hash="payroll"},
  "all-brigades":()=>{F.payBrigade="";render()},
  "seed-works":()=>{DEFAULT_WORKS.forEach(w=>S.works.push({id:uid(),name:w[0],unit:w[1],rate:0}));commit()},
  "import-xl":()=>{XL.mode="stock";$("#xl").click()},
  "import-plan":()=>{if(!S.objects.length)return info("Аввал объект қўшинг.");XL.mode="plan";$("#xl").click()},
  "out-of":id=>{F.outBr=id;render();const el=$("#outsec");if(el)el.scrollIntoView()},
};
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const f=ACTIONS[b.dataset.act];if(f)f(b.dataset.id,b.dataset.t,b)});
document.addEventListener("change",e=>{const pi=e.target.closest("[data-mprice]");if(pi){const v=Number(pi.value);const m=byId(S.moves,pi.dataset.mprice);if(m&&isFinite(v)&&v>0){m.price=v;const mt=byId(S.materials,m.materialId);if(mt&&!(mt.price>0))mt.price=v;commit()}return}const f=e.target.closest("[data-filter]");if(f){F[f.dataset.filter]=f.value;render()}});

