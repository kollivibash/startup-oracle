// Vercel Serverless Function — reconcile a user's subscription state against
// Razorpay directly (PAY-001). The webhook is the fast path; this is the fallback
// the client polls after checkout, so a delayed/missed webhook can't leave a paid
// user un-activated. Authoritative (service-role) writes; idempotent.

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
  if (!serviceKey || !keyId || !keySecret) return res.status(200).json({ synced: false, reason: "not_configured" });

  const admin = createClient(SUPABASE_URL, serviceKey);
  const { data: prof } = await admin
    .from("profiles")
    .select("sub_status, sub_until, verified, sub_plan, rzp_subscription_id")
    .eq("id", user.id).single();
  const subId = prof?.rzp_subscription_id;
  if (!subId) return res.status(200).json({ synced: false, reason: "no_subscription", billing: prof || null });

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const r = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await r.json();
    if (!r.ok) return res.status(200).json({ synced: false, reason: "razorpay_error", billing: prof });

    const status = data?.status;
    const now = new Date().toISOString();
    if (status === "active" || status === "authenticated") {
      const patch = {
        sub_status: "active",
        sub_plan: data?.notes?.plan || prof?.sub_plan || null,
        sub_until: data.current_end ? new Date(data.current_end * 1000).toISOString() : null,
        verified: true,
        rzp_event_at: now, // make this reconcile authoritative vs. stale webhook events
      };
      await admin.from("profiles").update(patch).eq("id", user.id);
      return res.status(200).json({ synced: true, billing: { ...prof, ...patch } });
    }
    if (["cancelled", "completed", "expired", "halted"].includes(status) && prof?.sub_status === "active") {
      const patch = { sub_status: "free", verified: false, rzp_event_at: now };
      await admin.from("profiles").update(patch).eq("id", user.id);
      return res.status(200).json({ synced: true, billing: { ...prof, ...patch } });
    }
    return res.status(200).json({ synced: false, reason: status || "pending", billing: prof });
  } catch {
    return res.status(200).json({ synced: false, reason: "error", billing: prof });
  }
}
