import { useState, useRef, useEffect } from 'react';
import { saveFounderProfile } from './communityDB';

const SERIF = "var(--font-serif)";   // wordmark only
const F = "var(--font)";
const FD = "var(--font-display)";
const BORDER = 'rgba(15,23,42,.12)';

// ── Option sets (from the Figma founder-onboarding design) ──
const SECTORS = ['Fintech', 'SaaS', 'Healthtech', 'AI · ML', 'Consumer', 'Climate', 'Deeptech', 'Edtech', 'Devtools', 'Infra', 'Marketplaces', 'Cybersecurity', 'Others'];
const STAGES = ['Idea', 'Prototype', 'Pre-seed', 'Seed', 'Series A', 'Series B+'];
const TEAM_SIZES = ['Just me', '2–3', '4–10', '10+'];
const CO_FOUNDER_OPTS = ['Solo founder', 'Have co-founders'];
const LAUNCH_STATUSES = ['Pre-launch', 'Live in beta', 'Live with users', 'Generating revenue'];
const BACKGROUNDS = ['Operator', 'Engineer', 'Product', 'Design', 'Sales & GTM', 'Domain expert', 'First-time founder', 'Repeat founder'];
const RAISING_OPTS = ['Raising now', 'Raising soon', 'Not raising'];
const ROUND_STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B+'];
const BEYOND_CAPITAL = ['Intros to customers', 'Hiring', 'Fundraising help', 'Product feedback', 'Technical guidance', 'GTM', 'Regulatory'];
const YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

const raisingActive = d => d.raising && d.raising !== 'Not raising';

// ── Step + field schema. Single-choice groups are dropdowns; multi-choice groups are
// multi-select dropdowns; the array order is the wizard order. Mirrors the investor flow.
const STEPS = [
  { id: 'about', title: 'About you', sub: "Help investors know who they're talking to.", fields: [
    { k: 'fullName',  label: 'Full name', type: 'text', ph: 'Ada Lovelace', req: true },
    { k: 'roleTitle', label: 'Role / title', type: 'text', ph: 'Founder & CEO' },
    { k: 'location',  label: 'Location', type: 'text', ph: 'San Francisco, CA', req: true, full: true },
    { k: 'linkedin',  label: 'LinkedIn', type: 'text', prefix: 'linkedin.com/in/', ph: 'adalovelace', full: true },
    { k: 'twitter',   label: 'X / Twitter', type: 'text', prefix: 'x.com/', ph: 'adalovelace', full: true },
  ] },
  { id: 'startup', title: 'Your startup', sub: 'The essentials investors will see first on your profile.', fields: [
    { k: 'startupName', label: 'Startup name', type: 'text', ph: 'Acme Inc.', req: true, full: true },
    { k: 'tagline',     label: 'One-line pitch', type: 'text', ph: 'The fastest way to do X for Y', req: true, full: true, hint: 'This will be the headline on your profile. Keep it to one crisp sentence.' },
    { k: 'website',     label: 'Website', type: 'text', prefix: 'https://', ph: 'acme.com', full: true },
    { k: 'sectors',     label: 'Sector', type: 'multi', options: SECTORS, ph: 'Select sectors…' },
    { k: 'stage',       label: 'Stage', type: 'select', options: STAGES, ph: 'Current stage…' },
    { k: 'founded',     label: 'Founded', type: 'select', options: YEARS, ph: 'Year…' },
  ] },
  { id: 'traction', title: 'Traction & team', sub: "Show where you are and what you've achieved so far.", fields: [
    { k: 'teamSize',   label: 'Team size', type: 'select', options: TEAM_SIZES },
    { k: 'coFounders', label: 'Co-founders', type: 'select', options: CO_FOUNDER_OPTS },
    { k: 'launchStatus', label: 'Where you are', type: 'select', options: LAUNCH_STATUSES, ph: 'Launch status…', full: true },
    { k: 'keyMetric',  label: 'Key metric so far', type: 'text', ph: 'e.g. 1,200 users, ₹3L MRR, 40 LOIs signed', full: true, hint: 'Pick the single number that best shows momentum.' },
    { k: 'biggestMilestone', label: 'Biggest milestone', type: 'textarea', ph: 'e.g. Closed our first enterprise customer, launched on Product Hunt (#2 of the day)…', full: true },
  ] },
  { id: 'background', title: 'Your background', sub: 'Investors back people as much as ideas.', fields: [
    { k: 'background', label: 'Background', type: 'multi', options: BACKGROUNDS, full: true, ph: 'Select all that apply…' },
    { k: 'previousCompanies', label: 'Previous companies', type: 'text', ph: 'e.g. Google, early-stage SaaS startup, own agency', full: true },
    { k: 'education',  label: 'Education', type: 'text', ph: 'e.g. B.Tech, IIT Delhi · MBA, ISB', full: true },
    { k: 'priorExits', label: 'Prior exits or notable wins', type: 'textarea', ph: 'e.g. Sold my last company to Razorpay in 2021. Built a product used by 200K users before shutting down.', full: true },
  ] },
  { id: 'building', title: "What you're building", sub: 'The problem, the solution, and your unfair advantage.', fields: [
    { k: 'problem',  label: "The problem you're solving", type: 'textarea', ph: 'What painful, widespread problem have you identified? Who suffers from it today?', full: true },
    { k: 'solution', label: 'Your solution', type: 'textarea', ph: 'How do you solve it? What makes your approach different from existing options?', full: true },
    { k: 'whyNow',   label: 'Why now · why you', type: 'textarea', ph: "What's changed that makes this the right moment? What unfair advantage do you have that others don't?", full: true, hint: 'This is often the most important signal for investors — be honest and specific.' },
  ] },
  { id: 'looking', title: "What you're looking for", sub: 'Tell the community how they can help you.', fields: [
    { k: 'raising',       label: 'Are you raising?', type: 'select', options: RAISING_OPTS, full: true },
    { k: 'amountSeeking', label: 'Amount seeking', type: 'text', ph: 'e.g. $500K, $2M', showIf: raisingActive },
    { k: 'roundStage',    label: 'Round stage', type: 'select', options: ROUND_STAGES, showIf: raisingActive },
    { k: 'beyondCapital', label: 'What you want beyond capital', type: 'multi', options: BEYOND_CAPITAL, full: true, ph: 'Select all that apply…' },
    { k: 'preferredContact', label: 'Preferred way to be reached', type: 'text', ph: 'e.g. Email me directly, LinkedIn message, warm intro preferred', full: true },
  ] },
];

const lbl = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontFamily: F };
const hintStyle = { fontSize: 12, color: 'var(--ink-3)', margin: '6px 0 0', fontFamily: F };
const ctrl = { width: '100%', boxSizing: 'border-box', height: 44, padding: '0 13px', fontSize: 14, fontFamily: F, color: 'var(--ink)', background: 'var(--surface)', border: `1px solid ${BORDER}`, borderRadius: 'var(--r-sm)', outline: 'none' };
const Req = () => <span style={{ color: 'var(--accent)', marginLeft: 2 }} aria-hidden="true">*</span>;

function TextField({ f, value, onChange }) {
  return (
    <div>
      <label htmlFor={`fo-${f.k}`} style={lbl}>{f.label}{f.req && <Req />}</label>
      {f.type === 'textarea'
        ? <textarea id={`fo-${f.k}`} value={value || ''} onChange={e => onChange(e.target.value)} aria-required={!!f.req} placeholder={f.ph} rows={3}
            style={{ ...ctrl, height: 'auto', minHeight: 84, padding: '11px 13px', lineHeight: 1.55, resize: 'vertical' }} />
        : f.prefix
          ? <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 'var(--r-sm)', background: 'var(--surface)', height: 44 }}>
              <span style={{ paddingLeft: 13, paddingRight: 2, fontSize: 13, color: 'var(--ink-3)', whiteSpace: 'nowrap', userSelect: 'none' }}>{f.prefix}</span>
              <input id={`fo-${f.k}`} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={f.ph}
                style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 13px 0 4px', fontSize: 14, fontFamily: F, color: 'var(--ink)', background: 'transparent', border: 'none', outline: 'none', borderRadius: 'var(--r-sm)' }} />
            </div>
          : <input id={`fo-${f.k}`} value={value || ''} onChange={e => onChange(e.target.value)} aria-required={!!f.req} placeholder={f.ph} style={ctrl} />}
      {f.hint && <p style={hintStyle}>{f.hint}</p>}
    </div>
  );
}

function SelectField({ f, value, onChange }) {
  return (
    <div>
      <label htmlFor={`fo-${f.k}`} style={lbl}>{f.label}{f.req && <Req />}</label>
      <select id={`fo-${f.k}`} value={value || ''} onChange={e => onChange(e.target.value)} aria-required={!!f.req}
        style={{ ...ctrl, cursor: 'pointer', color: value ? 'var(--ink)' : 'var(--ink-3)' }}>
        <option value="" disabled>{f.ph || 'Select…'}</option>
        {f.options.map(o => <option key={o} value={o} style={{ color: 'var(--ink)' }}>{o}</option>)}
      </select>
    </div>
  );
}

function MultiSelect({ f, value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const toggle = o => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  const remove = (o, e) => { e.stopPropagation(); onChange(value.filter(x => x !== o)); };
  const openMenu = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const estHeight = Math.min(240, f.options.length * 38 + 10);
      setDropUp(window.innerHeight - rect.bottom < estHeight + 12 && rect.top > estHeight + 12);
    }
    setOpen(o => !o);
  };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={lbl}>{f.label}{f.req && <Req />}</label>
      <button type="button" onClick={openMenu} aria-haspopup="listbox" aria-expanded={open}
        style={{ ...ctrl, height: 'auto', minHeight: 44, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, minWidth: 0 }}>
          {value.length === 0
            ? <span style={{ color: 'var(--ink-3)', fontSize: 14, padding: '4px 0' }}>{f.ph || 'Select all that apply…'}</span>
            : value.map(v => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--r-pill)' }}>
                  {v}
                  <span role="button" aria-label={`Remove ${v}`} onClick={e => remove(v, e)} style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, fontWeight: 700 }}>×</span>
                </span>
              ))}
        </span>
        <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" style={{ position: 'absolute', zIndex: 50, ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }), left: 0, right: 0, maxHeight: 240, overflowY: 'auto', background: 'var(--surface)', border: `1px solid ${BORDER}`, borderRadius: 'var(--r)', boxShadow: 'var(--sh-2)', padding: '6px' }}>
          {f.options.map(o => {
            const on = value.includes(o);
            return (
              <button key={o} type="button" role="option" aria-selected={on} onClick={() => toggle(o)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: on ? 'var(--accent-weak)' : 'transparent', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: F, fontSize: 13.5, color: 'var(--ink)' }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(15,23,42,.04)'; }} onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                <span aria-hidden="true" style={{ width: 17, height: 17, flexShrink: 0, borderRadius: 4, border: `1.5px solid ${on ? 'var(--accent)' : BORDER}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{on ? '✓' : ''}</span>
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FounderOnboarding({ user, onComplete, onExit }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const fields = s.fields.filter(f => !f.showIf || f.showIf(data));

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const canContinue = fields.filter(f => f.req).every(f => {
    const v = data[f.k];
    return f.type === 'multi' ? (Array.isArray(v) && v.length > 0) : (v && String(v).trim());
  });

  const next = async () => {
    if (!canContinue) return;
    if (!isLast) { setStep(step + 1); return; }
    setBusy(true);
    try { if (user) await saveFounderProfile(user.id, data); } catch (e) { console.error('saveFounderProfile failed', e); }
    setBusy(false);
    onComplete?.(data);
  };
  const back = () => (step === 0 ? onExit?.() : setStep(step - 1));

  const renderField = (f) => {
    if (f.type === 'select') return <SelectField f={f} value={data[f.k]} onChange={v => set(f.k, v)} />;
    if (f.type === 'multi') return <MultiSelect f={f} value={data[f.k]} onChange={v => set(f.k, v)} />;
    return <TextField f={f} value={data[f.k]} onChange={v => set(f.k, v)} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: F }}>
      <style>{`@media (max-width:560px){ .fo-grid{grid-template-columns:1fr!important} }`}</style>

      {/* Sticky header + segmented progress */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'color-mix(in srgb, var(--bg) 94%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 clamp(16px,5vw,24px)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Startup Oracle</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>Founder onboarding · Step {step + 1} of {STEPS.length}</span>
        </div>
        <div role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} style={{ maxWidth: 600, margin: '0 auto', padding: '0 clamp(16px,5vw,24px) 12px', display: 'flex', gap: 4 }}>
          {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? 'var(--accent)' : 'var(--line)', transition: 'background .3s' }} />)}
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'clamp(28px,5vw,40px) clamp(16px,5vw,24px) 120px' }}>
        <div style={{ marginBottom: 26 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '0 0 8px' }}>Step {step + 1} of {STEPS.length}</p>
          <h1 style={{ fontFamily: FD, fontSize: 'clamp(24px,5vw,30px)', fontWeight: 800, letterSpacing: 'var(--tracking-tight)', lineHeight: 'var(--lh-tight)', margin: '0 0 6px' }}>{s.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0, lineHeight: 'var(--lh)' }}>{s.sub}</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-1)', padding: 'clamp(20px,4vw,26px)' }}>
          <div className="fo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '18px 16px' }}>
            {fields.map(f => <div key={f.k} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>{renderField(f)}</div>)}
          </div>
        </div>

        {step < 2 && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '12px 0 0' }}>
            <span style={{ color: 'var(--accent)' }}>*</span> Required fields. Everything else is optional but builds trust.
          </p>
        )}
      </main>

      {/* Sticky footer nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'color-mix(in srgb, var(--bg) 94%, transparent)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px clamp(16px,5vw,24px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: F }}>← Back</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ borderRadius: 99, transition: 'all .2s', ...(i === step ? { width: 16, height: 6, background: 'var(--accent)' } : { width: 6, height: 6, background: i < step ? 'rgba(37,99,235,.4)' : 'var(--line)' }) }} />
            ))}
          </div>

          <button onClick={next} disabled={!canContinue || busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 'var(--r-pill)', background: (canContinue && !busy) ? 'var(--accent)' : 'rgba(15,23,42,.08)', color: (canContinue && !busy) ? '#fff' : 'var(--ink-3)', border: 'none', fontSize: 13, fontWeight: 700, cursor: (canContinue && !busy) ? 'pointer' : 'not-allowed', fontFamily: F }}>
            {busy ? 'Creating…' : isLast ? 'Create profile' : <>Continue<span aria-hidden="true">→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
