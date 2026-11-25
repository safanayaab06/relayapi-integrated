import { Router } from "express";
import axios from "axios";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import { validatePublicUrl } from "../lib/network.js";
const router = Router();
router.use(requireAuth);
const schema = z.object({
  method: z.enum(["GET","POST","PUT","DELETE"]),
  url: z.string().min(1).max(2048),
  headers: z.record(z.string()).default({}),
  params: z.record(z.string()).default({}),
  body: z.any().optional()
});
router.post("/", asyncHandler(async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request configuration." });
  const input = parsed.data;
  let url;
  try { url = await validatePublicUrl(input.url); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  for (const [key, value] of Object.entries(input.params)) {
    if (key.trim()) url.searchParams.set(key, value);
  }
  const headers = {};
  for (const [key, value] of Object.entries(input.headers)) {
    const k = key.trim().toLowerCase();
    if (!k || ["host","content-length","connection","transfer-encoding","cookie","set-cookie"].includes(k) || k.startsWith("sec-")) continue;
    headers[key] = value;
  }
  const start = Date.now();
  try {
    const response = await axios({
      method: input.method, url: url.toString(), headers,
      data: ["POST","PUT"].includes(input.method) ? input.body : undefined,
      timeout: Number(process.env.REQUEST_TIMEOUT_MS || 20000),
      maxContentLength: Number(process.env.MAX_RESPONSE_BYTES || 2000000),
      maxBodyLength: 1000000,
      maxRedirects: 0,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: [v => v]
    });
    const elapsedMs = Date.now() - start;
    let body = response.data;
    try { body = JSON.parse(response.data); } catch {}
    const sizeBytes = Buffer.byteLength(typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? ""));
    res.json({
      status: response.status, statusText: response.statusText,
      headers: response.headers, body, timeMs: elapsedMs, sizeBytes,
      contentType: response.headers["content-type"] || ""
    });
  } catch (e) {
    const elapsedMs = Date.now() - start;
    const status = e.code === "ECONNABORTED" ? 408 : 502;
    res.status(200).json({ status, statusText: e.code === "ECONNABORTED" ? "Request Timeout" : "Network Error",
      headers: {}, body: { error: e.message }, timeMs: elapsedMs, sizeBytes: 0, contentType: "application/json" });
  }
}));
export default router;
