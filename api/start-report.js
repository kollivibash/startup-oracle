// Vercel Serverless Function — server-authoritative start of a validation report.
//
// This is the SINGLE place a validation is consumed (RPT-003). It atomically
// consumes one validation for the signed-in user, then issues a short-lived,
// signed "report grant" that /api/generate requires. That stops a signed-in user
// from calling /api/generate directly in a loop to burn the Gemini bill — every
// generate call must carry a grant, and a grant only exists after a real consume,
// which the DB quota (free = 1 total, subscriber = 2/month) caps.
//
// Fails OPEN until configured, mirroring the rest of the app:
//   - consume_validation missing (billing SQL not run)  -> allowed, reason "billing_off"
//   - REPORT_GRANT_SECRET unset                          -> allowed, grant null (enforcement off)

/* global process, Buffer */
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM";

const GRANT_TTL_MS = 10 * 60 * 1000; // a report (with retries/backoff) fits comfortably in 10 min

// Stateless HMAC grant: "<base64url(payload)>.<base64url(hmac)>". Bounded by the
// DB validation quota (number of grants a user can ever obtain), so a short TTL
// is sufficient — see /api/generate for verification.
function signGrant(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + GRANT_TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

const billingMissing = (msg) => /function|does not exist|schema cache|column|consume_validation/i.test(msg || "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  // Run as the user so consume_validation's auth.uid() / RLS resolve correctly.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  let user;
  try {
    const result = await userClient.auth.getUser(token);
    user = result.data?.user;
    if (result.error || !user) return res.status(401).json({ error: "Invalid or expired session" });
  } catch {
    return res.status(401).json({ error: "Auth verification failed" });
  }

  // Consume one validation atomically. Fail OPEN if billing isn't installed yet.
  let allowed = true;
  let reason;
  try {
    const { data, error } = await userClient.rpc("consume_validation");
    if (error) {
      if (!billingMissing(error.message)) console.error("consume_validation failed", error);
      reason = "billing_off"; // fail open
    } else if (data && data.allowed === false) {
      allowed = false;
      reason = data.reason || "need_sub";
    } else {
      reason = (data && data.reason) || null;
    }
  } catch {
    reason = "billing_off"; // fail open
  }

  if (!allowed) return res.status(200).json({ allowed: false, reason });

  const secret = process.env.REPORT_GRANT_SECRET;
  const grant = secret ? signGrant(user.id, secret) : null;
  return res.status(200).json({ allowed: true, reason, grant });
}
