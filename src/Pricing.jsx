import { useState, useEffect } from "react";
import { startSubscription, fetchMyBilling, syncSubscription, cancelSubscription } from "./billingDB";

const F = "var(--font)";           // DM Sans — unified body/UI ramp
const FD = "var(--font-display)";  // Plus Jakarta Sans — headings/display
const INK = "#0f172a";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    s.onload = () => finish(true);
    s.onerror = () => finish(false);
    setTimeout(() => finish(false), 15000); // don't hang on a stalled script load (PAY-005)
    document.body.appendChild(s);
  });
}

function PlanCard({ plan, price, per, sub, recommended, selected, busy, isSubscribed, onSelect, onSubscribe }) {
  const isSel = selected === plan;
  return (
    <div onClick={() => onSelect(plan)} role="radio" aria-checked={isSel} tabIndex={0}
      aria-label={`${plan === "monthly" ? "Monthly" : "Yearly"} plan, ${price} ${per}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(plan); } }}
      style={{ flex: 1, minWidth: 240, background: "#fff", borderRadius: 14, cursor: "pointer",
        border: `${isSel ? 2 : 1.5}px solid ${isSel ? INK : "rgba(0,0,0,.12)"}`,
        padding: "28px 26px", position: "relative", boxShadow: isSel ? "0 12px 40px rgba(0,0,0,.12)" : "none",
        transition: "border-color .15s var(--ease), box-shadow .15s var(--ease)" }}>
      {recommended && <div style={{ position: "absolute", top: -12, left: 26, background: INK, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99, letterSpacing: ".3px" }}>BEST VALUE · SAVE ₹100</div>}
      <div aria-hidden="true" style={{ position: "absolute", top: 18, right: 18, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSel ? INK : "rgba(0,0,0,.22)"}`, background: isSel ? INK : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s var(--ease)" }}>
        {isSel && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,.6)", marginBottom: 8 }}>{plan === "monthly" ? "Monthly" : "Yearly"}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: FD, fontSize: 40, fontWeight: 800, color: INK, letterSpacing: "-1px" }}>{price}</span>
        <span style={{ fontSize: 14, color: "rgba(0,0,0,.45)" }}>{per}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(0,0,0,.5)", marginTop: 4, minHeight: 18 }}>{sub}</div>
      <button onClick={(e) => { e.stopPropagation(); if (isSel) onSubscribe(plan); else onSelect(plan); }} disabled={!!busy || isSubscribed}
        style={{ width: "100%", marginTop: 18, padding: "13px", borderRadius: 10, border: isSel ? "none" : `1.5px solid ${INK}`, background: isSel ? INK : "transparent", color: isSel ? "#fff" : INK, fontSize: 14.5, fontWeight: 700, cursor: busy || isSubscribed ? "default" : "pointer", opacity: busy && busy !== plan ? 0.5 : 1, fontFamily: F, transition: "all .15s var(--ease)" }}>
        {isSubscribed ? "You're subscribed" : busy === plan ? "Opening checkout…" : isSel ? "Subscribe" : "Choose this plan"}
      </button>
    </div>
  );
}

const PERKS = [
  "2 idea validations every month",
  "Full 6-section deep-dive reports",
  "Verified Founder badge on your profile & posts",
  "Save, re-open & PDF-export every report",
  "Everything in the community — post, rate, suggest, DM",
];

export default function Pricing({ user, onHome, onSignIn }) {
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [billing, setBilling] = useState(null);
  const [selected, setSelected] = useState(null); // no plan pre-selected — user picks
  const [reconciling, setReconciling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelInfo, setCancelInfo] = useState("");

  // Initial load — and if a prior checkout left the sub mid-flight, reconcile once.
  useEffect(() => {
    if (!user) return undefined;
    let stop = false;
    (async () => {
      let b = await fetchMyBilling(user.id);
      if (stop) return;
      setBilling(b);
      if (b?.sub_status === "created" || b?.sub_status === "pending") {
        await syncSubscription();
        b = await fetchMyBilling(user.id);
        if (!stop) setBilling(b);
      }
    })();
    return () => { stop = true; };
  }, [user]);

  // After checkout, poll sync+billing until the account actually activates, so
  // "paid" reliably becomes "active" even if the webhook is slow/missed (PAY-001).
  useEffect(() => {
    if (!done || !user) return undefined;
    let stop = false, attempts = 0;
    const tick = async () => {
      if (stop) return;
      setReconciling(true);
      attempts++;
      await syncSubscription();
      const b = await fetchMyBilling(user.id);
      if (stop) return;
      setBilling(b);
      if (b?.sub_status === "active" || attempts >= 6) { setReconciling(false); return; }
      setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 0); // defer out of the synchronous effect body
    return () => { stop = true; clearTimeout(t); };
  }, [done, user]);

  const isSubscribed = billing?.sub_status === "active";

  const subscribe = async (plan) => {
    if (!user) return onSignIn?.();
    setBusy(plan); setErr("");
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Couldn't load the payment window. Check your connection and retry.");
      const { subscription_id, key_id } = await startSubscription(plan);
      const rzp = new window.Razorpay({
        key: key_id,
        subscription_id,
        name: "Startup Oracle",
        description: plan === "monthly" ? "Founder — Monthly · ₹50/mo" : "Founder — Yearly · ₹500/yr",
        prefill: { email: user.email || "" },
        theme: { color: INK },
        handler: () => { setDone(true); setBusy(null); },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (e) {
      const msg = e?.message || "Something went wrong.";
      // Dormant billing returns "Billing not configured" — don't show users that raw (PAY-008).
      setErr(/not configured/i.test(msg)
        ? "Subscriptions aren't live yet — they're coming soon. Thanks for your interest!"
        : msg);
      setBusy(null);
    }
  };

  const doCancel = async () => {
    if (typeof window !== "undefined" && !window.confirm("Cancel your subscription? You'll keep access until the end of your current billing period.")) return;
    setCancelling(true); setErr("");
    try {
      const r = await cancelSubscription();
      const when = r?.ends_at ? new Date(r.ends_at).toLocaleDateString() : "the end of your billing period";
      setCancelInfo(`Subscription cancelled — you'll keep access until ${when}.`);
    } catch (e) { setErr(e?.message || "Could not cancel."); }
    setCancelling(false);
  };


  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f5", fontFamily: F }}>
      <header style={{ height: 60, background: "#fff", borderBottom: "1px solid rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
        <span onClick={onHome} style={{ fontFamily: FD, fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: INK, cursor: "pointer" }}>startup oracle</span>
        {user ? <span style={{ fontSize: 13, color: "rgba(0,0,0,.6)" }}>{user.user_metadata?.full_name || user.email}</span>
              : <span onClick={onSignIn} style={{ fontSize: 13, fontWeight: 600, color: INK, cursor: "pointer" }}>Sign in</span>}
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 20px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(0,0,0,.4)", marginBottom: 14 }}>Pricing</div>
        <h1 style={{ fontFamily: FD, fontSize: "clamp(32px,5vw,46px)", fontWeight: 800, letterSpacing: "-1.5px", color: INK, margin: "0 0 12px", lineHeight: 1.1 }}>Validate more. Get verified.</h1>
        <p style={{ fontSize: 15, color: "rgba(0,0,0,.55)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 36px" }}>
          Your first validation is free. Subscribe to keep validating ideas and earn the Verified Founder badge.
        </p>

        {done && (
          <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, marginBottom: 24, fontWeight: 600 }}>
            {isSubscribed
              ? "✓ You're all set — Verified Founder is active. Welcome aboard!"
              : reconciling
                ? "✓ Payment received — activating your account…"
                : "✓ Payment received! Activation is taking a little longer than usual — refresh in a minute, and it'll appear."}
          </div>
        )}
        {isSubscribed && !done && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, marginBottom: 24, fontWeight: 600, textAlign: "left", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span>✓ You're a Verified Founder ({billing.sub_plan || "active"}). Thanks for supporting Startup Oracle!</span>
            {cancelInfo
              ? <span style={{ fontWeight: 500, color: "rgba(0,0,0,.6)" }}>{cancelInfo}</span>
              : <button onClick={doCancel} disabled={cancelling} style={{ background: "transparent", border: "1px solid rgba(0,0,0,.2)", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: "rgba(0,0,0,.6)", cursor: cancelling ? "default" : "pointer", fontFamily: F }}>{cancelling ? "Cancelling…" : "Cancel subscription"}</button>}
          </div>
        )}
        {err && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>{err}</div>}

        <div role="radiogroup" aria-label="Choose a plan" style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", marginBottom: 36 }}>
          <PlanCard plan="monthly" price="₹50" per="/ month" sub="Billed monthly · cancel anytime" selected={selected} busy={busy} isSubscribed={isSubscribed} onSelect={setSelected} onSubscribe={subscribe} />
          <PlanCard plan="yearly" price="₹500" per="/ year" sub="₹41/mo · 2 months free" recommended selected={selected} busy={busy} isSubscribed={isSubscribed} onSelect={setSelected} onSubscribe={subscribe} />
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,.1)", padding: "24px 28px", textAlign: "left", maxWidth: 460, margin: "0 auto" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 14 }}>Every plan includes</div>
          {PERKS.map((p) => (
            <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 11, fontSize: 13.5, color: "rgba(0,0,0,.75)", lineHeight: 1.5 }}>
              <span style={{ color: INK, fontWeight: 800 }}>✓</span>{p}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "rgba(0,0,0,.4)", marginTop: 22, lineHeight: 1.6 }}>
          Secure payments via Razorpay (UPI, cards, net banking). Cancel anytime from your Razorpay receipts. Prices in INR.
        </p>
      </div>
    </div>
  );
}
