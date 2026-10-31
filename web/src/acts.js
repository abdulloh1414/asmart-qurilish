import { $, TODAY, byId, esc, fd, money, qn, short, sum } from "./util.js";
import { F, S } from "./store.js";
import { isBrPay, isSupPay } from "./calc.js";
import { VIEWS, payDoc } from "./views.js";
import { btn, info, layer, rowActs, saveFile, sel, stat, table, tr } from "./ui.js";
import { loadXLSX } from "./importer.js";
export const CTR={name:'ООО "TRIUMF ENGENEERING"',addr:"г.Ташкент, Сергелийский р-н, Дарё-буйи МФЙ, Нилуфар 3-тор к., 1-уй, 8-хонадон",bank:"АТ «Алокабанк» Сергели КХКМ",acc:"2020 8000 9070 9976 2001",mfo:"00401",inn:"311443186",dir:"Йулдошев А. Х."};
export const MATBY={customer:"Давал м-лы заказчика",contractor:"М-лы подрядчика"};
export const fv=(c,f)=>f==="m"?money(c):f==="p"?(Math.round(c*10)/10)+"%":qn(c);
export function actData(){
  const cl=F.actClient?byId(S.clients,F.actClient):null;
  const objs=S.objects.filter(o=>(!F.actClient||o.clientId===F.actClient)&&(!F.actObj||o.id===F.actObj));
  const ids=new Set(objs.map(o=>o.id));
  const from=F.actFrom||"0000-00-00",to=F.actTo||"9999-12-31";
  const inP=l=>l.date>=from&&l.date<=to,upTo=l=>l.date<=to;
  const client=cl||(objs[0]&&objs[0].clientId?byId(S.clients,objs[0].clientId):null);
  const vatIncl=!client||client.vatIncl!=="no";
  const L=S.logs.filter(l=>ids.has(l.objectId));
  const planOf=(o,w)=>S.plan.find(p=>p.objectId===o&&p.workId===w);
  const price=(o,w)=>(planOf(o,w)||{}).price||0;
  const spRows=[];let spTot=0;
  objs.forEach(o=>{
    const rows=S.plan.filter(p=>p.objectId===o.id).map(p=>{const w=byId(S.works,p.workId)||{name:"—",unit:""};
      const q=sum(L.filter(l=>l.objectId===o.id&&l.workId===p.workId&&inP(l)),l=>l.qty);return {p,w,q}}).filter(x=>x.q>0);
    if(!rows.length)return;
    if(objs.length>1)spRows.push({g:o.name+(o.address?" · "+o.address:"")});
    rows.forEach((x,i)=>{const sm=x.q*(x.p.price||0);spTot+=sm;
      spRows.push({c:[i+1,x.w.name,x.w.unit,[x.q,"q"],[x.p.price||0,"m"],[sm,"m"],MATBY[x.p.matBy]||""]})});
  });
  spRows.push({b:1,c:["","Итого","","","",[spTot,"m"],""]});
  const unplanned=L.filter(l=>inP(l)&&!planOf(l.objectId,l.workId)).length;
  const noPrice=S.plan.filter(p=>ids.has(p.objectId)&&!(p.price>0)&&L.some(l=>l.objectId===p.objectId&&l.workId===p.workId&&inP(l))).length;
  const f3Rows=[];let cP=0,cS=0,cT=0,cZ=0;let n=0;
  S.works.forEach(w=>{
    const P=S.plan.filter(p=>ids.has(p.objectId)&&p.workId===w.id);
    const pq=sum(P,p=>p.qty),ps=sum(P,p=>p.qty*(p.price||0));
    const sq=sum(L.filter(l=>l.workId===w.id&&upTo(l)),l=>l.qty),ss=sum(L.filter(l=>l.workId===w.id&&upTo(l)),l=>l.qty*price(l.objectId,w.id));
    const mq=sum(L.filter(l=>l.workId===w.id&&inP(l)),l=>l.qty),ms=sum(L.filter(l=>l.workId===w.id&&inP(l)),l=>l.qty*price(l.objectId,w.id));
    if(!pq&&!sq)return;cP+=ps;cS+=ss;cT+=ms;n++;
    f3Rows.push({c:[n,w.name,w.unit,[pq,"q"],[ps,"m"],[sq,"q"],[pq?sq/pq*100:0,"p"],[ss,"m"],[mq,"q"],[pq?mq/pq*100:0,"p"],[ms,"m"]]});
  });
  const split=g=>vatIncl?{net:g/1.12,vat:g*.12/1.12,tot:g}:{net:g,vat:g*.12,tot:g*1.12};
  const a=split(cS),b=split(cT),cc=split(cP);
  const received=sum(S.cash.filter(c=>c.type==="in"&&c.cat==="client"&&ids.has(c.objectId)&&c.date<=to),c=>c.amount);
  f3Rows.push({b:1,c:["","Итого (без НДС)","","",[cc.net,"m"],"","",[a.net,"m"],"","",[b.net,"m"]]});
  f3Rows.push({c:["","НДС 12%","","",[cc.vat,"m"],"","",[a.vat,"m"],"","",[b.vat,"m"]]});
  f3Rows.push({b:1,c:["","ВСЕГО с НДС","","",[cc.tot,"m"],"","",[a.tot,"m"],"","",[b.tot,"m"]]});
  f3Rows.push({c:["","Оплачено заказчиком (с начала)","","","","","",[received,"m"],"","",""]});
  f3Rows.push({b:1,c:["","Задолженность заказчика","","","","","",[a.tot-received,"m"],"","",""]});
  const eco=objs.map(o=>{
    const rev=sum(S.logs.filter(l=>l.objectId===o.id&&inP(l)),l=>l.qty*price(o.id,l.workId));
    const net=vatIncl?rev/1.12:rev;
    const lab=sum(S.logs.filter(l=>l.objectId===o.id&&inP(l)),l=>l.qty*l.rate);
    const mat=sum(S.moves.filter(m=>m.type==="out"&&m.objectId===o.id&&m.date>=from&&m.date<=to),m=>m.qty*m.price);
    const oth=sum(S.cash.filter(c=>c.type==="out"&&c.objectId===o.id&&c.cat!=="material"&&!isBrPay(c)&&!isSupPay(c)&&c.date>=from&&c.date<=to),c=>c.amount);
    return {o,net,lab,mat,oth,profit:net-lab-mat-oth}}).filter(e=>e.net||e.lab||e.mat||e.oth);
  const oname=objs.map(o=>o.name).join(", ")||"—";
  const per=`с ${fd(F.actFrom)} по ${fd(F.actTo)}`;
  const sp={key:"sp",title:"Справка",lines:["Справка","О выполненных объемах работ за период "+per,"по объекту: "+oname,client?"Заказчик: "+client.name:"","Подрядчик: "+CTR.name],
    cols:["№","Наименование работ","Ед. изм.","Кол-во","Цена "+(vatIncl?"с НДС":"без НДС"),"Сумма "+(vatIncl?"с НДС":"без НДС"),"Примечание"],rows:spRows,
    sign:["Сдали представители подрядной организаций:","Ответственный руководитель подрядчика  ______________________","Внутренный контроль - исполнитель работ  ______________________","","Приняли представители заказчика:","Технический надзор строительного объекта  ______________________","Внутренный контроль строительного объекта  ______________________","Ответственный геодезист строительного объекта  ______________________"]};
  const f3={key:"f3",title:"Ф-3",lines:["СПРАВКА-СЧЕТ-ФАКТУРА О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ (ПОНЕСЕННЫХ ЗАТРАТ)","за период "+per,
    "Заказчик: "+(client?client.name:"—")+(client&&client.address?", "+client.address:""),client?`Банк: ${client.bank||"—"}, Р/с: ${client.account||"—"}, МФО: ${client.mfo||"—"}, ИНН: ${client.inn||"—"}`:"",
    "Подрядчик: "+CTR.name+", "+CTR.addr,`Банк: ${CTR.bank}, Р/с: ${CTR.acc}, МФО: ${CTR.mfo}, ИНН: ${CTR.inn}`,
    "Объект: "+oname,client&&client.contractNo?`Договор №${client.contractNo}${client.contractDate?" от "+fd(client.contractDate):""}${client.contractSum?". Сумма договора "+money(client.contractSum):""}`:""],
    cols:["№","Наименование видов работ","Ед. изм.","Объем по договору","Стоимость по договору","С начала: объем","С начала: % к договору","С начала: сумма","За период: объем","За период: %","За период: сумма"],rows:f3Rows,
    sign:["Руководитель Заказчика  ______________________  "+(client&&client.head?client.head:""),"Директор подрядчика  ______________________  "+CTR.dir,"Гл. бухгалтер Заказчика  ______________________","Главный бухгалтер Подрядчика  ______________________"]};
  return {sp,f3,eco,vatIncl,client,objs,stats:{period:b.tot,since:a.tot,received,debt:a.tot-received},unplanned,noPrice};
}
export function docHtml(d){
  const cell=c=>Array.isArray(c)?`<td class="n">${fv(c[0],c[1])}</td>`:`<td>${esc(c)}</td>`;
  return `<div class="rp-doc">${d.lines.filter(Boolean).map((t,i)=>`<p class="${i===0?"rp-t":"rp-l"}">${esc(t)}</p>`).join("")}
  <div class="tw"><table class="rp"><thead><tr>${d.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${d.rows.map(r=>r.g?`<tr class="g"><td colspan="${d.cols.length}">${esc(r.g)}</td></tr>`:`<tr class="${r.b?"b":""}">${r.c.map(cell).join("")}</tr>`).join("")||`<tr><td colspan="${d.cols.length}" class="emp">Бу даврда бажарилган иш йўқ</td></tr>`}</tbody></table></div>
  <div class="rp-sign">${d.sign.map(t=>t?`<p>${esc(t)}</p>`:"<br>").join("")}</div></div>`;
}
export function actPrint(k){
  const D=k==="pay"?payDoc():actData()[k];
  const L=layer(`<div class="sheet ctsheet rpsheet" role="dialog"><div class="ct-bar noprint"><button class="btn" data-close>Ёпиш</button><button class="btn" data-print>Чоп этиш / PDF</button><button class="btn primary" data-xls>Excel юклаш</button><span class="hint" data-msg role="status"></span></div><div class="ct-doc">${docHtml(D)}</div></div>`);
  $("[data-print]",L.el).addEventListener("click",()=>{try{window.print()}catch(e){$("[data-msg]",L.el).textContent="Чоп этиш бу ойнада ишламади. Excel файлидан фойдаланинг."}});
  $("[data-xls]",L.el).addEventListener("click",()=>actExcel(k,$("[data-msg]",L.el)));
}
export async function actExcel(k,msgEl){
  const say=t=>{if(msgEl)msgEl.textContent=t;else info(t)};
  try{
    const dl={save:async({filename,data})=>saveFile(filename,data)};
    const X=await loadXLSX();const A=actData();
    const docs=k==="all"?[A.sp,A.f3]:k==="pay"?[payDoc()]:[A[k]];
    const wb=X.utils.book_new();
    docs.forEach(d=>{
      const aoa=[...d.lines.filter(Boolean).map(t=>[t]),[],d.cols,...d.rows.map(r=>r.g?[r.g]:r.c.map(c=>Array.isArray(c)?Math.round(c[0]*100)/100:c)),[],...d.sign.map(t=>[t])];
      const ws=X.utils.aoa_to_sheet(aoa);ws["!cols"]=d.cols.map((c,i)=>({wch:i===1?48:i===6&&d.key==="sp"?24:15}));
      X.utils.book_append_sheet(wb,ws,d.title);
    });
    const out=X.write(wb,{type:"array",bookType:"xlsx"});
    await dl.save({filename:`${k==="pay"?"Vedomost_"+(F.payMonth||"hammasi"):"Hisobot_"+(k==="all"?"spravka_F3":k==="sp"?"spravka":"F3")+"_"+(F.actTo||TODAY)}.xlsx`,data:new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});
    say("Файл сақланди.");
  }catch(e){say(e&&e.code==="declined"?"Юклаш бекор қилинди.":"Файлни тайёрлаб бўлмади. Қайта уриниб кўринг.")}
}
VIEWS.acts=()=>{
  const A=actData();
  const crows=S.clients.map(c=>tr([`<div class="nm"><b>${esc(c.name)}</b><span>${esc(c.inn?"ИНН "+c.inn:"")}</span></div>`,c.contractNo?`№${esc(c.contractNo)}${c.contractDate?" · "+fd(c.contractDate):""}`:"—",c.contractSum?money(c.contractSum):"—",esc(c.head||"—"),rowActs("clients",c.id)],[2]));
  const empty=!S.objects.length?`<p class="hint">Аввал объект ва режа (нархлари билан) киритинг.</p>`:"";
  return {eyebrow:"Бажарилган ишлар бўйича заказчикка топшириладиган ҳужжатлар",title:"Заказчикка ҳисобот",
  actions:btn("+ Заказчик","new",'data-t="clients"')+btn("Иккаласини Excel'га","act-xls",'data-id="all"',"primary"),
  body:`${empty}<div class="filters">${sel("ac","actClient",[["","Барча заказчиклар"],...S.clients.map(c=>[c.id,c.name])],F.actClient,"Заказчик")}${sel("ao","actObj",[["","Барча объектлар"],...S.objects.filter(o=>!F.actClient||o.clientId===F.actClient).map(o=>[o.id,o.name])],F.actObj,"Объект")}
  <div><label for="af">Давр: дан</label><input id="af" type="date" data-filter="actFrom" value="${esc(F.actFrom)}"></div><div><label for="at">гача</label><input id="at" type="date" data-filter="actTo" value="${esc(F.actTo)}"></div></div>
  <div class="stats">${stat("Давр учун бажарилган",short(A.stats.period),"сўм, ҚҚС билан")}${stat("Бошидан бажарилган",short(A.stats.since),"сўм, ҚҚС билан")}${stat("Заказчик тўлаган",short(A.stats.received),"Касса: «Мижоздан тўлов»")}${stat("Заказчик қарзи",(A.stats.debt<0?"−":"")+short(Math.abs(A.stats.debt)),"бизга тўланиши керак",1)}</div>
  ${A.noPrice?`<p class="hint" style="margin-bottom:8px">${A.noPrice} та иш турида режада нарх йўқ — суммага 0 ёзилди. «Иш режаси»да нарх киритинг.</p>`:""}${A.unplanned?`<p class="hint" style="margin-bottom:8px">${A.unplanned} та бажарилган иш ёзуви режада йўқ объект/иш турига тегишли — ҳисоботга кирмади.</p>`:""}
  <section class="block"><h2>Справка о выполненных объемах <small><button class="btn sm" data-act="act-print" data-id="sp">Кўриш / чоп этиш</button> <button class="btn sm" data-act="act-xls" data-id="sp">Excel</button></small></h2>${docHtml(A.sp)}</section>
  <section class="block"><h2>Справка-счет-фактура Ф-3 <small><button class="btn sm" data-act="act-print" data-id="f3">Кўриш / чоп этиш</button> <button class="btn sm" data-act="act-xls" data-id="f3">Excel</button></small></h2>${docHtml(A.f3)}</section>
  <section class="block"><h2>Давр бўйича харажат ва фойда <small>ички ҳисоб, ҚҚСсиз</small></h2>${table(["Объект","Заказчикка иш (ҚҚСсиз)","Бригада ҳақи","Сарфланган материал","Бошқа харажат","Фойда"],A.eco.map(e=>tr([`<b>${esc(e.o.name)}</b>`,money(e.net),money(e.lab),money(e.mat),money(e.oth),`<b style="color:var(--${e.profit<0?"bad":"good"})">${e.profit<0?"−":""}${money(Math.abs(e.profit))}</b>`],[1,2,3,4,5])),[1,2,3,4,5],A.eco.length>1?`<tfoot><tr><td>Жами</td><td class="n">${money(sum(A.eco,e=>e.net))}</td><td class="n">${money(sum(A.eco,e=>e.lab))}</td><td class="n">${money(sum(A.eco,e=>e.mat))}</td><td class="n">${money(sum(A.eco,e=>e.oth))}</td><td class="n">${money(sum(A.eco,e=>e.profit))}</td></tr></tfoot>`:"")}
  <p class="hint">Иш ҳажми «Бажарилган ишлар»дан, материал «Омбор → Чиқим»дан (чиқарилган вақтдаги нарх билан) автоматик олинади.</p></section>
  <section class="block"><h2>Заказчиклар ва шартномалар</h2>${table(["Заказчик","Шартнома","Шартнома суммаси, сўм","Раҳбар",""],crows,[2])}</section>`};
};

