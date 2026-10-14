/* Trellite Pro — backend server.
   Serves the static frontend from /public and persists the whole
   workspace state as a JSON document. Uses Postgres when DATABASE_URL
   is set (e.g. on Railway), otherwise a local JSON file for dev. */

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_ID = "default";

app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------- Storage abstraction ---------- */
let storage;

if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  const useSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  async function init() {
    await pool.query(`CREATE TABLE IF NOT EXISTS workspace (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }
  storage = {
    ready: init(),
    async get() {
      const r = await pool.query("SELECT data FROM workspace WHERE id = $1", [WORKSPACE_ID]);
      return r.rows[0] ? r.rows[0].data : null;
    },
    async set(data) {
      await pool.query(
        `INSERT INTO workspace (id, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [WORKSPACE_ID, data]
      );
    },
  };
  console.log("Storage: Postgres (DATABASE_URL detected)");
} else {
  const dir = path.join(__dirname, "data");
  const file = path.join(dir, "state.json");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  storage = {
    ready: Promise.resolve(),
    async get() {
      try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
    },
    async set(data) {
      fs.writeFileSync(file, JSON.stringify(data));
    },
  };
  console.log("Storage: local JSON file (no DATABASE_URL — dev mode)");
}

/* ---------- API ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/state", async (req, res) => {
  try {
    await storage.ready;
    const data = await storage.get();
    res.json({ data: data || null });
  } catch (e) {
    console.error("GET /api/state", e);
    res.status(500).json({ error: "read_failed" });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    await storage.ready;
    const data = req.body && req.body.data;
    if (!data || typeof data !== "object") return res.status(400).json({ error: "bad_payload" });
    await storage.set(data);
    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/state", e);
    res.status(500).json({ error: "write_failed" });
  }
});

/* SPA fallback */
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Trellite Pro běží na portu ${PORT}`));
