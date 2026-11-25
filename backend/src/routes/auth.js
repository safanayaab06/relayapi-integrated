import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../lib/errors.js";
const router = Router();
const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
function tokenFor(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}
router.post("/signup", asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email",
      [randomUUID(), name, email.toLowerCase(), hash]
    );
    const user = rows[0];
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    throw e;
  }
}));
router.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const { rows } = await pool.query("SELECT id,name,email,password_hash FROM users WHERE email=$1", [parsed.data.email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ error: "Incorrect email or password." });
  res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
}));
export default router;
