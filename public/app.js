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
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  moon: '<path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5z"/>',
  mapPin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  navigation: '<path d="M3 11l18-8-8 18-2-8z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  external: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  arrowLeft: '<path d="M15 6l-6 6 6 6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12 20 3"/><path d="M17 6l2 2"/><path d="M15 8l2 2"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
function icon(name, size = 18) { return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`; }

/* ---------- Stav ---------- */
let state = null, me = null, usersAdmin = null, allBoards = null;
let currentBoardId = null, activeRef = null, viewMode = "boards";
let filter = { labels: [], members: [], due: null };
let dragListId = null;
// Záložky městské nástěnky: "ukoly" = kanban, ostatní = data ze šichtovnice a podpisů
let boardTab = "ukoly", intInfo = null, intYM = null, intDay = null;
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
  if (viewMode === "inventory") return renderInventory();
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
      if (d.kind === "lide") { refreshPeople(); return; }
      if (d.kind === "vyplaty") { refreshPayroll(); return; }
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
  el("navInventory").classList.toggle("active", viewMode === "inventory");
  updateMobileNav();
}

/* ---------- Telefon: spodní lišta, přepínač měst ---------- */
const phoneMQ = window.matchMedia("(max-width: 760px)");
const isPhone = () => phoneMQ.matches;
let lastBoardId = null;
const mobileList = {}; // boardId -> vybraný seznam na telefonu
function updateMobileNav() {
  document.body.dataset.view = viewMode;
  const cur = viewMode === "boards" ? "mnHome" : viewMode === "admin" ? "mnMe" : isMyTasks() ? "mnTasks" : "mnCities";
  ["mnHome", "mnTasks", "mnCities", "mnMe"].forEach((id) => { const b = el(id); b.classList.toggle("active", id === cur); if (id === cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const n = me ? me.newTaskCount || 0 : 0; el("mnTaskCount").textContent = n; el("mnTaskCount").hidden = n === 0;
  const b = viewMode === "board" ? getBoard() : null;
  el("citySwitch").hidden = !b || !!b.virtual;
}
function citySheet(anchor) {
  const body = document.createElement("div");
  state.boards.filter((b) => !b.virtual).sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0)).forEach((b) => {
    const r = document.createElement("button"); r.className = "pop-row sheet-row";
    const color = hexOf(b.bg.value); const n = boardCards(b).length;
    r.innerHTML = `<span class="bc-tile sm" style="background:${tint(color, 0.86)};color:${shade(color, 0.25)}">${escapeHtml(initials(b.title).slice(0, 1))}</span><span class="sheet-row-main"><b>${escapeHtml(b.title)}</b><span>${n} ${plural(n, "karta", "karty", "karet")}</span></span>${currentBoardId === b.id ? `<span class="check">✓</span>` : ""}`;
    r.onclick = () => { closePopover(); openBoard(b.id); }; body.appendChild(r);
  });
  popover(anchor, "Města", body);
}
phoneMQ.addEventListener("change", () => { closePopover(); if (state && me) { rerender(); updateMobileNav(); } });
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
  el("boardsView").hidden = false; el("boardView").hidden = true; el("adminView").hidden = true; el("inventoryView").hidden = true;
  el("boardTitle").textContent = ""; el("boardTitle").setAttribute("contenteditable", "false");
  el("boardStar").hidden = true; el("searchWrap").hidden = true; el("searchInput").value = "";
  el("filterBtn").hidden = true; el("menuBtn").hidden = true; el("newCardBtn").hidden = true; el("boardMembers").hidden = true;
  setHeader({ crumb: "Pracovní prostor", title: "Přehled" });
  renderBoards(); renderSidebar();
}
function openBoard(id) {
  const b = state.boards.find((x) => x.id === id); if (!b) return showBoards();
  viewMode = "board"; currentBoardId = id; filter = { labels: [], members: [], due: null };
  el("boardsView").hidden = true; el("boardView").hidden = false; el("adminView").hidden = true; el("inventoryView").hidden = true;
  setHeader({ crumb: b.virtual ? "Pracovní prostor" : "Pracovní prostor / Nástěnky", board: true });
  el("boardTitle").textContent = b.title;
  el("boardTitle").setAttribute("contenteditable", (isAdmin() && !b.virtual) ? "true" : "false");
  el("boardStar").hidden = !(isAdmin() && !b.virtual); el("boardStar").classList.toggle("on", !!b.starred);
  el("searchWrap").hidden = false; el("filterBtn").hidden = false; updateFilterBtn();
  el("menuBtn").hidden = b.virtual ? true : false;
  el("addListBtn").hidden = !(isAdmin() && !b.virtual);
  el("newCardBtn").hidden = !!b.virtual;
  boardTab = "ukoly"; loadIntInfo(b);
  if (!b.virtual) lastBoardId = b.id;
  el("boardView").classList.toggle("is-virtual", !!b.virtual);
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
  const tiles = el("summaryTiles"); tiles.innerHTML = "";
  [[tasks.length, "Moje úkoly", ""], [late, "Po termínu", late ? "danger" : ""], [state.boards.filter((b) => !b.virtual).length, "Města", ""]].forEach(([n, label, cls], i) => {
    const t = document.createElement("button"); t.className = "summary-tile " + cls;
    t.innerHTML = `<span class="summary-num">${n}</span><span>${label}</span>`;
    t.onclick = i === 2 ? (e) => citySheet(e.currentTarget) : openMyTasks; tiles.appendChild(t);
  });
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
  const lists = b.lists.filter((l) => !l.archived);
  const chips = el("listChips"); chips.innerHTML = "";
  const oneList = isPhone() && !b.virtual && lists.length > 0;
  chips.hidden = !oneList;
  if (oneList && !lists.some((l) => l.id === mobileList[b.id])) mobileList[b.id] = lists[0].id;
  lists.forEach((l) => {
    const w = renderList(l, b);
    if (oneList && l.id !== mobileList[b.id]) w.classList.add("m-hidden");
    listsEl.appendChild(w);
    if (!oneList) return;
    const on = l.id === mobileList[b.id];
    const chip = document.createElement("button"); chip.className = "list-chip" + (on ? " active" : "");
    chip.setAttribute("role", "tab"); chip.setAttribute("aria-selected", String(on));
    chip.innerHTML = `<span class="list-dot" style="background:${listDot(l.title)}"></span>${escapeHtml(l.title)}<span class="list-chip-count">${l.cards.filter(cardVisible).length}</span>`;
    chip.onclick = () => { mobileList[b.id] = l.id; renderBoard(); el("boardView").scrollTop = 0; };
    chips.appendChild(chip);
  });
  if (oneList) { const act = chips.querySelector(".active"); if (act) act.scrollIntoView({ block: "nearest", inline: "center" }); }
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
const TAB_LABELS = { ukoly: "Úkoly", smeny: "Směny", lide: "Řidiči", vyplaty: "Výplaty", vozidla: "Vozidla" };
// Vstupní test: pod hranicí kurýr neprošel
const TEST_PASS = 70;
const testClass = (pct) => pct < TEST_PASS ? "danger" : pct < 80 ? "warn" : "ok";
const CONTRACT_LABEL = { dpp: "DPP", dpc: "DPČ", dpp_dpc: "DPP + DPČ", osvc: "IČO (OSVČ)", zadny: "Bez smlouvy" };
const czk = (n) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(Number(n) || 0);
const num = (n) => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(Number(n) || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "";
const fmtDateTime = (v) => v ? new Date(v).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const colorFor = (s) => LABEL_COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % LABEL_COLORS.length];

function hideIntegration() { closeCarDetail(); el("boardTabs").hidden = true; el("intView").hidden = true; el("listChips").hidden = true; closePerson(); }

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
  el("boardView").hidden = !onTasks; el("intView").hidden = onTasks; if (!onTasks) el("listChips").hidden = true;
  el("searchWrap").hidden = !onTasks; el("filterBtn").hidden = !onTasks; el("newCardBtn").hidden = !onTasks || !b || !!b.virtual;
  if (!onTasks) el("boardMembers").hidden = true;
}

const intKey = (boardId) => `${boardId}:${boardTab}` + (boardTab === "vyplaty" ? `:${intYM.y}-${intYM.m}` : boardTab === "smeny" ? `:${intDay}` : "");
async function loadIntTab(fresh) {
  const b = getBoard(); if (!b) return;
  const tab = boardTab; const key = intKey(b.id);
  intData[key] = { loading: true };
  const qs = new URLSearchParams(); if (tab === "vyplaty") { qs.set("year", intYM.y); qs.set("month", intYM.m); } if (tab === "smeny") qs.set("datum", intDay); if (fresh) qs.set("refresh", "1");
  try { intData[key] = { data: await intGet(`/board/${b.id}/${tab}` + (qs.toString() ? "?" + qs : "")) }; }
  catch (e) { if (e.unauth) return; intData[key] = { error: e.message }; }
  if (viewMode === "board" && currentBoardId === b.id && boardTab === tab) renderIntTab();
}
function renderIntTab() {
  const b = getBoard(); if (!b) return;
  if (!intYM) { const d = new Date(); intYM = { y: d.getFullYear(), m: d.getMonth() + 1 }; }
  if (!intDay) intDay = toInputDate(Date.now());
  const key = intKey(b.id);
  if (!intData[key]) loadIntTab();
  const entry = intData[key];
  const box = el("intView"); box.innerHTML = "";

  // lišta: název + (měsíc u výplat) + obnovit + odkaz do šichtovnice
  const bar = document.createElement("div"); bar.className = "int-toolbar";
  const h = document.createElement("h2"); h.className = "int-title"; h.textContent = TAB_LABELS[boardTab]; bar.appendChild(h);
  if (entry && entry.data) {
    const n = boardTab === "lide" ? entry.data.people.length : boardTab === "vozidla" ? entry.data.vozidla.length : boardTab === "smeny" ? entry.data.smeny.length : entry.data.ridici.length + entry.data.brigadnici.length;
    const c = document.createElement("span"); c.className = "section-count"; c.textContent = n; h.appendChild(c);
  }
  const right = document.createElement("div"); right.className = "int-actions";
  if (boardTab === "vyplaty") right.appendChild(monthSwitcher());
  if (boardTab === "smeny") right.appendChild(daySwitcher());
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
  else if (boardTab === "smeny") renderShifts(box, entry.data);
}
function daySwitcher() {
  const wrap = document.createElement("div"); wrap.className = "month-switch";
  const d = new Date(intDay + "T12:00:00"); const today = toInputDate(Date.now());
  const step = (n) => { const t = new Date(d); t.setDate(t.getDate() + n); intDay = toInputDate(t.getTime()); renderIntTab(); };
  const prev = document.createElement("button"); prev.className = "icon-btn"; prev.setAttribute("aria-label", "Předchozí den"); prev.textContent = "‹"; prev.onclick = () => step(-1);
  const next = document.createElement("button"); next.className = "icon-btn"; next.setAttribute("aria-label", "Další den"); next.textContent = "›"; next.onclick = () => step(1);
  const span = document.createElement("button"); span.className = "month-label day-label"; span.title = "Zpět na dnešek";
  const rel = intDay === today ? "Dnes · " : "";
  const label = d.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" });
  span.textContent = rel + label; span.onclick = () => { if (intDay !== today) { intDay = today; renderIntTab(); } };
  wrap.append(prev, span, next); return wrap;
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
const isPending = (p) => !!(p.contract && p.contract.status !== "signed");
function personTypeLabel(p) {
  if (p.onlyContract && isPending(p)) return "Čeká na podpis smluv";
  if (p.onlyContract) return "Jen smlouva · není ve šichtovnici";
  if (p.isRidic) return "Řidič OSVČ";
  return p.level || "Kurýr";
}
// Řidiči OSVČ vlevo, brigádníci (DPP/DPČ) vpravo
const isDriverCol = (p) => p.isRidic || (p.contract && p.contract.type === "osvc");
function renderPeople(box, data) {
  const add = document.createElement("div"); add.className = "people-actions";
  add.innerHTML = `<button class="primary-btn">${icon("plus", 16)}<span>Nový kurýr</span></button>`;
  add.querySelector("button").onclick = () => openNewCourier(intInfo && intInfo.city);
  box.appendChild(add);
  if (data.errors.smenovnik) intBanner(box, "danger", "Šichtovnice: " + data.errors.smenovnik);
  if (data.errors.podpisy) intBanner(box, "warn", "Smlouvy a testy teď nejdou načíst – " + data.errors.podpisy);
  if (!data.people.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">V tomhle městě zatím nikdo není.</div>`); return; }
  const cols = document.createElement("div"); cols.className = "people-cols";
  // Nejnovější nahoře (podle data ve šichtovnici, jinak podle podpisu smlouvy)
  const sinceTs = (p) => p.since || (p.contract && p.contract.signedAt) || "";
  const byNewest = (a, b) => String(sinceTs(b)).localeCompare(String(sinceTs(a)));
  [
    { key: "ridici", title: "Řidiči", sub: "OSVČ", people: data.people.filter(isDriverCol).sort(byNewest) },
    { key: "brigadnici", title: "Brigádníci", sub: "DPP / DPČ", people: data.people.filter((p) => !isDriverCol(p)).sort(byNewest) },
  ].forEach((g) => {
    const col = document.createElement("section"); col.className = "people-col " + g.key;
    col.innerHTML = `<h3 class="people-col-head"><span class="people-col-dot" aria-hidden="true"></span>${g.title}<span class="section-count">${g.people.length}</span><span class="muted-sm">${g.sub}</span></h3>`;
    if (!g.people.length) col.insertAdjacentHTML("beforeend", `<div class="int-empty small">Nikdo</div>`);
    g.people.forEach((p) => col.appendChild(personCardEl(p, data.links)));
    cols.appendChild(col);
  });
  box.appendChild(cols);
}
// Hodnocení z Foodisu: pod 4,5 hvězdy žlutě, pod 4 červeně
const ratingCls = (avg) => avg < 4 ? "danger" : avg < 4.5 ? "warn" : "ok";
const ratingChip = (r) => `<span class="chip ${ratingCls(r.avg)}" title="Hodnocení z Foodisu">★ ${num(r.avg)} <span class="chip-sub">(${r.count})</span></span>`;
const stars = (n) => { const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return "★".repeat(v) + "☆".repeat(5 - v); };
function personCardEl(p, links) {
  const card = document.createElement("button"); card.className = "person-card" + (p.isActive === false ? " inactive" : "");
  const color = colorFor(p.name);
  const chips = [];
  if (isPending(p)) chips.push(`<span class="chip warn">Čeká na podpis</span>`);
  if (p.contract) chips.push(`<span class="chip">${escapeHtml(CONTRACT_LABEL[p.contract.type] || "Smlouva")}</span>`);
  if (p.clothing && !isPending(p)) chips.push(p.clothing.signedAt ? `<span class="chip ok">Oblečení převzato</span>` : `<span class="chip warn">Oblečení nepřevzato</span>`);
  if (p.test) chips.push(`<span class="chip ${testClass(p.test.percent)}">Test ${p.test.percent} %${p.test.percent < TEST_PASS ? " · Neprošel" : ""}</span>`);
  if (p.clothingSize) chips.push(`<span class="chip">Vel. ${escapeHtml(p.clothingSize)}</span>`);
  if (p.inventory && p.inventory.total) chips.push(`<span class="chip">Má ${p.inventory.total} ks oblečení</span>`);
  if (p.rating) chips.push(ratingChip(p.rating));
  if (p.isActive === false) chips.push(`<span class="chip muted">Neaktivní</span>`);
  card.innerHTML = `<span class="avatar lg" style="background:${tint(color, 0.82)};color:${shade(color, 0.45)}">${escapeHtml(initials(p.name))}</span>
    <span class="person-main"><span class="person-name">${escapeHtml(p.name)}</span><span class="person-sub">${escapeHtml(personTypeLabel(p))}</span>
    ${p.phone ? `<span class="person-phone">${icon("phone", 12)}${escapeHtml(p.phone)}</span>` : ""}
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
    if (p.contract.link) contract += `<div class="nc-link"><span class="pf-label">Odkaz pro kurýra</span><input class="pop-input mono" readonly value="${escapeHtml(p.contract.link)}"><div class="nc-link-actions"><button type="button" class="pill-btn" data-copy="${escapeHtml(p.contract.link)}">Kopírovat odkaz</button></div></div>`;
  } else contract = `<p class="empty-note">Ke smlouvě se nepodařilo dohledat záznam v podpisech.</p>`;
  const clothing = p.clothing ? field("Dostane", escapeHtml(p.clothing.items.map((i) => `${i.count}× ${i.label}`).join(", ")))
    + field("Velikost", escapeHtml(p.clothing.size || "—"))
    + field("Převzetí", p.clothing.signedAt ? "Potvrzeno podpisem " + escapeHtml(fmtDate(p.clothing.signedAt)) : (isPending(p) ? "Až po podpisu smluv" : "Kurýr ještě nepotvrdil")) : "";
  const owns = p.inventory && (p.inventory.items || []).length
    ? p.inventory.items.map((i) => field(escapeHtml(i.label), escapeHtml(i.count + "× vel. " + i.size))).join("") + field("Celkem", escapeHtml(p.inventory.total + " ks"))
    : "";

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
    ${p.phone || p.email ? `<div class="person-quick">${p.phone ? `<a class="pq main" href="tel:${escapeHtml(p.phone.replace(/\s+/g, ""))}">${icon("phone", 20)}<span>Zavolat</span></a><a class="pq" href="sms:${escapeHtml(p.phone.replace(/\s+/g, ""))}">${icon("message", 20)}<span>SMS</span></a>` : ""}${p.email ? `<a class="pq" href="mailto:${escapeHtml(p.email)}">${icon("mail", 20)}<span>E-mail</span></a>` : ""}</div>` : ""}
    <div class="person-grid">
      <div>${sec("Kontakt", contact)}${sec("Práce", work)}${sec("Fakturace a platby", billing)}</div>
      <div>${p.smenovnikId ? `<section class="person-sec person-rating"><h3>Hodnocení z Foodisu</h3><div class="rating-body muted-sm">Načítám…</div></section>` : ""}${sec("Smlouva", contract)}${sec("Pracovní oblečení", clothing)}${sec("Oblečení (co má)", owns)}${sec("Vstupní test", test)}</div>
    </div>
    ${linkBtns.length ? `<div class="person-links">${linkBtns.join("")}</div>` : ""}`;
  bindCopyButtons(body);
  el("personOverlay").hidden = false;
  if (p.smenovnikId) loadPersonRating(p, body.querySelector(".rating-body"));
}
async function loadPersonRating(p, box) {
  const b = getBoard(); if (!b || !box) return;
  try {
    const j = await intGet(`/board/${b.id}/lide/${encodeURIComponent(p.smenovnikId)}/hodnoceni`);
    if (!box.isConnected) return;
    if (!j.rating) { box.innerHTML = `<p class="empty-note">Ve Foodisu jsme k němu hodnocení nenašli.</p>`; return; }
    box.className = "rating-body";
    box.innerHTML = `<div class="rating-head"><span class="rating-avg ${ratingCls(j.rating.avg)}">${num(j.rating.avg)}</span><span><span class="rating-stars">${stars(j.rating.avg)}</span><br><span class="muted-sm">${j.rating.count} ${plural(j.rating.count, "hodnocení", "hodnocení", "hodnocení")} celkem</span></span></div>
      ${j.reviews.length ? `<ul class="review-list">${j.reviews.map((r) => `<li class="${r.rating <= 3 ? "bad" : ""}"><div class="review-top"><span class="rating-stars sm">${stars(r.rating)}</span><span class="muted-sm">${escapeHtml(r.date)}${r.restaurant ? " · " + escapeHtml(r.restaurant) : ""}</span></div>${r.comment ? `<div class="review-text">${escapeHtml(r.comment)}</div>` : ""}</li>`).join("")}</ul>` : `<p class="empty-note">Zatím bez slovních recenzí.</p>`}`;
  } catch (e) { if (!e.unauth && box.isConnected) box.textContent = "Hodnocení se teď nepodařilo načíst."; }
}
function refreshPeople() {
  Object.keys(intData).forEach((k) => { if (k.endsWith(":lide")) delete intData[k]; });
  if (viewMode === "board" && boardTab === "lide") renderIntTab();
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Odkaz zkopírován."); }
  catch (e) { toast("Zkopírujte odkaz ručně."); }
}
function bindCopyButtons(root) { root.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => copyText(b.dataset.copy)); }

/* ---------- Nový kurýr: odkaz do podpisů z Trella ----------
   Formulář je stejný jako v administraci podpisů (definici posílají podpisy),
   navíc počty kusů oblečení. Kurýr pak odkaz vyplní, podepíše smlouvy a až
   oblečení dostane, potvrdí převzetí podpisem dohody. */
async function openNewCourier(cityPreset) {
  const body = el("personBody");
  body.innerHTML = `<div class="int-empty">Načítám formulář…</div>`; el("personOverlay").hidden = false;
  let form;
  try { form = await intGet("/nastup/formular"); }
  catch (e) { if (!e.unauth) body.innerHTML = `<div class="int-banner danger">${escapeHtml(e.message)}</div>`; return; }
  if (!form.cities.length) { body.innerHTML = `<div class="int-banner danger">Nemáte žádné město, kam byste mohl přidat kurýra.</div>`; return; }

  const st = {
    contractType: form.contractTypes[0].id,
    cities: new Set(form.cities.some((c) => c.id === cityPreset) ? [cityPreset] : form.cities.length === 1 ? [form.cities[0].id] : []),
    docs: new Set(form.extraDocs.filter((d) => d.default).map((d) => d.id)),
    withTest: true, withPhotos: true, skipSmenovnik: false,
    clothing: { ...(form.clothing.defaults[form.contractTypes[0].id] || {}) }, clothingTouched: false,
    employer: Object.fromEntries(form.employerFields.map((f) => [f.id, f.default || ""])),
  };
  const contractDocs = () => (form.contractTypes.find((c) => c.id === st.contractType) || {}).docs || [];
  const activeDocs = () => [...contractDocs(), ...form.extraDocs.filter((d) => st.docs.has(d.id) && !d.skipFor.includes(st.contractType)).map((d) => d.id)];
  const chip = (on, label, attrs) => `<button type="button" class="nc-chip${on ? " on" : ""}" aria-pressed="${on}" ${attrs}>${escapeHtml(label)}</button>`;

  const draw = () => {
    const docs = new Set(activeDocs());
    const empFields = form.employerFields.filter((f) => (f.docIds || []).some((id) => docs.has(id)));
    body.innerHTML = `<div class="person-head nc-head"><span class="avatar xl nc-ico">${icon("user", 26)}</span>
        <div><h2 id="personName" class="person-title">Nový kurýr</h2><div class="person-sub">Vytvoří odkaz do podpisů, který kurýrovi pošleš.</div></div></div>
      <form class="nc-form" novalidate>
        <section class="nc-sec"><h3>Kurýr</h3>
          <div class="nc-grid">
            <label class="nc-field">Jméno a příjmení *<input class="pop-input" name="employee_name" autocomplete="off" required></label>
            <label class="nc-field">Telefon<input class="pop-input" name="employee_phone" type="tel" autocomplete="off"></label>
            <label class="nc-field">E-mail<input class="pop-input" name="employee_email" type="email" autocomplete="off"></label>
          </div>
          <p class="muted-sm">Co tu vyplníš, kurýr už jen uvidí. Zbytek doplní sám v odkazu.</p></section>
        <section class="nc-sec"><h3>Město (šichtovnice) *</h3><div class="nc-chips">${form.cities.map((c) => chip(st.cities.has(c.id), c.label, `data-city="${c.id}"`)).join("")}</div></section>
        <section class="nc-sec"><h3>Typ spolupráce *</h3><div class="nc-chips">${form.contractTypes.map((c) => chip(st.contractType === c.id, c.label, `data-contract="${c.id}"`)).join("")}</div></section>
        <section class="nc-sec"><h3>Pracovní oblečení</h3>
          <div class="nc-clothing">${form.clothing.items.map((i) => `<label class="nc-qty"><span>${escapeHtml(i.label)}</span>
            <span class="nc-stepper"><button type="button" data-step="${i.id}" data-d="-1" aria-label="Méně">−</button><input type="number" min="0" max="20" name="obl_${i.id}" value="${st.clothing[i.id] || 0}"><button type="button" data-step="${i.id}" data-d="1" aria-label="Více">+</button></span></label>`).join("")}</div>
          <p class="muted-sm">Předvyplněno podle typu spolupráce. Velikost vyplní kurýr, převzetí potvrdí podpisem až při předání.</p></section>
        <section class="nc-sec"><h3>Kroky v odkazu</h3>
          <label class="nc-check"><input type="checkbox" data-flag="withTest" ${st.withTest ? "checked" : ""}> Vstupní test před podpisem</label>
          <label class="nc-check"><input type="checkbox" data-flag="withPhotos" ${st.withPhotos ? "checked" : ""}> Na závěr fotky dokladů (OP, ŘP, kartička pojišťovny)</label>
          <div class="nc-sub">Doplňkové dokumenty</div>
          ${form.extraDocs.filter((d) => !d.skipFor.includes(st.contractType)).map((d) => `<label class="nc-check"><input type="checkbox" data-doc="${d.id}" ${st.docs.has(d.id) ? "checked" : ""}> ${escapeHtml(d.name)}</label>`).join("")}
        </section>
        <details class="nc-sec nc-details"><summary>Údaje za zaměstnavatele <span class="muted-sm">(předvyplněno, zkontroluj)</span></summary>
          <div class="nc-grid">${empFields.map((f) => `<label class="nc-field">${escapeHtml(f.label)}${f.required ? " *" : ""}${f.type === "choice"
            ? `<select class="pop-input" data-emp="${f.id}">${(f.options || []).map((o) => `<option ${o === st.employer[f.id] ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select>`
            : `<input class="pop-input" data-emp="${f.id}" type="${f.type === "date" ? "date" : "text"}" value="${escapeHtml(st.employer[f.id] || "")}">`}</label>`).join("")}</div>
          <label class="nc-check"><input type="checkbox" data-flag="skipSmenovnik" ${st.skipSmenovnik ? "checked" : ""}> Nevytvářet údaje ve šichtovnici a Foodisu</label>
        </details>
        <div class="nc-submit"><button type="submit" class="primary-btn">${icon("plus", 16)}<span>Vytvořit odkaz</span></button></div>
      </form>`;
    const f = body.querySelector("form");
    ["employee_name", "employee_phone", "employee_email"].forEach((n) => { if (st[n]) f.elements[n].value = st[n]; f.elements[n].oninput = (e) => { st[n] = e.target.value; }; });
    f.querySelectorAll("[data-city]").forEach((b) => b.onclick = () => { const c = b.dataset.city; st.cities.has(c) ? st.cities.delete(c) : st.cities.add(c); draw(); });
    f.querySelectorAll("[data-contract]").forEach((b) => b.onclick = () => {
      st.contractType = b.dataset.contract;
      if (!st.clothingTouched) st.clothing = { ...(form.clothing.defaults[st.contractType] || {}) };
      draw();
    });
    f.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => {
      const id = b.dataset.step; st.clothing[id] = Math.max(0, Math.min(20, (Number(st.clothing[id]) || 0) + Number(b.dataset.d))); st.clothingTouched = true; draw();
    });
    f.querySelectorAll(".nc-qty input").forEach((i) => i.onchange = () => { st.clothing[i.name.slice(4)] = Math.max(0, Math.min(20, parseInt(i.value, 10) || 0)); st.clothingTouched = true; draw(); });
    f.querySelectorAll("[data-flag]").forEach((c) => c.onchange = () => { st[c.dataset.flag] = c.checked; });
    f.querySelectorAll("[data-doc]").forEach((c) => c.onchange = () => { c.checked ? st.docs.add(c.dataset.doc) : st.docs.delete(c.dataset.doc); draw(); });
    f.querySelectorAll("[data-emp]").forEach((i) => i.onchange = () => { st.employer[i.dataset.emp] = i.value; });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const name = (st.employee_name || "").trim();
      if (!name) { f.elements.employee_name.focus(); return toast("Vyplň jméno kurýra."); }
      if (!st.cities.size) return toast("Vyber město.");
      const missing = empFields.filter((x) => x.required && !String(st.employer[x.id] || "").trim());
      if (missing.length) { f.querySelector(".nc-details").open = true; return toast("Vyplň: " + missing.map((x) => x.label).join(", ")); }
      const values = { employee_name: name };
      if ((st.employee_phone || "").trim()) values.employee_phone = st.employee_phone.trim();
      if ((st.employee_email || "").trim()) values.employee_email = st.employee_email.trim();
      empFields.forEach((x) => { if (String(st.employer[x.id] || "").trim()) values[x.id] = st.employer[x.id]; });
      const btn = f.querySelector(".nc-submit button"); btn.disabled = true;
      try {
        const j = await intSend("POST", "/nastup", {
          title: name, contractType: st.contractType, docs: form.extraDocs.filter((d) => st.docs.has(d.id) && !d.skipFor.includes(st.contractType)).map((d) => d.id),
          cities: [...st.cities], values, withTest: st.withTest, withPhotos: st.withPhotos, skipSmenovnik: st.skipSmenovnik, clothing: st.clothing,
        });
        showCourierLink(j.zaznam, st.employee_phone);
        refreshPeople();
      } catch (err) { btn.disabled = false; if (!err.unauth) toast(err.message); }
    };
  };
  draw();
  setTimeout(() => { const n = body.querySelector("[name=employee_name]"); if (n) n.focus(); }, 50);
}
function showCourierLink(rec, phone) {
  const body = el("personBody"); const link = rec.link || "";
  const items = rec.clothing ? rec.clothing.items.map((i) => `${i.count}× ${i.label}`).join(", ") : "";
  const sms = phone ? `sms:${phone.replace(/\s+/g, "")}?&body=${encodeURIComponent("Ahoj, tady je odkaz k nástupu – smlouvy a test vyplníš v mobilu: " + link)}` : "";
  body.innerHTML = `<div class="person-head nc-head"><span class="avatar xl nc-ico ok">${icon("check", 26)}</span>
      <div><h2 id="personName" class="person-title">Odkaz je připravený</h2><div class="person-sub">${escapeHtml(rec.name)} · ${escapeHtml(CONTRACT_LABEL[rec.contractType] || "")}${items ? " · " + escapeHtml(items) : ""}</div></div></div>
    <div class="nc-link big"><input class="pop-input mono" readonly value="${escapeHtml(link)}">
      <div class="nc-link-actions"><button type="button" class="primary-btn" data-copy="${escapeHtml(link)}">Kopírovat odkaz</button>
        ${navigator.share ? `<button type="button" class="pill-btn nc-share">Sdílet…</button>` : ""}
        ${sms ? `<a class="pill-btn" href="${escapeHtml(sms)}">Poslat SMS</a>` : ""}</div></div>
    <ol class="nc-steps"><li>Pošli odkaz kurýrovi (SMS, WhatsApp, e-mail).</li>
      <li>Kurýr udělá test, podepíše smlouvy a nahraje doklady – v Trellu ho hned vidíš v Řidičích jako „Čeká na podpis“.</li>
      <li>Po podpisu se mu samy vytvoří údaje ve šichtovnici a Foodisu.</li>
      ${items ? `<li>Až dostane oblečení, potvrdí převzetí v tom samém odkazu (tlačítko na konci).</li>` : ""}</ol>
    <div class="nc-submit"><button type="button" class="pill-btn nc-done">Hotovo</button></div>`;
  bindCopyButtons(body);
  const share = body.querySelector(".nc-share"); if (share) share.onclick = () => navigator.share({ title: "Nástup – " + rec.name, url: link }).catch(() => {});
  body.querySelector(".nc-done").onclick = closePerson;
  const input = body.querySelector(".nc-link input"); input.onclick = () => input.select();
}
el("personClose").onclick = closePerson;
el("personOverlay").addEventListener("click", (e) => { if (e.target === el("personOverlay")) closePerson(); });

/* ---------- Výplaty ---------- */
function refreshPayroll() {
  Object.keys(intData).forEach((k) => { if (k.includes(":vyplaty")) delete intData[k]; });
  if (viewMode === "board" && boardTab === "vyplaty") renderIntTab();
}
function renderPayroll(box, data) {
  if (data.canFine) {
    const add = document.createElement("div"); add.className = "people-actions";
    add.innerHTML = `<button class="primary-btn">${icon("plus", 16)}<span>Pokuta / bonus</span></button>`;
    add.querySelector("button").onclick = (e) => finePopover(e.currentTarget, data);
    box.appendChild(add);
  }
  if (data.foodisError) intBanner(box, "warn", "Zálohy a bonusy za objednávky z Foodisu se nepodařilo načíst – částky jsou bez nich.");
  if (data.uctenky && data.uctenky.length) box.appendChild(receiptsSection(data.uctenky));
  const all = [...data.ridici, ...data.brigadnici];
  if (!all.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">V tomhle měsíci zatím nikdo nemá odjeté směny.</div>`); return; }
  const total = all.reduce((s, r) => s + (Number(r.toPay) || 0), 0);
  const fines = all.reduce((s, r) => s + (r.bonusItems || []).filter((b) => Number(b.amount) < 0).reduce((a, b) => a + Number(b.amount), 0), 0);
  const stats = document.createElement("div"); stats.className = "pay-stats";
  stats.innerHTML = `<div class="stat"><span class="stat-label">K výplatě celkem</span><span class="stat-value">${czk(total)}</span></div>
    <div class="stat"><span class="stat-label">Lidí s výplatou</span><span class="stat-value">${all.length}</span></div>
    <div class="stat"><span class="stat-label">Srážky a pokuty</span><span class="stat-value ${fines < 0 ? "neg" : ""}">${czk(fines)}</span></div>
    ${data.fakturyNactene && data.ridici.length ? `<div class="stat"><span class="stat-label">Faktury OSVČ schválené</span><span class="stat-value">${data.ridici.filter((r) => r.faktura).length} / ${data.ridici.length}</span></div>` : ""}`;
  box.appendChild(stats);
  if (data.pozdni && data.pozdni.sleduje) box.appendChild(lateSection(data));
  if (data.ridici.length) box.appendChild(payTable("Řidiči OSVČ", data.ridici, true, data.pronajemVozidla, data));
  if (data.brigadnici.length) box.appendChild(payTable("Brigádníci", data.brigadnici, false, 0, data));
}
const FINE_REASONS = ["Pozdní příchod", "Chybějící předávka auta", "Neomluvená absence", "Poškození auta", "Chyba v objednávce"];
// Pokuta (srážka) nebo bonus → rovnou do šichtovnice, projeví se ve fakturaci za zvolený měsíc
function finePopover(anchor, data, courierId, presetReason) {
  const people = new Map((data.kuryri || []).map((k) => [String(k.id), k.name]));
  [...data.ridici, ...data.brigadnici].forEach((r) => { if (!people.has(String(r.courierId))) people.set(String(r.courierId), r.name); });
  const opts = [...people.entries()].sort((a, b) => a[1].localeCompare(b[1], "cs"))
    .map(([id, name]) => `<option value="${escapeHtml(id)}"${String(courierId) === id ? " selected" : ""}>${escapeHtml(name)}</option>`).join("");
  const monthLabel = new Date(intYM.y, intYM.m - 1, 1).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const body = document.createElement("div"); body.className = "fine-form";
  body.innerHTML = `<div class="seg" role="radiogroup" aria-label="Typ">
      <label><input type="radio" name="fineKind" value="fine" checked><span>Pokuta</span></label>
      <label><input type="radio" name="fineKind" value="bonus"><span>Bonus</span></label></div>
    <label class="quick-label">Kurýr</label>
    <select class="pop-input fine-courier"><option value="">Vyberte…</option>${opts}</select>
    <label class="quick-label">Částka (Kč)</label>
    <input class="pop-input fine-amount" type="number" inputmode="numeric" min="1" step="1" placeholder="např. 500">
    <label class="quick-label">Důvod</label>
    <input class="pop-input fine-reason" maxlength="300" placeholder="Za co?">
    <div class="fine-quick">${FINE_REASONS.map((r) => `<button type="button" class="chip-btn">${escapeHtml(r)}</button>`).join("")}</div>
    <p class="muted-sm fine-note">Zapíše se do šichtovnice za ${escapeHtml(monthLabel)} a hned se odečte z výplaty.</p>`;
  const reason = body.querySelector(".fine-reason"); if (presetReason) reason.value = presetReason;
  body.querySelectorAll(".fine-quick .chip-btn").forEach((b) => b.onclick = () => { reason.value = b.textContent; reason.focus(); });
  const btn = document.createElement("button"); btn.className = "pop-btn"; btn.textContent = "Zapsat pokutu";
  body.querySelectorAll("input[name=fineKind]").forEach((r) => r.onchange = () => {
    const bonus = body.querySelector("input[name=fineKind]:checked").value === "bonus";
    btn.textContent = bonus ? "Zapsat bonus" : "Zapsat pokutu";
    body.querySelector(".fine-quick").hidden = bonus;
    body.querySelector(".fine-note").textContent = `Zapíše se do šichtovnice za ${monthLabel} a hned se ${bonus ? "přičte k výplatě" : "odečte z výplaty"}.`;
  });
  btn.onclick = async () => {
    const b = getBoard(); if (!b) return;
    const kind = body.querySelector("input[name=fineKind]:checked").value;
    const cid = body.querySelector(".fine-courier").value; const amount = Number(body.querySelector(".fine-amount").value);
    if (!cid) return toast("Vyberte kurýra.");
    if (!(amount > 0)) return toast("Zadejte částku.");
    if (!reason.value.trim()) return toast("Napište důvod.");
    btn.disabled = true;
    try {
      await intSend("POST", `/board/${b.id}/pokuty`, { courierId: cid, kind, amount, reason: reason.value.trim(), year: intYM.y, month: intYM.m });
      closePopover(); toast(kind === "bonus" ? "Bonus zapsán." : `Pokuta ${czk(amount)} zapsána – ${people.get(cid)}.`);
      delete intData[intKey(b.id)]; loadIntTab(true);
    } catch (e) { if (!e.unauth) toast(e.message); btn.disabled = false; }
  };
  body.appendChild(btn);
  popover(anchor, "Pokuta / bonus", body);
  body.querySelector(courierId ? ".fine-amount" : ".fine-courier").focus();
}
// Pozdní příchody za měsíc (ranní/celodenní směna bez předávky do uzávěrky) → podklad pro pokuty
const dm = (iso) => { const [, m, d] = iso.split("-"); return `${Number(d)}. ${Number(m)}.`; };
function lateSection(data) {
  const p = data.pozdni; const sec = document.createElement("section"); sec.className = "pay-section late";
  const byCourier = new Map();
  p.prichody.forEach((x) => { if (!byCourier.has(x.courierId)) byCourier.set(x.courierId, { name: x.name, items: [] }); byCourier.get(x.courierId).items.push(x); });
  const groups = [...byCourier.entries()].sort((a, b) => b[1].items.length - a[1].items.length || a[1].name.localeCompare(b[1].name, "cs"));
  sec.innerHTML = `<h3 class="pay-title">Pozdní příchody <span class="section-count">${p.prichody.length}</span> <span class="muted-sm">ranní a celodenní směny bez předávky auta do ${escapeHtml(p.deadline)}${p.od && p.od > `${intYM.y}-${String(intYM.m).padStart(2, "0")}-01` ? ` · sleduje se od ${escapeHtml(dm(p.od))}` : ""}</span></h3>`;
  if (!groups.length) { sec.insertAdjacentHTML("beforeend", `<div class="int-empty small">${p.od ? "V tomhle měsíci nikdo nepřišel pozdě." : "Předávky se v tomhle městě zatím neodesílají."}</div>`); return sec; }
  const ul = document.createElement("ul"); ul.className = "late-list";
  groups.forEach(([cid, g]) => {
    const li = document.createElement("li");
    const days = g.items.map((x) => `<span class="chip ${x.predavka ? "warn" : "danger"}" title="${x.shift === "fullday" ? "Celodenní" : "Ranní"} směna">${escapeHtml(dm(x.datum))} ${x.predavka ? "předávka " + escapeHtml(x.predavka) : "bez předávky"}</span>`).join("");
    li.innerHTML = `<div class="late-who"><span class="pay-name">${escapeHtml(g.name)}</span><span class="muted-sm">${g.items.length}× pozdě</span></div><div class="late-days">${days}</div>`;
    if (data.canFine) {
      const btn = document.createElement("button"); btn.className = "pill-btn late-fine"; btn.textContent = "Pokuta";
      btn.onclick = (e) => finePopover(e.currentTarget, data, cid, `Pozdní příchod ${g.items.map((x) => dm(x.datum)).join(", ")}`);
      li.appendChild(btn);
    }
    ul.appendChild(li);
  });
  sec.appendChild(ul); return sec;
}
async function deleteBonusItem(id) {
  const b = getBoard(); if (!b) return;
  if (!confirm("Smazat tuhle položku? Zmizí i ze šichtovnice.")) return;
  try { await intSend("DELETE", `/board/${b.id}/pokuty/${id}?year=${intYM.y}&month=${intYM.m}`); toast("Smazáno."); delete intData[intKey(b.id)]; loadIntTab(true); }
  catch (e) { if (!e.unauth) toast(e.message); }
}
// Účtenky, které kurýři nahráli v Moje data – do výplaty jdou až po schválení
function receiptsSection(list) {
  const b = getBoard();
  const sec = document.createElement("section"); sec.className = "pay-section receipts";
  sec.innerHTML = `<h3 class="pay-title">Účtenky ke schválení <span class="section-count">${list.length}</span></h3>`;
  const ul = document.createElement("ul"); ul.className = "receipt-list";
  list.forEach((u) => {
    const li = document.createElement("li"); li.className = "receipt";
    const period = u.month && u.year ? new Date(u.year, u.month - 1, 1).toLocaleDateString("cs-CZ", { month: "long" }) : "";
    li.innerHTML = `<div class="receipt-main"><span class="pay-name">${escapeHtml(u.courier_name)}</span>
        <span class="muted-sm">${escapeHtml(u.reason || "Účtenka")}${period ? " · za " + escapeHtml(period) : ""} · nahráno ${escapeHtml(fmtDate(u.created_at))}</span></div>
      <span class="mono strong">${u.amount != null ? czk(u.amount) : "—"}</span>
      <div class="receipt-actions">${u.has_photo ? `<a class="pill-btn" href="/api/integrace/board/${b.id}/uctenky/${u.id}/foto" target="_blank" rel="noopener">Fotka</a>` : `<span class="muted-sm">bez fotky</span>`}
        <button class="pill-btn r-reject">Zamítnout</button><button class="primary-btn r-accept">Schválit</button></div>`;
    const act = async (status) => {
      li.querySelectorAll("button").forEach((x) => x.disabled = true);
      try { await intSend("POST", `/board/${b.id}/uctenky/${u.id}`, { status }); toast(status === "accepted" ? "Účtenka schválena – přičte se k výplatě." : "Účtenka zamítnuta."); delete intData[intKey(b.id)]; loadIntTab(true); }
      catch (e) { if (!e.unauth) toast(e.message); li.querySelectorAll("button").forEach((x) => x.disabled = false); }
    };
    li.querySelector(".r-accept").onclick = () => act("accepted");
    li.querySelector(".r-reject").onclick = () => { if (confirm(`Zamítnout účtenku od ${u.courier_name}?`)) act("rejected"); };
    ul.appendChild(li);
  });
  sec.appendChild(ul); return sec;
}
function money(n, signed) { const v = Number(n) || 0; return `<span class="money${v < 0 ? " neg" : ""}">${signed && v > 0 ? "+" : ""}${czk(v)}</span>`; }
function payTable(title, rows, ridic, pronajem, data) {
  const sec = document.createElement("section"); sec.className = "pay-section";
  sec.innerHTML = `<h3 class="pay-title">${title}</h3>`;
  const wrap = document.createElement("div"); wrap.className = "table-wrap";
  const table = document.createElement("table"); table.className = "int-table";
  table.innerHTML = `<thead><tr><th>Jméno</th><th class="num">${ridic ? "Směny" : "Hodiny"}</th><th class="num">${ridic ? "Sazba / den" : "Sazba / h"}</th><th class="num">Vyježděno</th><th class="num">Záloha</th><th class="num">Bonus obj.</th><th class="num">Bonusy / srážky</th><th class="num">K výplatě</th></tr></thead>`;
  const tb = document.createElement("tbody");
  rows.slice().sort((a, b) => a.name.localeCompare(b.name, "cs")).forEach((r) => {
    const tr = document.createElement("tr"); tr.className = "pay-row"; tr.tabIndex = 0;
    const fakChip = !ridic || !data || !data.fakturyNactene ? ""
      : r.faktura ? ` <span class="chip ${r.faktura.zaplaceno ? "ok" : "accent"}">${r.faktura.zaplaceno ? "Faktura zaplacena" : "Faktura schválena"}</span>`
      : data.mesicSkoncil ? ` <span class="chip warn">Bez faktury</span>` : "";
    tr.innerHTML = `<td><span class="pay-name">${escapeHtml(r.name)}</span>${r.cities && r.cities.length > 1 ? `<span class="muted-sm"> · ${r.cities.length} města</span>` : ""}${fakChip}</td>
      <td class="num mono">${num(ridic ? r.totalShifts : r.totalHours)}</td><td class="num mono">${czk(r.rate)}</td><td class="num mono">${czk(r.celkem)}</td>
      <td class="num mono">${r.zaloha ? money(-r.zaloha) : "—"}</td><td class="num mono">${r.orderBonus ? money(r.orderBonus, true) : "—"}</td>
      <td class="num mono">${r.manualBonus ? money(r.manualBonus, true) : "—"}</td><td class="num mono strong">${money(r.toPay)}</td>`;
    const detail = document.createElement("tr"); detail.className = "pay-detail"; detail.hidden = true;
    const items = (r.bonusItems || []).map((b) => `<li><span>${escapeHtml(b.reason)}${b.fromTrello ? `<span class="muted-sm"> · ${escapeHtml(b.author)}, Trello</span>` : ""}</span>
      <span class="bonus-amt">${b.amount == null ? `<span class="muted-sm">bez částky</span>` : money(b.amount, true)}${b.canDelete ? `<button class="icon-btn sm bonus-del" data-id="${escapeHtml(String(b.id))}" title="Smazat" aria-label="Smazat">${icon("trash", 14)}</button>` : ""}</span></li>`).join("");
    const shifts = ridic ? `Ranní ${r.morningCount} · Odpolední ${r.afternoonCount} · Celodenní ${r.fulldayCount}` : `${r.shiftCount} ${plural(r.shiftCount, "směna", "směny", "směn")}`;
    detail.innerHTML = `<td colspan="8"><div class="pay-detail-box">
      <div class="pay-mobile-lines">
        <div><span>${ridic ? "Směny" : "Hodiny"} × sazba</span><span class="mono">${num(ridic ? r.totalShifts : r.totalHours)} × ${czk(r.rate)}</span></div>
        <div><span>Vyježděno</span><span class="mono">${czk(r.celkem)}</span></div>
        ${r.zaloha ? `<div><span>Záloha</span><span class="mono">${money(-r.zaloha)}</span></div>` : ""}
        ${r.orderBonus ? `<div><span>Bonus za objednávky</span><span class="mono">${money(r.orderBonus, true)}</span></div>` : ""}
        ${r.manualBonus ? `<div><span>Bonusy a srážky</span><span class="mono">${money(r.manualBonus, true)}</span></div>` : ""}
      </div>
      <div><span class="pf-label">Směny</span> ${shifts}</div>
      ${ridic && data && data.fakturyNactene ? `<div><span class="pf-label">Faktura</span> ${r.faktura
        ? `č. ${escapeHtml(r.faktura.cislo)} · ${czk(r.faktura.castka)} · schválil ${escapeHtml(fmtDate(r.faktura.schvaleno))}${r.faktura.zaplaceno ? " · zaplaceno" : ""}${r.faktura.pdf ? ` · <a href="/api/integrace/board/${getBoard().id}/faktury/${r.faktura.id}/pdf?year=${intYM.y}&month=${intYM.m}" target="_blank" rel="noopener">PDF</a>` : ""}`
        : `<span class="muted-sm">${data.mesicSkoncil ? "kurýr ji v Moje data zatím neschválil" : "měsíc ještě běží"}</span>`}</div>` : ""}
      <div><span class="pf-label">Bonusy a srážky</span>${items ? `<ul class="bonus-list">${items}</ul>` : ` <span class="muted-sm">žádné</span>`}</div>
      ${data && data.canFine ? `<div><button class="pill-btn fine-add">${icon("plus", 16)}<span>Pokuta / bonus pro ${escapeHtml(r.name)}</span></button></div>` : ""}
      ${ridic && pronajem ? `<div class="muted-sm">Pronájem vozidla ${czk(pronajem)} je samostatná položka na faktuře – v částce k výplatě není.</div>` : ""}
      ${r.foodisMatched === false ? `<div class="muted-sm">Kurýr se nespároval s Foodisem – záloha a bonus za objednávky chybí.</div>` : ""}
    </div></td>`;
    const fineAdd = detail.querySelector(".fine-add"); if (fineAdd) fineAdd.onclick = (e) => finePopover(e.currentTarget, data, r.courierId);
    detail.querySelectorAll(".bonus-del").forEach((x) => x.onclick = () => deleteBonusItem(x.dataset.id));
    const toggle = () => { detail.hidden = !detail.hidden; tr.classList.toggle("open", !detail.hidden); };
    tr.onclick = toggle; tr.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
    tb.append(tr, detail);
  });
  table.appendChild(tb); wrap.appendChild(table); sec.appendChild(wrap);
  return sec;
}

/* ---------- Směny ---------- */
const SHIFT_GROUPS = [
  { key: "fullday", title: "Celodenní", time: "10:30 – konec" },
  { key: "morning", title: "Ranní", time: "10:30 – 16:00" },
  { key: "afternoon", title: "Odpolední", time: "16:00 – konec" },
];
function renderShifts(box, data) {
  if (!data.smeny.length) { box.insertAdjacentHTML("beforeend", `<div class="int-empty">Na tenhle den nikdo nemá směnu.</div>`); return; }
  const today = toInputDate(Date.now()), past = data.datum < today, isToday = data.datum === today;
  // Hlídač předávek řeší ranní a celodenní; odpolední se jen zobrazí
  const late = (s) => data.predavky && !s.predavka && (past || (isToday && s.shift !== "afternoon"));
  const missing = data.smeny.filter(late).length;
  const count = (k) => data.smeny.filter((s) => s.shift === k).length;
  const stats = document.createElement("div"); stats.className = "pay-stats";
  stats.innerHTML = `<div class="stat"><span class="stat-label">Na směně</span><span class="stat-value">${data.smeny.length}</span></div>
    <div class="stat"><span class="stat-label">Ranní / odpolední / celodenní</span><span class="stat-value">${count("morning")} / ${count("afternoon")} / ${count("fullday")}</span></div>
    ${data.predavky && (past || isToday) ? `<div class="stat"><span class="stat-label">Bez předávky auta</span><span class="stat-value ${missing ? "neg" : ""}">${missing}</span></div>` : ""}`;
  box.appendChild(stats);
  const grid = document.createElement("div"); grid.className = "shift-cols";
  SHIFT_GROUPS.forEach((g) => {
    const people = data.smeny.filter((s) => s.shift === g.key); if (!people.length) return;
    const col = document.createElement("section"); col.className = "shift-col";
    col.innerHTML = `<h3 class="pay-title">${g.title} <span class="section-count">${people.length}</span> <span class="muted-sm">${g.time}</span></h3>`;
    const ul = document.createElement("ul"); ul.className = "shift-list";
    people.forEach((s) => {
      const chip = !data.predavky ? "" : s.predavka
        ? `<span class="chip ok">Předávka ${s.predavka.at ? escapeHtml(new Date(s.predavka.at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })) : ""}${s.predavka.spz ? " · " + escapeHtml(s.predavka.spz) : ""}</span>`
        : late(s) ? `<span class="chip danger">Bez předávky</span>` : (isToday ? `<span class="chip muted">Předávka zatím ne</span>` : "");
      ul.insertAdjacentHTML("beforeend", `<li><span class="shift-who"><span class="pay-name">${escapeHtml(s.name)}</span>
        ${s.phone ? `<a class="person-phone" href="tel:${escapeHtml(s.phone.replace(/\s/g, ""))}">${icon("phone", 12)}${escapeHtml(s.phone)}</a>` : ""}</span>${chip}</li>`);
    });
    col.appendChild(ul); grid.appendChild(col);
  });
  box.appendChild(grid);
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
/* ---------- Detail vozidla s živou polohou (online-monitoring.cz) ----------
   Poloha se načítá líně: do monitoringu se server přihlásí až po otevření
   detailu auta. Jedna odpověď nese polohy všech aut města, takže po prvním
   otevření ukazují stav i karty ostatních aut v seznamu. */
let gpsCache = null;      // { boardId, positions, at }
let carDetail = null;     // { v, data, timer, map, marker, pos, error }
const LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
let leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = LEAFLET + "leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = LEAFLET + "leaflet.min.js"; js.async = true;
    js.onload = () => resolve(window.L); js.onerror = () => { leafletLoading = null; reject(new Error("leaflet")); };
    document.head.appendChild(js);
  });
  return leafletLoading;
}
function gpsState(p) {
  if (!p) return null;
  const t = new Date(p.at).getTime();
  const ageH = t ? (Date.now() - t) / 36e5 : Infinity;
  // „Bez signálu" jen když jednotka hlásí poruchu, nebo je úplně bez údaje či
  // přes 3 dny ticho. Běžně zaparkované auto přestane streamovat a poloha
  // (místo parkování) zůstává platná – to není ztráta signálu.
  const stale = !t || p.responding === false || ageH > 72;
  if (stale) return { cls: "off", label: "Bez signálu", big: "—", t, stale };
  if (p.moving) return { cls: "go", label: "Jede", big: `${num(p.speed)} km/h`, t };
  if (p.keyOn) return { cls: "idle", label: "Motor běží, stojí", big: "0 km/h", t };
  return { cls: "park", label: "Zaparkováno", big: "Stojí", t };
}
const COMPASS = ["sever", "severovýchod", "východ", "jihovýchod", "jih", "jihozápad", "západ", "severozápad"];
const compass = (deg) => COMPASS[Math.round(((Number(deg) % 360) + 360) % 360 / 45) % 8];
const mapLinks = (p) => ({
  mapy: `https://mapy.com/fnc/v1/showmap?mapset=basic&center=${p.lon},${p.lat}&zoom=16&marker=true`,
  google: `https://www.google.com/maps?q=${p.lat},${p.lon}`,
  route: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`,
});
// Telefon řidiče: z karty Řidiči (šichtovnice), pokud ji uživatel smí vidět
function driverPhone(name) {
  const b = getBoard(); if (!b || !name) return "";
  const e = intData[`${b.id}:lide`]; const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const hit = e && e.data && e.data.people.find((x) => norm(x.name) === norm(name));
  return hit && hit.phone ? hit.phone : "";
}
function openCarDetail(v, data) {
  closeCarDetail();
  carDetail = { v, data, pos: undefined, error: "" };
  el("carOverlay").hidden = false; document.body.classList.add("no-scroll");
  renderCarDetail();
  loadCarGps();
  carDetail.timer = setInterval(() => loadCarGps(true), 15e3);
  // telefon řidiče: tiše načti záložku Řidiči, pokud ještě není
  const b = getBoard(); if (b && !intData[`${b.id}:lide`]) intGet(`/board/${b.id}/lide`).then((d) => { intData[`${b.id}:lide`] = { data: d }; if (carDetail) renderCarLive(); }).catch(() => {});
}
function closeCarDetail() {
  if (!carDetail) return;
  clearInterval(carDetail.timer);
  if (carDetail.map) carDetail.map.remove();
  carDetail = null; el("carOverlay").hidden = true; el("carBody").innerHTML = ""; document.body.classList.remove("no-scroll");
}
el("carOverlay").addEventListener("click", (e) => { if (e.target === el("carOverlay")) closeCarDetail(); });
async function loadCarGps(silent) {
  const b = getBoard(); if (!b || !carDetail) return;
  const ref = carDetail;
  let j;
  try { j = await intGet(`/board/${b.id}/gps`); }
  catch (e) { if (e.unauth || carDetail !== ref) return; if (!silent || ref.pos === undefined) { ref.error = "Monitoring teď neodpovídá. Zkuste to za chvíli znovu."; ref.pos = null; renderCarLive(); } return; }
  if (carDetail !== ref) return; // detail se mezitím zavřel
  if (!j || !j.enabled) { ref.error = "Propojení s monitoringem zatím není nastavené."; ref.pos = null; renderCarLive(); return; }
  if (j.error) { if (!silent || ref.pos === undefined) { ref.error = j.error; ref.pos = null; renderCarLive(); } return; }
  gpsCache = { boardId: b.id, positions: j.positions || {}, at: Date.now() };
  ref.error = ""; ref.pos = (j.positions || {})[ref.v.id] || null;
  if (!ref.pos) ref.error = "Auto v monitoringu nenalezeno – zkontrolujte, že SPZ ve šichtovnici sedí.";
  ref.updated = Date.now();
  renderCarLive(); updateCarMap();
  updateFleetGpsRows();
}
function renderCarDetail() {
  const { v } = carDetail;
  el("carBody").innerHTML = `
    <section class="cd-map" aria-label="Mapa">
      <div id="cdMapCanvas" class="cd-map-canvas"><div class="cd-map-skeleton skeleton"></div></div>
      <div id="cdMapStatus" class="cd-map-status" hidden></div>
      <button class="cd-map-back phone-only-flex" aria-label="Zavřít detail">${icon("arrowLeft", 20)}</button>
      <div id="cdMapLinks" class="cd-map-links" hidden></div>
    </section>
    <section class="cd-panel">
      <div class="cd-grabber" aria-hidden="true"></div>
      <header class="cd-head">
        <div class="cd-head-main"><h2 id="cdTitle" class="cd-spz mono">${escapeHtml(v.spz)}</h2><span class="cd-label">${escapeHtml(v.label || "Bez označení")}</span></div>
        <button class="modal-close cd-close" aria-label="Zavřít">×</button>
      </header>
      <div id="cdLive" class="cd-live"></div>
      <div id="cdRest"></div>
    </section>`;
  el("carBody").querySelector(".cd-close").onclick = closeCarDetail;
  el("carBody").querySelector(".cd-map-back").onclick = closeCarDetail;
  renderCarLive(); renderCarRest();
}
function renderCarLive() {
  if (!carDetail) return;
  const box = el("cdLive"); const { pos, error } = carDetail;
  const st = gpsState(pos);
  box.className = "cd-live " + (st ? st.cls : pos === undefined ? "loading" : "none");
  if (pos === undefined) {
    box.innerHTML = `<div class="skeleton skeleton-line" style="width:150px;height:30px"></div><div class="skeleton skeleton-line" style="width:220px"></div><div class="skeleton skeleton-line" style="width:180px"></div><div class="muted-sm">Načítám polohu z monitoringu…</div>`;
    return;
  }
  if (!pos) {
    box.innerHTML = `<div class="cd-live-msg">${escapeHtml(error)}</div><button class="pill-btn cd-retry">${icon("activity", 16)}<span>Zkusit znovu</span></button>`;
    box.querySelector(".cd-retry").onclick = () => { carDetail.pos = undefined; renderCarLive(); loadCarGps(); };
    el("cdMapCanvas").classList.add("empty"); el("cdMapCanvas").innerHTML = `<div class="cd-map-empty">${icon("mapPin", 28)}<span>Poloha není k dispozici</span></div>`;
    return;
  }
  const addr = (pos.address || "").replace(/;\s*/g, ", ");
  const sub = st.stale ? `poslední signál ${relTime(st.t)}` : st.cls === "go" && pos.direction != null ? `směr ${compass(pos.direction)}` : st.cls === "park" ? `od ${new Date(st.t).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}` : "";
  const phone = driverPhone(pos.driver); const links = mapLinks(pos);
  box.innerHTML = `
    <div class="cd-live-top">
      <div><span class="cd-state"><span class="gps-dot ${st.cls}"></span>${escapeHtml(st.label)}</span><span class="cd-big mono">${escapeHtml(st.big)}</span></div>
      <span class="cd-sub">${escapeHtml(sub)}</span>
    </div>
    ${addr ? `<div class="cd-addr">${icon("mapPin", 16)}<span>${escapeHtml(addr)}</span></div>` : ""}
    <dl class="cd-facts">
      <div><dt>Řidič</dt><dd>${escapeHtml(pos.driver || "—")}</dd></div>
      <div><dt>Motor</dt><dd>${st.stale ? "Neznámý" : pos.keyOn ? "Zapnutý" : "Vypnutý"}</dd></div>
      <div><dt>Poslední poloha</dt><dd>${st.t ? escapeHtml(relTime(st.t)) : "—"}</dd></div>
      <div><dt>Souřadnice</dt><dd class="mono">${Number(pos.lat).toFixed(4)}, ${Number(pos.lon).toFixed(4)}</dd></div>
    </dl>
    ${st.stale ? `<div class="cd-live-msg">Jednotka se delší dobu neozvala – ukazujeme poslední známou polohu (auto může stát bez signálu, např. v garáži).</div>` : ""}
    <div class="cd-live-actions">
      <a class="primary-btn cd-nav" href="${links.route}" target="_blank" rel="noopener">${icon("navigation", 16)}<span>Navigovat</span></a>
      ${phone ? `<a class="pill-btn" href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}">${icon("phone", 16)}<span>Zavolat řidiči</span></a>` : ""}
      <button class="icon-btn cd-refresh" aria-label="Obnovit polohu">${icon("refresh", 16)}</button>
    </div>`;
  box.querySelector(".cd-refresh").onclick = () => loadCarGps();
  const ms = el("cdMapStatus"); ms.hidden = false; ms.className = "cd-map-status " + st.cls;
  ms.innerHTML = `<span class="gps-dot ${st.cls}"></span>${escapeHtml(st.cls === "go" ? `Jede ${num(pos.speed)} km/h` : st.label)}`;
  const ml = el("cdMapLinks"); ml.hidden = false;
  ml.innerHTML = `<span class="cd-updated">Aktualizováno ${escapeHtml(relTime(carDetail.updated || Date.now()))}</span><span class="cd-gap"></span>
    <a class="cd-maplink" href="${links.mapy}" target="_blank" rel="noopener">Mapy.com ${icon("external", 14)}</a>
    <a class="cd-maplink" href="${links.google}" target="_blank" rel="noopener">Google Maps ${icon("external", 14)}</a>`;
}
function renderCarRest() {
  if (!carDetail) return;
  const { v, data } = carDetail; const st = serviceState(v); const s = v.posledni_servis;
  const sinceKm = v.servis_posledni_km && v.km_aktualni != null ? v.km_aktualni - v.servis_posledni_km.km : null;
  const pct = sinceKm != null ? Math.max(0, Math.min(100, Math.round(sinceKm / v.servis_interval_km * 100))) : 0;
  const openF = (v.hlaseni || []).filter((h) => h.status !== "resolved");
  const box = el("cdRest");
  box.innerHTML = `
    <section class="cd-sec">
      <div class="cd-sec-head"><h3>Servis</h3>${st ? `<span class="cd-service ${st.cls}">${escapeHtml(st.text)}</span>` : `<span class="muted-sm">Servis nezadán</span>`}</div>
      ${v.servis_posledni_km ? `<div class="progress-bar"><div class="progress-fill ${st ? st.cls : ""}" style="width:${pct}%"></div></div>` : ""}
      <div class="cd-km"><span>Tachometr <b class="mono">${v.km_aktualni != null ? num(v.km_aktualni) + " km" : "—"}</b></span><span>Za 30 dní <b class="mono">${v.najeto_30_dni != null ? num(v.najeto_30_dni) + " km" : "—"}</b></span></div>
      <div class="muted-sm">${s ? `Poslední servis ${escapeHtml(fmtDate(s.datum))} · ${escapeHtml(s.popis)}` : "Servis zatím nezapsán"}</div>
    </section>
    <section class="cd-sec">
      <div class="cd-sec-head"><h3>Otevřené závady <span class="section-count">${openF.length}</span></h3></div>
      ${openF.length ? `<ul class="fault-list">${openF.map((h) => faultItemEl(h, data.canResolve)).join("")}</ul>` : `<p class="muted-sm">Žádné otevřené závady.</p>`}
    </section>
    <div class="cd-actions"><button class="primary-btn cd-report">${icon("message", 16)}<span>Nahlásit problém</span></button><button class="pill-btn cd-service-btn">${icon("check", 16)}<span>Servis proveden</span></button></div>`;
  bindFaultButtons(box, data);
  box.querySelector(".cd-report").onclick = (e) => reportFaultPopover(e.currentTarget, v);
  box.querySelector(".cd-service-btn").onclick = (e) => servicePopover(e.currentTarget, v);
}
function carMarkerHtml(st, pos) {
  const rot = st.cls === "go" && pos.direction != null ? Number(pos.direction) : null;
  return `<div class="cd-marker ${st.cls}">${st.cls === "go" ? `<span class="cd-pulse"></span>` : ""}<span class="cd-pin">${rot != null ? `<svg viewBox="0 0 24 24" style="transform:rotate(${rot}deg)" aria-hidden="true"><path d="M12 3l7 17-7-4-7 4z" fill="#fff"/></svg>` : `<span class="cd-pin-dot"></span>`}</span></div>`;
}
async function updateCarMap() {
  const ref = carDetail; if (!ref || !ref.pos) return;
  const pos = ref.pos; const st = gpsState(pos);
  const canvas = el("cdMapCanvas");
  let L;
  try { L = await loadLeaflet(); }
  catch (e) { if (carDetail === ref) { canvas.innerHTML = `<div class="cd-map-empty">${icon("mapPin", 28)}<span>Mapu se nepodařilo načíst – použijte odkazy níže.</span></div>`; } return; }
  if (carDetail !== ref) return;
  canvas.classList.toggle("stale", !!st.stale); canvas.classList.remove("empty");
  const ll = [Number(pos.lat), Number(pos.lon)];
  const iconL = L.divIcon({ className: "", html: carMarkerHtml(st, pos), iconSize: [44, 44], iconAnchor: [22, 22] });
  if (!ref.map) {
    canvas.innerHTML = "";
    ref.map = L.map(canvas, { zoomControl: false, attributionControl: true }).setView(ll, 15);
    if (!isPhone()) L.control.zoom({ position: "topright" }).addTo(ref.map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(ref.map);
    ref.marker = L.marker(ll, { icon: iconL, keyboard: false }).addTo(ref.map);
    setTimeout(() => ref.map && ref.map.invalidateSize(), 50);
  } else {
    ref.marker.setLatLng(ll); ref.marker.setIcon(iconL);
    if (!ref.map.getBounds().pad(-0.2).contains(ll)) ref.map.panTo(ll);
  }
}
// Karty aut v seznamu: po prvním načtení GPS ukazují stav všech aut města
function gpsRowHtml(v) {
  const b = getBoard();
  const p = gpsCache && b && gpsCache.boardId === b.id ? gpsCache.positions[v.id] : undefined;
  const st = gpsState(p);
  if (!st) return `<span class="car-gps-ico neutral">${icon("mapPin", 16)}</span><span class="car-gps-main"><b>${p === null || (gpsCache && b && gpsCache.boardId === b.id) ? "Poloha není k dispozici" : "Poloha na mapě"}</b><span>Otevřít detail auta</span></span>`;
  const rot = st.cls === "go" && p.direction != null ? Number(p.direction) : null;
  return `<span class="car-gps-ico ${st.cls}">${rot != null ? `<svg viewBox="0 0 24 24" style="transform:rotate(${rot}deg)" aria-hidden="true"><path d="M12 3l7 17-7-4-7 4z" fill="#fff"/></svg>` : `<span class="cd-pin-dot"></span>`}</span>
    <span class="car-gps-main"><b>${escapeHtml(st.cls === "go" ? `Jede ${num(p.speed)} km/h` : st.label)}</b><span>${escapeHtml([p.driver, st.t ? relTime(st.t) : ""].filter(Boolean).join(" · "))}</span></span>`;
}
function updateFleetGpsRows() {
  document.querySelectorAll(".car-gps-row[data-car]").forEach((row) => {
    const entry = intData[`${(getBoard() || {}).id}:vozidla`]; const v = entry && entry.data && entry.data.vozidla.find((x) => String(x.id) === row.dataset.car);
    if (v) { const st = gpsState(gpsCache && gpsCache.positions[v.id]); row.className = "car-gps-row" + (st ? " " + st.cls : ""); row.innerHTML = gpsRowHtml(v) + `<span class="car-gps-more">Na mapě ${icon("chevronRight", 16)}</span>`; }
  });
}
function bindFaultButtons(root, data) {
  root.querySelectorAll(".fault-done").forEach((b) => b.onclick = () => {
    const v = data.vozidla.find((x) => (x.hlaseni || []).some((h) => String(h.id) === b.dataset.id)); if (!v) return;
    if (confirm("Označit závadu jako vyřešenou? Zmizí mechanikovi z fronty.")) carWrite(v, "POST", `/hlaseni/${b.dataset.id}/vyreseno`, {}, "Závada uzavřena.");
  });
}
function carCardEl(v, data) {
  const card = document.createElement("div"); card.className = "car-card car-clickable" + (v.is_active ? "" : " inactive");
  card.title = "Otevřít detail auta";
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
    <button class="car-gps-row" data-car="${escapeHtml(String(v.id))}"></button>
    <div class="car-actions"><button class="pill-btn car-faults-btn${openF.length ? " has-open" : ""}">${icon("alert", 16)}<span>Závady${openF.length ? ` · ${openF.length}` : ""}</span></button><button class="pill-btn car-report">${icon("message", 16)}<span>Nahlásit problém</span></button><button class="pill-btn car-service-btn">${icon("check", 16)}<span>Servis proveden</span></button></div>`;
  card.querySelector(".car-faults-btn").onclick = (e) => carFaultsPopover(e.currentTarget, v, data, faults, openF.length);
  card.querySelector(".car-report").onclick = (e) => reportFaultPopover(e.currentTarget, v);
  card.querySelector(".car-service-btn").onclick = (e) => servicePopover(e.currentTarget, v);
  // Poloha z monitoringu se tahá líně – až po otevření detailu auta
  const gpsRow = card.querySelector(".car-gps-row"); const gst = gpsState(gpsCache && gpsCache.positions[v.id]);
  gpsRow.className = "car-gps-row" + (gst ? " " + gst.cls : ""); gpsRow.innerHTML = gpsRowHtml(v) + `<span class="car-gps-more">Na mapě ${icon("chevronRight", 16)}</span>`;
  gpsRow.onclick = () => openCarDetail(v, data);
  card.addEventListener("click", (e) => { if (e.target.closest("button, a, summary")) return; openCarDetail(v, data); });
  return card;
}
function carFaultsPopover(anchor, v, data, faults, openCount) {
  const body = document.createElement("div"); body.className = "car-faults-pop";
  body.innerHTML = faults
    ? `<div class="muted-sm" style="margin-bottom:8px">${openCount ? `${openCount} ${plural(openCount, "otevřená", "otevřené", "otevřených")}` : "Žádné otevřené"}</div><ul class="fault-list">${faults}</ul>`
    : `<div class="muted-sm">Žádné otevřené závady.</div>`;
  bindFaultButtons(body, data);
  popover(anchor, "Závady · " + v.spz, body);
}
async function carWrite(v, method, sub, body, okMsg) {
  const b = getBoard(); if (!b) return;
  try {
    const j = await intSend(method, `/board/${b.id}/vozidla/${v.id}${sub}`, body);
    const entry = intData[`${b.id}:vozidla`];
    if (entry && entry.data && j.vozidlo) entry.data.vozidla = entry.data.vozidla.map((x) => x.id === j.vozidlo.id ? j.vozidlo : x);
    closePopover(); toast(okMsg); if (boardTab === "vozidla") renderIntTab();
    if (carDetail && j.vozidlo && String(carDetail.v.id) === String(j.vozidlo.id)) { carDetail.v = j.vozidlo; renderCarRest(); }
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
  pop.classList.toggle("sheet", isPhone()); el("sheetBackdrop").hidden = !isPhone();
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, window.innerHeight - pop.offsetHeight - 10) + "px";
  let left = r.left; if (left + pop.offsetWidth > window.innerWidth - 10) left = window.innerWidth - pop.offsetWidth - 10;
  pop.style.left = Math.max(10, left) + "px";
}
function closePopover() { el("popover").hidden = true; el("popover").innerHTML = ""; el("sheetBackdrop").hidden = true; }
el("sheetBackdrop").addEventListener("click", closePopover);

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
/* ============================================================
   Inventura — sklad pracovního oblečení
   ============================================================ */
function showInventory() {
  viewMode = "inventory"; hideIntegration();
  el("boardsView").hidden = true; el("boardView").hidden = true; el("adminView").hidden = true; el("inventoryView").hidden = false;
  el("boardTitle").textContent = ""; el("boardStar").hidden = true; el("searchWrap").hidden = true;
  el("filterBtn").hidden = true; el("menuBtn").hidden = true; el("newCardBtn").hidden = true; el("boardMembers").hidden = true;
  setHeader({ crumb: "Pracovní prostor", title: "Inventura" });
  renderInventory(); renderSidebar();
}
function invItemLabel(inv, id) { const it = (inv.items || []).find((x) => x.id === id); return it ? it.label : id; }
function invLine(inv, items) {
  return items.map((i) => `${i.count}× ${escapeHtml(invItemLabel(inv, i.item))} ${escapeHtml(i.size)}`).join(", ");
}
function renderInventory() {
  const box = el("inventoryView"); if (!box) return;
  const inv = (state && state.inventory) || { items: [], sizes: [], stock: {}, people: [], ledger: [] };
  const admin = isAdmin();
  const sizes = inv.sizes || [];
  const stockEmpty = !Object.values(inv.stock || {}).some((n) => n !== 0);

  const stockRows = (inv.items || []).map((it) => {
    const cells = sizes.map((s) => {
      const n = (inv.stock || {})[it.id + "|" + s] || 0;
      const cls = n < 0 ? "neg" : n > 0 ? "pos" : "zero";
      return `<td class="inv-cell ${cls}">${n}</td>`;
    }).join("");
    return `<tr><th class="inv-row-h">${escapeHtml(it.label)}</th>${cells}</tr>`;
  }).join("");

  const people = inv.people || [];
  const peopleHtml = people.length ? people.map((p) => `
    <div class="inv-person">
      <span class="avatar sm" style="background:${tint(colorFor(p.name), 0.82)};color:${shade(colorFor(p.name), 0.45)}">${escapeHtml(initials(p.name))}</span>
      <span class="inv-person-main"><span class="inv-person-name">${escapeHtml(p.name)}</span>
      <span class="inv-person-items">${escapeHtml(invLine(inv, p.items))}</span></span>
    </div>`).join("") : `<div class="int-empty small">Zatím nikdo nemá zapsané oblečení.</div>`;

  const ledger = inv.ledger || [];
  const ledgerHtml = ledger.length ? ledger.slice(0, 40).map((m) => {
    const kind = m.source === "init" ? "úvodní stav" : m.source === "podpisy" ? "podpis dohody" : (m.dir === "in" ? "příjem" : "výdej");
    const dirCls = m.dir === "in" ? "in" : "out";
    const who = m.personName ? ` · ${escapeHtml(m.personName)}` : "";
    const note = m.note ? ` · ${escapeHtml(m.note)}` : "";
    const del = admin ? `<button class="inv-del" data-del="${m.id}" title="Smazat pohyb">${icon("trash", 14)}</button>` : "";
    return `<div class="inv-mv">
      <span class="inv-mv-dir ${dirCls}">${m.dir === "in" ? "+" : "−"}${m.qty}</span>
      <span class="inv-mv-main"><b>${escapeHtml(invItemLabel(inv, m.item))} ${escapeHtml(m.size)}</b> <span class="inv-mv-kind">${kind}</span>${who}${note}</span>
      <span class="inv-mv-time">${escapeHtml(fmtDateTime(m.ts))}</span>${del}
    </div>`;
  }).join("") : `<div class="int-empty small">Zatím žádné pohyby.</div>`;

  const adminForm = admin ? `
    <form class="inv-form" autocomplete="off">
      <select name="dir">
        <option value="out">Výdej člověku</option>
        <option value="in">Příjem na sklad</option>
      </select>
      <select name="item">${(inv.items || []).map((i) => `<option value="${i.id}">${escapeHtml(i.label)}</option>`).join("")}</select>
      <select name="size">${sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}</select>
      <input name="qty" type="number" min="1" max="999" value="1" inputmode="numeric" aria-label="Počet kusů">
      <input name="personName" placeholder="Jméno člověka (u výdeje)" aria-label="Jméno člověka">
      <input name="note" placeholder="Poznámka (nepovinné)" aria-label="Poznámka">
      <button type="submit" class="primary-btn sm">Zapsat</button>
    </form>` : "";

  const importHtml = admin ? `
    <details class="inv-import">
      <summary>Import úvodního stavu z CSV (Google Forms)</summary>
      <p class="muted-sm">Vlož obsah CSV (co kdo už má). Nahradí předchozí úvodní import. Do skladu se nezapočítá — jen k lidem.</p>
      <textarea class="inv-csv" rows="5" placeholder="Timestamp,Jméno,Příjmení,Pobočka,Kolik kusů máš? [Trička],…"></textarea>
      <button type="button" class="pop-btn" id="invImportBtn">Importovat CSV</button>
    </details>` : "";

  box.innerHTML = `
    <div class="inv-wrap">
      <section class="inv-sec">
        <div class="inv-head"><h3>Sklad</h3></div>
        ${adminForm}
        <div class="inv-stock-wrap"><table class="inv-stock">
          <thead><tr><th></th>${sizes.map((s) => `<th>${s}</th>`).join("")}</tr></thead>
          <tbody>${stockRows}</tbody>
        </table></div>
        ${stockEmpty ? `<p class="inv-note muted-sm">Sklad je zatím prázdný. Zadej příjem (nákup), nebo sklad zatím neřeš — přehled „kdo co má" funguje i bez něj.</p>` : ""}
        ${importHtml}
      </section>
      <section class="inv-sec">
        <h3>Kdo co má <span class="section-count">${people.length}</span></h3>
        <div class="inv-people">${peopleHtml}</div>
      </section>
      <section class="inv-sec">
        <h3>Poslední pohyby</h3>
        <div class="inv-ledger">${ledgerHtml}</div>
      </section>
    </div>`;

  const form = box.querySelector(".inv-form");
  if (form) {
    const dir = form.querySelector("[name=dir]"), pn = form.querySelector("[name=personName]");
    const syncDir = () => { pn.placeholder = dir.value === "out" ? "Jméno člověka (povinné)" : "Jméno (jen u vrácení)"; };
    dir.onchange = syncDir; syncDir();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = { dir: dir.value, item: form.querySelector("[name=item]").value, size: form.querySelector("[name=size]").value,
        qty: form.querySelector("[name=qty]").value, personName: pn.value.trim(), note: form.querySelector("[name=note]").value.trim() };
      try { applyPayload(await api("POST", "/inventory/move", body)); toast(body.dir === "out" ? "Výdej zapsán." : "Příjem zapsán."); }
      catch (err) { toast(errMsg(err && err.error) || "Nepodařilo se zapsat pohyb."); }
    };
  }
  box.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    if (!confirm("Smazat tento pohyb?")) return;
    try { applyPayload(await api("DELETE", "/inventory/move/" + b.dataset.del)); } catch (e) { toast("Nepodařilo se smazat."); }
  });
  const imp = box.querySelector("#invImportBtn");
  if (imp) imp.onclick = async () => {
    const ta = box.querySelector(".inv-csv"); const csv = (ta.value || "").trim();
    if (!csv) { toast("Vlož nejdřív obsah CSV."); return; }
    imp.disabled = true;
    try { const j = await api("POST", "/inventory/import", { csv }); applyPayload(j); const r = j.imported || {}; toast(`Naimportováno: ${r.people || 0} lidí, ${r.pieces || 0} kusů${r.skipped ? ", " + r.skipped + " bez velikosti přeskočeno" : ""}.`); }
    catch (e) { toast(errMsg(e && e.error) || "Import selhal."); }
    finally { imp.disabled = false; }
  };
}

function showAdmin() { if (!isAdmin()) return; viewMode = "admin"; hideIntegration(); el("boardsView").hidden = true; el("boardView").hidden = true; el("inventoryView").hidden = true; el("adminView").hidden = false;
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
el("navInventory").onclick = () => { closeDrawer(); showInventory(); };
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
el("mnHome").onclick = () => { closeDrawer(); showBoards(); };
el("mnTasks").onclick = openMyTasks;
el("mnCities").onclick = (e) => { if (viewMode !== "board" && lastBoardId && state.boards.some((b) => b.id === lastBoardId)) openBoard(lastBoardId); else citySheet(e.currentTarget); };
el("mnMe").onclick = (e) => el("userBtn").onclick(e);
el("mnAdd").onclick = (e) => {
  const anchor = e.currentTarget; const body = document.createElement("div"); body.className = "add-chooser";
  [["check", "Úkol", "Karta do seznamu, komu a do kdy", () => quickAddSheet(anchor)],
   ["user", "Nový kurýr", "Odkaz na smlouvy, test a oblečení", () => openNewCourier(viewMode === "board" && intInfo ? intInfo.city : null)]]
    .forEach(([ic, title, sub, fn]) => { const b = document.createElement("button"); b.className = "add-choice";
      b.innerHTML = `${icon(ic, 20)}<span><b>${title}</b><small>${sub}</small></span>`; b.onclick = () => { closePopover(); fn(); }; body.appendChild(b); });
  popover(anchor, "Přidat", body);
};
el("citySwitch").onclick = (e) => citySheet(e.currentTarget);
el("userBtn").onclick = (e) => {
  const anchorEl = e.currentTarget;
  const body = document.createElement("div");
  const info = document.createElement("div"); info.className = "pop-user"; info.innerHTML = `<b>${escapeHtml(me.name)}</b><br><span style="color:var(--muted);font-size:12px">${escapeHtml(me.username)} · ${me.role === "admin" ? "admin" : "manažer"}</span>`; body.appendChild(info);
  const nt = document.createElement("div"); nt.className = "pop-row"; nt.innerHTML = `${icon("bell", 16)} <span>Upozornění</span>`; nt.onclick = () => notifyPopover(anchorEl); body.appendChild(nt);
  const th = document.createElement("div"); th.className = "pop-row"; const dark = (state && state.theme) === "dark";
  th.innerHTML = `${icon("moon", 16)} <span style="flex:1">Tmavý režim</span><span class="mini-switch${dark ? " on" : ""}" aria-hidden="true"></span>`;
  th.setAttribute("role", "switch"); th.setAttribute("aria-checked", String(dark)); th.tabIndex = 0;
  th.onclick = () => { el("themeBtn").click(); const d = state.theme === "dark"; th.querySelector(".mini-switch").classList.toggle("on", d); th.setAttribute("aria-checked", String(d)); };
  body.appendChild(th);
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

document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!el("popover").hidden) return closePopover(); if (carDetail) return closeCarDetail(); if (!el("personOverlay").hidden) return closePerson(); if (!el("modalOverlay").hidden) return closeModal(); if (!el("drawerOverlay").hidden) return closeDrawer(); } });

/* ============================================================
   Rychlé přidání karty (tlačítko + na telefonu)
   ============================================================ */
function quickAddSheet(anchor) {
  const boards = state.boards.filter((b) => !b.virtual && b.lists.some((l) => !l.archived));
  if (!boards.length) return toast("Zatím tu není žádný seznam, kam kartu přidat.");
  const cur = getBoard();
  let boardId = cur && !cur.virtual ? cur.id : (lastBoardId && boards.some((b) => b.id === lastBoardId) ? lastBoardId : boards[0].id);
  let listId = mobileList[boardId] || null;
  const who = new Set([me.id]); let due = 0;
  const body = document.createElement("div"); body.className = "quick-add";
  body.innerHTML = `<label class="qa-label">Co je potřeba udělat<textarea class="pop-input qa-title" rows="2" placeholder="Např. Objednat STK pro 7A2 1180"></textarea></label>
    <div class="qa-where"><label class="qa-label">Město<select class="pop-input qa-board"></select></label><label class="qa-label">Seznam<select class="pop-input qa-list"></select></label></div>
    <div class="qa-label">Komu</div><div class="qa-chips qa-who"></div>
    <div class="qa-label">Termín</div><div class="qa-chips qa-due"></div>`;
  const bSel = body.querySelector(".qa-board"), lSel = body.querySelector(".qa-list");
  boards.forEach((b) => bSel.add(new Option(b.title, b.id, false, b.id === boardId)));
  const fillLists = () => { const b = boards.find((x) => x.id === boardId); lSel.innerHTML = "";
    const ls = b.lists.filter((l) => !l.archived); if (!ls.some((l) => l.id === listId)) listId = ls[0].id;
    ls.forEach((l) => lSel.add(new Option(l.title, l.id, false, l.id === listId))); };
  fillLists();
  bSel.onchange = () => { boardId = bSel.value; listId = null; fillLists(); };
  lSel.onchange = () => { listId = lSel.value; };
  const whoBox = body.querySelector(".qa-who");
  const drawWho = () => { whoBox.innerHTML = ""; [me, ...state.members.filter((m) => m.id !== me.id)].forEach((m) => {
    const on = who.has(m.id); const c = document.createElement("button"); c.type = "button"; c.className = "qa-chip person" + (on ? " on" : ""); c.setAttribute("aria-pressed", String(on));
    c.appendChild(avatarEl(m, "sm")); c.appendChild(document.createTextNode(m.id === me.id ? "Já" : m.name.split(" ")[0]));
    c.onclick = () => { if (on) who.delete(m.id); else who.add(m.id); drawWho(); }; whoBox.appendChild(c); }); };
  drawWho();
  const at = (addDays, toFri) => { const d = new Date(); if (toFri) { const k = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + k); } else d.setDate(d.getDate() + addDays); d.setHours(17, 0, 0, 0); return d.getTime(); };
  const dues = [["Bez termínu", null], ["Dnes", () => at(0)], ["Zítra", () => at(1)], ["Pátek", () => at(0, true)]];
  const dueBox = body.querySelector(".qa-due");
  const drawDue = () => { dueBox.innerHTML = ""; dues.forEach(([label], i) => { const c = document.createElement("button"); c.type = "button"; c.className = "qa-chip" + (i === due ? " on" : ""); c.setAttribute("aria-pressed", String(i === due)); c.textContent = label; c.onclick = () => { due = i; drawDue(); }; dueBox.appendChild(c); }); };
  drawDue();
  const btn = document.createElement("button"); btn.className = "pop-btn qa-submit"; btn.textContent = "Přidat kartu";
  btn.onclick = async () => {
    const title = body.querySelector(".qa-title").value.trim(); if (!title) { body.querySelector(".qa-title").focus(); return toast("Napiš, co je potřeba udělat."); }
    btn.disabled = true;
    try {
      const before = new Set(((state.boards.find((b) => b.id === boardId) || {}).lists || []).flatMap((l) => l.cards.map((c) => c.id)));
      let j = await api("POST", "/lists/" + listId + "/cards", { title });
      const nb = j.state.boards.find((b) => b.id === boardId); const nl = nb && nb.lists.find((l) => l.id === listId);
      const card = nl && nl.cards.slice().reverse().find((c) => !before.has(c.id));
      const memberIds = [...who]; const dueVal = dues[due][1] ? { date: dues[due][1](), done: false } : null;
      if (card && (memberIds.length || dueVal)) j = await api("PUT", "/cards/" + card.id, { memberIds, due: dueVal });
      applyPayload(j); closePopover();
      mobileList[boardId] = listId;
      toast(`Karta přidána · ${nb ? nb.title : ""} · ${nl ? nl.title : ""}`);
    } catch (e) { btn.disabled = false; }
  };
  body.appendChild(btn);
  popover(anchor, "Nová karta", body);
  setTimeout(() => body.querySelector(".qa-title").focus(), 50);
}

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
