// Vercel Serverless Function — cancel the signed-in user's subscription at the end
// of the current billing cycle (PAY-006), so "cancel anytime" is actually in-app.
// Benefits remain until the period ends; the webhook flips status when it lands.

/* global process, Buffer */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let user;
  try {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const result = await anon.auth.getUser(token);
    user = result.data?.user;
    if (result.error || !user) return res.status(401).json({ error: "Invalid or expired session" });
  } catch { return res.status(401).json({ error: "Auth verification failed" }); }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!serviceKey || !keyId || !keySecret) return res.status(500).json({ error: "Billing not configured" });

  const admin = createClient(SUPABASE_URL, serviceKey);
  const { data: prof } = await admin
    .from("profiles").select("rzp_subscription_id, sub_until").eq("id", user.id).single();
  const subId = prof?.rzp_subscription_id;
  if (!subId) return res.status(400).json({ error: "No subscription to cancel." });

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const r = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.description || "Could not cancel subscription" });
    const endsAt = data?.current_end ? new Date(data.current_end * 1000).toISOString() : prof?.sub_until || null;
    return res.status(200).json({ ok: true, ends_at: endsAt });
  } catch {
    return res.status(502).json({ error: "Could not cancel subscription" });
  }
}
