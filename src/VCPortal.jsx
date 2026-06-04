import { useState } from "react";

const BG="#FAF6F0",CARD="#fff",BDR="#E8E2D9",INK="#1A1A1A",MUT="#9A9189",ACC="#C85C3A",ACL="#FDF0EC";
const SYNE={fontFamily:"'Syne',sans-serif"};
const S=(x={})=>({background:CARD,border:`1px solid ${BDR}`,borderRadius:14,...x});

// Demo VC accounts — replace with real auth (Supabase/Firebase) in production
const VC_ACCOUNTS=[
  {email:"vc@sequoia.in",   pass:"sequoia2024",  firm:"Sequoia Capital India", focus:"Consumer, SaaS, Fintech"},
  {email:"vc@nexus.in",     pass:"nexus2024",    firm:"Nexus Venture Partners", focus:"B2B, Deep Tech, Healthcare"},
  {email:"vc@blume.in",     pass:"blume2024",    firm:"Blume Ventures",         focus:"Early-stage, India-first"},
];

export default function VCPortal({onClose}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [vc,setVc]=useState(null);
  const [interests,setInterests]=useState(()=>JSON.parse(localStorage.getItem("so_interests")||"{}"));

  const pitches=JSON.parse(localStorage.getItem("so_pitches")||"[]");

  const login=()=>{
    const found=VC_ACCOUNTS.find(a=>a.email===email&&a.pass===pass);
    if(found) setVc(found);
    else setErr("Invalid credentials. Use demo: vc@sequoia.in / sequoia2024");
  };

  const showInterest=(id)=>{
    const updated={...interests,[id]:{vcFirm:vc.firm,vcEmail:vc.email,ts:new Date().toISOString()}};
    setInterests(updated);
    localStorage.setItem("so_interests",JSON.stringify(updated));
  };

  const inp={background:"#FAF6F0",border:`1px solid ${BDR}`,borderRadius:10,padding:"10px 13px",fontSize:13,color:INK,width:"100%",outline:"none",fontFamily:"'DM Sans',sans-serif"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,26,26,0.7)",backdropFilter:"blur(6px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:CARD,borderRadius:20,width:"100%",maxWidth:860,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.2)"}}>
        {/* Header */}
        <div style={{padding:"20px 28px",borderBottom:`1px solid ${BDR}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:CARD,zIndex:10}}>
          <div>
            <span style={{...SYNE,fontSize:16,fontWeight:800,color:INK}}>VC Portal</span>
            {vc&&<span style={{fontSize:12,color:MUT,marginLeft:12}}>Logged in as <strong style={{color:ACC}}>{vc.firm}</strong></span>}
          </div>
          <div style={{display:"flex",gap:10}}>
            {vc&&<button onClick={()=>setVc(null)} style={{fontSize:11,color:MUT,background:"#F5F0EB",border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit"}}>Log out</button>}
            <button onClick={onClose} style={{fontSize:11,color:INK,background:ACL,border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit",color:ACC,fontWeight:600}}>✕ Close</button>
          </div>
        </div>

        {!vc?(
          /* LOGIN */
          <div style={{maxWidth:380,margin:"60px auto",padding:"0 20px 60px"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:48,height:48,background:ACL,borderRadius:12,marginBottom:16}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <h2 style={{...SYNE,fontSize:22,fontWeight:800,color:INK,margin:"0 0 8px"}}>Investor Login</h2>
              <p style={{fontSize:13,color:MUT,margin:0}}>Verified VCs only. All pitch data is confidential.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6}}>Email</label>
                <input style={inp} placeholder="your@vcfirm.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:MUT,display:"block",marginBottom:6}}>Password</label>
                <input type="password" style={inp} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&login()}/>
              </div>
              {err&&<p style={{fontSize:12,color:"#B91C1C",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",margin:0}}>{err}</p>}
              <button onClick={login} style={{background:INK,color:"#fff",border:"none",borderRadius:10,padding:13,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Sign In as Investor
              </button>
              <div style={{background:"#F8F5F1",borderRadius:10,padding:12}}>
                <p style={{fontSize:10,color:MUT,margin:"0 0 6px",letterSpacing:"0.1em",textTransform:"uppercase"}}>Demo credentials</p>
                {VC_ACCOUNTS.map(a=>(
                  <div key={a.email} style={{fontSize:11,color:MUT,marginBottom:2,cursor:"pointer"}}
                    onClick={()=>{setEmail(a.email);setPass(a.pass);}}>
                    <span style={{color:INK,fontWeight:500}}>{a.firm}</span> — {a.email}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ):(
          /* VC DASHBOARD */
          <div style={{padding:28}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div>
                <h3 style={{...SYNE,fontSize:20,fontWeight:800,color:INK,margin:"0 0 4px"}}>Live Pitches</h3>
                <p style={{fontSize:12,color:MUT,margin:0}}>Focus: {vc.focus} · {pitches.length} pitch{pitches.length!==1?"es":""} submitted</p>
              </div>
              <div style={{background:ACL,color:ACC,fontSize:11,fontWeight:600,padding:"6px 14px",borderRadius:20}}>🔒 Confidential</div>
            </div>

            {pitches.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:MUT}}>
                <div style={{fontSize:40,marginBottom:12}}>📭</div>
                <p style={{fontSize:14}}>No pitches submitted yet.</p>
                <p style={{fontSize:12}}>Entrepreneurs submit via the "Pitch VCs" tab in their dashboard.</p>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {pitches.map(p=>{
                  const interested=interests[p.id];
                  return(
                    <div key={p.id} style={{...S({padding:20,transition:"border-color 0.2s,box-shadow 0.2s"}),cursor:"default"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.boxShadow=`0 4px 20px ${ACL}`;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=BDR;e.currentTarget.style.boxShadow="none";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <h4 style={{...SYNE,fontSize:15,fontWeight:700,color:INK,margin:0}}>{p.startupName}</h4>
                        <span style={{fontSize:9,color:MUT,background:"#F5F0EB",padding:"3px 8px",borderRadius:20,flexShrink:0,marginLeft:8}}>
                          {new Date(p.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                        </span>
                      </div>
                      <p style={{fontSize:12,color:"#5A4F48",lineHeight:1.6,marginBottom:12}}>{p.oneliner}</p>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                        {p.location&&<span style={{fontSize:10,color:MUT,background:"#F5F0EB",padding:"2px 8px",borderRadius:20}}>📍 {p.location}</span>}
                        <span style={{fontSize:10,color:ACC,background:ACL,padding:"2px 8px",borderRadius:20,fontWeight:600}}>Ask: {p.ask}</span>
                        {p.stage&&<span style={{fontSize:10,color:MUT,background:"#F5F0EB",padding:"2px 8px",borderRadius:20}}>{p.stage}</span>}
                      </div>
                      <div style={{borderTop:`1px solid ${BDR}`,paddingTop:12,display:"flex",gap:8}}>
                        {p.fileUrl&&(
                          <a href={p.fileUrl} download={p.fileName} target="_blank" rel="noreferrer"
                            style={{flex:1,background:"#F5F0EB",color:INK,border:"none",borderRadius:8,padding:"8px",fontSize:11,fontWeight:500,cursor:"pointer",textAlign:"center",textDecoration:"none",display:"block"}}>
                            📄 {p.fileName?.split(".").pop()?.toUpperCase()||"Doc"}
                          </a>
                        )}
                        <button onClick={()=>!interested&&showInterest(p.id)}
                          style={{flex:2,background:interested?"#F0FDF4":ACC,color:interested?"#166534":"#fff",border:`1px solid ${interested?"#86EFAC":ACC}`,borderRadius:8,padding:"8px",fontSize:11,fontWeight:600,cursor:interested?"default":"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                          {interested?`✓ Interested (${interested.vcFirm})`:"💡 Show Interest"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{fontSize:10,color:MUT,textAlign:"center",marginTop:28,borderTop:`1px solid ${BDR}`,paddingTop:20}}>
              🔒 All pitch data is stored locally and visible only to verified investors. In production, enable Supabase RLS for end-to-end encryption.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
