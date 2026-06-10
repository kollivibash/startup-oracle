import { useState } from "react";

const REPORT = [
  { id: "validation", label: "Validation", icon: "◈", subs: ["Summary", "Scores", "Market", "Financials", "Roadmap", "Journey"] },
  { id: "market", label: "Market Analysis", icon: "◎", subs: ["Market", "Audience", "Competitors", "Strategy", "Risks & Ops", "Sources"] },
  { id: "plan", label: "Business Plan", icon: "▤", subs: ["Overview", "Plan", "Market", "Audience", "Competitors", "Strategy", "Risks", "Financials", "Internal Tools", "Sources"] },
  { id: "strategy", label: "Brand Strategy", icon: "✦", subs: ["Overview", "Naming", "Color", "Type", "Voice", "Content", "Art"] },
  { id: "visuals", label: "Brand Visuals", icon: "◐", subs: ["Overview", "Naming", "Color", "Type", "Voice", "Content", "Art"] },
  { id: "marketing", label: "Marketing Suite", icon: "▲", subs: ["Overview", "Ad Copy", "Visual Ads", "Channels", "UGC", "Funnel", "SEO", "Launch"] },
];

const PLACEHOLDER = {
  stats: [
    { k: "Overall Score", v: "87/100" },
    { k: "Market Fit", v: "Strong" },
    { k: "Confidence", v: "High" },
    { k: "TAM", v: "$4.2B" },
  ],
  bullets: [
    "Primary signal analysis pending full report generation.",
    "Competitive density mapped across 3 adjacent segments.",
    "Projected break-even window inside 14–18 months.",
    "Channel mix weighted toward organic + community-led growth.",
  ],
};

export default function MasterReport({ data, meta, ideaName, onBack }) {
  const [active, setActive] = useState(REPORT[0].id);
  const [sub, setSub] = useState(REPORT[0].subs[0]);
  const [mobileNav, setMobileNav] = useState(false);
  const section = REPORT.find((s) => s.id === active);
  const content = data?.[active]?.[sub];

  const pick = (id) => {
    const s = REPORT.find((r) => r.id === id);
    setActive(id);
    setSub(s.subs[0]);
    setMobileNav(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-6 border-b border-neutral-800">
          <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-500">Startup Oracle · Master Report</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight truncate" title={ideaName}>{ideaName || "Master Report"}</h1>
          {meta && (
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-950 text-xs font-bold">{meta.overallScore}/100</span>
              <span className="text-xs text-neutral-400">{meta.badge}</span>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {REPORT.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => pick(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active === s.id ? "bg-neutral-100 text-neutral-950 font-semibold" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900"
                }`}
              >
                <span className="text-xs">{s.icon}</span>
                {s.label}
              </button>
              {active === s.id && (
                <div className="mt-1 mb-2 ml-4 border-l border-neutral-800 pl-3 space-y-0.5">
                  {s.subs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSub(t)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition ${
                        sub === t ? "text-neutral-100 bg-neutral-900 font-medium" : "text-neutral-500 hover:text-neutral-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        {onBack && (
          <button onClick={onBack} className="m-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 text-left transition">
            ← Validate another idea
          </button>
        )}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-20 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-500">Master Report</p>
            <p className="text-sm font-semibold">{section.label}</p>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="px-3 py-1.5 rounded-lg border border-neutral-700 text-sm text-neutral-300">
            {mobileNav ? "Close" : "Sections"}
          </button>
        </header>
        {mobileNav && (
          <div className="md:hidden border-b border-neutral-800 bg-neutral-950 px-4 py-3 grid grid-cols-2 gap-2">
            {REPORT.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                className={`px-3 py-2 rounded-lg text-sm text-left ${active === s.id ? "bg-neutral-100 text-neutral-950 font-semibold" : "bg-neutral-900 text-neutral-400"}`}
              >
                {s.label}
              </button>
            ))}
            {onBack && (
              <button onClick={onBack} className="col-span-2 px-3 py-2 rounded-lg text-sm text-neutral-400 bg-neutral-900 text-left">
                ← Validate another idea
              </button>
            )}
          </div>
        )}
        <div className="md:hidden sticky top-[57px] z-10 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 px-4 py-2 flex gap-2 overflow-x-auto">
          {section.subs.map((t) => (
            <button
              key={t}
              onClick={() => setSub(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition ${
                sub === t ? "bg-neutral-100 text-neutral-950 font-semibold" : "bg-neutral-900 text-neutral-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-10 py-8 md:py-12">
          <div className="hidden md:block">
            <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-500">
              {section.label} <span className="mx-2 text-neutral-700">/</span> {sub}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{sub}</h2>
            <div className="mt-4 h-px bg-neutral-800" />
          </div>

          {content ? (
            <div className="mt-6 prose prose-invert prose-neutral max-w-none whitespace-pre-wrap text-[15px] leading-7 text-neutral-300">{content}</div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PLACEHOLDER.stats.map((s) => (
                  <div key={s.k} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-500">{s.k}</p>
                    <p className="mt-1.5 text-xl font-semibold">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
                <p className="text-sm font-medium text-neutral-200">
                  {section.label} — {sub}
                </p>
                <ul className="mt-4 space-y-3">
                  {PLACEHOLDER.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-sm text-neutral-400">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-600 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center">
                <p className="text-sm text-neutral-500">Full {sub.toLowerCase()} analysis renders here once the validation engine returns this section.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
