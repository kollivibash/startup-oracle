// Vercel Serverless Function — secure proxy to the Gemini API.
//
// The Gemini key lives ONLY here (process.env.GEMINI_API_KEY, no VITE_ prefix),
// so it is never bundled into the frontend and never visible to the browser.
//
// The endpoint is locked down so it can't be abused to burn your paid quota:
//   1. POST only
//   2. Caller must present a valid Supabase session token (must be signed in)
//   3. Only whitelisted models are allowed
//
// The frontend (reportEngine.js) calls /api/generate instead of Google directly.

/* global process, Buffer */
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// anon key — safe to keep here (same as the client uses; protected by RLS)
const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM";

// Only these models may ever be called — an attacker can't request an expensive one.
const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];

// Verify a report grant issued by /api/start-report (RPT-003). Returns the
// payload when valid, else null. Constant-time signature compare; checks expiry.
function verifyGrant(grant, secret) {
  if (typeof grant !== "string" || !grant.includes(".")) return null;
  const [payload, sig] = grant.split(".");
  if (!payload || !sig) return null;
  const expect = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!obj.exp || Date.now() > obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Require a valid signed-in Supabase session.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let user;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const result = await supabase.auth.getUser(token);
    user = result.data?.user;
    if (result.error || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  } catch {
    return res.status(401).json({ error: "Auth verification failed" });
  }

  // 1b. Require a valid report grant — but only once REPORT_GRANT_SECRET is set,
  // so the endpoint keeps working before the owner enables enforcement (RPT-003).
  const grantSecret = process.env.REPORT_GRANT_SECRET;
  if (grantSecret) {
    const grant = verifyGrant(req.headers["x-report-grant"], grantSecret);
    if (!grant || grant.uid !== user.id) {
      return res.status(403).json({ error: "Missing or invalid report grant" });
    }
  }

  // 2. Validate the request body.
  const { prompt, model } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt" });
  }
  // Cap prompt size so a stolen token can't run up the bill with huge inputs.
  if (prompt.length > 20000) {
    return res.status(400).json({ error: "Prompt too long" });
  }
  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: "Model not allowed" });
  }

  // 3. Call Gemini with the server-side key.
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Server misconfigured: GEMINI_API_KEY missing" });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // High enough that the largest section (Marketing Suite, 8 subsections)
          // fully generates even after 2.5-flash spends "thinking" tokens, which
          // also count against this budget. 8192 was too low and truncated it.
          responseMimeType: "application/json",
          temperature: 0.45,
          maxOutputTokens: 24576,
        },
      }),
    });

    // Pass the upstream status through so the client's retry/backoff logic
    // (429/5xx) keeps working, but never leak the raw key in any error.
    const body = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(body);
  } catch {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
