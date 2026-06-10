import { useState, useMemo, useEffect, useCallback } from "react";

const F="'Plus Jakarta Sans',system-ui,sans-serif";
const BR=4;
const C={black:'#0a0a0a',white:'#ffffff',surface:'#f6f6f6',card:'#ffffff',border:'#e0e0e0',body:'#555555',muted:'#999999',light:'#f2f2f2'};

const SEED=[
  {id:1,title:"AI invoice & tax assistant for freelancers",oneliner:"One dashboard that handles invoices, expense tracking, and quarterly taxes for independent workers.",problem:"Freelancers waste 6+ hours monthly managing finances across multiple tools.",solution:"Connect Stripe/PayPal, auto-generate invoices, categorise expenses, estimate quarterly taxes.",category:"FinTech",author:"Alex M.",location:"Berlin",timeAgo:"2h ago",aiScore:82,upvotes:234,rating:4.3,ratingCount:41,stage:"Just an idea",comments:[{id:1,author:"Sarah K.",time:"1h ago",text:"Exactly what I need as a freelance designer. QuickBooks is overkill."},{id:2,author:"Dev R.",time:"45m ago",text:"Have you considered Indian GST integration? Huge market there."}]},
  {id:2,title:"Carbon footprint tracker for e-commerce checkouts",oneliner:"Shows shoppers their order's CO₂ impact at checkout with one-click offset options.",problem:"Consumers want to shop sustainably but have no visibility into the environmental cost of purchases.",solution:"A checkout widget that calculates shipping carbon, shows an impact label, and lets users offset with one click.",category:"ClimaTech",author:"Priya V.",location:"London",timeAgo:"5h ago",aiScore:74,upvotes:189,rating:4.1,ratingCount:29,stage:"Building it",comments:[{id:1,author:"Tom A.",time:"3h ago",text:"Major brands like ASOS would pay for this integration instantly."}]},
  {id:3,title:"On-demand mental health coaching for startup founders",oneliner:"Vetted coaches with founder experience, bookable same-day for 30-minute video sessions.",problem:"Founders face extreme burnout but standard therapy is slow, expensive, and not startup-specific.",solution:"Coaches who have built companies, bookable same-day at fixed low rates, focused on founder challenges.",category:"Health",author:"Mei L.",location:"Singapore",timeAgo:"8h ago",aiScore:78,upvotes:312,rating:4.6,ratingCount:53,stage:"Just an idea",comments:[{id:1,author:"James B.",time:"6h ago",text:"The founder-specific angle is crucial. Regular therapists just don't get it."},{id:2,author:"Nina P.",time:"4h ago",text:"Would you include async text-based sessions?"},{id:3,author:"Carl M.",time:"2h ago",text:"Pricing is the key challenge. How do you make it accessible?"}]},
  {id:4,title:"Hyper-local delivery network using idle gig drivers",oneliner:"On-demand local delivery under 45 minutes using Uber/Bolt drivers during their idle time.",problem:"Small local businesses can't afford same-day delivery; existing platforms prioritise large merchants.",solution:"Route delivery jobs to nearby gig workers already active on other apps but currently idle.",category:"Logistics",author:"Kwame A.",location:"Lagos",timeAgo:"12h ago",aiScore:65,upvotes:98,rating:3.7,ratingCount:18,stage:"Just an idea",comments:[]},
  {id:5,title:"AI writing assistant for academic research papers",oneliner:"Helps PhD students structure, cite, and polish academic papers 3× faster.",problem:"Researchers spend 40% of time on writing mechanics instead of research.",solution:"AI that understands academic conventions, auto-formats citations, checks argument flow.",category:"EdTech",author:"Yuki T.",location:"Tokyo",timeAgo:"1d ago",aiScore:71,upvotes:156,rating:4.0,ratingCount:36,stage:"Building it",comments:[{id:1,author:"Prof. Chen",time:"20h ago",text:"Citation formatting alone would save my students hours per paper."},{id:2,author:"Rosa M.",time:"14h ago",text:"Key differentiator from ChatGPT: academic tone and proper citations."}]},
  {id:6,title:"Automated onboarding workflows for remote-first teams",oneliner:"Replaces manual onboarding checklists with a self-running workflow across all your HR tools.",problem:"Remote onboarding is chaotic — new hires get lost, managers repeat themselves, HR tools don't connect.",solution:"A workflow engine connecting Slack, Notion, and HRIS to auto-trigger tasks and track completion.",category:"HR Tech",author:"Lena W.",location:"Amsterdam",timeAgo:"1d ago",aiScore:80,upvotes:201,rating:4.2,ratingCount:47,stage:"Already live",comments:[{id:1,author:"Mateo G.",time:"22h ago",text:"The integrations are the hard part — nailing that would be the real moat."}]},
  {id:7,title:"Burn-rate dashboard for early-stage startups",oneliner:"Real-time view of runway, burn rate, and expense categories — no CFO required.",problem:"Early founders make financial decisions blind. Spreadsheets are manual, accountants are expensive.",solution:"Connect bank accounts and cards, auto-categorise transactions, model runway scenarios.",category:"SaaS",author:"Chris O.",location:"San Francisco",timeAgo:"2d ago",aiScore:76,upvotes:178,rating:4.1,ratingCount:34,stage:"Just an idea",comments:[{id:1,author:"Investor A.",time:"1d ago",text:"Every portfolio company I have needs this. Big opportunity."}]},
  {id:8,title:"Micro-lending for informal street vendors via mobile payments",oneliner:"Working capital loans under $500 for street vendors, scored using mobile payment transaction history.",problem:"300M+ street vendors globally are excluded from formal credit with no collateral or credit history.",solution:"Use M-Pesa/UPI transaction data to build credit profiles and offer small loans with daily mobile repayment.",category:"FinTech",author:"Aditi P.",location:"Mumbai",timeAgo:"2d ago",aiScore:69,upvotes:143,rating:4.4,ratingCount:28,stage:"Building it",comments:[{id:1,author:"Impact VC",time:"1d ago",text:"The mobile payment data approach is the right key insight here."},{id:2,author:"Raj B.",time:"18h ago",text:"India's UPI data access policies may complicate the credit scoring model."}]},
  {id:9,title:"AR cooking instructor using your phone camera",oneliner:"Points at your ingredients and teaches you exactly how to cook them with real-time AR overlays.",problem:"Cooking tutorials don't adapt to what you actually have at home.",solution:"Identify ingredients via camera, suggest matching recipes, overlay step-by-step AR instructions.",category:"Consumer",author:"Sofia B.",location:"Barcelona",timeAgo:"3d ago",aiScore:73,upvotes:267,rating:4.5,ratingCount:62,stage:"Just an idea",comments:[{id:1,author:"Tech Fan",time:"2d ago",text:"Vision Pro could be perfect hardware for this."},{id:2,author:"Chef Marc",time:"1d ago",text:"Ingredient detection accuracy is critical."},{id:3,author:"Maria L.",time:"12h ago",text:"This would genuinely help people eat healthier at home."}]},
];

const CATS=["All","FinTech","SaaS","ClimaTech","Health","EdTech","Logistics","HR Tech","Consumer"];
const SORTS=[{id:"popular",label:"Most Popular"},{id:"newest",label:"Newest"},{id:"rated",label:"Highest Rated"},{id:"discussed",label:"Most Discussed"}];

const Stars=({value,interactive=false,onChange,size=15})=>{
  const [hover,setHover]=useState(0);
  const d=interactive?(hover||value):value;
  return(
    <div style={{display:"flex",gap:1,alignItems:"center"}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} style={{fontSize:size,color:s<=Math.round(d)?C.black:C.border,cursor:interactive?"pointer":"default",lineHeight:1,transition:"color 0.1s"}}
          onMouseEnter={interactive?()=>setHover(s):null} onMouseLeave={interactive?()=>setHover(0):null}
          onClick={interactive&&onChange?()=>onChange(s):null}>★</span>
      ))}
    </div>
  );
};

const IdeaCard=({idea,onOpen,hasUpvoted,onUpvote})=>{
  const [hov,setHov]=useState(false);
  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onOpen(idea)}
      style={{background:C.card,borderRadius:BR+4,border:`1px solid ${hov?"#c0c0c0":C.border}`,padding:28,cursor:"pointer",transition:"border-color 0.15s,box-shadow 0.15s",boxShadow:hov?"0 4px 20px rgba(0,0,0,0.07)":"0 1px 4px rgba(0,0,0,0.03)",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <span style={{fontSize:11,fontWeight:600,color:C.body,background:C.light,borderRadius:100,padding:"4px 12px"}}>{idea.category}</span>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22,fontWeight:800,color:C.black,letterSpacing:"-1px",lineHeight:1}}>{idea.aiScore}</div>
          <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>AI score</div>
        </div>
      </div>
      <h3 style={{fontSize:16,fontWeight:700,color:C.black,lineHeight:1.4,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{idea.title}</h3>
      <p style={{fontSize:13,color:C.body,lineHeight:1.55,marginBottom:18,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{idea.oneliner}</p>
      <div style={{fontSize:12,color:C.muted,marginBottom:16,fontWeight:500}}><span style={{fontWeight:600,color:C.body}}>{idea.stage}</span> · {idea.author}, {idea.location}</div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Stars value={idea.rating} size={13}/>
          <span style={{fontSize:12,color:C.muted,fontWeight:600}}>{idea.rating.toFixed(1)} ({idea.ratingCount})</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <button onClick={e=>{e.stopPropagation();onUpvote(idea.id);}}
            style={{display:"flex",alignItems:"center",gap:5,border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:BR,background:hasUpvoted?C.black:C.light,transition:"all 0.15s"}}>
            <span style={{fontSize:13,color:hasUpvoted?C.white:C.body}}>▲</span>
            <span style={{fontSize:12,fontWeight:700,color:hasUpvoted?C.white:C.body}}>{idea.upvotes+(hasUpvoted?1:0)}</span>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.muted}}>
            <span>💬</span><span style={{fontWeight:600}}>{idea.comments.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Modal=({idea,onClose,userRating,onRate,hasUpvoted,onUpvote,onAddComment})=>{
  const [text,setText]=useState('');
  const [name,setName]=useState('');
  const [submitted,setSubmitted]=useState(false);
  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',h);
    document.body.style.overflow='hidden';
    return()=>{window.removeEventListener('keydown',h);document.body.style.overflow='';};
  },[]);
  const submit=()=>{
    if(!text.trim())return;
    onAddComment(idea.id,{id:Date.now(),author:name||"Anonymous",time:"just now",text:text.trim()});
    setText('');setName('');setSubmitted(true);
    setTimeout(()=>setSubmitted(false),3000);
  };
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px 24px",overflowY:"auto"}}>
      <div style={{background:C.white,borderRadius:BR+6,width:"100%",maxWidth:700,animation:"slideIn 0.2s ease",position:"relative",marginBottom:32}}>
        <button onClick={onClose} style={{position:"absolute",top:20,right:20,width:32,height:32,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.white,cursor:"pointer",fontSize:16,color:C.muted,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>✕</button>
        <div style={{padding:"32px 36px 24px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:600,color:C.body,background:C.light,borderRadius:100,padding:"4px 12px"}}>{idea.category}</span>
            <span style={{fontSize:11,fontWeight:600,color:C.muted}}>· {idea.stage}</span>
          </div>
          <h2 style={{fontSize:26,fontWeight:800,color:C.black,letterSpacing:"-0.8px",lineHeight:1.2,marginBottom:8,paddingRight:40}}>{idea.title}</h2>
          <p style={{fontSize:14,color:C.muted}}>By {idea.author}, {idea.location} · {idea.timeAgo}</p>
        </div>
        <div style={{padding:"18px 36px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:32}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>AI Score</div>
            <div style={{fontSize:28,fontWeight:800,color:C.black,letterSpacing:"-1px",lineHeight:1}}>{idea.aiScore}<span style={{fontSize:14,fontWeight:400,color:C.muted}}>/100</span></div>
          </div>
          <div style={{width:1,height:40,background:C.border}}/>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Community Rating</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Stars value={userRating||idea.rating} size={18}/>
              <span style={{fontSize:16,fontWeight:700,color:C.black}}>{(userRating||idea.rating).toFixed(1)}</span>
              <span style={{fontSize:13,color:C.muted}}>({idea.ratingCount+(userRating?1:0)} ratings)</span>
            </div>
          </div>
          <div style={{width:1,height:40,background:C.border}}/>
          <button onClick={()=>onUpvote(idea.id)}
            style={{display:"flex",alignItems:"center",gap:7,background:hasUpvoted?C.black:C.light,border:"none",borderRadius:BR,padding:"10px 16px",cursor:"pointer",transition:"all 0.15s"}}>
            <span style={{fontSize:14,color:hasUpvoted?C.white:C.body}}>▲</span>
            <span style={{fontSize:14,fontWeight:700,color:hasUpvoted?C.white:C.body}}>{idea.upvotes+(hasUpvoted?1:0)}</span>
            <span style={{fontSize:13,color:hasUpvoted?'rgba(255,255,255,0.7)':C.muted}}>upvotes</span>
          </button>
        </div>
        <div style={{padding:"28px 36px"}}>
          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:10}}>The Idea</div>
            <p style={{fontSize:15,color:C.black,lineHeight:1.75}}>{idea.oneliner}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
            <div style={{background:C.light,borderRadius:BR+2,padding:"18px 20px"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Problem</div>
              <p style={{fontSize:14,color:C.body,lineHeight:1.65}}>{idea.problem}</p>
            </div>
            <div style={{background:C.light,borderRadius:BR+2,padding:"18px 20px"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Solution</div>
              <p style={{fontSize:14,color:C.body,lineHeight:1.65}}>{idea.solution}</p>
            </div>
          </div>
          <div style={{background:C.light,borderRadius:BR+4,padding:"22px 24px",marginBottom:28,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.black,marginBottom:4}}>{userRating?"You rated this idea":"Rate this idea"}</div>
                <div style={{fontSize:13,color:C.muted}}>{userRating?`You gave it ${userRating} star${userRating>1?'s':''}`:"Click a star to share your verdict"}</div>
              </div>
              <Stars value={userRating} interactive={!userRating} onChange={v=>onRate(idea.id,v)} size={28}/>
            </div>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:14,fontWeight:700,color:C.black,marginBottom:18}}>
              Suggestions & Feedback <span style={{fontWeight:500,color:C.muted,fontSize:13}}>({idea.comments.length})</span>
            </div>
            {idea.comments.length===0
              ?<div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontSize:14}}>No suggestions yet — be the first to share feedback.</div>
              :<div style={{display:"flex",flexDirection:"column",gap:14}}>
                {idea.comments.map(c=>(
                  <div key={c.id} style={{display:"flex",gap:12}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:C.border,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.body}}>{c.author[0]}</div>
                    <div style={{flex:1,background:C.light,borderRadius:BR+2,padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.black}}>{c.author}</span>
                        <span style={{fontSize:12,color:C.muted}}>· {c.time}</span>
                      </div>
                      <p style={{fontSize:14,color:C.body,lineHeight:1.6}}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:24}}>
            <div style={{fontSize:14,fontWeight:700,color:C.black,marginBottom:14}}>Add a suggestion</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (optional)"
              style={{display:"block",width:"100%",border:`1.5px solid ${C.border}`,borderRadius:BR,padding:"10px 14px",fontSize:14,marginBottom:10,color:C.black,fontFamily:F,outline:"none",boxSizing:"border-box"}}/>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share feedback, suggest improvements, ask a question…" rows={3}
              style={{display:"block",width:"100%",border:`1.5px solid ${C.border}`,borderRadius:BR,padding:"12px 14px",fontSize:14,lineHeight:1.6,marginBottom:12,color:C.black,resize:"none",fontFamily:F,outline:"none",boxSizing:"border-box"}}/>
            {submitted
              ?<div style={{fontSize:14,fontWeight:600,color:C.black,padding:"12px 0"}}>✓ Suggestion submitted — thanks!</div>
              :<button onClick={submit} disabled={!text.trim()} style={{background:text.trim()?C.black:C.border,color:text.trim()?C.white:C.muted,border:"none",borderRadius:BR,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:text.trim()?"pointer":"not-allowed",fontFamily:F,transition:"all 0.15s"}}>
                Post Suggestion
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Community({ onSubmitIdea, onHome, user, onLogout, onSignIn, onAccount }) {
  const [ideas,setIdeas]       = useState(SEED);
  const [cat,setCat]           = useState("All");
  const [sort,setSort]         = useState("popular");
  const [search,setSearch]     = useState("");
  const [selected,setSelected] = useState(null);
  const [ratings,setRatings]   = useState({});
  const [upvotes,setUpvotes]   = useState(new Set());

  const filtered = useMemo(()=>{
    let l=[...ideas];
    if(cat!=="All") l=l.filter(i=>i.category===cat);
    if(search.trim()){const q=search.toLowerCase();l=l.filter(i=>i.title.toLowerCase().includes(q)||i.oneliner.toLowerCase().includes(q)||i.category.toLowerCase().includes(q));}
    if(sort==="popular")   l.sort((a,b)=>b.upvotes-a.upvotes);
    if(sort==="newest")    l.sort((a,b)=>b.id-a.id);
    if(sort==="rated")     l.sort((a,b)=>b.rating-a.rating);
    if(sort==="discussed") l.sort((a,b)=>b.comments.length-a.comments.length);
    return l;
  },[ideas,cat,sort,search]);

  const catCounts=useMemo(()=>{const c={All:ideas.length};ideas.forEach(i=>{c[i.category]=(c[i.category]||0)+1;});return c;},[ideas]);
  const handleUpvote=useCallback(id=>{setUpvotes(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});},[]);
  const handleRate=useCallback((id,v)=>setRatings(p=>({...p,[id]:v})),[]);
  const handleAddComment=useCallback((id,c)=>{
    setIdeas(p=>p.map(i=>i.id===id?{...i,comments:[...i.comments,c]}:i));
    setSelected(p=>p?.id===id?{...p,comments:[...p.comments,c]}:p);
  },[]);

  return(
    <div style={{minHeight:"100vh",background:C.surface,fontFamily:F}}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`}</style>

      {/* Nav */}
      <div style={{position:"sticky",top:0,zIndex:100,background:C.white,borderBottom:`1px solid ${C.border}`,height:68,padding:"0 48px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span onClick={onHome} style={{fontWeight:800,fontSize:20,letterSpacing:"-0.5px",color:C.black,cursor:"pointer"}}>startup oracle</span>
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          {["How it works","Pricing"].map(l=><span key={l} style={{fontSize:14,color:C.muted,cursor:"pointer",fontWeight:500}}>{l}</span>)}
          <span style={{fontSize:14,color:C.black,fontWeight:700,borderBottom:`2px solid ${C.black}`,paddingBottom:2}}>Browse Ideas</span>
          {user ? (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div onClick={()=>onAccount?.()} title="My Account" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{width:26,height:26,borderRadius:"50%"}}/>}
                <span style={{fontSize:14,color:C.black,fontWeight:600,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.user_metadata?.full_name || user.email}</span>
              </div>
            </div>
          ) : (
            <span onClick={()=>onSignIn?.()} style={{fontSize:14,color:C.muted,cursor:"pointer",fontWeight:500}}>Sign in</span>
          )}
          <button onClick={onSubmitIdea} style={{background:C.black,color:C.white,border:"none",borderRadius:BR,padding:"10px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F}}>Submit Idea →</button>
        </div>
      </div>

      {/* Page header */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"48px 64px 40px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>Community</div>
            <h1 style={{fontSize:40,fontWeight:800,color:C.black,letterSpacing:"-1.5px",marginBottom:10}}>Ideas being validated</h1>
            <p style={{fontSize:16,color:C.muted,maxWidth:480,lineHeight:1.6}}>Browse startup ideas from founders worldwide. Rate them, leave suggestions, and get inspired to share your own.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:12}}>
            <button onClick={onSubmitIdea} style={{background:C.black,color:C.white,borderRadius:BR,padding:"14px 28px",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>+ Share Your Idea</button>
            <div style={{display:"flex",gap:24,fontSize:13,color:C.muted}}>
              <span><strong style={{color:C.black}}>{ideas.length}</strong> ideas</span>
              <span><strong style={{color:C.black}}>{ideas.reduce((a,i)=>a+i.ratingCount,0)}</strong> ratings</span>
              <span><strong style={{color:C.black}}>{ideas.reduce((a,i)=>a+i.comments.length,0)}</strong> suggestions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 64px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",paddingBottom:2}}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{flexShrink:0,borderRadius:100,padding:"6px 16px",fontSize:13,fontWeight:600,cursor:"pointer",border:cat===c?"none":`1px solid ${C.border}`,background:cat===c?C.black:C.white,color:cat===c?C.white:C.body,transition:"all 0.15s",fontFamily:F}}>
                {c} <span style={{fontWeight:400,opacity:0.6,fontSize:12}}>{catCounts[c]||0}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ideas…"
                style={{border:`1.5px solid ${C.border}`,borderRadius:BR,padding:"8px 14px 8px 32px",fontSize:13,color:C.black,width:180,fontFamily:F,outline:"none"}}/>
            </div>
            <select value={sort} onChange={e=>setSort(e.target.value)}
              style={{border:`1.5px solid ${C.border}`,borderRadius:BR,padding:"8px 14px",fontSize:13,color:C.black,background:C.white,cursor:"pointer",fontFamily:F,outline:"none"}}>
              {SORTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 64px 80px"}}>
        {filtered.length===0
          ?<div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{fontSize:40,marginBottom:16}}>🔍</div>
            <h3 style={{fontSize:22,fontWeight:700,color:C.black,marginBottom:8}}>No ideas found</h3>
            <p style={{fontSize:15,color:C.muted,marginBottom:28}}>Try a different category or search term.</p>
            <button onClick={()=>{setCat("All");setSearch("");}} style={{background:C.black,color:C.white,border:"none",borderRadius:BR,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F}}>Clear filters</button>
          </div>
          :<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <span style={{fontSize:14,color:C.muted,fontWeight:500}}>{filtered.length} idea{filtered.length!==1?"s":""}{cat!=="All"?` in ${cat}`:""}{search?` matching "${search}"`:""}
              </span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
              {filtered.map(idea=><IdeaCard key={idea.id} idea={idea} onOpen={setSelected} hasUpvoted={upvotes.has(idea.id)} onUpvote={handleUpvote}/>)}
            </div>
            <div style={{marginTop:56,background:C.white,border:`1px solid ${C.border}`,borderRadius:BR+4,padding:"40px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:40}}>
              <div>
                <h3 style={{fontSize:22,fontWeight:800,color:C.black,letterSpacing:"-0.5px",marginBottom:8}}>Got an idea of your own?</h3>
                <p style={{fontSize:15,color:C.muted,lineHeight:1.6,maxWidth:480}}>Every idea above started as a rough thought. Submit yours and get an AI score, community feedback, and a full validation report in minutes.</p>
              </div>
              <button onClick={onSubmitIdea} style={{flexShrink:0,background:C.black,color:C.white,borderRadius:BR,padding:"15px 32px",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>Validate My Idea →</button>
            </div>
          </>
        }
      </div>

      {selected&&<Modal idea={selected} onClose={()=>setSelected(null)} userRating={ratings[selected.id]||0} onRate={handleRate} hasUpvoted={upvotes.has(selected.id)} onUpvote={handleUpvote} onAddComment={handleAddComment}/>}
    </div>
  );
}
