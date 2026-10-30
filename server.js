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
  if (!d.inventory || !Array.isArray(d.inventory.ledger)) d.inventory = { ledger: [], applied: {} };
  if (!d.inventory.applied || typeof d.inventory.applied !== "object") d.inventory.applied = {};
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
  const out = { me, state: { activeMemberId: u.id, theme: u.theme || "light", members, boards, inventory: inventoryState() } };
  if (isAdmin(u)) {
    out.users = DOC.users.map(sanitizeUser);
    out.allBoards = DOC.boards.filter((b) => !b.archived).map((b) => ({ id: b.id, title: b.title, lists: b.lists.filter((l) => !l.archived).map((l) => ({ id: l.id, title: l.title })) }));
  }
  return out;
}

/* ============================================================
   INVENTURA — sklad pracovního oblečení (jeden společný).
   Zdroj pravdy je tady v Trellu: kniha pohybů (ledger). Stav skladu
   se počítá z pohybů — počítané příjmy (+) minus počítané výdeje (−).
   Pohyb „init" z úvodního importu (co kdo už má) se započítá u osoby,
   ale do skladu NE (sklad se rozjede až se zadanými nákupy).
   Nový kurýr (dvě fáze v Podpisech): po podpisu smluv admin klikne
   „Oblečení předáno" (počty + velikost u každého kusu), kurýr na svém odkazu
   podepíše převzetí a Trello to pak samo zapíše jako počítaný výdej
   (source „podpisy") — každý záznam jen jednou (inventory.applied).
   ============================================================ */
const INV_ITEMS = [
  { id: "tricko", label: "Tričko" },
  { id: "mikina", label: "Mikina" },
  { id: "vesta", label: "Vesta" },
  { id: "bunda", label: "Bunda" },
];
const INV_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const invItem = (id) => INV_ITEMS.find((i) => i.id === id) || null;
const invKey = (item, size) => item + "|" + size;

// Jeden průchod knihou pohybů → stav skladu a držení u osob.
// dir "out" = výdej osobě (ze skladu ubyde, osobě přibyde).
// dir "in"  = příjem na sklad / vrácení (na sklad přibyde, osobě ubyde).
function inventorySummary() {
  const inv = DOC.inventory || { ledger: [] };
  const stock = {};               // "tricko|L" → kusů na skladě
  const peopleMap = new Map();    // personKey → { key, name, held:{ "tricko|L": n } }
  for (const m of inv.ledger || []) {
    const k = invKey(m.item, m.size);
    const q = Number(m.qty) || 0;
    const stockSign = m.dir === "in" ? 1 : -1;
    if (m.counted) stock[k] = (stock[k] || 0) + stockSign * q;
    if (m.personKey) {
      let p = peopleMap.get(m.personKey);
      if (!p) { p = { key: m.personKey, name: m.personName || "", held: {} }; peopleMap.set(m.personKey, p); }
      p.held[k] = (p.held[k] || 0) - stockSign * q; // výdej (out) osobě přidá, příjem/vrácení (in) ubere
      if (m.personName) p.name = m.personName;
    }
  }
  return { stock, peopleMap };
}

// Co drží konkrétní osoba (podle klíče jména) — { items:[{item,label,size,count}], total } nebo null.
function inventoryForPerson(personKey, sum) {
  if (!personKey) return null;
  const { peopleMap } = sum || inventorySummary();
  const p = peopleMap.get(personKey);
  if (!p) return null;
  const items = [];
  for (const [k, n] of Object.entries(p.held)) {
    if (n <= 0) continue;
    const [item, size] = k.split("|");
    items.push({ item, label: (invItem(item) || {}).label || item, size, count: n });
  }
  if (!items.length) return null;
  items.sort((a, b) => INV_ITEMS.findIndex((i) => i.id === a.item) - INV_ITEMS.findIndex((i) => i.id === b.item) || INV_SIZES.indexOf(a.size) - INV_SIZES.indexOf(b.size));
  return { items, total: items.reduce((s, i) => s + i.count, 0) };
}

// Stav pro klienta: definice, tabulka skladu, lidé s držením a posledních pár pohybů.
function inventoryState() {
  const { stock, peopleMap } = inventorySummary();
  const people = [...peopleMap.values()].map((p) => ({
    key: p.key, name: p.name,
    items: Object.entries(p.held).filter(([, n]) => n > 0).map(([k, n]) => { const [item, size] = k.split("|"); return { item, size, count: n }; })
      .sort((a, b) => INV_ITEMS.findIndex((i) => i.id === a.item) - INV_ITEMS.findIndex((i) => i.id === b.item) || INV_SIZES.indexOf(a.size) - INV_SIZES.indexOf(b.size)),
  })).filter((p) => p.items.length).sort((a, b) => a.name.localeCompare(b.name, "cs"));
  return {
    items: INV_ITEMS, sizes: INV_SIZES, stock, people,
    pending: invPending.list, syncedAt: invPending.at,
    ledger: (DOC.inventory.ledger || []).slice(-300).reverse(),
  };
}

/* Napojení na Podpisy: záznamy s podepsaným převzetím oblečení (po předávce)
   se odečtou ze skladu. Předané, ale zatím nepodepsané se jen ukazují jako
   „čeká na podpis". Staré záznamy bez předávky (z doby před dvoufázovým
   převzetím) se neodečítají — jejich stav přišel úvodním importem. */
let invPending = { list: [], at: null };
function applyPodpisyClothing(records) {
  const inv = DOC.inventory;
  let changed = false;
  const pending = [];
  for (const r of records || []) {
    const c = r && r.clothing;
    if (!c || !c.handedOverAt) continue;
    const items = (c.items || []).filter((i) => invItem(i.id) && INV_SIZES.includes(String(i.size || "").toUpperCase()) && Number(i.count) > 0);
    if (!c.signedAt) { pending.push({ id: r.id, name: r.name, handedOverAt: c.handedOverAt, items: items.map((i) => ({ item: i.id, size: String(i.size).toUpperCase(), count: Number(i.count) })) }); continue; }
    if (inv.applied[r.id]) continue;
    const ts = Date.parse(c.signedAt) || Date.now();
    for (const i of items) {
      inv.ledger.push({
        id: uid(), ts, item: i.id, size: String(i.size).toUpperCase(), qty: Math.min(999, Number(i.count)), dir: "out", counted: true,
        personKey: nameKey(r.name), personName: r.name, source: "podpisy", podpisyId: r.id, note: "Převzetí podepsáno v Podpisech", by: null,
      });
    }
    inv.applied[r.id] = Date.now();
    changed = true;
  }
  pending.sort((a, b) => String(b.handedOverAt).localeCompare(String(a.handedOverAt)));
  const pendingChanged = JSON.stringify(pending) !== JSON.stringify(invPending.list);
  invPending = { list: pending, at: Date.now() };
  if (changed) persist();
  if (changed || pendingChanged) broadcast(null, "inventory");
  return changed;
}
async function syncPodpisyClothing() {
  if (!intEnabled("podpisy")) return;
  try { applyPodpisyClothing(await upstream("podpisy", "/kuryri", { fresh: true })); }
  catch (e) { console.error("sync oblečení z podpisů:", e.message); }
}

// Mapování názvu v hranaté závorce hlavičky CSV → id položky.
const INV_CSV_GARMENT = { "trička": "tricko", "tricka": "tricko", "mikiny": "mikina", "vesty": "vesta", "bundy": "bunda" };

// Rozparsuje CSV (Google Forms export) do řádků
// { name, pobocka, tricko:{count,size}, mikina:{...}, vesta:{...}, bunda:{...} }.
function parseInventoryCsv(text) {
  const table = parseCsvTable(String(text).replace(/^﻿/, ""));
  if (!table.length) return [];
  const header = table[0].map((h) => String(h).trim());
  const bracket = (h) => { const m = h.match(/\[([^\]]+)\]/); return m ? m[1].trim().toLowerCase() : null; };
  const col = {};
  header.forEach((h, i) => {
    const low = h.toLowerCase();
    if (low === "jméno" || low === "jmeno") col.first = i;
    else if (low === "příjmení" || low === "prijmeni") col.last = i;
    else if (low === "pobočka" || low === "pobocka") col.pobocka = i;
    else if (low.startsWith("kolik")) { const g = INV_CSV_GARMENT[bracket(h)]; if (g) (col.count ||= {})[g] = i; }
    else if (low.startsWith("jakou") || low.includes("velikost")) { const g = INV_CSV_GARMENT[bracket(h)]; if (g) (col.size ||= {})[g] = i; }
  });
  const num = (v) => { const s = String(v || "").trim(); if (/^\d+\s*\+?$/.test(s)) return parseInt(s, 10); return parseInt(s, 10) || 0; };
  const rows = [];
  for (let r = 1; r < table.length; r++) {
    const rec = table[r]; if (!rec || !rec.length) continue;
    const first = (rec[col.first] || "").trim(), last = (rec[col.last] || "").trim();
    const name = (first + " " + last).trim();
    if (!name) continue;
    const row = { name, pobocka: (rec[col.pobocka] || "").trim() };
    for (const it of INV_ITEMS) {
      const ci = col.count && col.count[it.id], si = col.size && col.size[it.id];
      row[it.id] = { count: ci != null ? num(rec[ci]) : 0, size: si != null ? String(rec[si] || "").trim() : "" };
    }
    rows.push(row);
  }
  return rows;
}

// Minimalistický CSV parser (uvozovky, zdvojené uvozovky, CRLF).
function parseCsvTable(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); field = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x !== "")) rows.push(row); }
  return rows;
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
const NOTIFY_DEFAULTS = { assign: true, comment: true, due: true, fault: true, speed: true, predavka: true };
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
    for (const k of intCache.keys()) if (k.startsWith(service + "/")) intCache.delete(k);
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
  if (tabVisible(req.user, b, "smeny")) tabs.push("smeny");
  if (tabAllowed(req.user, b, "Zaměstnanci") && tabVisible(req.user, b, "lide")) tabs.push("lide");
  if (tabVisible(req.user, b, "vyplaty")) tabs.push("vyplaty");
  if (tabAllowed(req.user, b, "Vozidla") && tabVisible(req.user, b, "vozidla")) tabs.push("vozidla");
  res.json({ city, tabs, links: intLinks() });
});

app.get("/api/integrace/board/:boardId/lide", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabAllowed(req.user, ctx.b, "Zaměstnanci") || !tabVisible(req.user, ctx.b, "lide")) return res.status(403).json({ error: "forbidden" });
  const fresh = req.query.refresh === "1";
  const [kur, sml, hod] = await Promise.allSettled([
    upstream("smenovnik", "/kuryri?city=" + encodeURIComponent(ctx.city), { fresh }),
    intEnabled("podpisy") ? upstream("podpisy", "/kuryri", { fresh }) : Promise.reject(new Error("not_configured")),
    // hodnocení z Foodisu – pomalé a nepovinné, výpadek Lidi nerozbije
    upstream("smenovnik", "/hodnoceni?city=" + encodeURIComponent(ctx.city), { ttl: 10 * 60e3 }),
  ]);
  const ratings = hod.status === "fulfilled" ? hod.value : {};
  const couriers = kur.status === "fulfilled" ? kur.value : [];
  const records = sml.status === "fulfilled" ? sml.value : [];
  if (sml.status === "fulfilled") applyPodpisyClothing(records);

  const people = couriers.map((c) => ({
    key: "s:" + c.id, smenovnikId: c.id, name: (c.fakturace_name || "").trim() || c.name, shortName: c.name,
    level: c.level, isRidic: /řidič/i.test(c.level || ""), dayRate: c.day_rate, isActive: c.is_active, role: c.role,
    phone: c.phone || "", ico: c.ico || "", dic: c.dic || "", invoiceAddress: c.invoice_address || "",
    bankAccount: c.bank_account || "", since: c.created_at, rating: ratings[c.id] || null, records: [],
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
    p.contract = contract ? { id: contract.id, type: contract.contractType, signedAt: contract.signedAt, status: contract.status, hasPdf: contract.hasPdf, link: contract.status === "signed" ? null : contract.link } : null;
    // Záznam, ke kterému patří oblečení: rozjetá předávka > lze předat > s plánem
    const clothRec = p.records.find((r) => r.clothing && r.clothing.handedOverAt && !r.clothing.signedAt)
      || p.records.find((r) => r.canHandOver) || p.records.find((r) => r.clothing) || null;
    p.clothing = clothRec ? clothRec.clothing : null;
    p.clothingRecordId = clothRec ? clothRec.id : null;
    p.canHandOver = !!(clothRec && clothRec.canHandOver);
    p.clothingPlanned = clothRec && clothRec.clothingPlanned ? clothRec.clothingPlanned : null;
    p.test = withTest ? withTest.test : null;
    p.clothingSize = (p.records.find((r) => r.clothingSize) || {}).clothingSize || "";
    p.email = (p.records.find((r) => r.email) || {}).email || "";
    if (!p.phone) p.phone = (p.records.find((r) => r.phone) || {}).phone || "";
    if (!p.bankAccount) p.bankAccount = (p.records.find((r) => r.bankAccount) || {}).bankAccount || "";
    delete p.records;
  });
  people.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || a.name.localeCompare(b.name, "cs"));
  const invSum = inventorySummary();
  people.forEach((p) => { p.inventory = inventoryForPerson(nameKey(p.name), invSum); });
  res.json({
    people, links: intLinks(),
    errors: { smenovnik: kur.status === "rejected" ? upstreamError(kur.reason) : null, podpisy: sml.status === "rejected" ? upstreamError(sml.reason) : null },
  });
});

// Recenze z Foodisu pro detail kurýra (načítá se až po otevření)
app.get("/api/integrace/board/:boardId/lide/:courierId/hodnoceni", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabAllowed(req.user, ctx.b, "Zaměstnanci") || !tabVisible(req.user, ctx.b, "lide")) return res.status(403).json({ error: "forbidden" });
  try { res.json(await upstream("smenovnik", `/hodnoceni/${encodeURIComponent(req.params.courierId)}?city=${encodeURIComponent(ctx.city)}`, { ttl: 10 * 60e3 })); }
  catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});

/* Nový kurýr z Trella: formulář je definovaný v podpisech (typ spolupráce,
   dokumenty, údaje zaměstnavatele, oblečení), Trello ho jen vykreslí a odešle.
   Zakládat smí admin a kdo vidí záložku Řidiči; manažer jen pro svá města. */
function courierCities(u) {
  const out = new Set();
  DOC.boards.forEach((b) => { if (!b.archived && canSeeBoard(u, b) && tabAllowed(u, b, "Zaměstnanci") && tabVisible(u, b, "lide")) out.add(slug(b.title)); });
  return out;
}
app.get("/api/integrace/nastup/formular", requireAuth, async (req, res) => {
  const mine = courierCities(req.user);
  if (!isAdmin(req.user) && !mine.size) return res.status(403).json({ error: "forbidden" });
  try {
    const form = await upstream("podpisy", "/nastup/formular", { ttl: 5 * 60e3 });
    res.json({ ...form, cities: form.cities.filter((c) => isAdmin(req.user) || mine.has(c.id)) });
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});
app.post("/api/integrace/nastup", requireAuth, async (req, res) => {
  const mine = courierCities(req.user);
  if (!isAdmin(req.user) && !mine.size) return res.status(403).json({ error: "forbidden" });
  const b = req.body || {};
  const cities = [].concat(b.cities || []).map(String);
  if (!isAdmin(req.user) && cities.some((c) => !mine.has(c))) return res.status(403).json({ error: "forbidden", message: "Do tohoto města kurýra přidat nemůžete." });
  if (!String(b.title || "").trim()) return res.status(400).json({ error: "empty", message: "Vyplňte jméno kurýra." });
  try {
    const rec = await upstreamWrite("podpisy", "POST", "/nastup", {
      contractType: b.contractType, docs: b.docs, values: b.values, cities, title: b.title,
      withPhotos: !!b.withPhotos, withTest: !!b.withTest, skipSmenovnik: !!b.skipSmenovnik, clothing: b.clothing,
      createdBy: req.user.name,
    });
    broadcast(req.header("x-client-id"), "lide");
    res.status(201).json({ zaznam: rec });
  } catch (e) { writeError(res, e); }
});

/* „Oblečení předáno" z karty člověka: zapíše předávku do Podpisů, kurýrovi se
   na odkazu odemkne podpis převzetí. Ze skladu se odečte až po jeho podpisu.
   Smí admin a kdo smí zakládat kurýry v městě záznamu. */
app.post("/api/integrace/obleceni/:recordId", requireAuth, async (req, res) => {
  const mine = courierCities(req.user);
  if (!isAdmin(req.user) && !mine.size) return res.status(403).json({ error: "forbidden" });
  const items = {};
  for (const it of INV_ITEMS) {
    const v = (req.body && req.body.items && req.body.items[it.id]) || {};
    const count = parseInt(v.count, 10) || 0;
    if (count > 0) items[it.id] = { count, size: String(v.size || "").toUpperCase() };
  }
  try {
    if (!isAdmin(req.user)) {
      const recs = await upstream("podpisy", "/kuryri");
      const rec = recs.find((r) => r.id === req.params.recordId);
      if (!rec || !(rec.cities || []).some((c) => mine.has(c))) return res.status(403).json({ error: "forbidden", message: "K tomuto kurýrovi nemáte přístup." });
    }
    const rec = await upstreamWrite("podpisy", "POST", "/r/" + encodeURIComponent(req.params.recordId) + "/obleceni", { items, by: req.user.name });
    broadcast(req.header("x-client-id"), "lide");
    syncPodpisyClothing();
    res.json({ zaznam: rec });
  } catch (e) { writeError(res, e); }
});

app.get("/api/integrace/board/:boardId/vyplaty", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabVisible(req.user, ctx.b, "vyplaty")) return res.status(403).json({ error: "forbidden" });
  const year = Number(req.query.year), month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) return res.status(400).json({ error: "bad_month" });
  try {
    const fresh = req.query.refresh === "1";
    const admin = isAdmin(req.user);
    const ym = `city=${encodeURIComponent(ctx.city)}&year=${year}&month=${month}`;
    const [raw, kur, uct, fak, poz] = await Promise.all([
      upstream("smenovnik", `/vyplaty?city=${encodeURIComponent(ctx.city)}&year=${year}&month=${month}`, { ttl: 2 * 60e3, fresh }),
      // výběr kurýra pro pokutu – i ten, kdo v měsíci zatím nemá směnu
      upstream("smenovnik", "/kuryri?city=" + encodeURIComponent(ctx.city), { ttl: 5 * 60e3, fresh }).catch(() => []),
      // účtenky ke schválení vidí (a schvaluje) jen admin
      admin ? upstream("smenovnik", "/uctenky?city=" + encodeURIComponent(ctx.city), { ttl: 60e3, fresh }).catch(() => null) : null,
      upstream("smenovnik", "/faktury-osvc?" + ym, { ttl: 60e3, fresh }).catch(() => null),
      upstream("smenovnik", `/pozdni-prichody?${ym}&deadline=${encodeURIComponent(PREDAVKA_DEADLINE)}`, { ttl: 60e3, fresh }).catch(() => null),
    ]);
    const data = structuredClone(raw); // cache se nesmí přepsat úpravami níž
    const me = TRELLO_AUTHOR + req.user.name;
    const mark = (rows) => rows.forEach((r) => (r.bonusItems || []).forEach((b) => {
      b.fromTrello = String(b.createdBy || "").startsWith(TRELLO_AUTHOR);
      b.author = b.fromTrello ? b.createdBy.slice(TRELLO_AUTHOR.length) : "";
      b.canDelete = b.fromTrello && (admin || b.createdBy === me);
      delete b.createdBy;
    }));
    mark(data.ridici); mark(data.brigadnici);
    // Faktura OSVČ, kterou kurýr za měsíc schválil v Moje data (PDF jen pro admina)
    if (fak) data.ridici.forEach((r) => { const f = fak[r.courierId]; r.faktura = f ? { ...f, pdf: admin } : null; });
    const monthDone = new Date(year, month, 1) <= new Date();
    res.json({
      ...data, links: intLinks(), canFine: true, uctenky: uct,
      fakturyNactene: !!fak, mesicSkoncil: monthDone, pozdni: poz,
      kuryri: kur.filter((c) => c.is_active).map((c) => ({ id: c.id, name: (c.fakturace_name || "").trim() || c.name })).sort((a, b) => a.name.localeCompare(b.name, "cs")),
    });
  } catch (e) { res.status(502).json({ error: "upstream", message: upstreamError(e) }); }
});

/* Pokuty a bonusy z Trella → tabulka bonusů ve šichtovnici (stejná jako stránka
   Bonus/Srážka). Přidat smí každý, kdo vidí Výplaty daného města; smazat jen
   autor nebo admin, a jen záznam přidaný z Trella. */
const TRELLO_AUTHOR = "trello:";
async function payrollBoard(req, res) {
  const ctx = await intBoard(req, res); if (!ctx) return null;
  if (!tabVisible(req.user, ctx.b, "vyplaty")) { res.status(403).json({ error: "forbidden" }); return null; }
  return ctx;
}
app.post("/api/integrace/board/:boardId/pokuty", requireAuth, async (req, res) => {
  const ctx = await payrollBoard(req, res); if (!ctx) return;
  const b = req.body || {};
  const year = Number(b.year), month = Number(b.month);
  const amount = Math.round(Math.abs(Number(String(b.amount || "").replace(/\s/g, "").replace(",", "."))));
  const reason = String(b.reason || "").trim();
  if (!b.courierId) return res.status(400).json({ error: "empty", message: "Vyberte kurýra." });
  if (!amount) return res.status(400).json({ error: "empty", message: "Zadejte částku." });
  if (!reason) return res.status(400).json({ error: "empty", message: "Napište důvod." });
  try {
    const r = await upstreamWrite("smenovnik", "POST", "/bonusy", {
      city: ctx.city, courierId: String(b.courierId), year, month,
      amount: b.kind === "bonus" ? amount : -amount, reason, autor: req.user.name,
    });
    broadcast(req.header("x-client-id"), "vyplaty");
    res.status(201).json(r);
  } catch (e) { writeError(res, e); }
});
app.delete("/api/integrace/board/:boardId/pokuty/:id", requireAuth, async (req, res) => {
  const ctx = await payrollBoard(req, res); if (!ctx) return;
  const year = Number(req.query.year), month = Number(req.query.month);
  if (!year || !month) return res.status(400).json({ error: "bad_month" });
  try {
    const data = await upstream("smenovnik", `/vyplaty?city=${encodeURIComponent(ctx.city)}&year=${year}&month=${month}`, { fresh: true });
    const item = [...data.ridici, ...data.brigadnici].flatMap((r) => r.bonusItems || []).find((x) => String(x.id) === String(req.params.id));
    if (!item || !String(item.createdBy || "").startsWith(TRELLO_AUTHOR)) return res.status(404).json({ error: "not_found", message: "Záznam nenalezen nebo nebyl přidán z Trella." });
    if (!isAdmin(req.user) && item.createdBy !== TRELLO_AUTHOR + req.user.name) return res.status(403).json({ error: "forbidden", message: "Smazat může jen ten, kdo záznam přidal, nebo admin." });
    await upstreamWrite("smenovnik", "DELETE", `/bonusy/${encodeURIComponent(req.params.id)}`, {});
    broadcast(req.header("x-client-id"), "vyplaty");
    res.json({ ok: true });
  } catch (e) { writeError(res, e); }
});

app.get("/api/integrace/board/:boardId/faktury/:id/pdf", requireAuth, requireAdmin, async (req, res) => {
  const ctx = await payrollBoard(req, res); if (!ctx) return;
  const year = Number(req.query.year), month = Number(req.query.month);
  try {
    const fak = await upstream("smenovnik", `/faktury-osvc?city=${encodeURIComponent(ctx.city)}&year=${year}&month=${month}`, { ttl: 60e3 });
    if (!Object.values(fak || {}).some((f) => String(f.id) === String(req.params.id))) return res.status(404).end();
    const r = await fetch(`${INT.smenovnik.url}/api/integrace/faktury-osvc/${encodeURIComponent(req.params.id)}/pdf`, { headers: { "x-integrace-key": INT.smenovnik.key } });
    if (!r.ok) return res.status(r.status === 404 ? 404 : 502).end();
    res.setHeader("Content-Type", "application/pdf");
    const cd = r.headers.get("content-disposition"); if (cd) res.setHeader("Content-Disposition", cd);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).end(); }
});

// Účtenky od kurýrů (benzín, servis…) – schválení z Trella, jen admin
app.post("/api/integrace/board/:boardId/uctenky/:id", requireAuth, requireAdmin, async (req, res) => {
  const ctx = await payrollBoard(req, res); if (!ctx) return;
  const status = req.body && req.body.status === "accepted" ? "accepted" : req.body && req.body.status === "rejected" ? "rejected" : null;
  if (!status) return res.status(400).json({ error: "bad_status" });
  try {
    const pending = await upstream("smenovnik", "/uctenky?city=" + encodeURIComponent(ctx.city), { fresh: true });
    if (!pending.some((u) => String(u.id) === String(req.params.id))) return res.status(404).json({ error: "not_found", message: "Účtenka už není ke schválení." });
    await upstreamWrite("smenovnik", "PUT", `/uctenky/${encodeURIComponent(req.params.id)}`, { status, autor: req.user.name });
    broadcast(req.header("x-client-id"), "vyplaty");
    res.json({ ok: true, status });
  } catch (e) { writeError(res, e); }
});
app.get("/api/integrace/board/:boardId/uctenky/:id/foto", requireAuth, requireAdmin, async (req, res) => {
  const ctx = await payrollBoard(req, res); if (!ctx) return;
  try {
    const pending = await upstream("smenovnik", "/uctenky?city=" + encodeURIComponent(ctx.city), { ttl: 60e3 });
    if (!pending.some((u) => String(u.id) === String(req.params.id))) return res.status(404).end();
    const r = await fetch(`${INT.smenovnik.url}/api/integrace/uctenky/${encodeURIComponent(req.params.id)}/foto`, { headers: { "x-integrace-key": INT.smenovnik.key } });
    if (!r.ok) return res.status(r.status === 404 ? 404 : 502).end();
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).end(); }
});

// Směny: kdo dnes (nebo v jiný den) jezdí a jestli už odeslal předávku auta
app.get("/api/integrace/board/:boardId/smeny", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabVisible(req.user, ctx.b, "smeny")) return res.status(403).json({ error: "forbidden" });
  const datum = String(req.query.datum || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return res.status(400).json({ error: "bad_date" });
  try {
    const data = await upstream("smenovnik", `/smeny?city=${encodeURIComponent(ctx.city)}&datum=${datum}`, { ttl: 60e3, fresh: req.query.refresh === "1" });
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

/* ------------------------------------------------------------
   GPS — online-monitoring.cz (živé polohy aut)
   Přihlášení jménem/heslem je server-side; prohlížeč heslo ani token
   nevidí. JWT platí ~1 h a cachuje se; polohy se párují na vozidla
   ze šichtovnice podle SPZ. Výpadek monitoringu Vozidla nerozbije —
   jen zmizí GPS odznak.
   ------------------------------------------------------------ */
const MON = {
  url: (process.env.MONITORING_URL || "").replace(/\/$/, ""),
  user: process.env.MONITORING_USER || "",
  pass: process.env.MONITORING_PASS || "",
  workspace: Number(process.env.MONITORING_WORKSPACE) || 1,
};
const monEnabled = () => !!(MON.url && MON.user && MON.pass);
let monAuth = null; // { token, exp }

async function monFetch(path, { method = "GET", body, auth = true, timeout = 20e3, _retry = true } = {}) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = "Bearer " + (await monToken());
    const r = await fetch(MON.url + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    if (r.status === 401) {
      monAuth = null; // token vypršel / byl zneplatněn – zahodit a jednou to zkusit znovu s čerstvým
      if (auth && _retry) return monFetch(path, { method, body, auth, timeout, _retry: false });
      throw new Error("unauthorized");
    }
    if (!r.ok) throw new Error("HTTP " + r.status);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } finally { clearTimeout(timer); }
}
// JWT z /api/Authorize/Token; obnoví se, jakmile se blíží expirace (token se neloguje).
// Single-flight: při souběhu se přihlásíme jen jednou a ostatní na to počkají.
let monLoginPromise = null;
async function monToken() {
  if (monAuth && monAuth.exp > Date.now() + 60e3) return monAuth.token;
  if (!monLoginPromise) {
    monLoginPromise = (async () => {
      const data = await monFetch("/api/Authorize/Token", {
        method: "POST", auth: false,
        body: { username: MON.user, password: MON.pass, workspaceId: MON.workspace },
      });
      if (!data || !data.accessToken) throw new Error("login_failed");
      monAuth = { token: data.accessToken, exp: Date.now() + (Number(data.expiresIn) || 3600) * 1e3 };
      return monAuth.token;
    })().finally(() => { monLoginPromise = null; });
  }
  return monLoginPromise;
}
// Poslední poloha každého auta podle SPZ; krátká cache sdílená mezi uživateli
const spzKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
let monPosCache = null; // { exp, byKey }
async function monPositions() {
  if (monPosCache && monPosCache.exp > Date.now()) return monPosCache.byKey;
  // Poslední známá poloha VŠECH aut je v GroupHierarchy. CarsPositionsByUserID
  // je naproti tomu jen živý stream právě jedoucích/aktivních vozů (parkující
  // auta v něm nejsou), takže ho jen přimícháme navrch kvůli rychlosti a
  // zapnutému motoru. Párujeme přes stabilní carId.
  const [tree, live] = await Promise.all([
    monFetch("/api/Car/GroupHierarchy"),
    monFetch("/api/Car/CarsPositionsByUserID/0").catch(() => null),
  ]);
  const liveById = new Map();
  ((live && live.lastPositions) || []).forEach((p) => {
    const prev = liveById.get(p.carId);
    if (!prev || String(p.lastKnownDate) > String(prev.lastKnownDate)) liveById.set(p.carId, p);
  });
  const byKey = new Map();
  ((tree && tree.carGroups) || []).forEach((g) => (g.cars || []).forEach((c) => {
    const k = spzKey(c.spz); if (!k) return;
    const lp = liveById.get(c.carID); // živá data, pokud auto zrovna jede
    const pos = c.position || {};
    byKey.set(k, {
      carId: c.carID,
      latitude: lp ? lp.latitude : pos.latitude,
      longitude: lp ? lp.longitude : pos.longitude,
      lastKnownDate: lp ? lp.lastKnownDate : c.lastKnownDate,
      direction: lp ? lp.direction : c.lastKnownDirection,
      driverName: (lp && lp.driverName) || c.lastKnownDriver || "",
      speed: lp ? lp.speed : 0,
      isKeyOn: lp ? !!lp.isKeyOn : false,
      responding: c.isResponding !== false, // jednotka hlášená jako funkční (i když auto stojí)
    });
  }));
  monPosCache = { exp: Date.now() + 20e3, byKey };
  return byKey;
}
// Poslední adresa auta (reverzní geokódování dělá monitoring sám). Cache 60 s
// per auto; dotahujeme jen ty, které v cache nejsou nebo vypršely. Adresa je
// nice-to-have – její výpadek polohu neshodí.
const monAddr = new Map(); // carId -> { address, exp }
async function monAddresses(carIds) {
  if (!carIds.length) return new Map();
  const now = Date.now();
  const need = carIds.filter((id) => { const h = monAddr.get(id); return !h || h.exp <= now; });
  if (need.length) {
    try {
      const data = await monFetch("/api/Car/LastAddresses", { method: "POST", body: { carIds: need } });
      ((data && data.carAddresses) || []).forEach((a) => monAddr.set(a.carId, { address: a.address, exp: now + 60e3 }));
    } catch (e) { /* adresa je nepovinná */ }
  }
  const out = new Map();
  carIds.forEach((id) => { const h = monAddr.get(id); if (h) out.set(id, h.address); });
  return out;
}

// Živé polohy aut města; stejná práva jako záložka Vozidla. Vrací jen auta
// z vozového parku města (cizí polohy se ven nedostanou).
app.get("/api/integrace/board/:boardId/gps", requireAuth, async (req, res) => {
  const ctx = await intBoard(req, res); if (!ctx) return;
  if (!tabAllowed(req.user, ctx.b, "Vozidla") || !tabVisible(req.user, ctx.b, "vozidla")) return res.status(403).json({ error: "forbidden" });
  if (!monEnabled()) return res.json({ enabled: false, positions: {} });
  try {
    const [byKey, all] = await Promise.all([monPositions(), upstream("smenovnik", "/vozidla")]);
    const cities = FLEET[ctx.city] || [ctx.city];
    const matched = [];
    all.filter((v) => cities.includes(v.city)).forEach((v) => {
      const p = byKey.get(spzKey(v.spz)); if (p) matched.push({ id: v.id, v, p });
    });
    const addrs = await monAddresses([...new Set(matched.map((m) => m.p.carId).filter(Boolean))]);
    const positions = {};
    matched.forEach(({ id, v, p }) => {
      positions[id] = {
        spz: v.spz, lat: p.latitude, lon: p.longitude, speed: Math.max(0, Math.round(p.speed || 0)),
        keyOn: !!p.isKeyOn, moving: !!p.isKeyOn && (p.speed || 0) > 3,
        at: p.lastKnownDate, direction: p.direction, driver: (p.driverName || "").trim(),
        responding: p.responding !== false, address: addrs.get(p.carId) || "",
      };
    });
    res.json({ enabled: true, positions, at: Date.now() });
  } catch (e) { res.json({ enabled: true, error: upstreamError(e), positions: {} }); }
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

/* ------------------------------------------------------------
   HLÍDAČ RYCHLOSTI — jednou za hodinu projde knihu jízd každého auta
   a na každou jízdu s maxSpeed > SPEED_LIMIT (km/h) upozorní adminy
   push notifikací. Každá jízda jen jednou (podle driveBookId). První
   běh po nasazení se bere jako výchozí stav – staré jízdy nehlásí.
   ------------------------------------------------------------ */
const SPEED_LIMIT = Number(process.env.SPEED_LIMIT) || 150;
const SPEED_POLL_MS = Number(process.env.SPEED_POLL_MS) || 3600e3;
// ISO čas v pásmu Europe/Prague s offsetem (±HH:MM), bez externích knihoven; řeší i letní čas
function pragueIso(ms) {
  const d = new Date(ms);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +(parts.hour % 24), +parts.minute, +parts.second);
  const offMin = Math.round((asUTC - d.getTime()) / 60000);
  const sign = offMin >= 0 ? "+" : "-", abs = Math.abs(offMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0"), om = String(abs % 60).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${oh}:${om}`;
}
// Kniha jízd je zanořená: driveBooks[] (dny) → driveBooks.driveBooks[] (jízdy)
function flattenDriveBooks(data) {
  const out = [];
  ((data && data.driveBooks) || []).forEach((day) => {
    const list = day && day.driveBooks && day.driveBooks.driveBooks;
    (list || []).forEach((t) => out.push(t));
  });
  return out;
}
// Kdo auto řídil bereme ze šichtovnice (předávky, zdroj admin.foodis) podle SPZ
// a data jízdy — monitoring řidiče u těchto aut neeviduje. Výpadek nevadí.
async function monTripDriver(spz, datum) {
  if (!intEnabled("smenovnik")) return "";
  try {
    const info = await upstream("smenovnik", `/vozidlo-ridic?spz=${encodeURIComponent(spzKey(spz))}&datum=${datum}`, { ttl: 5 * 60e3 });
    const names = ((info && info.drivers) || []).map((d) => (d.name || d.shortName || "").trim()).filter(Boolean);
    return [...new Set(names)].join(", ");
  } catch (e) { return ""; }
}
let speedPollRunning = false;
async function pollSpeeding() {
  if (!DOC || !monEnabled()) return;
  const admins = DOC.users.filter(isAdmin);
  if (!admins.length || speedPollRunning) return;
  speedPollRunning = true;
  try {
    DOC.speedAlerts = DOC.speedAlerts || { seen: {} };
    const sa = DOC.speedAlerts; const seen = sa.seen;
    const firstRun = !sa.initialized; // po nasazení nezaplavit starými jízdami
    const now = Date.now();
    const from = pragueIso(now - 3 * 3600e3), to = pragueIso(now); // okno 3 h, duplicity řeší driveBookId
    let tree;
    try { tree = await monFetch("/api/Car/GroupHierarchy"); } catch (e) { return; }
    const cars = ((tree && tree.carGroups) || []).flatMap((g) => g.cars || []);
    let changed = false;
    for (const c of cars) {
      let data;
      try { data = await monFetch(`/api/DriveBook/car/${c.carID}`, { method: "POST", body: { from, to, timezone: "Europe/Prague", type: -1, driver: 0 } }); }
      catch (e) { continue; } // jedno auto selže → ostatní dál
      for (const trip of flattenDriveBooks(data)) {
        if (!(trip.maxSpeed > SPEED_LIMIT) || !trip.driveBookId || seen[trip.driveBookId]) continue;
        seen[trip.driveBookId] = now; changed = true;
        if (firstRun) continue; // výchozí stav – jen zapamatovat, neupozorňovat
        const when = new Date(trip.dateTimeStop || trip.dateTimeStart).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
        // čas jízdy je už v pražském čase, datum = prvních 10 znaků (YYYY-MM-DD)
        const driver = await monTripDriver(c.spz, String(trip.dateTimeStop || trip.dateTimeStart).slice(0, 10));
        const clean = (s) => (s || "").replace(/;\s*/g, ", ");
        const route = [clean(trip.startDescription), clean(trip.stopDescription)].filter(Boolean);
        const where = route.length === 2 ? `${route[0]} → ${route[1]}` : (route[0] || "");
        admins.forEach((u) => notifyUser(u, "speed", {
          title: `Překročení rychlosti · ${c.spz}`,
          body: `${Math.round(trip.maxSpeed)} km/h${driver ? " · řidič " + driver : ""}${when ? " · " + when : ""}${where ? "\n" + where : ""}`,
          url: "/", tag: "speed-" + trip.driveBookId,
        }));
      }
    }
    for (const [id, ts] of Object.entries(seen)) if (now - ts > 14 * 864e5) { delete seen[id]; changed = true; }
    if (!sa.initialized) { sa.initialized = true; changed = true; }
    sa.lastCheck = now;
    if (changed) persist();
  } finally { speedPollRunning = false; }
}
setInterval(() => { pollSpeeding().catch((e) => console.error("pollSpeeding", e)); }, SPEED_POLL_MS);
setTimeout(() => { pollSpeeding().catch((e) => console.error("pollSpeeding", e)); }, 60e3); // první kontrola krátce po startu

/* ------------------------------------------------------------
   HLÍDAČ PŘEDÁVEK (pozdní příchody) — jednou denně po daném čase
   (pražského času) se zeptá šichtovnice, kdo má dnes ranní nebo
   celodenní směnu v předávkovém městě a do té doby neodeslal
   předávku, a pošle push vybraným lidem (default: denis + miroslav).
   Odpolední směny se neřeší. Každý kurýr jen jednou za den. Běží jen
   při nastaveném propojení se šichtovnicí.
   ------------------------------------------------------------ */
const PREDAVKA_DEADLINE = (process.env.PREDAVKA_DEADLINE || "10:40").trim(); // HH:MM pražského času
const PREDAVKA_ALERT_USERS = (process.env.PREDAVKA_ALERT_USERS || "denis,miroslav")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const PREDAVKA_CITY_NAMES = { melnik: "Mělník", benesov: "Benešov", vlasim: "Vlašim" };
const PREDAVKA_CHECK_MS = Number(process.env.PREDAVKA_CHECK_MS) || 60e3;
// aktuální pražský den (YYYY-MM-DD) a minuty od půlnoci; řeší i letní čas
function pragueDayMinutes(ms = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour % 24) * 60 + +p.minute };
}
let predavkaPollRunning = false;
async function pollPredavky() {
  if (!DOC || !intEnabled("smenovnik") || predavkaPollRunning) return;
  const [dh, dm] = PREDAVKA_DEADLINE.split(":").map(Number);
  const deadline = (Number.isFinite(dh) ? dh : 10) * 60 + (Number.isFinite(dm) ? dm : 40);
  const { date, minutes } = pragueDayMinutes();
  // jen v okně [deadline, deadline+3 h] — po delším výpadku serveru raději nehlásit pozdě večer
  if (minutes < deadline || minutes > deadline + 180) return;
  const pa = DOC.predavkaAlerts || (DOC.predavkaAlerts = {});
  if (pa.date === date && pa.done) return; // dnešek už proběhl
  const recipients = DOC.users.filter((u) => PREDAVKA_ALERT_USERS.includes((u.username || "").toLowerCase()));
  predavkaPollRunning = true;
  try {
    let data;
    try { data = await upstream("smenovnik", `/predavky-chybejici?datum=${date}`, { fresh: true }); }
    catch (e) { return; } // služba nedostupná → zkusí se při dalším ticku
    const missing = (data && data.missing) || [];
    for (const m of missing) {
      const cityName = PREDAVKA_CITY_NAMES[m.city] || m.city || "";
      const shift = m.shift === "fullday" ? "celodenní" : "ranní";
      recipients.forEach((u) => notifyUser(u, "predavka", {
        title: `Pozdní příchod${cityName ? " · " + cityName : ""}`,
        body: `${m.name} – ${shift} směna, nevyplněná předávka do ${PREDAVKA_DEADLINE}`,
        url: "/", tag: `predavka-${date}-${m.courierId}`,
      }));
    }
    DOC.predavkaAlerts = { date, done: true, count: missing.length, at: Date.now() };
    persist();
  } finally { predavkaPollRunning = false; }
}
setInterval(() => { pollPredavky().catch((e) => console.error("pollPredavky", e)); }, PREDAVKA_CHECK_MS);
setTimeout(() => { pollPredavky().catch((e) => console.error("pollPredavky", e)); }, 20e3);

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

/* ---------------- INVENTURA (sklad oblečení) ---------------- */

// Ruční pohyb: výdej osobě (dir "out") nebo příjem na sklad / vrácení (dir "in").
app.post("/api/inventory/move", requireAuth, requireAdmin, (req, res) => {
  const b = req.body || {};
  const item = String(b.item || "");
  const size = String(b.size || "").toUpperCase();
  const dir = b.dir === "in" ? "in" : "out";
  const qty = Math.max(1, Math.min(999, parseInt(b.qty, 10) || 0));
  if (!invItem(item)) return res.status(400).json({ error: "Neznámá položka." });
  if (!INV_SIZES.includes(size)) return res.status(400).json({ error: "Neznámá velikost." });
  const personName = String(b.personName || "").trim();
  if (dir === "out" && !personName) return res.status(400).json({ error: "U výdeje zadej jméno člověka." });
  DOC.inventory.ledger.push({
    id: uid(), ts: Date.now(), item, size, qty, dir, counted: true,
    personKey: personName ? nameKey(personName) : null, personName: personName || null,
    source: "manual", note: String(b.note || "").slice(0, 200) || null, by: req.user.id,
  });
  respond(req, res);
});

// Inventura: zadaný skutečný stav skladu { counts: { "tricko|L": 12, … } }.
// Rozdíl proti evidenci se zapíše jako opravný pohyb, takže historie zůstane.
app.post("/api/inventory/stocktake", requireAuth, requireAdmin, (req, res) => {
  const counts = (req.body && req.body.counts) || {};
  const { stock } = inventorySummary();
  const ts = Date.now();
  let moves = 0;
  for (const [k, raw] of Object.entries(counts)) {
    const [item, size] = String(k).split("|");
    if (!invItem(item) || !INV_SIZES.includes(size)) return res.status(400).json({ error: "Neznámá položka nebo velikost: " + k });
    if (raw === "" || raw == null) continue;
    const want = parseInt(raw, 10);
    if (!Number.isInteger(want) || want < 0 || want > 99999) return res.status(400).json({ error: "Neplatný počet u " + k });
    const diff = want - (stock[k] || 0);
    if (!diff) continue;
    DOC.inventory.ledger.push({
      id: uid(), ts, item, size, qty: Math.abs(diff), dir: diff > 0 ? "in" : "out", counted: true,
      personKey: null, personName: null, source: "stocktake", note: String(req.body.note || "Inventura").slice(0, 200), by: req.user.id,
    });
    moves++;
  }
  broadcast(req.header("x-client-id")); persist();
  res.json(Object.assign({ stocktake: { moves } }, filterStateFor(req.user)));
});

// Smazání jednoho pohybu (oprava chyby).
app.delete("/api/inventory/move/:id", requireAuth, requireAdmin, (req, res) => {
  const before = DOC.inventory.ledger.length;
  DOC.inventory.ledger = DOC.inventory.ledger.filter((m) => m.id !== req.params.id);
  if (DOC.inventory.ledger.length === before) return res.status(404).json({ error: "not_found" });
  respond(req, res);
});

// Import úvodního stavu „co kdo už má" z CSV (Google Forms). Nahrazuje předchozí
// import (source "init"), takže jde kdykoli zopakovat novým exportem.
app.post("/api/inventory/import", requireAuth, requireAdmin, (req, res) => {
  let rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows && typeof req.body?.csv === "string") { try { rows = parseInventoryCsv(req.body.csv); } catch (e) { return res.status(400).json({ error: "Nepodařilo se načíst CSV." }); } }
  if (!rows) return res.status(400).json({ error: "Chybí data (rows nebo csv)." });
  DOC.inventory.ledger = DOC.inventory.ledger.filter((m) => m.source !== "init");
  let people = 0, pieces = 0, skipped = 0;
  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;
    const key = nameKey(name);
    let any = false;
    for (const it of INV_ITEMS) {
      const cell = r[it.id] || {};
      const count = Math.max(0, Math.min(99, parseInt(cell.count, 10) || 0));
      if (!count) continue;
      const size = String(cell.size || "").toUpperCase().trim();
      if (!INV_SIZES.includes(size)) { skipped += count; continue; } // má kusy, ale bez velikosti → nelze zařadit
      DOC.inventory.ledger.push({
        id: uid(), ts: Date.now(), item: it.id, size, qty: count, dir: "out", counted: false,
        personKey: key, personName: name, source: "init", note: r.pobocka ? ("Pobočka: " + r.pobocka) : null,
      });
      pieces += count; any = true;
    }
    if (any) people++;
  }
  broadcast(req.header("x-client-id")); persist();
  res.json(Object.assign({ imported: { people, pieces, skipped } }, filterStateFor(req.user)));
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

loadDoc().then(() => {
  app.listen(PORT, () => console.log(`Trellite Pro běží na portu ${PORT}`));
  // Oblečení z Podpisů: podepsaná převzetí se odečtou ze skladu i bez otevření Trella.
  syncPodpisyClothing();
  setInterval(syncPodpisyClothing, 3 * 60e3);
}).catch((e) => { console.error("Start selhal:", e); process.exit(1); });
