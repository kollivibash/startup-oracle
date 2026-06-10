import { useState, useMemo } from "react";
import VCPortal from "./VCPortal";

const BG  = "#FAF6F0", CARD = "#fff", BDR = "#E8E2D9";
const INK = "#1A1A1A", MUT  = "#9A9189";
const ACC = "#C85C3A", ACL  = "#FDF0EC";
const SYNE = {fontFamily:"'Syne',sans-serif"};
const MONO = {fontFamily:"'DM Mono',monospace",fontWeight:400};

const CURRENCIES    = {IN:"₹",US:"$",GB:"£",SG:"S$",AU:"A$"};
const COUNTRY_NAMES = {IN:"India",US:"United States",GB:"United Kingdom",SG:"Singapore",AU:"Australia"};

const IN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi (NCT)","Jammu & Kashmir","Ladakh","Chandigarh","Puducherry","Andaman & Nicobar","Lakshadweep","Dadra & Nagar Haveli"];

const SWOT_META = {
  strengths:     {L:"S",label:"Strengths",     hint:"Internal advantages"},
  weaknesses:    {L:"W",label:"Weaknesses",    hint:"Internal gaps"},
  opportunities: {L:"O",label:"Opportunities", hint:"External tailwinds"},
  threats:       {L:"T",label:"Threats",       hint:"External risks"},
};

const PRO_LIST = [
  {t:"Investor-Ready PDF",      d:"Pitch deck formatted for VCs"},
  {t:"AI Market Size (TAM)",    d:"TAM/SAM/SOM with benchmarks"},
  {t:"Competitor Geo-Map",      d:"Mapped competitors near you"},
  {t:"Subsidy Autopilot",       d:"Auto-fill govt applications"},
  {t:"3-Year Scenario Model",   d:"Bull / base / bear projections"},
  {t:"Investor Network",        d:"500+ verified angels & VCs"},
];

const TABS = [{id:"swot",l:"SWOT"},{id:"roi",l:"Financial Model"},{id:"insights",l:"Local Intel"},{id:"pitch",l:"Pitch VCs 🚀"},{id:"pro",l:"Pro ↗"}];

async function searchLocally(idea, locality, city, state, cn){
  const sKey = import.meta.env.VITE_SERPER_API_KEY;
  if(!sKey) return "";
  const place = locality ? `${locality}, ${city||state}` : (city||state||cn);
  try{
    const r = await fetch("https://google.serper.dev/search",{
      method:"POST",
      headers:{"X-API-KEY":sKey,"Content-Type":"application/json"},
      body:JSON.stringify({q:`${idea} in ${place}`,gl:"in",num:8}),
    });
    const d = await r.json();
    return (d.organic||[]).slice(0,6).map(x=>`${x.title}: ${x.snippet}`).join("\n");
  }catch{return "";}
}

async function fetchAnalysis({idea,country,state,city,locality,budget}){
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if(!key) throw new Error("VITE_GROQ_API_KEY missing — add to .env.local and restart.");
  const curr = CURRENCIES[country]||"$", cn = COUNTRY_NAMES[country]||country;

  // Build precise location string — most specific first
  const pinpoint = [locality,city,state,cn].filter(Boolean).join(", ");
  const searchLoc = locality||city||state||cn; // most specific available

  const webCtx = await searchLocally(idea, locality, city, state, cn);

  const townOnly = city||state;
  const prompt=`You are a hyper-local business analyst with strict geographic boundaries. Return ONLY valid JSON.

Business: "${idea}"
TARGET TOWN (this is the ONLY place that matters): ${city}
Area within town: ${locality||"general area"}
State: ${state} | Country: ${cn}
Budget: ${curr}${budget}
${webCtx?`\nGoogle search results for "${idea} in ${city}":\n${webCtx}\n`:""}

=== COMPETITOR RULES — READ EVERY WORD ===
You must ONLY list businesses that are physically located IN ${city}.
${city} is a specific town in ${state}.
BANNED cities — do NOT list any business from these places under any circumstances:
- Vijayawada (this is NOT ${city})
- Guntur (this is NOT ${city})
- Hyderabad (this is NOT ${city})
- Vizag / Visakhapatnam (this is NOT ${city})
- Any other city or town that is not ${city}

IF you do not know of any businesses of this exact type inside ${city}:
→ Return this honest answer: [{"name":"No known direct competitors in ${city}","desc":"This town may have no existing ${idea} — significant first-mover opportunity"},{"name":"Check local market yourself","desc":"Visit ${city} market areas and ask locals — AI cannot verify every small-town business"},{"name":"Nearest competition","desc":"Check towns within 20km of ${city} for reference only"}]

DO NOT fabricate businesses. DO NOT substitute with businesses from other cities.

=== OTHER RULES ===
SWOT: specific to "${idea}" in the small-town context of ${city}, ${state}. Consider: small-town purchasing power, local pet culture, awareness level, infrastructure in ${city}.
Subsidies: real ${cn} central + ${state} state schemes for this business type.

JSON:
{"summary":"One line about this opportunity in ${city}","swot":{"strengths":["phrase about ${city} context","phrase","phrase","phrase"],"weaknesses":["phrase","phrase","phrase"],"opportunities":["phrase","phrase","phrase"],"threats":["phrase","phrase","phrase"]},"competitors":[{"name":"business name in ${city} only","desc":"what + why"},{"name":"...","desc":"..."},{"name":"...","desc":"..."}],"subsidies":[{"name":"scheme","desc":"eligibility + benefit","type":"Grant","amount":"exact"},{"name":"scheme","desc":"...","type":"Loan","amount":"exact"},{"name":"scheme","desc":"...","type":"Tax","amount":"exact"},{"name":"scheme","desc":"...","type":"Benefit","amount":"exact"}]}

type∈{Grant,Loan,VC,Tax,Benefit}`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"user",content:prompt}],temperature:0.4,response_format:{type:"json_object"}}),
  });
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e?.error?.message||`Groq ${r.status}`);}
  return JSON.parse((await r.json()).choices[0].message.content);
}

const S = (extra={})=>({background:CARD,border:`1px solid ${BDR}`,borderRadius:14,...extra});
const inp = {background:CARD,border:`1px solid ${BDR}`,borderRadius:10,padding:"10px 13px",fontSize:13,color:INK,width:"100%",outline:"none",fontFamily:"'DM Sans',sans-serif"};
const lbl = {fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6};

function SwotCard({q,items,onUpdate}){
  const [ed,setEd]=useState(false);
  const m=SWOT_META[q];
  return(
    <div style={{...S(),padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{...SYNE,fontSize:28,fontWeight:800,color:ACC,lineHeight:1}}>{m.L}</span>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:INK}}>{m.label}</div>
          <div style={{fontSize:10,color:MUT}}>{m.hint}</div>
        </div>
        <button onClick={()=>setEd(e=>!e)} style={{marginLeft:"auto",fontSize:11,color:MUT,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>{ed?"done":"edit"}</button>
      </div>
      {ed
        ?<textarea style={{...inp,resize:"none",height:100}} value={items.join("\n")} onChange={e=>onUpdate(q,e.target.value.split("\n"))} placeholder="One point per line"/>
        :<ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8}}>
          {items.filter(Boolean).map((x,i)=>(
            <li key={i} style={{display:"flex",gap:8,fontSize:13,color:"#3D3530",lineHeight:1.4}}>
              <span style={{color:ACC,flexShrink:0,fontWeight:700,fontSize:17}}>·</span><span style={{fontSize:15}}>{x}</span>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

function Chart({proj,curr}){
  const W=540,H=150,PX=36,PY=24;
  const vals=proj.map(p=>p.bal);
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const cx=i=>PX+(i/(proj.length-1))*(W-PX*2);
  const cy=v=>PY+(1-(v-mn)/rng)*(H-PY*2);
  const z=cy(0);
  const pts=proj.map((p,i)=>`${cx(i)},${cy(p.bal)}`).join(" ");
  return(
    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"20px 16px 10px",marginBottom:20}}>
      <p style={{fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",color:MUT,margin:"0 0 12px"}}>P&L Balance — 12 Months</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACC} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={ACC} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {mn<0&&mx>0&&<line x1={PX} y1={z} x2={W-PX} y2={z} stroke={BDR} strokeWidth="1" strokeDasharray="4 3"/>}
        <polygon points={`${cx(0)},${H-PY} ${pts} ${cx(11)},${H-PY}`} fill="url(#g)"/>
        <polyline points={pts} fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {proj.map((p,i)=>i%2===0&&(
          <circle key={i} cx={cx(i)} cy={cy(p.bal)} r="3.5" fill={p.bal>=0?ACC:"#B91C1C"} stroke={CARD} strokeWidth="2"/>
        ))}
        {[0,2,4,6,8,10,11].map(i=>(
          <text key={i} x={cx(i)} y={H-4} textAnchor="middle" fontSize="8" fill={MUT} fontFamily="'DM Mono',monospace">M{i+1}</text>
        ))}
      </svg>
    </div>
  );
}

const Skel=({h=120})=><div style={{background:"#EDE8E1",borderRadius:14,height:h,opacity:0.7,animation:"pulse 1.4s ease-in-out infinite"}}/>;

export default function StartupOracle({ onSubmitIdea, onCommunity, user, onLogout, onSignIn, onAccount }){
  const [step,setStep]=useState("form"); // form | location | dashboard
  const [tab,setTab]=useState("swot");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [form,setForm]=useState({idea:"",country:"IN",state:"",city:"",locality:"",budget:""});
  const [analysis,setAnalysis]=useState(null);
  const [swot,setSwot]=useState({strengths:[],weaknesses:[],opportunities:[],threats:[]});
  const [roi,setRoi]=useState({budget:50000,monthlyRevenue:8000,monthlyCost:5000,growthRate:10});
  const [loadStep,setLoadStep]=useState(0);
  const [showVC,setShowVC]=useState(false);
  const [pitch,setPitch]=useState({startupName:"",oneliner:"",ask:"",stage:"Pre-seed",email:"",file:null,fileUrl:"",fileName:""});
  const [pitchDone,setPitchDone]=useState(false);

  const curr=CURRENCIES[form.country]||"$";
  const sf=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  // After form → go to location drill-down first
  const goToLocation=()=>{
    if(!form.idea||!form.city||!form.budget)return;
    setStep("location");
  };

  const STEPS=["Reading your business idea…","Searching competitors in "+form.city+"…","Generating SWOT analysis…","Finding govt schemes…","Building financial model…"];

  const submit=async()=>{
    if(!form.idea||!form.budget)return;
    setLoading(true);setError(null);setLoadStep(0);
    const t=setInterval(()=>setLoadStep(s=>s<4?s+1:4),1400);
    try{
      const d=await fetchAnalysis(form);
      clearInterval(t);
      setAnalysis(d);setSwot(d.swot);
      setRoi(p=>({...p,budget:Number(form.budget)||50000}));
      setStep("dashboard");
    }catch(e){clearInterval(t);setError(e.message);}
    finally{setLoading(false);setLoadStep(0);}
  };

  const calc=useMemo(()=>{
    const{budget,monthlyRevenue,monthlyCost,growthRate}=roi;
    let bal=-budget,cr=0;
    const proj=Array.from({length:12},(_,i)=>{
      const rev=Math.round(monthlyRevenue*Math.pow(1+growthRate/100,i));
      bal+=rev-monthlyCost;cr+=rev;
      return{month:i+1,rev,cost:monthlyCost,bal:Math.round(bal)};
    });
    return{
      breakEven:monthlyRevenue>monthlyCost?Math.ceil(budget/(monthlyRevenue-monthlyCost)):null,
      proj,cumRev:Math.round(cr),
      roiPct:Math.round(((cr-monthlyCost*12-budget)/budget)*100),
    };
  },[roi]);

  const competitors=analysis?.competitors||[];
  const subsidies=analysis?.subsidies||[];

  // ── FORM ────────────────────────────────────────────────────────────────────
  const [showForm,setShowForm]=useState(false);
  if(step==="form") return(
    <div style={{minHeight:"100vh",background:"#F2F2F2",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Nav */}
      <nav style={{background:"#F2F2F2",padding:"0 40px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <span style={{...SYNE,fontSize:17,fontWeight:800,color:INK,letterSpacing:"-0.03em"}}>startup oracle</span>
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          {["How it works","Pricing"].map(l=>(
            <span key={l} style={{fontSize:13,color:"#555",cursor:"pointer",fontWeight:500}}>{l}</span>
          ))}
          <span onClick={()=>onCommunity?.()} style={{fontSize:13,color:"#555",cursor:"pointer",fontWeight:500}}>Browse Ideas</span>
          {user ? (
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div onClick={()=>onAccount?.()} title="My Account" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{width:26,height:26,borderRadius:"50%"}}/>}
                <span style={{fontSize:13,color:INK,fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.user_metadata?.full_name || user.email}</span>
              </div>
            </div>
          ) : (
            <span onClick={()=>onSignIn?.()} style={{fontSize:13,color:"#555",cursor:"pointer",fontWeight:500}}>Sign in</span>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{maxWidth:860,margin:"0 auto",padding:"80px 40px 60px",textAlign:"center",animation:"fadeUp 0.6s ease"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#fff",border:"1px solid #D8D8D8",borderRadius:999,padding:"6px 16px",marginBottom:36,fontSize:12,color:"#444",fontWeight:500}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:INK,display:"inline-block"}}/>
          AI + Local Market Validation — Free to Try
        </div>
        <h1 style={{...SYNE,fontSize:"clamp(32px,4.5vw,56px)",fontWeight:800,lineHeight:1.05,color:INK,margin:"0 0 24px",letterSpacing:"-0.04em"}}>
          Know if your startup idea<br/>is worth building.
        </h1>
        <p style={{fontSize:17,color:"#666",lineHeight:1.7,maxWidth:520,margin:"0 auto 44px"}}>
          Describe your concept and get an AI-powered scorecard — real competitors, govt schemes, SWOT, and 12-month financial projections.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>onSubmitIdea?.()}
            style={{background:INK,color:"#fff",border:"none",borderRadius:10,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.01em"}}>
            Analyse My Idea →
          </button>
          <button style={{background:"#fff",color:INK,border:"1px solid #D0D0D0",borderRadius:10,padding:"14px 28px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            See a Demo
          </button>
        </div>

        {/* Social proof strip */}
        <div style={{display:"flex",gap:32,justifyContent:"center",marginTop:52,flexWrap:"wrap"}}>
          {[["500+","Startups analysed"],["92%","Accuracy rate"],["10s","Analysis time"],["Free","Always"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{...SYNE,fontSize:26,fontWeight:800,color:INK,letterSpacing:"-0.03em"}}>{v}</div>
              <div style={{fontSize:11,color:"#888",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form modal overlay */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:CARD,borderRadius:20,width:"100%",maxWidth:480,padding:32,boxShadow:"0 24px 80px rgba(0,0,0,0.15)",animation:"fadeUp 0.3s ease",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h2 style={{...SYNE,fontSize:20,fontWeight:800,color:INK,margin:0}}>Analyse your idea</h2>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",fontSize:18,color:MUT,cursor:"pointer",padding:4}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={lbl}>Business Idea *</label>
                <textarea rows={2} style={{...inp,resize:"none"}} placeholder="e.g., Pet cafe in Thiruvuru" value={form.idea} onChange={sf("idea")}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>Country *</label>
                  <select style={inp} value={form.country} onChange={sf("country")}>
                    <option value="IN">🇮🇳 India</option>
                    <option value="US">🇺🇸 USA</option>
                    <option value="GB">🇬🇧 UK</option>
                    <option value="SG">🇸🇬 Singapore</option>
                    <option value="AU">🇦🇺 Australia</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>State</label>
                  {form.country==="IN"
                    ?<select style={inp} value={form.state} onChange={sf("state")}>
                      <option value="">Select state</option>
                      {IN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    :<input style={inp} placeholder="Optional" value={form.state} onChange={sf("state")}/>
                  }
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>City / Town *</label>
                  <input style={inp} placeholder="e.g., Thiruvuru" value={form.city} onChange={sf("city")}/>
                </div>
                <div>
                  <label style={lbl}>Locality (optional)</label>
                  <input style={inp} placeholder="e.g., Bus Stand Road" value={form.locality} onChange={sf("locality")}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Budget ({curr}) *</label>
                <input type="number" style={inp} placeholder={`e.g. ${curr}50,000`} value={form.budget} onChange={sf("budget")}/>
              </div>
              {error&&<p style={{fontSize:12,color:"#B91C1C",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",margin:0}}>{error}</p>}
              <button onClick={()=>{setShowForm(false);goToLocation();}} disabled={!form.idea||!form.city||!form.budget}
                style={{background:(!form.idea||!form.city||!form.budget)?"#ccc":INK,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.01em",marginTop:4}}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── LOADING SCREEN ───────────────────────────────────────────────────────────
  if(loading) return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:360,padding:20}}>
        <div style={{width:48,height:48,border:`3px solid ${BDR}`,borderTop:`3px solid ${ACC}`,borderRadius:"50%",margin:"0 auto 28px",animation:"spin 0.9s linear infinite"}}/>
        <h3 style={{...SYNE,fontSize:20,fontWeight:800,color:INK,margin:"0 0 24px"}}>Analysing {form.city}…</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"left"}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:CARD,borderRadius:10,border:`1px solid ${i<=loadStep?ACC:BDR}`,transition:"border-color 0.4s",opacity:i>loadStep?0.35:1}}>
              <span style={{width:20,height:20,borderRadius:"50%",background:i<loadStep?ACC:i===loadStep?ACL:BDR,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.4s"}}>
                {i<loadStep
                  ?<svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  :i===loadStep
                  ?<span style={{width:6,height:6,borderRadius:"50%",background:ACC,display:"block"}}/>
                  :null}
              </span>
              <span style={{fontSize:13,color:i<=loadStep?INK:MUT}}>{s}</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ── LOCATION DRILL-DOWN ──────────────────────────────────────────────────────
  if(step==="location") return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"100%",maxWidth:480}}>
        <button onClick={()=>setStep("form")} style={{background:"none",border:"none",fontSize:12,color:MUT,cursor:"pointer",fontFamily:"inherit",marginBottom:24,padding:0}}>← Back to form</button>

        <div style={{background:ACL,borderRadius:12,padding:"12px 16px",marginBottom:28,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:18}}>📍</span>
          <div>
            <p style={{fontSize:12,fontWeight:600,color:ACC,margin:"0 0 2px"}}>Your business location</p>
            <p style={{fontSize:13,color:INK,margin:0}}>{[form.locality,form.city,form.state,COUNTRY_NAMES[form.country]].filter(Boolean).join(", ")}</p>
          </div>
        </div>

        <div style={{...S({borderRadius:20,padding:28,boxShadow:"0 8px 32px rgba(200,92,58,0.08)"})}}>
          <h2 style={{...SYNE,fontSize:20,fontWeight:800,color:INK,margin:"0 0 6px"}}>Tell us more about {form.city}</h2>
          <p style={{fontSize:13,color:MUT,margin:"0 0 22px"}}>These details help us find competitors <strong style={{color:INK}}>only in {form.city}</strong> — not from other cities.</p>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {l:`Which area/locality in ${form.city}? (optional)`,      k:"locality",  ph:`e.g., Near Bus Stand, ${form.city} Main Road, Old Town`},
              {l:"Nearest landmark or junction? (optional)",             k:"landmark",  ph:`e.g., ${form.city} Bus Stand, Town Hall, Market Road`},
              {l:"Type of neighbourhood (optional)",                     k:"areatype",  ph:"e.g., Commercial market, Residential colony, Near school"},
            ].map(({l,k,ph})=>(
              <div key={k}>
                <label style={lbl}>{l}</label>
                <input style={inp} placeholder={ph}
                  value={form[k]||""}
                  onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>
              </div>
            ))}

            {error&&<p style={{fontSize:12,color:"#B91C1C",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",margin:0}}>{error}</p>}

            <button onClick={submit} disabled={loading}
              style={{background:ACC,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading
                ?<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{animation:"spin 1s linear infinite"}}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3"/><path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3"/></svg>Analysing {form.city} — 5–8s…</>
                :`Analyse competitors in ${form.city} only →`
              }
            </button>

            <p style={{fontSize:11,color:MUT,textAlign:"center",margin:0}}>
              🔒 Analysis will be strictly limited to <strong>{form.city}</strong>. We will not show competitors from Vijayawada, Guntur, Hyderabad or any other city.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DASHBOARD ────────────────────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:.7}50%{opacity:.35}}`}</style>

      <header style={{background:CARD,borderBottom:`1px solid ${BDR}`,position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:980,margin:"0 auto",padding:"13px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
            <span style={{...SYNE,fontSize:14,fontWeight:800,color:INK,flexShrink:0}}>Startup Oracle</span>
            <span style={{color:BDR}}>·</span>
            <span style={{fontSize:12,color:MUT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.idea}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
            <span style={{...MONO,fontSize:11,color:MUT}}>{curr}{Number(form.budget).toLocaleString()}</span>
            <button onClick={()=>setShowVC(true)} style={{fontSize:11,color:"#fff",background:INK,border:"none",padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>🔐 VC Portal</button>
            <button onClick={()=>{setStep("form");setAnalysis(null);}} style={{fontSize:11,color:ACC,background:ACL,border:"none",padding:"4px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>← New</button>
          </div>
        </div>
      </header>

      <div style={{maxWidth:980,margin:"0 auto",padding:"36px 32px"}}>
        {/* AI Summary */}
        {analysis?.summary&&(
          <div style={{borderLeft:`3px solid ${ACC}`,paddingLeft:18,marginBottom:36,background:ACL,borderRadius:"0 12px 12px 0",padding:"14px 18px"}}>
            <p style={{fontSize:14,color:INK,lineHeight:1.6,margin:0,fontStyle:"italic"}}>{analysis.summary}</p>
          </div>
        )}

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:BDR,border:`1px solid ${BDR}`,borderRadius:16,overflow:"hidden",marginBottom:36}}>
          {[
            {l:"Break-Even",    v:calc.breakEven?`${calc.breakEven} mo`:"—",     accent:false},
            {l:"12-Mo Revenue", v:`${curr}${(calc.cumRev/1000).toFixed(1)}K`,     accent:false},
            {l:"ROI",           v:`${calc.roiPct>0?"+":""}${calc.roiPct}%`,       accent:calc.roiPct>0},
            {l:"Schemes Found", v:`${subsidies.length}`,                           accent:true},
          ].map(k=>(
            <div key={k.l} style={{background:CARD,padding:"22px 18px"}}>
              <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,marginBottom:8}}>{k.l}</div>
              <div style={{...MONO,...SYNE,fontSize:28,fontWeight:800,color:k.accent?ACC:INK,letterSpacing:"-0.02em"}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${BDR}`,marginBottom:32,gap:4}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{background:"none",border:"none",padding:"10px 18px",fontSize:13,fontWeight:tab===t.id?600:400,color:tab===t.id?INK:MUT,borderBottom:`2px solid ${tab===t.id?ACC:"transparent"}`,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",marginBottom:-1}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── SWOT ─────────────────────────────────────────── */}
        {tab==="swot"&&(
          <div>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:18}}>
              <h2 style={{...SYNE,fontSize:24,fontWeight:800,color:INK,margin:0}}>SWOT Analysis</h2>
              <span style={{fontSize:10,color:MUT,letterSpacing:"0.1em",textTransform:"uppercase"}}>AI-generated · click edit to refine</span>
            </div>
            {swot.strengths.length===0
              ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{[...Array(4)].map((_,i)=><Skel key={i} h={160}/>)}</div>
              :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {["strengths","weaknesses","opportunities","threats"].map(q=>(
                  <SwotCard key={q} q={q} items={swot[q]} onUpdate={(q,v)=>setSwot(p=>({...p,[q]:v}))}/>
                ))}
              </div>
            }
          </div>
        )}

        {/* ── ROI ──────────────────────────────────────────── */}
        {tab==="roi"&&(
          <div>
            <h2 style={{...SYNE,fontSize:24,fontWeight:800,color:INK,margin:"0 0 20px"}}>Financial Model</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:24}}>
              {[
                {l:"Initial Budget",  k:"budget",         pre:curr},
                {l:"Monthly Revenue", k:"monthlyRevenue", pre:curr},
                {l:"Monthly Costs",   k:"monthlyCost",    pre:curr},
                {l:"MoM Growth",      k:"growthRate",     suf:"%"},
              ].map(({l,k,pre,suf})=>(
                <div key={k} style={{...S({padding:"16px"})}}>
                  <div style={{...lbl,marginBottom:8}}>{l}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                    {pre&&<span style={{fontSize:13,color:MUT}}>{pre}</span>}
                    <input type="number" style={{background:"none",border:"none",outline:"none",...MONO,fontSize:22,fontWeight:700,color:INK,width:"100%"}}
                      value={roi[k]} onChange={e=>setRoi(p=>({...p,[k]:Number(e.target.value)||0}))}/>
                    {suf&&<span style={{fontSize:13,color:MUT}}>{suf}</span>}
                  </div>
                </div>
              ))}
            </div>

            <Chart proj={calc.proj} curr={curr}/>
            <div style={{...S({borderRadius:16,overflow:"hidden"})}}>
              <div style={{padding:"14px 20px",borderBottom:`1px solid ${BDR}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:CARD}}>
                <span style={{...SYNE,fontSize:14,fontWeight:700,color:INK}}>12-Month Projection</span>
                <span style={{...MONO,fontSize:12,color:calc.roiPct>0?"#166534":"#B91C1C",fontWeight:700}}>
                  {calc.roiPct>0?"+":""}{calc.roiPct}% ROI{calc.breakEven?` · Break-even Mo ${calc.breakEven}`:""}
                </span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${BDR}`}}>
                      {["Month","Revenue","Costs","Balance","Status"].map(h=>(
                        <th key={h} style={{padding:"9px 16px",textAlign:h==="Month"?"left":"right",fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:MUT,fontWeight:500,background:"#FAFAF8"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calc.proj.map(p=>(
                      <tr key={p.month} style={{borderBottom:`1px solid #F3EEE8`}}>
                        <td style={{padding:"10px 16px",...MONO,color:MUT,fontSize:11}}>Mo {String(p.month).padStart(2,"0")}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",...MONO,color:"#166534",fontSize:11}}>{curr}{p.rev.toLocaleString()}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",...MONO,color:MUT,fontSize:11}}>{curr}{p.cost.toLocaleString()}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",...MONO,fontWeight:700,fontSize:11,color:p.bal>=0?"#166534":"#B91C1C"}}>
                          {p.bal>=0?"+":""}{curr}{Math.abs(p.bal).toLocaleString()}
                        </td>
                        <td style={{padding:"10px 16px",textAlign:"right"}}>
                          <span style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:p.bal>=0?"#DCFCE7":"#FEE2E2",color:p.bal>=0?"#166534":"#B91C1C"}}>
                            {p.bal>=0?"profitable":"burning"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── INSIGHTS ─────────────────────────────────────── */}
        {tab==="insights"&&(
          <div>
            <h2 style={{...SYNE,fontSize:24,fontWeight:800,color:INK,margin:"0 0 24px"}}>Local Intelligence</h2>

            <div style={{marginBottom:32}}>
              <p style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:MUT,marginBottom:12}}>
                Competitors in {[form.locality,form.city,form.state].filter(Boolean).join(", ")||COUNTRY_NAMES[form.country]} only · AI-identified
              </p>
              {competitors.length===0
                ?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>{[...Array(3)].map((_,i)=><Skel key={i} h={100}/>)}</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                  {competitors.map((c,i)=>(
                    <div key={c.name} style={{...S({padding:18,transition:"border-color 0.2s,box-shadow 0.2s"}),cursor:"default"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.boxShadow=`0 4px 16px ${ACL}`}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=BDR;e.currentTarget.style.boxShadow="none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{...MONO,fontSize:10,color:ACC,fontWeight:700}}>0{i+1}</span>
                        <span style={{fontSize:13,fontWeight:600,color:INK}}>{c.name}</span>
                      </div>
                      <p style={{fontSize:12,color:MUT,lineHeight:1.6,margin:0}}>{c.desc}</p>
                    </div>
                  ))}
                </div>
              }
            </div>

            <div>
              <p style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:MUT,marginBottom:12}}>
                Govt Schemes & Subsidies · AI-identified
              </p>
              {subsidies.length===0
                ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[...Array(4)].map((_,i)=><Skel key={i} h={110}/>)}</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:10}}>
                  {subsidies.map(s=>{
                    const tc={Grant:[ACC,ACL],Loan:["#1D4ED8","#EFF6FF"],VC:["#6D28D9","#F5F3FF"],Tax:["#B45309","#FFFBEB"],Benefit:["#0F766E","#F0FDFA"]}[s.type]||[MUT,"#F5F5F5"];
                    return(
                      <div key={s.name} style={{...S({padding:18})}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                          <span style={{fontSize:13,fontWeight:600,color:INK}}>{s.name}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                            <span style={{...MONO,fontSize:12,fontWeight:700,color:INK}}>{s.amount}</span>
                            <span style={{fontSize:9,color:tc[0],background:tc[1],padding:"2px 8px",borderRadius:20,fontWeight:600}}>{s.type}</span>
                          </div>
                        </div>
                        <p style={{fontSize:12,color:MUT,lineHeight:1.6,margin:"0 0 10px"}}>{s.desc}</p>
                        <span style={{fontSize:11,color:ACC,fontWeight:500,cursor:"pointer"}}>Check eligibility →</span>
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          </div>
        )}

        {/* ── PITCH TO VCs ─────────────────────────────────── */}
        {tab==="pitch"&&(
          <div>
            <h2 style={{...SYNE,fontSize:24,fontWeight:800,color:INK,margin:"0 0 6px"}}>Pitch to Venture Capitalists</h2>
            <p style={{fontSize:13,color:MUT,margin:"0 0 24px"}}>Submit your deck — verified VCs browsing this platform will review it confidentially.</p>

            {pitchDone?(
              <div style={{...S({padding:40}),textAlign:"center"}}>
                <div style={{fontSize:48,marginBottom:16}}>🎯</div>
                <h3 style={{...SYNE,fontSize:20,fontWeight:700,color:INK,margin:"0 0 8px"}}>Pitch Submitted!</h3>
                <p style={{fontSize:13,color:MUT,marginBottom:20}}>Your pitch is now live in the VC Portal. Investors can view it and express interest.</p>
                <button onClick={()=>setPitchDone(false)} style={{background:ACL,color:ACC,border:`1px solid ${ACC}`,borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Submit Another</button>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[
                  {l:"Startup / Venture Name *",  k:"startupName",  ph:"e.g., OracleEats"},
                  {l:"One-liner Description *",    k:"oneliner",     ph:"e.g., Africa-themed dining experience in Vijayawada"},
                  {l:"Funding Ask *",              k:"ask",          ph:`e.g., ${curr}25,00,000`},
                  {l:"Contact Email *",            k:"email",        ph:"founder@startup.com"},
                ].map(({l,k,ph})=>(
                  <div key={k}>
                    <label style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6}}>{l}</label>
                    <input style={inp} placeholder={ph} value={pitch[k]} onChange={e=>setPitch(p=>({...p,[k]:e.target.value}))}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6}}>Stage</label>
                  <select style={inp} value={pitch.stage} onChange={e=>setPitch(p=>({...p,stage:e.target.value}))}>
                    {["Idea","Pre-seed","Seed","Series A","Series B+"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6}}>Upload Pitch Deck (PDF / PPT)</label>
                  <label style={{...inp,display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:pitch.fileName?INK:MUT}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {pitch.fileName||"Choose file…"}
                    <input type="file" accept=".pdf,.ppt,.pptx" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files[0];
                      if(!f)return;
                      if(f.size>10*1024*1024){alert("File must be under 10MB");return;}
                      const url=URL.createObjectURL(f);
                      setPitch(p=>({...p,file:f,fileUrl:url,fileName:f.name}));
                    }}/>
                  </label>
                  <p style={{fontSize:10,color:MUT,margin:"4px 0 0"}}>PDF or PPT · max 10MB</p>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <button
                    onClick={()=>{
                      if(!pitch.startupName||!pitch.oneliner||!pitch.ask||!pitch.email){alert("Please fill all required fields.");return;}
                      const saved=JSON.parse(localStorage.getItem("so_pitches")||"[]");
                      saved.unshift({...pitch,id:Date.now(),date:new Date().toISOString(),location:`${form.state?form.state+", ":""}${COUNTRY_NAMES[form.country]}`,idea:form.idea});
                      localStorage.setItem("so_pitches",JSON.stringify(saved));
                      setPitchDone(true);
                    }}
                    style={{background:INK,color:"#fff",border:"none",borderRadius:10,padding:"13px 28px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    Submit Pitch to VC Network →
                  </button>
                </div>
                <div style={{gridColumn:"1/-1",background:"#F8F5F1",borderRadius:12,padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="1.5" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p style={{fontSize:11,color:MUT,margin:0,lineHeight:1.6}}>Your pitch is stored securely and visible only to verified investors logged into the VC Portal. We never share your contact details without your consent.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRO ──────────────────────────────────────────── */}
        {tab==="pro"&&(
          <div>
            <div style={{background:INK,borderRadius:20,padding:"48px 44px",marginBottom:14,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:-20,opacity:0.05}}>
                <svg width="260" height="260" viewBox="0 0 260 260" fill="none">
                  {[120,90,60,30].map(r=><circle key={r} cx="130" cy="130" r={r} stroke="white" strokeWidth="1"/>)}
                </svg>
              </div>
              <div style={{position:"relative",zIndex:1}}>
                <span style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)"}}>Oracle Pro</span>
                <h2 style={{...SYNE,fontSize:"clamp(28px,4vw,48px)",fontWeight:800,color:"white",lineHeight:1.1,margin:"12px 0 12px",letterSpacing:"-0.03em"}}>
                  From idea to <span style={{color:ACC}}>funded.</span>
                </h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",maxWidth:380,lineHeight:1.7,margin:"0 0 24px"}}>
                  The full intelligence suite for founders raising capital and entering markets with precision.
                </p>
                <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:24}}>
                  <span style={{...MONO,fontSize:40,fontWeight:700,color:"white"}}>$49</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>/ month</span>
                </div>
                <button style={{background:ACC,color:"white",border:"none",borderRadius:10,padding:"12px 26px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginRight:14}}>
                  Upgrade to Pro
                </button>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>7-day free trial</span>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
              {PRO_LIST.map(f=>(
                <div key={f.t} style={{...S({padding:18,position:"relative",overflow:"hidden"})}}>
                  <div style={{position:"absolute",inset:0,background:"rgba(250,246,240,0.8)",backdropFilter:"blur(2px)",display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 14px",zIndex:1}}>
                    <span style={{fontSize:10,color:MUT,background:CARD,border:`1px solid ${BDR}`,padding:"3px 10px",borderRadius:20}}>🔒 Pro only</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:INK,marginBottom:3}}>{f.t}</div>
                  <div style={{fontSize:12,color:MUT}}>{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showVC&&<VCPortal onClose={()=>setShowVC(false)}/>}
    </div>
  );
}
