import { useState, useEffect, useMemo } from 'react';
import { fetchPitches } from './communityDB';

const SERIF = "var(--font-serif)";   // wordmark only
const SANS = "var(--font)";
const DISPLAY = "var(--font-display)";

const AV_COLORS = ['#0f172a','#1f2937','#334155','#374151','#475569','#111827','#1e293b','#3f3f46'];
const avColor = id => AV_COLORS[(String(id||'?').split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AV_COLORS.length];
const initials = name => (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const headlineOf = p => {
  const bio = (p?.bio||'').trim(); if (bio) return bio;
  const role = (p?.role||'').trim(), company = (p?.company||'').trim();
  if (role && company) return `${role} at ${company}`;
  return role || company || '';
};
const timeAgo = d => {
  const s = Math.floor((Date.now() - new Date(d).getTime())/1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  if (s < 604800) return `${Math.floor(s/86400)}d`;
  return new Date(d).toLocaleDateString('en-IN',{month:'short',day:'numeric'});
};

// ── Monochrome line icons ──
const I = ({ size=16, sw=1.7, children }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const SearchIcon = () => <I><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></I>;
const TagIcon    = () => <I size={13}><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></I>;
const LayersIcon = () => <I size={13}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></I>;
const ClipIcon   = () => <I size={13}><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></I>;

function Avatar({ name, id, url, sz=42 }) {
  if (url) return <img src={url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>;
  return (
    <div aria-hidden="true" style={{ width:sz, height:sz, borderRadius:'50%', background:avColor(id), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:sz*0.36, flexShrink:0, fontFamily:SANS }}>
      {initials(name)}
    </div>
  );
}

const metaChip = { display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--r-pill)', background:'rgba(15,23,42,.05)', fontSize:'var(--t-xs)', fontWeight:600, color:'var(--ink-2)' };

function PitchCard({ post, onOpen, onViewFounder }) {
  const a = post.author || {};
  const m = post.meta || {};
  const body = (post.body || '').trim();
  const excerpt = body.length > 170 ? body.slice(0,170)+'…' : body;
  const docs = (post.media || []).length;
  const title = post.title || 'Untitled pitch';
  const viewFounder = onViewFounder ? () => onViewFounder(post.user_id) : undefined;
  return (
    <article style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--r-lg)', padding:20, display:'flex', flexDirection:'column', gap:13, boxShadow:'var(--sh-1)', transition:'box-shadow .2s var(--ease), transform .2s var(--ease)' }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow='var(--sh-2)'; e.currentTarget.style.transform='translateY(-3px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow='var(--sh-1)'; e.currentTarget.style.transform='none'; }}>
      <div onClick={viewFounder} style={{ display:'flex', gap:11, alignItems:'center', cursor: viewFounder ? 'pointer' : 'default' }}
        title={viewFounder ? `View ${a.name||'founder'}'s profile` : undefined}>
        <Avatar name={a.name} id={post.user_id} url={a.avatar_url} sz={44}/>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'var(--t-sm)', fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name || 'Founder'}</div>
          <div style={{ fontSize:'var(--t-xs)', color:'var(--ink-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headlineOf(a) || 'Founder'} · {timeAgo(post.created_at)}</div>
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily:DISPLAY, fontSize:'var(--t-md)', fontWeight:800, letterSpacing:'var(--tracking-tight)', color:'var(--ink)', lineHeight:'var(--lh-snug)', margin:'0 0 6px' }}>{title}</h3>
        {excerpt && <p style={{ margin:0, fontSize:'var(--t-sm)', lineHeight:'var(--lh)', color:'var(--ink-2)', whiteSpace:'pre-line' }}>{excerpt}</p>}
      </div>

      {m.amount && (
        <div style={{ display:'inline-flex', alignItems:'baseline', gap:7, padding:'8px 14px', borderRadius:'var(--r)', background:'var(--accent-weak)', border:'1px solid rgba(37,99,235,.22)', alignSelf:'flex-start' }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', color:'var(--accent)', opacity:.85 }}>Raising</span>
          <span style={{ fontFamily:DISPLAY, fontSize:'var(--t-md)', fontWeight:800, color:'var(--accent)' }}>{m.amount}</span>
          {m.equity && <span style={{ fontSize:'var(--t-xs)', fontWeight:600, color:'var(--accent)', opacity:.8 }}>for {m.equity}</span>}
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {m.category && <span style={metaChip}><TagIcon/>{m.category}</span>}
        {m.stage && <span style={metaChip}><LayersIcon/>{m.stage}</span>}
        {docs > 0 && <span style={metaChip}><ClipIcon/>{docs} file{docs!==1?'s':''}</span>}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:2, paddingTop:13, borderTop:'1px solid var(--line)' }}>
        <button onClick={()=>onOpen(post.id)} aria-label={`View and message about “${title}”`}
          style={{ padding:'9px 18px', borderRadius:'var(--r)', background:'var(--ink)', color:'#fff', border:'none', fontSize:'var(--t-sm)', fontWeight:700, cursor:'pointer', fontFamily:SANS, display:'inline-flex', alignItems:'center', gap:7 }}>
          View &amp; message <span aria-hidden="true">→</span>
        </button>
        {m.website && <a href={m.website.startsWith('http')?m.website:`https://${m.website}`} target="_blank" rel="noreferrer noopener"
          style={{ fontSize:'var(--t-sm)', fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>Visit site ↗</a>}
      </div>
    </article>
  );
}

export default function Invest({ user, onHome, onAccount, onSignIn, onOpenPitch, onViewFounder, onSwitchToFounder, onMyProfile }) {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');

  useEffect(() => {
    let alive = true;
    fetchPitches().then(rows => { if (alive) { setPitches(rows); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(pitches.map(p => p.meta?.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [pitches]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = pitches.filter(p => {
      if (cat !== 'All' && p.meta?.category !== cat) return false;
      if (!needle) return true;
      return `${p.title||''} ${p.body||''} ${p.author?.name||''} ${p.meta?.category||''}`.toLowerCase().includes(needle);
    });
    list.sort((a,b)=> sort==='new'
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [pitches, cat, q, sort]);

  const chipStyle = active => ({ padding:'7px 15px', borderRadius:'var(--r-pill)', border:'1px solid', borderColor: active?'var(--ink)':'var(--line)', background: active?'var(--ink)':'var(--surface)', color: active?'#fff':'var(--ink-2)', fontSize:'var(--t-sm)', fontWeight:700, cursor:'pointer', fontFamily:SANS, whiteSpace:'nowrap' });
  const navBtn = { background:'none', border:'none', cursor:'pointer', fontFamily:SANS, fontSize:'var(--t-sm)', fontWeight:600, whiteSpace:'nowrap' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:SANS }}>
      <style>{`@media (max-width:480px){ .inv-badge{display:none} }`}</style>
      {/* Top bar */}
      <header style={{ position:'sticky', top:0, zIndex:20, background:'var(--surface)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:1060, margin:'0 auto', height:60, padding:'0 clamp(14px,4vw,28px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
            <button onClick={onHome} style={{ ...navBtn, fontFamily:SERIF, fontSize:'clamp(14px,3.6vw,18px)', fontWeight:600, letterSpacing:'clamp(.4px,1vw,1.4px)', textTransform:'uppercase', color:'var(--ink)' }}>Startup Oracle</button>
            <span className="inv-badge" style={{ fontSize:10, fontWeight:800, letterSpacing:'.6px', textTransform:'uppercase', padding:'4px 9px', borderRadius:'var(--r-pill)', background:'var(--accent-weak)', color:'var(--accent)', flexShrink:0 }}>Investor</span>
          </div>
          <nav style={{ display:'flex', alignItems:'center', gap:'clamp(12px,3vw,18px)', flexShrink:0 }}>
            {onSwitchToFounder && <button onClick={onSwitchToFounder} style={{ ...navBtn, color:'var(--ink-2)' }}>Founder view</button>}
            {user && onMyProfile && <button onClick={onMyProfile} style={{ ...navBtn, color:'var(--ink)' }}>My profile</button>}
            {user
              ? <button onClick={onAccount} style={{ ...navBtn, color:'var(--ink-2)' }}>Account</button>
              : <button onClick={onSignIn} style={{ ...navBtn, color:'var(--ink)' }}>Sign in</button>}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth:1060, margin:'0 auto', padding:'clamp(22px,4vw,36px) clamp(16px,4vw,28px) 64px' }}>
        {/* Hero */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>Deal-flow</div>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(26px,4vw,38px)', fontWeight:800, letterSpacing:'var(--tracking-tight)', lineHeight:'var(--lh-tight)', margin:'0 0 8px' }}>Founder pitches</h1>
          <p style={{ fontSize:'var(--t-base)', color:'var(--ink-2)', margin:0, lineHeight:'var(--lh)', maxWidth:560 }}>
            {loading ? 'Loading founder pitches…' : `${pitches.length} ${pitches.length===1?'founder is':'founders are'} raising right now. Open one to read the deck and message the founder.`}
          </p>
        </div>

        {/* Search + filters toolbar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24 }}>
          <div style={{ position:'relative' }}>
            <label htmlFor="pitch-search" className="sr-only">Search pitches, founders, or categories</label>
            <span aria-hidden="true" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)', display:'flex' }}><SearchIcon/></span>
            <input id="pitch-search" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search pitches, founders, categories…"
              style={{ width:'100%', height:46, borderRadius:'var(--r)', padding:'0 14px 0 42px', fontSize:'var(--t-base)', border:'1px solid var(--line)', background:'var(--surface)', outline:'none', fontFamily:SANS, boxSizing:'border-box', color:'var(--ink)' }}/>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
            {categories.length > 1 ? (
              <div role="group" aria-label="Filter by category" style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2, flex:1, minWidth:0 }}>
                {categories.map(c => <button key={c} onClick={()=>setCat(c)} aria-pressed={cat===c} style={chipStyle(cat===c)}>{c}</button>)}
              </div>
            ) : <span/>}
            {!loading && pitches.length > 0 && (
              <label style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:'var(--t-sm)', color:'var(--ink-2)', whiteSpace:'nowrap' }}>
                Sort
                <select value={sort} onChange={e=>setSort(e.target.value)} style={{ fontFamily:SANS, fontSize:'var(--t-sm)', fontWeight:600, color:'var(--ink)', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'7px 10px', background:'var(--surface)', cursor:'pointer' }}>
                  <option value="new">Newest first</option>
                  <option value="old">Oldest first</option>
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:18 }}>
            {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height:230, borderRadius:'var(--r-lg)' }}/>)}
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'64px 24px', background:'var(--surface)', border:'1px dashed var(--line)', borderRadius:'var(--r-lg)' }}>
            <div aria-hidden="true" style={{ fontSize:34, marginBottom:12 }}>💡</div>
            <h2 style={{ fontFamily:DISPLAY, fontSize:'var(--t-lg)', fontWeight:800, margin:'0 0 8px' }}>{pitches.length === 0 ? 'No pitches yet' : 'No matches'}</h2>
            <p style={{ fontSize:'var(--t-sm)', color:'var(--ink-2)', maxWidth:400, margin:'0 auto 18px', lineHeight:'var(--lh)' }}>
              {pitches.length === 0
                ? 'Founders haven’t pitched yet. Check back soon — or switch to the founder side and post the first one.'
                : 'Try a different category or search term.'}
            </p>
            {pitches.length === 0 && onSwitchToFounder && (
              <button onClick={onSwitchToFounder} style={{ padding:'11px 22px', borderRadius:'var(--r)', background:'var(--ink)', color:'#fff', border:'none', fontSize:'var(--t-sm)', fontWeight:700, cursor:'pointer', fontFamily:SANS }}>
                Switch to founder side
              </button>
            )}
          </div>
        ) : (
          <>
            <div aria-live="polite" className="sr-only">{shown.length} pitches shown</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:18 }}>
              {shown.map(p => <PitchCard key={p.id} post={p} onOpen={onOpenPitch} onViewFounder={onViewFounder}/>)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
