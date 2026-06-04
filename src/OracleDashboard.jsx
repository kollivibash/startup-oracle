import { useState, useMemo } from "react";

const STATES = ["Andhra Pradesh","Telangana","Karnataka","Tamil Nadu","Maharashtra","Gujarat","Rajasthan","Uttar Pradesh","Delhi","West Bengal"];
const CITIES = { "Andhra Pradesh":["Vijayawada","Visakhapatnam","Guntur","Tirupati","Kurnool"], "Telangana":["Hyderabad","Warangal","Karimnagar"], "Karnataka":["Bengaluru","Mysuru","Hubli"], "Tamil Nadu":["Chennai","Coimbatore","Madurai"], "Maharashtra":["Mumbai","Pune","Nagpur"], "Gujarat":["Ahmedabad","Surat","Vadodara"], "Rajasthan":["Jaipur","Jodhpur","Udaipur"], "Uttar Pradesh":["Lucknow","Kanpur","Varanasi"], "Delhi":["New Delhi","Dwarka","Rohini"], "West Bengal":["Kolkata","Howrah","Durgapur"] };
const CATEGORIES = ["Pet Care Hub","Food & Beverage","Tech SaaS","Retail Store","Health & Wellness","EdTech","Logistics","Fashion"];
const BUDGETS = ["Micro (<₹5L)","Small (₹5–15L)","Medium (₹15–50L)","Large (₹50L+)"];
const RISKS_GREEN = ["Pet humanisation trend rising","No direct chain competitor","AP govt MSME support","High-income residential zones nearby"];
const RISKS_RED = ["High real-estate cost","Vet staff shortage in AP","Low pet-culture awareness in Tier-2","Cold-chain for pet food logistics"];
const ROAD = [["Wk 2","Market Research & Surveys"],["Wk 8","Lease Finalization & Legal"],["Wk 10","Vendor Procurement"],["Wk 12","Soft Launch & Marketing"]];

export default function OracleDashboard() {
  const [country] = useState("India");
  const [state, setState] = useState("Andhra Pradesh");
  const [city, setCity] = useState("Vijayawada");
  const [cat, setCat] = useState("Pet Care Hub");
  const [budgetIdx, setBudgetIdx] = useState(2);
  const [mix, setMix] = useState({ s:40, t:45, u:15 });
  const [capital, setCapital] = useState(30000);
  const [done, setDone] = useState([false,false,false,false]);

  const budgetMultiplier = [0.4,0.7,1,1.6][budgetIdx];
  const breakEven = Math.round(14 / budgetMultiplier);
  const ltv = capital < 26000 ? 12 : capital > 34000 ? 18 : 15;
  const progress = done.filter(Boolean).length;

  const Sel = ({val,opts,onChange,label}) => (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] tracking-widest uppercase text-stone-400">{label}</span>
      <select value={val} onChange={e=>onChange(e.target.value)}
        className="text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-stone-400 cursor-pointer">
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );

  const Chip = ({label,active,onClick}) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
        ${active?"bg-stone-900 text-white border-stone-900":"bg-white text-stone-500 border-stone-200 hover:border-stone-400"}`}>
      {label}
    </button>
  );

  const Card = ({children,className=""}) => (
    <div className={`bg-white border border-stone-200 rounded-2xl p-5 ${className}`}>{children}</div>
  );

  const Label = ({children}) => <p className="text-[9px] tracking-widest uppercase text-stone-400 mb-3">{children}</p>;

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans p-6" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');input[type=range]{accent-color:#1a1a1a}`}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-extrabold text-stone-900 tracking-tight">Startup Oracle</h1>
            <p className="text-xs text-stone-400 mt-0.5">Market Validation Dashboard · Live Analysis</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">● Live</span>
        </div>

        {/* Selectors Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-4 items-end">
          <Sel label="Country" val={country} opts={["India"]} onChange={()=>{}}/>
          <Sel label="State" val={state} opts={STATES} onChange={v=>{setState(v);setCity(CITIES[v]?.[0]||"");}}/>
          <Sel label="City / Town" val={city} opts={CITIES[state]||[city]} onChange={setCity}/>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <span className="text-[9px] tracking-widest uppercase text-stone-400">Business Category</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.slice(0,4).map(c=><Chip key={c} label={c} active={cat===c} onClick={()=>setCat(c)}/>)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] tracking-widest uppercase text-stone-400">Budget Scale</span>
            <div className="flex gap-1.5">
              {BUDGETS.map((b,i)=><Chip key={b} label={b} active={budgetIdx===i} onClick={()=>setBudgetIdx(i)}/>)}
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* Market Score — hero card */}
          <Card className="col-span-12 md:col-span-4 flex flex-col justify-between min-h-[180px]">
            <Label>Market Validation Score</Label>
            <div>
              <div className="flex items-end gap-2 mb-3">
                <span style={{fontFamily:"'Syne',sans-serif"}} className="text-6xl font-extrabold text-stone-900 leading-none">58.5</span>
                <span className="text-xl text-stone-400 mb-2">/100</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-stone-900 rounded-full transition-all" style={{width:"58.5%"}}/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Moderate Risk","Validated Demand","Growth Phase"].map(t=>(
                  <span key={t} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* TAM/SAM/CAGR metrics */}
          <div className="col-span-12 md:col-span-8 grid grid-cols-3 gap-4">
            {[
              {l:"India TAM by 2028",v:"$799M",sub:"Pet care market"},
              {l:"Urban AP SAM",v:"$12.5M",sub:"Serviceable market"},
              {l:"Market CAGR",v:"6.2%",sub:"Annual growth rate"},
            ].map(m=>(
              <Card key={m.l} className="flex flex-col justify-between">
                <Label>{m.l}</Label>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif"}} className="text-3xl font-extrabold text-stone-900 mb-1">{m.v}</div>
                  <div className="text-[10px] text-stone-400">{m.sub}</div>
                </div>
              </Card>
            ))}
            <Card className="col-span-3 flex items-center justify-between gap-4 py-3">
              <Label>Live Demand Signals</Label>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-sm">📊</div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">~48 active Reddit threads</p>
                    <p className="text-[10px] text-stone-400">r/pets, r/india, r/petcare</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-stone-100"/>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📈</div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">Google Trends: 75/100</p>
                    <p className="text-[10px] text-emerald-600 font-medium">↑ Rising interest</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-stone-100"/>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🎯</div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">Target: 12 Weeks</p>
                    <p className="text-[10px] text-stone-400">To operational launch</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Revenue Model */}
          <Card className="col-span-12 md:col-span-5">
            <Label>Interactive Revenue Model Split</Label>
            <div className="space-y-4">
              {[
                {k:"s",label:"Services",color:"bg-stone-900",sub:"Pet Grooming @ ₹1,200/session",pct:mix.s},
                {k:"t",label:"Transactional",color:"bg-stone-600",sub:"Premium Retail @ ₹2,500 avg basket",pct:mix.t},
                {k:"u",label:"Usage",color:"bg-stone-300",sub:"Boarding & Daycare @ ₹500/day",pct:mix.u},
              ].map(r=>(
                <div key={r.k}>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-xs font-semibold text-stone-800">{r.label}</span>
                      <span className="text-[10px] text-stone-400 ml-2">{r.sub}</span>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace"}} className="text-sm font-bold text-stone-900">{r.pct}%</span>
                  </div>
                  <input type="range" min={5} max={80} value={r.pct} className="w-full h-1.5 rounded-full cursor-pointer"
                    onChange={e=>{
                      const val=Number(e.target.value), diff=val-r.pct;
                      const other = r.k==="s"?["t","u"]:r.k==="t"?["s","u"]:["s","t"];
                      const total = mix[other[0]]+mix[other[1]];
                      if(total-diff<10) return;
                      const ratio = mix[other[0]]/total;
                      setMix(p=>({...p,[r.k]:val,[other[0]]:Math.max(5,Math.round((total-diff)*ratio)),[other[1]]:Math.max(5,Math.round((total-diff)*(1-ratio)))}));
                    }}/>
                </div>
              ))}
              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden mt-2 gap-0.5">
                <div className="bg-stone-900 transition-all" style={{width:`${mix.s}%`}}/>
                <div className="bg-stone-500 transition-all" style={{width:`${mix.t}%`}}/>
                <div className="bg-stone-300 transition-all" style={{width:`${mix.u}%`}}/>
              </div>
            </div>
          </Card>

          {/* Financial Calculator */}
          <Card className="col-span-12 md:col-span-4">
            <Label>Financial Calculator</Label>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-stone-600">Startup Capital</span>
                  <span style={{fontFamily:"'DM Mono',monospace"}} className="text-sm font-bold text-stone-900">${capital.toLocaleString()}</span>
                </div>
                <input type="range" min={25000} max={35000} step={500} value={capital} className="w-full cursor-pointer"
                  onChange={e=>setCapital(Number(e.target.value))}/>
                <div className="flex justify-between text-[9px] text-stone-300 mt-0.5"><span>$25K</span><span>$35K</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:"Break-Even",v:`${breakEven} mo`,note:"From launch"},
                  {l:"LTV : CAC",v:`${ltv}:1`,note:"Customer ratio"},
                  {l:"Target Capital",v:`$${(capital/1000).toFixed(1)}K`,note:"Est. requirement"},
                  {l:"Launch Week",v:"Wk 12",note:"Execution target"},
                ].map(m=>(
                  <div key={m.l} className="bg-stone-50 rounded-xl p-3">
                    <p className="text-[9px] tracking-wider uppercase text-stone-400 mb-1">{m.l}</p>
                    <p style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-extrabold text-stone-900 leading-none">{m.v}</p>
                    <p className="text-[9px] text-stone-400 mt-1">{m.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Risk Checklist */}
          <Card className="col-span-12 md:col-span-3">
            <Label>Strategic Risk Assessment</Label>
            <div className="space-y-1 mb-4">
              {RISKS_GREEN.map(r=>(
                <div key={r} className="flex items-start gap-2 py-1.5 border-b border-stone-50">
                  <span className="text-emerald-500 flex-shrink-0 mt-0.5 text-xs">✓</span>
                  <span className="text-xs text-stone-600">{r}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {RISKS_RED.map(r=>(
                <div key={r} className="flex items-start gap-2 py-1.5 border-b border-stone-50">
                  <span className="text-red-400 flex-shrink-0 mt-0.5 text-xs">✕</span>
                  <span className="text-xs text-stone-500">{r}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Roadmap */}
          <Card className="col-span-12 md:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <Label>Operational Roadmap</Label>
              <span className="text-[10px] text-stone-400">{progress}/4 complete</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 rounded-full mb-5">
              <div className="h-full bg-stone-900 rounded-full transition-all" style={{width:`${progress*25}%`}}/>
            </div>
            <div className="space-y-3">
              {ROAD.map(([wk,task],i)=>(
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={()=>setDone(d=>d.map((v,j)=>j===i?!v:v))}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all
                      ${done[i]?"bg-stone-900 border-stone-900":"border-stone-300 group-hover:border-stone-500"}`}>
                    {done[i]&&<svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>}
                  </div>
                  <div className={`transition-opacity ${done[i]?"opacity-40":""}`}>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{wk}</span>
                    <p className="text-xs font-medium text-stone-800">{task}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Chart placeholder — editorial */}
          <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4">
            <div className="bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden relative flex items-center justify-center" style={{minHeight:130}}>
              <div className="text-center">
                <div className="flex items-end gap-1 justify-center mb-2">
                  {[40,65,50,80,70,90,75,85].map((h,i)=>(
                    <div key={i} className="w-4 bg-stone-900 rounded-sm opacity-20 transition-all hover:opacity-60" style={{height:h*0.7}}/>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Revenue Trend Chart</p>
              </div>
            </div>
            <div className="bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden relative flex items-center justify-center" style={{minHeight:130}}>
              <div className="text-center px-4">
                <svg viewBox="0 0 200 80" className="w-full opacity-20 mb-1">
                  <polyline points="0,60 30,45 60,50 90,30 120,35 160,15 200,20" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="0,75 30,70 60,68 90,62 120,58 160,50 200,45" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                </svg>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Geo-Demand Heat Map</p>
              </div>
            </div>
          </div>

          {/* Bottom summary strip */}
          <Card className="col-span-12 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white text-sm">🐾</div>
              <div>
                <p style={{fontFamily:"'Syne',sans-serif"}} className="text-sm font-extrabold text-stone-900">{cat} · {city}, {state}</p>
                <p className="text-[10px] text-stone-400">Validation complete · Ready for execution</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-xs font-semibold px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:border-stone-400 transition-colors">Export PDF</button>
              <button className="text-xs font-semibold px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-700 transition-colors">Pitch to VCs →</button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
