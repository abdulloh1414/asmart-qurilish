import { VIEWS } from "./views.js";
import { api } from "./sync.js";
import { render } from "./main.js";
import { table, tr } from "./ui.js";
import { esc } from "./util.js";

const ENT = { clients: "Мижозлар", objects: "Объектлар", works: "Иш турлари", brigades: "Бригадалар", plan: "Иш режаси", logs: "Бажарилган ишлар", materials: "Материаллар", suppliers: "Етказиб берувчилар", moves: "Омбор ҳаракати", cash: "Касса", debts: "Қарз дафтари", contracts: "Шартномалар" };
let rows = null;

async function load() {
  try { rows = (await api("GET", "/api/audit")).rows; } catch (e) { rows = []; }
  render();
}

const when = (t) => { const d = new Date(t); const p = (n) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

VIEWS.history = () => {
  if (rows === null) load();
  const body = (rows || []).map((r) => tr([when(r.at), esc(r.user_name || "—"), esc(ENT[r.entity] || r.entity),
    r.upserts ? `+${r.upserts}` : "—", r.deletes ? `−${r.deletes}` : "—"]));
  return {
    eyebrow: "Охирги 300 та сақлаш", title: "Ўзгаришлар тарихи", actions: "",
    body: rows === null ? `<p class="hint">Юкланмоқда…</p>` : table(["Вақт", "Ходим", "Бўлим", "Қўшилди/ўзгарди", "Ўчирилди"], body, [3, 4]),
  };
};
