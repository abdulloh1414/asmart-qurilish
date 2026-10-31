import { F, S } from "./store.js";
import { $, byId, qn, sum, uid } from "./util.js";
import { supplierByName } from "./calc.js";
import { commit, setSync } from "./sync.js";
import { ask, info } from "./ui.js";
/*PARSE_START*/
export const _norm=s=>String(s==null?"":s).toLowerCase().replace(/\s+/g," ").trim();
export const _txt=v=>String(v==null?"":v).trim();
export const _num=v=>{const n=Number(_txt(v).replace(/\s/g,"").replace(",","."));return isFinite(n)?n:NaN};
export const _iso=v=>{
  if(v instanceof Date&&!isNaN(v)){const d=new Date(v.getTime()+12*36e5);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}
  const s=_txt(v);let m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:"";
};
export function _header(rows,test){for(let i=0;i<Math.min(rows.length,30);i++){const t=(rows[i]||[]).map(_norm);if(test(t))return i}return -1}
export function parseReceived(rows,sheetName){
  const h=_header(rows,t=>t.some(x=>x.indexOf("наимен")>=0)&&t.some(x=>x.indexOf("кол")===0)&&!t.some(x=>x.indexOf("рабочий")>=0||x.indexOf("получ")>=0));
  if(h<0)return null;
  const hd=rows[h].map(_norm);const find=f=>hd.findIndex(f);
  const cH=find(x=>x.indexOf("дом")===0||x==="уй");
  if(cH<0&&!/келган|приход|кирим/i.test(sheetName||""))return null;
  const cN=Math.max(0,find(x=>x.indexOf("наимен")>=0)),cU=find(x=>x.indexOf("ед")===0),cQ=find(x=>x.indexOf("кол")===0),
    cS=find(x=>x.indexOf("поставщик")>=0||x.indexOf("етказ")>=0),cD=find(x=>x.indexOf("дат")===0||x==="сана");
  const out=[];
  for(let i=h+1;i<rows.length;i++){const r=rows[i]||[];const name=_txt(r[cN]);const qty=_num(r[cQ]);
    if(!name||!isFinite(qty)||qty<=0)continue;
    let sup=cS>=0?_txt(r[cS]):"";if(/^[xх]+$/i.test(sup))sup="";
    out.push({name,unit:(cU>=0?_txt(r[cU]):"")||"шт",qty,supplier:sup,date:cD>=0?_iso(r[cD]):"",dom:cH>=0?_txt(r[cH]):""});
  }
  return out;
}
export function parseIssued(rows,sheetName){
  const h=_header(rows,t=>t.some(x=>x.indexOf("наимен")>=0)&&t.some(x=>x.indexOf("кол")===0)&&t.some(x=>x.indexOf("рабочий")>=0||x.indexOf("получ")>=0));
  if(h<0)return null;
  const title=rows.slice(0,h).map(r=>(r||[]).map(_txt).filter(Boolean).join(" ")).join(" ");
  const m=title.match(/бригадир\s+([^)]+)/i);const leader=m?m[1].trim():"";
  const hd=rows[h].map(_norm);const find=f=>hd.findIndex(f);
  const cN=Math.max(0,find(x=>x.indexOf("наимен")>=0)),cU=find(x=>x.indexOf("ед")===0),cQ=find(x=>x.indexOf("кол")===0),
    cD=find(x=>x.indexOf("дат")===0||x==="сана"),cR=find(x=>x.indexOf("рабочий")>=0||x.indexOf("получ")>=0);
  const items=[];
  for(let i=h+1;i<rows.length;i++){const r=rows[i]||[];const name=_txt(r[cN]);const qty=_num(r[cQ]);
    if(!name||!isFinite(qty)||qty<=0)continue;
    items.push({name,unit:(cU>=0?_txt(r[cU]):"")||"шт",qty,date:cD>=0?_iso(r[cD]):"",receiver:cR>=0?_txt(r[cR]):""});
  }
  return {sheet:sheetName||"",leader,items};
}
export function parsePlan(rows){
  const h=_header(rows,t=>t.some(x=>x==="ish turi"||x==="иш тури"||x==="вид работ")&&t.some(x=>x==="birlik"||x==="бирлик"||x.indexOf("ед")===0));
  if(h<0)return null;
  const hd=rows[h].map(_norm);const find=f=>hd.findIndex(f);
  const cN=find(x=>x==="ish turi"||x==="иш тури"||x==="вид работ"),cU=find(x=>x==="birlik"||x==="бирлик"||x.indexOf("ед")===0);
  let cT=find(x=>x==="hammasi"||x==="жами"||x==="всего"||x==="итого");if(cT<0)cT=hd.length-1;
  const out=[];
  for(let i=h+1;i<rows.length;i++){const r=rows[i]||[];const name=_txt(r[cN]);const qty=_num(r[cT]);
    if(!name||!isFinite(qty)||qty<=0||/jami|жами|итого|всего/i.test(name))continue;
    out.push({name,unit:(cU>=0?_txt(r[cU]):"")||"м²",qty});
  }
  return out;
}
/*PARSE_END*/
export function applyBatches(batches){
  const r={inn:0,out:0,newMat:0,newObj:0,newBr:0,dup:0,noDate:0};
  const supBefore=S.suppliers.length;
  const keyM=(n,u)=>n.toLowerCase()+"|"+u.toLowerCase();
  const mats={};S.materials.forEach(m=>mats[keyM(m.name,m.unit)]=m);
  const objs={};S.objects.forEach(o=>objs[o.name.toLowerCase()]=o);
  const brs={};S.brigades.forEach(b=>brs[b.name.toLowerCase()]=b);
  const seen=new Set(S.moves.map(m=>[m.type,m.date,m.materialId,m.qty,m.type==="in"?(m.supplier||""):(m.receiver||""),m.type==="in"?m.objectId:"",m.type==="out"?m.brigadeId:""].join("|")));
  const getMat=it=>{let m=mats[keyM(it.name,it.unit)];
    if(!m){m={id:uid(),name:it.name,unit:it.unit,min:0,price:0};S.materials.push(m);mats[keyM(it.name,it.unit)]=m;r.newMat++}return m};
  const fresh=[];
  batches.forEach(b=>{
    if(b.kind==="in"){
      b.items.forEach(it=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(it.date||"")){r.noDate++;return}const m=getMat(it);let oid="";
        if(it.dom){const nm=/^\d+$/.test(it.dom)?it.dom+"-дом":it.dom;let o=objs[nm.toLowerCase()];
          if(!o){o={id:uid(),name:nm,address:"",client:"",budget:0,start:"",end:"",status:"active"};S.objects.push(o);objs[nm.toLowerCase()]=o;r.newObj++}oid=o.id}
        if(seen.has(["in",it.date,m.id,it.qty,it.supplier,oid,""].join("|"))){r.dup++;return}
        const sp=supplierByName(S,it.supplier,true);
        fresh.push({id:uid(),type:"in",date:it.date,materialId:m.id,qty:it.qty,price:0,objectId:oid,brigadeId:"",receiver:"",supplier:it.supplier,supplierId:sp?sp.id:"",note:""});r.inn++});
    }else{
      const nm=(b.sheet||b.leader||"Бригада").trim();let br=brs[nm.toLowerCase()];
      if(!br){br={id:uid(),name:nm,leader:b.leader||"",phone:"",workId:"",rate:0,active:"yes"};S.brigades.push(br);brs[nm.toLowerCase()]=br;r.newBr++}
      b.items.forEach(it=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(it.date||"")){r.noDate++;return}const m=getMat(it);
        if(seen.has(["out",it.date,m.id,it.qty,it.receiver,"",br.id].join("|"))){r.dup++;return}
        fresh.push({id:uid(),type:"out",date:it.date,materialId:m.id,qty:it.qty,price:0,objectId:"",brigadeId:br.id,receiver:it.receiver,supplier:"",note:""});r.out++});
    }
  });
  fresh.forEach(m=>S.moves.push(m));
  r.newSup=S.suppliers.length-supBefore;
  return r;
}
export function applyPlan(items,objectId){
  const r={added:0,updated:0,newWork:0};
  items.forEach(it=>{
    let w=S.works.find(x=>x.name.toLowerCase()===it.name.toLowerCase());
    if(!w){w={id:uid(),name:it.name,unit:it.unit||"м²",rate:0};S.works.push(w);r.newWork++}
    const q=Math.round(it.qty*100)/100;const p=S.plan.find(x=>x.objectId===objectId&&x.workId===w.id);
    if(p){p.qty=q;r.updated++}else{S.plan.push({id:uid(),objectId,workId:w.id,qty:q,price:0});r.added++}
  });
  return r;
}
export async function loadXLSX(){const m=await import("xlsx");return m.default||m}
export const XL={mode:"stock"};
$("#xl").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  const prev=$("#sync span").textContent,prevCls=$("#sync").className;
  setSync("Файл ўқилмоқда…","busy");
  try{
    const X=await loadXLSX();const wb=X.read(await f.arrayBuffer(),{type:"array",cellDates:true});
    const sheetRows=n=>X.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null});
    if(XL.mode==="plan"){
      const o=byId(S.objects,F.planObj);let items=null,sheet="";
      for(const n of wb.SheetNames){const p=parsePlan(sheetRows(n));if(p&&p.length){items=p;sheet=n;break}}
      setSync(prev,prevCls.replace("sync","").trim());
      if(!items)return info("Файлда «Иш тури», «Бирлик», «Жами» устунлари бор жадвал топилмади.");
      const tot=sum(items,i=>i.qty);
      return ask(`«${sheet}» варағидан ${items.length} та иш тури топилди (жами ${qn(tot)} ҳажм). Улар «${o.name}» объектининг режасига ёзилсинми? Мавжуд иш турлари янгиланади.`,()=>{
        const r=applyPlan(items,o.id);commit();info(`Режа юкланди: ${r.added} та янги банд, ${r.updated} та янгиланди, ${r.newWork} та янги иш тури қўшилди.`)},"Юклаш");
    }
    const batches=[];
    for(const n of wb.SheetNames){const rows=sheetRows(n);
      const iss=parseIssued(rows,n);if(iss&&iss.items.length){batches.push({kind:"out",sheet:n,leader:iss.leader,items:iss.items});continue}
      const rec=parseReceived(rows,n);if(rec&&rec.length)batches.push({kind:"in",sheet:n,items:rec})}
    setSync(prev,prevCls.replace("sync","").trim());
    if(!batches.length)return info("Файлда келган ёки чиққан материаллар жадвали топилмади. Устунлар: «Наименование», «кол», «дата», «дом» (кирим) ёки «Рабочий получивший материал» (чиқим).");
    const nIn=sum(batches.filter(b=>b.kind==="in"),b=>b.items.length),nOut=sum(batches.filter(b=>b.kind==="out"),b=>b.items.length),nBr=batches.filter(b=>b.kind==="out").length;
    ask(`Топилди: ${nIn?nIn+" та кирим қатори; ":""}${nOut?nOut+" та чиқим қатори ("+nBr+" та бригада). ":""}Юклайми?${nOut>8000?" Файл катта, юклаш бир неча дақиқа олиши мумкин.":""}`,()=>{
      const r=applyBatches(batches);commit();location.hash="stock";
      info(`Юкланди: ${r.inn} та кирим, ${r.out} та чиқим, ${r.newMat} та янги материал, ${r.newBr} та янги бригада, ${r.newObj} та янги объект, ${r.newSup} та етказиб берувчи.${r.dup?` Такрорланган ${r.dup} та қатор ўтказиб юборилди.`:""}${r.noDate?` Санаси йўқ ${r.noDate} та қатор ўтказиб юборилди.`:""}`)},"Юклаш");
  }catch(err){setSync(prev,prevCls.replace("sync","").trim());info("Файлни ўқиб бўлмади. Файл шикастланган бўлиши мумкин. Қайта танланг.")}
});

