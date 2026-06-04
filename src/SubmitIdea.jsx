import { useState, useEffect } from "react";

const C = { black:'#0a0a0a', white:'#ffffff', surface:'#f5f5f5', border:'#e0e0e0', body:'#555555', muted:'#999999', light:'#f9f9f9' };
const F = "'Plus Jakarta Sans', system-ui, sans-serif";
const BR = 4;
const CATS = ['FinTech','SaaS','ClimaTech','Health & Wellness','EdTech','E-commerce','Logistics','HR Tech','Developer Tools','Consumer','Web3','Other'];
const MSGS = ['Scanning market size and demand signals…','Analysing the competitive landscape…','Evaluating technical feasibility…','Assessing originality and timing…','Compiling your validation report…'];
const INIT = { name:'', oneliner:'', category:'', stage:'', problem:'', solution:'', market:'', edge:'' };

async function analyseIdea(form) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  const prompt = `You are an elite startup analyst. Analyse this startup idea and return ONLY valid JSON.

Idea: "${form.name}"
One-liner: "${form.oneliner}"
Category: ${form.category}
Stage: ${form.stage}
Problem: "${form.problem}"
Solution: "${form.solution}"
Target customer: "${form.market}"
Unique insight: "${form.edge||'Not provided'}"

Return this exact JSON (no markdown):
{
  "overallScore": <0-100 integer>,
  "badge": "<one of: Strong Potential | Promising | Needs Refinement | High Risk>",
  "marketScore": <0-100>,
  "feasibilityScore": <0-100>,
  "competitiveEdgeScore": <0-100>,
  "originalityScore": <0-100>,
  "summary": "<2-3 sentence AI analysis paragraph specific to this idea>",
  "strengths": ["<specific strength 1>","<specific strength 2>","<specific strength 3>"],
  "risks": ["<specific risk 1>","<specific risk 2>","<specific risk 3>"],
  "nextSteps": [
    {"title":"<action title>","desc":"<2 sentence specific action>"},
    {"title":"<action title>","desc":"<2 sentence specific action>"},
    {"title":"<action title>","desc":"<2 sentence specific action>"}
  ]
}
All content must be specific to "${form.name}" — zero generic startup advice.`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/json" },
    body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages:[{role:"user",content:prompt}], temperature:0.5, response_format:{type:"json_object"} }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  return JSON.parse((await r.json()).choices[0].message.content);
}

const inputBase = { display:'block', width:'100%', border:`1.5px solid ${C.border}`, borderRadius:BR, padding:'13px 16px', fontSize:15, color:C.black, fontFamily:F, background:C.white, transition:'border-color 0.15s', lineHeight:1.5, outline:'none', boxSizing:'border-box' };

const Label = ({ children, hint }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ fontSize:13, fontWeight:700, color:C.black, letterSpacing:'-0.1px' }}>{children}</div>
    {hint && <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{hint}</div>}
  </div>
);
const Field = ({ children }) => <div style={{ marginBottom:28 }}>{children}</div>;

const FInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={inputBase} onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}/>
);
const FTextarea = ({ value, onChange, placeholder, rows=4 }) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{...inputBase, lineHeight:1.65, resize:'none'}}
    onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}/>
);
const FSelect = ({ value, onChange }) => (
  <div style={{ position:'relative' }}>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{...inputBase, appearance:'none', color:value?C.black:C.muted, paddingRight:40}}
      onFocus={e=>e.target.style.borderColor=C.black} onBlur={e=>e.target.style.borderColor=C.border}>
      <option value="">Select a category…</option>
      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
    <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:C.muted, fontSize:12 }}>▼</div>
  </div>
);
const StageCard = ({ label, desc, selected, onSelect }) => (
  <div onClick={onSelect} style={{ flex:1, border:`1.5px solid ${selected?C.black:C.border}`, borderRadius:BR, padding:'16px 18px', cursor:'pointer', background:selected?C.black:C.white, transition:'all 0.15s', userSelect:'none' }}>
    <div style={{ fontSize:13, fontWeight:700, color:selected?C.white:C.black, marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:12, color:selected?'rgba(255,255,255,0.55)':C.muted, lineHeight:1.4 }}>{desc}</div>
  </div>
);
const Btn = ({ children, onClick, disabled, secondary, style:s={} }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:secondary?C.white:(disabled?C.border:C.black), color:secondary?C.black:(disabled?C.muted:C.white), border:secondary?`1.5px solid ${C.border}`:'none', borderRadius:BR, padding:'16px 28px', fontSize:16, fontWeight:700, cursor:disabled?'not-allowed':'pointer', fontFamily:F, transition:'background 0.15s', ...s }}>{children}</button>
);
const StepHeader = ({ label, title, subtitle }) => (
  <div style={{ marginBottom:44 }}>
    <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:12 }}>{label}</div>
    <h1 style={{ fontSize:36, fontWeight:800, color:C.black, letterSpacing:'-1.5px', marginBottom:10, lineHeight:1.1, fontFamily:F }}>{title}</h1>
    <p style={{ fontSize:16, color:C.muted, lineHeight:1.6 }}>{subtitle}</p>
  </div>
);

const ScoreRing = ({ score, size, label, delay=0 }) => {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now() + delay;
    const dur = 1100;
    const tick = now => {
      if (now < start) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min((now - start) / dur, 1);
      setCur(Math.round((1 - Math.pow(1-p, 3)) * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const r = (size-10)/2, circ = 2*Math.PI*r, filled = (cur/100)*circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e5e5" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.black} strokeWidth={7}
          strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="square"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fontSize={Math.round(size*0.23)} fontWeight="800" fill={C.black} fontFamily={F}>{cur}</text>
      </svg>
      {label && <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px', textAlign:'center', maxWidth:size }}>{label}</div>}
    </div>
  );
};

const Step1 = ({ form, set, onNext }) => {
  const ok = form.name && form.oneliner && form.category && form.stage;
  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      <StepHeader label="Step 1 of 3" title="Start with the basics" subtitle="Give us a quick overview. Plain English is perfect — no pitch deck needed."/>
      <Field><Label>Idea name</Label><FInput value={form.name} onChange={set('name')} placeholder="e.g. FreelanceFlow"/></Field>
      <Field><Label hint="One sentence — what does it do and who is it for?">Describe your idea</Label><FInput value={form.oneliner} onChange={set('oneliner')} placeholder="e.g. An app that auto-generates invoices and files taxes for freelancers"/></Field>
      <Field>
        <Label>Category</Label>
        <FSelect value={form.category==='Other'||!CATS.includes(form.category)&&form.category?'Other':form.category} onChange={v=>set('category')(v==='Other'?'Other':v)}/>
        {(form.category==='Other'||(!CATS.includes(form.category)&&form.category)) && (
          <input autoFocus value={form.category==='Other'?'':form.category} onChange={e=>set('category')(e.target.value)}
            placeholder="Type your category…" style={{...inputBase,marginTop:10}}
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
      <Field><Label hint="What pain point does this address? Who feels it most acutely?">What problem does this solve?</Label><FTextarea value={form.problem} onChange={set('problem')} placeholder="e.g. Freelancers spend 6+ hours a month manually managing invoices…" rows={4}/></Field>
      <Field><Label hint="How does your product actually work?">How does your solution work?</Label><FTextarea value={form.solution} onChange={set('solution')} placeholder="e.g. A single dashboard that connects to Stripe and PayPal…" rows={4}/></Field>
      <Field><Label>Who is your target customer?</Label><FInput value={form.market} onChange={set('market')} placeholder="e.g. Independent designers and developers earning $50k–$150k/year"/></Field>
      <Field>
        <Label hint="What do you know that others don't? What gives you an edge?">Your unique insight <span style={{ fontWeight:400, color:C.muted }}>(optional)</span></Label>
        <FTextarea value={form.edge} onChange={set('edge')} placeholder="e.g. I freelanced for 5 years and built this for myself first…" rows={3}/>
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

const Step3 = ({ form, onBack, onSubmit }) => {
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
      <div onClick={()=>setAgreed(a=>!a)} style={{ display:'flex', gap:14, alignItems:'flex-start', cursor:'pointer', marginBottom:28, userSelect:'none' }}>
        <div style={{ width:20, height:20, flexShrink:0, marginTop:2, border:`2px solid ${agreed?C.black:C.border}`, borderRadius:3, background:agreed?C.black:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
          {agreed && <span style={{ color:C.white, fontSize:11, fontWeight:900 }}>✓</span>}
        </div>
        <p style={{ fontSize:14, color:C.body, lineHeight:1.6 }}>I understand my idea will be analysed by AI and may be shown to the Startup Oracle community for feedback. I confirm I have the right to share this concept.</p>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={onBack} secondary style={{ flexShrink:0 }}>← Back</Btn>
        <Btn onClick={onSubmit} disabled={!agreed} style={{ flex:1 }}>Submit for Validation →</Btn>
      </div>
    </div>
  );
};

const Loading = ({ form, onDone }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [pct, setPct]       = useState(0);
  useEffect(() => {
    const mi = setInterval(()=>setMsgIdx(i=>Math.min(i+1,MSGS.length-1)), 900);
    const pi = setInterval(()=>setPct(p=>p<90?p+1:p), 80); // stops at 90 until API returns
    analyseIdea(form)
      .then(data=>{ clearInterval(pi); setPct(100); setTimeout(()=>onDone(data), 400); })
      .catch(()=>{ clearInterval(pi); setPct(100); setTimeout(()=>onDone(null), 400); });
    return ()=>{ clearInterval(mi); clearInterval(pi); };
  }, []);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 68px)', padding:'64px 48px', textAlign:'center', animation:'fadeIn 0.4s ease', fontFamily:F }}>
      <div style={{ width:56, height:56, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.black}`, borderRadius:'50%', animation:'spin 0.75s linear infinite', marginBottom:44 }}/>
      <h2 style={{ fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:10, fontFamily:F }}>Analysing your idea</h2>
      <p style={{ fontSize:16, color:C.muted, minHeight:26, marginBottom:52 }}>{MSGS[msgIdx]}</p>
      <div style={{ width:340, height:3, background:C.border, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', background:C.black, width:`${pct}%`, transition:'width 0.072s linear' }}/>
      </div>
      <div style={{ fontSize:13, color:C.muted, fontWeight:600 }}>{pct}%</div>
      <div style={{ marginTop:56, display:'flex', gap:32, fontSize:13, fontWeight:500 }}>
        {['Market analysis','Feasibility check','Community readiness'].map((l,i)=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:16, height:16, borderRadius:'50%', background:pct>(i+1)*28?C.black:C.border, transition:'background 0.3s', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {pct>(i+1)*28 && <span style={{ color:C.white, fontSize:9, fontWeight:900 }}>✓</span>}
            </div>
            <span style={{ color:pct>(i+1)*28?C.black:C.muted, transition:'color 0.3s' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Results = ({ ideaName, data, onReset }) => {
  const strengths = data?.strengths || ['Large addressable market with fragmented tooling','Clear and specific pain point','Strong recurring revenue potential'];
  const risks     = data?.risks     || ['Trust barrier with new users','Established incumbents in adjacent space','High early-stage support costs'];
  const nextSteps = (data?.nextSteps||[{title:'Validate the pain',desc:'Interview 20 potential customers this week.'},{title:'Build a landing page',desc:'Test demand before writing code.'},{title:'Define your wedge',desc:'Pick one feature and nail it first.'}]).map((s,i)=>({...s,n:String(i+1).padStart(2,'0')}));
  const overall   = data?.overallScore ?? 78;
  const badge     = data?.badge ?? 'Strong Potential';
  return (
    <div style={{ animation:'fadeUp 0.5s ease', fontFamily:F }}>
      <div style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:44, marginBottom:56, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:14 }}>Validation Report</div>
          <h1 style={{ fontSize:38, fontWeight:800, color:C.black, letterSpacing:'-1.5px', marginBottom:8 }}>{ideaName||'Your Startup Idea'}</h1>
          <p style={{ fontSize:15, color:C.muted }}>AI analysis ready · {new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:BR, padding:'8px 16px', fontSize:14, fontWeight:700, color:C.black, whiteSpace:'nowrap' }}>{badge}</div>
      </div>

      <div style={{ display:'flex', gap:0, marginBottom:64, paddingBottom:64, borderBottom:`1px solid ${C.border}`, alignItems:'center' }}>
        <div style={{ flex:'0 0 260px', display:'flex', flexDirection:'column', alignItems:'center', borderRight:`1px solid ${C.border}`, paddingRight:56, gap:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase' }}>Overall Score</div>
          <ScoreRing score={overall} size={136} delay={0}/>
          <div style={{ fontSize:13, color:C.muted }}>out of 100</div>
        </div>
        <div style={{ flex:1, paddingLeft:56, display:'grid', gridTemplateColumns:'1fr 1fr', gap:36 }}>
          <ScoreRing score={data?.marketScore??84}         size={90} label="Market Opportunity" delay={200}/>
          <ScoreRing score={data?.feasibilityScore??72}    size={90} label="Feasibility"        delay={380}/>
          <ScoreRing score={data?.competitiveEdgeScore??65} size={90} label="Competitive Edge"   delay={560}/>
          <ScoreRing score={data?.originalityScore??88}    size={90} label="Originality"        delay={740}/>
        </div>
      </div>

      <div style={{ marginBottom:64, paddingBottom:64, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>AI Analysis</div>
        <p style={{ fontSize:17, color:C.black, lineHeight:1.8, maxWidth:700 }}>{data?.summary || 'AI analysis based on your submission. The scores and insights above reflect the specific details you provided.'}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, marginBottom:64, paddingBottom:64, borderBottom:`1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:28 }}>Strengths</div>
          {strengths.map((s,i)=>(
            <div key={i} style={{ display:'flex', gap:14, marginBottom:20 }}>
              <div style={{ width:22, height:22, flexShrink:0, marginTop:1, borderRadius:'50%', background:C.black, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:C.white, fontSize:10, fontWeight:900 }}>✓</span>
              </div>
              <p style={{ fontSize:15, color:C.black, lineHeight:1.6 }}>{s}</p>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:28 }}>Risks to Watch</div>
          {risks.map((r,i)=>(
            <div key={i} style={{ display:'flex', gap:14, marginBottom:20 }}>
              <div style={{ width:22, height:22, flexShrink:0, marginTop:1, borderRadius:'50%', background:C.surface, border:`1.5px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:C.muted, fontSize:11, fontWeight:700 }}>!</span>
              </div>
              <p style={{ fontSize:15, color:C.body, lineHeight:1.6 }}>{r}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:64, paddingBottom:64, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:36 }}>Recommended Next Steps</div>
        <div style={{ display:'flex', gap:32 }}>
          {nextSteps.map(s=>(
            <div key={s.n} style={{ flex:1, borderTop:`3px solid ${C.black}`, paddingTop:22 }}>
              <div style={{ fontSize:12, fontWeight:800, color:C.muted, marginBottom:14, letterSpacing:'1px' }}>{s.n}</div>
              <h3 style={{ fontSize:18, fontWeight:700, color:C.black, marginBottom:10, lineHeight:1.25 }}>{s.title}</h3>
              <p style={{ fontSize:14, color:C.body, lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:BR+4, padding:'36px 40px', marginBottom:36, display:'flex', justifyContent:'space-between', alignItems:'center', gap:32 }}>
        <div>
          <h3 style={{ fontSize:20, fontWeight:800, color:C.black, marginBottom:8, letterSpacing:'-0.5px' }}>Get community feedback</h3>
          <p style={{ fontSize:15, color:C.muted, lineHeight:1.6, maxWidth:480 }}>Publish your idea to the Startup Oracle community. Real founders will vote, comment, and help you sharpen it.</p>
        </div>
        <button style={{ flexShrink:0, background:C.black, color:C.white, border:'none', borderRadius:BR, padding:'15px 28px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>Share with Community →</button>
      </div>

      <div style={{ display:'flex', gap:10, paddingBottom:80 }}>
        <button style={{ flex:1, background:C.white, color:C.black, border:`1.5px solid ${C.border}`, borderRadius:BR, padding:'15px 24px', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:F }}>Download Report</button>
        <button onClick={onReset} style={{ flex:'0 0 auto', background:C.white, color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:BR, padding:'15px 24px', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:F }}>Submit another idea</button>
      </div>
    </div>
  );
};

export default function SubmitIdea({ onHome }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(INIT);
  const [results, setResults] = useState(null);
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const go  = s => { setStep(s); window.scrollTo({top:0}); };

  const isForm = step===1||step===2||step===3;

  return (
    <div style={{ minHeight:'100vh', background:C.white, fontFamily:F }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        input::placeholder, textarea::placeholder { color:#aaaaaa; }
        button { font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
        textarea { resize:none; }
        * { box-sizing:border-box; }
      `}</style>

      {/* Nav */}
      {step !== 'loading' && (
        <div style={{ position:'sticky', top:0, zIndex:100, background:C.white, borderBottom:`1px solid ${C.border}`, height:68, padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span onClick={onHome} style={{ fontWeight:800, fontSize:20, letterSpacing:'-0.5px', color:C.black, cursor:'pointer' }}>startup oracle</span>
          {isForm && (
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3].map(i=>(
                <div key={i} style={{ width:28, height:3, background:i<=step?C.black:C.border, transition:'background 0.35s ease' }}/>
              ))}
            </div>
          )}
          <span onClick={onHome} style={{ fontSize:14, color:C.muted, fontWeight:500, cursor:'pointer' }}>← Home</span>
        </div>
      )}

      {step==='loading' && <Loading form={form} onDone={data=>{ setResults(data); go('results'); }}/>}

      {step==='results' && (
        <div style={{ maxWidth:800, margin:'0 auto', padding:'56px 40px 0' }}>
          <Results ideaName={form.name} data={results} onReset={()=>{ setForm(INIT); setResults(null); go(1); }}/>
        </div>
      )}

      {isForm && (
        <div style={{ maxWidth:660, margin:'0 auto', padding:'56px 40px 80px' }}>
          {step===1 && <Step1 form={form} set={set} onNext={()=>go(2)}/>}
          {step===2 && <Step2 form={form} set={set} onBack={()=>go(1)} onNext={()=>go(3)}/>}
          {step===3 && <Step3 form={form} onBack={()=>go(2)} onSubmit={()=>go('loading')}/>}
        </div>
      )}
    </div>
  );
}
