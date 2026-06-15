import { supabase } from "./supabaseClient";

const billingMissing = e => /function|does not exist|schema cache|column|consume_validation/i.test(e?.message || "");

// Reads the signed-in user's billing/subscription state.
export async function fetchMyBilling(userId) {
  const def = { sub_status: "free", sub_plan: null, sub_until: null, verified: false, free_used: false, val_month: null, val_count: 0 };
  if (!userId) return def;
  const { data, error } = await supabase
    .from("profiles")
    .select("sub_status, sub_plan, sub_until, verified, free_used, val_month, val_count")
    .eq("id", userId).single();
  if (error) { if (!billingMissing(error)) console.error("fetchMyBilling failed", error); return def; }
  return { ...def, ...data };
}

// Atomically consume one validation. Fails OPEN (allowed) if billing isn't set up
// yet, so the app keeps working until the SQL migration is run.
export async function consumeValidation() {
  const { data, error } = await supabase.rpc("consume_validation");
  if (error) { if (!billingMissing(error)) console.error("consumeValidation failed", error); return { allowed: true, reason: "billing_off" }; }
  return data || { allowed: true };
}

export async function refundValidation() {
  const { error } = await supabase.rpc("refund_validation");
  if (error && !billingMissing(error)) console.error("refundValidation failed", error);
}

// Set of user ids with an active verified subscription (for the badge).
export async function fetchVerifiedIds() {
  const { data, error } = await supabase.from("profiles").select("id").eq("verified", true);
  if (error) { if (!billingMissing(error)) console.error("fetchVerifiedIds failed", error); return new Set(); }
  return new Set((data || []).map(r => r.id));
}

// Kicks off a Razorpay subscription; returns { subscription_id, key_id, plan }.
export async function startSubscription(plan) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Please sign in first.");
  const r = await fetch("/api/razorpay-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "Could not start checkout. Is billing configured?");
  return data;
}
