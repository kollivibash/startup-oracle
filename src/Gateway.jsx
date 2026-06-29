const INK = '#0A0A0F';
const SERIF = "'Cormorant Garamond', Georgia, serif";   // wordmark only (the one allowed exception)
const SANS = "'DM Sans', system-ui, sans-serif";
const DISPLAY = "var(--font-display)";                  // Plus Jakarta Sans — headings

// Single role card (Founder / Investor). `dark` flips it to the ink treatment.
function RoleCard({ dark, eyebrow, title, blurb, points, cta, current, onClick }) {
  const fg = dark ? '#fff' : INK;
  const sub = dark ? 'rgba(255,255,255,.46)' : 'rgba(0,0,0,.46)';
  const faint = dark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.28)';
  return (
    <button onClick={onClick}
      style={{ flex:'1 1 320px', textAlign:'left', cursor:'pointer', border:'none', borderRadius:16,
        background: dark ? INK : '#F7F6F3', color: fg, padding:'clamp(28px,4vw,40px)',
        display:'flex', flexDirection:'column', minHeight:340, fontFamily:SANS,
        boxShadow:'0 1px 0 rgba(0,0,0,.04)', transition:'transform .18s ease, box-shadow .18s ease' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 18px 50px rgba(0,0,0,.16)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 0 rgba(0,0,0,.04)'; }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontSize:9, letterSpacing:'1.98px', textTransform:'uppercase', color:faint }}>{eyebrow}</span>
        {current && <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', padding:'3px 9px', borderRadius:99, background: dark?'rgba(255,255,255,.14)':'rgba(0,0,0,.07)', color: sub }}>Current</span>}
      </div>
      <div style={{ fontFamily:DISPLAY, fontSize:30, fontWeight:800, letterSpacing:'-0.6px', lineHeight:1.08, marginBottom:14, color:fg }}>{title}</div>
      <p style={{ fontSize:13.5, fontWeight:300, color:sub, lineHeight:1.75, margin:'0 0 18px', maxWidth:360 }}>{blurb}</p>
      <ul style={{ listStyle:'none', padding:0, margin:'0 0 auto', display:'flex', flexDirection:'column', gap:8 }}>
        {points.map(p=>(
          <li key={p} style={{ display:'flex', alignItems:'center', gap:9, fontSize:13, color:sub }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background: dark?'rgba(255,255,255,.5)':'rgba(0,0,0,.4)', flexShrink:0 }}/>{p}
          </li>
        ))}
      </ul>
      <span style={{ marginTop:28, fontSize:11, fontWeight:700, letterSpacing:'0.77px', textTransform:'uppercase', color:fg,
        borderBottom:`1px solid ${dark?'rgba(255,255,255,.35)':'rgba(0,0,0,.3)'}`, paddingBottom:4, alignSelf:'flex-start' }}>
        {cta} →
      </span>
    </button>
  );
}

// Shown after "Build Community" — pick which side of the marketplace you're on.
// `current` highlights the saved account_type (when known) so a returning user sees their role.
export default function Gateway({ current, onFounder, onInvestor, onHome }) {
  return (
    <div style={{ minHeight:'100vh', background:'#fff', color:INK, fontFamily:SANS, display:'flex', flexDirection:'column' }}>
      <nav style={{ height:68, padding:'0 clamp(20px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span onClick={onHome} style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, letterSpacing:'1.6px', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' }}>
          Startup Oracle
        </span>
        <span onClick={onHome} style={{ fontSize:13, color:'rgba(0,0,0,.42)', fontWeight:500, cursor:'pointer' }}>← Home</span>
      </nav>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(32px,6vw,64px) clamp(20px,5vw,40px)' }}>
        <div style={{ fontSize:10, letterSpacing:'2.4px', textTransform:'uppercase', color:'rgba(0,0,0,.3)', marginBottom:18, textAlign:'center' }}>
          Founders · Investors
        </div>
        <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(30px,5vw,46px)', fontWeight:800, letterSpacing:'-1px', lineHeight:1.06, margin:'0 0 14px', textAlign:'center', maxWidth:640 }}>
          How do you want to start?
        </h1>
        <p style={{ fontSize:14, fontWeight:300, color:'rgba(0,0,0,.45)', lineHeight:1.8, maxWidth:480, margin:'0 0 40px', textAlign:'center' }}>
          Pitch your idea and raise — or browse founders and back the next big thing. You can switch sides anytime.
        </p>

        <div style={{ display:'flex', flexWrap:'wrap', gap:20, width:'100%', maxWidth:840, justifyContent:'center' }}>
          <RoleCard
            eyebrow="Founder"
            title={<>Pitch &amp; raise</>}
            blurb="Share your startup with the community, get honest feedback, and pitch it to investors with your deck, docs and prototype attached."
            points={['Post ideas & get rated 1–10', 'Pitch with files + amount raising', 'Get discovered by investors']}
            cta="Continue as Founder"
            current={current === 'founder'}
            onClick={onFounder}
          />
          <RoleCard
            dark
            eyebrow="Investor"
            title={<>Find &amp; back ideas</>}
            blurb="Browse the deal-flow of founder pitches, filter by category and stage, open their decks, and message the ones you want to back."
            points={['Browse every founder pitch', 'Filter by category, stage, amount', 'Message founders directly']}
            cta="Continue as Investor"
            current={current === 'investor'}
            onClick={onInvestor}
          />
        </div>
      </div>
    </div>
  );
}
