import "./styles.css";
import { S } from "./store.js";
import { $, esc, daysTo } from "./util.js";
import { rebuildStock, stockOf, rest } from "./calc.js";
import { VIEWS } from "./views.js";
import { api, enter, leave, session, setSync } from "./sync.js";
import { passwordForm, ROLE_NAMES } from "./users.js";
import "./forms.js";
import "./importer.js";
import "./contracts.js";
import "./acts.js";
import "./history.js";

const NAV = [["dashboard", "Бошқарув панели"], ["objects", "Объектлар"], ["plan", "Иш режаси"], ["brigades", "Бригадалар"], ["logs", "Бажарилган ишлар"], ["payroll", "Иш ҳақи ҳисоби"], ["stock", "Омбор"], ["suppliers", "Етказиб берувчилар"], ["acts", "Заказчикка ҳисобот"], ["contracts", "Меҳнат шартномалари"], ["cash", "Касса"], ["debts", "Қарз дафтари"], ["reports", "Ҳисоботлар"], ["users", "Фойдаланувчилар"], ["history", "Ўзгаришлар тарихи"]];

// Тугма қайси жадвалга ёзишни талаб қилади
const NEEDS = { "move-in": "moves", "move-out": "moves", advance: "cash", wage: "cash", "sup-pay": "cash", "debt-pay": "debts", "import-xl": "moves", "import-plan": "plan", "seed-works": "works", "user-new": "__owner" };

export const route = () => {
  const h = location.hash.replace("#", "");
  const ok = session.perms.views;
  if (VIEWS[h] && ok.includes(h)) return h;
  return ok[0] || "dashboard";
};

function counts() {
  const lowN = S.materials.filter((m) => m.min > 0 && stockOf(m.id) <= m.min).length;
  const dueN = S.debts.filter((d) => d.kind === "owe" && rest(d) > 0 && d.due && daysTo(d.due) <= 7).length;
  return { stock: [lowN, "w"], debts: [dueN, ""] };
}

function stripForbidden(root) {
  const w = session.perms.write;
  root.querySelectorAll("[data-act]").forEach((b) => {
    const act = b.dataset.act;
    const ent = act === "new" || act === "edit" || act === "del" ? b.dataset.t : NEEDS[act];
    if (!ent) return;
    if (ent === "__owner" ? session.user.role !== "owner" : !w.includes(ent)) b.remove();
  });
  root.querySelectorAll(".rowacts:empty").forEach((x) => x.remove());
}

export function render() {
  if (!session.user) return;
  rebuildStock();
  const r = route(), v = VIEWS[r](), c = counts();
  const allowed = session.perms.views;
  $("#nav").innerHTML = NAV.filter((n) => allowed.includes(n[0])).map((n) => `<a href="#${n[0]}" class="${n[0] === r ? "on" : ""}" ${n[0] === r ? 'aria-current="page"' : ""}>${n[1]}${c[n[0]] && c[n[0]][0] ? `<span class="cnt ${c[n[0]][1]}">${c[n[0]][0]}</span>` : ""}</a>`).join("");
  $("#head").innerHTML = `<div><p class="eyebrow">${v.eyebrow}</p><h1>${v.title}</h1></div><div class="actions">${v.actions}</div>`;
  $("#view").innerHTML = v.body;
  stripForbidden($("#head"));
  stripForbidden($("#view"));
  $("#who").innerHTML = `<b>${esc(session.user.name)}</b><span>${esc(ROLE_NAMES[session.user.role] || "")}</span><div><button class="btn sm ghost" data-me="pass">Парол</button><button class="btn sm ghost" data-me="out">Чиқиш</button></div>`;
}

export function showLogin() {
  leave();
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#lg-pass").value = "";
  setTimeout(() => $("#lg-login").focus(), 0);
}

async function showApp(me) {
  $("#login").hidden = true;
  $("#app").hidden = false;
  setSync("Юкланмоқда…", "busy");
  await enter(me);
  render();
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#lg-err");
  err.textContent = "";
  try {
    const me = await api("POST", "/api/login", { login: $("#lg-login").value, password: $("#lg-pass").value });
    await showApp(me);
  } catch (ex) { err.textContent = ex.message; }
});

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-me]");
  if (!b) return;
  if (b.dataset.me === "pass") passwordForm();
  else { try { await api("POST", "/api/logout"); } catch (x) { /* chiqib ketamiz */ } showLogin(); }
});

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

(async () => {
  try { await showApp(await api("GET", "/api/me")); }
  catch (e) { if (!session.user) showLogin(); }
})();
