// Vercel Serverless Function — Razorpay webhook. Activates / deactivates a user's
// subscription + verified badge based on subscription lifecycle events.
//
// Required env vars:
//   RAZORPAY_WEBHOOK_SECRET      (set the same value in Razorpay → Webhooks)
//   SUPABASE_SERVICE_ROLE_KEY    (SECRET — lets the webhook update any profile, bypassing RLS)
//
// Configure in Razorpay Dashboard → Settings → Webhooks:
//   URL:    https://startup-oracle-seven.vercel.app/api/razorpay-webhook
//   Events: subscription.activated, subscription.charged, subscription.completed,
//           subscription.cancelled, subscription.halted, subscription.pending

/* global process */
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";

export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return res.status(500).json({ error: "Webhook not configured" });

  const raw = await readRaw(req);
  const signature = req.headers["x-razorpay-signature"];
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!signature || signature !== expected) return res.status(400).json({ error: "Invalid signature" });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: "Bad payload" }); }

  const sub = event?.payload?.subscription?.entity;
  const userId = sub?.notes?.user_id;
  const type = event?.event || "";
  if (!sub || !userId) return res.status(200).json({ ok: true }); // nothing to do

  // Active states keep the badge + quota; ended states revoke them.
  const activeEvents = ["subscription.activated", "subscription.charged", "subscription.resumed", "subscription.authenticated"];
  const endedEvents = ["subscription.cancelled", "subscription.completed", "subscription.halted", "subscription.expired"];

  let patch = null;
  if (activeEvents.includes(type)) {
    const until = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;
    const plan = sub?.notes?.plan || null;
    patch = { sub_status: "active", sub_plan: plan, sub_until: until, verified: true, rzp_subscription_id: sub.id };
  } else if (endedEvents.includes(type)) {
    patch = { sub_status: "free", verified: false };
  }
  if (!patch) return res.status(200).json({ ok: true });

  try {
    const supabase = createClient(SUPABASE_URL, serviceKey);
    await supabase.from("profiles").update(patch).eq("id", userId);
  } catch { /* swallow — Razorpay retries on non-2xx, but we don't want loops */ }
  return res.status(200).json({ ok: true });
}
