import { VIEWS } from "./views.js";
import { api } from "./sync.js";
import { render } from "./main.js";
import { layer, info, ask, pill, table, tr, btn } from "./ui.js";
import { esc, $ } from "./util.js";

export const ROLE_NAMES = { owner: "Эга (директор)", accountant: "Ҳисобчи", storekeeper: "Омборчи", foreman: "Прораб" };
let users = null;

async function load() {
  try { users = (await api("GET", "/api/users")).users; } catch (e) { users = []; }
  render();
}

function userForm(u) {
  const L = layer(`<form class="sheet" novalidate><h3>${u ? "Таҳрирлаш: " + esc(u.name) : "Янги фойдаланувчи"}</h3>
    <div class="fg">
      ${u ? "" : `<div class="full"><label for="u_login">Логин (лотин ҳарф ва рақам)</label><input id="u_login" autocomplete="off"></div>`}
      <div class="full"><label for="u_name">Исм</label><input id="u_name" value="${esc(u ? u.name : "")}"></div>
      <div class="full"><label for="u_role">Роль</label><select id="u_role">${Object.entries(ROLE_NAMES).map(([k, v]) => `<option value="${k}" ${u && u.role === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="full"><label for="u_pass">${u ? "Янги парол (ўзгартирмаслик учун бўш қолдиринг)" : "Парол (камида 8 белги)"}</label><input id="u_pass" type="password" autocomplete="new-password"></div>
    </div><p class="err" role="alert"></p>
    <div class="acts"><button type="button" class="btn" data-close>Бекор қилиш</button><button class="btn primary">Сақлаш</button></div></form>`);
  const form = $("form", L.el), err = $(".err", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (id) => { const el = $("#" + id, form); return el ? el.value.trim() : ""; };
    try {
      if (u) {
        const b = { name: v("u_name"), role: v("u_role") };
        if (v("u_pass")) b.password = v("u_pass");
        await api("PATCH", "/api/users/" + u.id, b);
      } else {
        await api("POST", "/api/users", { login: v("u_login"), name: v("u_name"), role: v("u_role"), password: v("u_pass") });
      }
      L.close(); load();
    } catch (ex) { err.textContent = ex.message; }
  });
  const f = form.querySelector("input,select"); if (f) f.focus();
}

export function passwordForm() {
  const L = layer(`<form class="sheet small" novalidate><h3>Паролни ўзгартириш</h3>
    <div class="fg"><div class="full"><label for="p_old">Жорий парол</label><input id="p_old" type="password" autocomplete="current-password"></div>
    <div class="full"><label for="p_new">Янги парол (камида 8 белги)</label><input id="p_new" type="password" autocomplete="new-password"></div></div>
    <p class="err" role="alert"></p><div class="acts"><button type="button" class="btn" data-close>Бекор қилиш</button><button class="btn primary">Сақлаш</button></div></form>`);
  const form = $("form", L.el);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await api("POST", "/api/me/password", { old: $("#p_old", form).value, next: $("#p_new", form).value }); L.close(); info("Парол ўзгартирилди."); }
    catch (ex) { $(".err", form).textContent = ex.message; }
  });
  $("#p_old", form).focus();
}

VIEWS.users = () => {
  if (users === null) load();
  const rows = (users || []).map((u) => tr([
    `<div class="nm"><b>${esc(u.name)}</b><span>${esc(u.login)}</span></div>`, esc(ROLE_NAMES[u.role] || u.role),
    u.active ? pill("Фаол", "ok") : pill("Ўчирилган", "warn"),
    `<div class="rowacts"><button class="btn sm ghost" data-uact="edit" data-id="${u.id}">Таҳрир</button><button class="btn sm ghost ${u.active ? "danger" : ""}" data-uact="toggle" data-id="${u.id}">${u.active ? "Ўчириш" : "Қайта фаоллаш"}</button></div>`]));
  return {
    eyebrow: "Тизимга кирадиган ходимлар", title: "Фойдаланувчилар", actions: btn("+ Фойдаланувчи", "user-new", "", "primary"),
    body: `${users === null ? `<p class="hint">Юкланмоқда…</p>` : table(["Ходим", "Роль", "Ҳолат", ""], rows)}`,
  };
};

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-uact]");
  if (b && users) {
    const u = users.find((x) => x.id === b.dataset.id);
    if (!u) return;
    if (b.dataset.uact === "edit") return userForm(u);
    const doIt = async () => { try { await api("PATCH", "/api/users/" + u.id, { active: !u.active }); load(); } catch (ex) { info(ex.message); } };
    if (u.active) ask(`«${u.name}» тизимга кира олмайдиган бўлади. Ўчирилсинми?`, doIt); else doIt();
  }
  if (e.target.closest('[data-act="user-new"]')) userForm(null);
});
