import { useState, useEffect } from 'react';
import { getInvestorProfile, fetchProfile } from './communityDB';

const SERIF = "var(--font-serif)";
const F = "var(--font)";
const FD = "var(--font-display)";
const BORDER = 'rgba(15,23,42,.08)';

const STAGE_SPECTRUM = ['Idea', 'Prototype', 'Pre-seed', 'Seed', 'Series A', 'Series B+'];
const arr = v => Array.isArray(v) ? v : (v ? [String(v)] : []);
const has = v => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
const toUrl = v => /^https?:\/\//i.test(v) ? v : `https://${v}`;
const cleanUrl = v => String(v).replace(/^https?:\/\//i, '').replace(/\/$/, '');

const SECTIONS = [
  { id: 'thesis', label: 'Thesis' },
  { id: 'focus', label: 'Focus' },
  { id: 'style', label: 'Style' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'value', label: 'Value-Add' },
];

function Tag({ children, active }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'5px 11px', borderRadius:'var(--r-pill)', fontSize:12, fontWeight:600, fontFamily:F, whiteSpace:'nowrap', background: active ? 'var(--accent-weak)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--ink-2)', border: active ? '1px solid transparent' : `1px solid ${BORDER}` }}>
      {children}
    </span>
  );
}
const TagRow = ({ items, active }) => <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>{arr(items).map(o => <Tag key={o} active={active}>{o}</Tag>)}</div>;

function SectionLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink-3)', fontFamily:F, whiteSpace:'nowrap' }}>{children}</span>
      <div style={{ flex:1, height:1, background:BORDER }} />
    </div>
  );
}
const FieldLabel = ({ children }) => <span style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--ink-3)', fontFamily:F, marginBottom:8 }}>{children}</span>;
const Stat = ({ value, label }) => (
  <div>
    <div style={{ fontSize:22, fontWeight:700, color:'var(--ink)', fontFamily:FD, lineHeight:1, marginBottom:5 }}>{value}</div>
    <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', lineHeight:1.35 }}>{label}</div>
  </div>
);
const Big = ({ children }) => <span style={{ fontSize:22, fontWeight:700, fontFamily:FD, color:'var(--ink)' }}>{children}</span>;
const CARD = { background:'var(--surface)', borderRadius:'var(--r)', border:`1px solid ${BORDER}`, boxShadow:'var(--sh-1)', padding:'26px 28px' };

function Avatar({ name, url, sz = 80 }) {
  const initial = (name || 'I').trim().charAt(0).toUpperCase();
  return url
    ? <img src={url} alt={name||'Investor'} style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover' }}/>
    : <div style={{ width:sz, height:sz, borderRadius:'50%', background:'var(--ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:sz*0.4, fontWeight:800, fontFamily:FD }}>{initial}</div>;
}

// The investor's own profile, reachable from the deal-flow dashboard ("My profile").
// Matches the Figma investor-profile design: hero + stat strip, scroll-spy section tabs,
// and Thesis / Focus / Style / Credentials / Value-Add cards. Self view → Edit button,
// no "pitch" CTA. Every block is omitted when its onboarding answer is blank.
export default function InvestorProfile({ user, onBack, onHome, onEdit }) {
  const [prof, setProf] = useState(null);
  const [p, setP] = useState(null);          // investor_profile blob
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('thesis');

  useEffect(() => {
    if (!user) return undefined;
    let on = true;
    Promise.all([fetchProfile(user.id), getInvestorProfile(user.id)])
      .then(([pr, ip]) => { if (on) { setProf(pr); setP(ip); } })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [user]);

  // Scroll-spy: highlight the section nearest the top.
  useEffect(() => {
    const onScroll = () => {
      const near = SECTIONS
        .map(({ id }) => { const el = document.getElementById(`ip-${id}`); return el ? { id, d: Math.abs(el.getBoundingClientRect().top - 120) } : { id, d: Infinity }; })
        .reduce((a, b) => (a.d < b.d ? a : b));
      setActive(near.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [p]);

  const scrollTo = (id) => {
    const el = document.getElementById(`ip-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  };

  const name = p?.fullName || prof?.name || user?.user_metadata?.name || 'Investor';
  const avatar = prof?.avatar_url || user?.user_metadata?.avatar_url || null;
  const role = [p?.investorType, p?.firm].filter(Boolean).join(' · ');
  const navBtn = { background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:'var(--t-sm)', fontWeight:600, whiteSpace:'nowrap', color:'var(--ink-2)' };

  const stats = p ? [
    has(p.yearsInvesting) && { value: p.yearsInvesting, label: 'Investing for' },
    has(p.aum) && { value: p.aum, label: 'Assets under mgmt' },
    has(p.companiesBacked) && { value: p.companiesBacked, label: 'Companies backed' },
    has(p.decisionSpeed) && { value: p.decisionSpeed, label: 'Decision speed' },
  ].filter(Boolean) : [];

  const showThesis = p && (has(p.thesis) || has(p.antiThesis));
  const showFocus = p && (has(p.sectors) || has(p.businessModels) || has(p.geographies) || has(p.dealBreakers));
  const showStyle = p && (has(p.typicalTicket) || has(p.followOn) || has(p.leadOrFollow) || has(p.decisionSpeed) || has(p.stagesYouBack));
  const showCred = p && (has(p.background) || has(p.aum) || has(p.companiesBacked) || has(p.notableExits));
  const showValue = p && (has(p.whatYouBring) || has(p.postInvestment) || has(p.boardSeats) || has(p.preferredApproach));
  const visibleTabs = SECTIONS.filter(s => ({ thesis:showThesis, focus:showFocus, style:showStyle, credentials:showCred, value:showValue }[s.id]));

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:F }}>
      <style>{`@media (max-width:680px){ .ip-2{grid-template-columns:1fr!important} .ip-4{grid-template-columns:1fr 1fr!important} }`}</style>

      {/* Sticky top bar */}
      <header style={{ position:'sticky', top:0, zIndex:30, background:'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter:'blur(8px)', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ maxWidth:1060, margin:'0 auto', height:52, padding:'0 clamp(14px,4vw,24px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <button onClick={onBack} style={navBtn}>← Dashboard</button>
          <button onClick={onHome} style={{ ...navBtn, fontFamily:SERIF, fontSize:14, fontWeight:600, letterSpacing:'.8px', textTransform:'uppercase', color:'var(--ink)' }}>Startup Oracle</button>
          <button onClick={() => onEdit(p)} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'var(--t-sm)', fontWeight:700, color:'#fff', background:'var(--accent)', padding:'7px 16px', borderRadius:'var(--r-pill)', border:'none', cursor:'pointer', fontFamily:F }}>✎ Edit profile</button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding:80, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading your profile…</div>
      ) : (
        <>
          {/* Hero */}
          <div style={{ background:'var(--surface)', borderBottom:`1px solid ${BORDER}` }}>
            <div style={{ maxWidth:1060, margin:'0 auto', padding:'34px clamp(14px,4vw,24px) 0' }}>
              <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
                <Avatar name={name} url={avatar} sz={80}/>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <h1 style={{ fontFamily:FD, fontSize:26, fontWeight:800, color:'var(--ink)', margin:0, letterSpacing:'var(--tracking-tight)', lineHeight:1.15 }}>{name}</h1>
                      {role && <p style={{ margin:'3px 0 0', fontSize:15, color:'var(--ink-2)', fontWeight:500 }}>{role}</p>}
                      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'6px 18px', marginTop:12 }}>
                        {has(p?.location) && <span style={{ fontSize:13, color:'var(--ink-3)' }}>📍 {p.location}</span>}
                        {has(p?.linkedin) && <a href={toUrl(p.linkedin)} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--ink-2)', textDecoration:'none', fontWeight:600 }}>in /{cleanUrl(p.linkedin).split('/').pop()} ↗</a>}
                        {has(p?.website) && <a href={toUrl(p.website)} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--ink-2)', textDecoration:'none', fontWeight:600 }}>{cleanUrl(p.website)} ↗</a>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {has(p?.investorType) && <Tag active>{p.investorType}</Tag>}
                      {has(p?.stagesYouBack) && <Tag>{arr(p.stagesYouBack).slice(0,2).join(' · ')}{arr(p.stagesYouBack).length>2?' …':''}</Tag>}
                    </div>
                  </div>

                  {stats.length > 0 && (
                    <div className="ip-4" style={{ display:'grid', gridTemplateColumns:`repeat(${stats.length},1fr)`, gap:'14px 24px', marginTop:24, paddingTop:20, paddingBottom:24, borderTop:`1px solid ${BORDER}` }}>
                      {stats.map(s => <Stat key={s.label} value={s.value} label={s.label}/>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Section tabs */}
              {visibleTabs.length > 0 && (
                <nav style={{ display:'flex', gap:0, overflowX:'auto', borderTop:`1px solid ${BORDER}` }}>
                  {visibleTabs.map(({ id, label }) => (
                    <button key={id} onClick={() => scrollTo(id)}
                      style={{ padding:'13px 16px', fontSize:13, fontWeight:600, whiteSpace:'nowrap', background:'none', border:'none', cursor:'pointer', fontFamily:F, borderBottom: active===id ? '2px solid var(--accent)' : '2px solid transparent', color: active===id ? 'var(--accent)' : 'var(--ink-3)' }}>
                      {label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Body */}
          <main style={{ maxWidth:1060, margin:'0 auto', padding:'24px clamp(14px,4vw,24px) 80px', display:'flex', flexDirection:'column', gap:14 }}>
            {!p?.completed && (
              <div style={{ ...CARD, textAlign:'center', padding:'40px 28px' }}>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Your investor profile isn't set up yet</div>
                <div style={{ fontSize:13.5, color:'var(--ink-2)', marginBottom:18, lineHeight:1.55 }}>Complete the short onboarding so founders can see your thesis, focus and check size before they pitch you.</div>
                <button onClick={() => onEdit(p)} style={{ padding:'11px 24px', borderRadius:'var(--r)', background:'var(--ink)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>Set up my profile →</button>
              </div>
            )}

            {showThesis && (
              <section id="ip-thesis" style={CARD}>
                <SectionLabel>Investment Thesis</SectionLabel>
                {has(p.thesis) && <p style={{ fontSize:17, color:'var(--ink)', lineHeight:1.7, fontFamily:FD, fontWeight:500, margin:0 }}>&ldquo;{p.thesis}&rdquo;</p>}
                {has(p.antiThesis) && (
                  <div style={{ marginTop: has(p.thesis)?22:0, paddingTop: has(p.thesis)?20:0, borderTop: has(p.thesis)?`1px solid ${BORDER}`:'none' }}>
                    <FieldLabel>What they don't invest in</FieldLabel>
                    <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.6, margin:0 }}>{p.antiThesis}</p>
                  </div>
                )}
              </section>
            )}

            {showFocus && (
              <section id="ip-focus" style={CARD}>
                <SectionLabel>Where They Focus</SectionLabel>
                <div className="ip-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'26px 40px' }}>
                  {has(p.sectors) && <div><FieldLabel>Sectors</FieldLabel><TagRow items={p.sectors} active/></div>}
                  {has(p.businessModels) && <div><FieldLabel>Business models</FieldLabel><TagRow items={p.businessModels}/></div>}
                  {has(p.geographies) && <div><FieldLabel>Geographies</FieldLabel><TagRow items={p.geographies}/></div>}
                  {has(p.dealBreakers) && <div><FieldLabel>Deal-breakers</FieldLabel><TagRow items={p.dealBreakers}/></div>}
                </div>
              </section>
            )}

            {showStyle && (
              <section id="ip-style" style={CARD}>
                <SectionLabel>How They Invest</SectionLabel>
                <div className="ip-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'20px 24px' }}>
                  {has(p.typicalTicket) && <div><FieldLabel>Typical ticket</FieldLabel><Big>{p.typicalTicket}</Big></div>}
                  {has(p.followOn) && <div><FieldLabel>Follow-on reserves</FieldLabel><Big>{p.followOn}</Big></div>}
                  {has(p.leadOrFollow) && <div><FieldLabel>Lead or follow</FieldLabel><Big>{p.leadOrFollow}</Big></div>}
                  {has(p.decisionSpeed) && <div><FieldLabel>Decision speed</FieldLabel><Big>{p.decisionSpeed}</Big></div>}
                </div>
                {has(p.stagesYouBack) && (
                  <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${BORDER}` }}>
                    <FieldLabel>Stages</FieldLabel>
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
                      {STAGE_SPECTRUM.map(s => <Tag key={s} active={arr(p.stagesYouBack).includes(s)}>{s}</Tag>)}
                      <span style={{ fontSize:11, color:'var(--ink-3)', marginLeft:4, fontWeight:500 }}>Highlighted = stages they back</span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {(showCred || showValue) && (
              <div className="ip-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {showCred && (
                  <section id="ip-credentials" style={CARD}>
                    <SectionLabel>Credentials</SectionLabel>
                    {has(p.background) && <div><FieldLabel>Background</FieldLabel><TagRow items={p.background}/></div>}
                    {(has(p.aum) || has(p.companiesBacked)) && (
                      <div style={{ marginTop: has(p.background)?20:0, paddingTop: has(p.background)?20:0, borderTop: has(p.background)?`1px solid ${BORDER}`:'none', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                        {has(p.aum) && <div><FieldLabel>AUM</FieldLabel><Big>{p.aum}</Big></div>}
                        {has(p.companiesBacked) && <div><FieldLabel>Companies backed</FieldLabel><Big>{p.companiesBacked}</Big></div>}
                      </div>
                    )}
                    {has(p.notableExits) && (
                      <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${BORDER}` }}>
                        <FieldLabel>Notable exits</FieldLabel>
                        <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55, margin:0 }}>{p.notableExits}</p>
                      </div>
                    )}
                  </section>
                )}
                {showValue && (
                  <section id="ip-value" style={CARD}>
                    <SectionLabel>Value-Add</SectionLabel>
                    {has(p.whatYouBring) && <div><FieldLabel>Beyond capital</FieldLabel><TagRow items={p.whatYouBring}/></div>}
                    {has(p.postInvestment) && <div style={{ marginTop: has(p.whatYouBring)?18:0, paddingTop: has(p.whatYouBring)?18:0, borderTop: has(p.whatYouBring)?`1px solid ${BORDER}`:'none' }}><FieldLabel>Post-investment involvement</FieldLabel><p style={{ fontSize:13.5, color:'var(--ink-2)', margin:0 }}>{p.postInvestment}</p></div>}
                    {has(p.boardSeats) && <div style={{ marginTop:18, paddingTop:18, borderTop:`1px solid ${BORDER}` }}><FieldLabel>Board seats</FieldLabel><p style={{ fontSize:13.5, color:'var(--ink-2)', margin:0 }}>{p.boardSeats}</p></div>}
                    {has(p.preferredApproach) && <div style={{ marginTop:18, paddingTop:18, borderTop:`1px solid ${BORDER}` }}><FieldLabel>Preferred way to be approached</FieldLabel><TagRow items={p.preferredApproach}/></div>}
                  </section>
                )}
              </div>
            )}

            {p?.completed && (
              <p style={{ textAlign:'center', fontSize:12.5, color:'var(--ink-3)', margin:'8px 0 0' }}>This is how founders see your profile when you appear in their deal-flow.</p>
            )}
          </main>
        </>
      )}
    </div>
  );
}
