import { Router } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, COUNT(r.id)::int AS request_count
     FROM collections c LEFT JOIN saved_requests r ON r.collection_id=c.id
     WHERE c.user_id=$1 GROUP BY c.id ORDER BY c.updated_at DESC`, [req.user.sub]);
  res.json({ collections: rows });
}));
router.post("/", asyncHandler(async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(300).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Collection name is required (maximum 100 characters)." });
  const { rows } = await pool.query(
    "INSERT INTO collections(id,user_id,name,description) VALUES($1,$2,$3,$4) RETURNING *",
    [randomUUID(), req.user.sub, parsed.data.name, parsed.data.description || ""]);
  res.status(201).json({ collection: rows[0] });
}));
router.get("/:id/requests", asyncHandler(async (req, res) => {
  const owned = await pool.query("SELECT id FROM collections WHERE id=$1 AND user_id=$2", [req.params.id, req.user.sub]);
  if (!owned.rowCount) return res.status(404).json({ error: "Collection not found." });
  const { rows } = await pool.query("SELECT * FROM saved_requests WHERE collection_id=$1 ORDER BY created_at DESC", [req.params.id]);
  res.json({ requests: rows });
}));
router.post("/:id/requests", asyncHandler(async (req, res) => {
  const owned = await pool.query("SELECT id FROM collections WHERE id=$1 AND user_id=$2", [req.params.id, req.user.sub]);
  if (!owned.rowCount) return res.status(404).json({ error: "Collection not found." });
  const schema = z.object({
    name: z.string().trim().min(1).max(100),
    method: z.enum(["GET","POST","PUT","DELETE"]),
    url: z.string().url().max(2048),
    headers: z.record(z.string()).default({}),
    params: z.record(z.string()).default({}),
    body: z.any().nullable().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid saved request." });
  const r = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO saved_requests(id,collection_id,name,method,url,headers,params,body)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [randomUUID(), req.params.id, r.name, r.method, r.url, JSON.stringify(r.headers), JSON.stringify(r.params), r.body == null ? null : JSON.stringify(r.body)]);
  await pool.query("UPDATE collections SET updated_at=NOW() WHERE id=$1", [req.params.id]);
  res.status(201).json({ request: rows[0] });
}));
router.delete("/requests/:requestId", asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM saved_requests r USING collections c
     WHERE r.collection_id=c.id AND r.id=$1 AND c.user_id=$2`,
    [req.params.requestId, req.user.sub]);
  if (!rowCount) return res.status(404).json({ error: "Saved request not found." });
  res.status(204).end();
}));
router.post("/:id/share", asyncHandler(async (req, res) => {
  const { rows: collections } = await pool.query("SELECT * FROM collections WHERE id=$1 AND user_id=$2", [req.params.id, req.user.sub]);
  if (!collections.length) return res.status(404).json({ error: "Collection not found." });
  const { rows: requests } = await pool.query(
    "SELECT name,method,url,headers,params,body FROM saved_requests WHERE collection_id=$1 ORDER BY created_at", [req.params.id]);
  const token = randomBytes(24).toString("hex");
  const snapshot = { collection: { name: collections[0].name, description: collections[0].description }, requests };
  await pool.query("INSERT INTO share_snapshots(id,collection_id,token,snapshot,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '30 days')",
    [randomUUID(), req.params.id, token, JSON.stringify(snapshot)]);
  res.status(201).json({ shareUrl: `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/share/${token}`, expiresInDays: 30 });
}));
export default router;
