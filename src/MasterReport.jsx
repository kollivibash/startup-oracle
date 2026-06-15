import { useState } from "react";

const REPORT = [
  { id: "validation", label: "Validation", icon: "◈", subs: ["Summary", "Scores", "Market", "Financials", "Roadmap", "Journey"] },
  { id: "market", label: "Market Analysis", icon: "◎", subs: ["Market", "Audience", "Competitors", "Strategy", "Risks & Ops", "Sources"] },
  { id: "plan", label: "Business Plan", icon: "▤", subs: ["Overview", "Plan", "Market", "Audience", "Competitors", "Strategy", "Risks", "Financials", "Internal Tools", "Sources"] },
  { id: "strategy", label: "Brand Strategy", icon: "✦", subs: ["Overview", "Naming", "Color", "Type", "Voice", "Content", "Art"] },
  { id: "visuals", label: "Brand Visuals", icon: "◐", subs: ["Overview", "Naming", "Color", "Type", "Voice", "Content", "Art"] },
  { id: "marketing", label: "Marketing Suite", icon: "▲", subs: ["Overview", "Ad Copy", "Visual Ads", "Channels", "UGC", "Funnel", "SEO", "Launch"] },
];

const F = { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" };

const Bars = ({ d }) => {
  const items = (d.items || []).filter((i) => i && i.label != null);
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);
  return (
    <div className="my-6 rounded-xl border border-neutral-200 bg-white p-5">
      {d.title && <p className="mb-4 text-[13px] font-bold text-neutral-900">{d.title}</p>}
      <div className="space-y-3">
        {items.map((i, n) => (
          <div key={n} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-[12px] font-medium text-neutral-600" title={i.label}>{i.label}</span>
            <div className="h-5 flex-1 rounded-sm bg-neutral-100">
              <div className="flex h-full items-center rounded-sm bg-neutral-900 transition-all" style={{ width: `${Math.max((Number(i.value) || 0) / max * 100, 2)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[12px] font-bold text-neutral-900">{i.display ?? i.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Table = ({ d }) => (
  <div className="my-6 overflow-x-auto rounded-xl border border-neutral-200">
    {d.title && <p className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-[13px] font-bold text-neutral-900">{d.title}</p>}
    <table className="w-full text-left text-[13px]">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-50">
          {(d.cols || []).map((c, i) => (
            <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(d.rows || []).map((r, i) => (
          <tr key={i} className="border-b border-neutral-100 last:border-0">
            {(Array.isArray(r) ? r : [r]).map((c, j) => (
              <td key={j} className={`px-4 py-3 align-top leading-relaxed ${j === 0 ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>{String(c)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Block = ({ b }) => {
  if (typeof b === "string") return <p className="my-4 text-[15px] leading-7 text-neutral-600">{b}</p>;
  if (!b || typeof b !== "object") return null;
  if (b.h) return <h3 className="mt-10 mb-3 text-lg font-bold tracking-tight text-neutral-900 first:mt-0">{b.h}</h3>;
  if (b.p) return <p className="my-4 text-[15px] leading-7 text-neutral-600">{b.p}</p>;
  if (b.list)
    return (
      <ul className="my-4 space-y-2.5">
        {b.list.map((t, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-6 text-neutral-700">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
            {String(t)}
          </li>
        ))}
      </ul>
    );
  if (b.stats)
    return (
      <div className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {b.stats.map((s, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{s.label}</p>
            <p className="mt-1.5 text-xl font-extrabold tracking-tight text-neutral-900">{s.value}</p>
            {s.sub && <p className="mt-1 text-[11px] leading-4 text-neutral-500">{s.sub}</p>}
          </div>
        ))}
      </div>
    );
  if (b.bars) return <Bars d={b.bars} />;
  if (b.table) return <Table d={b.table} />;
  return null;
};

// ── Score dashboard (shown on Validation → Summary) ──────────────────────────
const SCORE_FIELDS = [
  ["marketScore", "Market Opportunity"],
  ["feasibilityScore", "Feasibility"],
  ["competitiveEdgeScore", "Competitive Edge"],
  ["originalityScore", "Originality"],
];

const ScoreRing = ({ score = 0 }) => {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  return (
    <div className="relative h-[128px] w-[128px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-neutral-200" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-neutral-900 transition-all duration-700" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-extrabold leading-none tracking-tight">{score ?? 0}</span>
        <span className="mt-0.5 text-[11px] font-medium text-neutral-400">/ 100</span>
      </div>
    </div>
  );
};

function ScoreOverview({ meta }) {
  if (!meta) return null;
  const fields = SCORE_FIELDS.filter(([k]) => meta[k] != null);
  return (
    <div className="mb-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
      <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
        <div className="flex items-center gap-5">
          <ScoreRing score={meta.overallScore} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Overall verdict</p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{meta.badge || "Validation Score"}</p>
            <p className="mt-1 text-[13px] leading-5 text-neutral-500">AI assessment across {fields.length || 4} dimensions</p>
          </div>
        </div>
        {fields.length > 0 && (
          <div className="grid flex-1 grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
            {fields.map(([k, label]) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-neutral-600">{label}</span>
                  <span className="font-bold text-neutral-900">{meta[k]}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-neutral-900 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, Number(meta[k]) || 0))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MasterReport({ data, meta, ideaName, onBack, onShareCommunity }) {
  const [active, setActive] = useState(REPORT[0].id);
  const [sub, setSub] = useState(REPORT[0].subs[0]);
  const [mobileNav, setMobileNav] = useState(false);
  const [shared, setShared] = useState("idle");
  const section = REPORT.find((s) => s.id === active);
  const content = data?.[active]?.[sub];

  const pick = (id) => {
    const s = REPORT.find((r) => r.id === id);
    setActive(id);
    setSub(s.subs[0]);
    setMobileNav(false);
  };

  const doShare = async () => {
    if (shared === "busy" || shared === "done") return;
    setShared("busy");
    try { await onShareCommunity(); setShared("done"); } catch { setShared("error"); }
  };
  const shareLabel = { idle: "↗ Share to Community", busy: "Sharing…", done: "✓ Shared to Community", error: "Retry share" }[shared];

  return (
    <div className="flex min-h-screen bg-white text-neutral-900" style={F}>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white md:flex">
        <div className="border-b border-neutral-200 px-5 py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Startup Oracle · Report</p>
          <h1 className="mt-1.5 truncate text-lg font-extrabold tracking-tight" title={ideaName}>{ideaName || "Master Report"}</h1>
          {meta && (
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{meta.overallScore}/100</span>
              <span className="text-xs font-medium text-neutral-500">{meta.badge}</span>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {REPORT.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => pick(s.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active === s.id ? "bg-neutral-900 font-semibold text-white" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <span className="text-xs">{s.icon}</span>
                {s.label}
              </button>
              {active === s.id && (
                <div className="mt-1 mb-2 ml-4 space-y-0.5 border-l border-neutral-200 pl-3">
                  {s.subs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSub(t)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                        sub === t ? "bg-neutral-100 font-semibold text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
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
        {onShareCommunity && (
          <button onClick={doShare} disabled={shared === "busy"} className={`mx-3 mt-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${shared === "done" ? "bg-emerald-600 text-white" : "bg-neutral-900 text-white hover:bg-neutral-700"}`}>
            {shareLabel}
          </button>
        )}
        {onBack && (
          <button onClick={onBack} className="m-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900">
            ← Validate another idea
          </button>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Master Report</p>
            <p className="text-sm font-bold">{section.label}</p>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700">
            {mobileNav ? "Close" : "Sections"}
          </button>
        </header>
        {mobileNav && (
          <div className="grid grid-cols-2 gap-2 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
            {REPORT.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm ${active === s.id ? "bg-neutral-900 font-semibold text-white" : "bg-neutral-100 text-neutral-600"}`}
              >
                {s.label}
              </button>
            ))}
            {onShareCommunity && (
              <button onClick={doShare} disabled={shared === "busy"} className={`col-span-2 rounded-lg px-3 py-2 text-center text-sm font-semibold ${shared === "done" ? "bg-emerald-600 text-white" : "bg-neutral-900 text-white"}`}>
                {shareLabel}
              </button>
            )}
            {onBack && (
              <button onClick={onBack} className="col-span-2 rounded-lg bg-neutral-100 px-3 py-2 text-left text-sm text-neutral-500">
                ← Validate another idea
              </button>
            )}
          </div>
        )}
        <div className="sticky top-[57px] z-10 flex gap-2 overflow-x-auto border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
          {section.subs.map((t) => (
            <button
              key={t}
              onClick={() => setSub(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                sub === t ? "bg-neutral-900 font-semibold text-white" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <main className="mx-auto max-w-3xl px-4 py-8 md:px-10 md:py-12">
          <div className="hidden md:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              {section.label} <span className="mx-2 text-neutral-300">/</span> {sub}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{sub}</h2>
            <div className="mt-5 h-px bg-neutral-200" />
          </div>

          {active === "validation" && sub === "Summary" && <div className="mt-6"><ScoreOverview meta={meta} /></div>}

          {content ? (
            <div className="mt-2 md:mt-6">
              {Array.isArray(content)
                ? content.map((b, i) => <Block key={i} b={b} />)
                : <p className="whitespace-pre-wrap text-[15px] leading-7 text-neutral-600">{String(content)}</p>}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-10 text-center">
              <p className="text-sm text-neutral-400">This part of the report didn't generate. Re-run the validation to fill it in.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
