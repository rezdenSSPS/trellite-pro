/* ============================================================
   Trellite Pro — víceuživatelský klient (česky).
   Přihlášení, role, oprávnění, přiřazování úkolů, živá synchronizace.
   ============================================================ */

const LABEL_COLORS = ["#5a9e6f", "#cf9a46", "#cf8a4e", "#c15f5b", "#8d6fae", "#4c6793", "#4f9aa3", "#6fa58d", "#b07f99", "#5b6b8c", "#8a93a1", "#3f5e79"];
const BOARD_BGS = [
  { type: "color", value: "#4f46e5" }, { type: "color", value: "#c2410c" }, { type: "color", value: "#15803d" },
  { type: "color", value: "#7e22ce" }, { type: "color", value: "#0f766e" }, { type: "color", value: "#be123c" },
  { type: "color", value: "#0369a1" }, { type: "color", value: "#52525b" },
];
const CLIENT_ID = Math.random().toString(36).slice(2);

const uid = () => Math.random().toString(36).slice(2, 10);
const el = (id) => document.getElementById(id);
const escapeHtml = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICONS = {
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
  tag: '<path d="M3 11.3 11.3 3H20a1 1 0 0 1 1 1v8.7L12.7 21a1 1 0 0 1-1.4 0L3 12.7a1 1 0 0 1 0-1.4z"/><circle cx="7.6" cy="7.6" r="1.3"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12.2l2.6 2.6L16 9.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  clip: '<path d="M20.5 11.7 12 20.2a5 5 0 0 1-7-7l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.6 1.6 0 0 1-2.3-2.3l7.5-7.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  arrowRight: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4h-7.5A2 2 0 0 0 4 6v7.5A2 2 0 0 0 6 15.5H8.5"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><path d="M5 8v10.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V8"/><path d="M10 12h4"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V5h5v2"/><path d="M6 7l1 13h10l1-13"/>',
  alignLeft: '<path d="M4 6h16"/><path d="M4 10.5h10"/><path d="M4 15h16"/><path d="M4 19.5h10"/>',
  message: '<path d="M20.5 12a7.5 7.5 0 0 1-10.8 6.7L4 20l1.3-5A7.5 7.5 0 1 1 20.5 12z"/>',
  filter: '<path d="M3 5h18l-7 8v5l-4 2v-7z"/>',
  activity: '<path d="M3 12h3.5l2.5 7 4-14 2.5 7H21"/>',
  download: '<path d="M12 4v10"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 5l4 4"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.8"/><path d="M16 3.2A4 4 0 0 1 16 11"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12 20 3"/><path d="M17 6l2 2"/><path d="M15 8l2 2"/>',
};
function icon(name, size = 18) { return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`; }

/* ---------- Stav ---------- */
let state = null, me = null, usersAdmin = null, allBoards = null;
let currentBoardId = null, activeRef = null, viewMode = "boards";
let filter = { labels: [], members: [], due: null };
let dragListId = null;
// Záložky městské nástěnky: "ukoly" = kanban, ostatní = data ze šichtovnice a podpisů
let boardTab = "ukoly", intInfo = null, intYM = null;
const intData = {};

const isAdmin = () => me && me.role === "admin";
const isMyTasks = () => currentBoardId === "__mytasks__";

/* ============================================================
   API vrstva
   ============================================================ */
async function api(method, path, body) {
  const r = await fetch("/api" + path, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "x-client-id": CLIENT_ID },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { showLogin(); throw { unauth: true }; }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { if (j && j.error) toast(errMsg(j.error)); throw j || { error: "err" }; }
  return j;
}
function errMsg(code) {
  return ({ forbidden: "Nemáte oprávnění k této akci.", bad_current: "Špatné současné heslo.", weak: "Heslo musí mít alespoň 4 znaky.",
    username_taken: "Uživatelské jméno je obsazené.", bad_credentials: "Špatné jméno nebo heslo.", self: "Nelze smazat sám sebe." }[code]) || "Něco se nepovedlo.";
}
function applyPayload(j) {
  if (!j) return;
  if (j.state) state = j.state;
  if (j.me) me = j.me;
  if (j.users !== undefined) usersAdmin = j.users;
  if (j.allBoards !== undefined) allBoards = j.allBoards;
  applyTheme(); updateUserUI(); rerender();
}
async function mutate(method, path, body) { applyPayload(await api(method, path, body)); }

function rerender() {
  if (viewMode === "admin") return renderAdmin();
  if (viewMode === "board") {
    if (!getBoard()) return showBoards();
    renderBoard();
    if (activeRef) { const a = getActive(); if (a) renderModal(); else closeModalSilent(); }
    return;
  }
  renderBoards();
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) { const t = el("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3000); }

/* ============================================================
   Přihlášení
   ============================================================ */
function showLogin() { el("appWrap").hidden = true; el("loginView").hidden = false; }
function showApp() { el("loginView").hidden = true; el("appWrap").hidden = false; }

el("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = el("loginUser").value.trim(), password = el("loginPass").value;
  el("loginError").hidden = true;
  try {
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ username, password }) });
    const j = await r.json();
    if (!r.ok) { el("loginError").textContent = errMsg(j.error); el("loginError").hidden = false; return; }
    applyPayload(j); showApp(); el("loginPass").value = ""; connectSSE(); showBoards(); refreshPushState().then(renderPushHint); openFromUrl(location.href);
  } catch (e) { el("loginError").textContent = "Chyba připojení."; el("loginError").hidden = false; }
});

/* ============================================================
   Živá synchronizace (SSE)
   ============================================================ */
let evtSource = null, refetchTimer = null;
function connectSSE() {
  if (evtSource) return;
  try {
    evtSource = new EventSource("/api/events");
    evtSource.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.originator && d.originator === CLIENT_ID) return;
      // změna u aut ve šichtovnici (mechanik si vzal závadu, poznámka, servis…)
      if (d.kind === "vozidla") { refreshFleet(); return; }
      clearTimeout(refetchTimer); refetchTimer = setTimeout(refetchState, 180);
    };
    evtSource.onerror = () => { setSync("offline", "Spojení přerušeno – obnovuji…"); };
  } catch (e) {}
}
async function refetchState() {
  try { const j = await api("GET", "/state"); applyPayload(j); setSync("online", "Připojeno"); }
  catch (e) {}
}

/* ---------- Sync tečka ---------- */
function setSync(cls, title) { const d = el("syncDot"); if (!d) return; d.className = "sync-dot " + cls; d.title = title;
  el("syncPill").className = "sync-pill " + cls;
  el("syncText").textContent = cls === "online" ? "Synchronizováno" : cls === "saving" ? "Ukládám…" : cls === "offline" ? "Offline" : title; }

/* ============================================================
   Pomocníci
   ============================================================ */
const getMember = (id) => state.members.find((m) => m.id === id);
const initials = (name) => (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
function avatarEl(member, size = "") { const a = document.createElement("span"); a.className = "avatar " + size; paintAvatar(a, member); a.title = member.name; return a; }
function paintAvatar(a, member) { a.style.background = tint(member.color, 0.82); a.style.color = shade(member.color, 0.45); a.textContent = initials(member.name); }

/* Barvy: z uložené barvy (nástěnky, člena) uděláme jemnou tintu a tmavý inkoust. */
function hexOf(v) { const m = String(v || "").match(/#([0-9a-f]{6})/i); return m ? "#" + m[1] : "#71717a"; }
function rgbOf(hex) { const h = hexOf(hex).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
const toHex = (rgb) => "#" + rgb.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
function tint(hex, amt) { return toHex(rgbOf(hex).map((c) => c + (255 - c) * amt)); }
function shade(hex, amt) { return toHex(rgbOf(hex).map((c) => c * (1 - amt))); }
function plural(n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4) ? few : many; }
function relTime(ts) {
  const diff = Date.now() - ts, min = 60e3, hr = 60 * min, day = 24 * hr;
  if (diff < min) return "právě teď";
  if (diff < hr) return `před ${Math.floor(diff / min)} min`;
  if (diff < day) return `před ${Math.floor(diff / hr)} h`;
  if (diff < 2 * day) return "včera";
  if (diff < 7 * day) return `před ${Math.floor(diff / day)} dny`;
  return fmtDue(ts);
}
function boardCards(b) { return b.lists.filter((l) => !l.archived).flatMap((l) => l.cards.filter((c) => !c.archived).map((c) => ({ c, l }))); }
function boardMembers(b) { const ids = new Set(); boardCards(b).forEach(({ c }) => (c.memberIds || []).forEach((id) => ids.add(id))); return [...ids].map(getMember).filter(Boolean); }
const DONE_RE = /hotov|done|dokon|splněn/i;
function listDot(title) {
  if (DONE_RE.test(title)) return "#16a34a";
  if (/probíh|průběh|progress|řeší|dělá/i.test(title)) return "var(--accent)";
  if (/kontrol|review|čeká|schvál/i.test(title)) return "#d97706";
  if (/problém|chyb|bug|urgent/i.test(title)) return "#dc2626";
  return "#a1a1aa";
}

function fmtDue(ts) {
  const d = new Date(ts), now = new Date(); const opts = { month: "short", day: "numeric" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  let s = d.toLocaleDateString("cs-CZ", opts);
  if (d.getHours() || d.getMinutes()) s += ", " + d.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });
  return s;
}
function dueState(due) { if (!due) return null; if (due.done) return "done"; const diff = due.date - Date.now(); if (diff < 0) return "overdue"; if (diff < 24 * 3600e3) return "soon"; return "upcoming"; }
function toInputDate(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function toInputTime(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }

const getBoard = () => state.boards.find((b) => b.id === currentBoardId);
function findList(lid) { const b = getBoard(); return b && b.lists.find((l) => l.id === lid); }

/* ============================================================
   Přepínání pohledů
   ============================================================ */
function applyTheme() { document.documentElement.setAttribute("data-theme", (state && state.theme) || (me && me.theme) || "light"); }

function updateUserUI() {
  if (!me) return;
  paintAvatar(el("userAvatar"), me); paintAvatar(el("sideAvatar"), me);
  el("userBtn").title = me.name + (isAdmin() ? " (admin)" : "");
  el("sideUserName").textContent = me.name; el("sideUserRole").textContent = isAdmin() ? "Administrátor" : "Manažer";
  const badge = el("taskBadge"); const n = me.newTaskCount || 0;
  badge.textContent = n; badge.hidden = n === 0;
  const nc = el("navTaskCount"); nc.textContent = n; nc.hidden = n === 0;
  el("navAdmin").hidden = !isAdmin();
  renderSidebar();
}
function renderSidebar() {
  if (!state) return;
  const box = el("sideBoards"); box.innerHTML = "";
  state.boards.filter((b) => !b.virtual).sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0)).forEach((b) => {
    const btn = document.createElement("button"); btn.className = "side-board" + (viewMode === "board" && currentBoardId === b.id ? " active" : "");
    const dot = document.createElement("span"); dot.className = "side-dot"; dot.style.background = hexOf(b.bg.value);
    const name = document.createElement("span"); name.className = "side-board-name"; name.textContent = b.title;
    btn.append(dot, name); btn.onclick = () => openBoard(b.id); box.appendChild(btn);
  });
  el("navBoards").classList.toggle("active", viewMode === "boards");
  el("navTasks").classList.toggle("active", viewMode === "board" && isMyTasks());
  el("navAdmin").classList.toggle("active", viewMode === "admin");
}
function setHeader({ crumb, title, board }) {
  el("crumb").textContent = crumb;
  el("pageTitle").hidden = !!board; el("pageTitle").textContent = board ? "" : title;
  el("boardTitle").hidden = !board;
}
function renderBoardMembers(b) {
  const box = el("boardMembers"); box.innerHTML = "";
  const ms = b && !b.virtual ? boardMembers(b) : [];
  box.hidden = ms.length === 0;
  ms.slice(0, 3).forEach((m) => box.appendChild(avatarEl(m)));
  if (ms.length > 3) { const more = document.createElement("span"); more.className = "avatar more"; more.textContent = "+" + (ms.length - 3); box.appendChild(more); }
}

function showBoards() {
  viewMode = "boards"; currentBoardId = null; hideIntegration();
  el("boardsView").hidden = false; el("boardView").hidden = true; el("adminView").hidden = true;
  el("boardTitle").textContent = ""; el("boardTitle").setAttribute("contenteditable", "false");
  el("boardStar").hidden = true; el("searchWrap").hidden = true; el("searchInput").value = "";
  el("filterBtn").hidden = true; el("menuBtn").hidden = true; el("newCardBtn").hidden = true; el("boardMembers").hidden = true;
  setHeader({ crumb: "Pracovní prostor", title: "Přehled" });
  renderBoards(); renderSidebar();
}
function openBoard(id) {
  const b = state.boards.find((x) => x.id === id); if (!b) return showBoards();
  viewMode = "board"; currentBoardId = id; filter = { labels: [], members: [], due: null };
  el("boardsView").hidden = true; el("boardView").hidden = false; el("adminView").hidden = true;
  setHeader({ crumb: b.virtual ? "Pracovní prostor" : "Pracovní prostor / Nástěnky", board: true });
  el("boardTitle").textContent = b.title;
  el("boardTitle").setAttribute("contenteditable", (isAdmin() && !b.virtual) ? "true" : "false");
  el("boardStar").hidden = !(isAdmin() && !b.virtual); el("boardStar").classList.toggle("on", !!b.starred);
  el("searchWrap").hidden = false; el("filterBtn").hidden = false; updateFilterBtn();
  el("menuBtn").hidden = b.virtual ? true : false;
  el("addListBtn").hidden = !(isAdmin() && !b.virtual);
  el("newCardBtn").hidden = !!b.virtual;
  boardTab = "ukoly"; loadIntInfo(b);
  renderBoard(); renderSidebar();
}

/* ============================================================
   Přehled nástěnek
   ============================================================ */
function renderBoards() {
  const first = (me.name || "").trim().split(/\s+/)[0];
  const h = new Date().getHours();
  el("greeting").textContent = `${h < 10 ? "Dobré ráno" : h < 18 ? "Dobrý den" : "Dobrý večer"}, ${first}`;

  // Moje úkoly: karty přiřazené mně, seřazené podle termínu
  const mt = state.boards.find((b) => b.virtual);
  const tasks = mt ? mt.lists.flatMap((l) => l.cards.map((c) => ({ c, l }))) : [];
  tasks.sort((x, y) => (x.c.due ? x.c.due.date : Infinity) - (y.c.due ? y.c.due.date : Infinity));
  const late = tasks.filter(({ c }) => dueState(c.due) === "overdue").length;
  el("greetingSub").textContent = tasks.length
    ? `Máš ${tasks.length} ${plural(tasks.length, "přiřazený úkol", "přiřazené úkoly", "přiřazených úkolů")}` + (late ? `, ${late} ${plural(late, "je", "jsou", "je")} po termínu.` : ".")
    : "Nemáš žádné přiřazené úkoly.";
  renderPushHint();
  el("tasksSection").hidden = tasks.length === 0;
  el("tasksCount").textContent = tasks.length;
  const rows = el("tasksList"); rows.innerHTML = "";
  tasks.slice(0, 6).forEach(({ c, l }) => rows.appendChild(taskRowEl(c, l)));
  if (tasks.length > 6) { const more = document.createElement("button"); more.className = "task-row more"; more.textContent = `Zobrazit všech ${tasks.length} úkolů`; more.onclick = openMyTasks; rows.appendChild(more); }

  const grid = el("boardsGrid"); grid.innerHTML = "";
  state.boards.filter((b) => !b.virtual).sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0)).forEach((b) => grid.appendChild(boardCardEl(b)));
  if (isAdmin()) { const add = document.createElement("button"); add.className = "board-card new"; add.innerHTML = `${icon("plus", 20)}<span>Vytvořit nástěnku</span>`; add.onclick = createBoard; grid.appendChild(add); }
  el("newBoardBtn").hidden = !isAdmin();
}
function taskRowEl(c, l) {
  const row = document.createElement("button"); row.className = "task-row";
  const st = dueState(c.due);
  const dueCls = st === "overdue" ? "due-overdue" : st === "soon" ? "due-soon" : st === "done" ? "due-done" : "";
  const dueTxt = !c.due ? "Bez termínu" : st === "overdue" ? "Po termínu" : st === "soon" ? "Dnes" : fmtDue(c.due.date).replace(/,.*$/, "");
  const where = c._origin ? c._origin.boardTitle : "";
  row.innerHTML = `<span class="task-check${st === "done" ? " done" : ""}" aria-hidden="true"></span><span class="task-title">${escapeHtml(c.title)}</span><span class="task-board">${escapeHtml(where)}</span><span class="task-due ${dueCls}">${escapeHtml(dueTxt)}</span>`;
  row.onclick = () => { openBoard("__mytasks__"); openCard(l.id, c.id); };
  return row;
}
function boardCardEl(b) {
  const card = document.createElement("div"); card.className = "board-card"; card.tabIndex = 0; card.setAttribute("role", "button");
  const color = hexOf(b.bg.value);
  const cards = boardCards(b);
  const done = cards.filter(({ c, l }) => DONE_RE.test(l.title) || (c.due && c.due.done)).length;
  const pct = cards.length ? Math.round(done / cards.length * 100) : 0;
  const members = boardMembers(b).length;
  const lastTs = Math.max(0, ...(b.activity || []).map((a) => a.ts || 0), ...cards.map(({ c }) => c.createdAt || 0));
  card.innerHTML = `
    <div class="bc-head">
      <span class="bc-tile" style="background:${tint(color, 0.86)};color:${shade(color, 0.25)}">${escapeHtml(initials(b.title).slice(0, 1))}</span>
      <div class="bc-name"><span class="bc-title">${escapeHtml(b.title)}</span><span class="bc-sub">${lastTs ? "Upraveno " + relTime(lastTs) : "Zatím bez úprav"}</span></div>
      ${b.starred ? `<svg class="bc-starred" width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="Oblíbená"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/></svg>` : ""}
    </div>
    <div class="bc-progress"><div class="bc-progress-row"><span>Hotovo</span><span class="mono">${pct} %</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>
    <div class="bc-meta"><span>${cards.length} ${plural(cards.length, "karta", "karty", "karet")}</span><span>${members} ${plural(members, "člen", "členové", "členů")}</span></div>`;
  card.onclick = () => openBoard(b.id);
  card.onkeydown = (e) => { if (e.target === card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openBoard(b.id); } };
  if (isAdmin()) {
    const actions = document.createElement("div"); actions.className = "bc-actions";
    const star = document.createElement("button"); star.className = "bc-btn bc-star" + (b.starred ? " on" : ""); star.textContent = b.starred ? "★" : "☆"; star.title = b.starred ? "Odebrat z oblíbených" : "Přidat do oblíbených"; star.setAttribute("aria-label", star.title);
    star.onclick = (e) => { e.stopPropagation(); mutate("PATCH", "/boards/" + b.id, { starred: !b.starred }); };
    const arch = document.createElement("button"); arch.className = "bc-btn"; arch.innerHTML = icon("archive", 14); arch.title = "Archivovat nástěnku"; arch.setAttribute("aria-label", arch.title);
    arch.onclick = (e) => { e.stopPropagation(); mutate("POST", "/boards/" + b.id + "/archive"); };
    const del = document.createElement("button"); del.className = "bc-btn"; del.textContent = "×"; del.title = "Smazat nástěnku"; del.setAttribute("aria-label", del.title);
    del.onclick = (e) => { e.stopPropagation(); if (confirm(`Smazat nástěnku „${b.title}“? Tuto akci nelze vrátit.`)) mutate("DELETE", "/boards/" + b.id); };
    actions.append(star, arch, del); card.appendChild(actions);
  }
  return card;
}
async function openMyTasks() { try { applyPayload(await api("POST", "/account/seen")); } catch (e) {} openBoard("__mytasks__"); }
function createBoard() {
  const title = prompt("Název nástěnky:", "Nová nástěnka"); if (!title) return;
  const bg = BOARD_BGS[Math.floor(Math.random() * 8)];
  api("POST", "/boards", { title: title.trim(), bg }).then((j) => { applyPayload(j); const nb = state.boards.find((b) => b.title === title.trim()); if (nb) openBoard(nb.id); });
}

/* ============================================================
   Nástěnka (seznamy + karty)
   ============================================================ */
function cardVisible(card) {
  if (card.archived) return false;
  const q = el("searchInput").value.trim().toLowerCase();
  if (q && !((card.title + " " + (card.desc || "")).toLowerCase().includes(q))) return false;
  if (filter.labels.length && !filter.labels.some((id) => card.labelIds.includes(id))) return false;
  if (filter.members.length && !filter.members.some((id) => card.memberIds.includes(id))) return false;
  if (filter.due) { const st = dueState(card.due);
    if (filter.due === "none" && card.due) return false;
    if (filter.due === "overdue" && st !== "overdue") return false;
    if (filter.due === "soon" && st !== "soon" && st !== "overdue") return false;
    if (filter.due === "done" && st !== "done") return false; }
  return true;
}
function renderBoard() {
  const b = getBoard(); if (!b) return;
  if (boardTab !== "ukoly") return renderIntTab();
  renderBoardMembers(b);
  const listsEl = el("lists"); listsEl.innerHTML = "";
  b.lists.filter((l) => !l.archived).forEach((l) => listsEl.appendChild(renderList(l, b)));
}
function renderList(list, board) {
  const virtual = board.virtual;
  const structural = isAdmin() && !virtual;
  const wrap = document.createElement("div");
  wrap.className = "list" + (list.collapsed ? " collapsed" : ""); wrap.dataset.listId = list.id;
  wrap.draggable = structural;
  if (structural) {
    wrap.addEventListener("dragstart", (e) => { if (e.target.closest(".card") || e.target.closest("input")) return; dragListId = list.id; wrap.classList.add("dragging-list"); e.dataTransfer.effectAllowed = "move"; });
    wrap.addEventListener("dragend", () => { wrap.classList.remove("dragging-list"); dragListId = null; });
  }
  const header = document.createElement("div"); header.className = "list-header"; header.style.cursor = structural ? "grab" : "default";
  const title = document.createElement("input"); title.className = "list-title"; title.value = list.title; title.draggable = false; title.readOnly = !structural;
  if (structural) title.onchange = () => mutate("PATCH", "/lists/" + list.id, { title: title.value.trim() || "Bez názvu" });
  const count = document.createElement("span"); count.className = "list-count"; count.textContent = list.cards.filter((c) => !c.archived).length;
  const dot = document.createElement("span"); dot.className = "list-dot"; dot.style.background = listDot(list.title);
  header.append(dot, title, count);
  if (!virtual) { const actions = document.createElement("button"); actions.className = "list-actions-btn"; actions.innerHTML = icon("more"); actions.title = "Akce seznamu"; actions.onclick = (e) => openListMenu(e.currentTarget, list); header.append(actions); }
  header.onclick = (e) => { if (list.collapsed && e.target === header) mutate("PATCH", "/lists/" + list.id, { collapsed: false }); };
  wrap.appendChild(header);

  const ul = document.createElement("ul"); ul.className = "cards";
  list.cards.forEach((c) => { if (cardVisible(c)) ul.appendChild(renderCard(c, list, board)); });
  wrap.appendChild(ul);

  if (!virtual) {
    wrap.addEventListener("dragover", (e) => {
      if (dragListId && structural) { e.preventDefault(); const dragging = document.querySelector(".dragging-list"); if (!dragging || dragging === wrap) return;
        const box = wrap.getBoundingClientRect(); const before = e.clientX < box.left + box.width / 2; el("lists").insertBefore(dragging, before ? wrap : wrap.nextSibling); return; }
      e.preventDefault(); wrap.classList.add("list-drag-over");
      const after = dragAfter(ul, e.clientY); const dragging = document.querySelector(".card.dragging");
      if (!dragging) return; if (after == null) ul.appendChild(dragging); else ul.insertBefore(dragging, after);
    });
    wrap.addEventListener("dragleave", () => wrap.classList.remove("list-drag-over"));
    wrap.addEventListener("drop", (e) => { e.preventDefault(); wrap.classList.remove("list-drag-over"); if (dragListId) commitListOrder(); else commitCardOrder(); });
    const addBtn = document.createElement("button"); addBtn.className = "add-card-btn"; addBtn.textContent = "+ Přidat kartu"; addBtn.onclick = () => openCardComposer(wrap, list, addBtn);
    wrap.appendChild(addBtn);
  }
  return wrap;
}
function renderCard(card, list, board) {
  const li = document.createElement("li"); li.className = "card"; li.draggable = !board.virtual;
  li.dataset.cardId = card.id; li.dataset.listId = list.id;
  const isNew = (me.newTaskIds || []).includes(card.id);
  if (isNew) li.classList.add("card-new");
  if (card.cover && card.cover.type === "color") { const cov = document.createElement("div"); cov.className = "card-cover"; cov.style.background = card.cover.value; li.appendChild(cov); }
  const body = document.createElement("div"); body.className = "card-body";
  if (card.labelIds && card.labelIds.length) {
    const w = document.createElement("div"); w.className = "card-labels";
    card.labelIds.forEach((id) => { const lab = board.labels.find((l) => l.id === id); if (!lab) return;
      const sw = document.createElement("span"); sw.className = "card-label" + (lab.name ? " tall" : ""); sw.style.background = lab.color; sw.textContent = lab.name || ""; sw.title = lab.name || ""; w.appendChild(sw); });
    body.appendChild(w);
  }
  if (isNew) { const b = document.createElement("span"); b.className = "new-flag"; b.textContent = "NOVÉ"; body.appendChild(b); }
  const text = document.createElement("div"); text.className = "card-title-text"; text.textContent = card.title; body.appendChild(text);
  if (card._origin) { const o = document.createElement("div"); o.className = "card-origin"; o.textContent = card._origin.boardTitle + " · " + card._origin.listTitle; body.appendChild(o); }
  const badges = buildBadges(card); if (badges) body.appendChild(badges);
  li.appendChild(body);
  li.onclick = () => openCard(list.id, card.id);
  if (!board.virtual) {
    li.addEventListener("dragstart", (e) => { e.stopPropagation(); li.classList.add("dragging"); });
    li.addEventListener("dragend", () => { li.classList.remove("dragging"); commitCardOrder(); });
  }
  return li;
}
function buildBadges(card) {
  const row = document.createElement("div"); row.className = "card-badges"; let has = false;
  if (card.desc && card.desc.trim()) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge" title="Má popis">${icon("alignLeft", 13)}</span>`); }
  if (card.due) { has = true; const st = dueState(card.due); const cls = st === "overdue" ? "due-overdue" : st === "soon" ? "due-soon" : st === "done" ? "due-done" : "";
    row.insertAdjacentHTML("beforeend", `<span class="card-badge ${cls}">${icon("clock", 13)} ${escapeHtml(fmtDue(card.due.date))}</span>`); }
  const items = (card.checklists || []).reduce((a, c) => a + c.items.length, 0);
  const done = (card.checklists || []).reduce((a, c) => a + c.items.filter((i) => i.done).length, 0);
  if (items) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">${icon("check", 13)} ${done}/${items}</span>`); }
  if ((card.comments || []).length) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">${icon("message", 13)} ${card.comments.length}</span>`); }
  if ((card.attachments || []).length) { has = true; row.insertAdjacentHTML("beforeend", `<span class="card-badge">${icon("clip", 13)} ${card.attachments.length}</span>`); }
  if ((card.memberIds || []).length) { has = true; const mw = document.createElement("div"); mw.className = "card-members"; card.memberIds.forEach((id) => { const m = getMember(id); if (m) mw.appendChild(avatarEl(m, "sm")); }); row.appendChild(mw); }
  return has ? row : null;
}

/* ============================================================
   Integrace: Lidé / Výplaty / Vozidla (šichtovnice + podpisy)
   ============================================================ */
const TAB_LABELS = { ukoly: "Úkoly", lide: "Řidiči", vyplaty: "Výplaty", vozidla: "Vozidla" };
// Vstupní test: pod hranicí kurýr neprošel
const TEST_PASS = 70;
const testClass = (pct) => pct < TEST_PASS ? "danger" : pct < 80 ? "warn" : "ok";
const CONTRACT_LABEL = { dpp: "DPP", dpc: "DPČ", dpp_dpc: "DPP + DPČ", osvc: "IČO (OSVČ)", zadny: "Bez smlouvy" };
const czk = (n) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(Number(n) || 0);
const num = (n) => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(Number(n) || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "";
const colorFor = (s) => LABEL_COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % LABEL_COLORS.length];

function hideIntegration() { el("boardTabs").hidden = true; el("intView").hidden = true; closePerson(); }

async function intGet(path) {
  const r = await fetch("/api/integrace" + path, { credentials: "same-origin" });
  if (r.status === 401) { showLogin(); throw { unauth: true }; }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((j && j.message) || (r.status === 403 ? "Nemáte oprávnění." : "Data se nepodařilo načíst."));
  return j;
}
async function loadIntInfo(b) {
  intInfo = null; renderBoardTabs();
  if (b.virtual) return;
  try { const j = await intGet("/board/" + b.id); if (currentBoardId === b.id && viewMode === "board") { intInfo = j; renderBoardTabs(); } }
  catch (e) { /* bez propojení zůstává jen kanban */ }
}
function renderBoardTabs() {
  const nav = el("boardTabs");
  const tabs = intInfo && intInfo.city ? intInfo.tabs : [];
  if (!tabs.includes(boardTab)) boardTab = tabs[0] || "ukoly";
  nav.hidden = viewMode !== "board" || tabs.length === 0;
  nav.innerHTML = "";
  tabs.forEach((t) => {
    const b = document.createElement("button"); b.className = "board-tab" + (t === boardTab ? " active" : "");
    b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(t === boardTab)); b.textContent = TAB_LABELS[t];
    b.onclick = () => { if (boardTab !== t) { boardTab = t; renderBoardTabs(); renderBoard(); } };
    nav.appendChild(b);
  });
  if (viewMode !== "board") return;
  const onTasks = boardTab === "ukoly"; const b = getBoard();
  el("boardView").hidden = !onTasks; el("intView").hidden = onTasks;
  el("searchWrap").hidden = !onTasks; el("filterBtn").hidden = !onTasks; el("newCardBtn").hidden = !onTasks || !b || !!b.virtual;
  if (!onTasks) el("boardMembers").hidden = true;
}

const intKey = (boardId) => `${boardId}:${boardTab}` + (boardTab === "vyplaty" ? `:${intYM.y}-${intYM.m}` : "");
async function loadIntTab(fresh) {
  const b = getBoard(); if (!b) return;
  const tab = boardTab; const key = intKey(b.id);
  intData[key] = { loading: true };
  const qs = new URLSearchParams(); if (tab === "vyplaty") { qs.set("year", intYM.y); qs.set("month", intYM.m); } if (fresh) qs.set("refresh", "1");
  try { intData[key] = { data: await intGet(`/board/${b.id}/${tab}` + (qs.toString() ? "?" + qs : "")) }; }
  catch (e) { if (e.unauth) return; intData[key] = { error: e.message }; }
  if (viewMode === "board" && currentBoardId === b.id && boardTab === tab) renderIntTab();
}
function renderIntTab() {
  const b = getBoard(); if (!b) return;
  if (!intYM) { const d = new Date(); intYM = { y: d.getFullYear(), m: d.getMonth() + 1 }; }
  const key = intKey(b.id);
  if (!intData[key]) loadIntTab();
  const entry = intData[key];
  const box = el("intView"); box.innerHTML = "";

  // lišta: název + (měsíc u výplat) + obnovit + odkaz do šichtovnice
  const bar = document.createElement("div"); bar.className = "int-toolbar";
  const h = document.createElement("h2"); h.className = "int-title"; h.textContent = TAB_LABELS[boardTab]; bar.appendChild(h);
  if (entry && entry.data) {
    const n = boardTab === "lide" ? entry.data.people.length : boardTab === "vozidla" ? entry.data.vozidla.length : entry.data.ridici.length + entry.data.brigadnici.length;
    const c = document.createElement("span"); c.className = "section-count"; c.textContent = n; h.appendChild(c);
  }
  const right = document.createElement("div"); right.className = "int-actions";
  if (boardTab === "vyplaty") right.appendChild(monthSwitcher());
  const refresh = document.createElement("button"); refresh.className = "pill-btn"; refresh.innerHTML = `${icon("activity", 16)}<span>Obnovit</span>`;
  refresh.disabled = !!(entry && entry.loading); refresh.onclick = () => { loadIntTab(true); renderIntTab(); };
  right.appendChild(refresh);
  const ext = intInfo && intInfo.links && intInfo.links.smenovnik;
  if (ext) { const a = document.createElement("a"); a.className = "pill-btn"; a.href = ext; a.target = "_blank"; a.rel = "noopener"; a.innerHTML = `${icon("arrowRight", 16)}<span>Šichtovnice</span>`; right.appendChild(a); }
  bar.appendChild(right); box.appendChild(bar);

  if (!entry || entry.loading) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">Načítám data…</div>`); return; }
  if (entry.error) {
    const err = document.createElement("div"); err.className = "int-banner danger";
    err.innerHTML = `<span>${escapeHtml(entry.error)}</span>`;
    const retry = document.createElement("button"); retry.className = "pill-btn"; retry.textContent = "Zkusit znovu"; retry.onclick = () => { loadIntTab(true); renderIntTab(); };
    err.appendChild(retry); box.appendChild(err); return;
  }
  if (boardTab === "lide") renderPeople(box, entry.data);
  else if (boardTab === "vyplaty") renderPayroll(box, entry.data);
  else if (boardTab === "vozidla") renderFleet(box, entry.data);
}
function monthSwitcher() {
  const wrap = document.createElement("div"); wrap.className = "month-switch";
  const label = new Date(intYM.y, intYM.m - 1, 1).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const step = (d) => { const t = new Date(intYM.y, intYM.m - 1 + d, 1); intYM = { y: t.getFullYear(), m: t.getMonth() + 1 }; renderIntTab(); };
  const prev = document.createElement("button"); prev.className = "icon-btn"; prev.setAttribute("aria-label", "Předchozí měsíc"); prev.textContent = "‹"; prev.onclick = () => step(-1);
  const next = document.createElement("button"); next.className = "icon-btn"; next.setAttribute("aria-label", "Další měsíc"); next.textContent = "›"; next.onclick = () => step(1);
  const now = new Date(); next.disabled = intYM.y > now.getFullYear() || (intYM.y === now.getFullYear() && intYM.m >= now.getMonth() + 1);
  const span = document.createElement("span"); span.className = "month-label"; span.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  wrap.append(prev, span, next); return wrap;
}
function intBanner(box, kind, text) { const d = document.createElement("div"); d.className = "int-banner " + kind; d.textContent = text; box.appendChild(d); }

/* ---------- Lidé ---------- */
function personTypeLabel(p) {
  if (p.onlyContract) return "Jen smlouva · není ve šichtovnici";
  if (p.isRidic) return "Řidič OSVČ";
  return p.level || "Kurýr";
}
// Řidiči OSVČ vlevo, brigádníci (DPP/DPČ) vpravo
const isDriverCol = (p) => p.isRidic || (p.contract && p.contract.type === "osvc");
function renderPeople(box, data) {
  if (data.errors.smenovnik) intBanner(box, "danger", "Šichtovnice: " + data.errors.smenovnik);
  if (data.errors.podpisy) intBanner(box, "warn", "Smlouvy a testy teď nejdou načíst – " + data.errors.podpisy);
  if (!data.people.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">V tomhle městě zatím nikdo není.</div>`); return; }
  const cols = document.createElement("div"); cols.className = "people-cols";
  [
    { key: "ridici", title: "Řidiči", sub: "OSVČ", people: data.people.filter(isDriverCol) },
    { key: "brigadnici", title: "Brigádníci", sub: "DPP / DPČ", people: data.people.filter((p) => !isDriverCol(p)) },
  ].forEach((g) => {
    const col = document.createElement("section"); col.className = "people-col " + g.key;
    col.innerHTML = `<h3 class="people-col-head"><span class="people-col-dot" aria-hidden="true"></span>${g.title}<span class="section-count">${g.people.length}</span><span class="muted-sm">${g.sub}</span></h3>`;
    if (!g.people.length) col.insertAdjacentHTML("beforeend", `<div class="int-empty small">Nikdo</div>`);
    g.people.forEach((p) => col.appendChild(personCardEl(p, data.links)));
    cols.appendChild(col);
  });
  box.appendChild(cols);
}
function personCardEl(p, links) {
  const card = document.createElement("button"); card.className = "person-card" + (p.isActive === false ? " inactive" : "");
  const color = colorFor(p.name);
  const chips = [];
  if (p.contract) chips.push(`<span class="chip">${escapeHtml(CONTRACT_LABEL[p.contract.type] || "Smlouva")}</span>`);
  if (p.test) chips.push(`<span class="chip ${testClass(p.test.percent)}">Test ${p.test.percent} %${p.test.percent < TEST_PASS ? " · Neprošel" : ""}</span>`);
  if (p.clothingSize) chips.push(`<span class="chip">Vel. ${escapeHtml(p.clothingSize)}</span>`);
  if (p.isActive === false) chips.push(`<span class="chip muted">Neaktivní</span>`);
  card.innerHTML = `<span class="avatar lg" style="background:${tint(color, 0.82)};color:${shade(color, 0.45)}">${escapeHtml(initials(p.name))}</span>
    <span class="person-main"><span class="person-name">${escapeHtml(p.name)}</span><span class="person-sub">${escapeHtml(personTypeLabel(p))}</span>
    <span class="person-chips">${chips.join("")}</span></span>`;
  card.onclick = () => openPerson(p, links);
  return card;
}
function closePerson() { const o = el("personOverlay"); if (o) { o.hidden = true; el("personBody").innerHTML = ""; } }
function openPerson(p, links) {
  const body = el("personBody"); body.innerHTML = "";
  const color = colorFor(p.name);
  const field = (label, value, mono) => value ? `<div class="pf"><span class="pf-label">${label}</span><span class="pf-value${mono ? " mono" : ""}">${value}</span></div>` : "";
  const sec = (title, inner) => inner ? `<section class="person-sec"><h3>${title}</h3>${inner}</section>` : "";

  const contact = field("Telefon", p.phone ? `<a href="tel:${escapeHtml(p.phone.replace(/\s+/g, ""))}">${escapeHtml(p.phone)}</a>` : "")
    + field("E-mail", p.email ? `<a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a>` : "");
  const work = field("Typ", escapeHtml(personTypeLabel(p)))
    + field(p.isRidic ? "Sazba za den" : "", p.isRidic && p.dayRate ? czk(p.dayRate) : "")
    + field("Ve šichtovnici od", escapeHtml(fmtDate(p.since)))
    + field("Velikost oblečení", escapeHtml(p.clothingSize));
  const billing = field("IČO", escapeHtml(p.ico), true) + field("DIČ", escapeHtml(p.dic), true)
    + field("Sídlo", escapeHtml(p.invoiceAddress)) + field("Bankovní účet", escapeHtml(p.bankAccount), true);

  let contract = "";
  if (p.contract) {
    contract = field("Smlouva", escapeHtml(CONTRACT_LABEL[p.contract.type] || "—"))
      + field("Stav", p.contract.status === "signed" ? "Podepsáno" + (p.contract.signedAt ? " " + escapeHtml(fmtDate(p.contract.signedAt)) : "") : "Čeká na podpis")
      + (p.contract.hasPdf ? `<a class="primary-btn person-pdf" href="/api/integrace/smlouva/${encodeURIComponent(p.contract.id)}" target="_blank" rel="noopener">${icon("download", 16)}<span>Stáhnout smlouvu (PDF)</span></a>` : "");
  } else contract = `<p class="empty-note">Ke smlouvě se nepodařilo dohledat záznam v podpisech.</p>`;

  let test = "";
  if (p.test) {
    const t = p.test; const cls = testClass(t.percent);
    const letters = ["A", "B", "C", "D", "E"];
    test = `<div class="test-head"><span class="test-score ${cls}">${t.percent} %</span>${t.percent < TEST_PASS ? `<span class="chip danger">Neprošel (pod ${TEST_PASS} %)</span>` : ""}<span>Správně ${t.correctCount} z ${t.total}${t.maxPoints ? ` · ${t.points} z ${t.maxPoints} bodů` : ""}<br><span class="muted-sm">${escapeHtml(fmtDate(t.passedAt))}</span></span></div>
      <ul class="test-review">${(t.detail || []).map((d, i) => `<li class="${d.ok ? "ok" : "bad"}"><span class="tr-mark" aria-label="${d.ok ? "správně" : "špatně"}">${d.ok ? "✓" : "✗"}</span><div>
        <div class="tr-q">${i + 1}. ${escapeHtml(d.text || "(otázka podle obrázku)")}</div>
        <div class="tr-a">Odpověděl: ${d.chosen != null ? escapeHtml(letters[d.chosen] + " – " + ((d.options || [])[d.chosen] || "")) : "nezodpovězeno"}</div>
        ${d.ok ? "" : `<div class="tr-c">Správně: ${escapeHtml(letters[d.correct] + " – " + ((d.options || [])[d.correct] || ""))}</div>`}</div></li>`).join("")}</ul>`;
  } else test = `<p class="empty-note">Vstupní test neabsolvoval (nebo ho v podpisech nemáme).</p>`;

  const linkBtns = [];
  if (links && links.smenovnik && p.smenovnikId) linkBtns.push(`<a class="pill-btn" href="${escapeHtml(links.smenovnik)}/kurieri/${encodeURIComponent(p.smenovnikId)}" target="_blank" rel="noopener">${icon("arrowRight", 16)}<span>Profil ve šichtovnici</span></a>`);
  if (links && links.podpisy && p.contract) linkBtns.push(`<a class="pill-btn" href="${escapeHtml(links.podpisy)}/admin/r/${encodeURIComponent(p.contract.id)}" target="_blank" rel="noopener">${icon("arrowRight", 16)}<span>Záznam v podpisech</span></a>`);

  body.innerHTML = `<div class="person-head">
      <span class="avatar xl" style="background:${tint(color, 0.82)};color:${shade(color, 0.45)}">${escapeHtml(initials(p.name))}</span>
      <div><h2 id="personName" class="person-title">${escapeHtml(p.name)}</h2><div class="person-sub">${escapeHtml(personTypeLabel(p))}${p.isActive === false ? " · neaktivní" : ""}</div></div>
    </div>
    <div class="person-grid">
      <div>${sec("Kontakt", contact)}${sec("Práce", work)}${sec("Fakturace a platby", billing)}</div>
      <div>${sec("Smlouva", contract)}${sec("Vstupní test", test)}</div>
    </div>
    ${linkBtns.length ? `<div class="person-links">${linkBtns.join("")}</div>` : ""}`;
  el("personOverlay").hidden = false;
}
el("personClose").onclick = closePerson;
el("personOverlay").addEventListener("click", (e) => { if (e.target === el("personOverlay")) closePerson(); });

/* ---------- Výplaty ---------- */
function renderPayroll(box, data) {
  if (data.foodisError) intBanner(box, "warn", "Zálohy a bonusy za objednávky z Foodisu se nepodařilo načíst – částky jsou bez nich.");
  const all = [...data.ridici, ...data.brigadnici];
  if (!all.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">V tomhle měsíci zatím nikdo nemá odjeté směny.</div>`); return; }
  const total = all.reduce((s, r) => s + (Number(r.toPay) || 0), 0);
  const fines = all.reduce((s, r) => s + (r.bonusItems || []).filter((b) => Number(b.amount) < 0).reduce((a, b) => a + Number(b.amount), 0), 0);
  const stats = document.createElement("div"); stats.className = "pay-stats";
  stats.innerHTML = `<div class="stat"><span class="stat-label">K výplatě celkem</span><span class="stat-value">${czk(total)}</span></div>
    <div class="stat"><span class="stat-label">Lidí s výplatou</span><span class="stat-value">${all.length}</span></div>
    <div class="stat"><span class="stat-label">Srážky a pokuty</span><span class="stat-value ${fines < 0 ? "neg" : ""}">${czk(fines)}</span></div>`;
  box.appendChild(stats);
  if (data.ridici.length) box.appendChild(payTable("Řidiči OSVČ", data.ridici, true, data.pronajemVozidla));
  if (data.brigadnici.length) box.appendChild(payTable("Brigádníci", data.brigadnici, false));
}
function money(n, signed) { const v = Number(n) || 0; return `<span class="money${v < 0 ? " neg" : ""}">${signed && v > 0 ? "+" : ""}${czk(v)}</span>`; }
function payTable(title, rows, ridic, pronajem) {
  const sec = document.createElement("section"); sec.className = "pay-section";
  sec.innerHTML = `<h3 class="pay-title">${title}</h3>`;
  const wrap = document.createElement("div"); wrap.className = "table-wrap";
  const table = document.createElement("table"); table.className = "int-table";
  table.innerHTML = `<thead><tr><th>Jméno</th><th class="num">${ridic ? "Směny" : "Hodiny"}</th><th class="num">${ridic ? "Sazba / den" : "Sazba / h"}</th><th class="num">Vyježděno</th><th class="num">Záloha</th><th class="num">Bonus obj.</th><th class="num">Bonusy / srážky</th><th class="num">K výplatě</th></tr></thead>`;
  const tb = document.createElement("tbody");
  rows.slice().sort((a, b) => a.name.localeCompare(b.name, "cs")).forEach((r) => {
    const tr = document.createElement("tr"); tr.className = "pay-row"; tr.tabIndex = 0;
    tr.innerHTML = `<td><span class="pay-name">${escapeHtml(r.name)}</span>${r.cities && r.cities.length > 1 ? `<span class="muted-sm"> · ${r.cities.length} města</span>` : ""}</td>
      <td class="num mono">${num(ridic ? r.totalShifts : r.totalHours)}</td><td class="num mono">${czk(r.rate)}</td><td class="num mono">${czk(r.celkem)}</td>
      <td class="num mono">${r.zaloha ? money(-r.zaloha) : "—"}</td><td class="num mono">${r.orderBonus ? money(r.orderBonus, true) : "—"}</td>
      <td class="num mono">${r.manualBonus ? money(r.manualBonus, true) : "—"}</td><td class="num mono strong">${money(r.toPay)}</td>`;
    const detail = document.createElement("tr"); detail.className = "pay-detail"; detail.hidden = true;
    const items = (r.bonusItems || []).map((b) => `<li><span>${escapeHtml(b.reason)}</span>${b.amount == null ? `<span class="muted-sm">bez částky</span>` : money(b.amount, true)}</li>`).join("");
    const shifts = ridic ? `Ranní ${r.morningCount} · Odpolední ${r.afternoonCount} · Celodenní ${r.fulldayCount}` : `${r.shiftCount} ${plural(r.shiftCount, "směna", "směny", "směn")}`;
    detail.innerHTML = `<td colspan="8"><div class="pay-detail-box">
      <div><span class="pf-label">Směny</span> ${shifts}</div>
      <div><span class="pf-label">Bonusy a srážky</span>${items ? `<ul class="bonus-list">${items}</ul>` : ` <span class="muted-sm">žádné</span>`}</div>
      ${ridic && pronajem ? `<div class="muted-sm">Pronájem vozidla ${czk(pronajem)} je samostatná položka na faktuře – v částce k výplatě není.</div>` : ""}
      ${r.foodisMatched === false ? `<div class="muted-sm">Kurýr se nespároval s Foodisem – záloha a bonus za objednávky chybí.</div>` : ""}
    </div></td>`;
    const toggle = () => { detail.hidden = !detail.hidden; tr.classList.toggle("open", !detail.hidden); };
    tr.onclick = toggle; tr.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
    tb.append(tr, detail);
  });
  table.appendChild(tb); wrap.appendChild(table); sec.appendChild(wrap);
  return sec;
}

/* ---------- Vozidla ---------- */
async function intSend(method, path, body) {
  const r = await fetch("/api/integrace" + path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  if (r.status === 401) { showLogin(); throw { unauth: true }; }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((j && j.message) || (r.status === 403 ? "Nemáte oprávnění." : "Nepodařilo se uložit."));
  return j;
}
function serviceState(v) {
  const z = v.servis_zbyva_km;
  if (z == null) return null;
  if (z <= 0) return { cls: "danger", text: `Servis po termínu o ${num(-z)} km` };
  if (z <= 1500) return { cls: "warn", text: `Servis za ${num(z)} km` };
  return { cls: "ok", text: `Servis za ${num(z)} km` };
}
const faultAuthor = (id) => String(id || "").startsWith("trello:") ? String(id).slice(7) : (id ? "kurýr " + id : "");
const FAULT_STATUS = { new: "Nová", in_progress: "Řeší se", resolved: "Vyřešeno" };
const FAULT_CHIP = { new: "warn", in_progress: "accent", resolved: "ok" };
const faultChip = (h) => `<span class="chip ${FAULT_CHIP[h.status] || ""}">${FAULT_STATUS[h.status] || escapeHtml(h.status)}${h.status === "resolved" && h.resolved_at ? " " + escapeHtml(fmtDate(h.resolved_at)) : ""}</span>`;
function faultItemEl(h, canResolve, spz) {
  return `<li class="fault ${h.severity === "urgent" && h.status !== "resolved" ? "urgent" : ""} ${h.status}" data-id="${h.id}">
    <div class="fault-main">
      <div class="fault-top">${spz ? `<span class="mono fault-spz">${escapeHtml(spz)}</span>` : ""}${faultChip(h)}${h.severity === "urgent" && h.status !== "resolved" ? `<span class="chip danger">Urgentní</span>` : ""}</div>
      <span class="fault-text">${escapeHtml(h.popis)}</span>
      <span class="muted-sm">Nahlásil ${escapeHtml(faultAuthor(h.courier_id) || "—")} · ${escapeHtml(fmtDate(h.created_at))}</span>
      ${h.mechanik_note ? `<span class="fault-note">Mechanik: ${escapeHtml(h.mechanik_note)}</span>` : ""}</div>
    ${canResolve && h.status !== "resolved" ? `<button class="pill-btn fault-done" data-id="${h.id}" title="Označit jako vyřešené">Vyřešeno</button>` : ""}</li>`;
}
// Načte vozidla znovu (po změně ve šichtovnici); server už má čerstvá data
function refreshFleet() {
  Object.keys(intData).forEach((k) => { if (k.endsWith(":vozidla")) delete intData[k]; });
  if (viewMode === "board" && boardTab === "vozidla") renderIntTab();
}
function renderFleet(box, data) {
  if (!data.vozidla.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">Pro tohle město nejsou ve šichtovnici žádná auta.</div>`); return; }
  // Přehled všech závad: otevřené (urgentní první), pak vyřešené za 14 dní
  const all = data.vozidla.flatMap((v) => (v.hlaseni || []).map((h) => ({ h, v })));
  const rank = (x) => x.h.status === "resolved" ? 2 : x.h.severity === "urgent" ? 0 : 1;
  all.sort((a, b) => rank(a) - rank(b) || String(b.h.created_at).localeCompare(String(a.h.created_at)));
  const open = all.filter((x) => x.h.status !== "resolved").length;
  const sec = document.createElement("section"); sec.className = "fault-overview";
  sec.innerHTML = `<h3 class="pay-title">Závady <span class="section-count">${open} ${plural(open, "otevřená", "otevřené", "otevřených")}</span></h3>`
    + (all.length ? `<ul class="fault-list">${all.map((x) => faultItemEl(x.h, data.canResolve, x.v.spz)).join("")}</ul>` : `<p class="muted-sm">Žádné závady za posledních 14 dní.</p>`);
  bindFaultButtons(sec, data);
  box.appendChild(sec);
  const grid = document.createElement("div"); grid.className = "car-grid";
  data.vozidla.forEach((v) => grid.appendChild(carCardEl(v, data)));
  box.appendChild(grid);
}
function bindFaultButtons(root, data) {
  root.querySelectorAll(".fault-done").forEach((b) => b.onclick = () => {
    const v = data.vozidla.find((x) => (x.hlaseni || []).some((h) => String(h.id) === b.dataset.id)); if (!v) return;
    if (confirm("Označit závadu jako vyřešenou? Zmizí mechanikovi z fronty.")) carWrite(v, "POST", `/hlaseni/${b.dataset.id}/vyreseno`, {}, "Závada uzavřena.");
  });
}
function carCardEl(v, data) {
  const card = document.createElement("div"); card.className = "car-card" + (v.is_active ? "" : " inactive");
  const st = serviceState(v); const s = v.posledni_servis;
  const sinceKm = v.servis_posledni_km && v.km_aktualni != null ? v.km_aktualni - v.servis_posledni_km.km : null;
  const pct = sinceKm != null ? Math.max(0, Math.min(100, Math.round(sinceKm / v.servis_interval_km * 100))) : 0;
  const openF = (v.hlaseni || []).filter((h) => h.status !== "resolved");
  const doneF = (v.hlaseni || []).filter((h) => h.status === "resolved");
  const faults = openF.map((h) => faultItemEl(h, data.canResolve)).join("")
    + (doneF.length ? `<li class="fault-done-group"><details><summary>Vyřešené za 14 dní (${doneF.length})</summary><ul class="fault-list">${doneF.map((h) => faultItemEl(h, false)).join("")}</ul></details></li>` : "");
  card.innerHTML = `<div class="car-head"><span class="car-spz mono">${escapeHtml(v.spz)}</span>
      ${st ? `<span class="chip ${st.cls}">${st.text}</span>` : `<span class="chip muted">Servis nezadán</span>`}</div>
    <div class="car-label">${escapeHtml(v.label || "Bez označení")}${v.is_active ? "" : " · vyřazené"}</div>
    <div class="car-stats">
      <div><span class="pf-label">Stav tachometru</span><span class="mono">${v.km_aktualni != null ? num(v.km_aktualni) + " km" : "—"}</span>${v.km_datum ? `<span class="muted-sm">k ${escapeHtml(fmtDate(v.km_datum))}</span>` : ""}</div>
      <div><span class="pf-label">Najeto za 30 dní</span><span class="mono">${v.najeto_30_dni != null ? num(v.najeto_30_dni) + " km" : "—"}</span></div>
    </div>
    ${v.servis_posledni_km ? `<div class="car-progress" title="Od posledního servisu ${num(sinceKm || 0)} z ${num(v.servis_interval_km)} km"><div class="progress-bar"><div class="progress-fill ${st ? st.cls : ""}" style="width:${pct}%"></div></div></div>` : ""}
    <div class="car-service"><span class="pf-label">Poslední servis</span>${s ? `${escapeHtml(fmtDate(s.datum))} · ${escapeHtml(s.popis)}${s.km ? ` · ${num(s.km)} km` : ""}` : `<span class="muted-sm">zatím nezapsán</span>`}</div>
    ${v.poznamka ? `<div class="car-note">${escapeHtml(v.poznamka)}</div>` : ""}
    <div class="car-faults"><span class="pf-label">Závady</span>${openF.length ? "" : `<span class="muted-sm">žádné otevřené</span>`}${faults ? `<ul class="fault-list">${faults}</ul>` : ""}</div>
    <div class="car-actions"><button class="pill-btn car-report">${icon("message", 16)}<span>Nahlásit problém</span></button><button class="pill-btn car-service-btn">${icon("check", 16)}<span>Servis proveden</span></button></div>`;
  card.querySelector(".car-report").onclick = (e) => reportFaultPopover(e.currentTarget, v);
  card.querySelector(".car-service-btn").onclick = (e) => servicePopover(e.currentTarget, v);
  bindFaultButtons(card, data);
  return card;
}
async function carWrite(v, method, sub, body, okMsg) {
  const b = getBoard(); if (!b) return;
  try {
    const j = await intSend(method, `/board/${b.id}/vozidla/${v.id}${sub}`, body);
    const entry = intData[`${b.id}:vozidla`];
    if (entry && entry.data && j.vozidlo) entry.data.vozidla = entry.data.vozidla.map((x) => x.id === j.vozidlo.id ? j.vozidlo : x);
    closePopover(); toast(okMsg); if (boardTab === "vozidla") renderIntTab();
    return true;
  } catch (e) { if (!e.unauth) toast(e.message); return false; }
}
function reportFaultPopover(anchor, v) {
  const body = document.createElement("div");
  body.innerHTML = `<textarea class="pop-input" rows="4" placeholder="Co je s autem v nepořádku?"></textarea>
    <label class="notify-opt"><input type="checkbox" /> Urgentní – auto nejde použít</label>`;
  const btn = document.createElement("button"); btn.className = "pop-btn"; btn.textContent = "Odeslat mechanikovi";
  btn.onclick = async () => {
    const popis = body.querySelector("textarea").value.trim(); if (!popis) return toast("Popište prosím problém.");
    btn.disabled = true;
    const ok = await carWrite(v, "POST", "/hlaseni", { popis, severity: body.querySelector("input").checked ? "urgent" : "normal" }, "Problém nahlášen – mechanik ho uvidí ve šichtovnici.");
    if (!ok) btn.disabled = false;
  };
  body.appendChild(btn);
  popover(anchor, "Problém · " + v.spz, body);
  body.querySelector("textarea").focus();
}
function servicePopover(anchor, v) {
  const body = document.createElement("div");
  body.innerHTML = `<label class="quick-label">Datum servisu</label><input type="date" class="pop-input" value="${toInputDate(Date.now())}">
    <label class="quick-label">Stav tachometru (km)</label><input type="number" class="pop-input" min="0" step="1" value="${v.km_aktualni != null ? v.km_aktualni : ""}" placeholder="např. 154000">
    <label class="quick-label">Co se dělalo</label><input class="pop-input" value="Servis" maxlength="200">
    <p class="muted-sm">Odpočet do dalšího servisu (${num(v.servis_interval_km || 15000)} km) se tím vynuluje. Zápis uvidí i mechanik.</p>`;
  const btn = document.createElement("button"); btn.className = "pop-btn"; btn.textContent = "Zapsat servis";
  btn.onclick = async () => {
    const [d, k, p] = body.querySelectorAll("input");
    if (k.value !== "" && !(Number.isInteger(Number(k.value)) && Number(k.value) >= 0)) return toast("Stav km musí být celé kladné číslo.");
    btn.disabled = true;
    const ok = await carWrite(v, "POST", "/servis", { datum: d.value, km: k.value === "" ? null : Number(k.value), popis: p.value }, "Servis zapsán, odpočet běží znovu.");
    if (!ok) btn.disabled = false;
  };
  body.appendChild(btn);
  popover(anchor, "Servis proveden · " + v.spz, body);
}

/* ---------- Přetahování ---------- */
function dragAfter(container, y) {
  const els = [...container.querySelectorAll(".card:not(.dragging)")];
  return els.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child }; return closest; }, { offset: -Infinity, element: null }).element;
}
function commitCardOrder() {
  const b = getBoard(); if (!b || b.virtual) { renderBoard(); return; }
  const placements = {};
  document.querySelectorAll(".list").forEach((listEl) => { placements[listEl.dataset.listId] = [...listEl.querySelectorAll(".card")].map((c) => c.dataset.cardId); });
  mutate("POST", "/boards/" + b.id + "/reorder", { placements });
}
function commitListOrder() {
  const b = getBoard(); if (!b || !isAdmin()) { renderBoard(); return; }
  const listOrder = [...document.querySelectorAll(".list")].map((l) => l.dataset.listId);
  mutate("POST", "/boards/" + b.id + "/reorder", { listOrder });
}

/* ---------- Přidání karty / seznamu ---------- */
function openCardComposer(wrap, list, addBtn) {
  addBtn.style.display = "none";
  const composer = document.createElement("div"); composer.className = "composer";
  composer.innerHTML = `<textarea placeholder="Zadejte název karty…" rows="2"></textarea><div class="composer-actions"><button class="add">Přidat kartu</button><button class="cancel">×</button></div>`;
  wrap.insertBefore(composer, addBtn);
  const ta = composer.querySelector("textarea"); ta.focus();
  const close = () => { composer.remove(); addBtn.style.display = ""; };
  const add = async () => { const title = ta.value.trim(); if (!title) return close();
    try { await mutate("POST", "/lists/" + list.id + "/cards", { title }); } catch (e) { return; }
    const fresh = document.querySelector(`.list[data-list-id="${list.id}"]`); if (fresh) openCardComposer(fresh, list, fresh.querySelector(".add-card-btn")); };
  composer.querySelector(".add").onclick = add; composer.querySelector(".cancel").onclick = close;
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } if (e.key === "Escape") close(); });
}
el("addListBtn").onclick = () => { const b = getBoard(); if (!b) return; const title = prompt("Název seznamu:", "Nový seznam"); if (!title) return; mutate("POST", "/boards/" + b.id + "/lists", { title: title.trim() }); };

/* ---------- Menu seznamu ---------- */
function openListMenu(anchor, list) {
  const body = document.createElement("div");
  const mk = (label, fn) => { const r = document.createElement("div"); r.className = "pop-row"; r.textContent = label; r.onclick = () => { closePopover(); fn(); }; body.appendChild(r); };
  mk("Přidat kartu", () => { const w = document.querySelector(`.list[data-list-id="${list.id}"]`); openCardComposer(w, list, w.querySelector(".add-card-btn")); });
  mk("Seřadit podle názvu", () => mutate("POST", "/lists/" + list.id + "/sort", { by: "name" }));
  mk("Seřadit podle nejnovějších", () => mutate("POST", "/lists/" + list.id + "/sort", { by: "new" }));
  mk("Seřadit podle termínu", () => mutate("POST", "/lists/" + list.id + "/sort", { by: "due" }));
  mk(list.collapsed ? "Rozbalit seznam" : "Sbalit seznam", () => mutate("PATCH", "/lists/" + list.id, { collapsed: !list.collapsed }));
  if (isAdmin()) {
    mk("Kopírovat seznam", () => mutate("POST", "/lists/" + list.id + "/copy"));
    mk("Archivovat všechny karty", () => mutate("POST", "/lists/" + list.id + "/archive-cards"));
    mk("Archivovat seznam", () => mutate("PATCH", "/lists/" + list.id, { archived: true }));
  }
  popover(anchor, "Akce seznamu", body);
}

/* ============================================================
   Popover
   ============================================================ */
function popover(anchor, title, bodyEl) {
  const pop = el("popover"); pop.innerHTML = "";
  const header = document.createElement("div"); header.className = "popover-header"; header.innerHTML = `<span>${escapeHtml(title)}</span>`;
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
   Detail karty
   ============================================================ */
function openCard(listId, cardId) { activeRef = { listId, cardId }; if (!getActive()) { activeRef = null; return; } renderModal(); el("modalOverlay").hidden = false; }
function getActive() { const b = getBoard(); if (!b || !activeRef) return null; for (const l of b.lists) { const c = l.cards.find((x) => x.id === activeRef.cardId); if (c) return { list: l, card: c }; } return null; }
function closeModal() { el("modalOverlay").hidden = true; activeRef = null; renderBoard(); }
function closeModalSilent() { el("modalOverlay").hidden = true; activeRef = null; }

/* debounce uložení karty (optimisticky) */
let cardTimers = {};
function saveCard(card) {
  const payload = { title: card.title, desc: card.desc, labelIds: card.labelIds, memberIds: card.memberIds, due: card.due, start: card.start, cover: card.cover, checklists: card.checklists, attachments: card.attachments, comments: card.comments, archived: card.archived };
  clearTimeout(cardTimers[card.id]);
  cardTimers[card.id] = setTimeout(async () => {
    try { const j = await api("PUT", "/cards/" + card.id, payload); if (j && j.me) { me = j.me; updateUserUI(); } setSync("online", "Uloženo"); }
    catch (e) { if (!e.unauth) setSync("offline", "Nelze uložit"); }
  }, 350);
}

function renderModal() {
  const a = getActive(); if (!a) return closeModalSilent();
  const { list, card } = a; const board = getBoard();
  const cover = el("modalCover");
  if (card.cover && card.cover.type === "color") { cover.hidden = false; cover.style.background = card.cover.value; } else cover.hidden = true;
  el("cardTitleInput").value = card.title;
  el("cardTitleInput").readOnly = false;
  const where = card._origin ? `${escapeHtml(card._origin.boardTitle)} · ${escapeHtml(card._origin.listTitle)}` : escapeHtml(list.title);
  el("cardListName").innerHTML = `<span class="list-dot" style="background:${listDot(card._origin ? card._origin.listTitle : list.title)}"></span>${card._origin ? "" : escapeHtml(board.title) + " · "}<b>${where}</b>`;

  const quick = el("cardQuickRow"); quick.innerHTML = "";
  { const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Řešitelé</div>`;
    const v = document.createElement("div"); v.className = "quick-values"; card.memberIds.forEach((id) => { const m = getMember(id); if (m) v.appendChild(avatarEl(m, "lg")); });
    const addM = document.createElement("button"); addM.className = "avatar-add"; addM.innerHTML = icon("plus", 14); addM.title = "Přidat řešitele"; addM.setAttribute("aria-label", addM.title); addM.onclick = (e) => memberPopover(e.currentTarget, card);
    v.appendChild(addM); g.appendChild(v); quick.appendChild(g); }
  if (card.labelIds.length) { const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Štítky</div>`;
    const v = document.createElement("div"); v.className = "quick-values"; card.labelIds.forEach((id) => { const lab = board.labels.find((l) => l.id === id); if (!lab) return;
      const s = document.createElement("span"); s.className = "card-label tall"; s.style.background = lab.color; s.style.minWidth = "48px"; s.textContent = lab.name || ""; v.appendChild(s); }); g.appendChild(v); quick.appendChild(g); }
  if (card.due) { const g = document.createElement("div"); g.className = "quick-group"; g.innerHTML = `<div class="quick-label">Termín</div>`;
    const v = document.createElement("div"); v.className = "quick-values"; const st = dueState(card.due); const cls = st === "overdue" ? "due-overdue" : st === "soon" ? "due-soon" : st === "done" ? "due-done" : "";
    const pill = document.createElement("span"); pill.className = "card-badge " + cls; pill.style.fontSize = "13px"; pill.style.padding = "4px 8px";
    pill.innerHTML = `<input type="checkbox" ${card.due.done ? "checked" : ""}/> ${escapeHtml(fmtDue(card.due.date))} ${st === "overdue" ? "(po termínu)" : st === "done" ? "(hotovo)" : ""}`;
    pill.querySelector("input").onchange = (e) => { card.due.done = e.target.checked; saveCard(card); renderModal(); renderBoard(); };
    v.appendChild(pill); g.appendChild(v); quick.appendChild(g); }
  renderModalBody(card); renderModalSide(card);
}
function renderModalBody(card) {
  const body = el("modalBody"); body.innerHTML = "";
  body.insertAdjacentHTML("beforeend", `<div class="modal-label">${icon("alignLeft")} Popis</div>`);
  const descWrap = document.createElement("div"); descWrap.className = "section-body";
  const rendered = document.createElement("div"); rendered.className = "desc-rendered" + (card.desc ? "" : " placeholder"); rendered.textContent = card.desc || "Přidejte podrobnější popis…";
  rendered.onclick = () => { const ta = document.createElement("textarea"); ta.className = "card-desc-input"; ta.value = card.desc || "";
    const actions = document.createElement("div"); actions.className = "composer-actions"; actions.innerHTML = `<button class="save">Uložit</button><button class="cancel">×</button>`;
    descWrap.innerHTML = ""; descWrap.append(ta, actions); ta.focus();
    actions.querySelector(".save").onclick = () => { card.desc = ta.value; saveCard(card); renderModalBody(card); renderBoard(); };
    actions.querySelector(".cancel").onclick = () => renderModalBody(card); };
  descWrap.appendChild(rendered); body.appendChild(descWrap);

  (card.checklists || []).forEach((cl) => body.appendChild(renderChecklist(card, cl)));

  if ((card.attachments || []).length) {
    body.insertAdjacentHTML("beforeend", `<div class="modal-label">${icon("clip")} Přílohy</div>`);
    const aw = document.createElement("div"); aw.className = "section-body";
    card.attachments.forEach((att) => { const rowEl = document.createElement("div"); rowEl.className = "attachment";
      const thumb = document.createElement("div"); thumb.className = "thumb"; if (att.type && att.type.startsWith("image/")) thumb.innerHTML = `<img src="${att.url}" alt=""/>`; else thumb.innerHTML = icon("clip", 18);
      const main = document.createElement("div"); main.className = "a-main"; main.innerHTML = `<div class="a-name">${escapeHtml(att.name)}</div><a href="${att.url}" target="_blank" rel="noopener">Otevřít</a>`;
      const rm = document.createElement("button"); rm.className = "remove"; rm.textContent = "×"; rm.onclick = () => { card.attachments = card.attachments.filter((a) => a.id !== att.id); saveCard(card); renderModalBody(card); renderBoard(); };
      rowEl.append(thumb, main, rm); aw.appendChild(rowEl); });
    body.appendChild(aw);
  }

  body.insertAdjacentHTML("beforeend", `<div class="modal-label">${icon("message")} Komentáře a aktivita</div>`);
  const cw = document.createElement("div"); cw.className = "section-body";
  const form = document.createElement("div"); form.className = "inline-form"; form.innerHTML = `<input placeholder="Napsat komentář…" /><button>Uložit</button>`;
  const input = form.querySelector("input");
  const addComment = () => { const t = input.value.trim(); if (!t) return; card.comments.unshift({ id: uid(), memberId: me.id, text: t, ts: Date.now() }); input.value = ""; saveCard(card); renderModalBody(card); renderBoard(); };
  form.querySelector("button").onclick = addComment; input.addEventListener("keydown", (e) => { if (e.key === "Enter") addComment(); }); cw.appendChild(form);
  (card.comments || []).forEach((c) => { const m = getMember(c.memberId) || { name: "Někdo", color: "#888" };
    const rowEl = document.createElement("div"); rowEl.className = "comment"; rowEl.appendChild(avatarEl(m));
    const main = document.createElement("div"); main.className = "c-main";
    main.innerHTML = `<div class="c-head"><span class="c-author">${escapeHtml(m.name)}</span><span class="c-time">${fmtDue(c.ts)}</span></div><div class="c-body">${escapeHtml(c.text)}</div>`;
    if (c.memberId === me.id || isAdmin()) { const del = document.createElement("button"); del.className = "c-del"; del.textContent = "Smazat"; del.onclick = () => { card.comments = card.comments.filter((x) => x.id !== c.id); saveCard(card); renderModalBody(card); renderBoard(); }; main.appendChild(del); }
    rowEl.appendChild(main); cw.appendChild(rowEl); });
  body.appendChild(cw);
}
function renderChecklist(card, cl) {
  const section = document.createElement("div");
  section.dataset.clId = cl.id;
  const done = cl.items.filter((i) => i.done).length; const pct = cl.items.length ? Math.round(done / cl.items.length * 100) : 0;
  const head = document.createElement("div"); head.className = "modal-label"; head.innerHTML = `${icon("check")} <span style="flex:1">${escapeHtml(cl.title)}</span>`;
  const delCl = document.createElement("button"); delCl.className = "c-del"; delCl.textContent = "Smazat"; delCl.onclick = () => { card.checklists = card.checklists.filter((x) => x.id !== cl.id); saveCard(card); renderModalBody(card); renderBoard(); };
  head.appendChild(delCl); section.appendChild(head);
  const bodyWrap = document.createElement("div"); bodyWrap.className = "section-body";
  const prog = document.createElement("div"); prog.className = "progress"; prog.innerHTML = `<span class="progress-pct">${pct}%</span><div class="progress-bar"><div class="progress-fill ${pct === 100 ? "full" : ""}" style="width:${pct}%"></div></div>`; bodyWrap.appendChild(prog);
  cl.items.forEach((item) => { const rowEl = document.createElement("div"); rowEl.className = "check-item" + (item.done ? " done" : "");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = item.done; cb.onchange = () => { item.done = cb.checked; saveCard(card); renderModalBody(card); renderBoard(); };
    const txt = document.createElement("span"); txt.className = "txt"; txt.textContent = item.text;
    const rm = document.createElement("button"); rm.className = "remove"; rm.textContent = "×"; rm.onclick = () => { cl.items = cl.items.filter((i) => i.id !== item.id); saveCard(card); renderModalBody(card); renderBoard(); };
    rowEl.append(cb, txt, rm); bodyWrap.appendChild(rowEl); });
  const form = document.createElement("div"); form.className = "checklist-form"; form.innerHTML = `<input placeholder="Přidat položku…" /><button>Přidat</button>`;
  const input = form.querySelector("input");
  const add = () => { const t = input.value.trim(); if (!t) return; cl.items.push({ id: uid(), text: t, done: false }); input.value = ""; saveCard(card); renderModalBody(card); renderBoard(); const fresh = document.querySelector(`#modalBody [data-cl-id="${cl.id}"] .checklist-form input`); if (fresh) fresh.focus(); };
  form.querySelector("button").onclick = add; input.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  bodyWrap.appendChild(form); section.appendChild(bodyWrap); return section;
}
function renderModalSide(card) {
  const side = el("modalSide"); side.innerHTML = "";
  const board = getBoard();
  side.insertAdjacentHTML("beforeend", `<div class="side-title">Přidat na kartu</div>`);
  const mk = (ic, label, fn, cls = "") => { const b = document.createElement("button"); b.className = "side-btn " + cls; b.innerHTML = `<span>${ic}</span><span>${label}</span>`; b.onclick = (e) => fn(e.currentTarget); side.appendChild(b); return b; };
  mk(icon("user"), "Přiřadit lidi", (a) => memberPopover(a, card));
  mk(icon("tag"), "Štítky", (a) => labelPopover(a, card));
  mk(icon("check"), "Úkoly", () => { card.checklists.push({ id: uid(), title: "Úkoly", items: [] }); saveCard(card); renderModalBody(card); });
  mk(icon("clock"), "Termín", (a) => datePopover(a, card));
  mk(icon("clip"), "Příloha", (a) => attachPopover(a, card));
  mk(icon("image"), "Obal", (a) => coverPopover(a, card));
  side.insertAdjacentHTML("beforeend", `<div class="side-title">Akce</div>`);
  if (!board.virtual) { mk(icon("arrowRight"), "Přesunout", (a) => movePopover(a, card)); mk(icon("copy"), "Kopírovat", (a) => copyPopover(a, card)); }
  mk(icon("archive"), "Archivovat", () => { card.archived = true; saveCard(card); closeModal(); });
  mk(icon("trash"), "Smazat", () => { if (confirm(`Smazat kartu „${card.title}“?`)) api("DELETE", "/cards/" + card.id).then((j) => { closeModalSilent(); applyPayload(j); }).catch(() => {}); }, "danger");
}

/* ---------- Popovery polí karty ---------- */
function memberPopover(anchor, card) {
  const body = document.createElement("div");
  state.members.forEach((m) => { const rowEl = document.createElement("div"); rowEl.className = "pop-row"; rowEl.appendChild(avatarEl(m));
    const name = document.createElement("span"); name.textContent = m.name; name.style.flex = "1"; rowEl.appendChild(name);
    if (card.memberIds.includes(m.id)) rowEl.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    rowEl.onclick = () => { card.memberIds = card.memberIds.includes(m.id) ? card.memberIds.filter((x) => x !== m.id) : [...card.memberIds, m.id]; saveCard(card); renderModal(); renderBoard(); memberPopover(anchor, card); };
    body.appendChild(rowEl); });
  popover(anchor, "Přiřadit lidi", body);
}
function labelPopover(anchor, card) {
  const board = getBoard(); const body = document.createElement("div");
  board.labels.forEach((lab) => { const rowEl = document.createElement("div"); rowEl.className = "pop-row";
    const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || "";
    chip.onclick = () => { card.labelIds = card.labelIds.includes(lab.id) ? card.labelIds.filter((x) => x !== lab.id) : [...card.labelIds, lab.id]; saveCard(card); renderModal(); renderBoard(); labelPopover(anchor, card); };
    rowEl.appendChild(chip);
    if (card.labelIds.includes(lab.id)) rowEl.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    if (isAdmin() && !board.virtual) { const edit = document.createElement("button"); edit.innerHTML = icon("edit", 15); edit.style.cssText = "background:none;border:none;cursor:pointer;color:var(--muted);display:inline-flex;align-items:center"; edit.onclick = () => editLabelPopover(anchor, card, lab); rowEl.appendChild(edit); }
    body.appendChild(rowEl); });
  if (isAdmin() && !board.virtual) { const addBtn = document.createElement("button"); addBtn.className = "pop-btn subtle"; addBtn.textContent = "+ Vytvořit nový štítek"; addBtn.onclick = () => editLabelPopover(anchor, card, null); body.appendChild(addBtn); }
  popover(anchor, "Štítky", body);
}
function editLabelPopover(anchor, card, lab) {
  const board = getBoard(); const isNew = !lab; const current = lab || { name: "", color: LABEL_COLORS[0] };
  const body = document.createElement("div");
  const input = document.createElement("input"); input.className = "pop-input"; input.placeholder = "Název štítku"; input.value = current.name; body.appendChild(input);
  const grid = document.createElement("div"); grid.className = "pop-color-grid"; let chosen = current.color;
  LABEL_COLORS.forEach((c) => { const sw = document.createElement("div"); sw.className = "pop-color" + (c === chosen ? " selected" : ""); sw.style.background = c; sw.onclick = () => { chosen = c; grid.querySelectorAll(".pop-color").forEach((x) => x.classList.remove("selected")); sw.classList.add("selected"); }; grid.appendChild(sw); });
  body.appendChild(grid);
  const saveBtn = document.createElement("button"); saveBtn.className = "pop-btn"; saveBtn.textContent = isNew ? "Vytvořit" : "Uložit";
  saveBtn.onclick = async () => { if (isNew) await mutate("POST", "/boards/" + board.id + "/labels", { name: input.value.trim(), color: chosen });
    else await mutate("PATCH", "/boards/" + board.id + "/labels/" + lab.id, { name: input.value.trim(), color: chosen }); renderModal(); const anc = el("modalSide").querySelector(".side-btn:nth-child(3)"); if (anc) labelPopover(anc, getActive().card); };
  body.appendChild(saveBtn);
  if (!isNew) { const del = document.createElement("button"); del.className = "pop-btn subtle"; del.textContent = "Smazat štítek"; del.onclick = async () => { await mutate("DELETE", "/boards/" + board.id + "/labels/" + lab.id); renderModal(); closePopover(); }; body.appendChild(del); }
  popover(anchor, isNew ? "Nový štítek" : "Upravit štítek", body);
}
function datePopover(anchor, card) {
  const body = document.createElement("div"); const has = !!card.due; const base = card.due ? card.due.date : Date.now() + 864e5;
  body.innerHTML = `<label class="quick-label">Termín</label><input type="date" class="pop-input" id="dpDate" value="${toInputDate(base)}"><label class="quick-label">Čas</label><input type="time" class="pop-input" id="dpTime" value="${toInputTime(base)}">`;
  const saveBtn = document.createElement("button"); saveBtn.className = "pop-btn"; saveBtn.textContent = "Uložit";
  saveBtn.onclick = () => { const dv = body.querySelector("#dpDate").value; const tv = body.querySelector("#dpTime").value || "12:00"; if (!dv) return;
    card.due = { date: new Date(`${dv}T${tv}`).getTime(), done: card.due ? card.due.done : false }; saveCard(card); renderModal(); renderBoard(); closePopover(); };
  body.appendChild(saveBtn);
  if (has) { const rm = document.createElement("button"); rm.className = "pop-btn subtle"; rm.textContent = "Odebrat termín"; rm.onclick = () => { card.due = null; saveCard(card); renderModal(); renderBoard(); closePopover(); }; body.appendChild(rm); }
  popover(anchor, "Termín", body);
}
function attachPopover(anchor, card) {
  const body = document.createElement("div");
  body.innerHTML = `<label class="quick-label">Odkaz (URL)</label><input class="pop-input" id="atUrl" placeholder="https://…"><input class="pop-input" id="atName" placeholder="Zobrazený název (nepovinné)">`;
  const addLink = document.createElement("button"); addLink.className = "pop-btn"; addLink.textContent = "Připojit odkaz";
  addLink.onclick = () => { const url = body.querySelector("#atUrl").value.trim(); if (!url) return; const name = body.querySelector("#atName").value.trim() || url; card.attachments.push({ id: uid(), name, url, isLink: true }); saveCard(card); renderModalBody(card); renderBoard(); closePopover(); };
  body.appendChild(addLink);
  body.insertAdjacentHTML("beforeend", `<label class="quick-label" style="margin-top:10px;display:block">Nebo nahrát soubor</label>`);
  const file = document.createElement("input"); file.type = "file"; file.className = "pop-input";
  file.onchange = () => { const f = file.files[0]; if (!f) return; if (f.size > 1.5 * 1024 * 1024) alert("Soubor je velký (>1,5 MB). Raději připojte odkaz.");
    const reader = new FileReader(); reader.onload = () => { card.attachments.push({ id: uid(), name: f.name, url: reader.result, type: f.type }); saveCard(card); renderModalBody(card); renderBoard(); closePopover(); }; reader.readAsDataURL(f); };
  body.appendChild(file); popover(anchor, "Příloha", body);
}
function coverPopover(anchor, card) {
  const body = document.createElement("div"); const grid = document.createElement("div"); grid.className = "pop-color-grid";
  LABEL_COLORS.forEach((c) => { const sw = document.createElement("div"); sw.className = "pop-color" + (card.cover && card.cover.value === c ? " selected" : ""); sw.style.background = c; sw.onclick = () => { card.cover = { type: "color", value: c }; saveCard(card); renderModal(); renderBoard(); coverPopover(anchor, card); }; grid.appendChild(sw); });
  body.appendChild(grid);
  const rm = document.createElement("button"); rm.className = "pop-btn subtle"; rm.textContent = "Odebrat obal"; rm.onclick = () => { card.cover = null; saveCard(card); renderModal(); renderBoard(); closePopover(); }; body.appendChild(rm);
  popover(anchor, "Obal", body);
}
function movePopover(anchor, card) {
  const board = getBoard(); const body = document.createElement("div");
  board.lists.filter((l) => !l.archived).forEach((l) => { const rowEl = document.createElement("div"); rowEl.className = "pop-row"; rowEl.textContent = l.title;
    const a = getActive(); if (a && l.id === a.list.id) rowEl.insertAdjacentHTML("beforeend", `<span class="check">•</span>`);
    rowEl.onclick = async () => { closePopover(); await api("POST", "/cards/" + card.id + "/move", { toListId: l.id }).then((j) => { activeRef.listId = l.id; applyPayload(j); }); }; body.appendChild(rowEl); });
  popover(anchor, "Přesunout do seznamu", body);
}
function copyPopover(anchor, card) {
  const body = document.createElement("div"); const input = document.createElement("input"); input.className = "pop-input"; input.value = card.title + " (kopie)"; body.appendChild(input);
  const btn = document.createElement("button"); btn.className = "pop-btn"; btn.textContent = "Vytvořit kartu"; btn.onclick = () => { closePopover(); mutate("POST", "/cards/" + card.id + "/copy", { title: input.value.trim() }); }; body.appendChild(btn);
  popover(anchor, "Kopírovat kartu", body);
}

/* ---------- Napojení modalu ---------- */
el("modalClose").onclick = closeModal;
el("modalOverlay").addEventListener("click", (e) => { if (e.target === el("modalOverlay")) closeModal(); });
el("cardTitleInput").addEventListener("input", (e) => { const a = getActive(); if (!a) return; a.card.title = e.target.value; saveCard(a.card); });
el("cardTitleInput").addEventListener("blur", () => renderBoard());

/* ============================================================
   Boční menu nástěnky (drawer)
   ============================================================ */
let drawerStack = [];
function openDrawer(view) { drawerStack = [view]; renderDrawer(); el("drawerOverlay").hidden = false; }
function pushDrawer(view) { drawerStack.push(view); renderDrawer(); }
function popDrawer() { drawerStack.pop(); renderDrawer(); }
function closeDrawer() { el("drawerOverlay").hidden = true; drawerStack = []; }
function renderDrawer() {
  const view = drawerStack[drawerStack.length - 1]; el("drawerBack").hidden = drawerStack.length <= 1;
  const bodyEl = el("drawerBody"); bodyEl.innerHTML = ""; const titleEl = el("drawerTitle"); const board = getBoard();
  const add = (ic, label, fn) => { const r = document.createElement("div"); r.className = "drawer-row"; r.innerHTML = `<span class="ico">${ic}</span><span>${label}</span>`; r.onclick = fn; bodyEl.appendChild(r); };
  if (view === "main") {
    titleEl.textContent = "Menu";
    if (isAdmin()) { add(icon("image"), "Barva nástěnky", () => pushDrawer("bg")); add(icon("tag"), "Štítky", () => pushDrawer("labels")); }
    add(icon("filter"), "Filtrovat karty", () => pushDrawer("filter"));
    bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Položky</div>`);
    add(icon("activity"), "Aktivita", () => pushDrawer("activity"));
    if (isAdmin()) {
      bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Nástěnka (admin)</div>`);
      add(icon("users"), "Kdo vidí tuto nástěnku", () => pushDrawer("access"));
      add(icon("archive"), "Archivovat nástěnku", () => { mutate("POST", "/boards/" + board.id + "/archive"); closeDrawer(); showBoards(); });
      add(icon("trash"), "Smazat nástěnku", () => { if (confirm(`Smazat nástěnku „${board.title}“?`)) { mutate("DELETE", "/boards/" + board.id); closeDrawer(); showBoards(); } });
    }
  } else if (view === "bg") {
    titleEl.textContent = "Barva nástěnky"; const grid = document.createElement("div"); grid.className = "bg-grid";
    BOARD_BGS.forEach((bg) => { const sw = document.createElement("div"); sw.className = "bg-swatch" + (board.bg.value === bg.value ? " selected" : ""); if (bg.type === "gradient") sw.style.backgroundImage = bg.value; else sw.style.background = bg.value; sw.onclick = () => mutate("PATCH", "/boards/" + board.id, { bg }); grid.appendChild(sw); });
    bodyEl.appendChild(grid);
  } else if (view === "labels") {
    titleEl.textContent = "Štítky";
    board.labels.forEach((lab) => { const rowEl = document.createElement("div"); rowEl.className = "drawer-row"; const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || "(bez názvu)"; rowEl.appendChild(chip); bodyEl.appendChild(rowEl); });
    bodyEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Štítky upravíte na kartě → Štítky.</div>`);
  } else if (view === "access") {
    titleEl.textContent = "Přístup k nástěnce";
    bodyEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Spravujte v sekci Správa uživatelů.</div>`);
    const b = document.createElement("button"); b.className = "pop-btn"; b.textContent = "Otevřít Správu uživatelů"; b.onclick = () => { closeDrawer(); showAdmin(); }; bodyEl.appendChild(b);
  } else if (view === "filter") {
    renderFilterDrawer(bodyEl, titleEl, board);
  } else if (view === "activity") {
    titleEl.textContent = "Aktivita";
    if (!board.activity || !board.activity.length) bodyEl.innerHTML = `<div class="empty-note">Zatím žádná aktivita.</div>`;
    (board.activity || []).forEach((a) => { const rowEl = document.createElement("div"); rowEl.className = "activity-item"; rowEl.innerHTML = `${escapeHtml(a.text)} · <span>${fmtDue(a.ts)}</span>`; bodyEl.appendChild(rowEl); });
  }
}
function renderFilterDrawer(bodyEl, titleEl, board) {
  titleEl.textContent = "Filtr";
  bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Štítky</div>`);
  board.labels.forEach((lab) => { const rowEl = document.createElement("div"); rowEl.className = "drawer-row"; const chip = document.createElement("div"); chip.className = "pop-label-chip"; chip.style.background = lab.color; chip.textContent = lab.name || ""; rowEl.appendChild(chip);
    if (filter.labels.includes(lab.id)) rowEl.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    rowEl.onclick = () => { filter.labels = filter.labels.includes(lab.id) ? filter.labels.filter((x) => x !== lab.id) : [...filter.labels, lab.id]; updateFilterBtn(); renderBoard(); renderDrawer(); }; bodyEl.appendChild(rowEl); });
  bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Přiřazení</div>`);
  state.members.forEach((m) => { const rowEl = document.createElement("div"); rowEl.className = "drawer-row"; rowEl.appendChild(avatarEl(m)); const n = document.createElement("span"); n.style.flex = "1"; n.textContent = m.name; rowEl.appendChild(n);
    if (filter.members.includes(m.id)) rowEl.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    rowEl.onclick = () => { filter.members = filter.members.includes(m.id) ? filter.members.filter((x) => x !== m.id) : [...filter.members, m.id]; updateFilterBtn(); renderBoard(); renderDrawer(); }; bodyEl.appendChild(rowEl); });
  bodyEl.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Termín</div>`);
  [["none", "Bez termínu"], ["overdue", "Po termínu"], ["soon", "Brzy termín"], ["done", "Hotové"]].forEach(([k, label]) => { const rowEl = document.createElement("div"); rowEl.className = "drawer-row"; rowEl.innerHTML = `<span class="ico">${icon("clock")}</span><span style="flex:1">${label}</span>`;
    if (filter.due === k) rowEl.insertAdjacentHTML("beforeend", `<span class="check">✓</span>`);
    rowEl.onclick = () => { filter.due = filter.due === k ? null : k; updateFilterBtn(); renderBoard(); renderDrawer(); }; bodyEl.appendChild(rowEl); });
  const clear = document.createElement("button"); clear.className = "pop-btn subtle"; clear.textContent = "Zrušit filtry"; clear.onclick = () => { filter = { labels: [], members: [], due: null }; updateFilterBtn(); renderBoard(); renderDrawer(); }; bodyEl.appendChild(clear);
}

/* ============================================================
   Správa uživatelů (admin)
   ============================================================ */
function showAdmin() { if (!isAdmin()) return; viewMode = "admin"; hideIntegration(); el("boardsView").hidden = true; el("boardView").hidden = true; el("adminView").hidden = false;
  el("boardTitle").textContent = ""; el("boardStar").hidden = true; el("searchWrap").hidden = true; el("filterBtn").hidden = true; el("menuBtn").hidden = true;
  el("newCardBtn").hidden = true; el("boardMembers").hidden = true;
  setHeader({ crumb: "Pracovní prostor", title: "Správa uživatelů" }); renderAdmin(); renderSidebar(); }
function renderAdmin() {
  const box = el("adminUsers"); box.innerHTML = "";
  (usersAdmin || []).forEach((u) => {
    const card = document.createElement("div"); card.className = "admin-user";
    const head = document.createElement("div"); head.className = "admin-user-head";
    head.appendChild(avatarEl(u, "lg"));
    const info = document.createElement("div"); info.style.flex = "1";
    info.innerHTML = `<div class="admin-user-name">${escapeHtml(u.name)} <span class="admin-role ${u.role}">${u.role === "admin" ? "admin" : "manažer"}</span></div><div class="admin-user-login">${escapeHtml(u.username)}</div>`;
    head.appendChild(info);
    const ren = document.createElement("button"); ren.className = "pop-btn subtle"; ren.style.cssText = "width:auto;margin:0;padding:6px 10px"; ren.innerHTML = icon("edit", 15) + " Jméno";
    ren.onclick = () => { const nn = prompt("Jméno uživatele:", u.name); if (nn && nn.trim() && nn.trim() !== u.name) mutate("PATCH", "/users/" + u.id, { name: nn.trim() }); };
    head.appendChild(ren);
    const pw = document.createElement("button"); pw.className = "pop-btn subtle"; pw.style.cssText = "width:auto;margin:0;padding:6px 10px"; pw.innerHTML = icon("key", 15) + " Heslo";
    pw.onclick = () => { const np = prompt(`Nové heslo pro ${u.name}:`); if (np) api("POST", "/users/" + u.id + "/password", { password: np }).then(() => toast("Heslo změněno.")).catch(() => {}); };
    head.appendChild(pw);
    if (u.id !== me.id) { const roleBtn = document.createElement("button"); roleBtn.className = "pop-btn subtle"; roleBtn.style.cssText = "width:auto;margin:0;padding:6px 10px"; roleBtn.textContent = u.role === "admin" ? "→ manažer" : "→ admin"; roleBtn.onclick = () => mutate("PATCH", "/users/" + u.id, { role: u.role === "admin" ? "manager" : "admin" }); head.appendChild(roleBtn);
      const del = document.createElement("button"); del.className = "pop-btn subtle"; del.style.cssText = "width:auto;margin:0;padding:6px 10px"; del.innerHTML = icon("trash", 15); del.title = "Smazat"; del.onclick = () => { if (confirm(`Smazat uživatele ${u.name}?`)) mutate("DELETE", "/users/" + u.id); }; head.appendChild(del); }
    card.appendChild(head);

    if (u.role !== "admin") {
      const acc = document.createElement("div"); acc.className = "admin-access";
      acc.insertAdjacentHTML("beforeend", `<div class="admin-access-title">Vidí nástěnky a seznamy:</div>`);
      (allBoards || []).forEach((b) => {
        const access = u.access[b.id]; const sees = !!access;
        const brow = document.createElement("div"); brow.className = "admin-board-access";
        const top = document.createElement("label"); top.className = "admin-check";
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = sees;
        cb.onchange = () => { const na = JSON.parse(JSON.stringify(u.access)); if (cb.checked) na[b.id] = { hidden: [] }; else delete na[b.id]; mutate("PATCH", "/users/" + u.id, { access: na }); };
        top.append(cb, document.createTextNode(" " + b.title)); brow.appendChild(top);
        if (sees) {
          const tabsWrap = document.createElement("div"); tabsWrap.className = "admin-tab-access";
          tabsWrap.insertAdjacentHTML("beforeend", `<span class="admin-sub-label">Záložky:</span>`);
          const tabChips = document.createElement("div"); tabChips.className = "admin-list-hide";
          Object.entries(TAB_LABELS).forEach(([key, label]) => {
            const hidden = (access.hiddenTabs || []).includes(key);
            const lbl = document.createElement("label"); lbl.className = "admin-hide-chip" + (hidden ? " hidden" : "");
            const tc = document.createElement("input"); tc.type = "checkbox"; tc.checked = !hidden; // zaškrtnuto = vidí
            tc.onchange = () => { const na = JSON.parse(JSON.stringify(u.access)); const h = new Set(na[b.id].hiddenTabs || []); if (tc.checked) h.delete(key); else h.add(key); na[b.id].hiddenTabs = [...h]; mutate("PATCH", "/users/" + u.id, { access: na }); };
            lbl.append(tc, document.createTextNode(" " + label)); tabChips.appendChild(lbl);
          });
          tabsWrap.appendChild(tabChips); brow.appendChild(tabsWrap);
        }
        if (sees) { const lists = document.createElement("div"); lists.className = "admin-list-hide";
          lists.insertAdjacentHTML("beforeend", `<span class="admin-sub-label">Seznamy:</span>`);
          b.lists.forEach((l) => { const hidden = (access.hidden || []).includes(l.id); const lbl = document.createElement("label"); lbl.className = "admin-hide-chip" + (hidden ? " hidden" : "");
            const lc = document.createElement("input"); lc.type = "checkbox"; lc.checked = !hidden; // zaškrtnuto = vidí
            lc.onchange = () => { const na = JSON.parse(JSON.stringify(u.access)); const h = new Set(na[b.id].hidden || []); if (lc.checked) h.delete(l.id); else h.add(l.id); na[b.id].hidden = [...h]; mutate("PATCH", "/users/" + u.id, { access: na }); };
            lbl.append(lc, document.createTextNode(" " + l.title)); lists.appendChild(lbl); });
          brow.appendChild(lists); }
        acc.appendChild(brow);
      });
      card.appendChild(acc);
    }
    box.appendChild(card);
  });
}
el("addUserBtn").onclick = () => {
  const username = prompt("Uživatelské jméno (bez mezer):"); if (!username) return;
  const name = prompt("Celé jméno:", username) || username;
  const password = prompt("Počáteční heslo (min. 4 znaky):", "heslo123"); if (!password) return;
  mutate("POST", "/users", { username: username.trim(), name: name.trim(), password });
};

/* ============================================================
   Horní lišta + účet
   ============================================================ */
el("homeBtn").onclick = () => { closeDrawer(); showBoards(); };
el("menuBtn").onclick = () => openDrawer("main");
el("drawerClose").onclick = closeDrawer; el("drawerBack").onclick = popDrawer;
el("drawerOverlay").addEventListener("click", (e) => { if (e.target === el("drawerOverlay")) closeDrawer(); });
el("filterBtn").onclick = () => openDrawer("filter");
el("tasksBtn").onclick = openMyTasks;
el("navBoards").onclick = () => { closeDrawer(); showBoards(); };
el("navTasks").onclick = openMyTasks;
el("navAdmin").onclick = showAdmin;
el("newBoardBtn").onclick = createBoard;
el("newCardBtn").onclick = () => { const w = document.querySelector(".list:not(.collapsed)"); if (!w) return toast("Nejdřív vytvořte seznam.");
  const list = findList(w.dataset.listId); const btn = w.querySelector(".add-card-btn"); if (list && btn) { w.scrollIntoView({ inline: "start", behavior: "smooth" }); openCardComposer(w, list, btn); } };
function updateFilterBtn() { const n = filter.labels.length + filter.members.length + (filter.due ? 1 : 0); el("filterLabel").textContent = n ? `Filtr (${n})` : "Filtr"; el("filterBtn").classList.toggle("active", n > 0); }
el("themeBtn").onclick = () => { state.theme = state.theme === "dark" ? "light" : "dark"; if (me) me.theme = state.theme; applyTheme(); api("POST", "/account/theme", { theme: state.theme }).catch(() => {}); };
el("searchInput").addEventListener("input", renderBoard);
el("boardStar").onclick = () => { const b = getBoard(); if (isAdmin() && !b.virtual) mutate("PATCH", "/boards/" + b.id, { starred: !b.starred }); };
el("boardTitle").addEventListener("blur", () => { const b = getBoard(); if (!b || !isAdmin() || b.virtual) return; const t = el("boardTitle").textContent.trim() || b.title; if (t !== b.title) mutate("PATCH", "/boards/" + b.id, { title: t }); });
el("boardTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el("boardTitle").blur(); } });

el("sideUser").onclick = (e) => el("userBtn").onclick(e);
el("userBtn").onclick = (e) => {
  const anchorEl = e.currentTarget;
  const body = document.createElement("div");
  const info = document.createElement("div"); info.className = "pop-user"; info.innerHTML = `<b>${escapeHtml(me.name)}</b><br><span style="color:var(--muted);font-size:12px">${escapeHtml(me.username)} · ${me.role === "admin" ? "admin" : "manažer"}</span>`; body.appendChild(info);
  const nt = document.createElement("div"); nt.className = "pop-row"; nt.innerHTML = `${icon("bell", 16)} <span>Upozornění</span>`; nt.onclick = () => notifyPopover(anchorEl); body.appendChild(nt);
  const pw = document.createElement("div"); pw.className = "pop-row"; pw.innerHTML = `${icon("key", 16)} <span>Změnit heslo</span>`; pw.onclick = () => { closePopover(); changePassword(); }; body.appendChild(pw);
  if (isAdmin()) { const ad = document.createElement("div"); ad.className = "pop-row"; ad.innerHTML = `${icon("users", 16)} <span>Správa uživatelů</span>`; ad.onclick = () => { closePopover(); showAdmin(); }; body.appendChild(ad); }
  const out = document.createElement("div"); out.className = "pop-row"; out.innerHTML = `${icon("logout", 16)} <span>Odhlásit se</span>`; out.onclick = () => { closePopover(); logout(); }; body.appendChild(out);
  popover(e.currentTarget, "Účet", body);
};
function changePassword() {
  const current = prompt("Současné heslo:"); if (current === null) return;
  const next = prompt("Nové heslo (min. 4 znaky):"); if (!next) return;
  api("POST", "/account/password", { current, next }).then(() => toast("Heslo změněno.")).catch(() => {});
}
async function logout() { try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch (e) {} if (evtSource) { evtSource.close(); evtSource = null; } me = null; state = null; showLogin(); }

document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!el("popover").hidden) return closePopover(); if (!el("personOverlay").hidden) return closePerson(); if (!el("modalOverlay").hidden) return closeModal(); if (!el("drawerOverlay").hidden) return closeDrawer(); } });

/* ============================================================
   Push upozornění
   ============================================================ */
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
let pushState = { supported: false, subscribed: false, permission: "default" };

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW", e));
  navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "open-url") openFromUrl(e.data.url); });
}
async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return null;
  return reg.pushManager.getSubscription();
}
async function refreshPushState() {
  const supported = pushSupported(); let subscribed = false;
  try { const sub = await currentSubscription(); subscribed = !!(sub && me && (me.pushDevices || []).includes(sub.endpoint)); } catch (e) {}
  pushState = { supported, subscribed, permission: supported ? Notification.permission : "unsupported" };
  return pushState;
}
function b64ToBytes(b64) { const pad = "=".repeat((4 - (b64.length % 4)) % 4); const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); }
async function enablePush() {
  if (!pushSupported()) return toast("Tento prohlížeč upozornění nepodporuje.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { await refreshPushState(); return toast("Upozornění nejsou povolená."); }
  try {
    const { publicKey } = await api("GET", "/push/key"); if (!publicKey) return toast("Server upozornění zatím nepodporuje.");
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    applyPayload(await api("POST", "/push/subscribe", { subscription: sub.toJSON() }));
    await refreshPushState(); toast("Upozornění zapnuta na tomto zařízení.");
  } catch (e) { if (!e.unauth) toast("Upozornění se nepodařilo zapnout."); }
}
async function disablePush() {
  try { const sub = await currentSubscription(); if (sub) { applyPayload(await api("POST", "/push/unsubscribe", { endpoint: sub.endpoint })); await sub.unsubscribe(); } } catch (e) {}
  await refreshPushState(); toast("Upozornění na tomto zařízení vypnuta.");
}
function pushHelpHtml() {
  if (isIOS() && !isStandalone()) return `<b>Na iPhonu nejdřív přidej Trellite na plochu:</b> v Safari klepni na <b>Sdílet</b> → <b>Přidat na plochu</b>, otevři Trellite z ikony na ploše a upozornění zapni tam. Vyžaduje iOS 16.4 nebo novější.`;
  if (!pushState.supported) return "Tento prohlížeč push upozornění nepodporuje.";
  if (pushState.permission === "denied") return isIOS() ? "Upozornění jsou zablokovaná. Povol je v Nastavení → Oznámení → Trellite." : "Upozornění jsou v prohlížeči zablokovaná. Povol je v nastavení webu.";
  return "";
}
async function notifyPopover(anchor) {
  await refreshPushState();
  const body = document.createElement("div"); body.className = "notify-pop";
  const help = pushHelpHtml();
  const status = document.createElement("div"); status.className = "notify-status" + (pushState.subscribed ? " on" : "");
  status.innerHTML = pushState.subscribed ? `<span class="notify-dot"></span>Zapnuto na tomto zařízení` : help ? `<span>${help}</span>` : `<span class="notify-dot"></span>Na tomto zařízení vypnuto`;
  body.appendChild(status);
  if (!help || pushState.subscribed) {
    if (pushState.subscribed) {
      const test = document.createElement("button"); test.className = "pop-btn"; test.textContent = "Poslat zkušební upozornění";
      test.onclick = () => api("POST", "/push/test").then(() => toast("Odesláno. Mělo by dorazit během pár vteřin.")).catch(() => {});
      const off = document.createElement("button"); off.className = "pop-btn subtle"; off.textContent = "Vypnout na tomto zařízení";
      off.onclick = async () => { await disablePush(); notifyPopover(anchor); };
      body.append(test, off);
    } else {
      const on = document.createElement("button"); on.className = "pop-btn"; on.textContent = "Zapnout na tomto zařízení";
      on.onclick = async () => { await enablePush(); notifyPopover(anchor); renderPushHint(); };
      body.appendChild(on);
    }
  }
  body.insertAdjacentHTML("beforeend", `<div class="drawer-section-title">Upozornit mě na</div>`);
  const prefs = Object.assign({ assign: true, comment: true, due: true, fault: true }, me.notify || {});
  [["assign", "Nový přiřazený úkol"], ["comment", "Komentář na mé kartě"], ["due", "Blížící se termín a po termínu"], ["fault", "Postup oprav závad, které jsem nahlásil"]].forEach(([k, label]) => {
    const row = document.createElement("label"); row.className = "notify-opt";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = prefs[k] !== false;
    cb.onchange = () => mutate("POST", "/account/notify", { [k]: cb.checked }).catch(() => {});
    row.append(cb, document.createTextNode(label)); body.appendChild(row);
  });
  const n = (me.pushDevices || []).length;
  body.insertAdjacentHTML("beforeend", `<div class="notify-foot">${n ? `Zapnuto na ${n} ${plural(n, "zařízení", "zařízeních", "zařízeních")}.` : "Zatím není zapnuto na žádném zařízení."}</div>`);
  popover(anchor, "Upozornění", body);
}
function renderPushHint() {
  let hint = el("pushHint");
  let dismissed = false; try { dismissed = localStorage.getItem("pushHintDismissed") === "1"; } catch (e) {}
  const show = me && !dismissed && !pushState.subscribed && pushState.permission !== "denied" && (pushState.supported || isIOS());
  if (!show) { if (hint) hint.remove(); return; }
  if (!hint) { hint = document.createElement("div"); hint.id = "pushHint"; hint.className = "push-hint"; el("tasksSection").before(hint); }
  const ios = isIOS() && !isStandalone();
  hint.innerHTML = `<span class="push-hint-ico">${icon("bell", 18)}</span><div class="push-hint-text"><b>Zapni si upozornění na telefonu</b><span>${ios ? "Přidej Trellite na plochu (Sdílet → Přidat na plochu) a dostaneš upozornění na nové úkoly a termíny." : "Dostaneš upozornění na nové úkoly, komentáře a termíny, i když aplikaci nemáš otevřenou."}</span></div>`;
  if (!ios) { const b = document.createElement("button"); b.className = "primary-btn"; b.textContent = "Zapnout"; b.onclick = async () => { await enablePush(); renderPushHint(); }; hint.appendChild(b); }
  const x = document.createElement("button"); x.className = "icon-btn push-hint-close"; x.setAttribute("aria-label", "Skrýt"); x.textContent = "×";
  x.onclick = () => { try { localStorage.setItem("pushHintDismissed", "1"); } catch (e) {} hint.remove(); }; hint.appendChild(x);
}

/* Odkaz na kartu (#card=ID) — z push upozornění */
function openFromUrl(url) {
  let id = null; try { const m = new URL(url, location.origin).hash.match(/card=([\w-]+)/); id = m && m[1]; } catch (e) {}
  if (!id || !state) return;
  for (const b of state.boards) { if (b.virtual) continue;
    for (const l of b.lists) { if (l.cards.some((c) => c.id === id)) { openBoard(b.id); openCard(l.id, id); history.replaceState(null, "", location.pathname); return; } } }
  toast("Karta už neexistuje nebo k ní nemáš přístup."); history.replaceState(null, "", location.pathname);
}
window.addEventListener("hashchange", () => openFromUrl(location.href));

/* ============================================================
   Start
   ============================================================ */
(async function boot() {
  registerSW();
  try { const j = await api("GET", "/state"); applyPayload(j); showApp(); connectSSE(); showBoards(); setSync("online", "Připojeno");
    refreshPushState().then(renderPushHint); openFromUrl(location.href); }
  catch (e) { showLogin(); }
})();
