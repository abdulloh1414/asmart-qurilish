import { $, byId, esc, fd, money, monthLabel, qn, short, sum } from "./util.js";
import { F, S } from "./store.js";
import { btn, layer, pill, rowActs, saveFile, sel, stat, table, tr } from "./ui.js";
import { VIEWS } from "./views.js";
import { isSupPay, objName, supStat } from "./calc.js";
export const CT_STATIC=[["h", "2. ISH HAQI"], ["p", "2.1. Xodimning ish haqi miqdori va hisoblash usuli (kunbay, soatbay, bajarilgan hajm bo‘yicha yoki oylik) Tomonlarning yozma kelishuvida belgilanadi va shartnomaning ajralmas qismi hisoblanadi."], ["p", "3.2. Soliqlar va majburiy to‘lovlar O‘zbekiston Respublikasi qonunchiligiga muvofiq hisoblanadi va to‘lanadi."], ["p", "3.3. Ish haqidan ushlanmalar faqat Mehnat kodeksida nazarda tutilgan hollarda, tartibda va chegaralarda amalga oshiriladi. Ish beruvchi ushlanma sababi va miqdorini yozma ko‘rsatadi va xodimni u bilan tanishtiradi."], ["h", "4. TOMONLARNING MAJBURIYATLARI"], ["p", "4.1. Xodim majburiyatlari:"], ["li", "topshirilgan ishlarni sifatli va belgilangan muddatda bajarish;"], ["li", "ichki mehnat tartibi qoidalariga rioya qilish, ish vaqtida spirtli ichimlik yoki giyohvandlik vositalari ta’sirida bo‘lmaslik;"], ["li", "Ish beruvchi mol-mulki va materiallariga ehtiyotkorlik bilan munosabatda bo‘lish;"], ["li", "ish joyidagi xavfli holat haqida Ish beruvchini darhol xabardor qilish;"], ["li", "sog‘lig‘i bo‘yicha ishlashga to‘sqinlik qiluvchi holat mavjud emasligini tasdiqlash."], ["p", "4.2. Ish beruvchi majburiyatlari:"], ["li", "Xodimni ish bilan, zarur materiallar va ish joyi bilan ta’minlash;"], ["li", "ish haqini o‘z vaqtida to‘liq to‘lash;"], ["li", "xavfsiz mehnat sharoitini yaratish va mehnat muhofazasi talablariga rioya qilish;"], ["li", "Xodim mehnat huquqlarini Mehnat kodeksiga muvofiq ta’minlash."], ["h", "5. TEXNIKA XAVFSIZLIGI VA MEHNAT MUHOFAZASI"], ["p", "5.1. Ish boshlanishidan oldin Xodimga texnika xavfsizligi bo‘yicha kirish yo‘riqnomasi o‘tkaziladi va u imzo bilan qayd etiladi. Ish beruvchi ish joyidagi xavfli omillar haqida Xodimni ogohlantiradi."], ["p", "5.2. Xodim ish davomida:"], ["li", "shaxsiy himoya vositalaridan (qo‘lqop, niqob, ko‘zoynak, kaska, maxsus poyabzal) foydalanadi;"], ["li", "faqat sozligi tekshirilgan asbob-uskunalar bilan ishlaydi; balandlikda faqat mustahkam iskala yoki narvondan foydalanadi;"], ["li", "og‘ir yuklarni ko‘tarishda me’yorga rioya qiladi; yong‘in xavfsizligi va sanitariya qoidalarini bajaradi;"], ["li", "o‘zi va boshqalar hayoti va sog‘lig‘iga xavf tug‘diruvchi ishni bajarmaydi."], ["p", "5.3. Xavfli holat yuzaga kelsa, Xodim ishni darhol to‘xtatadi va Ish beruvchini xabardor qiladi. Baxtsiz hodisa yuz bersa, jabrlanuvchiga zudlik bilan birinchi yordam ko‘rsatiladi, kerak bo‘lsa tez tibbiy yordam (103) chaqiriladi, voqea yozma qayd etiladi."], ["h", "6. JAVOBGARLIK"], ["p", "6.1. Xodim shartnoma va ichki tartib talablarini buzsa, uning javobgarligi va ish haqidan ushlanmalar O‘zbekiston Respublikasi Mehnat kodeksi asosida belgilanadi."], ["p", "6.2. Intizomiy jazo qo‘llashdan oldin Xodimdan yozma tushuntirish olinadi; jazo qonunda belgilangan muddat va tartibga rioya qilingan holda qo‘llanadi."], ["p", "6.3. Xodim o‘z aybi bilan Ish beruvchi mol-mulkiga yetkazgan haqiqiy zarar uchun Mehnat kodeksida belgilangan tartib va chegaralarda moddiy javobgar bo‘ladi. Zarar miqdori va aybi yozma aniqlanadi."], ["p", "6.4. Ish beruvchi mehnat sharoitlari, ish haqi yoki xavfsizlik talablarini buzsa, Mehnat kodeksiga muvofiq javobgar bo‘ladi."], ["h", "7. SHARTNOMANI O‘ZGARTIRISH VA BEKOR QILISH"], ["p", "7.1. Shartnomaga o‘zgartirish va qo‘shimchalar faqat yozma shaklda, Tomonlar kelishuvi bilan kiritiladi."], ["p", "7.2. Shartnoma Mehnat kodeksida nazarda tutilgan asoslarda va tartibda, belgilangan muddatda ogohlantirish bilan bekor qilinadi. Bekor qilinganda Xodimga ishlangan davr uchun haq to‘liq to‘lanadi."], ["h", "8. YAKUNIY QOIDALAR"], ["p", "8.1. Mehnat nizolari Mehnat kodeksida belgilangan tartibda hal etiladi."], ["p", "8.2. Shartnoma Tomonlar imzolagan kundan kuchga kiradi, bir xil yuridik kuchga ega 2 (ikki) nusxada tuzildi, har bir Tomonda bittadan saqlanadi."], ["p", "8.3. Rekvizitlarda ko‘rsatilgan telefon raqamlari orqali messenjerlarda (Telegram va boshqalar) yuborilgan xabarlar yozma xabarnoma hisoblanadi."], ["h", "9. TOMONLARNING REKVIZITLARI VA IMZOLARI"]];
export const UZM=["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentyabr","oktyabr","noyabr","dekabr"];
export const blank=(v,n)=>(v&&String(v).trim())||"_".repeat(n);
export const uzDate=d=>d?`${d.slice(0,4)}-yil “${+d.slice(8,10)}” ${UZM[+d.slice(5,7)-1]}`:"";
export function contractBlocks(c){
  const o=c.objectId?byId(S.objects,c.objectId):null;
  const addr=(c.objAddr||(o&&o.address)||"").trim()||(o?o.name.replace(/-?\s*дом/i,"-uy"):"");
  const open=c.termType!=="fixed";
  const B=[];
  B.push({t:"title",x:`MEHNAT SHARTNOMASI № ${blank(c.no,4)}`});
  B.push({t:"dl",l:"Toshkent shahri",r:uzDate(c.date)||"2026-yil “___” ______________"});
  B.push({t:"p",first:1,r:[["Bir tomondan, keyingi o‘rinlarda "],["“Ish beruvchi”",1],[" deb yuritiluvchi “TRIUMF ENGENEERING” MChJ nomidan ustav asosida ish yurituvchi direktor Yo‘ldoshev A.X. va ikkinchi tomondan, keyingi o‘rinlarda "],["“Xodim”",1],[` deb yuritiluvchi fuqaro ${blank(c.fio,29)}, pasport/ID karta: ${blank(c.passport,12)}, berilgan sana: ${c.passDate?fd(c.passDate):"____________"}, kim tomonidan berilgan: ${blank(c.passBy,16)}, JShShIR: ${blank(c.pinfl,16)}, birgalikda `],["“Tomonlar”",1],[" deb yuritiluvchilar, O‘zbekiston Respublikasi Mehnat kodeksiga muvofiq mazkur shartnomani quyidagilar haqida tuzdik:"]]});
  B.push({t:"h",x:"1. SHARTNOMA PREDMETI"});
  B.push({t:"p",x:`1.1. Xodim Ish beruvchining topshirig‘iga binoan umumiy qurilish-ta’mirlash va yordamchi ishlarni bajarish mehnat vazifasini (lavozimi/kasbi: ${blank(c.position,14)}) o‘z zimmasiga oladi, Ish beruvchi esa Xodimga ish haqi to‘laydi va xavfsiz mehnat sharoitini ta’minlaydi.`});
  B.push({t:"p",x:`1.2. Obyekt manzili: ${blank(addr,40)}`});
  B.push({t:"p",x:`Ish joyi (bino, blok, qavat, xonalar): ${blank(c.place,30)}`});
  const fr=!open&&c.from?uzDate(c.from):"2026-yil “___” __________",to=!open&&c.to?uzDate(c.to):"“___” __________";
  B.push({t:"p",x:`1.3. Shartnoma muddati:  ${open?"☒":"☐"} nomuayyan muddatga   ${open?"☐":"☒"} muddatli (${fr} dan ${to} gacha).`});
  B.push({t:"p",x:`1.4. Ishga kirishish sanasi: ${uzDate(c.hireDate)||"2026-yil “___” ______________"}.`});
  CT_STATIC.forEach((b,i)=>{
    let x=b[1];if(i===1&&(c.payNote||"").trim())x+=` Kelishuv: ${c.payNote.trim().replace(/\.+$/,"")}.`;
    B.push({t:b[0]==="h"?"h":b[0]==="li"?"li":"p",x});
  });
  B.push({t:"req",
    L:["ISH BERUVCHI:","Nomi: “TRIUMF ENGENEERING” MChJ","Manzil: Toshkent sh., Sergeli tumani, Daryo bo‘yi MFY, Nilufar 3-tor ko‘chasi, 1-uy, 8-xonadon","STIR: 311 443 186","H/r: 2020 8000 9070 9976 2001","Bank: “Aloqabank” AT, Sergeli KXKM","MFO: 00401","Telefon: +998 91 213 23 88","","Direktor:","__________ Yo‘ldoshev A.X.","(imzo)            (F.I.Sh.)"],
    R:["XODIM:",`F.I.Sh.: ${c.fio||""}`,`Manzil: ${c.address||""}`,`Pasport/ID: ${c.passport||""}`,`JShShIR: ${c.pinfl||""}`,`Bank kartasi / H/r: ${c.card||""}`,`Bank: ${c.bank||""}`,`Telefon: ${c.phone||""}`,"","Xodim:",`__________ ${c.fio||""}`,"(imzo)            (F.I.Sh.)"]});
  return B;
}
export function contractHtml(c){
  return contractBlocks(c).map(b=>{
    if(b.t==="title")return `<p class="ct-title">${esc(b.x)}</p>`;
    if(b.t==="dl")return `<p class="ct-dl"><b>${esc(b.l)}</b><b>${esc(b.r)}</b></p>`;
    if(b.t==="h")return `<p class="ct-h">${esc(b.x)}</p>`;
    if(b.t==="li")return `<p class="ct-li">– ${esc(b.x)}</p>`;
    if(b.t==="req")return `<table class="ct-req"><tr><td>${b.L.map((l,i)=>i===0?`<b>${esc(l)}</b>`:esc(l)||"&nbsp;").join("<br>")}</td><td>${b.R.map((l,i)=>i===0?`<b>${esc(l)}</b>`:esc(l)||"&nbsp;").join("<br>")}</td></tr></table>`;
    if(b.r)return `<p class="ct-p first">${b.r.map(r=>r[1]?`<b>${esc(r[0])}</b>`:esc(r[0])).join("")}</p>`;
    return `<p class="ct-p">${esc(b.x)}</p>`;
  }).join("");
}
export const xe=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export const wr=(t,b)=>`<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${b?"<w:b/><w:bCs/>":""}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
export const wp=(runs,o={})=>`<w:p><w:pPr>${o.keep?"<w:keepNext/>":""}${o.tab?'<w:tabs><w:tab w:val="right" w:pos="9637"/></w:tabs>':""}<w:spacing w:before="${o.before||0}" w:after="${o.after==null?120:o.after}" w:line="264" w:lineRule="auto"/>${o.first?'<w:ind w:firstLine="567"/>':o.li?'<w:ind w:left="567" w:hanging="283"/>':""}<w:jc w:val="${o.jc||"both"}"/></w:pPr>${runs}</w:p>`;
export function contractDocx(c){
  let body="";
  contractBlocks(c).forEach(b=>{
    if(b.t==="title")body+=wp(wr(b.x,1).replace('w:val="24"','w:val="28"').replace('w:val="24"','w:val="28"'),{jc:"center",after:240});
    else if(b.t==="dl")body+=wp(wr(b.l,1)+'<w:r><w:tab/></w:r>'+wr(b.r,1),{tab:1,jc:"left"});
    else if(b.t==="h")body+=wp(wr(b.x,1),{jc:"left",before:120,keep:1});
    else if(b.t==="li")body+=wp(wr("– "+b.x),{li:1,after:60});
    else if(b.t==="req"){
      const cell=L=>`<w:tc><w:tcPr><w:tcW w:w="4700" w:type="dxa"/></w:tcPr>${L.map((l,i)=>wp(wr(l,i===0),{jc:"left",after:20})).join("")}</w:tc>`;
      body+=`<w:tbl><w:tblPr><w:tblW w:w="9400" w:type="dxa"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join("")}</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="4700"/><w:gridCol w:w="4700"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(b.L)}${cell(b.R)}</w:tr></w:tbl>`+wp("",{after:0});
    }else if(b.r)body+=wp(b.r.map(r=>wr(r[0],r[1])).join(""),{first:1});
    else body+=wp(wr(b.x),{});
  });
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  return {
    "[Content_Types].xml":'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "_rels/.rels":'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/document.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`};
}
export async function loadJSZip(){const m=await import("jszip");return m.default||m}
export async function contractWord(c,msgEl){
  const say=t=>{if(msgEl)msgEl.textContent=t};
  try{
    const dl={save:async({filename,data})=>saveFile(filename,data)};
    say("Тайёрланмоқда…");
    const Z=await loadJSZip();const z=new Z();const f=contractDocx(c);
    for(const k in f)z.file(k,f[k]);
    const blob=await z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
    const nm=("Mehnat_shartnomasi_"+(c.no||"")+"_"+(c.fio||"")).replace(/[^\wЀ-ӿ\-]+/g,"_").replace(/_+/g,"_")+".docx";
    await dl.save({filename:nm,data:blob});say("Файл сақланди.");
  }catch(e){say(e&&e.code==="declined"?"Юклаш бекор қилинди.":"Файлни тайёрлаб бўлмади. Қайта уриниб кўринг.")}
}
export function contractView(id){
  const c=byId(S.contracts,id);if(!c)return;
  const L=layer(`<div class="sheet ctsheet" role="dialog"><div class="ct-bar noprint"><button class="btn" data-close>Ёпиш</button><button class="btn" data-print>Чоп этиш / PDF</button><button class="btn primary" data-word>Word (.docx) юклаш</button><span class="hint" data-msg role="status"></span></div><div class="ct-doc">${contractHtml(c)}</div></div>`);
  $("[data-print]",L.el).addEventListener("click",()=>{try{window.print()}catch(e){$("[data-msg]",L.el).textContent="Чоп этиш бу ойнада ишламади. Word файлидан фойдаланинг."}});
  $("[data-word]",L.el).addEventListener("click",()=>contractWord(c,$("[data-msg]",L.el)));
}
VIEWS.contracts=()=>{
  const q=(F.ctQ||"").trim().toLowerCase();
  let L=[...S.contracts].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(parseInt(b.no)||0)-(parseInt(a.no)||0));
  if(q)L=L.filter(c=>((c.fio||"")+" "+(c.position||"")+" "+(c.no||"")+" "+(c.passport||"")).toLowerCase().includes(q));
  const rows=L.map(c=>{const miss=!c.passport||!c.pinfl||!c.fio;
    return tr([esc(c.no),fd(c.date),`<div class="nm"><b>${esc(c.fio)}</b><span>${esc(c.phone||"")}</span></div>`,esc(c.position||"—"),c.objectId?esc(objName(c.objectId)):"—",c.termType==="fixed"?pill("Муддатли"+(c.to?" · "+fd(c.to):""),"info"):pill("Номуайян","ok"),miss?pill("маълумот етишмайди","warn"):"",
      rowActs("contracts",c.id,`<button class="btn sm" data-act="ct-view" data-id="${c.id}">Шартнома</button>`)])});
  return {eyebrow:"Ишчилар билан тузилган шартномалар",title:"Меҳнат шартномалари",actions:btn("+ Янги шартнома","new",'data-t="contracts"',"primary"),
  body:`<div class="filters"><div><label for="cq">Қидириш (Enter)</label><input id="cq" type="search" data-filter="ctQ" value="${esc(F.ctQ)}" placeholder="Ф.И.Ш., лавозим ёки рақам"></div></div>
  ${S.contracts.length?"":`<p class="hint" style="margin-bottom:10px">Ишчи маълумотларини киритинг: шартнома «TRIUMF ENGENEERING» МЧЖ шаблони бўйича тайёр бўлади. Уни чоп этиш ёки Word файли қилиб юклаб олиш мумкин.</p>`}
  ${table(["№","Сана","Ходим","Лавозим","Объект","Муддат","",""],rows)}`};
};

VIEWS.suppliers=()=>{
  const inP=d=>!F.supMonth||(d||"").startsWith(F.supMonth);
  const months=[...new Set([...S.moves.filter(m=>m.type==="in").map(m=>m.date),...S.cash.filter(isSupPay).map(c=>c.date)].filter(Boolean).map(d=>d.slice(0,7)))].sort().reverse();
  const sel0=F.supId&&byId(S.suppliers,F.supId);
  const filt=`<div class="filters">${sel("sm","supMonth",[["","Барча давр"],...months.map(m=>[m,monthLabel(m)])],F.supMonth,"Давр")}</div>`;
  if(sel0){
    const sp=sel0,st=supStat(sp,inP),all=supStat(sp);
    const ins=S.moves.filter(m=>m.type==="in"&&m.supplierId===sp.id&&inP(m.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const pays=S.cash.filter(c=>isSupPay(c)&&c.supplierId===sp.id&&inP(c.date)).sort((a,b)=>b.date.localeCompare(a.date));
    const irows=ins.slice(0,200).map(m=>{const mt=byId(S.materials,m.materialId)||{};
      return tr([fd(m.date),esc(mt.name||"—"),qn(m.qty)+" "+esc(mt.unit||""),m.objectId?esc(objName(m.objectId)):"—",m.price>0?money(m.price):`<input class="pin" type="number" min="0" step="any" inputmode="decimal" data-mprice="${m.id}" placeholder="нарх, сўм" aria-label="Бирлик нархи">`,m.price>0?money(m.qty*m.price):"—",`<div class="rowacts"><button class="btn sm ghost" data-act="edit" data-t="moves" data-id="${m.id}">Таҳрир</button></div>`],[2,4,5])});
    const prow=pays.map(c=>tr([fd(c.date),esc(c.note||""),"−"+money(c.amount),`<div class="rowacts"><button class="btn sm ghost danger" data-act="del" data-t="cash" data-id="${c.id}">Ўчириш</button></div>`],[2]));
    return {eyebrow:"Қарзга олинган материаллар ҳисоби",title:esc(sp.name),
    actions:btn("← Барчаси","all-suppliers")+btn("Тўлов қилиш","sup-pay",`data-id="${sp.id}"`,"primary"),
    body:`${filt}<div class="stats">${stat("Олинган материал",short(st.delivered),st.n+" та етказма")}${stat("Тўланган",short(st.paid),"сўм")}${stat("Қарз (давр бўйича)",(st.debt<0?"−":"")+short(Math.abs(st.debt)),"сўм",1)}${F.supMonth?stat("Жами қарз",(all.debt<0?"−":"")+short(Math.abs(all.debt)),"барча давр"):""}</div>
    ${st.noPrice?`<p class="hint" style="margin-bottom:10px">${st.noPrice} та етказмада нарх йўқ — улар қарзга қўшилмаган. Қатордаги майдонга бирлик нархини ёзиб Enter босинг.</p>`:""}
    <section class="block"><h2>Етказилган материаллар</h2>${table(["Сана","Материал","Миқдор","Дом","Нарх, сўм","Сумма, сўм",""],irows,[2,4,5])}${ins.length>200?`<p class="hint">Охирги 200 таси кўрсатилган.</p>`:""}</section>
    <section class="block"><h2>Тўловлар</h2>${table(["Сана","Изоҳ","Сумма, сўм",""],prow,[2])}</section>`};
  }
  const rows=S.suppliers.map(sp=>{const st=supStat(sp,inP),all=supStat(sp);
    return {k:all.debt,h:tr([`<div class="nm"><b>${esc(sp.name)}</b><span>${esc(sp.phone||"")}</span></div>`,st.n+(st.noPrice?" "+pill(st.noPrice+" нархсиз","warn"):""),money(st.delivered),money(st.paid),`<b>${money(all.debt)}</b>`,
      rowActs("suppliers",sp.id,`<button class="btn sm" data-act="sup-statement" data-id="${sp.id}">Варақ</button><button class="btn sm" data-act="sup-pay" data-id="${sp.id}">Тўлов</button>`)])}}).sort((a,b)=>b.k-a.k);
  const tot=sum(S.suppliers,x=>Math.max(0,supStat(x).debt)),del=sum(S.suppliers,x=>supStat(x,inP).delivered),pd=sum(S.suppliers,x=>supStat(x,inP).paid);
  return {eyebrow:"Мол етказиб берувчилар билан қарзга ишлаш",title:"Етказиб берувчилар",actions:btn("+ Етказиб берувчи","new",'data-t="suppliers"')+btn("+ Омборга кирим","move-in","","primary"),
  body:`${filt}<div class="stats">${stat("Жами қарзимиз",short(tot),"барча давр",1)}${stat("Олинган материал",short(del),F.supMonth?monthLabel(F.supMonth):"барча давр")}${stat("Тўланган",short(pd),F.supMonth?monthLabel(F.supMonth):"барча давр")}</div>
  ${S.suppliers.length?table(["Етказиб берувчи","Етказма","Олинган, сўм","Тўланган, сўм","Қарз, сўм (жами)",""],rows.map(r=>r.h),[2,3,4]):`<p class="hint">Етказиб берувчилар омборга кирим ёзилганда ёки Excel юкланганда автоматик пайдо бўлади. Қўлда ҳам қўшиш мумкин.</p>`}
  <p class="hint" style="margin-top:10px">Қарз = олинган материал суммаси − тўловлар. Нархи киритилмаган етказмалар қарзга қўшилмайди.</p>`};
};

