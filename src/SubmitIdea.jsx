import { useState, useEffect, useRef } from "react";
import MasterReport from "./MasterReport";
import { generateMasterReport } from "./reportEngine";
import { saveIdea } from "./ideasDB";
import { createPost } from "./communityDB";
import { startReport, refundValidation } from "./billingDB";

const C = { black:'#0a0a0a', white:'#ffffff', surface:'#f5f5f5', border:'#e0e0e0', body:'#555555', muted:'#999999', light:'#f9f9f9' };
const F = "var(--font)";           // DM Sans — unified body/UI ramp
const FD = "var(--font-display)";  // Plus Jakarta Sans — headings/display
const BR = 4;
const CATS = ['FinTech','SaaS','ClimaTech','Health & Wellness','EdTech','E-commerce','Logistics','HR Tech','Developer Tools','Consumer','Web3','Other'];
const MSGS = [
  'Scanning market size and demand signals…',
  'Mapping the competitive landscape…',
  'Stress-testing unit economics and financials…',
  'Drafting your full business plan…',
  'Building brand strategy and visual identity…',
  'Assembling your marketing suite…',
  'Compiling the master validation report…',
];
const INIT = { name:'', oneliner:'', category:'', stage:'', problem:'', solution:'', market:'', edge:'' };

const inputBase = { display:'block', width:'100%', border:`1.5px solid ${C.border}`, borderRadius:BR, padding:'13px 16px', fontSize:15, color:C.black, fontFamily:F, background:C.white, transition:'border-color 0.15s', lineHeight:1.5, outline:'none', boxSizing:'border-box' };

const Label = ({ children, hint }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ fontSize:13, fontWeight:700, color:C.black, letterSpacing:'-0.1px' }}>{children}</div>
    {hint && <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{hint}</div>}
  </div>
);
const Field = ({ children }) => <div style={{ marginBottom:28 }}>{children}</div>;

const FInput = ({ value, onChange, placeholder, maxLength, label }) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} aria-label={label}
    style={inputBase} onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}/>
);
const FTextarea = ({ value, onChange, placeholder, rows=4, maxLength, label }) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} aria-label={label}
    style={{...inputBase, lineHeight:1.65, resize:'none'}}
    onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}/>
);
const FSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={open} aria-label="Category"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } else if (e.key === 'Escape') setOpen(false); }}
        style={{ ...inputBase, display:'flex', alignItems:'center', justifyContent:'space-between',
          cursor:'pointer', borderColor: open ? C.black : C.border, userSelect:'none' }}>
        <span style={{ color: value ? C.black : C.muted }}>{value || 'Select a category…'}</span>
        <span style={{ color: C.muted, fontSize:11, transition:'transform 0.2s', display:'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {open && (
        <div className="so-dropdown-list" role="listbox" style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:100,
          background:C.white, border:`1.5px solid ${C.border}`, borderRadius:BR,
          boxShadow:'0 8px 24px rgba(0,0,0,0.10)', overflowY:'auto', maxHeight:220 }}>
          <style>{`.so-dropdown-list:hover{ overflow-y: scroll !important; }`}</style>
          {CATS.map(c => (
            <div key={c} onClick={() => { onChange(c); setOpen(false); }} role="option" aria-selected={c === value} tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(c); setOpen(false); } }}
              style={{ padding:'11px 16px', fontSize:14, cursor:'pointer', fontFamily:F,
                color: c === value ? C.white : C.black,
                background: c === value ? C.black : C.white,
                transition:'background 0.1s' }}
              onMouseEnter={e => { if (c !== value) e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { if (c !== value) e.currentTarget.style.background = C.white; }}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const StageCard = ({ label, desc, selected, onSelect }) => (
  <div onClick={onSelect} role="button" tabIndex={0} aria-pressed={selected} aria-label={label}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    style={{ flex:1, border:`1.5px solid ${selected?C.black:C.border}`, borderRadius:BR, padding:'16px 18px', cursor:'pointer', background:selected?C.black:C.white, transition:'all 0.15s', userSelect:'none' }}>
    <div style={{ fontSize:13, fontWeight:700, color:selected?C.white:C.black, marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:12, color:selected?'rgba(255,255,255,0.55)':C.muted, lineHeight:1.4 }}>{desc}</div>
  </div>
);
const Btn = ({ children, onClick, disabled, secondary, style:s={} }) => (
  <button onClick={onClick} disabled={disabled}
    onMouseDown={e=>{ if(!disabled) e.currentTarget.style.transform='scale(.97)'; }}
    onMouseUp={e=>{ e.currentTarget.style.transform='scale(1)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}
    style={{ background:secondary?C.white:(disabled?C.border:C.black), color:secondary?C.black:(disabled?C.muted:C.white), border:secondary?`1.5px solid ${C.border}`:'none', borderRadius:BR, padding:'16px 28px', fontSize:16, fontWeight:700, cursor:disabled?'not-allowed':'pointer', fontFamily:F, transition:'background 0.15s, transform 0.1s ease', ...s }}>{children}</button>
);
const StepHeader = ({ label, title, subtitle }) => (
  <div style={{ marginBottom:44 }}>
    <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:12 }}>{label}</div>
    <h1 style={{ fontSize:36, fontWeight:800, color:C.black, letterSpacing:'-1.5px', marginBottom:10, lineHeight:1.1, fontFamily:FD }}>{title}</h1>
    <p style={{ fontSize:16, color:C.muted, lineHeight:1.6 }}>{subtitle}</p>
  </div>
);

const Step1 = ({ form, set, onNext }) => {
  // "Other" is the sentinel until the founder types a real value, so don't accept it as a complete category (RPT-012).
  const ok = form.name && form.oneliner && form.category && form.category !== 'Other' && form.stage;
  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      <StepHeader label="Step 1 of 3" title="Start with the basics" subtitle="Give us a quick overview. Plain English is perfect — no pitch deck needed."/>
      <Field><Label>Idea name</Label><FInput label="Idea name" value={form.name} onChange={set('name')} placeholder="e.g. FreelanceFlow" maxLength={80}/></Field>
      <Field><Label hint="One sentence — what does it do and who is it for?">Describe your idea</Label><FInput label="Describe your idea" value={form.oneliner} onChange={set('oneliner')} placeholder="e.g. An app that auto-generates invoices and files taxes for freelancers" maxLength={200}/></Field>
      <Field>
        <Label>Category</Label>
        <FSelect value={form.category==='Other'||!CATS.includes(form.category)&&form.category?'Other':form.category} onChange={v=>set('category')(v==='Other'?'Other':v)}/>
        {(form.category==='Other'||(!CATS.includes(form.category)&&form.category)) && (
          <input autoFocus value={form.category==='Other'?'':form.category} onChange={e=>set('category')(e.target.value)}
            placeholder="Type your category…" aria-label="Custom category" maxLength={40} style={{...inputBase,marginTop:10}}
            onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}/>
        )}
      </Field>
      <Field>
        <Label>Where are you right now?</Label>
        <div style={{ display:'flex', gap:10 }}>
          {[{id:'idea',label:'Just an idea',desc:'No code or product yet'},{id:'proto',label:'Building it',desc:'Prototype or MVP underway'},{id:'live',label:'Already live',desc:'Users or revenue exists'}]
            .map(s=><StageCard key={s.id} {...s} selected={form.stage===s.id} onSelect={()=>set('stage')(s.id)}/>)}
        </div>
      </Field>
      <Btn onClick={onNext} disabled={!ok} style={{ width:'100%', marginTop:8, padding:'17px 32px' }}>Continue →</Btn>
    </div>
  );
};

const Step2 = ({ form, set, onBack, onNext }) => {
  const ok = form.problem && form.solution && form.market;
  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      <StepHeader label="Step 2 of 3" title="Tell us more" subtitle="The more specific you are, the more precise your validation score will be."/>
      <Field><Label hint="What pain point does this address? Who feels it most acutely?">What problem does this solve?</Label><FTextarea label="What problem does this solve?" value={form.problem} onChange={set('problem')} placeholder="e.g. Freelancers spend 6+ hours a month manually managing invoices…" rows={4} maxLength={1200}/></Field>
      <Field><Label hint="How does your product actually work?">How does your solution work?</Label><FTextarea label="How does your solution work?" value={form.solution} onChange={set('solution')} placeholder="e.g. A single dashboard that connects to Razorpay and UPI…" rows={4} maxLength={1200}/></Field>
      <Field><Label>Who is your target customer?</Label><FInput label="Who is your target customer?" value={form.market} onChange={set('market')} placeholder="e.g. Independent designers and developers earning ₹15–40L/year" maxLength={300}/></Field>
      <Field>
        <Label hint="What do you know that others don't? What gives you an edge?">Your unique insight <span style={{ fontWeight:400, color:C.muted }}>(optional)</span></Label>
        <FTextarea label="Your unique insight (optional)" value={form.edge} onChange={set('edge')} placeholder="e.g. I freelanced for 5 years and built this for myself first…" rows={3} maxLength={800}/>
      </Field>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        <Btn onClick={onBack} secondary style={{ flexShrink:0 }}>← Back</Btn>
        <Btn onClick={onNext} disabled={!ok} style={{ flex:1 }}>Continue →</Btn>
      </div>
    </div>
  );
};

const ReviewRow = ({ label, value }) => value ? (
  <div style={{ paddingBottom:18, marginBottom:18, borderBottom:`1px solid ${C.border}` }}>
    <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:15, color:C.black, lineHeight:1.6 }}>{value}</div>
  </div>
) : null;

const Step3 = ({ form, onBack, onSubmit, submitting }) => {
  const [agreed, setAgreed] = useState(false);
  const stageLabel = { idea:'Just an idea', proto:'Building a prototype', live:'Already live' }[form.stage];
  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      <StepHeader label="Step 3 of 3" title="Review & submit" subtitle="Check your submission — you can go back and edit anything before we run the analysis."/>
      <div style={{ background:C.light, border:`1px solid ${C.border}`, borderRadius:BR+4, padding:'28px 32px', marginBottom:28 }}>
        <ReviewRow label="Idea name"       value={form.name}/>
        <ReviewRow label="One-liner"       value={form.oneliner}/>
        <ReviewRow label="Category"        value={form.category}/>
        <ReviewRow label="Stage"           value={stageLabel}/>
        <ReviewRow label="Problem"         value={form.problem}/>
        <ReviewRow label="Solution"        value={form.solution}/>
        <ReviewRow label="Target customer" value={form.market}/>
        <ReviewRow label="Unique insight"  value={form.edge}/>
      </div>
      <div onClick={()=>setAgreed(a=>!a)} role="checkbox" tabIndex={0} aria-checked={agreed}
        onKeyDown={e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setAgreed(a=>!a); } }}
        style={{ display:'flex', gap:14, alignItems:'flex-start', cursor:'pointer', marginBottom:28, userSelect:'none' }}>
        <div style={{ width:20, height:20, flexShrink:0, marginTop:2, border:`2px solid ${agreed?C.black:C.border}`, borderRadius:3, background:agreed?C.black:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
          {agreed && <span style={{ color:C.white, fontSize:11, fontWeight:900 }}>✓</span>}
        </div>
        <p style={{ fontSize:14, color:C.body, lineHeight:1.6 }}>I understand my idea will be analysed by AI and may be shown to the Startup Oracle community for feedback. I confirm I have the right to share this concept.</p>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={onBack} secondary style={{ flexShrink:0 }}>← Back</Btn>
        <Btn onClick={onSubmit} disabled={!agreed || submitting} style={{ flex:1 }}>{submitting ? 'Checking…' : 'Submit for Validation →'}</Btn>
      </div>
    </div>
  );
};

const Loading = ({ form, grant, onDone, onCancel }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [pct, setPct]       = useState(0);
  const [done, setDone]     = useState(0);   // real sections completed, 0–6 (RPT-011)
  const target = useRef(8);                  // pct creeps toward this; driven by real progress
  const ctrl = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    ctrl.current = controller;
    const mi = setInterval(()=>setMsgIdx(i=>(i+1)%MSGS.length), 3500);
    const pi = setInterval(()=>setPct(p=>p<target.current?p+1:p), 250);
    generateMasterReport(form, (d,total)=>{ if(!cancelled){ setDone(d); target.current = Math.max(target.current, Math.round((d/total)*96)); } }, { grant, signal: controller.signal })
      .then(data=>{ if(cancelled) return; clearInterval(pi); setPct(100); setTimeout(()=>{ if(!cancelled) onDone(data); }, 400); })
      .catch(err=>{ if(cancelled || err?.name==='AbortError') return; clearInterval(pi); setPct(100); setTimeout(()=>{ if(!cancelled) onDone({ error: err?.message || 'Unknown error' }); }, 400); });
    return ()=>{ cancelled = true; controller.abort(); clearInterval(mi); clearInterval(pi); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cancel = () => { try { ctrl.current?.abort(); } catch { /* ignore */ } onCancel?.(); };
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 68px)', padding:'64px 48px', textAlign:'center', animation:'fadeIn 0.4s ease', fontFamily:F }}>
      <div style={{ width:56, height:56, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.black}`, borderRadius:'50%', animation:'spin 0.75s linear infinite', marginBottom:44 }}/>
      <h2 style={{ fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:10, fontFamily:FD }}>Analysing your idea</h2>
      <p style={{ fontSize:16, color:C.muted, minHeight:26, marginBottom:52 }}>{MSGS[msgIdx]}</p>
      <div style={{ width:340, height:3, background:C.border, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', background:C.black, width:`${pct}%`, transition:'width 0.072s linear' }}/>
      </div>
      <div style={{ fontSize:13, color:C.muted, fontWeight:600 }}>{done} of 6 analyses complete</div>
      <div style={{ fontSize:12, color:C.muted, marginTop:10 }}>Deep analysis can take a minute or two on a slow connection.</div>
      <div style={{ marginTop:48, display:'flex', gap:32, fontSize:13, fontWeight:500 }}>
        {['Market analysis','Feasibility check','Community readiness'].map((l,i)=>{
          const complete = done >= (i+1)*2;   // tied to real sections, not a fake timer
          return (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:16, height:16, borderRadius:'50%', background:complete?C.black:C.border, transition:'background 0.3s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {complete && <span style={{ color:C.white, fontSize:9, fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ color:complete?C.black:C.muted, transition:'color 0.3s' }}>{l}</span>
            </div>
          );
        })}
      </div>
      <button onClick={cancel} style={{ marginTop:40, background:'none', border:'none', fontSize:13, color:C.muted, fontWeight:600, cursor:'pointer', fontFamily:F, textDecoration:'underline', textUnderlineOffset:3 }}>
        Cancel
      </button>
    </div>
  );
};

export default function SubmitIdea({ onHome, user, onAccount, onPricing, onSignIn }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(INIT);
  const [results, setResults] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [checking, setChecking] = useState(false);
  const [grant, setGrant]     = useState(null);       // report grant authorizing the /api/generate calls
  const [saveWarning, setSaveWarning] = useState(false);
  const consumed = useRef(false);   // a validation is currently spent for this attempt
  const succeeded = useRef(false);  // this attempt produced a usable report
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const go  = s => { setStep(s); window.scrollTo({top:0}); };

  // Resume after a refresh/background mid-generation: re-run with the SAME consumed
  // validation + grant instead of burning a new one and losing the work (RPT-004).
  useEffect(() => {
    let t;
    try {
      const raw = sessionStorage.getItem('so_pendingReport');
      if (raw) {
        const { form: f, grant: g } = JSON.parse(raw);
        if (f) {
          consumed.current = true; succeeded.current = false;
          t = setTimeout(() => { setForm(f); setGrant(g || null); setStep('loading'); }, 0);
        }
      }
    } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, []);

  // Refund only when a consumed validation is abandoned without a usable report.
  const abandon = (toStep) => {
    if (consumed.current && !succeeded.current) refundValidation();
    consumed.current = false;
    try { sessionStorage.removeItem('so_pendingReport'); } catch { /* ignore */ }
    setResults(null); setGrant(null); setSaveWarning(false);
    go(toStep);
  };

  // Quota gate: consume is now server-authoritative (/api/start-report) so it can't
  // be bypassed by hitting /api/generate directly (RPT-003). Fails open if billing isn't set up.
  const startValidation = async () => {
    if (!user) { setBlockReason('signin'); go('paywall'); return; }   // route anon users to sign-in (RPT-009)
    setChecking(true);
    const r = await startReport();
    setChecking(false);
    if (!r.allowed && r.reason !== 'billing_off') { setBlockReason(r.reason || 'need_sub'); go('paywall'); return; }
    setGrant(r.grant || null);
    consumed.current = true; succeeded.current = false; setSaveWarning(false);
    try { sessionStorage.setItem('so_pendingReport', JSON.stringify({ form, grant: r.grant || null })); } catch { /* ignore */ }
    go('loading');
  };

  const isForm = step===1||step===2||step===3;

  return (
    <div style={{ minHeight:'100vh', background:C.white, fontFamily:F }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        input::placeholder, textarea::placeholder { color:#aaaaaa; }
        button { font-family:var(--font); }
        textarea { resize:none; }
        * { box-sizing:border-box; }
      `}</style>

      {/* Nav — MasterReport brings its own chrome on the results step */}
      {isForm && (
        <div style={{ position:'sticky', top:0, zIndex:100, background:C.white, borderBottom:`1px solid ${C.border}`, height:68, padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span onClick={onHome} style={{ fontFamily:FD, fontWeight:800, fontSize:20, letterSpacing:'-0.5px', color:C.black, cursor:'pointer' }}>startup oracle</span>
          {isForm && (
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3].map(i=>(
                <div key={i} style={{ width:28, height:3, background:i<=step?C.black:C.border, transition:'background 0.35s ease' }}/>
              ))}
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {user && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div onClick={()=>onAccount?.()} title="My Account" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width:24, height:24, borderRadius:'50%' }}/>}
                  <span style={{ fontSize:13, color:C.black, fontWeight:600, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.user_metadata?.full_name || user.email}</span>
                </div>
              </div>
            )}
            <span onClick={onHome} style={{ fontSize:14, color:C.muted, fontWeight:500, cursor:'pointer' }}>← Home</span>
          </div>
        </div>
      )}

      {step==='loading' && <Loading form={form} grant={grant} onCancel={()=>abandon(3)} onDone={async data=>{
        // A validation is "spent" only when a scored report (sections + meta) is delivered.
        // Otherwise keep the consume so Retry reuses it; refund happens only on abandon (RPT-001/008).
        const ok = data?.sections && data?.meta;
        setResults(data); go('results');
        if (!ok) return;
        succeeded.current = true; consumed.current = false;
        try { sessionStorage.removeItem('so_pendingReport'); } catch { /* ignore */ }
        const res = await saveIdea(user?.id ?? null, { form, meta: data.meta, sections: data.sections });
        if (!res?.ok) setSaveWarning(true);   // never silently lose a paid-for report (RPT-005)
      }}/>}

      {step==='paywall' && (
        <div style={{ maxWidth:560, margin:'0 auto', padding:'120px 40px', textAlign:'center', animation:'fadeIn 0.4s ease' }}>
          <div style={{ fontSize:42, marginBottom:16 }}>🔒</div>
          <h2 style={{ fontFamily:FD, fontSize:28, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:12 }}>
            {blockReason==='signin' ? 'Sign in to validate'
              : blockReason==='month_limit' ? "You've used this month's validations"
              : "You've used your free validation"}
          </h2>
          <p style={{ fontSize:15, color:C.muted, lineHeight:1.7, marginBottom:28 }}>
            {blockReason==='signin'
              ? 'Create a free account or sign in to run your AI validation report and save it to your account.'
              : blockReason==='month_limit'
                ? 'Your subscription includes 2 validations per month — they reset at the start of next month.'
                : 'Your first validation was free. Subscribe to keep validating ideas and get the Verified Founder badge.'}
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            {blockReason==='signin'
              ? <Btn onClick={()=>onSignIn?.()}>Sign in →</Btn>
              : blockReason!=='month_limit' && <Btn onClick={onPricing}>View plans →</Btn>}
            <Btn onClick={()=>go(3)} secondary>← Back</Btn>
          </div>
        </div>
      )}

      {step==='results' && (
        (results?.sections && results?.meta)
          ? <>
              {saveWarning && (
                <div style={{ position:'fixed', top:12, left:'50%', transform:'translateX(-50%)', zIndex:1000, maxWidth:520, width:'calc(100% - 32px)', background:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:BR, padding:'10px 16px', fontSize:13, color:'#92400E', boxShadow:'0 6px 20px rgba(0,0,0,0.14)' }}>
                  We couldn't save this report to your account. It's shown below — use <strong>Download PDF</strong> to keep a copy.
                </div>
              )}
              <MasterReport
                data={results.sections}
                meta={results.meta}
                ideaName={form.name}
                onBack={()=>{ setForm(INIT); succeeded.current=false; consumed.current=false; setResults(null); setGrant(null); setSaveWarning(false); go(1); }}
                onShareCommunity={user ? async () => {
                  const body = [form.oneliner, form.problem && `Problem: ${form.problem}`, form.solution && `Solution: ${form.solution}`].filter(Boolean).join('\n\n');
                  await createPost(user.id, {
                    title: form.name || 'My Startup Idea',
                    body,
                    tags: form.category ? [form.category] : [],
                    media: [],
                    meta: results.meta ? { overallScore: results.meta.overallScore, badge: results.meta.badge, validated: true } : { validated: true },
                  });
                } : undefined}
              />
            </>
          : (
            <div style={{ maxWidth:560, margin:'0 auto', padding:'120px 40px', textAlign:'center' }}>
              <h2 style={{ fontFamily:FD, fontSize:28, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:12 }}>Analysis didn't complete</h2>
              <p style={{ fontSize:15, color:C.muted, lineHeight:1.6, marginBottom:28 }}>We couldn't finish your report. Your answers are kept, and you won't be charged again — retry on the same validation, or go back. (You'll only be refunded if you go back without a report.)</p>
              {results?.error && (
                <p style={{ fontSize:12, color:'#B91C1C', fontFamily:'monospace', background:C.light, border:`1px solid ${C.border}`, borderRadius:BR, padding:'12px 16px', marginBottom:28, wordBreak:'break-word', textAlign:'left' }}>{results.error}</p>
              )}
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <Btn onClick={()=>go('loading')}>Retry analysis</Btn>
                <Btn onClick={()=>abandon(3)} secondary>← Back to review</Btn>
              </div>
            </div>
          )
      )}

      {isForm && (
        <div style={{ maxWidth:660, margin:'0 auto', padding:'56px 40px 80px' }}>
          {step===1 && <Step1 form={form} set={set} onNext={()=>go(2)}/>}
          {step===2 && <Step2 form={form} set={set} onBack={()=>go(1)} onNext={()=>go(3)}/>}
          {step===3 && <Step3 form={form} onBack={()=>go(2)} onSubmit={startValidation} submitting={checking}/>}
        </div>
      )}
    </div>
  );
}
