import { useState, useRef, useEffect } from 'react';
import { saveInvestorProfile } from './communityDB';

const SERIF = "var(--font-serif)";   // wordmark only
const F = "var(--font)";
const FD = "var(--font-display)";
const BORDER = 'rgba(15,23,42,.14)';

// ── Step + field schema. Single-choice groups are dropdowns; multi-choice groups are
// multi-select dropdowns (checkbox list) — per the "make the clumsy pill rows dropdowns" ask.
// Step 5 is a placeholder until the screenshot arrives; the array order is the wizard order.
const STEPS = [
  { id:'about', title:'About you', sub:'Founders see this at the top of your investor profile.', fields:[
    { k:'fullName', label:'Full name', type:'text', ph:'e.g. Rohan Mehta', req:true, full:true },
    { k:'firm',     label:'Firm / fund', type:'text', ph:'e.g. Indus Capital' },
    { k:'location', label:'Location',  type:'text', ph:'Bengaluru, India', req:true },
    { k:'linkedin', label:'LinkedIn',  type:'text', ph:'linkedin.com/in/…' },
    { k:'website',  label:'Website',   type:'text', ph:'induscapital.vc' },
  ] },
  { id:'cred', title:'Credentials', sub:'Track record builds trust before the first reply.', fields:[
    { k:'yearsInvesting',  label:'Years investing', type:'select', options:['< 1 yr','1–3 yrs','3–7 yrs','7–15 yrs','15+ yrs'], req:true },
    { k:'background',      label:'Your background', type:'multi', options:['Operator','Ex-founder','Engineer','Product','Banking','Consulting','Academia','Domain expert','Others'], full:true, req:true },
    { k:'aum',             label:'Assets under management', type:'select', options:['Personal','< ₹10 Cr','₹10–100 Cr','₹100–500 Cr','₹500 Cr+'], req:true },
    { k:'companiesBacked', label:'Companies backed', type:'select', options:['0–5','6–15','16–40','40+'], req:true },
    { k:'notableExits',    label:'Notable exits or marquee bets (optional)', type:'text', ph:'e.g. Ledgerly (acq. 2024), Stacklane (Series C)', full:true },
  ] },
  { id:'invest', title:'How you invest', sub:'We use this to route deals that match your check and stage.', fields:[
    { k:'investorType',  label:'Investor type', type:'select', options:['Angel','Syndicate lead','Scout','Micro-VC','VC fund','Family office','CVC'] },
    { k:'typicalTicket', label:'Typical ticket', type:'select', options:['₹5–25 L','₹25 L–1 Cr','₹1–5 Cr','₹5–15 Cr','₹15 Cr+'] },
    { k:'followOn',      label:'Follow-on reserves', type:'select', options:['None','0.5×','1×','2×+'] },
    { k:'stagesYouBack', label:'Stages you back', type:'multi', options:['Idea','Prototype','Pre-seed','Seed','Series A','Series B+'], full:true },
    { k:'leadOrFollow',  label:'Lead or follow', type:'select', options:['Lead rounds','Co-lead','Follow only','Either'] },
    { k:'decisionSpeed', label:'Decision speed', type:'select', options:['< 1 week','1–2 weeks','2–4 weeks','4+ weeks'] },
  ] },
  { id:'focus', title:'Where you focus', sub:'Pick the sectors, models and geographies you actually write checks in.', fields:[
    { k:'sectors',        label:'Sectors', type:'multi', options:['Fintech','SaaS','Healthtech','AI · ML','Consumer','Climate','Deeptech','Edtech','Devtools','Infra','Marketplaces','Cybersecurity'], full:true },
    { k:'businessModels', label:'Business models', type:'multi', options:['B2B SaaS','B2C','Marketplace','D2C','API / Infra','Hardware','Services + software'], full:true },
    { k:'geographies',    label:'Geographies', type:'multi', options:['India','SEA','MENA','US','Europe','LATAM','Africa','Global'], full:true },
    { k:'dealBreakers',   label:'Deal-breakers', type:'multi', options:['Solo founder','No technical co-founder','Pre-revenue','Regulated markets','Hardware-heavy','Crypto','Adtech'], full:true },
  ] },
  { id:'help', title:'How you help', sub:'Founders increasingly pick capital by what comes with it.', fields:[
    { k:'whatYouBring',      label:'What you bring beyond capital', type:'multi', options:['Hiring','GTM intros','Enterprise customers','Fundraising help','Product reviews','Technical architecture','Regulatory','International expansion','PR & brand'], full:true },
    { k:'postInvestment',    label:'Post-investment involvement', type:'select', options:['Hands-off','Monthly check-ins','Weekly sparring','Embedded'] },
    { k:'boardSeats',        label:'Board seats', type:'select', options:['Never','Observer only','When lead','Open to it'] },
    { k:'preferredApproach', label:'Preferred way to be approached', type:'multi', options:['Warm intro','Cold email OK','In-app pitch','Demo first'], full:true },
  ] },
  { id:'thesis', title:'Your thesis', sub:'A short note founders will read before they reach out.', fields:[
    { k:'thesis',     label:'Your investing thesis', type:'textarea', ph:'I back technical founders building infrastructure for Indian SMBs. I look for distribution insight and capital efficiency.', full:true },
    { k:'antiThesis', label:"What you don't invest in", type:'textarea', ph:'Pure consumer social, ad-driven media, anything that needs heavy balance-sheet capital to work.', full:true },
  ] },
];

const lbl = { display:'block', fontSize:11, fontWeight:700, letterSpacing:'.6px', textTransform:'uppercase', color:'var(--ink-2)', marginBottom:8 };
const ctrl = { width:'100%', boxSizing:'border-box', height:50, padding:'0 14px', fontSize:15, fontFamily:F, color:'var(--ink)', background:'var(--surface)', border:`1px solid ${BORDER}`, borderRadius:'var(--r)', outline:'none' };
const Req = () => <span style={{ color:'var(--accent)', marginLeft:3 }} aria-hidden="true">*</span>;

function TextField({ f, value, onChange }) {
  return (
    <div>
      <label htmlFor={`io-${f.k}`} style={lbl}>{f.label}{f.req && <Req/>}</label>
      {f.type === 'textarea'
        ? <textarea id={`io-${f.k}`} value={value||''} onChange={e=>onChange(e.target.value)} aria-required={!!f.req} placeholder={f.ph} rows={4}
            style={{ ...ctrl, height:'auto', minHeight:120, padding:'12px 14px', lineHeight:1.6, resize:'vertical' }}/>
        : <input id={`io-${f.k}`} value={value||''} onChange={e=>onChange(e.target.value)} aria-required={!!f.req} placeholder={f.ph} style={ctrl}/>}
    </div>
  );
}

function SelectField({ f, value, onChange }) {
  return (
    <div>
      <label htmlFor={`io-${f.k}`} style={lbl}>{f.label}{f.req && <Req/>}</label>
      <select id={`io-${f.k}`} value={value||''} onChange={e=>onChange(e.target.value)} aria-required={!!f.req}
        style={{ ...ctrl, cursor:'pointer', color: value ? 'var(--ink)' : 'var(--ink-3)' }}>
        <option value="" disabled>Select…</option>
        {f.options.map(o => <option key={o} value={o} style={{ color:'var(--ink)' }}>{o}</option>)}
      </select>
    </div>
  );
}

function MultiSelect({ f, value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const toggle = o => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  const summary = value.length ? (value.length <= 3 ? value.join(', ') : `${value.slice(0,3).join(', ')} +${value.length-3}`) : 'Select all that apply…';
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <label style={lbl}>{f.label}{f.req && <Req/>}</label>
      <button type="button" onClick={()=>setOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={open}
        style={{ ...ctrl, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, cursor:'pointer', textAlign:'left' }}>
        <span style={{ color: value.length ? 'var(--ink)' : 'var(--ink-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{summary}</span>
        <span aria-hidden="true" style={{ fontSize:10, color:'var(--ink-3)', flexShrink:0 }}>▼</span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" style={{ position:'absolute', zIndex:50, top:'calc(100% + 6px)', left:0, right:0, maxHeight:260, overflowY:'auto', background:'var(--surface)', border:`1px solid ${BORDER}`, borderRadius:'var(--r)', boxShadow:'var(--sh-2)', padding:'6px' }}>
          {f.options.map(o => {
            const on = value.includes(o);
            return (
              <button key={o} type="button" role="option" aria-selected={on} onClick={()=>toggle(o)}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left', padding:'9px 10px', border:'none', background: on ? 'var(--accent-weak)' : 'transparent', borderRadius:'var(--r-sm)', cursor:'pointer', fontFamily:F, fontSize:14, color:'var(--ink)' }}
                onMouseEnter={e=>{ if(!on) e.currentTarget.style.background='rgba(15,23,42,.04)'; }} onMouseLeave={e=>{ if(!on) e.currentTarget.style.background='transparent'; }}>
                <span aria-hidden="true" style={{ width:18, height:18, flexShrink:0, borderRadius:5, border:`1.5px solid ${on ? 'var(--accent)' : BORDER}`, background: on ? 'var(--accent)' : 'transparent', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{on ? '✓' : ''}</span>
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InvestorOnboarding({ user, onComplete, onExit }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const canContinue = (s.fields || []).filter(f => f.req).every(f => {
    const v = data[f.k];
    return f.type === 'multi' ? (Array.isArray(v) && v.length > 0) : (v && String(v).trim());
  });

  const next = async () => {
    if (!canContinue) return;
    if (!isLast) { setStep(step + 1); return; }
    setBusy(true);
    try { if (user) await saveInvestorProfile(user.id, data); } catch (e) { console.error('saveInvestorProfile failed', e); }
    setBusy(false);
    onComplete?.(data);
  };
  const back = () => (step === 0 ? onExit?.() : setStep(step - 1));

  const renderField = (f) => {
    if (f.type === 'select') return <SelectField f={f} value={data[f.k]} onChange={v=>set(f.k, v)}/>;
    if (f.type === 'multi')  return <MultiSelect f={f} value={data[f.k]} onChange={v=>set(f.k, v)}/>;
    return <TextField f={f} value={data[f.k]} onChange={v=>set(f.k, v)}/>;
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:F }}>
      <style>{`@media (max-width:640px){ .io-grid{grid-template-columns:1fr!important} }`}</style>

      <nav style={{ height:68, padding:'0 clamp(20px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, letterSpacing:'1.6px', textTransform:'uppercase', whiteSpace:'nowrap' }}>Startup Oracle</span>
        <button onClick={onExit} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--ink-2)', fontWeight:600, fontFamily:F }}>← Back</button>
      </nav>

      <main style={{ maxWidth:860, margin:'0 auto', padding:'clamp(20px,4vw,40px) clamp(16px,5vw,32px) 80px' }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:14 }}>
          Investor onboarding · Step {step + 1} of {STEPS.length}
        </div>
        <h1 style={{ fontFamily:FD, fontSize:'clamp(30px,5vw,44px)', fontWeight:800, letterSpacing:'var(--tracking-tight)', lineHeight:'var(--lh-tight)', margin:'0 0 8px' }}>{s.title}</h1>
        <p style={{ fontSize:'var(--t-base)', color:'var(--ink-2)', margin:'0 0 22px', lineHeight:'var(--lh)' }}>{s.sub}</p>

        <div role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} style={{ display:'flex', gap:8, marginBottom:30 }}>
          {STEPS.map((_, i) => <div key={i} style={{ flex:1, height:4, borderRadius:99, background: i <= step ? 'var(--ink)' : 'var(--line)' }}/>)}
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--r-lg)', boxShadow:'var(--sh-1)', padding:'clamp(22px,4vw,34px)' }}>
          <div className="io-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:'20px 16px' }}>
            {s.fields.map(f => <div key={f.k} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>{renderField(f)}</div>)}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:26 }}>
          <button onClick={back} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:'var(--ink-2)', fontFamily:F, padding:'10px 4px' }}>← Back</button>
          <button onClick={next} disabled={!canContinue || busy}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:'var(--r)', background:'var(--ink)', color:'#fff', border:'none', fontSize:'var(--t-sm)', fontWeight:700, cursor:'pointer', fontFamily:F, opacity:(canContinue && !busy) ? 1 : .45 }}>
            {busy ? 'Saving…' : isLast ? 'Create profile' : 'Continue'}<span aria-hidden="true">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
