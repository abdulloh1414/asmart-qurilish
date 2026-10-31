import { $, esc } from "./util.js";
export const pill=(t,k)=>`<span class="pill ${k||""}">${t}</span>`;
export const tr=(cells,nc=[])=>`<tr>${cells.map((c,i)=>`<td class="${nc.includes(i)?"n":""}">${c}</td>`).join("")}</tr>`;
export const table=(heads,rows,nc=[],foot="")=>`<div class="tw"><table><thead><tr>${heads.map((h,i)=>`<th class="${nc.includes(i)?"n":""}">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")||`<tr><td colspan="${heads.length}" class="emp">Ҳали ёзув йўқ</td></tr>`}</tbody>${foot}</table></div>`;
export const rowActs=(t,id,extra="")=>`<div class="rowacts">${extra}<button class="btn sm ghost" data-act="edit" data-t="${t}" data-id="${id}">Таҳрир</button><button class="btn sm ghost danger" data-act="del" data-t="${t}" data-id="${id}">Ўчириш</button></div>`;
export const bar=(p,cls)=>`<div class="track"><div class="fill ${cls||""}" style="width:${Math.max(0,Math.min(100,p))}%"></div></div>`;
export const stat=(l,v,s,key)=>`<div class="stat ${key?"key":""}"><small>${l}</small><b>${v}</b>${s?`<em>${s}</em>`:""}</div>`;
export const btn=(label,act,extra="",cls="")=>`<button class="btn ${cls}" data-act="${act}" ${extra}>${label}</button>`;
export const sel=(id,key,opts,cur,lab)=>`<div><label for="${id}">${lab}</label><select id="${id}" data-filter="${key}">${opts.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(cur)?"selected":""}>${esc(o[1])}</option>`).join("")}</select></div>`;

export function layer(html){const d=document.createElement("div");d.className="ov";d.innerHTML=html;$("#layer").appendChild(d);
  const close=()=>{d.remove();document.removeEventListener("keydown",esk)};
  const esk=e=>{if(e.key==="Escape")close()};
  document.addEventListener("keydown",esk);
  d.addEventListener("mousedown",e=>{if(e.target===d)close()});
  d.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",close));
  return {el:d,close}}
export function ask(text,yes,yesLabel){const L=layer(`<div class="sheet small" role="dialog"><p>${esc(text)}</p><div class="acts"><button class="btn" data-close>Йўқ</button><button class="btn primary" data-yes>${yesLabel||"Ҳа"}</button></div></div>`);
  $("[data-yes]",L.el).addEventListener("click",()=>{L.close();yes()});$("[data-yes]",L.el).focus()}
export function info(text){const L=layer(`<div class="sheet small" role="dialog"><p>${esc(text)}</p><div class="acts"><button class="btn primary" data-close>Тушунарли</button></div></div>`);$("[data-close]",L.el).focus()}

export function fieldHtml(f,v){
  const val=v[f.k]==null?"":v[f.k];const id="f_"+f.k;
  let inp="";
  if(f.t==="select"){inp=`<select id="${id}" name="${f.k}">${f.o.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(val)?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`}
  else if(f.t==="number"){inp=`<input id="${id}" name="${f.k}" type="number" inputmode="decimal" step="${f.step||"any"}" ${f.min!=null?`min="${f.min}"`:""} ${f.max!=null?`max="${f.max}"`:""} value="${esc(val)}">`}
  else{inp=`<input id="${id}" name="${f.k}" type="${f.t==="date"?"date":"text"}" value="${esc(val)}" ${f.list?`list="dl_${f.k}" autocomplete="off"`:""}>${f.list?`<datalist id="dl_${f.k}">${f.list.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`:""}`}
  return `<div class="${f.full?"full":""}"><label for="${id}">${esc(f.l)}${f.req?" *":""}</label>${inp}${f.hint?`<p class="hint">${esc(f.hint)}</p>`:""}</div>`;
}
export function openForm({title,fields,values={},onSave,onChange}){
  const L=layer(`<form class="sheet" novalidate><h3>${esc(title)}</h3><div class="fg">${fields.map(f=>fieldHtml(f,values)).join("")}</div><p class="err" role="alert"></p><div class="acts"><button type="button" class="btn" data-close>Бекор қилиш</button><button class="btn primary">Сақлаш</button></div></form>`);
  const form=$("form",L.el),errEl=$(".err",form);
  const fail=m=>{errEl.textContent=m;return false};
  if(onChange)form.addEventListener("change",e=>onChange(form,e.target.name));
  form.addEventListener("submit",e=>{
    e.preventDefault();const v={};
    for(const f of fields){
      const el=form.querySelector(`[name="${f.k}"]`);const raw=el.value.trim();
      if(f.req&&raw==="")return fail(`«${f.l}» тўлдирилиши керак`);
      if(f.t==="number"){
        if(raw===""){v[f.k]=0;continue}
        const n=Number(raw);if(!isFinite(n))return fail(`«${f.l}»: рақам киритинг`);
        if(f.min!=null&&n<f.min)return fail(`«${f.l}»: камида ${f.min} бўлиши керак`);
        if(f.max!=null&&n>f.max)return fail(`«${f.l}»: кўпи билан ${f.max} бўлиши керак`);
        v[f.k]=n;
      }else v[f.k]=raw;
    }
    const res=onSave(v);if(res)return fail(res);L.close();
  });
  const first=form.querySelector("input,select");if(first)first.focus();
}


export function saveFile(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
