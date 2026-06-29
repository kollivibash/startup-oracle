import { useState, useEffect, useMemo } from 'react';
import { fetchPitches } from './communityDB';

const INK = '#0A0A0F';
const SERIF = "'Cormorant Garamond', Georgia, serif";   // wordmark only
const SANS = "'DM Sans', system-ui, sans-serif";
const DISPLAY = "var(--font-display)";
const ACCENT = '#2563eb';

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

function Avatar({ name, id, url, sz=44 }) {
  if (url) return <img src={url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>;
  return (
    <div style={{ width:sz, height:sz, borderRadius:'50%', background:avColor(id), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:sz*0.36, flexShrink:0, fontFamily:SANS }}>
      {initials(name)}
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:'rgba(0,0,0,.05)', fontSize:11.5, fontWeight:600, color:'rgba(0,0,0,.6)' }}>
      {label && <span style={{ color:'rgba(0,0,0,.4)' }}>{label}</span>}{value}
    </span>
  );
}

function PitchCard({ post, onOpen }) {
  const a = post.author || {};
  const m = post.meta || {};
  const body = (post.body || '').trim();
  const excerpt = body.length > 180 ? body.slice(0,180)+'…' : body;
  const docs = (post.media || []).length;
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,.1)', borderRadius:14, padding:18, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <Avatar name={a.name} id={post.user_id} url={a.avatar_url} sz={42}/>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name || 'Founder'}</div>
          <div style={{ fontSize:12, color:'rgba(0,0,0,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headlineOf(a) || 'Founder'} · {timeAgo(post.created_at)}</div>
        </div>
      </div>

      <div>
        <div style={{ fontFamily:DISPLAY, fontSize:17, fontWeight:800, letterSpacing:'-0.3px', color:'rgba(0,0,0,.92)', lineHeight:1.25, marginBottom:6 }}>{post.title || 'Untitled pitch'}</div>
        {excerpt && <p style={{ margin:0, fontSize:13.5, lineHeight:1.6, color:'rgba(0,0,0,.66)', whiteSpace:'pre-line' }}>{excerpt}</p>}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {m.amount && <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 11px', borderRadius:99, background:'rgba(37,99,235,.08)', border:'1px solid rgba(37,99,235,.22)', fontSize:11.5, fontWeight:700, color:'#1d4ed8' }}>Raising {m.amount}{m.equity?` · ${m.equity}`:''}</span>}
        {m.category && <Chip value={m.category}/>}
        {m.stage && <Chip value={m.stage}/>}
        {docs > 0 && <Chip value={`📎 ${docs} file${docs!==1?'s':''}`}/>}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:2 }}>
        <button onClick={()=>onOpen(post.id)}
          style={{ padding:'8px 18px', borderRadius:99, background:INK, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:SANS }}>
          View &amp; message →
        </button>
        {m.website && <a href={m.website.startsWith('http')?m.website:`https://${m.website}`} target="_blank" rel="noreferrer noopener"
          style={{ fontSize:12.5, fontWeight:600, color:ACCENT, textDecoration:'none' }}>Visit site ↗</a>}
      </div>
    </div>
  );
}

export default function Invest({ user, onHome, onAccount, onSignIn, onOpenPitch, onSwitchToFounder }) {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPitches().then(rows => { if (alive) { setPitches(rows); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Build filter chips from the categories actually present in the deal-flow.
  const categories = useMemo(() => {
    const set = new Set(pitches.map(p => p.meta?.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [pitches]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pitches.filter(p => {
      if (cat !== 'All' && p.meta?.category !== cat) return false;
      if (!needle) return true;
      return `${p.title||''} ${p.body||''} ${p.author?.name||''} ${p.meta?.category||''}`.toLowerCase().includes(needle);
    });
  }, [pitches, cat, q]);

  const chipStyle = active => ({ padding:'6px 14px', borderRadius:99, border:'1px solid', borderColor: active?INK:'rgba(0,0,0,.15)', background: active?INK:'#fff', color: active?'#fff':'rgba(0,0,0,.6)', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:SANS, whiteSpace:'nowrap' });

  return (
    <div style={{ minHeight:'100vh', background:'#f1f3f5', color:INK, fontFamily:SANS }}>
      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'#fff', borderBottom:'1px solid rgba(0,0,0,.08)' }}>
        <div style={{ maxWidth:1040, margin:'0 auto', height:60, padding:'0 clamp(16px,4vw,28px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <span onClick={onHome} style={{ fontFamily:SERIF, fontSize:18, fontWeight:600, letterSpacing:'1.4px', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' }}>Startup Oracle</span>
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.6px', textTransform:'uppercase', padding:'3px 9px', borderRadius:99, background:'rgba(37,99,235,.1)', color:'#1d4ed8' }}>Investor</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {onSwitchToFounder && <span onClick={onSwitchToFounder} style={{ fontSize:13, color:'rgba(0,0,0,.55)', fontWeight:600, cursor:'pointer' }}>I'm a founder</span>}
            {user
              ? <span onClick={onAccount} style={{ fontSize:13, color:INK, fontWeight:600, cursor:'pointer' }}>Account</span>
              : <span onClick={onSignIn} style={{ fontSize:13, color:INK, fontWeight:600, cursor:'pointer' }}>Sign in</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1040, margin:'0 auto', padding:'clamp(20px,4vw,36px) clamp(16px,4vw,28px) 64px' }}>
        {/* Hero */}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(26px,4vw,38px)', fontWeight:800, letterSpacing:'-0.8px', margin:'0 0 8px' }}>Deal-flow</h1>
          <p style={{ fontSize:14, color:'rgba(0,0,0,.5)', margin:0, lineHeight:1.7 }}>
            {loading ? 'Loading founder pitches…' : `${pitches.length} ${pitches.length===1?'pitch':'pitches'} from founders raising right now. Open one to read the deck and message the founder.`}
          </p>
        </div>

        {/* Search + filters */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:22 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search pitches, founders, categories…"
            style={{ width:'100%', height:42, borderRadius:10, padding:'0 14px', fontSize:14, border:'1px solid rgba(0,0,0,.14)', background:'#fff', outline:'none', fontFamily:SANS, boxSizing:'border-box' }}/>
          {categories.length > 1 && (
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
              {categories.map(c => <button key={c} onClick={()=>setCat(c)} style={chipStyle(cat===c)}>{c}</button>)}
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height:210, borderRadius:14 }}/>)}
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'64px 20px', background:'#fff', border:'1px dashed rgba(0,0,0,.14)', borderRadius:14 }}>
            <div style={{ fontSize:34, marginBottom:10 }}>💡</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>{pitches.length === 0 ? 'No pitches yet' : 'No matches'}</div>
            <p style={{ fontSize:13.5, color:'rgba(0,0,0,.5)', maxWidth:380, margin:'0 auto', lineHeight:1.65 }}>
              {pitches.length === 0
                ? 'Founders haven’t pitched yet. Check back soon — or switch to the founder side and post the first one.'
                : 'Try a different category or search term.'}
            </p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {shown.map(p => <PitchCard key={p.id} post={p} onOpen={onOpenPitch}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
