/* Trellite Pro — víceuživatelský backend.
   - Přihlášení (jméno + heslo, bcrypt, JWT cookie)
   - Role admin/manager, oprávnění na nástěnky a skryté seznamy
   - Přiřazování úkolů + upozornění ("Moje úkoly")
   - Živá synchronizace přes SSE
   - Úložiště: PostgreSQL (DATABASE_URL) nebo lokální soubor (dev). */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const webpush = require("web-push");

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_ID = "default";

app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, file) => { if (file.endsWith("sw.js") || file.endsWith("manifest.json")) res.setHeader("Cache-Control", "no-cache"); },
}));

const uid = () => crypto.randomBytes(6).toString("hex");

/* ============================================================
   ÚLOŽIŠTĚ
   ============================================================ */
let storage;
if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  const useSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : false });
  async function init() {
    await pool.query(`CREATE TABLE IF NOT EXISTS workspace (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  }
  storage = {
    ready: init(),
    async get() { const r = await pool.query("SELECT data FROM workspace WHERE id=$1", [WORKSPACE_ID]); return r.rows[0] ? r.rows[0].data : null; },
    async set(data) { await pool.query(`INSERT INTO workspace (id,data,updated_at) VALUES ($1,$2,now()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`, [WORKSPACE_ID, data]); },
  };
  console.log("Úložiště: PostgreSQL");
} else {
  const dir = path.join(__dirname, "data");
  const file = path.join(dir, "state.json");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  storage = {
    ready: Promise.resolve(),
    async get() { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } },
    async set(data) { fs.writeFileSync(file, JSON.stringify(data)); },
  };
  console.log("Úložiště: lokální soubor (dev)");
}

/* In-memory autoritativní dokument */
let DOC = null;
let version = 1;
async function loadDoc() {
  await storage.ready;
  let d = await storage.get();
  if (!d || !d.users) { d = seed(); await storage.set(d); }
  if (!d.meta) d.meta = {};
  if (!d.meta.jwtSecret) { d.meta.jwtSecret = crypto.randomBytes(32).toString("hex"); await storage.set(d); }
  if (!d.meta.vapid && !process.env.VAPID_PUBLIC_KEY) { d.meta.vapid = webpush.generateVAPIDKeys(); await storage.set(d); }
  DOC = d;
  setupPush();
}
let saveTimer = null;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => storage.set(DOC).catch((e) => console.error("persist", e)), 150); }

/* ============================================================
   UKÁZKOVÁ DATA
   ============================================================ */
const LABELS_DEF = [["Urgentní", "#cf8a4e"], ["Běžné", "#4c6793"], ["Čeká", "#cf9a46"], ["Hotovo", "#5a9e6f"], ["Problém", "#c15f5b"], ["Info", "#4f9aa3"]];
const AVATAR_COLORS = ["#4c6793", "#c15f5b", "#5a9e6f", "#cf9a46", "#8d6fae", "#cf8a4e", "#4f9aa3", "#b07f99"];
const CITY_BGS = {
  "Mělník": { type: "color", value: "#3d4f6d" },
  "Benešov": { type: "color", value: "#3f5e54" },
  "Vlašim": { type: "color", value: "#6d5a4a" },
  "Krumlov": { type: "color", value: "#5a4e6d" },
  "Neratovice": { type: "color", value: "#44607a" },
};
const LIST_NAMES = ["Zaměstnanci", "Vozidla", "Nábory", "Restaurace", "Problémy", "Aktuální úkoly"];

function seed() {
  const days = (n) => Date.now() + n * 864e5;
  const mkUser = (username, name, role, ci) => ({
    id: uid(), username, passwordHash: bcrypt.hashSync(role === "admin" ? "admin123" : "heslo123", 10),
    name, role, color: AVATAR_COLORS[ci % AVATAR_COLORS.length], theme: "light", access: {}, newTaskIds: [],
  });
  const denis = mkUser("denis", "Denis", "admin", 0);
  const miroslav = mkUser("miroslav", "Miroslav", "admin", 4);
  const daniel = mkUser("daniel", "Daniel", "manager", 2);
  const users = [denis, miroslav, daniel];

  const boards = [];
  const boardByCity = {};
  Object.keys(CITY_BGS).forEach((city) => {
    const labels = LABELS_DEF.map(([name, color]) => ({ id: uid(), name, color }));
    const lists = LIST_NAMES.map((n) => ({ id: uid(), title: n, archived: false, collapsed: false, cards: [] }));
    const b = { id: uid(), title: city, bg: CITY_BGS[city], starred: false, archived: false, labels, activity: [], lists };
    boards.push(b); boardByCity[city] = b;
  });

  const card = (title, o = {}) => ({
    id: uid(), title, desc: o.desc || "", archived: false, labelIds: o.labels || [], memberIds: o.members || [],
    due: o.due || null, start: null, cover: o.cover || null, checklists: o.checklists || [], attachments: [], comments: o.comments || [], createdAt: Date.now(),
  });
  const listByName = (b, name) => b.lists.find((l) => l.title === name);
  const L = (b) => b.labels.reduce((a, l) => (a[l.name] = l.id, a), {});
  const cm = (mid, text, agoH) => ({ id: uid(), memberId: mid, text, ts: Date.now() - agoH * 3600e3 });

  // Mělník
  {
    const b = boardByCity["Mělník"]; const lab = L(b);
    listByName(b, "Vozidla").cards.push(card("Servis vozu 5809", { labels: [lab["Urgentní"]], members: [daniel.id], due: { date: days(3), done: false }, desc: "Pravidelný servis + výměna oleje." }));
    listByName(b, "Zaměstnanci").cards.push(card("Doplnit směny na víkend", { labels: [lab["Běžné"]], members: [daniel.id], due: { date: days(1), done: false } }));
    listByName(b, "Restaurace").cards.push(card("Kontrola skladu – restaurace náměstí", { labels: [lab["Info"]] }));
    listByName(b, "Problémy").cards.push(card("Rozbité topení v provozovně", { labels: [lab["Problém"]], members: [daniel.id], due: { date: days(-1), done: false } }));
  }
  // Neratovice
  {
    const b = boardByCity["Neratovice"]; const lab = L(b);
    listByName(b, "Nábory").cards.push(card("Nábor – brigádník na léto", { labels: [lab["Běžné"]], members: [daniel.id] }));
    listByName(b, "Aktuální úkoly").cards.push(card("Předat podklady pro fakturaci", { labels: [lab["Čeká"]], members: [daniel.id], due: { date: days(5), done: false } }));
  }
  // Benešov
  {
    const b = boardByCity["Benešov"]; const lab = L(b);
    listByName(b, "Problémy").cards.push(card("Stížnost zákazníka – objednávka #2231", { labels: [lab["Problém"]], members: [miroslav.id], due: { date: days(2), done: false }, comments: [cm(miroslav.id, "Zavolám zákazníkovi zítra.", 5)] }));
    listByName(b, "Vozidla").cards.push(card("Přezout pneumatiky – dodávka", { labels: [lab["Běžné"]], members: [daniel.id] }));
  }
  // Vlašim
  {
    const b = boardByCity["Vlašim"]; const lab = L(b);
    listByName(b, "Zaměstnanci").cards.push(card("Školení BOZP", { labels: [lab["Info"]], members: [daniel.id], due: { date: days(7), done: false } }));
  }
  // Krumlov
  {
    const b = boardByCity["Krumlov"]; const lab = L(b);
    listByName(b, "Restaurace").cards.push(card("Nové menu – návrh", { labels: [lab["Běžné"]], members: [daniel.id], due: { date: days(4), done: false } }));
    listByName(b, "Aktuální úkoly").cards.push(card("Objednat ubrusy", { labels: [lab["Čeká"]], members: [daniel.id] }));
  }

  // Oprávnění managerů
  const grant = (user, city, hidden = []) => { const b = boardByCity[city]; user.access[b.id] = { hidden: hidden.map((n) => listByName(b, n).id) }; };
  Object.keys(CITY_BGS).forEach((city) => grant(daniel, city));

  // Počáteční upozornění (nové přiřazené úkoly)
  const assignedOf = (u) => { const ids = []; boards.forEach((b) => b.lists.forEach((l) => l.cards.forEach((c) => { if (c.memberIds.includes(u.id)) ids.push(c.id); }))); return ids; };
  [daniel, miroslav].forEach((u) => { u.newTaskIds = assignedOf(u); });

  return { meta: { jwtSecret: crypto.randomBytes(32).toString("hex") }, users, boards };
}

/* ============================================================
   POMOCNÍCI
   ============================================================ */
const findUser = (id) => DOC.users.find((u) => u.id === id);
const findUserByName = (n) => DOC.users.find((u) => u.username.toLowerCase() === String(n || "").toLowerCase());
const findBoard = (id) => DOC.boards.find((b) => b.id === id);
function findCard(cardId) {
  for (const b of DOC.boards) for (const l of b.lists) { const c = l.cards.find((x) => x.id === cardId); if (c) return { board: b, list: l, card: c }; }
  return null;
}
function findList(listId) {
  for (const b of DOC.boards) { const l = b.lists.find((x) => x.id === listId); if (l) return { board: b, list: l }; }
  return null;
}
const isAdmin = (u) => u.role === "admin";
const canSeeBoard = (u, b) => isAdmin(u) || !!u.access[b.id];
const listHidden = (u, b, l) => !isAdmin(u) && u.access[b.id] && (u.access[b.id].hidden || []).includes(l.id);
const canSeeList = (u, b, l) => canSeeBoard(u, b) && !listHidden(u, b, l) && !l.archived;
const canEditCard = (u, b, l, c) => isAdmin(u) || (canSeeBoard(u, b) && !listHidden(u, b, l)) || c.memberIds.includes(u.id);

function sanitizeUser(u) { return { id: u.id, username: u.username, name: u.name, role: u.role, color: u.color, access: u.access }; }

const DUE_BUCKETS = [
  { key: "overdue", title: "Po termínu" },
  { key: "soon", title: "Tento týden" },
  { key: "later", title: "Později" },
  { key: "none", title: "Bez termínu" },
  { key: "done", title: "Hotovo" },
];
function dueBucket(due) {
  if (!due) return "none";
  if (due.done) return "done";
  const diff = due.date - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 7 * 864e5) return "soon";
  return "later";
}

function buildMyTasks(u) {
  const byBucket = {}; DUE_BUCKETS.forEach((b) => byBucket[b.key] = []);
  const labelsById = {};
  DOC.boards.forEach((b) => { if (b.archived) return;
    b.lists.forEach((l) => { if (l.archived) return;
      l.cards.forEach((c) => {
        if (c.archived || !c.memberIds.includes(u.id)) return;
        (c.labelIds || []).forEach((id) => { const lab = b.labels.find((x) => x.id === id); if (lab) labelsById[id] = lab; });
        const copy = JSON.parse(JSON.stringify(c));
        copy._origin = { boardId: b.id, boardTitle: b.title, listId: l.id, listTitle: l.title };
        byBucket[dueBucket(c.due)].push(copy);
      });
    });
  });
  const lists = DUE_BUCKETS.filter((b) => byBucket[b.key].length).map((b) => ({ id: "__mt_" + b.key, title: b.title, archived: false, collapsed: false, cards: byBucket[b.key] }));
  return { id: "__mytasks__", title: "Moje úkoly", bg: { type: "gradient", value: "linear-gradient(135deg,#334155,#475569)" }, starred: false, archived: false, virtual: true, labels: Object.values(labelsById), activity: [], lists };
}

function filterStateFor(u) {
  const boards = [buildMyTasks(u)];
  DOC.boards.filter((b) => !b.archived && canSeeBoard(u, b)).forEach((b) => {
    boards.push({
      id: b.id, title: b.title, bg: b.bg, starred: b.starred, archived: false, labels: b.labels, activity: b.activity,
      lists: b.lists.filter((l) => !l.archived && !listHidden(u, b, l)).map((l) => JSON.parse(JSON.stringify(l))),
    });
  });
  const members = DOC.users.map((x) => ({ id: x.id, name: x.name, color: x.color }));
  const validNew = (u.newTaskIds || []).filter((id) => { const f = findCard(id); return f && f.card.memberIds.includes(u.id) && !f.card.archived; });
  const me = { id: u.id, username: u.username, name: u.name, role: u.role, color: u.color, theme: u.theme || "light", access: u.access, newTaskCount: validNew.length, newTaskIds: validNew,
    notify: notifyPrefs(u), pushDevices: (u.pushSubs || []).map((s) => s.endpoint) };
  const out = { me, state: { activeMemberId: u.id, theme: u.theme || "light", members, boards } };
  if (isAdmin(u)) {
    out.users = DOC.users.map(sanitizeUser);
    out.allBoards = DOC.boards.filter((b) => !b.archived).map((b) => ({ id: b.id, title: b.title, lists: b.lists.filter((l) => !l.archived).map((l) => ({ id: l.id, title: l.title })) }));
  }
  return out;
}

/* přiřazení → upozornění */
function noteAssignments(card, prevIds, actorId) {
  const added = card.memberIds.filter((id) => !prevIds.includes(id));
  const actor = findUser(actorId);
  added.forEach((id) => { if (id === actorId) return; const u = findUser(id); if (!u) return;
    if (!u.newTaskIds.includes(card.id)) u.newTaskIds.push(card.id);
    const f = findCard(card.id);
    notifyUser(u, "assign", { title: "Nový úkol" + (f ? " · " + f.board.title : ""), body: `${actor ? actor.name : "Někdo"} ti přiřadil: ${card.title}`, url: cardUrl(card.id), tag: "assign-" + card.id });
  });
}
/* nový komentář → řešitelé karty kromě autora */
function noteComments(card, prevComments, actorId) {
  const prev = new Set((prevComments || []).map((c) => c.id));
  const actor = findUser(actorId); const f = findCard(card.id);
  (card.comments || []).filter((c) => !prev.has(c.id) && c.memberId === actorId).forEach((c) => {
    card.memberIds.forEach((id) => { if (id === actorId) return; const u = findUser(id); if (!u) return;
      const text = String(c.text || ""); notifyUser(u, "comment", { title: "Komentář · " + card.title, body: `${actor ? actor.name : "Někdo"}: ${text.length > 140 ? text.slice(0, 137) + "…" : text}`, url: cardUrl(card.id), tag: "comment-" + card.id }); });
  });
}

/* ============================================================
   PUSH UPOZORNĚNÍ (Web Push — iPhone od iOS 16.4 po přidání na plochu)
   ============================================================ */
const NOTIFY_DEFAULTS = { assign: true, comment: true, due: true, fault: true };
const notifyPrefs = (u) => Object.assign({}, NOTIFY_DEFAULTS, u.notify || {});
const cardUrl = (id) => "/#card=" + id;
let pushReady = false;
function vapidKeys() { return process.env.VAPID_PUBLIC_KEY ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY } : DOC.meta.vapid; }
function setupPush() {
  const k = vapidKeys(); if (!k || !k.publicKey || !k.privateKey) return;
  // Apple vyžaduje platný kontakt (mailto: nebo https URL)
  const subject = process.env.VAPID_SUBJECT || DOC.meta.pushOrigin || "mailto:admin@trellite.app";
  try { webpush.setVapidDetails(subject, k.publicKey, k.privateKey); pushReady = true; } catch (e) { console.error("VAPID", e.message); }
}
async function sendPush(u, payload) {
  if (!pushReady || !(u.pushSubs || []).length) return;
  const data = JSON.stringify(payload); let changed = false;
  await Promise.all(u.pushSubs.slice().map(async (sub) => {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, data, { TTL: 24 * 3600, urgency: "high" }); }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { u.pushSubs = u.pushSubs.filter((s) => s.endpoint !== sub.endpoint); changed = true; }
      else console.error("push", e.statusCode || "", e.body || e.message);
    }
  }));
  if (changed) persist();
}
function notifyUser(u, kind, payload) { if (notifyPrefs(u)[kind]) sendPush(u, payload).catch((e) => console.error("push", e)); }

/* kontrola termínů: do 24 h a po termínu — každý termín jen jednou */
function checkDueDates() {
  if (!DOC || !pushReady) return;
  const now = Date.now(); let changed = false;
  DOC.boards.forEach((b) => { if (b.archived) return; b.lists.forEach((l) => { if (l.archived) return; l.cards.forEach((c) => {
    if (c.archived || !c.due || c.due.done || !c.memberIds.length) return;
    const sent = c.dueNotified || {}; const diff = c.due.date - now;
    let kind = null;
    if (diff > 0 && diff <= 24 * 3600e3 && sent.soon !== c.due.date) kind = "soon";
    else if (diff <= 0 && diff > -24 * 3600e3 && sent.late !== c.due.date) kind = "late";
    if (!kind) return;
    c.dueNotified = Object.assign({}, sent, { [kind]: c.due.date }); changed = true;
    const when = new Date(c.due.date).toLocaleString("cs-CZ", { timeZone: process.env.TZ || "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
    c.memberIds.forEach((id) => { const u = findUser(id); if (!u) return;
      notifyUser(u, "due", { title: kind === "soon" ? "Blíží se termín · " + b.title : "Po termínu · " + b.title, body: `${c.title} (${when})`, url: cardUrl(c.id), tag: "due-" + c.id }); });
  }); }); });
  if (changed) persist();
}
const DUE_CHECK_MS = Number(process.env.DUE_CHECK_MS) || 10 * 60e3;
setInterval(checkDueDates, DUE_CHECK_MS);
setTimeout(checkDueDates, Math.min(DUE_CHECK_MS, 30e3));

/* ============================================================
   SSE (živé změny)
   ============================================================ */
const sseClients = new Set();
function broadcast(originator, kind) {
  version++;
  const payload = `data: ${JSON.stringify({ version, originator: originator || null, kind: kind || null })}\n\n`;
  for (const res of sseClients) { try { res.write(payload); } catch (e) {} }
}

/* ============================================================
   AUTH
   ============================================================ */
function authFromReq(req) {
  const tok = req.cookies && req.cookies.tok;
  if (!tok) return null;
  try { const p = jwt.verify(tok, DOC.meta.jwtSecret); return findUser(p.uid) || null; } catch (e) { return null; }
}
function requireAuth(req, res, next) { const u = authFromReq(req); if (!u) return res.status(401).json({ error: "unauthorized" }); req.user = u; next(); }
function requireAdmin(req, res, next) { if (!isAdmin(req.user)) return res.status(403).json({ error: "forbidden" }); next(); }

function respond(req, res) { broadcast(req.header("x-client-id")); persist(); res.json(filterStateFor(req.user)); }

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = findUserByName(username);
  if (!u || !bcrypt.compareSync(String(password || ""), u.passwordHash)) return res.status(401).json({ error: "bad_credentials" });
  const tok = jwt.sign({ uid: u.id }, DOC.meta.jwtSecret, { expiresIn: "30d" });
  res.cookie("tok", tok, { httpOnly: true, sameSite: "lax", maxAge: 30 * 864e5 });
  res.json(filterStateFor(u));
});
app.post("/api/logout", (req, res) => { res.clearCookie("tok"); res.json({ ok: true }); });
app.get("/api/state", requireAuth, (req, res) => res.json(filterStateFor(req.user)));

app.get("/api/events", requireAuth, (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders && res.flushHeaders();
  res.write(`data: ${JSON.stringify({ version })}\n\n`);
  sseClients.add(res);
  const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (e) {} }, 25000);
  req.on("close", () => { clearInterval(hb); sseClients.delete(res); });
});

/* ============================================================
   ÚČET
   ============================================================ */
app.post("/api/account/theme", requireAuth, (req, res) => { req.user.theme = req.body.theme === "dark" ? "dark" : "light"; persist(); res.json({ ok: true }); });
app.get("/api/push/key", requireAuth, (req, res) => { const k = vapidKeys(); res.json({ publicKey: pushReady && k ? k.publicKey : null }); });
app.post("/api/push/subscribe", requireAuth, (req, res) => {
  const sub = (req.body || {}).subscription;
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return res.status(400).json({ error: "bad_subscription" });
  if (!DOC.meta.pushOrigin && !process.env.VAPID_SUBJECT) {
    const proto = String(req.header("x-forwarded-proto") || req.protocol).split(",")[0];
    if (proto === "https") { DOC.meta.pushOrigin = "https://" + req.get("host"); setupPush(); }
  }
  // jedno zařízení patří jen jednomu uživateli
  DOC.users.forEach((u) => { if (u.pushSubs) u.pushSubs = u.pushSubs.filter((s) => s.endpoint !== sub.endpoint); });
  req.user.pushSubs = (req.user.pushSubs || []).concat([{ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, ua: String(req.header("user-agent") || "").slice(0, 200), createdAt: Date.now() }]).slice(-10);
  persist(); res.json(filterStateFor(req.user));
});
app.post("/api/push/unsubscribe", requireAuth, (req, res) => {
  const ep = (req.body || {}).endpoint; req.user.pushSubs = (req.user.pushSubs || []).filter((s) => s.endpoint !== ep);
  persist(); res.json(filterStateFor(req.user));
});
app.post("/api/push/test", requireAuth, async (req, res) => {
  if (!(req.user.pushSubs || []).length) return res.status(400).json({ error: "no_devices" });
  await sendPush(req.user, { title: "Trellite", body: "Upozornění fungují. Takhle uvidíš nové úkoly, komentáře a termíny.", url: "/", tag: "test" });
  res.json({ ok: true });
});
app.post("/api/account/notify", requireAuth, (req, res) => {
  const b = req.body || {}; const cur = notifyPrefs(req.user);
  Object.keys(NOTIFY_DEFAULTS).forEach((k) => { if (b[k] !== undefined) cur[k] = !!b[k]; });
  req.user.notify = cur; persist(); res.json(filterStateFor(req.user));
});
app.post("/api/account/seen", requireAuth, (req, res) => { req.user.newTaskIds = []; persist(); res.json(filterStateFor(req.user)); });
app.post("/api/account/password", requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!bcrypt.compareSync(String(current || ""), req.user.passwordHash)) return res.status(400).json({ error: "bad_current" });
  if (!next || String(next).length < 4) return res.status(400).json({ error: "weak" });
  req.user.passwordHash = bcrypt.hashSync(String(next), 10); persist(); res.json({ ok: true });
});

/* ============================================================
   NÁSTĚNKY (struktura — admin)
   ============================================================ */
app.post("/api/boards", requireAuth, requireAdmin, (req, res) => {
  const { title, bg } = req.body || {};
  const labels = LABELS_DEF.map(([name, color]) => ({ id: uid(), name, color }));
  DOC.boards.push({ id: uid(), title: (title || "Nová nástěnka").trim(), bg: bg || { type: "color", value: "#3d4f6d" }, starred: false, archived: false, labels, activity: [], lists: [] });
  respond(req, res);
});
app.patch("/api/boards/:id", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.id); if (!b) return res.status(404).json({ error: "not_found" });
  const { title, bg, starred } = req.body || {};
  if (title !== undefined) b.title = String(title).trim() || b.title;
  if (bg !== undefined) b.bg = bg;
  if (starred !== undefined) b.starred = !!starred;
  respond(req, res);
});
app.delete("/api/boards/:id", requireAuth, requireAdmin, (req, res) => {
  DOC.boards = DOC.boards.filter((b) => b.id !== req.params.id);
  DOC.users.forEach((u) => { delete u.access[req.params.id]; });
  respond(req, res);
});
app.post("/api/boards/:id/archive", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.id); if (b) b.archived = true; respond(req, res);
});

/* ---------- Seznamy (struktura — admin) ---------- */
app.post("/api/boards/:id/lists", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.id); if (!b) return res.status(404).json({ error: "not_found" });
  b.lists.push({ id: uid(), title: (req.body.title || "Nový seznam").trim(), archived: false, collapsed: false, cards: [] });
  respond(req, res);
});
app.patch("/api/lists/:id", requireAuth, (req, res) => {
  const f = findList(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  const admin = isAdmin(req.user);
  const { title, archived, collapsed } = req.body || {};
  if (collapsed !== undefined) f.list.collapsed = !!collapsed; // kolaps smí kdokoli kdo vidí
  if (admin) {
    if (title !== undefined) f.list.title = String(title).trim() || f.list.title;
    if (archived !== undefined) f.list.archived = !!archived;
  } else if (title !== undefined || archived !== undefined) { return res.status(403).json({ error: "forbidden" }); }
  respond(req, res);
});
app.post("/api/lists/:id/sort", requireAuth, (req, res) => {
  const f = findList(req.params.id); if (!f || !canSeeList(req.user, f.board, f.list)) return res.status(403).json({ error: "forbidden" });
  const by = req.body.by;
  const act = f.list.cards.filter((c) => !c.archived), arch = f.list.cards.filter((c) => c.archived);
  if (by === "name") act.sort((a, b) => a.title.localeCompare(b.title, "cs"));
  else if (by === "due") act.sort((a, b) => (a.due ? a.due.date : Infinity) - (b.due ? b.due.date : Infinity));
  else act.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  f.list.cards = act.concat(arch); respond(req, res);
});
app.post("/api/lists/:id/archive-cards", requireAuth, requireAdmin, (req, res) => {
  const f = findList(req.params.id); if (f) f.list.cards.forEach((c) => c.archived = true); respond(req, res);
});
app.post("/api/lists/:id/copy", requireAuth, requireAdmin, (req, res) => {
  const f = findList(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  const copy = JSON.parse(JSON.stringify(f.list)); copy.id = uid(); copy.title = f.list.title + " (kopie)"; copy.cards.forEach((c) => c.id = uid());
  const idx = f.board.lists.indexOf(f.list); f.board.lists.splice(idx + 1, 0, copy); respond(req, res);
});

/* ---------- Karty ---------- */
app.post("/api/lists/:id/cards", requireAuth, (req, res) => {
  const f = findList(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  if (!canSeeList(req.user, f.board, f.list)) return res.status(403).json({ error: "forbidden" });
  const title = String(req.body.title || "").trim(); if (!title) return res.status(400).json({ error: "empty" });
  const c = { id: uid(), title, desc: "", archived: false, labelIds: [], memberIds: [], due: null, start: null, cover: null, checklists: [], attachments: [], comments: [], createdAt: Date.now() };
  f.list.cards.push(c); respond(req, res);
});
app.put("/api/cards/:id", requireAuth, (req, res) => {
  const f = findCard(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  if (!canEditCard(req.user, f.board, f.list, f.card)) return res.status(403).json({ error: "forbidden" });
  const body = req.body || {}; const prevMembers = f.card.memberIds.slice(); const prevComments = (f.card.comments || []).slice();
  const allowed = ["title", "desc", "labelIds", "memberIds", "due", "start", "cover", "checklists", "attachments", "comments", "archived"];
  allowed.forEach((k) => { if (body[k] !== undefined) f.card[k] = body[k]; });
  if (body.memberIds !== undefined) noteAssignments(f.card, prevMembers, req.user.id);
  if (body.comments !== undefined) noteComments(f.card, prevComments, req.user.id);
  respond(req, res);
});
app.delete("/api/cards/:id", requireAuth, (req, res) => {
  const f = findCard(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  if (!canEditCard(req.user, f.board, f.list, f.card)) return res.status(403).json({ error: "forbidden" });
  f.list.cards = f.list.cards.filter((c) => c.id !== req.params.id); respond(req, res);
});
app.post("/api/cards/:id/copy", requireAuth, (req, res) => {
  const f = findCard(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  if (!canSeeList(req.user, f.board, f.list)) return res.status(403).json({ error: "forbidden" });
  const copy = JSON.parse(JSON.stringify(f.card)); copy.id = uid();
  copy.title = String(req.body.title || f.card.title).trim() || f.card.title;
  copy.comments = []; copy.createdAt = Date.now(); delete copy.dueNotified;
  (copy.checklists || []).forEach((cl) => { cl.id = uid(); (cl.items || []).forEach((i) => i.id = uid()); });
  (copy.attachments || []).forEach((a) => a.id = uid());
  const idx = f.list.cards.findIndex((c) => c.id === f.card.id);
  f.list.cards.splice(idx + 1, 0, copy); respond(req, res);
});
app.post("/api/cards/:id/move", requireAuth, (req, res) => {
  const f = findCard(req.params.id); if (!f) return res.status(404).json({ error: "not_found" });
  const dest = findList(req.body.toListId); if (!dest) return res.status(404).json({ error: "dest_not_found" });
  if (!canEditCard(req.user, f.board, f.list, f.card) || !canSeeList(req.user, dest.board, dest.list)) return res.status(403).json({ error: "forbidden" });
  f.list.cards = f.list.cards.filter((c) => c.id !== f.card.id);
  const idx = Math.max(0, Math.min(dest.list.cards.length, req.body.index == null ? dest.list.cards.length : req.body.index));
  dest.list.cards.splice(idx, 0, f.card); respond(req, res);
});

/* reorder (DnD commit) — viditelné seznamy nástěnky */
app.post("/api/boards/:id/reorder", requireAuth, (req, res) => {
  const b = findBoard(req.params.id); if (!b || !canSeeBoard(req.user, b)) return res.status(403).json({ error: "forbidden" });
  const { listOrder, placements } = req.body || {};
  const byId = {}; b.lists.forEach((l) => l.cards.forEach((c) => { byId[c.id] = c; }));
  // placement karet ve viditelných seznamech
  if (placements) {
    Object.keys(placements).forEach((lid) => {
      const l = b.lists.find((x) => x.id === lid); if (!l || !canSeeList(req.user, b, l)) return;
      const archived = l.cards.filter((c) => c.archived);
      l.cards = placements[lid].map((id) => byId[id]).filter(Boolean).concat(archived);
    });
  }
  // pořadí viditelných seznamů (skryté/archivované zůstanou na místě)
  if (listOrder && isAdmin(req.user)) {
    const archived = b.lists.filter((l) => l.archived);
    const active = listOrder.map((id) => b.lists.find((l) => l.id === id && !l.archived)).filter(Boolean);
    const seen = new Set(active.map((l) => l.id));
    b.lists.filter((l) => !l.archived && !seen.has(l.id)).forEach((l) => active.push(l));
    b.lists = active.concat(archived);
  }
  respond(req, res);
});

/* ---------- Štítky (admin) ---------- */
app.post("/api/boards/:id/labels", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.id); if (!b) return res.status(404).json({ error: "not_found" });
  b.labels.push({ id: uid(), name: (req.body.name || "").trim(), color: req.body.color || "#4c6793" }); respond(req, res);
});
app.patch("/api/boards/:bid/labels/:id", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.bid); if (!b) return res.status(404).json({ error: "not_found" });
  const lab = b.labels.find((l) => l.id === req.params.id); if (!lab) return res.status(404).json({ error: "no_label" });
  if (req.body.name !== undefined) lab.name = String(req.body.name).trim();
  if (req.body.color !== undefined) lab.color = req.body.color; respond(req, res);
});
app.delete("/api/boards/:bid/labels/:id", requireAuth, requireAdmin, (req, res) => {
  const b = findBoard(req.params.bid); if (!b) return res.status(404).json({ error: "not_found" });
  b.labels = b.labels.filter((l) => l.id !== req.params.id);
  b.lists.forEach((l) => l.cards.forEach((c) => c.labelIds = (c.labelIds || []).filter((x) => x !== req.params.id)));
  respond(req, res);
});

/* ============================================================
   SPRÁVA UŽIVATELŮ (admin)
   ============================================================ */
app.post("/api/users", requireAuth, requireAdmin, (req, res) => {
  const { username, name, password, role } = req.body || {};
  if (!username || findUserByName(username)) return res.status(400).json({ error: "username_taken" });
  if (!password || String(password).length < 4) return res.status(400).json({ error: "weak" });
  const u = { id: uid(), username: String(username).trim().toLowerCase(), passwordHash: bcrypt.hashSync(String(password), 10),
    name: (name || username).trim(), role: role === "admin" ? "admin" : "manager", color: AVATAR_COLORS[DOC.users.length % AVATAR_COLORS.length], theme: "light", access: {}, newTaskIds: [] };
  DOC.users.push(u); respond(req, res);
});
app.patch("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
  const u = findUser(req.params.id); if (!u) return res.status(404).json({ error: "not_found" });
  const { name, role, access, color } = req.body || {};
  if (name !== undefined) u.name = String(name).trim() || u.name;
  if (color !== undefined) u.color = color;
  if (role !== undefined && u.id !== req.user.id) u.role = role === "admin" ? "admin" : "manager";
  if (access !== undefined) u.access = access;
  respond(req, res);
});
app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "self" });
  const u = findUser(req.params.id); if (!u) return res.status(404).json({ error: "not_found" });
  DOC.users = DOC.users.filter((x) => x.id !== req.params.id);
  DOC.boards.forEach((b) => b.lists.forEach((l) => l.cards.forEach((c) => c.memberIds = c.memberIds.filter((m) => m !== req.params.id))));
  respond(req, res);
});
app.post("/api/users/:id/password", requireAuth, requireAdmin, (req, res) => {
  const u = findUser(req.params.id); if (!u) return res.status(404).json({ error: "not_found" });
  if (!req.body.password || String(req.body.password).length < 4) return res.status(400).json({ error: "weak" });
  u.passwordHash = bcrypt.hashSync(String(req.body.password), 10); persist(); res.json({ ok: true });
});


/* ============================================================
   INTEGRACE — šichtovnice (kurýři, výplaty, vozidla) + podpisy (smlouvy, testy)
   Data se tahají server-to-server s klíčem; prohlížeč nikdy klíč nevidí.
   ============================================================ */
const INT = {
  smenovnik: { url: (process.env.SMENOVNIK_URL || "").replace(/\/$/, ""), key: process.env.SMENOVNIK_KEY || "" },
  podpisy: { url: (process.env.PODPISY_URL || "").replace(/\/$/, ""), key: process.env.PODPISY_KEY || "" },
};
const intEnabled = (s) => !!(INT[s].url && INT[s].key);
const intLinks = () => ({ smenovnik: INT.smenovnik.url || null, podpisy: INT.podpisy.url || null });
const slug = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// "Jan Novák" i "Novák Jan" → stejný klíč (párování kurýra se smlouvou, když chybí ID)
const nameKey = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z]+/).filter(Boolean).sort().join(" ");
// Benešov a Vlašim sdílí vozový park
const FLEET = { benesov: ["benesov", "vlasim"], vlasim: ["benesov", "vlasim"] };

const intCache = new Map();
async function upstream(service, pathQ, { ttl = 60e3, fresh = false } = {}) {
  if (!intEnabled(service)) throw new Error("not_configured");
  const key = service + pathQ;
  const hit = intCache.get(key);
  if (!fresh && hit && hit.exp > Date.now()) return hit.data;
  const s = INT[service];
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 25e3);
  try {
    const r = await fetch(s.url + "/api/integrace" + pathQ, { headers: { "x-integrace-key": s.key }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    intCache.set(key, { data, exp: Date.now() + ttl });
    return data;
  } finally { clearTimeout(timer); }
}
const upstreamError = (e) => (e && e.message === "not_configured") ? "Propojení není nastavené." : "Služba je nedostupná (" + (e && e.name === "AbortError" ? "vypršel čas" : e && e.message) + ").";
// Zápis do šichtovnice; chybovou hlášku služby (např. „Zadejte stav km“) předá dál
async function upstreamWrite(service, method, path, body) {
  if (!intEnabled(service)) throw new Error("not_configured");
  const s = INT[service];
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 25e3);
  try {
    const r = await fetch(s.url + "/api/integrace" + path, {
      method, signal: ctrl.signal,
      headers: { "x-integrace-key": s.key, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error((j && j.error) || `HTTP ${r.status}`); err.status = r.status; throw err; }
    for (const k of intCache.keys()) if (k.startsWith(service + "/vozidla")) intCache.delete(k);
    return j;
  } finally { clearTimeout(timer); }
}

async function intCities() {
  if (!intEnabled("smenovnik")) return [];
  try { return await upstream("smenovnik", "/mesta", { ttl: 5 * 60e3 }); } catch (e) { return []; }
}
// Záložka je vázaná na stejnojmenný seznam: kdo má skrytý seznam „Vozidla“, nevidí ani vozidla
// ze šichtovnice. Nástěnka bez takového seznamu záložku nijak neomezuje.
function tabAllowed(u, b, listTitle) {
  const l = b.lists.find((x) => !x.archived && slug(x.title) === slug(listTitle));
  return !l || !listHidden(u, b, l);
}
// Explicitní oprávnění na záložky města (Úkoly / Lidé / Výplaty / Vozidla),
// nastavované v profilu uživatele. Admin vidí vždy vše.
function tabVisible(u, b, key) {
  if (isAdmin(u)) return true;
  const a = u.access[b.id];
  return !(a && a.hiddenTabs || []).includes(key);
}
async function intBoard(req, res) {
  const b = findBoard(req.params.boardId);
  if (!b || b.archived || !canSeeBoard(req.user, b)) { res.status(404).json({ error: "not_found" }); return null; }
  const city = slug(b.title);
  if (!(await intCities()).includes(city)) { res.status(404).json({ error: "not_integrated" }); return null; }
  return { b, city };
}

app.get("/api/integrace/board/:boardId", requireAuth, async (req, res) => {
  const b = findBoard(req.params.boardId);
  if (!b || b.archived || !canSeeBoard(req.user, b)) return res.status(404).json({ error: "not_found" });
  const city = slug(b.title);
  if (!(await intCities()).includes(city)) return res.json({ city: null, tabs: [] });
  const tabs = [];
  if (tabVisible(req.user, b, "ukoly")) tabs.push("ukoly");
  if (tabAllowed(req.user, b, "Zaměstnanci") && tabVisible(req.user, b, "lide")) tabs.push("lide");
  if (tabVisible(req.user, b, "vyplaty")) tabs.push("vyplaty");
  if (tabAllowed(req.user, b, "Vozidla") && tabVisible(req.user, b, "vozidla")) tabs.push("vozidla");
  res.json({ city, tabs, links: intLinks() });
});

app.get("/api/integrace/board/:boardId/lide", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabAllowed(req.user, ctx.b, "Zaměstnanci") || !tabVisible(req.user, ctx.b, "lide")) return res.status(403).json({ error: "forbidden" });
  const fresh = req.query.refresh === "1";
  const [kur, sml] = await Promise.allSettled([
    upstream("smenovnik", "/kuryri?city=" + encodeURIComponent(ctx.city), { fresh }),
    intEnabled("podpisy") ? upstream("podpisy", "/kuryri", { fresh }) : Promise.reject(new Error("not_configured")),
  ]);
  const couriers = kur.status === "fulfilled" ? kur.value : [];
  const records = sml.status === "fulfilled" ? sml.value : [];

  const people = couriers.map((c) => ({
    key: "s:" + c.id, smenovnikId: c.id, name: (c.fakturace_name || "").trim() || c.name, shortName: c.name,
    level: c.level, isRidic: /řidič/i.test(c.level || ""), dayRate: c.day_rate, isActive: c.is_active, role: c.role,
    phone: c.phone || "", ico: c.ico || "", dic: c.dic || "", invoiceAddress: c.invoice_address || "",
    bankAccount: c.bank_account || "", since: c.created_at, records: [],
  }));
  const byId = new Map(people.map((p) => [p.smenovnikId, p]));
  const byName = new Map(people.map((p) => [nameKey(p.name), p]));
  records.forEach((r) => {
    const p = (r.smenovnikId && byId.get(r.smenovnikId)) || byName.get(nameKey(r.name));
    if (p) p.records.push(r);
    else if ((r.cities || []).includes(ctx.city)) {
      // podepsal, ale ve šichtovnici (zatím) není
      const np = { key: "p:" + r.id, smenovnikId: null, name: r.name, onlyContract: true, isActive: true, phone: r.phone, bankAccount: "", records: [r] };
      people.push(np); byName.set(nameKey(r.name), np);
    }
  });
  people.forEach((p) => {
    p.records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const signed = p.records.filter((r) => r.status === "signed");
    const contract = signed.find((r) => r.hasPdf) || signed[0] || p.records[0] || null;
    const withTest = p.records.find((r) => r.test);
    p.contract = contract ? { id: contract.id, type: contract.contractType, signedAt: contract.signedAt, status: contract.status, hasPdf: contract.hasPdf } : null;
    p.test = withTest ? withTest.test : null;
    p.clothingSize = (p.records.find((r) => r.clothingSize) || {}).clothingSize || "";
    p.email = (p.records.find((r) => r.email) || {}).email || "";
    if (!p.phone) p.phone = (p.records.find((r) => r.phone) || {}).phone || "";
    if (!p.bankAccount) p.bankAccount = (p.records.find((r) => r.bankAccount) || {}).bankAccount || "";
    delete p.records;
  });
  people.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || a.name.localeCompare(b.name, "cs"));
  res.json({
    people, links: intLinks(),
    errors: { smenovnik: kur.status === "rejected" ? upstreamError(kur.reason) : null, podpisy: sml.status === "rejected" ? upstreamError(sml.reason) : null },
  });
});

app.get("/api/integrace/board/:boardId/vyplaty", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabVisible(req.user, ctx.b, "vyplaty")) return res.status(403).json({ error: "forbidden" });
  const year = Number(req.query.year), month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) return res.status(400).json({ error: "bad_month" });
  try {
    const data = await upstream("smenovnik", `/vyplaty?city=${encodeURIComponent(ctx.city)}&year=${year}&month=${month}`, { ttl: 2 * 60e3, fresh: req.query.refresh === "1" });
    res.json({ ...data, links: intLinks() });
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});

app.get("/api/integrace/board/:boardId/vozidla", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabAllowed(req.user, ctx.b, "Vozidla") || !tabVisible(req.user, ctx.b, "vozidla")) return res.status(403).json({ error: "forbidden" });
  try {
    const all = await upstream("smenovnik", "/vozidla", { fresh: req.query.refresh === "1" });
    const cities = FLEET[ctx.city] || [ctx.city];
    res.json({ vozidla: all.filter((v) => cities.includes(v.city)), links: intLinks(), canResolve: isAdmin(req.user) });
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});

// Zápis k autu smí jen ten, kdo vidí záložku Vozidla, a jen k autu z vozového parku města
async function fleetCar(req, res) {
  const ctx = await intBoard(req, res); if (!ctx) return null;
  if (!tabAllowed(req.user, ctx.b, "Vozidla") || !tabVisible(req.user, ctx.b, "vozidla")) { res.status(403).json({ error: "forbidden" }); return null; }
  const cities = FLEET[ctx.city] || [ctx.city];
  const find = (all) => all.find((v) => String(v.id) === String(req.params.carId) && cities.includes(v.city));
  try {
    const car = find(await upstream("smenovnik", "/vozidla")) || find(await upstream("smenovnik", "/vozidla", { fresh: true }));
    if (!car) { res.status(404).json({ error: "not_found" }); return null; }
    return { ...ctx, car };
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); return null; }
}
const writeError = (res, e) => res.status(e.status && e.status < 500 ? 400 : 502).json({ error: "upstream", message: e.status && e.status < 500 ? e.message : upstreamError(e) });

app.post("/api/integrace/board/:boardId/vozidla/:carId/servis", requireAuth, async (req, res) => {
  const ctx = await fleetCar(req, res); if (!ctx) return;
  const { datum, km, popis } = req.body || {};
  const kmNum = km === "" || km == null ? undefined : Number(km);
  if (kmNum !== undefined && (!Number.isInteger(kmNum) || kmNum < 0)) return res.status(400).json({ error: "bad_km", message: "Stav km musí být celé kladné číslo." });
  try { const v = await upstreamWrite("smenovnik", "POST", `/vozidla/${ctx.car.id}/servis`, { datum: datum || undefined, km: kmNum, popis, autor: req.user.name }); broadcast(req.header("x-client-id"), "vozidla"); res.json({ vozidlo: v }); }
  catch (e) { writeError(res, e); }
});

app.post("/api/integrace/board/:boardId/vozidla/:carId/hlaseni", requireAuth, async (req, res) => {
  const ctx = await fleetCar(req, res); if (!ctx) return;
  const popis = String((req.body || {}).popis || "").trim();
  if (!popis) return res.status(400).json({ error: "empty", message: "Popište prosím problém." });
  try {
    const v = await upstreamWrite("smenovnik", "POST", `/vozidla/${ctx.car.id}/hlaseni`, { popis, severity: req.body.severity === "urgent" ? "urgent" : "normal", autor: req.user.name });
    if (v && v.hlaseni_id) {
      DOC.faultWatch = DOC.faultWatch || {};
      DOC.faultWatch[v.hlaseni_id] = { userId: req.user.id, boardId: ctx.b.id, spz: v.spz, popis, status: "new", note: "", at: Date.now() };
      persist();
    }
    broadcast(req.header("x-client-id"), "vozidla");
    res.json({ vozidlo: v });
  } catch (e) { writeError(res, e); }
});

// Uzavřít otevřenou závadu auta — jen admin (jinak opravu potvrzuje mechanik ve šichtovnici)
app.post("/api/integrace/board/:boardId/vozidla/:carId/hlaseni/:id/vyreseno", requireAuth, requireAdmin, async (req, res) => {
  const ctx = await fleetCar(req, res); if (!ctx) return;
  if (!(ctx.car.hlaseni || []).some((h) => String(h.id) === String(req.params.id) && h.status !== "resolved")) return res.status(404).json({ error: "not_found" });
  try { const v = await upstreamWrite("smenovnik", "PUT", `/hlaseni/${encodeURIComponent(req.params.id)}`, { status: "resolved" }); broadcast(req.header("x-client-id"), "vozidla"); res.json({ vozidlo: v }); }
  catch (e) { writeError(res, e); }
});

/* Hlídač postupu mechanika: šichtovnice nemá webhook, takže se jí Trello
   periodicky ptá. Při změně závady (mechanik si ji vzal, napsal poznámku,
   vyřešil ji) obnoví otevřené záložky Vozidla a pošle upozornění tomu, kdo
   závadu z Trella nahlásil. Ptá se jen, když je někdo online nebo čeká na opravu. */
const FAULT_POLL_MS = Number(process.env.FAULT_POLL_MS) || 30e3;
const FAULT_STATUS_TEXT = { new: "Nová", in_progress: "Mechanik si ji vzal a řeší ji", resolved: "Vyřešeno" };
let faultSignature = null;
const faultSig = (fleet) => (fleet || []).flatMap((v) => (v.hlaseni || []).map((h) => [h.id, h.status, h.mechanik_note || ""].join(":"))).sort().join("|");
async function pollFaults() {
  if (!DOC || !intEnabled("smenovnik")) return;
  const watch = DOC.faultWatch || {};
  const waiting = Object.values(watch).some((w) => w.status !== "resolved");
  if (sseClients.size === 0 && !waiting) return;
  let fleet;
  try { fleet = await upstream("smenovnik", "/vozidla", { fresh: true }); } catch (e) { return; }
  const sig = faultSig(fleet);
  if (faultSignature !== null && sig !== faultSignature) broadcast(null, "vozidla");
  faultSignature = sig;
  // upozornění autorovi závady
  const byId = new Map(); fleet.forEach((v) => (v.hlaseni || []).forEach((h) => byId.set(String(h.id), { h, v })));
  let changed = false;
  for (const [id, w] of Object.entries(watch)) {
    const f = byId.get(String(id));
    if (!f) { if (Date.now() - (w.at || 0) > 30 * 864e5) { delete watch[id]; changed = true; } continue; }
    const note = f.h.mechanik_note || "";
    if (f.h.status === w.status && note === w.note) continue;
    const u = findUser(w.userId);
    if (u) {
      const parts = [];
      if (f.h.status !== w.status) parts.push(FAULT_STATUS_TEXT[f.h.status] || f.h.status);
      if (note && note !== w.note) parts.push("Mechanik: " + (note.length > 120 ? note.slice(0, 117) + "…" : note));
      notifyUser(u, "fault", { title: "Závada · " + f.v.spz, body: `${w.popis.length > 60 ? w.popis.slice(0, 57) + "…" : w.popis} — ${parts.join(" · ")}`, url: "/", tag: "fault-" + id });
    }
    w.status = f.h.status; w.note = note; changed = true;
  }
  if (changed) persist();
}
setInterval(() => { pollFaults().catch((e) => console.error("pollFaults", e)); }, FAULT_POLL_MS);

// PDF smlouvy — jen pro toho, kdo smí vidět lidi aspoň v jednom městě ze smlouvy
app.get("/api/integrace/smlouva/:id", requireAuth, async (req, res) => {
  if (!intEnabled("podpisy")) return res.status(404).json({ error: "not_configured" });
  try {
    const recs = await upstream("podpisy", "/kuryri");
    const rec = recs.find((r) => r.id === req.params.id);
    if (!rec || !rec.hasPdf) return res.status(404).json({ error: "not_found" });
    const allowed = isAdmin(req.user) || DOC.boards.some((b) => !b.archived && canSeeBoard(req.user, b)
      && (rec.cities || []).includes(slug(b.title)) && tabAllowed(req.user, b, "Zaměstnanci"));
    if (!allowed) return res.status(403).json({ error: "forbidden" });
    const r = await fetch(`${INT.podpisy.url}/api/integrace/r/${encodeURIComponent(rec.id)}/pdf`, { headers: { "x-integrace-key": INT.podpisy.key } });
    if (!r.ok) return res.status(502).json({ error: "upstream" });
    res.setHeader("Content-Type", "application/pdf");
    const cd = r.headers.get("content-disposition"); if (cd) res.setHeader("Content-Disposition", cd);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

loadDoc().then(() => {
  app.listen(PORT, () => console.log(`Trellite Pro běží na portu ${PORT}`));
}).catch((e) => { console.error("Start selhal:", e); process.exit(1); });
