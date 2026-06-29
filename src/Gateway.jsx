const SERIF = "var(--font-serif)";   // wordmark only (the one allowed exception)
const SANS = "var(--font)";
const DISPLAY = "var(--font-display)";

// ── Monochrome line icons (stroke = currentColor) ──
const Ico = ({ d, children, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const RocketIcon = (p) => <Ico {...p} d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 8-10c2.5 0 4 1.5 4 4a22 22 0 0 1-10 8zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />;
const TrendIcon = (p) => <Ico {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></Ico>;
const Check = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;

// One role card. `dark` flips it to the ink treatment (Investor).
function RoleCard({ dark, Icon, eyebrow, title, blurb, points, cta, current, onChoose }) {
  const fg     = dark ? '#fff' : 'var(--ink)';
  const sub    = dark ? 'rgba(255,255,255,.72)' : 'var(--ink-2)';
  const faint  = dark ? 'rgba(255,255,255,.5)'  : 'var(--ink-3)';
  const chipBg = dark ? 'rgba(255,255,255,.12)' : 'rgba(15,23,42,.06)';
  const tick   = dark ? '#fff' : 'var(--accent)';
  return (
    <div
      onClick={onChoose}
      style={{ flex:'1 1 320px', maxWidth:400, cursor:'pointer', borderRadius:'var(--r-lg)',
        background: dark ? 'var(--ink)' : 'var(--surface)', color: fg,
        border:`1px solid ${dark ? 'transparent' : 'var(--line)'}`, padding:'clamp(26px,3.4vw,36px)',
        display:'flex', flexDirection:'column', minHeight:380, fontFamily:SANS,
        boxShadow:'var(--sh-1)', transition:'transform .2s var(--ease), box-shadow .2s var(--ease)' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow='var(--sh-2)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--sh-1)'; }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, borderRadius:'var(--r)', background:chipBg, color:fg }}>
          <Icon />
        </span>
        {current && <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.5px', textTransform:'uppercase', padding:'4px 10px', borderRadius:'var(--r-pill)', background:chipBg, color:sub }}>Your role</span>}
      </div>

      <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:faint, marginBottom:10 }}>{eyebrow}</div>
      <h2 style={{ fontFamily:DISPLAY, fontSize:'clamp(24px,3vw,30px)', fontWeight:800, letterSpacing:'var(--tracking-tight)', lineHeight:'var(--lh-tight)', margin:'0 0 12px', color:fg }}>{title}</h2>
      <p style={{ fontSize:'var(--t-sm)', color:sub, lineHeight:'var(--lh)', margin:'0 0 20px', maxWidth:340 }}>{blurb}</p>

      <ul style={{ listStyle:'none', padding:0, margin:'0 0 auto', display:'flex', flexDirection:'column', gap:11 }}>
        {points.map(p=>(
          <li key={p} style={{ display:'flex', alignItems:'center', gap:10, fontSize:'var(--t-sm)', color:sub }}>
            <span style={{ display:'inline-flex', flexShrink:0, color:tick }}><Check /></span>{p}
          </li>
        ))}
      </ul>

      <button
        onClick={(e)=>{ e.stopPropagation(); onChoose(); }}
        style={{ marginTop:28, width:'100%', padding:'13px 20px', borderRadius:'var(--r)', cursor:'pointer', fontFamily:SANS,
          fontSize:'var(--t-sm)', fontWeight:700, letterSpacing:'.2px',
          border: dark ? '1px solid rgba(255,255,255,.28)' : '1px solid var(--ink)',
          background: dark ? '#fff' : 'var(--ink)', color: dark ? 'var(--ink)' : '#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        {cta}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

// Shown after "Build Community" — pick which side of the marketplace you're on.
// `current` highlights the saved account_type (when known) so a returning user sees their role.
export default function Gateway({ current, onFounder, onInvestor, onHome }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:SANS, display:'flex', flexDirection:'column' }}>
      <nav style={{ height:68, padding:'0 clamp(20px,5vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <button onClick={onHome} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:SERIF, fontSize:20, fontWeight:600, letterSpacing:'1.6px', textTransform:'uppercase', whiteSpace:'nowrap', color:'var(--ink)' }}>
          Startup Oracle
        </button>
        <button onClick={onHome} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'var(--t-sm)', color:'var(--ink-2)', fontWeight:600, fontFamily:SANS }}>← Home</button>
      </nav>

      <main style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(32px,6vw,56px) clamp(20px,5vw,40px)' }}>
        <div style={{ fontSize:10, letterSpacing:'2.4px', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:18, textAlign:'center' }}>
          Founders · Investors
        </div>
        <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(30px,5vw,46px)', fontWeight:800, letterSpacing:'var(--tracking-tight)', lineHeight:'var(--lh-tight)', margin:'0 0 14px', textAlign:'center', maxWidth:640 }}>
          How do you want to start?
        </h1>
        <p style={{ fontSize:'var(--t-base)', color:'var(--ink-2)', lineHeight:'var(--lh)', maxWidth:480, margin:'0 0 40px', textAlign:'center' }}>
          Pitch your idea and raise — or browse founders and back the next big thing.
        </p>

        <div style={{ display:'flex', flexWrap:'wrap', gap:20, width:'100%', maxWidth:840, justifyContent:'center', alignItems:'stretch' }}>
          <RoleCard
            Icon={RocketIcon}
            eyebrow="Founder"
            title="Pitch & raise"
            blurb="Share your startup with the community, get honest feedback, and pitch to investors with your deck, docs and prototype attached."
            points={['Post ideas & get rated 1–10', 'Pitch with files + amount raising', 'Get discovered by investors']}
            cta="Continue as Founder"
            current={current === 'founder'}
            onChoose={onFounder}
          />
          <RoleCard
            dark
            Icon={TrendIcon}
            eyebrow="Investor"
            title="Find & back ideas"
            blurb="Browse the deal-flow of founder pitches, filter by category and stage, open their decks, and message the ones you want to back."
            points={['Browse every founder pitch', 'Filter by category, stage, amount', 'Message founders directly']}
            cta="Continue as Investor"
            current={current === 'investor'}
            onChoose={onInvestor}
          />
        </div>

        <p style={{ fontSize:'var(--t-xs)', color:'var(--ink-3)', marginTop:28, textAlign:'center' }}>
          You can switch sides anytime — your choice is saved to your profile.
        </p>
      </main>
    </div>
  );
}
