import { useState, useEffect } from 'react';
import { getInvestorProfile, fetchProfile } from './communityDB';
import InvestorProfileSections from './InvestorProfileSections';

const SERIF = "var(--font-serif)";
const F = "var(--font)";
const FD = "var(--font-display)";

// Initials avatar fallback (the community uses one too; kept local to avoid importing Community).
function Avatar({ name, url }) {
  const initial = (name || 'I').trim().charAt(0).toUpperCase();
  return url
    ? <img src={url} alt={name||'Investor'} style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--surface)', boxShadow:'var(--sh-1)' }}/>
    : <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:800, fontFamily:FD, border:'3px solid var(--surface)' }}>{initial}</div>;
}

// The investor's OWN profile page, reachable from the deal-flow dashboard ("My profile").
// Shows their onboarding answers (InvestorProfileSections, self mode) with identity + an Edit
// button that re-opens the onboarding wizard pre-filled. Degrades gracefully pre-migration.
export default function InvestorProfile({ user, onBack, onHome, onEdit }) {
  const [prof, setProf] = useState(null);
  const [invProfile, setInvProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return undefined;   // parent only mounts this with a session
    let on = true;
    Promise.all([fetchProfile(user.id), getInvestorProfile(user.id)])
      .then(([p, ip]) => { if (on) { setProf(p); setInvProfile(ip); } })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [user]);

  const name = invProfile?.fullName || prof?.name || user?.user_metadata?.name || 'Investor';
  const avatar = prof?.avatar_url || user?.user_metadata?.avatar_url || null;
  const subtitle = [invProfile?.firm, invProfile?.location].filter(Boolean).join(' · ');
  const navBtn = { background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:'var(--t-sm)', fontWeight:600, whiteSpace:'nowrap', color:'var(--ink-2)' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:F }}>
      <header style={{ position:'sticky', top:0, zIndex:20, background:'var(--surface)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:1060, margin:'0 auto', height:60, padding:'0 clamp(14px,4vw,28px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <button onClick={onHome} style={{ ...navBtn, fontFamily:SERIF, fontSize:'clamp(14px,3.6vw,18px)', fontWeight:600, letterSpacing:'clamp(.4px,1vw,1.4px)', textTransform:'uppercase', color:'var(--ink)' }}>Startup Oracle</button>
          <button onClick={onBack} style={navBtn}>← Dashboard</button>
        </div>
      </header>

      <main style={{ maxWidth:880, margin:'0 auto', padding:'clamp(18px,4vw,32px) clamp(14px,4vw,24px) 80px', display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading your profile…</div>
        ) : (
          <>
            {/* Identity card */}
            <div style={{ background:'var(--surface)', borderRadius:'var(--r)', border:'1px solid var(--line)', boxShadow:'var(--sh-1)', overflow:'hidden' }}>
              <div style={{ height:96, background:'var(--ink)' }}/>
              <div style={{ padding:'0 26px 22px', position:'relative' }}>
                <div style={{ position:'absolute', top:-40 }}><Avatar name={name} url={avatar}/></div>
                <div style={{ paddingTop:50, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <h1 style={{ fontFamily:FD, fontSize:24, fontWeight:800, color:'var(--ink)', margin:0, letterSpacing:'var(--tracking-tight)' }}>{name}</h1>
                      <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.6px', textTransform:'uppercase', padding:'4px 9px', borderRadius:'var(--r-pill)', background:'var(--accent-weak)', color:'var(--accent)' }}>Investor</span>
                    </div>
                    {subtitle && <div style={{ fontSize:14, color:'var(--ink-2)', marginTop:4 }}>{subtitle}</div>}
                  </div>
                  <button onClick={() => onEdit(invProfile)} style={{ flexShrink:0, padding:'9px 20px', borderRadius:'var(--r-pill)', border:'1.5px solid var(--line)', background:'transparent', color:'var(--ink)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>✎ Edit profile</button>
                </div>
              </div>
            </div>

            {invProfile?.completed
              ? <InvestorProfileSections profile={invProfile} name={name} isSelf={true} onPitch={null}/>
              : (
                <div style={{ background:'var(--surface)', borderRadius:'var(--r)', border:'1px solid var(--line)', boxShadow:'var(--sh-1)', padding:'36px 28px', textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Your investor profile isn't set up yet</div>
                  <div style={{ fontSize:13.5, color:'var(--ink-2)', marginBottom:18, lineHeight:1.55 }}>Complete the short onboarding so founders can see your thesis, focus and check size before they pitch you.</div>
                  <button onClick={() => onEdit(invProfile)} style={{ padding:'11px 24px', borderRadius:'var(--r)', background:'var(--ink)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>Set up my profile →</button>
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}
