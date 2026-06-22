import { useState, useEffect } from "react";

// First-run welcome / intro carousel. Shown once on first visit and once right after
// signup (gated by localStorage in App.jsx), and replayable via "How it works".
const FD = "var(--font-display)";
const F = "var(--font)";
const INK = "#0a0a0a", INK2 = "rgba(0,0,0,.6)", INK3 = "rgba(0,0,0,.4)", LINE = "rgba(0,0,0,.14)";
const ACCENT = "#2563eb";

const ico = { width: 84, height: 84, viewBox: "0 0 48 48", fill: "none", stroke: INK, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };

const SLIDES = [
  {
    eyebrow: "Validate",
    title: "Know before you build",
    body: "Get an AI deep-dive on your idea — market size, competition, unit economics, a roadmap, and a validation score — before you commit a single hour.",
    art: (
      <svg {...ico}><rect x="11" y="6" width="26" height="36" rx="3" /><path d="M17 30v6M24 24v12M31 27v9" /><path d="M16 13h16M16 18h10" /></svg>
    ),
  },
  {
    eyebrow: "Community",
    title: "A home for founders",
    body: "Share ideas, follow other founders, rate and discuss, and message directly — honest feedback from people who've actually built.",
    art: (
      <svg {...ico}><circle cx="18" cy="18" r="6" /><circle cx="32" cy="20" r="5" /><path d="M8 40c0-6 5-10 10-10s10 4 10 10M27 40c0-4.5 3-8 7-8 4 0 7 3 7 8" /></svg>
    ),
  },
  {
    eyebrow: "Free to start",
    title: "Your first validation is free",
    body: "No credit card. Run your first deep-dive report, share it with the community, and grow from there.",
    art: (
      <svg {...ico}><path d="M24 6l4.6 9.4L39 17l-7.5 7.3L33.2 39 24 32.8 14.8 39l1.7-14.7L9 17l10.4-1.6z" /></svg>
    ),
  },
];

const btnPrimary = { flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 8, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: F };
const btnSecondary = { flexShrink: 0, background: "#fff", color: INK, border: `1.5px solid ${LINE}`, borderRadius: 8, padding: "14px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: F };

export default function WelcomeSlides({ onClose, onStart }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, SLIDES.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const s = SLIDES[i];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#fff", display: "flex", flexDirection: "column", fontFamily: F }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
        <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px", color: INK }}>startup oracle</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 14, color: INK3, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Skip</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
        <div key={i} style={{ maxWidth: 520, animation: "soWelcomeFade .3s ease" }}>
          <div style={{ marginBottom: 34, display: "flex", justifyContent: "center" }}>{s.art}</div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: INK3, marginBottom: 14 }}>{s.eyebrow}</div>
          <h1 style={{ fontFamily: FD, fontSize: 32, fontWeight: 800, letterSpacing: "-1px", margin: "0 0 14px", lineHeight: 1.15, color: INK }}>{s.title}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: INK2, margin: 0 }}>{s.body}</p>
        </div>
        <style>{`@keyframes soWelcomeFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {SLIDES.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Go to slide ${n + 1}`}
              style={{ width: n === i ? 22 : 8, height: 8, borderRadius: 99, border: "none", cursor: "pointer", padding: 0, background: n === i ? ACCENT : "rgba(0,0,0,.15)", transition: "all .2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 420 }}>
          {i > 0 && <button onClick={() => setI(i - 1)} style={btnSecondary}>Back</button>}
          {last
            ? <button onClick={onStart} style={btnPrimary}>Get started →</button>
            : <button onClick={() => setI(i + 1)} style={btnPrimary}>Next</button>}
        </div>
      </div>
    </div>
  );
}
