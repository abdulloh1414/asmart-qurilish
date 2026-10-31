import { S, setS, emptyState } from "./store.js";
import { KEYS, $ } from "./util.js";
import { render, showLogin } from "./main.js";
import { info } from "./ui.js";

export const clone = (o) => JSON.parse(JSON.stringify(o));
export const session = { user: null, perms: { read: [], write: [], views: [] } };

export function setSync(text, cls) {
  const el = $("#sync");
  if (!el) return;
  el.className = "sync " + (cls || "");
  el.querySelector("span").textContent = text;
}

export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-requested-with": "fetch" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* bo'sh javob */ }
  if (!res.ok) {
    if (res.status === 401 && url !== "/api/login") showLogin();
    const err = new Error((data && data.error) || "Сервер хатоси");
    err.status = res.status;
    throw err;
  }
  return data;
}

let saved = {}, rev = 0, ver = 0, saving = false, dirty = false, tm = null, pollTm = null;

function snapshot() {
  const m = {};
  for (const k of KEYS) {
    const g = new Map();
    for (const r of S[k]) g.set(r.id, JSON.stringify(r));
    m[k] = g;
  }
  return m;
}

function diff() {
  const next = snapshot();
  const upserts = {}, deletes = {};
  let n = 0;
  for (const k of KEYS) {
    const old = saved[k] || new Map();
    for (const [id, j] of next[k]) {
      if (old.get(id) !== j) (upserts[k] = upserts[k] || []).push(JSON.parse(j)), n++;
    }
    for (const id of old.keys()) if (!next[k].has(id)) (deletes[k] = deletes[k] || []).push(id), n++;
  }
  return { n, next, payload: { upserts, deletes } };
}

export function persist() {
  dirty = true;
  ver++;
  setSync("Сақланмоқда…", "busy");
  clearTimeout(tm);
  tm = setTimeout(flush, 400);
}

async function flush() {
  if (saving) { tm = setTimeout(flush, 300); return; }
  const v0 = ver;
  const d = diff();
  if (!d.n) { dirty = false; setSync("Сақланган"); return; }
  saving = true;
  try {
    const r = await api("POST", "/api/sync", d.payload);
    saved = d.next;
    if (ver === v0) dirty = false;
    const foreign = r.rev !== rev + 1;
    rev = r.rev;
    setSync(dirty ? "Сақланмоқда…" : "Сақланган", dirty ? "busy" : "");
    if (foreign && !dirty) { await loadState(); render(); }
  } catch (e) {
    if (e.status && e.status < 500 && e.status !== 401) {
      dirty = false;
      setSync("Сақланмади", "bad");
      await loadState().catch(() => {});
      render();
      info(e.message);
    } else if (e.status === 401) {
      setSync("Сеанс тугади", "bad");
    } else {
      setSync("Сақланмади. Қайта уринилмоқда…", "bad");
      tm = setTimeout(flush, 5000);
    }
  } finally {
    saving = false;
  }
}

export function commit() { persist(); render(); }

export async function loadState() {
  const r = await api("GET", "/api/state");
  const s = emptyState();
  for (const k of KEYS) if (Array.isArray(r.data[k])) s[k] = r.data[k];
  setS(s);
  saved = snapshot();
  rev = r.rev;
  dirty = false;
  setSync("Сақланган");
}

function busyUI() {
  const a = document.activeElement;
  return !!document.querySelector("#layer .ov") || (a && a.closest && a.closest("#view") && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
}

function startPolling() {
  clearInterval(pollTm);
  pollTm = setInterval(async () => {
    if (document.hidden || dirty || saving || busyUI() || !session.user) return;
    try {
      const r = await api("GET", "/api/rev");
      if (r.rev !== rev && !dirty && !saving && !busyUI()) { await loadState(); render(); }
    } catch (e) { /* keyingi urinishda */ }
  }, 15000);
}

export async function enter(me) {
  session.user = me.user;
  session.perms = me.perms;
  await loadState();
  startPolling();
}

export function leave() {
  session.user = null;
  clearInterval(pollTm);
  clearTimeout(tm);
  saved = {};
  setS(emptyState());
}
