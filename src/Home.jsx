import { useState, useEffect } from 'react';

const INK = '#0A0A0F';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const NavLink = ({ children, onClick }) => (
  <span onClick={onClick}
    style={{ fontSize:13, color:'rgba(0,0,0,.42)', letterSpacing:'0.26px', cursor:'pointer', transition:'color .15s' }}
    onMouseEnter={e=>e.currentTarget.style.color=INK}
    onMouseLeave={e=>e.currentTarget.style.color='rgba(0,0,0,.42)'}>
    {children}
  </span>
);

const InkBtn = ({ children, onClick, size='sm' }) => (
  <button onClick={onClick}
    style={{ background:INK, color:'#fff', border:'none', borderRadius:2, cursor:'pointer', fontFamily:SANS,
      textTransform:'uppercase', fontWeight:700,
      fontSize: size==='lg'?15:11,
      letterSpacing: size==='lg'?'0.9px':'0.88px',
      padding: size==='lg'?'18px 56px':'10px 22px',
      transition:'opacity .15s' }}
    onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
    onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
    {children}
  </button>
);

const STEPS = [
  { title:'Post your idea', body:'Write a one-line pitch or a full concept. No pitch deck required — plain English is enough to get started.' },
  { title:'Get an AI verdict', body:'A 6-section deep-dive scores your idea on market, feasibility, and edge — the same Oracle Score investors see on your profile.' },
  { title:'Get discovered', body:'Validated pitches surface in the investor deal-flow. Investors read your score, open the full report, and reach out directly.' },
];

function HowItWorks() {
  return (
    <section style={{ padding:'clamp(64px,9vw,108px) clamp(20px,5vw,48px)', maxWidth:1180, margin:'0 auto', width:'100%' }}>
      <div style={{ textAlign:'center', marginBottom:56 }}>
        <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(0,0,0,.28)', marginBottom:16 }}>How it works</div>
        <div style={{ fontFamily:SERIF, fontSize:'clamp(28px,4vw,40px)', fontWeight:500, color:INK }}>From idea to inbox</div>
      </div>
      <div style={{ display:'flex', gap:'clamp(28px,5vw,56px)', flexWrap:'wrap' }}>
        {STEPS.map((s,i)=>(
          <div key={s.title} style={{ flex:'1 1 240px', minWidth:220 }}>
            <div style={{ fontFamily:SERIF, fontSize:44, color:'rgba(0,0,0,.14)', marginBottom:14, lineHeight:1 }}>{String(i+1).padStart(2,'0')}</div>
            <div style={{ fontSize:16, fontWeight:600, color:INK, marginBottom:10 }}>{s.title}</div>
            <p style={{ fontSize:13, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, margin:0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewCard({ post, onClick }) {
  const a = post.author || {};
  const name = a.name || 'Founder';
  const initial = name.trim().charAt(0).toUpperCase() || 'F';
  const body = (post.body || '').trim();
  const excerpt = body.length > 130 ? body.slice(0,130)+'…' : body;
  const score = post.meta?.aiScore;
  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={e=>{ if(e.key==='Enter') onClick(); }}
      style={{ flex:'1 1 280px', minWidth:240, background:'#fff', border:'1px solid rgba(0,0,0,.08)', padding:'24px 22px', cursor:'pointer', transition:'border-color .15s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,0,0,.3)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,0,0,.08)'}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div aria-hidden="true" style={{ width:28, height:28, borderRadius:'50%', background:INK, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{initial}</div>
        <span style={{ fontSize:12, fontWeight:600, color:INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
        {score != null && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'rgba(0,0,0,.38)', flexShrink:0 }}>★ {score}</span>}
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:INK, marginBottom:8, lineHeight:1.3 }}>{post.title || 'Untitled pitch'}</div>
      {excerpt && <p style={{ fontSize:12.5, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.7, margin:0 }}>{excerpt}</p>}
    </div>
  );
}

function LivePitches({ onCommunity }) {
  const [pitches, setPitches] = useState([]);
  useEffect(() => {
    let on = true;
    import('./communityDB')
      .then(({ fetchPitches }) => fetchPitches({ limit:3 }))
      .then(rows => { if (on) setPitches(rows || []); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  if (pitches.length === 0) return null;
  return (
    <section style={{ background:'#F7F6F3', padding:'clamp(56px,8vw,96px) clamp(20px,5vw,48px)' }}>
      <div style={{ maxWidth:1180, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:36, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(0,0,0,.28)', marginBottom:14 }}>Live on Startup Oracle</div>
            <div style={{ fontFamily:SERIF, fontSize:'clamp(26px,4vw,36px)', fontWeight:500, color:INK }}>What founders are building</div>
          </div>
          <span onClick={onCommunity} style={{ fontSize:11, fontWeight:700, letterSpacing:'0.7px', textTransform:'uppercase', color:INK, cursor:'pointer', borderBottom:'1px solid rgba(0,0,0,.3)', paddingBottom:3, whiteSpace:'nowrap' }}>
            See all →
          </span>
        </div>
        <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
          {pitches.map(p => <PreviewCard key={p.id} post={p} onClick={onCommunity}/>)}
        </div>
      </div>
    </section>
  );
}

function Footer({ onPricing }) {
  return (
    <footer style={{ borderTop:'1px solid rgba(0,0,0,.08)', padding:'36px clamp(20px,5vw,48px)' }}>
      <div style={{ maxWidth:1180, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:18 }}>
        <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', color:'rgba(0,0,0,.5)' }}>Startup Oracle</span>
        <div style={{ display:'flex', gap:26, flexWrap:'wrap', alignItems:'center' }}>
          <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'rgba(0,0,0,.42)', textDecoration:'none' }}>Terms</a>
          <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'rgba(0,0,0,.42)', textDecoration:'none' }}>Privacy</a>
          {onPricing && <NavLink onClick={onPricing}>Pricing</NavLink>}
        </div>
        <span style={{ fontSize:11, color:'rgba(0,0,0,.3)' }}>© {new Date().getFullYear()} Startup Oracle</span>
      </div>
    </footer>
  );
}

export default function Home({ user, onGateway, onCommunity, onAnalyse, onInvest, onSignIn, onAccount, onPricing, onHowItWorks }) {
  const startCommunity = onGateway || onCommunity;
  return (
    <div style={{ minHeight:'100vh', background:'#fff', color:INK, fontFamily:SANS, display:'flex', flexDirection:'column' }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes heroUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .hero-a{animation:heroUp .6s ease both}
        .hero-b{animation:heroUp .6s .12s ease both}
        .hero-c{animation:heroUp .6s .24s ease both}
        @media (max-width:860px){ .home-band{flex-direction:column} .home-nav-links{display:none!important} }
      `}</style>

      {/* Nav */}
      <nav style={{ height:68, padding:'0 clamp(20px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, letterSpacing:'1.6px', textTransform:'uppercase', cursor:'default', whiteSpace:'nowrap' }}>
          Startup Oracle
        </span>
        <div className="home-nav-links" style={{ display:'flex', alignItems:'center', gap:32 }}>
          <NavLink onClick={onCommunity}>Community</NavLink>
          <NavLink onClick={onAnalyse}>Analyse Idea</NavLink>
          {onInvest && <NavLink onClick={onInvest}>For Investors</NavLink>}
          <NavLink onClick={onPricing}>Pricing</NavLink>
          {onHowItWorks && <NavLink onClick={onHowItWorks}>How it works</NavLink>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          {user ? (
            <div onClick={()=>onAccount?.()} title="My Account" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width:26, height:26, borderRadius:'50%' }}/>}
              <span style={{ fontSize:13, fontWeight:600, color:INK, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
          ) : (
            <NavLink onClick={onSignIn}>Sign in</NavLink>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'72px 24px 88px' }}>
        <div className="hero-a" style={{ fontSize:10, letterSpacing:'2.4px', textTransform:'uppercase', color:'rgba(0,0,0,.3)', marginBottom:28 }}>
          For Founders · By Founders
        </div>
        <h1 className="hero-a" style={{ fontFamily:SERIF, fontSize:'clamp(44px, 7.5vw, 76px)', fontWeight:500, letterSpacing:'-0.02em', lineHeight:1.04, margin:'0 0 26px', color:INK }}>
          Where Founders<br/>Think Out Loud
        </h1>
        <p className="hero-b" style={{ fontSize:14, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, maxWidth:460, margin:'0 0 40px' }}>
          Post your ideas. Get real feedback. Validate your startup with a community that actually builds — and get discovered by investors along the way.
        </p>
        <div className="hero-c">
          <InkBtn size="lg" onClick={startCommunity}>Build Community</InkBtn>
        </div>
      </div>

      {/* Split band */}
      <div className="home-band" style={{ display:'flex', width:'100%', flexShrink:0 }}>
        {/* Community card */}
        <div onClick={startCommunity}
          style={{ flex:'1 1 34%', background:'#F7F6F3', padding:'clamp(36px,6vw,48px) clamp(20px,5vw,36px)', display:'flex', flexDirection:'column', cursor:'pointer', minHeight:380 }}>
          <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(0,0,0,.28)', marginBottom:22 }}>Community</div>
          <div style={{ fontFamily:SERIF, fontSize:32, fontWeight:500, lineHeight:1.1, color:INK, marginBottom:20 }}>
            A home for<br/>every founder
          </div>
          <p style={{ fontSize:13, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, maxWidth:340, margin:'0 0 auto' }}>
            Share startup ideas, discover what others are building, and get honest feedback from founders who've actually been there.
          </p>
          <div style={{ display:'flex', gap:20, marginTop:32, flexWrap:'wrap' }}>
            {['Post Ideas','Get Feedback','Build in Public'].map(t=>(
              <span key={t} style={{ fontSize:10, color:'rgba(0,0,0,.28)', letterSpacing:'0.3px' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Analyse card */}
        <div onClick={onAnalyse}
          style={{ flex:'1 1 33%', background:INK, color:'#fff', padding:'clamp(36px,6vw,48px) clamp(20px,5vw,36px)', display:'flex', flexDirection:'column', cursor:'pointer', minHeight:380 }}>
          <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:22 }}>Analyse Idea</div>
          <div style={{ fontFamily:SERIF, fontSize:32, fontWeight:500, lineHeight:1.1, marginBottom:20 }}>
            Know before<br/>you build
          </div>
          <p style={{ fontSize:13, fontWeight:300, color:'rgba(255,255,255,.44)', lineHeight:1.85, maxWidth:300, margin:'0 0 auto' }}>
            Deep-dive analysis on your startup concept. Market size, competition, and viability — before you commit a single hour.
          </p>
          <div style={{ marginTop:32 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.77px', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,.35)', paddingBottom:4, transition:'border-color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#fff'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.35)'}>
              Start Analysing →
            </span>
          </div>
        </div>

        {/* Invest card */}
        {onInvest && (
          <div onClick={onInvest}
            style={{ flex:'1 1 33%', background:'#fff', padding:'clamp(36px,6vw,48px) clamp(20px,5vw,36px)', display:'flex', flexDirection:'column', cursor:'pointer', minHeight:380, borderTop:'1px solid rgba(0,0,0,.08)' }}>
            <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(0,0,0,.28)', marginBottom:22 }}>For Investors</div>
            <div style={{ fontFamily:SERIF, fontSize:32, fontWeight:500, lineHeight:1.1, color:INK, marginBottom:20 }}>
              Back the next<br/>big builder
            </div>
            <p style={{ fontSize:13, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, maxWidth:300, margin:'0 0 auto' }}>
              Browse an open deal-flow of AI-validated pitches. Every founder carries an Oracle Score before you ever message them.
            </p>
            <div style={{ marginTop:32 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.77px', textTransform:'uppercase', borderBottom:'1px solid rgba(0,0,0,.35)', paddingBottom:4, transition:'border-color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=INK}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,0,0,.35)'}>
                Browse Deal-Flow →
              </span>
            </div>
          </div>
        )}
      </div>

      <HowItWorks/>
      {onCommunity && <LivePitches onCommunity={onCommunity}/>}
      <Footer onPricing={onPricing}/>
    </div>
  );
}
