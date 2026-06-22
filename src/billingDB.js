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

// Server-authoritative start of a report: /api/start-report consumes one validation
// AND returns a short-lived grant that authorizes the report's /api/generate calls
// (RPT-003). Fails OPEN (e.g. /api absent under `vite dev`) so local/pre-config still
// works — generation just won't carry a grant, which /api/generate also ignores until
// REPORT_GRANT_SECRET is set. Returns { allowed, reason, grant }.
export async function startReport() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { allowed: false, reason: "signin", grant: null };
  try {
    const r = await fetch("/api/start-report", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { allowed: true, reason: "billing_off", grant: null }; // fail open
    const data = await r.json();
    return { allowed: true, reason: null, grant: null, ...data };
  } catch {
    return { allowed: true, reason: "billing_off", grant: null }; // fail open
  }
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
// Wrapped in a 15s timeout so a flaky connection can't hang the checkout button (PAY-005).
export async function startSubscription(plan) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Please sign in first.");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch("/api/razorpay-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan }),
      signal: ctl.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Could not start checkout. Is billing configured?");
    return data;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("Checkout is taking too long — check your connection and try again.", { cause: e });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Reconcile subscription state against Razorpay (fallback for webhook lag/miss).
// Returns { synced, reason?, billing? }; degrades to { synced:false } off-Vercel.
export async function syncSubscription() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { synced: false };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000); // don't hang reconciliation (CROSS-004)
  try {
    const r = await fetch("/api/razorpay-sync", { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal });
    if (!r.ok) return { synced: false };
    return await r.json();
  } catch { return { synced: false }; }
  finally { clearTimeout(timer); }
}

// Cancel the user's subscription at the end of the current cycle (PAY-006).
export async function cancelSubscription() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Please sign in first.");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch("/api/razorpay-cancel", { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Could not cancel subscription.");
    return data;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("Request timed out — please try again.", { cause: e });
    throw e;
  } finally { clearTimeout(timer); }
}
