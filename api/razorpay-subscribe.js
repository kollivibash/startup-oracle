// Vercel Serverless Function — creates a Razorpay subscription for the signed-in
// user and returns the subscription id + public key_id for Razorpay Checkout.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   RAZORPAY_KEY_ID        (public-ish; used by Checkout on the client)
//   RAZORPAY_KEY_SECRET    (SECRET — server only)
//   RAZORPAY_PLAN_MONTHLY  (Razorpay Plan id for the ₹50/month plan)
//   RAZORPAY_PLAN_YEARLY   (Razorpay Plan id for the ₹500/year plan)

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const result = await supabase.auth.getUser(token);
    user = result.data?.user;
    if (result.error || !user) return res.status(401).json({ error: "Invalid or expired session" });
  } catch { return res.status(401).json({ error: "Auth verification failed" }); }

  const { plan } = req.body || {};
  if (plan !== "monthly" && plan !== "yearly") return res.status(400).json({ error: "Invalid plan" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = plan === "monthly" ? process.env.RAZORPAY_PLAN_MONTHLY : process.env.RAZORPAY_PLAN_YEARLY;
  if (!keyId || !keySecret || !planId) return res.status(500).json({ error: "Billing not configured" });

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        plan_id: planId,
        total_count: plan === "monthly" ? 120 : 10, // billing cycles before it ends
        customer_notify: 1,
        notes: { user_id: user.id, email: user.email || "", plan },
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.description || "Razorpay error" });
    return res.status(200).json({ subscription_id: data.id, key_id: keyId, plan });
  } catch {
    return res.status(502).json({ error: "Could not create subscription" });
  }
}
