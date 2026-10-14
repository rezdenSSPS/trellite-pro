/* ============================================================
   Trellite Pro — Trello-style aplikace (česky).
   Ukládá do databáze přes /api/state; offline záloha v localStorage.
   ============================================================ */

const STORE_KEY = "trellite.pro.v2";

const LABEL_COLORS = [
  "#5a9e6f", "#cf9a46", "#cf8a4e", "#c15f5b", "#8d6fae", "#4c6793",
  "#4f9aa3", "#6fa58d", "#b07f99", "#5b6b8c", "#8a93a1", "#3f5e79",
];
const AVATAR_COLORS = ["#4c6793", "#c15f5b", "#5a9e6f", "#cf9a46", "#8d6fae", "#cf8a4e", "#4f9aa3", "#b07f99"];

const BOARD_BGS = [
  { type: "color", value: "#3d4f6d" },
  { type: "color", value: "#44607a" },
  { type: "color", value: "#3f5e54" },
  { type: "color", value: "#6d5a4a" },
  { type: "color", value: "#5a4e6d" },
  { type: "color", value: "#6d4a52" },
  { type: "color", value: "#2f3b47" },
  { type: "color", value: "#4a5a6a" },
  { type: "gradient", value: "linear-gradient(135deg,#334155,#475569)" },
  { type: "gradient", value: "linear-gradient(135deg,#3d4f6d,#56688c)" },
  { type: "gradient", value: "linear-gradient(135deg,#3f5e54,#5a7d6f)" },
  { type: "gradient", value: "linear-gradient(135deg,#4a4e69,#6b6f8c)" },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
const el = (id) => document.getElementById(id);
const escapeHtml = (s) => (s || "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Stav ---------- */
let state = null;
let currentBoardId = null;
let activeRef = null;
let filter = { labels: [], members: [], due: null };
let dragListId = null;

/* ============================================================
   PERSISTENCE (databáze + localStorage záloha)
   ============================================================ */
let saveTimer = null;
function setSync(cls, title) {
  const d = el("syncDot"); if (!d) return;
  d.className = "sync-dot " + cls; d.title = title;
}
function migrate(s) { s.members = s.members || []; s.theme = s.theme || "light"; return s; }

async function initialLoad() {
  // 1) zkus server
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setSync("online", "Připojeno k databázi");
      if (j && j.data) return migrate(j.data);
      // server prázdný → vytvoř ukázku a nahraj
      const s = seed(); pushState(s); return s;
    }
  } catch (e) { /* offline / otevřeno jako soubor */ }
  setSync("offline", "Offline režim (localStorage)");
  // 2) localStorage
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  // 3) ukázka
  return seed();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  scheduleServerSave();
  return true;
}
function scheduleServerSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => pushState(state), 500);
}
async function pushState(data) {
  setSync("saving", "Ukládání…");
  try {
    const r = await fetch("/api/state", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    setSync(r.ok ? "online" : "offline", r.ok ? "Uloženo do databáze" : "Nelze uložit na server");
  } catch (e) { setSync("offline", "Offline – uloženo jen lokálně"); }
}

/* ============================================================
   UKÁZKOVÁ DATA
   ============================================================ */
function seed() {
  const days = (n) => Date.now() + n * 864e5;
  const me = { id: uid(), name: "Vy", color: AVATAR_COLORS[0] };
  const petra = { id: uid(), name: "Petra Nováková", color: AVATAR_COLORS[1] };
  const jan = { id: uid(), name: "Jan Svoboda", color: AVATAR_COLORS[2] };
  const eva = { id: uid(), name: "Eva Dvořáková", color: AVATAR_COLORS[4] };
  const tomas = { id: uid(), name: "Tomáš Procházka", color: AVATAR_COLORS[5] };
  const members = [me, petra, jan, eva, tomas];

  const LBL = [["Design", "#8d6fae"], ["Chyba", "#c15f5b"], ["Urgentní", "#cf8a4e"],
    ["Funkce", "#4c6793"], ["Průzkum", "#4f9aa3"], ["Hotovo", "#5a9e6f"]];
  function labelSet() {
    const arr = LBL.map(([name, color]) => ({ id: uid(), name, color }));
    const by = {}; LBL.forEach(([n], i) => by[n] = arr[i].id);
    return { arr, by };
  }
  const cl = (title, items) => ({ id: uid(), title, items: items.map(([t, d]) => ({ id: uid(), text: t, done: !!d })) });
  const cm = (mid, text, agoH) => ({ id: uid(), memberId: mid, text, ts: Date.now() - agoH * 3600e3 });
  const card = (title, o = {}) => ({
    id: uid(), title, desc: o.desc || "", archived: false,
    labelIds: o.labels || [], memberIds: o.members || [],
    due: o.due || null, start: o.start || null, cover: o.cover || null,
    checklists: o.checklists || [], attachments: o.attachments || [],
    comments: o.comments || [], createdAt: Date.now() - (o.age || 0),
  });
  const list = (title, cards, extra = {}) => Object.assign({ id: uid(), title, archived: false, cards }, extra);
  const board = (title, bg, memberIds, lists, starred = false) =>
    ({ id: uid(), title, bg, starred, archived: false, memberIds, labels: null, activity: [], lists });

  const boards = [];

  // --- 1) Produktový plán ---
  {
    const L = labelSet();
    const b = board("Produktový plán", BOARD_BGS[0], [me.id, petra.id, jan.id, eva.id], [
      list("Zásobník", [
        card("Analýza konkurence a cen", { labels: [L.by["Průzkum"]], members: [petra.id], desc: "Porovnat 5 hlavních konkurentů podle cenových úrovní." }),
        card("Shrnutí uživatelských rozhovorů", { labels: [L.by["Průzkum"]], members: [eva.id],
          checklists: [cl("Rozhovory", [["Zápisky P1", true], ["Zápisky P2", true], ["Afinitní mapa", false]])] }),
        card("Definovat cíle (OKR) na Q3", { labels: [L.by["Funkce"]], due: { date: days(10), done: false } }),
      ]),
      list("Design", [
        card("Redesign onboardingu", { labels: [L.by["Design"], L.by["Urgentní"]], members: [me.id, jan.id],
          due: { date: days(2), done: false }, cover: { type: "color", value: "#8d6fae" },
          desc: "Nový tříkrokový onboarding pro nové uživatele.",
          checklists: [cl("Úkoly", [["Drátěné modely", true], ["Hi-fi návrhy", false], ["Předání vývoji", false]])] }),
        card("Audit design systému", { labels: [L.by["Design"]], members: [jan.id] }),
      ]),
      list("Probíhá", [
        card("Vytvořit stránku nastavení", { labels: [L.by["Funkce"]], members: [petra.id],
          comments: [cm(petra.id, "Dnes jsem začala s rozložením.", 4)],
          checklists: [cl("Úkoly", [["Záložka Profil", true], ["Záložka Platby", false]])] }),
        card("Opravit chybu přesměrování při přihlášení", { labels: [L.by["Chyba"], L.by["Urgentní"]], members: [me.id],
          due: { date: days(-1), done: false } }),
      ]),
      list("Kontrola", [
        card("PR #142: Vyhledávací API", { labels: [L.by["Funkce"]], members: [petra.id, jan.id] }),
      ]),
      list("Hotovo", [
        card("Nastavit CI pipeline", { labels: [L.by["Hotovo"]], due: { date: days(-3), done: true } }),
        card("Podpora tmavého režimu", { labels: [L.by["Hotovo"], L.by["Funkce"]], due: { date: days(-6), done: true } }),
      ]),
    ], true);
    b.labels = L.arr; boards.push(b);
  }

  // --- 2) Marketingová kampaň ---
  {
    const L = labelSet();
    const b = board("Marketingová kampaň", BOARD_BGS[8], [me.id, eva.id, tomas.id], [
      list("Nápady", [
        card("Teaser video k uvedení", { labels: [L.by["Funkce"]], members: [tomas.id] }),
        card("Seznam influencerů", { labels: [L.by["Průzkum"]], members: [eva.id],
          checklists: [cl("Oslovení", [["Sestavit seznam", true], ["Rozeslat zprávy", false]])] }),
      ]),
      list("Plánování", [
        card("E-mailová série", { labels: [L.by["Funkce"]], members: [eva.id], due: { date: days(5), done: false },
          desc: "Pětidílná automatizovaná série e-mailů." }),
        card("Schválení rozpočtu", { labels: [L.by["Urgentní"]], due: { date: days(1), done: false } }),
      ]),
      list("Probíhá", [
        card("Texty pro landing page", { labels: [L.by["Design"]], members: [tomas.id], cover: { type: "color", value: "#4c6793" } }),
      ]),
      list("Zveřejněno", [
        card("Kalendář příspěvků na sítě", { labels: [L.by["Hotovo"]], due: { date: days(-2), done: true } }),
      ]),
    ], true);
    b.labels = L.arr; boards.push(b);
  }

  // --- 3) Osobní úkoly ---
  {
    const L = labelSet();
    const b = board("Osobní úkoly", BOARD_BGS[2], [me.id], [
      list("Dnes", [
        card("Odpovědět na e-maily", {}),
        card("Trénink v posilovně", {}),
        card("Zavolat zubaři", { labels: [L.by["Urgentní"]], due: { date: days(0), done: false } }),
      ]),
      list("Tento týden", [
        card("Nákup potravin", { checklists: [cl("Seznam", [["Mléko", false], ["Vejce", false], ["Káva", true]])] }),
        card("Dočíst kapitolu knihy", {}),
      ]),
      list("Někdy", [
        card("Naučit se hrát na kytaru", {}),
        card("Naplánovat víkendový výlet", {}),
      ]),
      list("Hotovo", [
        card("Zaplatit nájem", { labels: [L.by["Hotovo"]], due: { date: days(-4), done: true } }),
      ]),
    ]);
    b.labels = L.arr; boards.push(b);
  }

  // --- 4) Redesign webu ---
  {
    const L = labelSet();
    const b = board("Redesign webu", BOARD_BGS[4], [me.id, jan.id, tomas.id], [
      list("Zásobník", [
        card("Audit současného webu", { labels: [L.by["Průzkum"]], members: [jan.id] }),
        card("Shromáždit značkové podklady", { labels: [L.by["Design"]], members: [tomas.id],
          checklists: [cl("Podklady", [["Logo SVG", true], ["Barevné tokeny", true], ["Fonty", false]])] }),
      ]),
      list("K udělání", [
        card("Drátěný model homepage", { labels: [L.by["Design"]], members: [jan.id], due: { date: days(3), done: false } }),
        card("SEO analýza klíčových slov", { labels: [L.by["Průzkum"]], members: [tomas.id] }),
      ]),
      list("Probíhá", [
        card("Sestavit knihovnu komponent", { labels: [L.by["Funkce"]], members: [me.id],
          cover: { type: "color", value: "#3f5e54" }, comments: [cm(me.id, "Tlačítka a vstupy hotové.", 8)] }),
      ]),
      list("Hotovo", [
        card("Zahájení projektu", { labels: [L.by["Hotovo"]], due: { date: days(-10), done: true } }),
      ]),
    ]);
    b.labels = L.arr; boards.push(b);
  }

  // --- 5) Cesta do Japonska ---
  {
    const L = labelSet();
    const b = board("Cesta do Japonska", BOARD_BGS[9], [me.id, eva.id], [
      list("Průzkum", [
        card("Nejlepší období na návštěvu", { labels: [L.by["Průzkum"]] }),
        card("Itinerář: Tokio + Kjóto", { members: [eva.id],
          checklists: [cl("Dny", [["Den 1 – Tokio", true], ["Den 2 – Kjóto", false], ["Den 3 – Ósaka", false]])] }),
      ]),
      list("Rezervováno", [
        card("Letenky", { labels: [L.by["Hotovo"]], due: { date: days(-1), done: true } }),
        card("Hotely", { labels: [L.by["Urgentní"]], due: { date: days(2), done: false } }),
      ]),
      list("Zabalit", [
        card("Pas a doklady", { checklists: [cl("Doklady", [["Pas", true], ["Vízum", false], ["Pojištění", false]])] }),
        card("Oblečení", {}),
      ]),
      list("Hotovo", [
        card("Koupit cestovní adaptér", { labels: [L.by["Hotovo"]], due: { date: days(-5), done: true } }),
      ]),
    ]);
    b.labels = L.arr; boards.push(b);
  }

  return { version: 2, theme: "light", activeMemberId: me.id, members, boards };
}

/* ---------- Pomocníci pro členy ---------- */
const getMember = (id) => state.members.find((m) => m.id === id);
const me = () => getMember(state.activeMemberId);
const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
function avatarEl(member, size = "") {
  const a = document.createElement("span");
  a.className = "avatar " + size; a.style.background = member.color;
  a.textContent = initials(member.name); a.title = member.name;
  return a;
}

/* ---------- Pomocníci pro data ---------- */
function fmtDue(ts) {
  const d = new Date(ts), now = new Date();
  const opts = { month: "short", day: "numeric" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  let s = d.toLocaleDateString("cs-CZ", opts);
  if (d.getHours() || d.getMinutes()) s += ", " + d.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });
  return s;
}
function dueState(due) {
  if (!due) return null;
  if (due.done) return "done";
  const diff = due.date - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 24 * 3600e3) return "soon";
  return "upcoming";
}
function toInputDate(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function toInputTime(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }

const getBoard = () => state.boards.find((b) => b.id === currentBoardId);
const findList = (lid) => getBoard().lists.find((l) => l.id === lid);
function logActivity(text) {
  const b = getBoard(); if (!b) return;
  b.activity.unshift({ id: uid(), ts: Date.now(), text });
  if (b.activity.length > 200) b.activity.length = 200;
}

/* ============================================================
   PŘEPÍNÁNÍ POHLEDŮ
   ============================================================ */
function applyTheme() { document.documentElement.setAttribute("data-theme", state.theme); }

function showBoards() {
  currentBoardId = null;
  el("boardsView").hidden = false; el("boardView").hidden = true;
  el("boardTitle").textContent = ""; el("boardTitle").setAttribute("contenteditable", "false");
  el("boardStar").hidden = true;
  el("searchInput").hidden = true; el("searchInput").value = "";
  el("filterBtn").hidden = true; el("menuBtn").hidden = true;
  document.body.style.background = "var(--bg)";
  renderBoards();
}
function openBoard(id) {
  const b = state.boards.find((x) => x.id === id);
  if (!b) return showBoards();
  currentBoardId = id; filter = { labels: [], members: [], due: null };
  el("boardsView").hidden = true; el("boardView").hidden = false;
  applyBoardBg(b);
  el("boardTitle").textContent = b.title; el("boardTitle").setAttribute("contenteditable", "true");
  el("boardStar").hidden = false; el("boardStar").textContent = b.starred ? "★" : "☆"; el("boardStar").classList.toggle("on", !!b.starred);
  el("searchInput").hidden = false;
  el("filterBtn").hidden = false; updateFilterBtn();
  el("menuBtn").hidden = false;
  renderBoard();
}
function applyBoardBg(b) { document.body.style.background = b.bg.value; document.body.style.backgroundSize = "cover"; }

/* ============================================================
   PŘEHLED NÁSTĚNEK
   ============================================================ */
function renderBoards() {
  const starred = state.boards.filter((b) => !b.archived && b.starred);
  const rest = state.boards.filter((b) => !b.archived && !b.starred);
  el("starredSection").hidden = starred.length === 0;
  el("starredGrid").innerHTML = ""; starred.forEach((b) => el("starredGrid").appendChild(boardCardEl(b)));
  const grid = el("boardsGrid"); grid.innerHTML = "";
  rest.forEach((b) => grid.appendChild(boardCardEl(b)));
  const add = document.createElement("button");
  add.className = "board-card new"; add.textContent = "+ Vytvořit novou nástěnku"; add.onclick = createBoard;
  grid.appendChild(add);
}
function boardCardEl(b) {
  const btn = document.createElement("button");
  btn.className = "board-card";
  if (b.bg.type === "gradient") btn.style.backgroundImage = b.bg.value; else btn.style.background = b.bg.value;
  btn.textContent = b.title; btn.onclick = () => openBoard(b.id);
  const actions = document.createElement("div"); actions.className = "bc-actions";
  const star = document.createElement("button"); star.className = "bc-btn bc-star" + (b.starred ? " on" : "");
  star.textContent = b.starred ? "★" : "☆"; star.title = "Oblíbené";
  star.onclick = (e) => { e.stopPropagation(); b.starred = !b.starred; save(); renderBoards(); };
  const arch = document.createElement("button"); arch.className = "bc-btn"; arch.textContent = "⧉"; arch.title = "Archivovat nástěnku";
  arch.onclick = (e) => { e.stopPropagation(); b.archived = true; save(); renderBoards(); };
  const del = document.createElement("button"); del.className = "bc-btn"; del.textContent = "×"; del.title = "Smazat nástěnku";
  del.onclick = (e) => { e.stopPropagation();
    if (confirm(`Smazat nástěnku „${b.title}“? Tuto akci nelze vrátit.`)) { state.boards = state.boards.filter((x) => x.id !== b.id); save(); renderBoards(); } };
  actions.append(star, arch, del); btn.appendChild(actions);
  return btn;
}
function createBoard() {
  const title = prompt("Název nástěnky:", "Nová nástěnka");
  if (!title) return;
  const bg = BOARD_BGS[state.boards.length % BOARD_BGS.length];
  const b = { id: uid(), title: title.trim(), bg, starred: false, archived: false,
    memberIds: [state.activeMemberId], labels: LABEL_COLORS.slice(0, 6).map((c) => ({ id: uid(), color: c, name: "" })),
    activity: [], lists: [] };
  state.boards.push(b); save(); openBoard(b.id);
}

/* ============================================================
   NÁSTĚNKA (seznamy + karty)
   ============================================================ */
function cardVisible(card) {
  if (card.archived) return false;
  const q = el("searchInput").value.trim().toLowerCase();
  if (q && !((card.title + " " + (card.desc || "")).toLowerCase().includes(q))) return false;
  if (filter.labels.length && !filter.labels.some((id) => card.labelIds.includes(id))) return false;
  if (filter.members.length && !filter.members.some((id) => card.memberIds.includes(id))) return false;
  if (filter.due) {
    const st = dueState(card.due);
    if (filter.due === "none" && card.due) return false;
    if (filter.due === "overdue" && st !== "overdue") return false;
    if (filter.due === "soon" && st !== "soon" && st !== "overdue") return false;
    if (filter.due === "done" && st !== "done") return false;
  }
  return true;
}
function renderBoard() {
  const b = getBoard(); if (!b) return;
  const listsEl = el("lists"); listsEl.innerHTML = "";
  b.lists.filter((l) => !l.archived).forEach((l) => listsEl.appendChild(renderList(l)));
}
function renderList(list) {
  const wrap = document.createElement("div");
  wrap.className = "list" + (list.collapsed ? " collapsed" : "");
  wrap.dataset.listId = list.id; wrap.draggable = true;
  wrap.addEventListener("dragstart", (e) => {
    if (e.target.closest(".card") || e.target.closest("input")) return;
    dragListId = list.id; wrap.classList.add("dragging-list"); e.dataTransfer.effectAllowed = "move";
  });
  wrap.addEventListener("dragend", () => { wrap.classList.remove("dragging-list"); dragListId = null; });

  const header = document.createElement("div"); header.className = "list-header";
  const title = document.createElement("input"); title.className = "list-title"; title.value = list.title; title.draggable = false;
  title.onchange = () => { list.title = title.value.trim() || "Bez názvu"; save(); };
  const count = document.createElement("span"); count.className = "list-count"; count.textContent = list.cards.filter((c) => !c.archived).length;
  const actions = document.createElement("button"); actions.className = "list-actions-btn"; actions.textContent = "⋯"; actions.title = "Akce seznamu";
  actions.onclick = (e) => openListMenu(e.currentTarget, list);
  header.append(title, count, actions);
  header.onclick = (e) => { if (list.collapsed && e.target === header) { list.collapsed = false; save(); renderBoard(); } };
  wrap.appendChild(header);

  const ul = document.createElement("ul"); ul.className = "cards";
  list.cards.forEach((c) => { if (cardVisible(c)) ul.appendChild(renderCard(c, list)); });
  wrap.appendChild(ul);

  wrap.addEventListener("dragover", (e) => {
    if (dragListId) {
      e.preventDefault();
      const dragging = document.querySelector(".dragging-list");
      if (!dragging || dragging === wrap) return;
      const box = wrap.getBoundingClientRect();
      const before = e.clientX < box.left + box.width / 2;
      el("lists").insertBefore(dragging, before ? wrap : wrap.nextSibling);
      return;
    }
    e.preventDefault(); wrap.classList.add("list-drag-over");
    const after = dragAfter(ul, e.clientY);
    const dragging = document.querySelector(".card.dragging");
    if (!dragging) return;
    if (after == null) ul.appendChild(dragging); else ul.insertBefore(dragging, after);
  });
  wrap.addEventListener("dragleave", () => wrap.classList.remove("list-drag-over"));
  wrap.addEventListener("drop", (e) => { e.preventDefault(); wrap.classList.remove("list-drag-over");
    if (dragListId) commitListOrder(); else commitCardOrder(); });

  const addBtn = document.createElement("button"); addBtn.className = "add-card-btn"; addBtn.textContent = "+ Přidat kartu";
  addBtn.onclick = () => openCardComposer(wrap, list, addBtn);
  wrap.appendChild(addBtn);
  return wrap;
}
function renderCard(card, list) {
  const li = document.createElement("li");
  li.className = "card"; li.draggable = true; li.dataset.cardId = card.id; li.dataset.listId = list.id;
  if (card.cover && card.cover.type === "color") {
    const cov = document.createElement("div"); cov.className = "card-cover"; cov.style.background = card.cover.value; li.appendChild(cov);
  }
  const body = document.createElement("div"); body.className = "card-body";
  if (card.labelIds.length) {
    const w = document.createElement("div"); w.className = "card-labels";
    card.labelIds.forEach((id) => { const lab = getBoard().labels.find((l) => l.id === id); if (!lab) return;
      const sw = document.createElement("span"); sw.className = "card-label" + (lab.name ? " tall" : "");
      sw.style.background = lab.color; sw.textContent = lab.name || ""; sw.title = lab.name || ""; w.appendChild(sw); });
    body.appendChild(w);
  }
  const text = document.createElement("div"); text.className = "card-title-text"; text.textContent = card.title; body.appendChild(text);
  const badges = buildBadges(card); if (badges) body.appendChild(badges);
  li.appendChild(body);
  li.onclick = () => openCard(list.id, card.id);
  li.addEventListener("dragstart", (e) => { e.stopPropagation(); li.classList.add("dragging"); });
  li.addEventListener("dragend", () => { li.classList.remove("dragging"); commitCardOrder(); });
  return li;
}
function buildBadges(card) {
  const row = document.createElement("div"); row.className = "card-badges"; let has = false;
  if (card.desc && card.desc.trim()) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge" title="Má popis">≣</span>`); }
  if (card.due) { has = true; const st = dueState(card.due);
    const cls = st === "overdue" ? "due-overdue" : st === "soon" ? "due-soon" : st === "done" ? "due-done" : "";
    row.insertAdjacentHTML("beforeend", `<span class="card-badge ${cls}">🕑 ${escapeHtml(fmtDue(card.due.date))}</span>`); }
  const items = card.checklists.reduce((a, c) => a + c.items.length, 0);
  const done = card.checklists.reduce((a, c) => a + c.items.filter((i) => i.done).length, 0);
  if (items) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">☑ ${done}/${items}</span>`); }
  if (card.comments.length) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">💬 ${card.comments.length}</span>`); }
  if (card.attachments.length) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">📎 ${card.attachments.length}</span>`); }
  if (card.memberIds.length) { has = true; const mw = document.createElement("div"); mw.className = "card-members";
    card.memberIds.forEach((id) => { const m = getMember(id); if (m) mw.appendChild(avatarEl(m, "sm")); }); row.appendChild(mw); }
  return has ? row : null;
}

/* ---------- Přetahování ---------- */
function dragAfter(container, y) {
  const els = [...container.querySelectorAll(".card:not(.dragging)")];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}
function commitCardOrder() {
  const b = getBoard(); if (!b) return;
  const byId = {}; b.lists.forEach((l) => l.cards.forEach((c) => { byId[c.id] = c; }));
  const archivedByList = {}; b.lists.forEach((l) => { archivedByList[l.id] = l.cards.filter((c) => c.archived); });
  document.querySelectorAll(".list").forEach((listEl) => {
    const list = b.lists.find((l) => l.id === listEl.dataset.listId); if (!list) return;
    const ids = [...listEl.querySelectorAll(".card")].map((c) => c.dataset.cardId);
    list.cards = ids.map((id) => byId[id]).filter(Boolean).concat(archivedByList[list.id] || []);
  });
  save(); renderBoard();
}
function commitListOrder() {
  const b = getBoard(); if (!b) return;
  const order = [...document.querySelectorAll(".list")].map((l) => l.dataset.listId);
  const archived = b.lists.filter((l) => l.archived);
  b.lists = order.map((id) => b.lists.find((l) => l.id === id)).filter(Boolean).concat(archived);
  save(); renderBoard();
}

/* ---------- Přidání karty / seznamu ---------- */
function openCardComposer(wrap, list, addBtn) {
  addBtn.style.display = "none";
  const composer = document.createElement("div"); composer.className = "composer";
  composer.innerHTML = `<textarea placeholder="Zadejte název karty…" rows="2"></textarea>
    <div class="composer-actions"><button class="add">Přidat kartu</button><button class="cancel">×</button></div>`;
  wrap.insertBefore(composer, addBtn);
  const ta = composer.querySelector("textarea"); ta.focus();
  const close = () => { composer.remove(); addBtn.style.display = ""; };
  const add = () => {
    const title = ta.value.trim(); if (!title) return close();
    list.cards.push({ id: uid(), title, desc: "", archived: false, labelIds: [], memberIds: [],
      due: null, start: null, cover: null, checklists: [], attachments: [], comments: [], createdAt: Date.now() });
    logActivity(`přidal(a) kartu „${title}“ do ${list.title}`);
    save(); renderBoard();
    const fresh = document.querySelector(`.list[data-list-id="${list.id}"]`);
    if (fresh) openCardComposer(fresh, list, fresh.querySelector(".add-card-btn"));
  };
  composer.querySelector(".add").onclick = add;
  composer.querySelector(".cancel").onclick = close;
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } if (e.key === "Escape") close(); });
}
el("addListBtn").onclick = () => {
  const b = getBoard(); if (!b) return;
  const title = prompt("Název seznamu:", "Nový seznam"); if (!title) return;
  b.lists.push({ id: uid(), title: title.trim(), archived: false, cards: [] }); save(); renderBoard();
};

/* ---------- Menu seznamu ---------- */
function openListMenu(anchor, list) {
  const body = document.createElement("div");
  const mk = (label, fn) => { const r = document.createElement("div"); r.className = "pop-row"; r.textContent = label; r.onclick = () => { closePopover(); fn(); }; return r; };
  body.append(
    mk("Přidat kartu", () => { const w = document.querySelector(`.list[data-list-id="${list.id}"]`); openCardComposer(w, list, w.querySelector(".add-card-btn")); }),
    mk("Kopírovat seznam", () => {
      const copy = JSON.parse(JSON.stringify(list)); copy.id = uid(); copy.title = list.title + " (kopie)";
      copy.cards.forEach((c) => c.id = uid());
      const idx = getBoard().lists.indexOf(list); getBoard().lists.splice(idx + 1, 0, copy); save(); renderBoard();
    }),
    mk("Seřadit podle názvu", () => { list.cards.sort((a, b) => a.title.localeCompare(b.title, "cs")); save(); renderBoard(); }),
    mk("Seřadit podle nejnovějších", () => { list.cards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); save(); renderBoard(); }),
    mk("Seřadit podle termínu", () => { list.cards.sort((a, b) => (a.due ? a.due.date : Infinity) - (b.due ? b.due.date : Infinity)); save(); renderBoard(); }),
    mk(list.collapsed ? "Rozbalit seznam" : "Sbalit seznam", () => { list.collapsed = !list.collapsed; save(); renderBoard(); }),
    mk("Archivovat všechny karty", () => { list.cards.forEach((c) => c.archived = true); save(); renderBoard(); }),
    mk("Archivovat seznam", () => { list.archived = true; logActivity(`archivoval(a) seznam ${list.title}`); save(); renderBoard(); }),
  );
  popover(anchor, "Akce seznamu", body);
}

/* ============================================================
   POPOVER
   ============================================================ */
function popover(anchor, title, bodyEl) {
  const pop = el("popover"); pop.innerHTML = "";
  const header = document.createElement("div"); header.className = "popover-header";
  header.innerHTML = `<span>${escapeHtml(title)}</span>`;
  const close = document.createElement("button"); close.textContent = "×"; close.onclick = closePopover; header.appendChild(close);
  const body = document.createElement("div"); body.className = "popover-body"; body.appendChild(bodyEl);
  pop.append(header, body); pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, window.innerHeight - pop.offsetHeight - 10) + "px";
  let left = r.left; if (left + pop.offsetWidth > window.innerWidth - 10) left = window.innerWidth - pop.offsetWidth - 10;
  pop.style.left = Math.max(10, left) + "px";
}
function closePopover() { el("popover").hidden = true; el("popover").innerHTML = ""; }

/* ============================================================
   DETAIL KARTY
   ============================================================ */
function openCard(listId, cardId) { activeRef = { listId, cardId }; renderModal(); el("modalOverlay").hidden = false; }
function getActive() { const list = findList(activeRef.listId); return { list, card: list.cards.find((c) => c.id === activeRef.cardId) }; }
function closeModal() { el("modalOverlay").hidden = true; activeRef = null; renderBoard(); }

function renderModal() {
  const { list, card } = getActive(); const board = getBoard();
  const cover = el("modalCover");
  if (card.cover && card.cover.type === "color") { cover.hidden = false; cover.style.background = card.cover.value; } else cover.hidden = true;
  el("cardTitleInput").value = card.title;
  el("cardListName").innerHTML = `v seznamu <b>${escapeHtml(list.title)}</b>`;

  const quick = el("cardQuickRow"); quick.innerHTML = "";
  if (card.memberIds.length) {
    const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Členové</div>`;
    const v = document.createElement("div"); v.className = "quick-values";
    card.memberIds.forEach((id) => { const m = getMember(id); if (m) v.appendChild(avatarEl(m, "lg")); });
    g.appendChild(v); quick.appendChild(g);
  }
  if (card.labelIds.length) {
    const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Štítky</div>`;
    const v = document.createElement("div"); v.className = "quick-values";
    card.labelIds.forEach((id) => { const lab = board.labels.find((l) => l.id === id); if (!lab) return;
      const s = document.createElement("span"); s.className = "card-label tall"; s.style.background = lab.color; s.style.minWidth = "48px"; s.textContent = lab.name || ""; v.appendChild(s); });
    g.appendChild(v); quick.appendChild(g);
  }
  if (card.due) {
    const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Termín</div>`;
    const v = document.createElement("div"); v.className = "quick-values"; const st = dueState(card.due);
    const cls = st === "overdue" ? "due-overdue" : st === "soon" ? "due-soon" : st === "done" ? "due-done" : "";
    const pill = document.createElement("span"); pill.className = "card-badge " + cls; pill.style.fontSize = "13px"; pill.style.padding = "4px 8px";
    pill.innerHTML = `<input type="checkbox" ${card.due.done ? "checked" : ""}/> ${escapeHtml(fmtDue(card.due.date))} ${st === "overdue" ? "(po termínu)" : st === "done" ? "(hotovo)" : ""}`;
    pill.querySelector("input").onchange = (e) => { card.due.done = e.target.checked; if (card.due.done) logActivity(`označil(a) „${card.title}“ jako splněné`); save(); renderModal(); };
    v.appendChild(pill); g.appendChild(v); quick.appendChild(g);
  }
  renderModalBody(card); renderModalSide(card);
}
function renderModalBody(card) {
  const body = el("modalBody"); body.innerHTML = "";
  body.insertAdjacentHTML("beforeend", `<div class="modal-label"><span class="ico">≣</span> Popis</div>`);
  const descWrap = document.createElement("div"); descWrap.className = "section-body";
  const rendered = document.createElement("div"); rendered.className = "desc-rendered" + (card.desc ? "" : " placeholder");
  rendered.textContent = card.desc || "Přidejte podrobnější popis…";
  rendered.onclick = () => {
    const ta = document.createElement("textarea"); ta.className = "card-desc-input"; ta.value = card.desc || "";
    const actions = document.createElement("div"); actions.className = "composer-actions";
    actions.innerHTML = `<button class="save">Uložit</button><button class="cancel">×</button>`;
    descWrap.innerHTML = ""; descWrap.append(ta, actions); ta.focus();
    actions.querySelector(".save").onclick = () => { card.desc = ta.value; save(); renderModalBody(card); renderBoard(); };
    actions.querySelector(".cancel").onclick = () => renderModalBody(card);
  };
  descWrap.appendChild(rendered); body.appendChild(descWrap);

  card.checklists.forEach((cl) => body.appendChild(renderChecklist(card, cl)));

  if (card.attachments.length) {
    body.insertAdjacentHTML("beforeend", `<div class="modal-label"><span class="ico">📎</span> Přílohy</div>`);
    const aw = document.createElement("div"); aw.className = "section-body";
    card.attachments.forEach((att) => {
      const row = document.createElement("div"); row.className = "attachment";
      const thumb = document.createElement("div"); thumb.className = "thumb";
      if (att.type && att.type.startsWith("image/")) thumb.innerHTML = `<img src="${att.url}" alt=""/>`; else thumb.textContent = att.isLink ? "🔗" : "📄";
      const main = document.createElement("div"); main.className = "a-main";
      main.innerHTML = `<div class="a-name">${escapeHtml(att.name)}</div><a href="${att.url}" target="_blank" rel="noopener">Otevřít</a>`;
      const rm = document.createElement("button"); rm.className = "remove"; rm.textContent = "×";
      rm.onclick = () => { card.attachments = card.attachments.filter((a) => a.id !== att.id); save(); renderModalBody(card); renderBoard(); };
      row.append(thumb, main, rm); aw.appendChild(row);
    });
    body.appendChild(aw);
  }

  body.insertAdjacentHTML("beforeend", `<div class="modal-label"><span class="ico">💬</span> Komentáře a aktivita</div>`);
  const cw = document.createElement("div"); cw.className = "section-body";
  const form = document.createElement("div"); form.className = "inline-form";
  form.innerHTML = `<input placeholder="Napsat komentář…" /><button>Uložit</button>`;
  const input = form.querySelector("input");
  const addComment = () => { const t = input.value.trim(); if (!t) return;
    card.comments.unshift({ id: uid(), memberId: state.activeMemberId, text: t, ts: Date.now() }); input.value = ""; save(); renderModalBody(card); renderBoard(); };
  form.querySelector("button").onclick = addComment;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") addComment(); });
  cw.appendChild(form);
  card.comments.forEach((c) => {
    const m = getMember(c.memberId) || { name: "Někdo", color: "#888" };
    const row = document.createElement("div"); row.className = "comment"; row.appendChild(avatarEl(m));
    const main = document.createElement("div"); main.className = "c-main";
    main.innerHTML = `<div class="c-head"><span class="c-author">${escapeHtml(m.name)}</span><span class="c-time">${fmtDue(c.ts)}</span></div><div class="c-body">${escapeHtml(c.text)}</div>`;
    const del = document.createElement("button"); del.className = "c-del"; del.textContent = "Smazat";
    del.onclick = () => { card.comments = card.comments.filter((x) => x.id !== c.id); save(); renderModalBody(card); renderBoard(); };
    main.appendChild(del); row.appendChild(main); cw.appendChild(row);
  });
  body.appendChild(cw);
}
function renderChecklist(card, cl) {
  const section = document.createElement("div");
  const done = cl.items.filter((i) => i.done).length;
  const pct = cl.items.length ? Math.round(done / cl.items.length * 100) : 0;
  const head = document.createElement("div"); head.className = "modal-label";
  head.innerHTML = `<span class="ico">☑</span> <span style="flex:1">${escapeHtml(cl.title)}</span>`;
  const delCl = document.createElement("button"); delCl.className = "c-del"; delCl.textContent = "Smazat";
  delCl.onclick = () => { card.checklists = card.checklists.filter((x) => x.id !== cl.id); save(); renderModalBody(card); renderBoard(); };
  head.appendChild(delCl); section.appendChild(head);
  const bodyWrap = document.createElement("div"); bodyWrap.className = "section-body";
  const prog = document.createElement("div"); prog.className = "progress";
  prog.innerHTML = `<span class="progress-pct">${pct}%</span><div class="progress-bar"><div class="progress-fill ${pct === 100 ? "full" : ""}" style="width:${pct}%"></div></div>`;
  bodyWrap.appendChild(prog);
  cl.items.forEach((item) => {
    const row = document.createElement("div"); row.className = "check-item" + (item.done ? " done" : "");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = item.done;
    cb.onchange = () => { item.done = cb.checked; save(); renderModalBody(card); renderBoard(); };
    const txt = document.createElement("span"); txt.className = "txt"; txt.textContent = item.text;
    const rm = document.createElement("button"); rm.className = "remove"; rm.textContent = "×";
    rm.onclick = () => { cl.items = cl.items.filter((i) => i.id !== item.id); save(); renderModalBody(card); renderBoard(); };
    row.append(cb, txt, rm); bodyWrap.appendChild(row);
  });
  const form = document.createElement("div"); form.className = "checklist-form";
  form.innerHTML = `<input placeholder="Přidat položku…" /><button>Přidat</button>`;
  const input = form.querySelector("input");
  const add = () => { const t = input.value.trim(); if (!t) return;
    cl.items.push({ id: uid(), text: t, done: false }); input.value = ""; save(); renderModalBody(card); renderBoard();
    const fresh = section.querySelector(".checklist-form input"); if (fresh) fresh.focus(); };
  form.querySelector("button").onclick = add;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  bodyWrap.appendChild(form); section.appendChild(bodyWrap);
  return section;
}
function renderModalSide(card) {
  const side = el("modalSide"); side.innerHTML = "";
  side.insertAdjacentHTML("beforeend", `<div class="side-title">Přidat na kartu</div>`);
  const mk = (icon, label, fn, cls = "") => { const b = document.createElement("button"); b.className = "side-btn " + cls;
    b.innerHTML = `<span>${icon}</span><span>${label}</span>`; b.onclick = (e) => fn(e.currentTarget); side.appendChild(b); return b; };
  mk("👤", "Členové", (a) => memberPopover(a, card));
  mk("🏷️", "Štítky", (a) => labelPopover(a, card));
  mk("☑", "Úkoly", () => { card.checklists.push({ id: uid(), title: "Úkoly", items: [] }); save(); renderModalBody(card); });
  mk("🕑", "Termín", (a) => datePopover(a, card));
  mk("📎", "Příloha", (a) => attachPopover(a, card));
  mk("🖼️", "Obal", (a) => coverPopover(a, card));
  side.insertAdjacentHTML("beforeend", `<div class="side-title">Akce</div>`);
  mk("➡️", "Přesunout", (a) => movePopover(a, card));
  mk("⧉", "Kopírovat", (a) => copyPopover(a, card));
  mk("🗄️", "Archivovat", () => { const { card: c } = getActive(); c.archived = true; logActivity(`archivoval(a) kartu „${c.title}“`); save(); closeModal(); });
  mk("🗑️", "Smazat", () => { const { list, card: c } = getActive();
    if (confirm(`Smazat kartu „${c.title}“?`)) { list.cards = list.cards.filter((x) => x.id !== c.id); save(); closeModal(); } }, "danger");
}

/* ---------- Popovery polí karty ---------- */
function memberPopover(anchor, card) {
  const body = document.createElement("div");
  getBoard().memberIds.forEach((id) => {
    const m = getMember(id); if (!m) return;
    const row = document.createElement("div"); row.className = "pop-row"; row.appendChild(avatarEl(m));
    const name = document.createElement("span"); name.textContent = m.name; name.style.flex = "1"; row.appendChild(name);
    if (card.memberIds.includes(id)) row.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    row.onclick = () => { card.memberIds = card.memberIds.includes(id) ? card.memberIds.filter((x) => x !== id) : [...card.memberIds, id];
      save(); renderModal(); renderBoard(); memberPopover(anchor, card); };
    body.appendChild(row);
  });
  popover(anchor, "Členové", body);
}
function labelPopover(anchor, card) {
  const board = getBoard(); const body = document.createElement("div");
  board.labels.forEach((lab) => {
    const row = document.createElement("div"); row.className = "pop-row";
    const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || "";
    chip.onclick = () => { card.labelIds = card.labelIds.includes(lab.id) ? card.labelIds.filter((x) => x !== lab.id) : [...card.labelIds, lab.id];
      save(); renderModal(); renderBoard(); labelPopover(anchor, card); };
    row.appendChild(chip);
    if (card.labelIds.includes(lab.id)) row.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    const edit = document.createElement("button"); edit.textContent = "✎"; edit.style.cssText = "background:none;border:none;cursor:pointer;color:var(--muted)";
    edit.onclick = () => editLabelPopover(anchor, card, lab); row.appendChild(edit); body.appendChild(row);
  });
  const addBtn = document.createElement("button"); addBtn.className = "pop-btn subtle"; addBtn.textContent = "+ Vytvořit nový štítek";
  addBtn.onclick = () => editLabelPopover(anchor, card, null); body.appendChild(addBtn);
  popover(anchor, "Štítky", body);
}
function editLabelPopover(anchor, card, lab) {
  const board = getBoard(); const isNew = !lab;
  const current = lab || { id: uid(), name: "", color: LABEL_COLORS[0] };
  const body = document.createElement("div");
  const input = document.createElement("input"); input.className = "pop-input"; input.placeholder = "Název štítku"; input.value = current.name; body.appendChild(input);
  const grid = document.createElement("div"); grid.className = "pop-color-grid"; let chosen = current.color;
  LABEL_COLORS.forEach((c) => { const sw = document.createElement("div"); sw.className = "pop-color" + (c === chosen ? " selected" : ""); sw.style.background = c;
    sw.onclick = () => { chosen = c; grid.querySelectorAll(".pop-color").forEach((x) => x.classList.remove("selected")); sw.classList.add("selected"); }; grid.appendChild(sw); });
  body.appendChild(grid);
  const saveBtn = document.createElement("button"); saveBtn.className = "pop-btn"; saveBtn.textContent = isNew ? "Vytvořit" : "Uložit";
  saveBtn.onclick = () => { current.name = input.value.trim(); current.color = chosen;
    if (isNew) { board.labels.push(current); card.labelIds.push(current.id); } save(); renderModal(); renderBoard(); labelPopover(anchor, card); };
  body.appendChild(saveBtn);
  if (!isNew) { const del = document.createElement("button"); del.className = "pop-btn subtle"; del.textContent = "Smazat štítek";
    del.onclick = () => { board.labels = board.labels.filter((l) => l.id !== lab.id);
      board.lists.forEach((l) => l.cards.forEach((c) => c.labelIds = c.labelIds.filter((x) => x !== lab.id)));
      save(); renderModal(); renderBoard(); labelPopover(anchor, card); }; body.appendChild(del); }
  popover(anchor, isNew ? "Nový štítek" : "Upravit štítek", body);
}
function datePopover(anchor, card) {
  const body = document.createElement("div"); const has = !!card.due;
  const base = card.due ? card.due.date : Date.now() + 864e5;
  body.innerHTML = `<label class="quick-label">Termín</label><input type="date" class="pop-input" id="dpDate" value="${toInputDate(base)}">
    <label class="quick-label">Čas</label><input type="time" class="pop-input" id="dpTime" value="${toInputTime(base)}">`;
  const saveBtn = document.createElement("button"); saveBtn.className = "pop-btn"; saveBtn.textContent = "Uložit";
  saveBtn.onclick = () => { const dv = body.querySelector("#dpDate").value; const tv = body.querySelector("#dpTime").value || "12:00";
    if (!dv) return; const ts = new Date(`${dv}T${tv}`).getTime();
    card.due = { date: ts, done: card.due ? card.due.done : false }; logActivity(`nastavil(a) termín „${card.title}“ na ${fmtDue(ts)}`);
    save(); renderModal(); renderBoard(); closePopover(); };
  body.appendChild(saveBtn);
  if (has) { const rm = document.createElement("button"); rm.className = "pop-btn subtle"; rm.textContent = "Odebrat termín";
    rm.onclick = () => { card.due = null; save(); renderModal(); renderBoard(); closePopover(); }; body.appendChild(rm); }
  popover(anchor, "Termín", body);
}
function attachPopover(anchor, card) {
  const body = document.createElement("div");
  body.innerHTML = `<label class="quick-label">Odkaz (URL)</label><input class="pop-input" id="atUrl" placeholder="https://…">
    <input class="pop-input" id="atName" placeholder="Zobrazený název (nepovinné)">`;
  const addLink = document.createElement("button"); addLink.className = "pop-btn"; addLink.textContent = "Připojit odkaz";
  addLink.onclick = () => { const url = body.querySelector("#atUrl").value.trim(); if (!url) return;
    const name = body.querySelector("#atName").value.trim() || url;
    card.attachments.push({ id: uid(), name, url, isLink: true }); save(); renderModalBody(card); renderBoard(); closePopover(); };
  body.appendChild(addLink);
  body.insertAdjacentHTML("beforeend", `<label class="quick-label" style="margin-top:10px;display:block">Nebo nahrát soubor</label>`);
  const file = document.createElement("input"); file.type = "file"; file.className = "pop-input";
  file.onchange = () => { const f = file.files[0]; if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) alert("Soubor je velký (>1,5 MB). Úložiště je omezené – u velkých souborů raději připojte odkaz.");
    const reader = new FileReader();
    reader.onload = () => { card.attachments.push({ id: uid(), name: f.name, url: reader.result, type: f.type }); save(); renderModalBody(card); renderBoard(); closePopover(); };
    reader.readAsDataURL(f); };
  body.appendChild(file);
  popover(anchor, "Příloha", body);
}
function coverPopover(anchor, card) {
  const body = document.createElement("div");
  const grid = document.createElement("div"); grid.className = "pop-color-grid";
  LABEL_COLORS.forEach((c) => { const sw = document.createElement("div"); sw.className = "pop-color" + (card.cover && card.cover.value === c ? " selected" : ""); sw.style.background = c;
    sw.onclick = () => { card.cover = { type: "color", value: c }; save(); renderModal(); renderBoard(); coverPopover(anchor, card); }; grid.appendChild(sw); });
  body.appendChild(grid);
  const rm = document.createElement("button"); rm.className = "pop-btn subtle"; rm.textContent = "Odebrat obal";
  rm.onclick = () => { card.cover = null; save(); renderModal(); renderBoard(); closePopover(); }; body.appendChild(rm);
  popover(anchor, "Obal", body);
}
function movePopover(anchor, card) {
  const board = getBoard(); const body = document.createElement("div");
  board.lists.filter((l) => !l.archived).forEach((l) => {
    const row = document.createElement("div"); row.className = "pop-row"; row.textContent = l.title;
    if (l.id === activeRef.listId) row.insertAdjacentHTML("beforeend", `<span class="check">•</span>`);
    row.onclick = () => { const src = findList(activeRef.listId); src.cards = src.cards.filter((c) => c.id !== card.id);
      l.cards.push(card); activeRef.listId = l.id; logActivity(`přesunul(a) „${card.title}“ do ${l.title}`);
      save(); renderModal(); renderBoard(); closePopover(); };
    body.appendChild(row);
  });
  popover(anchor, "Přesunout do seznamu", body);
}
function copyPopover(anchor, card) {
  const body = document.createElement("div");
  const input = document.createElement("input"); input.className = "pop-input"; input.value = card.title + " (kopie)"; body.appendChild(input);
  const btn = document.createElement("button"); btn.className = "pop-btn"; btn.textContent = "Vytvořit kartu";
  btn.onclick = () => { const copy = JSON.parse(JSON.stringify(card)); copy.id = uid(); copy.title = input.value.trim() || card.title;
    copy.checklists.forEach((cl) => { cl.id = uid(); cl.items.forEach((i) => i.id = uid()); }); copy.comments = []; copy.attachments.forEach((a) => a.id = uid());
    const list = findList(activeRef.listId); const idx = list.cards.findIndex((c) => c.id === card.id);
    list.cards.splice(idx + 1, 0, copy); save(); renderBoard(); closePopover(); };
  body.appendChild(btn);
  popover(anchor, "Kopírovat kartu", body);
}

/* ---------- Napojení modalu ---------- */
el("modalClose").onclick = closeModal;
el("modalOverlay").addEventListener("click", (e) => { if (e.target === el("modalOverlay")) closeModal(); });
el("cardTitleInput").addEventListener("input", (e) => { const { card } = getActive(); card.title = e.target.value; save(); });
el("cardTitleInput").addEventListener("blur", () => renderBoard());

/* ============================================================
   BOČNÍ MENU NÁSTĚNKY
   ============================================================ */
let drawerStack = [];
function openDrawer(view) { drawerStack = [view]; renderDrawer(); el("drawerOverlay").hidden = false; }
function pushDrawer(view) { drawerStack.push(view); renderDrawer(); }
function popDrawer() { drawerStack.pop(); renderDrawer(); }
function closeDrawer() { el("drawerOverlay").hidden = true; drawerStack = []; }

function renderDrawer() {
  const view = drawerStack[drawerStack.length - 1];
  el("drawerBack").hidden = drawerStack.length <= 1;
  const bodyEl = el("drawerBody"); bodyEl.innerHTML = "";
  const titleEl = el("drawerTitle"); const board = getBoard();

  if (view === "main") {
    titleEl.textContent = "Menu";
    const add = (icon, label, fn) => { const r = document.createElement("div"); r.className = "drawer-row";
      r.innerHTML = `<span class="ico">${icon}</span><span>${label}</span>`; r.onclick = fn; bodyEl.appendChild(r); };
    add("🖼️", "Změnit pozadí", () => pushDrawer("bg"));
    add("🏷️", "Štítky", () => pushDrawer("labels"));
    add("👤", "Členové", () => pushDrawer("members"));
    add("⚲", "Filtrovat karty", () => pushDrawer("filter"));
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Položky</div>`);
    add("📋", "Aktivita", () => pushDrawer("activity"));
    add("🗄️", "Archivované položky", () => pushDrawer("archive"));
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Nástěnka</div>`);
    add("⬇️", "Exportovat nástěnku (JSON)", exportBoard);
    add("⬆️", "Importovat nástěnky (JSON)", importBoards);
    add("⧉", "Archivovat tuto nástěnku", () => { board.archived = true; save(); closeDrawer(); showBoards(); });
    add("🗑️", "Smazat tuto nástěnku", () => { if (confirm(`Smazat nástěnku „${board.title}“?`)) { state.boards = state.boards.filter((b) => b.id !== board.id); save(); closeDrawer(); showBoards(); } });
    bodyEl.insertAdjacentHTML("beforeend",
      `<div class="scope-note">Neobsaženo (vyžaduje server nebo je to placená funkce Trella): automatizace (Butler), rozšíření (Power-Ups), e-mailová oznámení a pohledy Kalendář/Časová osa/Dashboard. Data se ale ukládají do reálné databáze a synchronizují mezi zařízeními.</div>`);
  }
  else if (view === "bg") {
    titleEl.textContent = "Pozadí";
    const grid = document.createElement("div"); grid.className = "bg-grid";
    BOARD_BGS.forEach((bg) => { const sw = document.createElement("div"); sw.className = "bg-swatch" + (board.bg.value === bg.value ? " selected" : "");
      if (bg.type === "gradient") sw.style.backgroundImage = bg.value; else sw.style.background = bg.value;
      sw.onclick = () => { board.bg = bg; applyBoardBg(board); save(); renderDrawer(); }; grid.appendChild(sw); });
    bodyEl.appendChild(grid);
  }
  else if (view === "labels") {
    titleEl.textContent = "Štítky";
    board.labels.forEach((lab) => { const row = document.createElement("div"); row.className = "drawer-row";
      const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || "(bez názvu)";
      row.appendChild(chip); bodyEl.appendChild(row); });
    bodyEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Štítky upravíte na kartě → Štítky.</div>`);
  }
  else if (view === "members") {
    titleEl.textContent = "Členové";
    state.members.forEach((m) => { const row = document.createElement("div"); row.className = "drawer-row"; row.appendChild(avatarEl(m));
      const name = document.createElement("span"); name.style.flex = "1"; name.textContent = m.name + (m.id === state.activeMemberId ? " (vy)" : ""); row.appendChild(name);
      const onBoard = board.memberIds.includes(m.id);
      const toggle = document.createElement("button"); toggle.className = "pop-btn subtle"; toggle.style.cssText = "width:auto;margin:0;padding:4px 10px";
      toggle.textContent = onBoard ? "Odebrat" : "Přidat";
      toggle.onclick = () => { board.memberIds = onBoard ? board.memberIds.filter((x) => x !== m.id) : [...board.memberIds, m.id]; save(); renderDrawer(); };
      row.appendChild(toggle); bodyEl.appendChild(row); });
    const addBtn = document.createElement("button"); addBtn.className = "pop-btn"; addBtn.textContent = "+ Přidat nového člena";
    addBtn.onclick = () => { const name = prompt("Jméno člena:"); if (!name) return;
      const m = { id: uid(), name: name.trim(), color: AVATAR_COLORS[state.members.length % AVATAR_COLORS.length] };
      state.members.push(m); board.memberIds.push(m.id); save(); renderDrawer(); };
    bodyEl.appendChild(addBtn);
  }
  else if (view === "filter") {
    titleEl.textContent = "Filtr";
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Štítky</div>`);
    board.labels.forEach((lab) => { const row = document.createElement("div"); row.className = "drawer-row";
      const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || ""; row.appendChild(chip);
      if (filter.labels.includes(lab.id)) row.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
      row.onclick = () => { filter.labels = filter.labels.includes(lab.id) ? filter.labels.filter((x) => x !== lab.id) : [...filter.labels, lab.id]; updateFilterBtn(); renderBoard(); renderDrawer(); };
      bodyEl.appendChild(row); });
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Členové</div>`);
    board.memberIds.forEach((id) => { const m = getMember(id); if (!m) return;
      const row = document.createElement("div"); row.className = "drawer-row"; row.appendChild(avatarEl(m));
      const n = document.createElement("span"); n.style.flex = "1"; n.textContent = m.name; row.appendChild(n);
      if (filter.members.includes(id)) row.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
      row.onclick = () => { filter.members = filter.members.includes(id) ? filter.members.filter((x) => x !== id) : [...filter.members, id]; updateFilterBtn(); renderBoard(); renderDrawer(); };
      bodyEl.appendChild(row); });
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Termín</div>`);
    [["none", "Bez termínu"], ["overdue", "Po termínu"], ["soon", "Brzy termín"], ["done", "Označeno hotové"]].forEach(([k, label]) => {
      const row = document.createElement("div"); row.className = "drawer-row"; row.innerHTML = `<span class="ico">🕑</span><span style="flex:1">${label}</span>`;
      if (filter.due === k) row.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
      row.onclick = () => { filter.due = filter.due === k ? null : k; updateFilterBtn(); renderBoard(); renderDrawer(); }; bodyEl.appendChild(row); });
    const clear = document.createElement("button"); clear.className = "pop-btn subtle"; clear.textContent = "Zrušit filtry";
    clear.onclick = () => { filter = { labels: [], members: [], due: null }; updateFilterBtn(); renderBoard(); renderDrawer(); };
    bodyEl.appendChild(clear);
  }
  else if (view === "activity") {
    titleEl.textContent = "Aktivita";
    if (!board.activity.length) bodyEl.innerHTML = `<div class="empty-note">Zatím žádná aktivita.</div>`;
    board.activity.forEach((a) => { const row = document.createElement("div"); row.className = "activity-item";
      row.innerHTML = `<b>${escapeHtml(me().name)}</b> ${escapeHtml(a.text)} · <span>${fmtDue(a.ts)}</span>`; bodyEl.appendChild(row); });
  }
  else if (view === "archive") {
    titleEl.textContent = "Archivované položky";
    const archCards = []; board.lists.forEach((l) => l.cards.forEach((c) => { if (c.archived) archCards.push({ list: l, card: c }); }));
    const archLists = board.lists.filter((l) => l.archived);
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Karty</div>`);
    if (!archCards.length) bodyEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Žádné archivované karty.</div>`);
    archCards.forEach(({ list, card }) => { const row = document.createElement("div"); row.className = "drawer-row";
      const n = document.createElement("span"); n.style.flex = "1"; n.textContent = card.title; row.appendChild(n);
      const r = document.createElement("button"); r.className = "pop-btn subtle"; r.style.cssText = "width:auto;margin:0;padding:4px 10px"; r.textContent = "Obnovit";
      r.onclick = () => { card.archived = false; save(); renderBoard(); renderDrawer(); };
      const d = document.createElement("button"); d.className = "pop-btn subtle"; d.style.cssText = "width:auto;margin:0 0 0 6px;padding:4px 10px"; d.textContent = "×";
      d.onclick = () => { list.cards = list.cards.filter((c) => c.id !== card.id); save(); renderBoard(); renderDrawer(); };
      row.append(r, d); bodyEl.appendChild(row); });
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Seznamy</div>`);
    if (!archLists.length) bodyEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Žádné archivované seznamy.</div>`);
    archLists.forEach((l) => { const row = document.createElement("div"); row.className = "drawer-row";
      const n = document.createElement("span"); n.style.flex = "1"; n.textContent = l.title; row.appendChild(n);
      const r = document.createElement("button"); r.className = "pop-btn subtle"; r.style.cssText = "width:auto;margin:0;padding:4px 10px"; r.textContent = "Obnovit";
      r.onclick = () => { l.archived = false; save(); renderBoard(); renderDrawer(); }; row.appendChild(r); bodyEl.appendChild(row); });
  }
}

function exportBoard() {
  const board = getBoard();
  const data = { board, members: state.members.filter((m) => board.memberIds.includes(m.id)) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = (board.title.replace(/[^\w]+/g, "-").toLowerCase() || "nastenka") + ".json"; a.click(); URL.revokeObjectURL(a.href);
}
function importBoards() {
  const input = document.createElement("input"); input.type = "file"; input.accept = "application/json";
  input.onchange = () => { const f = input.files[0]; if (!f) return; const reader = new FileReader();
    reader.onload = () => { try {
      const data = JSON.parse(reader.result); const board = data.board || data;
      board.id = uid(); board.lists.forEach((l) => { l.id = uid(); l.cards.forEach((c) => c.id = uid()); });
      (data.members || []).forEach((m) => { if (!getMember(m.id)) state.members.push(m); });
      state.boards.push(board); save(); closeDrawer(); openBoard(board.id);
    } catch (e) { alert("Nelze importovat: neplatný soubor."); } };
    reader.readAsText(f); };
  input.click();
}

/* ============================================================
   HORNÍ LIŠTA
   ============================================================ */
el("homeBtn").onclick = () => { closeDrawer(); showBoards(); };
el("menuBtn").onclick = () => openDrawer("main");
el("drawerClose").onclick = closeDrawer;
el("drawerBack").onclick = popDrawer;
el("drawerOverlay").addEventListener("click", (e) => { if (e.target === el("drawerOverlay")) closeDrawer(); });
el("filterBtn").onclick = () => openDrawer("filter");
function updateFilterBtn() {
  const n = filter.labels.length + filter.members.length + (filter.due ? 1 : 0);
  const btn = el("filterBtn"); btn.textContent = n ? `⚲ Filtr (${n})` : "⚲ Filtr"; btn.classList.toggle("active", n > 0);
}
el("themeBtn").onclick = () => { state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme(); save(); };
el("searchInput").addEventListener("input", renderBoard);
el("boardStar").onclick = () => { const b = getBoard(); b.starred = !b.starred;
  el("boardStar").textContent = b.starred ? "★" : "☆"; el("boardStar").classList.toggle("on", b.starred); save(); };
el("boardTitle").addEventListener("blur", () => { const b = getBoard(); if (!b) return;
  const t = el("boardTitle").textContent.trim() || "Nástěnka bez názvu"; el("boardTitle").textContent = t; b.title = t; save(); });
el("boardTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el("boardTitle").blur(); } });
el("resetSampleBtn").onclick = () => {
  if (confirm("Obnovit ukázková data? Nahradí to všechny aktuální nástěnky.")) { state = seed(); applyTheme(); save(); showBoards(); }
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!el("popover").hidden) return closePopover();
    if (!el("modalOverlay").hidden) return closeModal();
    if (!el("drawerOverlay").hidden) return closeDrawer();
  }
});

/* ============================================================
   START
   ============================================================ */
(async function boot() {
  state = await initialLoad();
  applyTheme();
  showBoards();
})();
