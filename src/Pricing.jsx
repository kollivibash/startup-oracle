import { useState, useEffect } from "react";
import { startSubscription, fetchMyBilling } from "./billingDB";

const F = "'DM Sans', system-ui, sans-serif";
const INK = "#0f172a";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PlanCard({ plan, price, per, sub, highlight, busy, isSubscribed, onSubscribe }) {
  return (
    <div style={{ flex: 1, minWidth: 240, background: "#fff", borderRadius: 14, border: `1.5px solid ${highlight ? INK : "rgba(0,0,0,.12)"}`, padding: "28px 26px", position: "relative", boxShadow: highlight ? "0 12px 40px rgba(0,0,0,.10)" : "none" }}>
      {highlight && <div style={{ position: "absolute", top: -12, left: 26, background: INK, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99, letterSpacing: ".3px" }}>BEST VALUE · SAVE ₹100</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,.6)", marginBottom: 8 }}>{plan === "monthly" ? "Monthly" : "Yearly"}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: INK, letterSpacing: "-1px" }}>{price}</span>
        <span style={{ fontSize: 14, color: "rgba(0,0,0,.45)" }}>{per}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(0,0,0,.5)", marginTop: 4, minHeight: 18 }}>{sub}</div>
      <button onClick={() => onSubscribe(plan)} disabled={!!busy || isSubscribed}
        style={{ width: "100%", marginTop: 18, padding: "13px", borderRadius: 10, border: highlight ? "none" : `1.5px solid ${INK}`, background: highlight ? INK : "transparent", color: highlight ? "#fff" : INK, fontSize: 14.5, fontWeight: 700, cursor: busy || isSubscribed ? "default" : "pointer", opacity: busy && busy !== plan ? 0.5 : 1, fontFamily: F }}>
        {isSubscribed ? "You're subscribed" : busy === plan ? "Opening checkout…" : "Subscribe"}
      </button>
    </div>
  );
}

const PERKS = [
  "2 idea validations every month",
  "Full 6-section deep-dive reports",
  "Verified Founder badge on your profile & posts",
  "Priority report generation",
  "Everything in the community — post, rate, suggest, DM",
];

export default function Pricing({ user, onHome, onSignIn }) {
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [billing, setBilling] = useState(null);

  useEffect(() => { if (user) fetchMyBilling(user.id).then(setBilling); }, [user, done]);
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
    } catch (e) { setErr(e?.message || "Something went wrong."); setBusy(null); }
  };


  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f5", fontFamily: F }}>
      <header style={{ height: 60, background: "#fff", borderBottom: "1px solid rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
        <span onClick={onHome} style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: INK, cursor: "pointer" }}>startup oracle</span>
        {user ? <span style={{ fontSize: 13, color: "rgba(0,0,0,.6)" }}>{user.user_metadata?.full_name || user.email}</span>
              : <span onClick={onSignIn} style={{ fontSize: 13, fontWeight: 600, color: INK, cursor: "pointer" }}>Sign in</span>}
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 20px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(0,0,0,.4)", marginBottom: 14 }}>Pricing</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,46px)", fontWeight: 800, letterSpacing: "-1.5px", color: INK, margin: "0 0 12px", lineHeight: 1.1 }}>Validate more. Get verified.</h1>
        <p style={{ fontSize: 15, color: "rgba(0,0,0,.55)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 36px" }}>
          Your first validation is free. Subscribe to keep validating ideas and earn the Verified Founder badge.
        </p>

        {done && (
          <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, marginBottom: 24, fontWeight: 600 }}>
            ✓ Payment received! Your Verified badge and validations activate within a minute.
          </div>
        )}
        {isSubscribed && !done && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, marginBottom: 24, fontWeight: 600 }}>
            ✓ You're a Verified Founder ({billing.sub_plan || "active"}). Thanks for supporting Startup Oracle!
          </div>
        )}
        {err && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>{err}</div>}

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", marginBottom: 36 }}>
          <PlanCard plan="monthly" price="₹50" per="/ month" sub="Billed monthly · cancel anytime" busy={busy} isSubscribed={isSubscribed} onSubscribe={subscribe} />
          <PlanCard plan="yearly" price="₹500" per="/ year" sub="₹41/mo · 2 months free" highlight busy={busy} isSubscribed={isSubscribed} onSubscribe={subscribe} />
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
