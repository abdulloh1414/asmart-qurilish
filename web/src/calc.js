import { S } from "./store.js";
import { byId, sum, uid } from "./util.js";
export const rest=d=>Math.max(0,d.amount-d.paid);
export let STK={in:{},out:{}};
export function rebuildStock(){STK={in:{},out:{}};S.moves.forEach(m=>{const t=STK[m.type==="in"?"in":"out"];t[m.materialId]=(t[m.materialId]||0)+m.qty})}
export const stockIn=id=>STK.in[id]||0;
export const stockOut=id=>STK.out[id]||0;
export const stockOf=id=>stockIn(id)-stockOut(id);
export const objName=id=>{const o=byId(S.objects,id);return o?o.name:"—"};
export const brName=id=>{const b=byId(S.brigades,id);return b?b.name:"—"};
export const workName=id=>{const w=byId(S.works,id);return w?w.name:"—"};
export const unitOf=id=>{const w=byId(S.works,id);return w?w.unit:""};
export const isBrPay=c=>c.type==="out"&&(c.cat==="advance"||c.cat==="wage");
export const isSupPay=c=>c.type==="out"&&c.cat==="supplier";
export const supName=id=>{const x=byId(S.suppliers,id);return x?x.name:"—"};
export function supplierByName(st,name,create){const n=(name||"").trim();if(!n)return null;const k=n.toLowerCase();let x=st.suppliers.find(y=>y.name.toLowerCase()===k);
  if(!x&&create){x={id:uid(),name:n,phone:"",note:""};st.suppliers.push(x)}return x||null}
export function migrate(st){let ch=false;st.moves.forEach(m=>{if(m.type==="in"&&!m.supplierId&&m.supplier){const x=supplierByName(st,m.supplier,true);if(x){m.supplierId=x.id;ch=true}}});return ch}
export function supStat(sp,inP){inP=inP||(()=>true);
  const ins=S.moves.filter(m=>m.type==="in"&&m.supplierId===sp.id&&inP(m.date));
  const delivered=sum(ins,m=>m.qty*m.price),paid=sum(S.cash.filter(c=>isSupPay(c)&&c.supplierId===sp.id&&inP(c.date)),c=>c.amount);
  return {n:ins.length,noPrice:ins.filter(m=>!(m.price>0)).length,delivered,paid,debt:delivered-paid}}
export const planQty=(o,w)=>sum(S.plan.filter(p=>p.objectId===o&&p.workId===w),p=>p.qty);
export const doneQty=(o,w)=>sum(S.logs.filter(l=>l.objectId===o&&l.workId===w),l=>l.qty);
export function breakdown(oid){
  const mat=sum(S.cash.filter(c=>c.type==="out"&&c.objectId===oid&&c.cat==="material"),c=>c.amount)+sum(S.moves.filter(m=>m.type==="out"&&m.objectId===oid),m=>m.qty*m.price);
  const labour=sum(S.logs.filter(l=>l.objectId===oid),l=>l.qty*l.rate);
  const other=sum(S.cash.filter(c=>c.type==="out"&&c.objectId===oid&&c.cat!=="material"&&!isBrPay(c)&&!isSupPay(c)),c=>c.amount);
  const income=sum(S.cash.filter(c=>c.type==="in"&&c.objectId===oid),c=>c.amount);
  return {mat,labour,other,cost:mat+labour+other,income};
}
export function objProgress(oid){
  const L=S.plan.filter(p=>p.objectId===oid&&p.qty>0);if(!L.length)return null;
  const valued=L.every(p=>p.price>0);let num=0,den=0;
  L.forEach(p=>{const w=valued?p.qty*p.price:1;den+=w;num+=w*Math.min(1,doneQty(oid,p.workId)/planQty(oid,p.workId))});
  return den?num/den*100:0;
}
export function brStat(b,inP){
  inP=inP||(()=>true);
  const earned=sum(S.logs.filter(l=>l.brigadeId===b.id&&inP(l.date)),l=>l.qty*l.rate);
  const adv=sum(S.cash.filter(c=>c.type==="out"&&c.cat==="advance"&&c.brigadeId===b.id&&inP(c.date)),c=>c.amount);
  const paid=sum(S.cash.filter(c=>c.type==="out"&&c.cat==="wage"&&c.brigadeId===b.id&&inP(c.date)),c=>c.amount);
  const qty=sum(S.logs.filter(l=>l.brigadeId===b.id&&inP(l.date)),l=>l.qty);
  return {earned,adv,paid,qty,net:earned-adv-paid};
}
export function rateFor(bid,wid,given){
  if(given>0)return given;
  const b=byId(S.brigades,bid);if(b&&b.workId===wid&&b.rate>0)return b.rate;
  const w=byId(S.works,wid);return w?w.rate:0;
}

