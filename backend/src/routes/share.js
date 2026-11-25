import { Router } from "express";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../lib/errors.js";
const router = Router();
router.get("/:token", asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT snapshot,expires_at FROM share_snapshots WHERE token=$1 AND (expires_at IS NULL OR expires_at>NOW())",
    [req.params.token]);
  if (!rows.length) return res.status(404).json({ error: "This share link is invalid or expired." });
  res.json({ snapshot: rows[0].snapshot, expiresAt: rows[0].expires_at });
}));
export default router;
