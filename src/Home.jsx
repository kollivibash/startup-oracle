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

export default function Home({ user, onCommunity, onAnalyse, onSignIn, onAccount }) {
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
      <nav style={{ height:68, padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, letterSpacing:'1.6px', textTransform:'uppercase', cursor:'default', whiteSpace:'nowrap' }}>
          Startup Oracle
        </span>
        <div className="home-nav-links" style={{ display:'flex', alignItems:'center', gap:36 }}>
          <NavLink onClick={onCommunity}>Community</NavLink>
          <NavLink onClick={onAnalyse}>Analyse Idea</NavLink>
          <NavLink>Pricing</NavLink>
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
        <p className="hero-b" style={{ fontSize:14, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, maxWidth:440, margin:'0 0 40px' }}>
          Post your ideas. Get real feedback. Validate your startup with a community that actually builds.
        </p>
        <div className="hero-c">
          <InkBtn size="lg" onClick={onCommunity}>Build Community</InkBtn>
        </div>
      </div>

      {/* Split band */}
      <div className="home-band" style={{ display:'flex', width:'100%', flexShrink:0 }}>
        {/* Community card */}
        <div onClick={onCommunity}
          style={{ flex:'1 1 58%', background:'#F7F6F3', padding:'56px 48px', display:'flex', flexDirection:'column', cursor:'pointer', minHeight:380 }}>
          <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(0,0,0,.28)', marginBottom:22 }}>Community</div>
          <div style={{ fontFamily:SERIF, fontSize:40, fontWeight:500, lineHeight:1.08, color:INK, marginBottom:20 }}>
            A home for<br/>every founder
          </div>
          <p style={{ fontSize:13, fontWeight:300, color:'rgba(0,0,0,.42)', lineHeight:1.85, maxWidth:450, margin:'0 0 auto' }}>
            Share startup ideas, discover what others are building, and get honest feedback from founders who've actually been there. No vanity metrics — just real conversations.
          </p>
          <div style={{ display:'flex', gap:26, marginTop:32, flexWrap:'wrap' }}>
            {['Post Ideas','Get Feedback','Connect','Build in Public'].map(t=>(
              <span key={t} style={{ fontSize:10, color:'rgba(0,0,0,.28)', letterSpacing:'0.3px' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Analyse card */}
        <div onClick={onAnalyse}
          style={{ flex:'1 1 42%', background:INK, color:'#fff', padding:'56px 48px', display:'flex', flexDirection:'column', cursor:'pointer', minHeight:380 }}>
          <div style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:22 }}>Analyse Idea</div>
          <div style={{ fontFamily:SERIF, fontSize:40, fontWeight:500, lineHeight:1.08, marginBottom:20 }}>
            Know before<br/>you build
          </div>
          <p style={{ fontSize:13, fontWeight:300, color:'rgba(255,255,255,.44)', lineHeight:1.85, maxWidth:320, margin:'0 0 auto' }}>
            Deep-dive analysis on your startup concept. Market size, competition, and viability — all before you commit a single hour.
          </p>
          <div style={{ marginTop:32 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.77px', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,.35)', paddingBottom:4, transition:'border-color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#fff'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.35)'}>
              Start Analysing →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
