import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchPosts, fetchPostById, createPost, deletePost, ratePost, uploadPostFile, fetchSuggestions, addSuggestion, likeSuggestion, fetchFollowState, setFollow, fetchFollowList, fetchFollowCounts, fetchFollowRequests, respondFollowRequest, fetchRatingsReceived, fetchConversations, sendMessage, markConversationRead, toggleMessageReaction, setMessageDeletedFor, setMessageDeleted, subscribeToMessages, subscribeTyping, subscribeToCommunity, subscribeToInbox, subscribeToThread, fetchProfile, createNotification, fetchNotifications, markNotificationsRead, fetchSavedPosts, setSavedPost, repost as repostPost, updateProfile, syncAuthMeta, uploadProfileImage, recordProfileView, fetchProfileViewers, fetchPeopleYouMayKnow, votePoll, unfurlLink, fetchMutualFollowers, fetchMutualFollowersBatch } from "./communityDB";
import { fetchVerifiedIds } from "./billingDB";

const F = "'DM Sans',system-ui,sans-serif";
const BG = '#f1f3f5';
// Brand palette — black & white minimal (constant names kept to limit churn)
const GREEN = '#0f172a';            // primary accent (monochrome ink)
const GREEN_SOFT = 'rgba(0,0,0,.06)';
const INK = '#0f172a';
const AV_COLORS = ['#0f172a','#1f2937','#334155','#374151','#475569','#111827','#1e293b','#0a0a0a','#3f3f46'];
const avColor = id => AV_COLORS[(String(id).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AV_COLORS.length];
const coverOf = () => `linear-gradient(135deg, #1f2937 0%, #0f172a 100%)`;
const initials = name => (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const timeAgo = d => {
  const s = Math.floor((Date.now() - new Date(d).getTime())/1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  if (s < 604800) return `${Math.floor(s/86400)}d`;
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});
};
const nameOf = u => u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'You';
const headlineOf = p => p?.bio || 'Founder · Startup Oracle';
// DB stores 0.5–5.0 (half-star schema); UI shows a 1–10 scale
const to10 = v => Math.round(Number(v) * 2);
const avg10 = ratings => ratings?.length ? (ratings.reduce((a,r)=>a+Number(r.value),0)/ratings.length)*2 : 0;

const card = { background:'#fff', borderRadius:10, border:'1px solid rgba(0,0,0,.08)', boxShadow:'0 1px 2px rgba(0,0,0,.04)' };

// Top-nav line icons
const NAV_ICONS = {
  home: 'M3 11.2 12 4l9 7.2M5.5 9.8V20h13V9.8',
  network: 'M9 11a3 3 0 100-6 3 3 0 000 6Zm7.5 0a2.5 2.5 0 100-5M3 19a6 6 0 0112 0m2.5-.5a5.5 5.5 0 00-3.5-5',
  openings: 'M4 8.5h16V20H4zM9 8.5V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v2.5M4 13h16',
  messages: 'M4 5h16v10.5H8.5L4 19.5z',
  alerts: 'M11 3.5a6 6 0 016 6v3.5l1.8 1.8v1.2H4.2v-1.2L6 13V9.5a6 6 0 016-6ZM9.2 18a2.8 2.8 0 005.6 0',
};
function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'4px 12px', color: active?GREEN:'rgba(0,0,0,.5)', fontFamily:F }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={NAV_ICONS[icon]}/></svg>
      <span style={{ fontSize:11, fontWeight: active?700:500 }}>{label}</span>
      {active && <span style={{ position:'absolute', bottom:-8, left:10, right:10, height:2.5, background:GREEN, borderRadius:3 }}/>}
      {badge > 0 && <span style={{ position:'absolute', top:-1, right:8, minWidth:15, height:15, background:'#DC2626', color:'#fff', borderRadius:8, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', border:'1.5px solid #fff' }}>{badge}</span>}
    </button>
  );
}

const Av = ({ name, uid, url, sz=40, onClick, border=false }) => {
  const base = { width:sz, height:sz, borderRadius:'50%', flexShrink:0, cursor:onClick?'pointer':'default', border:border?'2px solid #fff':'none' };
  if (url) return <img src={url} alt="" onClick={onClick} style={{ ...base, objectFit:'cover' }}/>;
  return (
    <div onClick={onClick} style={{ ...base, background:avColor(uid), color:'#fff', fontSize:Math.max(10,Math.round(sz*.34)), fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none' }}>
      {initials(name)}
    </div>
  );
};

const Tag = ({ t }) => <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'rgba(0,0,0,.05)', color:'rgba(0,0,0,.6)' }}>#{String(t).replace(/^#/,'').replace(/\s+/g,'')}</span>;

// Instagram-style verified badge for paid subscribers ("Verified Founder").
const VerifiedBadge = ({ sz=15 }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" style={{ flexShrink:0, verticalAlign:'-2px' }}><title>Verified Founder</title>
    <path fill="#0095F6" d="M12 1.5l2.7 2 3.3-.3 1 3.1 2.8 1.8-1.1 3.1 1.1 3.1-2.8 1.8-1 3.1-3.3-.3-2.7 2-2.7-2-3.3.3-1-3.1L2 14.3l1.1-3.1L2 8.1l2.8-1.8 1-3.1 3.3.3z"/>
    <path fill="#fff" d="M10.7 14.8l-2.4-2.4 1.1-1.1 1.3 1.3 3.9-3.9 1.1 1.1z"/>
  </svg>
);

// ── Rating scale (1–10) ──────────────────────────────────────────────────────
const RatingScale = ({ current, onRate, avg, rc }) => {
  const [hov, setHov] = useState(null);
  const fill = hov !== null ? hov : (current || 0);
  return (
    <div className="slide-down" style={{ padding:'12px 16px 4px', borderTop:'1px solid rgba(0,0,0,.08)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.6)' }}>Rate this idea</span>
        <span style={{ fontSize:12, color:'rgba(0,0,0,.45)' }}>{rc ? `avg ${avg.toFixed(1)}/10 · ${rc} rating${rc!==1?'s':''}` : 'no ratings yet'}</span>
      </div>
      <div style={{ display:'flex', gap:4, marginBottom:12 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n=>{
          const on = fill >= n;
          return <button key={n} onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(null)} onClick={()=>onRate(n)}
            style={{ flex:1, height:32, borderRadius:4, border:'1px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .1s', fontFamily:F,
              background:on?'rgba(0,0,0,.9)':'rgba(0,0,0,.04)', color:on?'#fff':'rgba(0,0,0,.45)', borderColor:on?'rgba(0,0,0,.9)':'rgba(0,0,0,.12)',
              transform:on?'scale(1.05)':'scale(1)' }}>{n}</button>;
        })}
      </div>
      {current && <p style={{ fontSize:12, color:'rgba(0,0,0,.6)', margin:'0 0 12px' }}>{current>=8?'🔥':'👍'} You rated this {current}/10</p>}
    </div>
  );
};

// ── Suggestions panel ────────────────────────────────────────────────────────
const Suggestions = ({ postId, postOwnerId, postTitle, me, requireAuth, onCount, verifiedIds }) => {
  const [items, setItems] = useState(null);
  const [txt, setTxt] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyTxt, setReplyTxt] = useState('');
  useEffect(() => {
    let on = true, timer = null;
    const load = () => fetchSuggestions(postId).then(s => on && setItems(s));
    load();
    // Live thread: refetch when a reply/like lands (debounced).
    const unsub = subscribeToThread(postId, () => { clearTimeout(timer); timer = setTimeout(load, 500); });
    return () => { on = false; clearTimeout(timer); unsub(); };
  }, [postId]);

  const addLocal = (row, parentId) => setItems(p => [...(p||[]), { ...row, parent_id:parentId, likes:[], author:{ name:nameOf(me), avatar_url:me.user_metadata?.avatar_url } }]);

  const submit = async () => {
    if (!txt.trim() || !me) return;
    const text = txt.trim();
    try {
      const row = await addSuggestion(me.id, postId, text, null);
      addLocal(row, null); onCount?.(); setTxt('');
      createNotification({ actorId:me.id, userId:postOwnerId, type:'suggestion', postId, data:{ title:postTitle, text:text.slice(0,120) } });
    } catch { /* surfaced in console */ }
  };
  const submitReply = async (parent) => {
    if (!replyTxt.trim() || !me) return;
    const text = replyTxt.trim();
    try {
      const row = await addSuggestion(me.id, postId, text, parent.id);
      addLocal(row, parent.id); onCount?.(); setReplyTxt(''); setReplyTo(null);
      createNotification({ actorId:me.id, userId:parent.user_id, type:'reply', postId, data:{ title:postTitle, text:text.slice(0,120) } });
    } catch { /* surfaced in console */ }
  };
  const toggleLike = async (c) => {
    if (!me) return requireAuth(()=>{})();
    const had = (c.likes||[]).some(l => l.user_id === me.id);
    setItems(p => p.map(x => x.id===c.id ? { ...x, likes: had ? (x.likes||[]).filter(l=>l.user_id!==me.id) : [...(x.likes||[]), { user_id:me.id }] } : x));
    await likeSuggestion(me.id, c.id, !had);
    if (!had && c.user_id !== me.id) createNotification({ actorId:me.id, userId:c.user_id, type:'comment_like', postId, data:{ text:(c.text||'').slice(0,80) } });
  };

  const tops = (items||[]).filter(c => !c.parent_id);
  const repliesOf = id => (items||[]).filter(c => c.parent_id === id);

  const renderComment = (c, isReply) => {
    const liked = me && (c.likes||[]).some(l => l.user_id === me.id);
    const lc = (c.likes||[]).length;
    return (
      <div key={c.id} style={{ display:'flex', gap:8, marginLeft:isReply?34:0 }}>
        <Av name={c.author?.name} uid={c.user_id} url={c.author?.avatar_url} sz={isReply?28:32}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ background:'rgba(0,0,0,.04)', borderRadius:8, padding:'8px 12px' }}>
            <span style={{ fontSize:13, fontWeight:700 }}>{c.author?.name || 'Founder'}</span>
            {verifiedIds?.has(c.user_id) && <span style={{ marginLeft:4 }}><VerifiedBadge sz={13}/></span>}
            <span style={{ fontSize:12, color:'rgba(0,0,0,.45)', marginLeft:6 }}>{timeAgo(c.created_at)}</span>
            <p style={{ margin:'4px 0 0', fontSize:13, lineHeight:1.5, color:'rgba(0,0,0,.8)' }}>{c.text}</p>
          </div>
          <div style={{ display:'flex', gap:14, padding:'4px 12px 0' }}>
            <button onClick={()=>toggleLike(c)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:liked?'#2563EB':'rgba(0,0,0,.5)', fontFamily:F, padding:0 }}>👍 Like{lc?` · ${lc}`:''}</button>
            {!isReply && <button onClick={()=>{ setReplyTo(replyTo===c.id?null:c.id); setReplyTxt(''); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'rgba(0,0,0,.5)', fontFamily:F, padding:0 }}>Reply</button>}
          </div>
          {replyTo === c.id && (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
              {me && <Av name={nameOf(me)} uid={me.id} url={me.user_metadata?.avatar_url} sz={26}/>}
              <input autoFocus value={replyTxt} onChange={e=>setReplyTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitReply(c)} placeholder="Write a reply…"
                style={{ flex:1, height:32, borderRadius:99, padding:'0 14px', fontSize:13, border:'1px solid rgba(0,0,0,.2)', background:'#fff', outline:'none', fontFamily:F }}/>
              <button onClick={()=>submitReply(c)} style={{ height:32, padding:'0 12px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>Reply</button>
            </div>
          )}
          {repliesOf(c.id).map(r => renderComment(r, true))}
        </div>
      </div>
    );
  };

  return (
    <div className="slide-down" style={{ padding:'12px 16px', borderTop:'1px solid rgba(0,0,0,.08)', display:'flex', flexDirection:'column', gap:12 }}>
      {items === null && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>Loading…</div>}
      {items?.length === 0 && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>No suggestions yet. Be the first.</div>}
      {tops.map(c => renderComment(c, false))}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {me && <Av name={nameOf(me)} uid={me.id} url={me.user_metadata?.avatar_url} sz={32}/>}
        <div style={{ flex:1, display:'flex', gap:8 }}>
          <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} disabled={!me}
            placeholder={me?'Add a suggestion…':'Sign in to add a suggestion'}
            style={{ flex:1, height:36, borderRadius:99, padding:'0 14px', fontSize:13, border:'1px solid rgba(0,0,0,.2)', background:'#fff', outline:'none', fontFamily:F }}/>
          <button onClick={me?submit:requireAuth(()=>{})} style={{ height:36, padding:'0 14px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>
            {me?'Post':'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact preview of the original post inside a repost.
const EmbeddedPost = ({ post, onOpen }) => {
  if (!post) return <div style={{ margin:'8px 0', padding:'14px 16px', border:'1px solid rgba(0,0,0,.1)', borderRadius:8, fontSize:13, color:'rgba(0,0,0,.4)' }}>Original post is no longer available.</div>;
  const a = post.author || {};
  return (
    <div onClick={()=>onOpen?.(post.id)} style={{ margin:'8px 0', border:'1px solid rgba(0,0,0,.12)', borderRadius:8, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ padding:'10px 14px 0', display:'flex', gap:8, alignItems:'center' }}>
        <Av name={a.name} uid={post.user_id} url={a.avatar_url} sz={32}/>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>{a.name || 'Founder'}</div>
          <div style={{ fontSize:11.5, color:'rgba(0,0,0,.45)' }}>{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div style={{ padding:'8px 14px 14px' }}>
        {post.meta?.validated && <div style={{ display:'inline-block', marginBottom:5, fontSize:11, fontWeight:700, color:'#1d4ed8' }}>✓ Oracle-Validated{post.meta.overallScore!=null?` · ${post.meta.overallScore}/100`:''}</div>}
        {post.title && <div style={{ fontSize:13.5, fontWeight:700, marginBottom:3 }}>{post.title}</div>}
        {post.body && <p style={{ margin:0, fontSize:13, lineHeight:1.5, color:'rgba(0,0,0,.7)' }}>{post.body.length>180?post.body.slice(0,180)+'…':post.body}</p>}
        {post.media?.length > 0 && <MediaGrid media={post.media}/>}
      </div>
    </div>
  );
};

// Repost composer modal.
function RepostModal({ original, me, onClose, onDone }) {
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { await onDone(txt.trim()); onClose(); } catch { setBusy(false); } };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:360, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card, width:'100%', maxWidth:520, padding:0, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>Repost</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:18, padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
            <Av name={nameOf(me)} uid={me?.id||'me'} url={me?.user_metadata?.avatar_url} sz={40}/>
            <div style={{ fontSize:14, fontWeight:700 }}>{nameOf(me)}</div>
          </div>
          <textarea autoFocus value={txt} onChange={e=>setTxt(e.target.value)} rows={3} placeholder="Add your thoughts (optional)…"
            style={{ width:'100%', border:'none', outline:'none', fontSize:15, lineHeight:1.6, resize:'none', fontFamily:F, boxSizing:'border-box' }}/>
          <EmbeddedPost post={original}/>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,.08)' }}>
          <button onClick={onClose} style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.5)', background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding:'8px 22px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', opacity:busy?.6:1, fontFamily:F }}>{busy?'Reposting…':'Repost'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Post card ────────────────────────────────────────────────────────────────
const formatSize = b => !b ? '' : b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b/1024))} KB`;

// Swipeable carousel for multi-image / document-deck posts (LinkedIn-style).
const ExpandIcon = ({ c='#fff' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H4v5M20 9V4h-5M4 15v5h5M15 20h5v-5"/></svg>
);

// Fullscreen photo viewer — arrow keys / on-screen arrows / Esc, swipe through photos.
const Lightbox = ({ images, start, onClose }) => {
  const [i, setI] = useState(start);
  const go = (d, e) => { if (e) e.stopPropagation(); setI(p => (p + d + images.length) % images.length); };
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI(p => (p + 1) % images.length);
      else if (e.key === 'ArrowLeft') setI(p => (p - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);
  const nav = side => ({ position:'absolute', top:'50%', [side]:'2.5%', transform:'translateY(-50%)', width:48, height:48, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.14)', color:'#fff', fontSize:26, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 });
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.93)', display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeUp .15s ease both' }}>
      <button onClick={onClose} title="Close (Esc)" style={{ position:'absolute', top:18, right:22, width:42, height:42, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.14)', color:'#fff', fontSize:20, cursor:'pointer', zIndex:3 }}>✕</button>
      {images.length > 1 && <button onClick={e=>go(-1,e)} title="Previous" style={nav('left')}>‹</button>}
      <img src={images[i].url} alt={images[i].name||''} onClick={e=>e.stopPropagation()} style={{ maxWidth:'92vw', maxHeight:'88vh', objectFit:'contain', display:'block', borderRadius:4 }}/>
      {images.length > 1 && <button onClick={e=>go(1,e)} title="Next" style={nav('right')}>›</button>}
      {images.length > 1 && <div style={{ position:'absolute', bottom:22, left:0, right:0, textAlign:'center', color:'#fff', fontSize:13, fontWeight:600 }}>{i+1} / {images.length}</div>}
    </div>
  );
};

const Carousel = ({ images, onOpen }) => {
  const [i, setI] = useState(0);
  const go = (d, e) => { if (e) e.stopPropagation(); setI(p => (p + d + images.length) % images.length); };
  const arrow = side => ({ position:'absolute', top:'50%', [side]:8, transform:'translateY(-50%)', width:34, height:34, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 });
  return (
    <div style={{ position:'relative', borderRadius:8, overflow:'hidden', border:'1px solid rgba(0,0,0,.08)', background:'#000' }}>
      <img src={images[i].url} alt={images[i].name||''} loading="lazy" onClick={()=>onOpen?.(i)} style={{ width:'100%', height:380, objectFit:'contain', display:'block', background:'#000', cursor:'zoom-in' }}/>
      <button onClick={e=>go(-1,e)} title="Previous" style={arrow('left')}>‹</button>
      <button onClick={e=>go(1,e)} title="Next" style={arrow('right')}>›</button>
      <div style={{ position:'absolute', top:8, right:10, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{i+1} / {images.length}</div>
      <button onClick={()=>onOpen?.(i)} title="View full screen" style={{ position:'absolute', bottom:10, right:10, width:30, height:30, borderRadius:6, border:'none', background:'rgba(0,0,0,.55)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}><ExpandIcon/></button>
      <div style={{ position:'absolute', bottom:12, left:0, right:0, display:'flex', justifyContent:'center', gap:5, pointerEvents:'none' }}>
        {images.map((_,n)=><span key={n} style={{ width:7, height:7, borderRadius:'50%', background:n===i?'#fff':'rgba(255,255,255,.45)' }}/>)}
      </div>
    </div>
  );
};

// Rich link preview card (data fetched server-side at post time).
const LinkPreview = ({ data }) => (
  <a href={data.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', margin:'8px 0', border:'1px solid rgba(0,0,0,.14)', borderRadius:8, overflow:'hidden', textDecoration:'none', color:'inherit' }}>
    {data.image && <img src={data.image} alt="" loading="lazy" style={{ width:'100%', maxHeight:240, objectFit:'cover', display:'block' }}/>}
    <div style={{ padding:'10px 14px', background:'rgba(0,0,0,.02)' }}>
      <div style={{ fontSize:11, color:'rgba(0,0,0,.45)', textTransform:'uppercase', letterSpacing:'.5px' }}>{data.site}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', margin:'2px 0', lineHeight:1.35 }}>{data.title}</div>
      {data.description && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.6)', lineHeight:1.45 }}>{data.description}</div>}
    </div>
  </a>
);

// Poll display with vote → results bars.
const Poll = ({ post, me, onVote, requireAuth }) => {
  const poll = post.poll || { options: [] };
  const votes = post.pollVotes || [];
  const myVote = me ? votes.find(v => v.user_id === me.id)?.option_idx : undefined;
  const voted = myVote !== undefined && myVote !== null;
  const total = votes.length;
  return (
    <div style={{ margin:'4px 0 8px' }}>
      {poll.question && <div style={{ fontSize:15, fontWeight:700, marginBottom:10 }}>{poll.question}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {poll.options.map((opt,idx)=>{
          const c = votes.filter(v=>v.option_idx===idx).length;
          const pctv = total ? Math.round(c/total*100) : 0;
          if (voted) return (
            <div key={idx} style={{ position:'relative', border:'1px solid rgba(0,0,0,.12)', borderRadius:8, overflow:'hidden', padding:'10px 12px' }}>
              <div style={{ position:'absolute', top:0, bottom:0, left:0, width:`${pctv}%`, background: idx===myVote?'rgba(37,99,235,.16)':'rgba(0,0,0,.05)' }}/>
              <div style={{ position:'relative', display:'flex', justifyContent:'space-between', fontSize:13.5, fontWeight: idx===myVote?700:500 }}>
                <span>{opt}{idx===myVote?' ✓':''}</span><span>{pctv}%</span>
              </div>
            </div>
          );
          return <button key={idx} onClick={requireAuth(()=>onVote(post.id, idx))} style={{ textAlign:'left', border:'1.5px solid rgba(37,99,235,.5)', borderRadius:8, padding:'10px 12px', background:'#fff', color:'#2563EB', fontWeight:600, fontSize:13.5, cursor:'pointer', fontFamily:F }}>{opt}</button>;
        })}
      </div>
      <div style={{ fontSize:12, color:'rgba(0,0,0,.45)', marginTop:8 }}>{total} vote{total!==1?'s':''}{voted?' · You voted':''}</div>
    </div>
  );
};

// Renders attached photos (carousel for 2+, single image otherwise) + document chips.
const MediaGrid = ({ media }) => {
  const images = media.filter(m => m.type === 'image');
  const files = media.filter(m => m.type !== 'image');
  const [lb, setLb] = useState(null); // lightbox start index, or null
  return (
    <div style={{ margin:'6px 0 8px' }}>
      {images.length > 1 && <Carousel images={images} onOpen={setLb}/>}
      {images.length === 1 && (
        <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid rgba(0,0,0,.08)' }}>
          <img src={images[0].url} alt={images[0].name||''} loading="lazy" onClick={()=>setLb(0)} style={{ width:'100%', height:'auto', maxHeight:420, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>
        </div>
      )}
      {lb !== null && <Lightbox images={images} start={lb} onClose={()=>setLb(null)}/>}
      {files.map((m,i)=>(
        <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" download={m.name}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginTop:6, border:'1px solid rgba(0,0,0,.12)', borderRadius:8, textDecoration:'none', color:'rgba(0,0,0,.85)', background:'rgba(0,0,0,.02)' }}>
          <span style={{ fontSize:20 }}>📄</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name || 'Document'}</div>
            <div style={{ fontSize:11, color:'rgba(0,0,0,.45)' }}>{m.size ? formatSize(m.size) : 'Open document'}</div>
          </div>
          <span style={{ fontSize:13, color:'rgba(0,0,0,.5)' }}>↓</span>
        </a>
      ))}
    </div>
  );
};

// LinkedIn-style monochrome line icons (stroke = currentColor) used in the composer + post action bar.
const icoBase = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round' };
const IcoPhoto = () => (<svg width="21" height="21" viewBox="0 0 24 24" {...icoBase}><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-4.5-4.5L6 21"/></svg>);
const IcoClip  = () => (<svg width="21" height="21" viewBox="0 0 24 24" {...icoBase}><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>);
const IcoEmoji = () => (<svg width="21" height="21" viewBox="0 0 24 24" {...icoBase}><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>);
const IcoMic   = () => (<svg width="21" height="21" viewBox="0 0 24 24" {...icoBase}><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>);
const IcoSend  = ({ s=16 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...icoBase}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>);
// Post action-bar icons (20px). `fill` paints them solid when the action is active.
const IcoStar     = ({ on }) => (<svg width="20" height="20" viewBox="0 0 24 24" {...icoBase} fill={on?'currentColor':'none'}><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9z"/></svg>);
const IcoComment  = () => (<svg width="20" height="20" viewBox="0 0 24 24" {...icoBase}><path d="M21 11.5a8.4 8.4 0 0 1-12 7.6L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg>);
const IcoRepost   = () => (<svg width="20" height="20" viewBox="0 0 24 24" {...icoBase}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>);
const IcoBookmark = ({ on }) => (<svg width="20" height="20" viewBox="0 0 24 24" {...icoBase} fill={on?'currentColor':'none'}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>);
const IcoShare    = () => (<svg width="20" height="20" viewBox="0 0 24 24" {...icoBase}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>);

function PostCard({ post, me, followingIds, pendingIds, onFollow, onProfile, onRate, rOpen, onTR, cOpen, onTC, requireAuth, onDelete, onDM, highlight, onSave, onRepost, saved, onOpenPost, onVote, verifiedIds }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extraSug, setExtraSug] = useState(0);
  const author = post.author || {};
  const isSelf = me && post.user_id === me.id;
  const isRepost = !!post.repost_of;
  const isPoll = post.kind === 'poll' && post.poll;
  const isArticle = post.kind === 'article';
  const ratings = post.ratings || [];
  const myR = me ? ratings.find(r=>r.user_id===me.id) : null;
  const uRating = myR ? to10(myR.value) : null;
  const isF = followingIds.has(post.user_id);
  const isP = pendingIds?.has(post.user_id);
  const body = post.body || '';
  const isLong = body.length > 220;
  const shown = expanded || !isLong ? body : body.slice(0,220)+'…';
  const sugCount = (post.sugCount ?? 0) + extraSug;
  const shareTitle = post.title || post.original?.title || 'idea';

  const share = () => {
    try { navigator.clipboard.writeText(`"${shareTitle}" — Startup Oracle: ${window.location.origin}/#/idea/${post.id}`); setCopied(true); setTimeout(()=>setCopied(false), 1600); } catch { /* clipboard unavailable */ }
  };

  return (
    <div id={`post-${post.id}`} style={{ ...card, overflow:'visible', transition:'box-shadow .3s', boxShadow: highlight ? '0 0 0 2px #2563EB' : card.boxShadow }}>
      {isRepost && <div style={{ padding:'8px 16px 0', fontSize:12, color:'rgba(0,0,0,.5)', fontWeight:600 }}>🔁 {isSelf?'You':author.name||'Founder'} reposted</div>}
      <div style={{ padding:'12px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:8 }}>
          <Av name={author.name} uid={post.user_id} url={author.avatar_url} sz={48} onClick={()=>onProfile(post.user_id)}/>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>onProfile(post.user_id)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', fontFamily:F }}>{author.name || 'Founder'}</button>
              {verifiedIds?.has(post.user_id) && <VerifiedBadge/>}
              {!isSelf && <button onClick={requireAuth(()=>onFollow(post.user_id))} style={{ fontSize:13, fontWeight:700, color:GREEN, background:'none', border:'none', cursor:'pointer', padding:'0 2px', fontFamily:F }}>{isF?'· Following':isP?'· Requested':'· + Follow'}</button>}
            </div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.6)', lineHeight:1.4 }}>{headlineOf(author)}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.45)', marginTop:1, display:'flex', alignItems:'center', gap:6 }}>
              <span>{timeAgo(post.created_at)} · 🌐</span>
              <span style={{ padding:'1px 8px', borderRadius:99, background:'rgba(0,0,0,.05)', fontSize:11, fontWeight:600, color:'rgba(0,0,0,.55)' }}>{isRepost?'Repost':isPoll?'Poll':isArticle?'Article':'Idea'}</span>
            </div>
          </div>
        </div>
        {isSelf && onDelete && (
          <button onClick={()=>onDelete(post)} title="Delete" style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.45)', padding:4, fontSize:13, fontFamily:F }}>🗑</button>
        )}
      </div>

      <div style={{ padding:'10px 16px 0' }}>
        {isRepost ? (
          <>
            {body && <p style={{ margin:'0 0 4px', fontSize:14, lineHeight:1.6, color:'rgba(0,0,0,.8)', whiteSpace:'pre-line' }}>{shown}</p>}
            {isLong && <button onClick={()=>setExpanded(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:GREEN, padding:'2px 0', fontFamily:F }}>{expanded?'show less':'…see more'}</button>}
            <EmbeddedPost post={post.original} onOpen={onOpenPost}/>
          </>
        ) : isPoll ? (
          <>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginBottom:8, padding:'3px 10px', borderRadius:99, background:'rgba(0,0,0,.05)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(0,0,0,.6)' }}>📊 Poll</span>
            </div>
            <Poll post={post} me={me} onVote={onVote} requireAuth={requireAuth}/>
            {post.tags?.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:5, margin:'4px 0 8px' }}>{post.tags.map(t=><Tag key={t} t={t}/>)}</div>}
          </>
        ) : (
          <>
            {isArticle && <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginBottom:6, padding:'3px 10px', borderRadius:99, background:'rgba(0,0,0,.05)' }}><span style={{ fontSize:11, fontWeight:700, color:'rgba(0,0,0,.6)' }}>📄 Article</span></div>}
            {post.meta?.validated && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:6, padding:'3px 10px', borderRadius:99, background:'rgba(37,99,235,.08)', border:'1px solid rgba(37,99,235,.25)' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8' }}>✓ Oracle-Validated{post.meta.overallScore!=null?` · ${post.meta.overallScore}/100`:''}</span>
                {post.meta.badge && <span style={{ fontSize:11, color:'#1d4ed8', opacity:.8 }}>{post.meta.badge}</span>}
              </div>
            )}
            {isArticle && post.media?.length > 0 && <MediaGrid media={post.media}/>}
            <div style={{ fontSize: isArticle?20:14, fontWeight: isArticle?800:700, color:'rgba(0,0,0,.9)', margin: isArticle?'6px 0 6px':'0 0 4px', lineHeight:1.3 }}>{post.title}</div>
            {body && <p style={{ margin:0, fontSize:14, lineHeight:1.6, color:'rgba(0,0,0,.8)', whiteSpace:'pre-line' }}>{shown}</p>}
            {isLong && <button onClick={()=>setExpanded(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:GREEN, padding:'2px 0', fontFamily:F }}>{expanded?'show less':'…see more'}</button>}
            {post.link_preview && <LinkPreview data={post.link_preview}/>}
            {!isArticle && post.media?.length > 0 && <MediaGrid media={post.media}/>}
            {post.tags?.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:5, margin:'10px 0 8px' }}>{post.tags.map(t=><Tag key={t} t={t}/>)}</div>}
          </>
        )}
      </div>

      <div style={{ padding:'8px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(0,0,0,.08)' }}>
        <span style={{ fontSize:12, color:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {!isRepost && !isPoll && ratings.length > 0
            ? <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <span style={{ background:'rgba(0,0,0,.9)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>★</span>
                avg <b style={{ color:'rgba(0,0,0,.7)' }}>{avg10(ratings).toFixed(1)}</b>/10 · {ratings.length} rating{ratings.length!==1?'s':''}
              </span>
            : <span>{isRepost || isPoll ? '' : 'No ratings yet'}</span>}
        </span>
        <span style={{ fontSize:12, color:'rgba(0,0,0,.5)' }}>{sugCount} suggestion{sugCount!==1?'s':''}</span>
      </div>

      <div style={{ display:'flex', padding:'4px 4px' }}>
        {!isSelf && !isRepost && !isPoll && (
          <button className={'act-btn'+(uRating?' rated':'')} onClick={requireAuth(onTR)}><IcoStar on={!!uRating}/><span>{uRating?`Rated ${uRating}`:'Rate'}</span></button>
        )}
        <button className="act-btn" onClick={onTC}><IcoComment/><span>Suggest</span></button>
        <button className="act-btn" onClick={requireAuth(()=>onRepost(post.original || post))}><IcoRepost/><span>Repost</span></button>
        <button className={'act-btn'+(saved?' rated':'')} onClick={requireAuth(()=>onSave(post.id))}><IcoBookmark on={saved}/><span>{saved?'Saved':'Save'}</span></button>
        {!isSelf && onDM && <button className="act-btn" onClick={requireAuth(()=>onDM({ id:post.user_id, name:author.name, avatar_url:author.avatar_url }))}><IcoSend s={20}/><span>DM</span></button>}
        <button className="act-btn" onClick={share}><IcoShare/><span>{copied?'Copied':'Share'}</span></button>
      </div>

      {rOpen && !isSelf && !isRepost && !isPoll && <RatingScale current={uRating} avg={avg10(ratings)} rc={ratings.length} onRate={n=>onRate(post.id, n)}/>}
      {cOpen && <Suggestions postId={post.id} postOwnerId={post.user_id} postTitle={shareTitle} me={me} requireAuth={requireAuth} onCount={()=>setExtraSug(n=>n+1)} verifiedIds={verifiedIds}/>}
    </div>
  );
}

// ── Composer modal (text + photo + document upload) ──────────────────────────
const DOC_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md';
const MAX_FILE = 25 * 1024 * 1024; // 25 MB

const URL_RE = /(https?:\/\/[^\s]+)/i;

function ComposerModal({ me, onClose, onPosted }) {
  const [mode, setMode] = useState('post'); // post | poll | article
  const [body, setBody] = useState('');
  const [artTitle, setArtTitle] = useState('');
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState([]); // { file, type, name, size, preview }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const imgInput = useRef(null);
  const docInput = useRef(null);

  useEffect(() => () => files.forEach(f => f.preview && URL.revokeObjectURL(f.preview)), [files]);

  const addFiles = (list, type) => {
    setErr('');
    const picked = Array.from(list);
    const tooBig = picked.find(f => f.size > MAX_FILE);
    if (tooBig) { setErr(`"${tooBig.name}" is over 25 MB.`); return; }
    const mapped = picked.map(file => ({ file, type, name: file.name, size: file.size, preview: type === 'image' ? URL.createObjectURL(file) : null }));
    setFiles(p => [...p, ...mapped].slice(0, 8));
  };
  const removeFile = i => setFiles(p => p.filter((_, n) => n !== i));
  const setOpt = (i, v) => setPollOpts(p => p.map((o, n) => n === i ? v : o));

  const canPost = mode === 'poll'
    ? (pollQ.trim() && pollOpts.filter(o => o.trim()).length >= 2)
    : mode === 'article'
      ? (artTitle.trim() && body.trim())
      : (body.trim() || files.length > 0);

  const submit = async () => {
    if (!canPost || !me) return;
    setBusy(true); setErr('');
    try {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
      const author = { id: me.id, name: nameOf(me), avatar_url: me.user_metadata?.avatar_url };
      const baseNew = { author, ratings: [], reactions: [], pollVotes: [], sugCount: 0, tags: tagArr };

      if (mode === 'poll') {
        const options = pollOpts.map(o => o.trim()).filter(Boolean).slice(0, 4);
        const poll = { question: pollQ.trim(), options };
        const title = pollQ.trim().slice(0, 80);
        const row = await createPost(me.id, { title, body: '', tags: tagArr, media: [], kind: 'poll', poll });
        onPosted({ id: row.id, created_at: row.created_at, user_id: me.id, title, body: '', media: [], kind: 'poll', poll, ...baseNew });
        return onClose();
      }

      const media = [];
      for (const f of files) {
        const url = await uploadPostFile(me.id, f.file);
        media.push({ url, type: f.type, name: f.name, size: f.size });
      }

      let title, bodyText;
      if (mode === 'article') { title = artTitle.trim().slice(0, 120); bodyText = body.trim(); }
      else { const lines = body.trim(); title = (lines.split('\n')[0].trim().slice(0, 80)) || 'New Idea'; bodyText = lines.split('\n').slice(1).join('\n').trim(); }

      // Link preview: unfurl the first URL when there's no image attached.
      let link_preview = null;
      const m = body.match(URL_RE);
      if (m && !media.some(x => x.type === 'image')) link_preview = await unfurlLink(m[1]);

      const kind = mode === 'article' ? 'article' : 'post';
      const row = await createPost(me.id, { title, body: bodyText, tags: tagArr, media, kind, link_preview });
      onPosted({ id: row.id, created_at: row.created_at, user_id: me.id, title, body: bodyText, media, kind, link_preview, ...baseNew });
      onClose();
    } catch (e) {
      setErr(e?.message || 'Could not post. Please try again.');
    }
    setBusy(false);
  };

  const toolBtn = { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:6, border:'none', background:'transparent', color:'rgba(0,0,0,.65)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F };
  const fin = { width:'100%', border:'1px solid rgba(0,0,0,.18)', borderRadius:8, padding:'10px 12px', fontSize:14, fontFamily:F, outline:'none', boxSizing:'border-box' };
  const modeChip = active => ({ padding:'6px 12px', borderRadius:99, border:'1px solid', borderColor: active?'rgba(0,0,0,.9)':'rgba(0,0,0,.15)', background: active?'rgba(0,0,0,.9)':'transparent', color: active?'#fff':'rgba(0,0,0,.6)', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:F });

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card, width:'100%', maxWidth:560, padding:0, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>Create</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:18, padding:4 }}>✕</button>
        </div>

        <div style={{ padding:'14px 18px 6px', display:'flex', gap:10, alignItems:'center' }}>
          <Av name={nameOf(me)} uid={me?.id||'me'} url={me?.user_metadata?.avatar_url} sz={44}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{nameOf(me)}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.5)' }}>Posting to the community feed</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, padding:'4px 18px 10px' }}>
          {[['post','✎ Post'],['poll','📊 Poll'],['article','📄 Article']].map(([k,l])=>(
            <button key={k} onClick={()=>{ setMode(k); setErr(''); }} style={modeChip(mode===k)}>{l}</button>
          ))}
        </div>

        <div style={{ padding:'0 18px' }}>
          {mode === 'poll' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input autoFocus value={pollQ} onChange={e=>setPollQ(e.target.value)} placeholder="Ask a question…" style={fin}/>
              {pollOpts.map((o,i)=>(
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input value={o} onChange={e=>setOpt(i, e.target.value)} placeholder={`Option ${i+1}`} style={{ ...fin, flex:1 }}/>
                  {pollOpts.length > 2 && <button onClick={()=>setPollOpts(p=>p.filter((_,n)=>n!==i))} style={{ background:'none', border:'none', color:'#DC2626', fontSize:14, cursor:'pointer' }}>✕</button>}
                </div>
              ))}
              {pollOpts.length < 4 && <button onClick={()=>setPollOpts(p=>[...p,''])} style={{ alignSelf:'flex-start', background:'none', border:'none', color:'#2563EB', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:F }}>+ Add option</button>}
            </div>
          ) : (
            <>
              {mode === 'article' && <input autoFocus value={artTitle} onChange={e=>setArtTitle(e.target.value)} placeholder="Article title" style={{ ...fin, fontSize:18, fontWeight:700, border:'none', padding:'0 0 6px' }}/>}
              <textarea autoFocus={mode!=='article'} value={body} onChange={e=>setBody(e.target.value)} rows={mode==='article'?7:5}
                placeholder={mode==='article' ? "Write your article…" : "Idea title on the first line…\nThen describe the problem, your solution, and what feedback you need."}
                style={{ width:'100%', border:'none', outline:'none', fontSize:15, color:'rgba(0,0,0,.9)', lineHeight:1.65, background:'transparent', padding:0, fontFamily:F, resize:'none', boxSizing:'border-box' }}/>
            </>
          )}

          {mode !== 'poll' && files.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'10px 0' }}>
              {files.map((f,i)=>(
                <div key={i} style={{ position:'relative', width: f.type==='image'?80:'100%', border:'1px solid rgba(0,0,0,.12)', borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,.02)' }}>
                  {f.type === 'image'
                    ? <img src={f.preview} alt={f.name} style={{ width:80, height:80, objectFit:'cover', display:'block' }}/>
                    : <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px' }}>
                        <span style={{ fontSize:18 }}>📄</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize:11, color:'rgba(0,0,0,.45)' }}>{formatSize(f.size)}</div>
                        </div>
                      </div>}
                  <button onClick={()=>removeFile(i)} title="Remove"
                    style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.7)', color:'#fff', fontSize:11, cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Add tags: AI, SaaS, FinTech…"
            style={{ width:'100%', height:36, borderRadius:4, padding:'0 12px', fontSize:13, border:'1px solid rgba(0,0,0,.15)', background:'rgba(0,0,0,.02)', outline:'none', margin:'12px 0 0', fontFamily:F, boxSizing:'border-box' }}/>
          {err && <div style={{ fontSize:12.5, color:'#DC2626', marginTop:8 }}>{err}</div>}
        </div>

        <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={e=>{ addFiles(e.target.files,'image'); e.target.value=''; }}/>
        <input ref={docInput} type="file" accept={DOC_ACCEPT} multiple hidden onChange={e=>{ addFiles(e.target.files,'file'); e.target.value=''; }}/>

        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,.08)', marginTop:14 }}>
          {mode !== 'poll' && <>
            <button onClick={()=>imgInput.current?.click()} style={toolBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>🖼 {mode==='article'?'Cover':'Photo'}</button>
            <button onClick={()=>docInput.current?.click()} style={toolBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>📎 Document</button>
          </>}
          <div style={{ flex:1 }}/>
          <button onClick={onClose} style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.5)', background:'none', border:'none', cursor:'pointer', fontFamily:F, marginRight:4 }}>Cancel</button>
          <button onClick={submit} disabled={busy || !canPost}
            style={{ padding:'8px 22px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(canPost&&!busy)?1:.5, fontFamily:F }}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chat (Messages view + DM panel) ──────────────────────────────────────────
const EMOJI_SET = ['😀','😄','😁','😂','🤣','🙂','😉','😊','😍','😘','😎','🤩','🥳','🤔','🤨','😏','😴','😅','😇','🥹','🥰','😜','🤗','🤭','🫡','😬','🙄','😮','😢','😭','😡','😱','🤯','🥺','💀','👀','🫶','🙏','👍','👎','👏','🙌','💪','🤝','🤞','✌️','👋','🔥','✨','🎉','🚀','💡','💯','✅','❌','⭐','❤️','🧡','💛','💚','💙','💜','💰','📈'];
const REACT_SET = ['👍','❤️','😂','😮','😢','🙏'];
const dmType = f => (f.type||'').startsWith('image') ? 'image' : (f.type||'').startsWith('video') ? 'video' : (f.type||'').startsWith('audio') ? 'audio' : 'file';
const mediaLabel = media => { const t = media?.[0]?.type; return t==='image'?'📷 Photo':t==='video'?'🎬 Video':t==='audio'?'🎙 Voice message':'📄 File'; };
const msgPreview = m => m?.deleted ? 'This message was deleted' : (m?.text && m.text.trim()) ? m.text : (m?.media?.length ? mediaLabel(m.media) : '');
// Incoming messages still unread by me, excluding ones deleted / hidden-for-me.
const countUnread = (messages, peerId, meId) => messages.filter(m => m.sender_id === peerId && !m.read && !m.deleted && !(m.deleted_for || []).includes(meId)).length;
// Merge a patch into one message in a conversation map and refresh its unread count.
const patchMsg = (convs, peerId, msgId, patch, meId) => {
  const c = convs[peerId]; if (!c) return convs;
  const messages = c.messages.map(m => m.id === msgId ? { ...m, ...patch } : m);
  return { ...convs, [peerId]: { ...c, messages, unread: countUnread(messages, peerId, meId) } };
};
// Last message visible to me (skips ones I deleted-for-me) — for the conversation-list preview.
const lastVisible = (messages, meId) => { for (let i = messages.length - 1; i >= 0; i--) if (!(messages[i].deleted_for || []).includes(meId)) return messages[i]; return null; };

// Voice-note recording cap.
const MAX_VOICE_SECS = 300; // 5 min

// Downscale a large photo client-side before upload (skips gif/svg; keeps the original if no gain).
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type?.startsWith('image/') || /gif|svg/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    if (scale === 1 && file.size < 1024 * 1024) { bitmap.close?.(); return file; } // already small
    const w = Math.round(width * scale), h = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => canvas.toBlob(res, outType, quality));
    if (!blob || blob.size >= file.size) return file; // no benefit
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], base + (outType === 'image/png' ? '.png' : '.jpg'), { type: outType });
  } catch { return file; }
}

// Lightweight emoji picker (no dependency) — anchored above its trigger.
function EmojiPicker({ onPick, onClose }) {
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:320 }}/>
      <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, width:280, maxHeight:208, overflowY:'auto', background:'#fff', border:'1px solid rgba(0,0,0,.12)', borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.16)', padding:8, display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:1, zIndex:321 }}>
        {EMOJI_SET.map((e,i)=>(
          <button key={i} onClick={()=>onPick(e)} style={{ border:'none', background:'none', cursor:'pointer', fontSize:19, lineHeight:1, padding:5, borderRadius:7 }}
            onMouseEnter={ev=>ev.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={ev=>ev.currentTarget.style.background='none'}>{e}</button>
        ))}
      </div>
    </>
  );
}

// Record + send a voice note (MediaRecorder). Auto-stops + sends at MAX_VOICE_SECS.
function VoiceRecorder({ onDone, iconBtn }) {
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const mr = useRef(null), chunks = useRef([]), timer = useRef(null), secsRef = useRef(0);
  useEffect(() => () => clearInterval(timer.current), []);
  const finish = save => {
    clearInterval(timer.current);
    const m = mr.current; if (!m) { setRec(false); return; }
    m.onstop = () => {
      m.stream?.getTracks?.().forEach(t => t.stop());
      if (save && chunks.current.length) {
        const blob = new Blob(chunks.current, { type:'audio/webm' });
        onDone(new File([blob], `voice_${Date.now()}.webm`, { type:'audio/webm' }));
      }
    };
    if (m.state !== 'inactive') m.stop();
    mr.current = null; setRec(false); setSecs(0); secsRef.current = 0;
  };
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const m = new MediaRecorder(stream);
      chunks.current = [];
      m.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      m.start(); mr.current = m; setRec(true); setSecs(0); secsRef.current = 0;
      timer.current = setInterval(() => {
        secsRef.current += 1; setSecs(secsRef.current);
        if (secsRef.current >= MAX_VOICE_SECS) finish(true);   // auto-stop + send at the cap
      }, 1000);
    } catch { alert('Microphone access is needed to record a voice note.'); }
  };
  if (!rec) return <button title="Record voice note" onClick={start} style={iconBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}><IcoMic/></button>;
  const t = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
  const max = `${Math.floor(MAX_VOICE_SECS/60)}:${String(MAX_VOICE_SECS%60).padStart(2,'0')}`;
  const near = secs >= MAX_VOICE_SECS - 30;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 2px', flexShrink:0 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626', animation:'dmPulse 1s infinite' }}/>
      <span style={{ fontSize:12.5, fontWeight:700, fontVariantNumeric:'tabular-nums', color: near ? '#DC2626' : 'inherit' }}>{t}<span style={{ fontWeight:500, color:'rgba(0,0,0,.4)' }}> / {max}</span></span>
      <button title="Cancel" onClick={()=>finish(false)} style={iconBtn}>✕</button>
      <button title="Send voice note" onClick={()=>finish(true)} style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.9)', color:'#fff', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><IcoSend/></button>
    </div>
  );
}

// Attachments inside a message bubble — photos + videos share one grid; files & voice below.
function MsgMedia({ media, onImage }) {
  const visuals = media.filter(m => m.type === 'image' || m.type === 'video');
  const images  = visuals.filter(m => m.type === 'image');
  const files   = media.filter(m => m.type === 'file');
  const audios  = media.filter(m => m.type === 'audio');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:280 }}>
      {visuals.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns: visuals.length > 1 ? '1fr 1fr' : '1fr', gap:3, borderRadius:12, overflow:'hidden' }}>
          {visuals.map((m,i) => m.type === 'image'
            ? <img key={i} src={m.url} alt={m.name||''} loading="lazy" onClick={()=>onImage(images, images.indexOf(m))}
                style={{ width:'100%', height: visuals.length > 1 ? 130 : 'auto', maxHeight:260, objectFit:'cover', cursor:'zoom-in', display:'block' }}/>
            : <video key={i} src={m.url} controls style={{ width:'100%', maxHeight:260, borderRadius:8, display:'block', background:'#000' }}/>
          )}
        </div>
      )}
      {audios.map((m,i) => <audio key={i} src={m.url} controls preload="metadata" style={{ width:236, height:38 }}/>)}
      {files.map((m,i) => (
        <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" download={m.name}
          style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', border:'1px solid rgba(0,0,0,.14)', borderRadius:9, textDecoration:'none', color:'rgba(0,0,0,.85)', background:'rgba(0,0,0,.02)', minWidth:180 }}>
          <span style={{ fontSize:18 }}>📄</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name || 'Document'}</div>
            <div style={{ fontSize:10.5, color:'rgba(0,0,0,.45)' }}>{m.size ? formatSize(m.size) : 'Open'}</div>
          </div>
          <span style={{ fontSize:13, color:'rgba(0,0,0,.5)' }}>↓</span>
        </a>
      ))}
    </div>
  );
}

function MsgBubble({ m, mine, peer, me, msgs, isLastMine, onImage, onReact, onReply, onForward, onDelete }) {
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState(false);
  const temp = String(m.id).startsWith('t_');
  const replied = m.reply_to ? msgs.find(x => x.id === m.reply_to) : null;
  const reactions = m.reactions ? Object.entries(m.reactions).filter(([, u]) => u?.length) : [];
  const show = !temp && (hover || menu);
  const close = () => setMenu(false);
  const mItem = { display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 12px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'rgba(0,0,0,.82)', fontFamily:F, textAlign:'left' };
  const hoverBg = e => e.currentTarget.style.background = 'rgba(0,0,0,.05)';
  const clearBg = e => e.currentTarget.style.background = 'none';

  // Deleted-for-everyone tombstone — both parties see this in place of the message.
  if (m.deleted) return (
    <div style={{ display:'flex', gap:8, maxWidth:'82%', alignSelf:mine?'flex-end':'flex-start', flexDirection:mine?'row-reverse':'row', alignItems:'flex-end' }}>
      {!mine && <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={26}/>}
      <div style={{ display:'flex', flexDirection:'column', alignItems:mine?'flex-end':'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 13px', fontSize:12.5, fontStyle:'italic', color:'rgba(0,0,0,.45)', background:'rgba(0,0,0,.035)', border:'1px dashed rgba(0,0,0,.16)', borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px' }}>
          <span style={{ fontStyle:'normal' }}>🚫</span>{mine ? 'You deleted this message' : 'This message was deleted'}
        </div>
        <div style={{ fontSize:10, color:'rgba(0,0,0,.4)', marginTop:3 }}>{new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
  );

  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'flex', gap:8, maxWidth:'82%', alignSelf:mine?'flex-end':'flex-start', flexDirection:mine?'row-reverse':'row', alignItems:'flex-end' }}>
      {!mine && <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={26}/>}
      <div style={{ display:'flex', flexDirection:'column', alignItems:mine?'flex-end':'flex-start', minWidth:0 }}>
        {m.forwarded && <div style={{ fontSize:10.5, color:'rgba(0,0,0,.4)', fontStyle:'italic', marginBottom:3 }}>↪ Forwarded</div>}
        {replied && (
          <div style={{ borderLeft:'3px solid rgba(0,0,0,.25)', padding:'3px 9px', margin:'0 0 3px', background:'rgba(0,0,0,.04)', borderRadius:6, maxWidth:260 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:'rgba(0,0,0,.55)' }}>{replied.sender_id === me.id ? 'You' : (peer.name || 'Founder')}</div>
            <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>{msgPreview(replied)}</div>
          </div>
        )}
        {m.media?.length > 0 && <div style={{ marginBottom: m.text ? 4 : 0 }}><MsgMedia media={m.media} onImage={onImage}/></div>}
        {m.text && (
          <div style={{ padding:'8px 13px', fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word',
            background:mine?'rgba(0,0,0,.9)':'rgba(0,0,0,.05)', color:mine?'#fff':'rgba(0,0,0,.85)',
            borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px' }}>{m.text}</div>
        )}
        {reactions.length > 0 && (
          <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
            {reactions.map(([e,u]) => (
              <button key={e} onClick={()=>onReact(m, e)} title={u.includes(me.id) ? 'Remove reaction' : 'React'}
                style={{ display:'flex', alignItems:'center', gap:3, padding:'1px 7px', borderRadius:99, fontSize:11.5, cursor:'pointer', fontFamily:F,
                  border:'1px solid', borderColor: u.includes(me.id) ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.12)', background: u.includes(me.id) ? 'rgba(0,0,0,.07)' : '#fff' }}>
                <span>{e}</span><span style={{ fontWeight:600, color:'rgba(0,0,0,.6)' }}>{u.length}</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize:10, color:'rgba(0,0,0,.4)', marginTop:3 }}>
          {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
          {mine && isLastMine && m.read && <span style={{ marginLeft:6, fontWeight:600 }}>· Seen</span>}
        </div>
      </div>
      {/* hover actions */}
      <div style={{ position:'relative', alignSelf:'center', opacity:show?1:0, pointerEvents:show?'auto':'none', transition:'opacity .12s', flexShrink:0 }}>
        <button title="More" onClick={()=>setMenu(o=>!o)} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.06)', cursor:'pointer', fontSize:13, color:'rgba(0,0,0,.6)' }}>⋯</button>
        {menu && (
          <>
            <div onClick={close} style={{ position:'fixed', inset:0, zIndex:340 }}/>
            <div style={{ position:'absolute', top:'calc(100% + 4px)', [mine?'right':'left']:0, width:188, background:'#fff', border:'1px solid rgba(0,0,0,.12)', borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.16)', zIndex:341, overflow:'hidden', padding:'6px 0' }}>
              <div style={{ display:'flex', gap:2, justifyContent:'space-between', padding:'2px 8px 6px', borderBottom:'1px solid rgba(0,0,0,.06)', marginBottom:4 }}>
                {REACT_SET.map(e => (
                  <button key={e} onClick={()=>{ onReact(m, e); close(); }} style={{ border:'none', background:'none', cursor:'pointer', fontSize:18, padding:3, borderRadius:7 }}
                    onMouseEnter={ev=>ev.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={ev=>ev.currentTarget.style.background='none'}>{e}</button>
                ))}
              </div>
              <button style={mItem} onMouseEnter={hoverBg} onMouseLeave={clearBg} onClick={()=>{ onReply(m); close(); }}>↩ Reply</button>
              <button style={mItem} onMouseEnter={hoverBg} onMouseLeave={clearBg} onClick={()=>{ onForward(m); close(); }}>↪ Forward</button>
              <button style={{ ...mItem, color:'#DC2626' }} onMouseEnter={hoverBg} onMouseLeave={clearBg} onClick={()=>{ onDelete(m); close(); }}>🗑 Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// WhatsApp-style delete confirmation: "Delete for everyone" only on your own unread message.
function DeleteMsgDialog({ msg, me, onForEveryone, onForMe, onClose }) {
  const canEveryone = msg.sender_id === me.id && !msg.read;
  const btn = (bg, color) => ({ width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F, border:'none', background:bg, color });
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.12)', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:14, boxShadow:'0 24px 70px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.06)', width:'100%', maxWidth:300, padding:20 }}>
        <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, textAlign:'center' }}>Delete message?</p>
        <p style={{ margin:'0 0 18px', fontSize:12.5, color:'rgba(0,0,0,.5)', textAlign:'center', lineHeight:1.5 }}>{canEveryone ? 'Delete this for everyone, or just remove it from your view.' : 'This will be removed from your view only.'}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {canEveryone && <button onClick={onForEveryone} style={btn('#DC2626', '#fff')}>Delete for everyone</button>}
          <button onClick={onForMe} style={btn('rgba(0,0,0,.06)', 'rgba(0,0,0,.85)')}>Delete for me</button>
          <button onClick={onClose} style={btn('rgba(0,0,0,.06)', 'rgba(0,0,0,.55)')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ChatArea({ peer, msgs, chat }) {
  const { me, onSend, onReact, onDeleteForMe, onUnsend, onUndoDelete, onForward } = chat;
  const [input, setInput] = useState('');
  const [atts, setAtts] = useState([]);          // { file, type, name, size, preview }
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [lb, setLb] = useState(null);            // { images, start }
  const [peerTyping, setPeerTyping] = useState(false);
  const [delMsg, setDelMsg] = useState(null);    // message pending delete-confirm
  const [undo, setUndo] = useState(null);        // { text, fn } 5s undo snackbar
  const boxRef = useRef(null), pvInput = useRef(null), docInput = useRef(null);
  const typingApi = useRef(null), lastTyped = useRef(0), stopTO = useRef(null), peerTO = useRef(null), undoTO = useRef(null);

  const showUndo = (text, fn) => { clearTimeout(undoTO.current); setUndo({ text, fn }); undoTO.current = setTimeout(() => setUndo(null), 5000); };
  useEffect(() => () => clearTimeout(undoTO.current), []);

  const visible = useMemo(() => msgs.filter(m => !(m.deleted_for || []).includes(me.id)), [msgs, me.id]);
  const lastMineId = useMemo(() => { for (let i = visible.length - 1; i >= 0; i--) if (visible[i].sender_id === me.id) return visible[i].id; return null; }, [visible, me.id]);

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [visible, peerTyping]);
  useEffect(() => () => atts.forEach(a => a.preview && URL.revokeObjectURL(a.preview)), [atts]);

  // Typing indicator: subscribe per-conversation, reset peer flag if their "stop" is missed.
  useEffect(() => {
    const api = subscribeTyping(me.id, peer.id, t => {
      setPeerTyping(t);
      if (t) { clearTimeout(peerTO.current); peerTO.current = setTimeout(() => setPeerTyping(false), 4500); }
    });
    typingApi.current = api;
    return () => { api.unsub(); setPeerTyping(false); clearTimeout(peerTO.current); clearTimeout(stopTO.current); };
  }, [me.id, peer.id]);

  const onType = v => {
    setInput(v);
    const api = typingApi.current; if (!api) return;
    const now = Date.now();
    if (now - lastTyped.current > 1500) { api.send(true); lastTyped.current = now; }
    clearTimeout(stopTO.current);
    stopTO.current = setTimeout(() => { api.send(false); lastTyped.current = 0; }, 2000);
  };

  const addAtts = list => {
    const picked = Array.from(list).filter(f => { if (f.size > MAX_FILE) { alert(`"${f.name}" is over 25 MB.`); return false; } return true; });
    const mapped = picked.map(file => { const type = dmType(file); return { file, type, name:file.name, size:file.size, preview:(type==='image'||type==='video') ? URL.createObjectURL(file) : null }; });
    setAtts(p => [...p, ...mapped].slice(0, 8));
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && atts.length === 0) || sending) return;
    setSending(true);
    typingApi.current?.send(false); clearTimeout(stopTO.current); lastTyped.current = 0;
    try {
      let media = null;
      if (atts.length) {
        media = [];
        for (const a of atts) {
          const f = a.type === 'image' ? await compressImage(a.file) : a.file;
          const url = await uploadPostFile(me.id, f);
          media.push({ url, type:a.type, name:a.name, size:f.size });
        }
      }
      onSend(peer.id, { text, media, replyTo: replyTo?.id || null });
      setInput(''); setAtts([]); setReplyTo(null);
    } catch { alert('Could not send. Please try again.'); }
    setSending(false);
  };

  const sendVoice = async file => {
    setSending(true);
    try { const url = await uploadPostFile(me.id, file); onSend(peer.id, { text:'', media:[{ url, type:'audio', name:file.name, size:file.size }] }); }
    catch { alert('Could not send voice note.'); }
    setSending(false);
  };

  const iconBtn = { width:36, height:36, border:'none', background:'none', cursor:'pointer', fontSize:18, borderRadius:9, flexShrink:0, color:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center' };
  const hasContent = input.trim() || atts.length > 0;

  return (
    <>
      <div ref={boxRef} style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:10 }}>
        {visible.length === 0 && <div style={{ textAlign:'center', color:'rgba(0,0,0,.4)', fontSize:13, paddingTop:60 }}>Start a conversation with {peer.name || 'this founder'}</div>}
        {visible.map(m => (
          <MsgBubble key={m.id} m={m} mine={m.sender_id === me.id} peer={peer} me={me} msgs={msgs}
            isLastMine={m.id === lastMineId} onImage={(images, start)=>setLb({ images, start })}
            onReact={(msg,e)=>onReact(peer.id, msg, e)} onReply={setReplyTo} onForward={onForward} onDelete={setDelMsg}/>
        ))}
        {peerTyping && (
          <div style={{ display:'flex', gap:8, alignSelf:'flex-start', alignItems:'flex-end' }}>
            <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={26}/>
            <div className="dm-typing" style={{ display:'flex', gap:4, padding:'11px 14px', background:'rgba(0,0,0,.05)', borderRadius:'14px 14px 14px 3px' }}><span/><span/><span/></div>
          </div>
        )}
      </div>

      {lb && <Lightbox images={lb.images} start={lb.start} onClose={()=>setLb(null)}/>}

      {delMsg && <DeleteMsgDialog msg={delMsg} me={me}
        onForEveryone={()=>{ const t = delMsg; onUnsend(peer.id, t); setDelMsg(null); showUndo('Message deleted for everyone', ()=>onUndoDelete(peer.id, t, 'everyone')); }}
        onForMe={()=>{ const t = delMsg; onDeleteForMe(peer.id, t); setDelMsg(null); showUndo('Message deleted', ()=>onUndoDelete(peer.id, t, 'me')); }}
        onClose={()=>setDelMsg(null)}/>}

      {replyTo && (
        <div style={{ padding:'9px 18px', borderTop:'1px solid rgba(0,0,0,.06)', display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,.02)', flexShrink:0 }}>
          <div style={{ width:3, alignSelf:'stretch', background:'rgba(0,0,0,.25)', borderRadius:2 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(0,0,0,.6)' }}>Replying to {replyTo.sender_id === me.id ? 'yourself' : (peer.name || 'founder')}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msgPreview(replyTo)}</div>
          </div>
          <button onClick={()=>setReplyTo(null)} style={{ border:'none', background:'none', cursor:'pointer', fontSize:15, color:'rgba(0,0,0,.5)' }}>✕</button>
        </div>
      )}

      {atts.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 18px 0', flexShrink:0 }}>
          {atts.map((a,i) => (
            <div key={i} style={{ position:'relative', width: (a.type==='image'||a.type==='video') ? 64 : 'auto', border:'1px solid rgba(0,0,0,.12)', borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,.02)' }}>
              {a.type === 'image' ? <img src={a.preview} alt={a.name} style={{ width:64, height:64, objectFit:'cover', display:'block' }}/>
                : a.type === 'video' ? <video src={a.preview} style={{ width:64, height:64, objectFit:'cover', display:'block', background:'#000' }}/>
                : <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 10px', maxWidth:180 }}><span style={{ fontSize:16 }}>{a.type==='audio'?'🎙':'📄'}</span><span style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span></div>}
              <button onClick={()=>setAtts(p=>p.filter((_,n)=>n!==i))} title="Remove" style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.7)', color:'#fff', fontSize:10, cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {undo && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, margin:'0 14px 8px', padding:'10px 14px', background:'rgba(0,0,0,.88)', color:'#fff', borderRadius:10, flexShrink:0, animation:'fadeUp .15s ease both' }}>
          <span style={{ fontSize:12.5 }}>{undo.text}</span>
          <button onClick={()=>{ clearTimeout(undoTO.current); undo.fn(); setUndo(null); }}
            style={{ background:'none', border:'none', color:'#fff', fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:F, textDecoration:'underline', flexShrink:0 }}>Undo</button>
        </div>
      )}

      <input ref={pvInput} type="file" accept="image/*,video/*" multiple hidden onChange={e=>{ addAtts(e.target.files); e.target.value=''; }}/>
      <input ref={docInput} type="file" accept={DOC_ACCEPT} multiple hidden onChange={e=>{ addAtts(e.target.files); e.target.value=''; }}/>

      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(0,0,0,.08)', display:'flex', gap:3, alignItems:'flex-end', flexShrink:0 }}>
        <button title="Photo or video" onClick={()=>pvInput.current?.click()} style={iconBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}><IcoPhoto/></button>
        <button title="Document" onClick={()=>docInput.current?.click()} style={iconBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}><IcoClip/></button>
        <div style={{ position:'relative' }}>
          <button title="Emoji" onClick={()=>setEmojiOpen(o=>!o)} style={iconBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}><IcoEmoji/></button>
          {emojiOpen && <EmojiPicker onPick={e=>setInput(v=>v+e)} onClose={()=>setEmojiOpen(false)}/>}
        </div>
        <input value={input} onChange={e=>onType(e.target.value)} placeholder={`Message ${peer.name || 'founder'}…`} disabled={sending}
          onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex:1, minWidth:0, border:'1px solid rgba(0,0,0,.2)', borderRadius:22, padding:'9px 16px', fontSize:13, fontFamily:F, outline:'none', alignSelf:'center' }}/>
        {hasContent
          ? <button onClick={send} disabled={sending} title="Send" style={{ width:36, height:36, background:'rgba(0,0,0,.9)', border:'none', borderRadius:'50%', color:'#fff', cursor:'pointer', flexShrink:0, opacity:sending?.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}><IcoSend/></button>
          : <VoiceRecorder onDone={sendVoice} iconBtn={iconBtn}/>}
      </div>
    </>
  );
}

// Pick conversations to forward a message into.
function ForwardDialog({ msg, convs, me, onForward, onClose }) {
  const [sel, setSel] = useState(new Set());
  const peers = Object.values(convs).map(c => c.peer).filter(p => p && p.id !== me.id);
  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:360, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card, width:'100%', maxWidth:380, padding:0, boxShadow:'0 20px 60px rgba(0,0,0,.2)', display:'flex', flexDirection:'column', maxHeight:'80vh' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:15, fontWeight:700 }}>Forward to…</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:'1px solid rgba(0,0,0,.06)', fontSize:12.5, color:'rgba(0,0,0,.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msgPreview(msg) || '[attachment]'}</div>
        <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
          {peers.length === 0 && <div style={{ textAlign:'center', color:'rgba(0,0,0,.4)', fontSize:12.5, padding:'28px 16px' }}>No conversations to forward to yet.</div>}
          {peers.map(p => (
            <div key={p.id} onClick={()=>toggle(p.id)} style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 18px', cursor:'pointer', background: sel.has(p.id) ? 'rgba(0,0,0,.04)' : 'transparent' }}>
              <Av name={p.name} uid={p.id} url={p.avatar_url} sz={36}/>
              <div style={{ flex:1, fontSize:13.5, fontWeight:600 }}>{p.name || 'Founder'}</div>
              <div style={{ width:20, height:20, borderRadius:'50%', border:'1.5px solid', borderColor: sel.has(p.id) ? 'rgba(0,0,0,.9)' : 'rgba(0,0,0,.25)', background: sel.has(p.id) ? 'rgba(0,0,0,.9)' : 'transparent', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{sel.has(p.id) ? '✓' : ''}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,.08)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.5)', background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Cancel</button>
          <button onClick={()=>{ onForward([...sel]); }} disabled={sel.size === 0}
            style={{ padding:'8px 20px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:13.5, fontWeight:700, cursor:'pointer', opacity:sel.size?1:.4, fontFamily:F }}>Send{sel.size ? ` (${sel.size})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

function MessagesView({ convs, activePeer, onOpenConv, chat }) {
  const list = Object.values(convs).sort((a,b) => {
    const la = a.messages[a.messages.length-1]?.created_at || 0;
    const lb = b.messages[b.messages.length-1]?.created_at || 0;
    return new Date(lb) - new Date(la);
  });
  const act = activePeer ? convs[activePeer] : null;
  return (
    <div className="fade-up" style={{ ...card, display:'flex', height:'calc(100vh - 130px)', overflow:'hidden' }}>
      <div style={{ width:240, minWidth:240, borderRight:'1px solid rgba(0,0,0,.08)', overflowY:'auto', padding:'12px 0' }}>
        {list.length === 0 && <div style={{ textAlign:'center', color:'rgba(0,0,0,.4)', fontSize:12.5, padding:'30px 16px', lineHeight:1.6 }}>No conversations yet. Hit "DM" on any idea to start one.</div>}
        {list.map(c=>{
          const last = lastVisible(c.messages, chat.me.id);
          return (
            <div key={c.peer.id} onClick={()=>onOpenConv(c.peer.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', background:activePeer===c.peer.id?'rgba(0,0,0,.05)':'transparent' }}>
              <Av name={c.peer.name} uid={c.peer.id} url={c.peer.avatar_url} sz={38}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{c.peer.name || 'Founder'}</div>
                <div style={{ fontSize:11.5, color:'rgba(0,0,0,.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last ? msgPreview(last) : ''}</div>
              </div>
              {c.unread > 0 && <div style={{ width:17, height:17, background:'rgba(0,0,0,.9)', color:'#fff', borderRadius:10, fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{c.unread}</div>}
            </div>
          );
        })}
      </div>
      {act ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'13px 22px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <Av name={act.peer.name} uid={act.peer.id} url={act.peer.avatar_url} sz={34}/>
            <div style={{ fontSize:14, fontWeight:700 }}>{act.peer.name || 'Founder'}</div>
          </div>
          <ChatArea peer={act.peer} msgs={act.messages} chat={chat}/>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(0,0,0,.4)', fontSize:13 }}>Select a conversation</div>
      )}
    </div>
  );
}

function DMPanel({ peer, msgs, chat, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:300, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', right:0, top:0, bottom:0, width:368, maxWidth:'92vw', background:'#fff', borderLeft:'1px solid rgba(0,0,0,.08)', display:'flex', flexDirection:'column', zIndex:301, boxShadow:'-12px 0 48px rgba(0,0,0,.07)', animation:'dmSlide .22s ease both' }}>
        <div style={{ padding:'13px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={34}/>
          <div style={{ flex:1, fontSize:14, fontWeight:700 }}>{peer.name || 'Founder'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:16, padding:4 }}>✕</button>
        </div>
        <ChatArea peer={peer} msgs={msgs} chat={chat}/>
      </div>
    </>
  );
}

// ── Left sidebar ─────────────────────────────────────────────────────────────
function LeftBar({ me, posts, followerCount, unread, view, goFeed, goProfile, goMessages, goOpenings, onPost, requireAuth, verifiedIds }) {
  const myPosts = me ? posts.filter(p=>p.user_id===me.id) : [];
  const myRatings = myPosts.flatMap(p=>p.ratings||[]);
  const myAvg = myRatings.length ? (avg10(myRatings)).toFixed(1) : '—';
  const tagCounts = useMemo(() => {
    const c = {};
    posts.forEach(p=>(p.tags||[]).forEach(t=>{ c[t]=(c[t]||0)+1; }));
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }, [posts]);
  const navIco = { home:NAV_ICONS.home, profile:'M12 12a4 4 0 100-8 4 4 0 000 8Zm-7 8a7 7 0 0114 0', network:NAV_ICONS.network, messages:NAV_ICONS.messages, openings:NAV_ICONS.openings };

  return (
    <div style={{ width:238, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ height:64, background:coverOf(), cursor:'pointer' }} onClick={me?()=>goProfile(me.id):requireAuth(()=>{})}/>
        <div style={{ padding:'0 14px 14px', position:'relative' }}>
          <div style={{ position:'absolute', top:-28 }}>
            <Av name={nameOf(me)} uid={me?.id||'me'} url={me?.user_metadata?.avatar_url} sz={62} border onClick={me?()=>goProfile(me.id):undefined}/>
          </div>
          <div style={{ paddingTop:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={me?()=>goProfile(me.id):requireAuth(()=>{})} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:16, fontWeight:800, color:'rgba(0,0,0,.9)', textAlign:'left', fontFamily:F }}>{me?nameOf(me):'Sign in'}</button>
              {me && verifiedIds?.has(me.id) && <VerifiedBadge sz={16}/>}
            </div>
            <p style={{ margin:'2px 0 0', fontSize:12.5, color:'rgba(0,0,0,.55)', lineHeight:1.4 }}>{me?'Founder · Startup Oracle':'Join the founder community'}</p>
          </div>
        </div>
        {me && (
          <div style={{ borderTop:'1px solid rgba(0,0,0,.08)', padding:'12px 8px', display:'flex' }}>
            {[['Followers', followerCount],['Ideas', myPosts.length],['Rating', myAvg==='—'?'—':`${myAvg}`]].map(([l,v])=>(
              <div key={l} style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'rgba(0,0,0,.9)' }}>{v}</div>
                <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)' }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ borderTop:'1px solid rgba(0,0,0,.08)', padding:'6px 6px' }}>
          {[
            ['feed','Browse Ideas','home', goFeed],
            ['profile','My Profile','profile', me?()=>goProfile(me.id):requireAuth(()=>{})],
            ['messages','Messages','messages', goMessages],
            ['openings','Openings','openings', goOpenings],
          ].map(([id,label,ico,fn])=>{
            const act = view===id || (id==='profile' && view==='profile-self');
            return (
              <button key={id} onClick={fn} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'10px 12px', borderRadius:8, border:'none', background:act?GREEN_SOFT:'transparent', color:act?GREEN:'rgba(0,0,0,.6)', fontSize:13.5, fontWeight:act?700:600, cursor:'pointer', fontFamily:F, transition:'all .15s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={navIco[ico]}/></svg>
                {label}
                {id==='messages' && unread>0 && <span style={{ marginLeft:'auto', background:GREEN, color:'#fff', fontSize:9.5, fontWeight:700, minWidth:17, height:17, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={me ? onPost : requireAuth(()=>{})}
        style={{ ...card, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', background:INK, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>
        + Post an Idea
      </button>

      <div style={{ ...card, padding:'14px 16px' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10, color:'rgba(0,0,0,.9)' }}>Trending Topics</div>
        {tagCounts.length === 0 && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>No topics yet.</div>}
        {tagCounts.map(([t,n])=>(
          <div key={t} style={{ fontSize:12.5, color:'rgba(0,0,0,.6)', marginBottom:7, lineHeight:1.4 }}>
            <span style={{ fontWeight:700, color:GREEN }}>#{t.replace(/\s+/g,'')}</span> <span style={{ color:'rgba(0,0,0,.4)' }}>· {n} idea{n!==1?'s':''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right sidebar ────────────────────────────────────────────────────────────
// Live startup news. Primary source is our own serverless /api/news (server-side
// TechCrunch RSS fetch — reliable, no CORS). Falls back to the rss2json proxy, then
// to a tiny static list only if both are unreachable.
const NEWS_FALLBACK = [
  { h:'Latest startup news on TechCrunch', t:'Live feed', link:'https://techcrunch.com/category/startups/' },
  { h:'Funding rounds, launches & acquisitions', t:'Crunchbase News', link:'https://news.crunchbase.com/' },
  { h:'Venture & markets coverage', t:'Daily', link:'https://techcrunch.com/category/venture/' },
];
const NEWS_FEED = 'https://techcrunch.com/category/startups/feed/';

function useStartupNews() {
  const [news, setNews] = useState(NEWS_FALLBACK);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const r = await fetch('/api/news');
        if (r.ok) {
          const d = await r.json();
          if (on && d.items?.length) { setNews(d.items.slice(0, 6).map(i => ({ h: i.title, t: i.pubDate ? timeAgo(i.pubDate) : '', link: i.link }))); return; }
        }
      } catch { /* fall through to proxy */ }
      try {
        const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(NEWS_FEED)}`);
        const d = await r.json();
        if (on && d.status === 'ok' && d.items?.length) setNews(d.items.slice(0, 6).map(i => ({ h: i.title, t: timeAgo(i.pubDate.replace(' ', 'T') + 'Z'), link: i.link })));
      } catch { /* keep static fallback */ }
    })();
    return () => { on = false; };
  }, []);
  return news;
}

function RightBar({ me, posts, followingIds, pendingIds, onFollow, onProfile, requireAuth, verifiedIds }) {
  const news = useStartupNews();
  const [pymk, setPymk] = useState([]);
  useEffect(() => { let on = true; if (me) fetchPeopleYouMayKnow(me.id).then(p => on && setPymk(p)); return () => { on = false; }; }, [me]);
  const fallback = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of posts) {
      if (p.user_id === me?.id || seen.has(p.user_id)) continue;
      seen.add(p.user_id);
      out.push({ id:p.user_id, ...p.author });
      if (out.length >= 5) break;
    }
    return out;
  }, [posts, me]);
  const source = me ? (pymk.length ? pymk : fallback) : fallback;
  const list = source.filter(p => p.id !== me?.id && !followingIds?.has(p.id) && !pendingIds?.has(p.id)).slice(0, 5);
  const [mutualMap, setMutualMap] = useState({});
  const listIds = list.map(f => f.id).join(',');
  useEffect(() => {
    let on = true;
    if (me && listIds) fetchMutualFollowersBatch(listIds.split(','), followingIds).then(m => on && setMutualMap(m));
    return () => { on = false; };
  }, [listIds, me, followingIds]);

  return (
    <div className="comm-right" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ ...card, padding:'14px 16px' }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Founders to follow</div>
        {list.length === 0
          ? <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>New founders will appear here.</div>
          : list.map(f=>(
              <div key={f.id} style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
                <Av name={f.name} uid={f.id} url={f.avatar_url} sz={42} onClick={()=>onProfile(f.id)}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
                    <button onClick={()=>onProfile(f.id)} style={{ background:'none', border:'none', padding:0, fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', cursor:'pointer', textAlign:'left', fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name || 'Founder'}</button>
                    {verifiedIds?.has(f.id) && <VerifiedBadge sz={13}/>}
                  </div>
                  <div style={{ fontSize:12, color:'rgba(0,0,0,.55)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headlineOf(f)}</div>
                  {mutualMap[f.id]?.count > 0 && (
                    <div style={{ fontSize:11, color:'rgba(0,0,0,.45)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      Followed by {(mutualMap[f.id].people[0]?.name || 'Founder').split(' ')[0]}{mutualMap[f.id].count > 1 ? ` +${mutualMap[f.id].count - 1}` : ''}
                    </div>
                  )}
                </div>
                <button onClick={requireAuth(()=>onFollow(f.id))} style={{ padding:'5px 16px', borderRadius:99, border:`1.5px solid ${GREEN}`, fontSize:13, fontWeight:700, cursor:'pointer', background:'transparent', color:GREEN, fontFamily:F, flexShrink:0, alignSelf:'flex-start', marginTop:2 }}>Follow</button>
              </div>
            ))}
      </div>
      <div style={{ ...card, padding:'14px 16px' }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>📰 Startup News</div>
        {news.map((n,i)=>(
          <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
            style={{ display:'block', marginBottom:10, paddingBottom:10, textDecoration:'none', borderBottom:i<news.length-1?'1px solid rgba(0,0,0,.06)':'none' }}>
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4, color:'rgba(0,0,0,.9)' }}
              onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>{n.h}</div>
            <div style={{ fontSize:11, color:'rgba(0,0,0,.45)', marginTop:2 }}>{n.t}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── People list modal (Instagram-style followers / following) ────────────────
function PeopleModal({ uid, type, me, followingIds, pendingIds, onFollow, onProfile, requireAuth, onClose }) {
  const [people, setPeople] = useState(null);
  useEffect(() => {
    let on = true;
    fetchFollowList(uid, type).then(p => on && setPeople(p));
    return () => { on = false; };
  }, [uid, type]);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:350, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.2)', width:'100%', maxWidth:400, maxHeight:'70vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'13px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:15, fontWeight:700, textTransform:'capitalize' }}>{type}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:16, padding:4 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', padding:'4px 18px 10px' }}>
          {people === null && <div style={{ padding:'24px 0', textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>Loading…</div>}
          {people?.length === 0 && (
            <div style={{ padding:'30px 0', textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>
              {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          )}
          {people?.map((u,i)=>(
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i===people.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
              <Av name={u.name} uid={u.id} url={u.avatar_url} sz={40} onClick={()=>{ onClose(); onProfile(u.id); }}/>
              <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>{ onClose(); onProfile(u.id); }}>
                <div style={{ fontSize:13.5, fontWeight:600 }}>{u.name || 'Founder'}</div>
                <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headlineOf(u)}</div>
              </div>
              {me && u.id !== me.id && (
                <button onClick={requireAuth(()=>onFollow(u.id))}
                  style={{ padding:'5px 14px', borderRadius:99, border:`1.5px solid ${pendingIds?.has(u.id)?'rgba(0,0,0,.3)':'rgba(0,0,0,.9)'}`, fontSize:12, fontWeight:700, cursor:'pointer', background:followingIds.has(u.id)?'rgba(0,0,0,.9)':'transparent', color:followingIds.has(u.id)?'#fff':pendingIds?.has(u.id)?'rgba(0,0,0,.45)':'rgba(0,0,0,.9)', fontFamily:F, flexShrink:0 }}>
                  {followingIds.has(u.id)?'Following':pendingIds?.has(u.id)?'Requested':'Follow'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Edit profile modal ───────────────────────────────────────────────────────
function EditProfileModal({ me, prof, onClose, onSaved }) {
  const [name, setName] = useState(nameOf(me));
  const [bio, setBio] = useState(prof?.bio || '');
  const [about, setAbout] = useState(prof?.about || '');
  const [location, setLocation] = useState(prof?.location || '');
  const [skills, setSkills] = useState((prof?.skills || []).join(', '));
  const [experience, setExperience] = useState(prof?.experience?.length ? prof.experience : []);
  const [education, setEducation] = useState(prof?.education?.length ? prof.education : []);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPrev, setAvatarPrev] = useState(me?.user_metadata?.avatar_url || null);
  const [bannerPrev, setBannerPrev] = useState(prof?.banner_url || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const avInput = useRef(null);
  const bnInput = useRef(null);

  const setExp = (i, k, v) => setExperience(p => p.map((e,n)=>n===i?{...e,[k]:v}:e));
  const setEdu = (i, k, v) => setEducation(p => p.map((e,n)=>n===i?{...e,[k]:v}:e));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const fields = {
        name: name.trim() || nameOf(me),
        bio: bio.trim(),
        about: about.trim(),
        location: location.trim(),
        skills: skills.split(',').map(s=>s.trim()).filter(Boolean).slice(0,20),
        experience: experience.filter(e=>e.title||e.company),
        education: education.filter(e=>e.school||e.degree),
      };
      const authMeta = { full_name: fields.name };
      if (avatarFile) { const url = await uploadProfileImage(me.id, avatarFile, 'avatar'); fields.avatar_url = url; authMeta.avatar_url = url; }
      if (bannerFile) fields.banner_url = await uploadProfileImage(me.id, bannerFile, 'banner');
      await updateProfile(me.id, fields);
      await syncAuthMeta(authMeta);
      onSaved(fields);
      onClose();
    } catch (e) { setErr(e?.message || 'Could not save. Try again.'); setBusy(false); }
  };

  const inp = { width:'100%', border:'1px solid rgba(0,0,0,.18)', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:F, outline:'none', boxSizing:'border-box', background:'#fff' };
  const lbl = { fontSize:12, fontWeight:700, color:'rgba(0,0,0,.65)', marginBottom:5, display:'block' };
  const addBtn = { background:'none', border:'none', color:'#2563EB', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:F };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:360, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card, width:'100%', maxWidth:560, padding:0, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>Edit profile</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:18, padding:4 }}>✕</button>
        </div>

        <div style={{ position:'relative' }}>
          <div onClick={()=>bnInput.current?.click()} style={{ height:120, cursor:'pointer', background: bannerPrev?`center/cover no-repeat url(${bannerPrev})`:coverOf(me?.id||'me') }}/>
          <div style={{ position:'absolute', top:8, right:10, fontSize:11, fontWeight:600, color:'#fff', background:'rgba(0,0,0,.4)', padding:'4px 10px', borderRadius:99, pointerEvents:'none' }}>📷 Banner</div>
          <div onClick={()=>avInput.current?.click()} style={{ position:'absolute', left:18, top:78, cursor:'pointer' }}>
            <Av name={name} uid={me?.id||'me'} url={avatarPrev} sz={72} border/>
            <div style={{ position:'absolute', bottom:0, right:0, background:'rgba(0,0,0,.9)', color:'#fff', width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>✎</div>
          </div>
        </div>
        <input ref={avInput} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(f){ setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); } e.target.value=''; }}/>
        <input ref={bnInput} type="file" accept="image/*" hidden onChange={e=>{ const f=e.target.files[0]; if(f){ setBannerFile(f); setBannerPrev(URL.createObjectURL(f)); } e.target.value=''; }}/>

        <div style={{ padding:'40px 18px 16px', display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={inp}/></div>
          <div><label style={lbl}>Headline</label><input value={bio} onChange={e=>setBio(e.target.value)} placeholder="e.g. Founder · Building X for Y" style={inp}/></div>
          <div><label style={lbl}>Location</label><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Hyderabad, India" style={inp}/></div>
          <div><label style={lbl}>About</label><textarea value={about} onChange={e=>setAbout(e.target.value)} rows={4} placeholder="Tell founders about yourself, what you're building, and what you're looking for." style={{ ...inp, resize:'vertical', lineHeight:1.6 }}/></div>
          <div><label style={lbl}>Skills (comma-separated)</label><input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="Product, Growth, Fundraising" style={inp}/></div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>Experience</span>
              <button onClick={()=>setExperience(p=>[...p,{title:'',company:'',period:'',desc:''}])} style={addBtn}>+ Add</button>
            </div>
            {experience.map((e,i)=>(
              <div key={i} style={{ border:'1px solid rgba(0,0,0,.1)', borderRadius:8, padding:10, marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                <input value={e.title||''} onChange={ev=>setExp(i,'title',ev.target.value)} placeholder="Title (e.g. Founder)" style={inp}/>
                <input value={e.company||''} onChange={ev=>setExp(i,'company',ev.target.value)} placeholder="Company" style={inp}/>
                <input value={e.period||''} onChange={ev=>setExp(i,'period',ev.target.value)} placeholder="Period (e.g. 2023 – Present)" style={inp}/>
                <textarea value={e.desc||''} onChange={ev=>setExp(i,'desc',ev.target.value)} rows={2} placeholder="What you did (optional)" style={{ ...inp, resize:'vertical' }}/>
                <button onClick={()=>setExperience(p=>p.filter((_,n)=>n!==i))} style={{ alignSelf:'flex-start', background:'none', border:'none', color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>Remove</button>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>Education</span>
              <button onClick={()=>setEducation(p=>[...p,{school:'',degree:'',period:''}])} style={addBtn}>+ Add</button>
            </div>
            {education.map((e,i)=>(
              <div key={i} style={{ border:'1px solid rgba(0,0,0,.1)', borderRadius:8, padding:10, marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                <input value={e.school||''} onChange={ev=>setEdu(i,'school',ev.target.value)} placeholder="School / University" style={inp}/>
                <input value={e.degree||''} onChange={ev=>setEdu(i,'degree',ev.target.value)} placeholder="Degree & field" style={inp}/>
                <input value={e.period||''} onChange={ev=>setEdu(i,'period',ev.target.value)} placeholder="Period (e.g. 2018 – 2022)" style={inp}/>
                <button onClick={()=>setEducation(p=>p.filter((_,n)=>n!==i))} style={{ alignSelf:'flex-start', background:'none', border:'none', color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>Remove</button>
              </div>
            ))}
          </div>

          {err && <div style={{ fontSize:12.5, color:'#DC2626' }}>{err}</div>}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,.08)' }}>
          <button onClick={onClose} style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.5)', background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding:'8px 24px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', opacity:busy?.6:1, fontFamily:F }}>{busy?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Profile view (any founder) ───────────────────────────────────────────────
function ProfileView({ uid, me, posts, followingIds, pendingIds, onFollow, onProfile, onRate, rOpen, onTR, cOpen, onTC, onBack, openDM, requireAuth, onDelete, onSave, onRepost, onOpenPost, savedIds, onVote, verifiedIds }) {
  const isSelf = me && uid === me.id;
  const [prof, setProf] = useState(null);
  const [counts, setCounts] = useState({ followers:0, following:0 });
  const [viewers, setViewers] = useState(null); // { count, viewers } — self only
  const [mutuals, setMutuals] = useState(null); // { people, count } — followed-by social proof
  const [tab, setTab] = useState('ideas');
  const [received, setReceived] = useState(null);
  const [requests, setRequests] = useState(null);
  const [peopleModal, setPeopleModal] = useState(null); // 'followers' | 'following'
  const [editing, setEditing] = useState(false);
  const linkBtn = { background:'none', border:'none', color:GREEN, fontWeight:600, fontSize:13.5, cursor:'pointer', fontFamily:F, padding:0 };

  useEffect(() => {
    let on = true;
    fetchProfile(uid).then(p => on && setProf(p));
    fetchFollowCounts(uid).then(c => on && setCounts(c));
    if (me && uid === me.id) {
      fetchFollowRequests(uid).then(r => on && setRequests(r));
      fetchProfileViewers(uid).then(v => on && setViewers(v));
    } else if (me) {
      recordProfileView(me.id, uid);
    }
    return () => { on = false; };
  }, [uid, me]);
  useEffect(() => {
    if (!isSelf) return;
    let on = true;
    if (tab === 'ratings') fetchRatingsReceived(uid).then(r => on && setReceived(r));
    return () => { on = false; };
  }, [tab, uid, isSelf]);
  useEffect(() => {
    if (isSelf || !me) return;
    let on = true;
    fetchMutualFollowers(uid, followingIds).then(m => on && setMutuals(m));
    return () => { on = false; };
  }, [uid, me, isSelf, followingIds]);

  const mutualText = (people, count) => {
    const n = people.map(p => (p.name || 'Founder').split(' ')[0]);
    if (count === 1) return `Followed by ${n[0]}`;
    if (count === 2) return `Followed by ${n[0]} and ${n[1]}`;
    return `Followed by ${n[0]}, ${n[1]} and ${count - 2} other${count - 2 !== 1 ? 's' : ''}`;
  };

  const respond = async (followerId, accept) => {
    setRequests(prev => (prev||[]).filter(p => p.id !== followerId));
    if (accept) setCounts(c => ({ ...c, followers: c.followers + 1 }));
    await respondFollowRequest(me.id, followerId, accept);
    if (accept) createNotification({ actorId:me.id, userId:followerId, type:'follow_accept' });
  };

  const fps = posts.filter(p=>p.user_id===uid);
  const name = isSelf ? nameOf(me) : (prof?.name || fps[0]?.author?.name || 'Founder');
  const avatar = isSelf ? me.user_metadata?.avatar_url : prof?.avatar_url;
  const isF = followingIds.has(uid);
  const isP = pendingIds?.has(uid);
  const reqCount = requests?.length || 0;
  const filled = [avatar, prof?.banner_url, prof?.bio, prof?.about, prof?.location, prof?.skills?.length, prof?.experience?.length, prof?.education?.length].filter(Boolean).length;
  const pct = Math.round((filled / 8) * 100);
  const pill = { padding:'8px 18px', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F };

  const tabs = isSelf
    ? [['ideas','My Ideas'],['ratings','Ratings Received'],['requests', reqCount ? `Requests (${reqCount})` : 'Requests']]
    : [];

  return (
    <div key={uid} className="fade-up" style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ height:140, background: prof?.banner_url ? `center/cover no-repeat url(${prof.banner_url})` : coverOf(uid), position:'relative' }}>
          <button onClick={onBack} style={{ position:'absolute', top:12, left:12, padding:'6px 14px', borderRadius:99, background:'rgba(0,0,0,.35)', backdropFilter:'blur(10px)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>← Back</button>
        </div>
        <div style={{ padding:'0 24px 20px', position:'relative' }}>
          <div style={{ position:'absolute', top:-40 }}>
            <Av name={name} uid={uid} url={avatar} sz={80} border/>
          </div>
          <div style={{ paddingTop:50, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:'rgba(0,0,0,.9)', display:'flex', alignItems:'center', gap:7 }}>{name}{verifiedIds?.has(uid) && <VerifiedBadge sz={18}/>}</div>
              <div style={{ fontSize:14, color:'rgba(0,0,0,.6)', marginTop:2 }}>{headlineOf(prof)}</div>
              {!isSelf && mutuals?.count > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:9 }}>
                  <div style={{ display:'flex' }}>
                    {mutuals.people.map((p,idx)=>(
                      <div key={p.id} style={{ marginLeft: idx ? -8 : 0, borderRadius:'50%', border:'2px solid #fff' }}>
                        <Av name={p.name} uid={p.id} url={p.avatar_url} sz={24}/>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize:12.5, color:'rgba(0,0,0,.55)' }}>{mutualText(mutuals.people, mutuals.count)}</span>
                </div>
              )}
            </div>
            {!isSelf && (
              <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                <button onClick={requireAuth(()=>onFollow(uid))} style={{ ...pill, border:`1.5px solid ${isP?'rgba(0,0,0,.3)':INK}`, background:isF?INK:'transparent', color:isF?'#fff':isP?'rgba(0,0,0,.45)':INK }}>{isF?'Following':isP?'Requested':'Follow'}</button>
                <button onClick={requireAuth(()=>openDM({ id:uid, name, avatar_url:avatar }))} style={{ ...pill, fontWeight:600, border:'1.5px solid rgba(0,0,0,.25)', background:'transparent', color:'rgba(0,0,0,.7)' }}>Message</button>
              </div>
            )}
            {isSelf && (
              <button onClick={()=>setEditing(true)} style={{ marginTop:8, padding:'8px 20px', borderRadius:99, border:'1.5px solid rgba(0,0,0,.25)', fontSize:14, fontWeight:600, cursor:'pointer', background:'transparent', color:'rgba(0,0,0,.8)', fontFamily:F }}>✎ Edit profile</button>
            )}
          </div>
          <div style={{ display:'flex', gap:24, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(0,0,0,.08)' }}>
            {[['Followers', counts.followers, 'followers'],['Following', counts.following, 'following'],['Ideas', fps.length, null]].map(([l,v,modal])=>(
              <div key={l} onClick={modal ? ()=>setPeopleModal(modal) : undefined}
                style={{ cursor: modal ? 'pointer' : 'default', borderRadius:6, padding:'2px 6px', margin:'-2px -6px', transition:'background .12s' }}
                onMouseEnter={e=>{ if(modal) e.currentTarget.style.background='rgba(0,0,0,.05)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; }}>
                <div style={{ fontSize:16, fontWeight:800, color:'rgba(0,0,0,.9)' }}>{v}</div>
                <div style={{ fontSize:13, color:'rgba(0,0,0,.5)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {isSelf && (
          <div style={{ display:'flex', borderTop:'1px solid rgba(0,0,0,.08)' }}>
            {tabs.map(([k,l])=>(
              <button key={k} onClick={()=>{ setTab(k); setReceived(null); }}
                style={{ flex:1, padding:'11px 4px', border:'none', borderBottom:tab===k?'2px solid rgba(0,0,0,.9)':'2px solid transparent', background:'transparent', fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer', color:tab===k?'rgba(0,0,0,.9)':'rgba(0,0,0,.55)', fontFamily:F }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {(!isSelf || tab === 'ideas') && (
        <>
          {isSelf && viewers && (
            <div style={{ ...card, padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: viewers.count?10:0 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>👁 Who viewed your profile</span>
                <span style={{ fontSize:13, fontWeight:800 }}>{viewers.count}</span>
              </div>
              {viewers.count > 0
                ? <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {viewers.viewers.slice(0,8).map(v=>(
                      <div key={v.id} onClick={()=>onProfile(v.id)} title={v.name||'Founder'} style={{ cursor:'pointer' }}>
                        <Av name={v.name} uid={v.id} url={v.avatar_url} sz={36}/>
                      </div>
                    ))}
                  </div>
                : <div style={{ fontSize:12.5, color:'rgba(0,0,0,.45)' }}>No profile views yet.</div>}
            </div>
          )}
          {isSelf && pct < 100 && (
            <div style={{ ...card, padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>Profile strength</span>
                <span style={{ fontSize:13, fontWeight:700, color: pct>=80?'#059669':'#d97706' }}>{pct}%</span>
              </div>
              <div style={{ height:6, borderRadius:99, background:'rgba(0,0,0,.08)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: pct>=80?'#059669':'#2563EB', transition:'width .3s' }}/>
              </div>
              <div style={{ fontSize:12, color:'rgba(0,0,0,.5)', marginTop:8 }}>Complete your profile to build trust with other founders. <button onClick={()=>setEditing(true)} style={{ ...linkBtn, fontSize:12 }}>Edit profile</button></div>
            </div>
          )}

          {(prof?.about || prof?.location || prof?.skills?.length || isSelf) && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>About</div>
              {prof?.about
                ? <p style={{ margin:0, fontSize:14, lineHeight:1.65, color:'rgba(0,0,0,.78)', whiteSpace:'pre-line' }}>{prof.about}</p>
                : isSelf && <button onClick={()=>setEditing(true)} style={linkBtn}>+ Add an About section</button>}
              {prof?.location && <div style={{ fontSize:13, color:'rgba(0,0,0,.5)', marginTop:10 }}>📍 {prof.location}</div>}
              {prof?.skills?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
                  {prof.skills.map(s=><span key={s} style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'rgba(0,0,0,.06)', color:'rgba(0,0,0,.7)' }}>{s}</span>)}
                </div>
              )}
            </div>
          )}

          {(prof?.experience?.length > 0 || isSelf) && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom: prof?.experience?.length?12:8 }}>Experience</div>
              {prof?.experience?.length
                ? prof.experience.map((e,i)=>(
                    <div key={i} style={{ display:'flex', gap:12, paddingBottom:i===prof.experience.length-1?0:12, marginBottom:i===prof.experience.length-1?0:12, borderBottom:i===prof.experience.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                      <div style={{ width:38, height:38, borderRadius:8, background:'rgba(0,0,0,.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>💼</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700 }}>{e.title||'Role'}</div>
                        <div style={{ fontSize:13, color:'rgba(0,0,0,.7)' }}>{e.company}</div>
                        {e.period && <div style={{ fontSize:12, color:'rgba(0,0,0,.45)' }}>{e.period}</div>}
                        {e.desc && <p style={{ margin:'4px 0 0', fontSize:13, lineHeight:1.5, color:'rgba(0,0,0,.7)' }}>{e.desc}</p>}
                      </div>
                    </div>
                  ))
                : <button onClick={()=>setEditing(true)} style={linkBtn}>+ Add experience</button>}
            </div>
          )}

          {(prof?.education?.length > 0 || isSelf) && (
            <div style={{ ...card, padding:'16px 18px' }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom: prof?.education?.length?12:8 }}>Education</div>
              {prof?.education?.length
                ? prof.education.map((e,i)=>(
                    <div key={i} style={{ display:'flex', gap:12, paddingBottom:i===prof.education.length-1?0:12, marginBottom:i===prof.education.length-1?0:12, borderBottom:i===prof.education.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                      <div style={{ width:38, height:38, borderRadius:8, background:'rgba(0,0,0,.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎓</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700 }}>{e.school||'School'}</div>
                        <div style={{ fontSize:13, color:'rgba(0,0,0,.7)' }}>{e.degree}</div>
                        {e.period && <div style={{ fontSize:12, color:'rgba(0,0,0,.45)' }}>{e.period}</div>}
                      </div>
                    </div>
                  ))
                : <button onClick={()=>setEditing(true)} style={linkBtn}>+ Add education</button>}
            </div>
          )}

          {fps.length === 0
          ? <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>No ideas posted yet.</div>
          : fps.map(p=><PostCard key={p.id} post={p} me={me} followingIds={followingIds} pendingIds={pendingIds} onFollow={onFollow} onProfile={onProfile} onRate={onRate} rOpen={rOpen===p.id} onTR={()=>onTR(p.id)} cOpen={cOpen===p.id} onTC={()=>onTC(p.id)} requireAuth={requireAuth} onDelete={onDelete} onDM={openDM} onSave={onSave} onRepost={onRepost} onOpenPost={onOpenPost} saved={savedIds?.has(p.id)} onVote={onVote} verifiedIds={verifiedIds}/>)}
        </>
      )}

      {isSelf && tab === 'ratings' && (
        received === null ? <div style={{ ...card, padding:24, textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>Loading…</div>
        : received.length === 0 ? <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>No ratings received yet.</div>
        : (
          <div style={{ ...card, padding:'4px 20px' }}>
            {received.map((r,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:i===received.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                <Av name={r.rater?.name} uid={r.rater?.name||i} url={r.rater?.avatar_url} sz={35}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.rater?.name || 'Founder'}</div>
                  <div style={{ fontSize:11.5, color:'rgba(0,0,0,.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.post?.title}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{to10(r.value)}/10</div>
                  <div style={{ fontSize:10.5, color:'rgba(0,0,0,.45)' }}>{timeAgo(r.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {isSelf && tab === 'requests' && (
        requests === null ? <div style={{ ...card, padding:24, textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>Loading…</div>
        : requests.length === 0 ? <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>No pending follow requests.</div>
        : (
          <div style={{ ...card, padding:'4px 20px' }}>
            {requests.map((u,i)=>(
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:i===requests.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                <Av name={u.name} uid={u.id} url={u.avatar_url} sz={40} onClick={()=>onProfile(u.id)}/>
                <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>onProfile(u.id)}>
                  <div style={{ fontSize:13.5, fontWeight:600 }}>{u.name || 'Founder'}</div>
                  <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)' }}>wants to follow you · {timeAgo(u.requested_at)}</div>
                </div>
                <button onClick={()=>respond(u.id, true)}
                  style={{ padding:'6px 16px', borderRadius:99, border:'none', background:'rgba(0,0,0,.9)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Accept</button>
                <button onClick={()=>respond(u.id, false)}
                  style={{ padding:'6px 14px', borderRadius:99, border:'1px solid rgba(0,0,0,.2)', background:'transparent', color:'rgba(0,0,0,.6)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Reject</button>
              </div>
            ))}
          </div>
        ))}

      {peopleModal && (
        <PeopleModal uid={uid} type={peopleModal} me={me} followingIds={followingIds} pendingIds={pendingIds}
          onFollow={onFollow} onProfile={onProfile} requireAuth={requireAuth} onClose={()=>setPeopleModal(null)}/>
      )}
      {editing && (
        <EditProfileModal me={me} prof={prof} onClose={()=>setEditing(false)}
          onSaved={f=>setProf(prev=>({ ...(prev||{ id:uid }), ...f }))}/>
      )}
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────
// ── Openings view (jobs/roles — placeholder) ─────────────────────────────────
function OpeningsView({ onSubmitIdea }) {
  return (
    <div className="fade-up" style={{ ...card, padding:'56px 32px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>💼</div>
      <div style={{ fontSize:20, fontWeight:800, color:'rgba(0,0,0,.9)', marginBottom:8 }}>Openings are coming soon</div>
      <p style={{ fontSize:14, color:'rgba(0,0,0,.55)', lineHeight:1.6, maxWidth:380, margin:'0 auto 20px' }}>
        Soon you'll be able to post co-founder roles, early hires, and gigs — and apply to other founders' openings, right here.
      </p>
      <button onClick={onSubmitIdea} style={{ padding:'10px 22px', borderRadius:99, background:GREEN, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>✦ Validate an idea meanwhile</button>
    </div>
  );
}

export default function Community({ onSubmitIdea, onHome, user, onSignIn, onAccount, focusPostId, onConsumeFocus }) {
  const [view, setView] = useState('feed');         // feed | profile | messages
  const [pid, setPid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [focusId, setFocusId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [repostOf, setRepostOf] = useState(null);
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const didFocus = useRef(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [followState, setFollowState] = useState({ accepted: new Set(), pending: new Set() });
  const followingIds = followState.accepted;
  const pendingIds = followState.pending;
  const [followerCount, setFollowerCount] = useState(0);
  const [confirmDel, setConfirmDel] = useState(null);
  const [rOpen, setROpen] = useState(null);
  const [cOpen, setCOpen] = useState(null);
  const [convs, setConvs] = useState({});
  const [activePeer, setActivePeer] = useState(null);
  const [dmUser, setDmUser] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const activePeerRef = useRef(null);
  const dmUserRef = useRef(null);
  useEffect(() => { activePeerRef.current = view === 'messages' ? activePeer : null; }, [view, activePeer]);
  useEffect(() => { dmUserRef.current = dmUser?.id ?? null; }, [dmUser]);

  useEffect(() => { fetchPosts().then(p => { setPosts(p); setLoading(false); }); }, []);
  useEffect(() => { fetchVerifiedIds().then(setVerifiedIds); }, []);

  // Live feed over websockets — any post/rating/comment/poll change refreshes the feed
  // (debounced so bursts coalesce). No manual refresh needed.
  useEffect(() => {
    let on = true, timer = null;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { fetchPosts().then(p => { if (on) setPosts(p); }); }, 700); };
    const unsub = subscribeToCommunity(refresh);
    return () => { on = false; clearTimeout(timer); unsub(); };
  }, []);

  useEffect(() => {
    let on = true;
    fetchFollowState(user?.id ?? null).then(s => { if (on) setFollowState(s); });
    if (user) {
      fetchFollowCounts(user.id).then(c => { if (on) setFollowerCount(c.followers); });
      fetchSavedPosts(user.id).then(s => { if (on) setSavedIds(s); });
      const loadBell = () => {
        fetchFollowRequests(user.id).then(r => { if (on) setRequests(r); });
        fetchNotifications(user.id).then(n => { if (on) setNotifs(n); });
      };
      loadBell();
      // Instant via websocket; a slow poll stays as a safety net if the socket drops.
      const unsub = subscribeToInbox(user.id, loadBell);
      const iv = setInterval(loadBell, 60000);
      return () => { on = false; clearInterval(iv); unsub(); };
    }
    return () => { on = false; };
  }, [user]);

  useEffect(() => {
    let on = true;
    if (!user) {
      const t = setTimeout(() => { if (on) setConvs({}); }, 0);
      return () => { on = false; clearTimeout(t); };
    }
    fetchConversations(user.id).then(c => { if (on) setConvs(c); });
    const unsub = subscribeToMessages(user.id, {
      onInsert: async row => {
        const peerId = row.sender_id;
        const isOpen = activePeerRef.current === peerId || dmUserRef.current === peerId;
        let isNewConv = false;
        setConvs(prev => {
          if (!prev[peerId]) { isNewConv = true; return prev; }
          if (prev[peerId].messages.some(m => m.id === row.id)) return prev;
          return { ...prev, [peerId]: { ...prev[peerId], messages:[...prev[peerId].messages, row], unread:isOpen?0:prev[peerId].unread+1 } };
        });
        if (isNewConv) {
          const peer = await fetchProfile(peerId);
          if (peer) setConvs(prev => prev[peerId] ? prev : { ...prev, [peerId]: { peer, messages:[row], unread:isOpen?0:1 } });
        }
        if (isOpen) markConversationRead(user.id, peerId);
      },
      // A message I sent or received changed: read receipt, reaction, delete-for-me, or tombstone.
      onUpdate: row => {
        const peerId = row.sender_id === user.id ? row.recipient_id : row.sender_id;
        setConvs(prev => {
          const c = prev[peerId]; if (!c || !c.messages.some(m => m.id === row.id)) return prev;
          return patchMsg(prev, peerId, row.id, row, user.id);
        });
      },
    });
    return () => { on = false; unsub(); };
  }, [user]);

  const requireAuth = useCallback(fn => user ? fn : () => onSignIn?.(), [user, onSignIn]);

  const handleFollow = useCallback(async uid => {
    if (!user) return;
    // following or requested → cancel; otherwise → send a follow request
    const had = followingIds.has(uid) || pendingIds.has(uid);
    setFollowState(prev => {
      const accepted = new Set(prev.accepted), pending = new Set(prev.pending);
      if (had) { accepted.delete(uid); pending.delete(uid); }
      else pending.add(uid);
      return { accepted, pending };
    });
    await setFollow(user.id, uid, !had);
  }, [user, followingIds, pendingIds]);

  const respondRequest = useCallback(async (followerId, accept) => {
    if (!user) return;
    setRequests(prev => prev.filter(r => r.id !== followerId));
    if (accept) setFollowerCount(c => c + 1);
    await respondFollowRequest(user.id, followerId, accept);
    if (accept) createNotification({ actorId:user.id, userId:followerId, type:'follow_accept' });
  }, [user]);

  const handleRate = useCallback(async (postId, n10) => {
    if (!user) return;
    const value = n10 / 2;
    const target = posts.find(p => p.id === postId);
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const others = (p.ratings||[]).filter(r => r.user_id !== user.id);
      return { ...p, ratings:[...others, { user_id:user.id, value }] };
    }));
    setTimeout(() => setROpen(null), 700);
    await ratePost(user.id, postId, value);
    if (target) createNotification({ actorId:user.id, userId:target.user_id, type:'rating', postId, data:{ value:n10, title:target.title } });
  }, [user, posts]);

  const handleSave = useCallback(async postId => {
    if (!user) return onSignIn?.();
    const has = savedIds.has(postId);
    setSavedIds(prev => { const n = new Set(prev); has ? n.delete(postId) : n.add(postId); return n; });
    await setSavedPost(user.id, postId, !has);
  }, [user, savedIds, onSignIn]);

  const handleVote = useCallback(async (postId, idx) => {
    if (!user) return onSignIn?.();
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const others = (p.pollVotes||[]).filter(v => v.user_id !== user.id);
      return { ...p, pollVotes: [...others, { user_id:user.id, option_idx:idx }] };
    }));
    await votePoll(user.id, postId, idx);
  }, [user, onSignIn]);

  const handleRepost = useCallback(async (original, commentary) => {
    if (!user) return;
    const row = await repostPost(user.id, original.id, commentary);
    setPosts(prev => [{ id:row.id, created_at:row.created_at, user_id:user.id, title:'', body:commentary||'', tags:[], media:[], meta:null, repost_of:original.id, original, reactions:[], ratings:[], sugCount:0, author:{ id:user.id, name:nameOf(user), avatar_url:user.user_metadata?.avatar_url } }, ...prev]);
    if (original.user_id !== user.id) createNotification({ actorId:user.id, userId:original.user_id, type:'repost', postId:original.id, data:{ title:original.title } });
  }, [user]);

  const handleDelete = useCallback(async post => {
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setConfirmDel(null);
    await deletePost(user.id, post.id);
  }, [user]);

  const openDM = useCallback(peer => {
    if (!user) return onSignIn?.();
    if (peer.id === user.id) return;
    setConvs(prev => {
      const ex = prev[peer.id];
      return { ...prev, [peer.id]: ex ? { ...ex, unread:0 } : { peer, messages:[], unread:0 } };
    });
    markConversationRead(user.id, peer.id);
    setDmUser(peer);
  }, [user, onSignIn]);

  // payload: string (legacy) or { text, media, replyTo, forwarded }
  const handleSend = useCallback(async (peerId, payload) => {
    if (!user) return;
    const { text = '', media = null, replyTo = null, forwarded = false } =
      typeof payload === 'string' ? { text: payload } : (payload || {});
    if (!text.trim() && !(media && media.length)) return;
    const temp = { id:`t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, sender_id:user.id, recipient_id:peerId, text:text||null, media, reply_to:replyTo, forwarded, reactions:{}, deleted_for:[], read:false, created_at:new Date().toISOString() };
    setConvs(prev => { const ex = prev[peerId] || { peer:{ id:peerId }, unread:0 }; return { ...prev, [peerId]: { ...ex, messages:[...(ex.messages||[]), temp] } }; });
    try {
      const row = await sendMessage(user.id, peerId, { text, media, replyTo, forwarded });
      setConvs(prev => prev[peerId] ? { ...prev, [peerId]: { ...prev[peerId], messages:prev[peerId].messages.map(m => m.id===temp.id?row:m) } } : prev);
    } catch { /* surfaced in console */ }
  }, [user]);

  const handleReact = useCallback(async (peerId, msg, emoji) => {
    if (!user || String(msg.id).startsWith('t_')) return;
    const cur = msg.reactions || {};
    const next = (() => { const r = { ...cur }; const s = new Set(r[emoji] || []); s.has(user.id) ? s.delete(user.id) : s.add(user.id); if (s.size) r[emoji] = [...s]; else delete r[emoji]; return r; })();
    setConvs(prev => prev[peerId] ? { ...prev, [peerId]: { ...prev[peerId], messages: prev[peerId].messages.map(m => m.id === msg.id ? { ...m, reactions: next } : m) } } : prev);
    await toggleMessageReaction(msg.id, emoji, user.id, cur);
  }, [user]);

  // Delete-for-me: hidden from my own view but kept in state so Undo can restore it.
  const handleDeleteForMe = useCallback(async (peerId, msg) => {
    if (!user) return;
    const nextDF = [...new Set([...(msg.deleted_for || []), user.id])];
    setConvs(prev => patchMsg(prev, peerId, msg.id, { deleted_for: nextDF }, user.id));
    if (!String(msg.id).startsWith('t_')) await setMessageDeletedFor(msg.id, nextDF);
  }, [user]);

  // Delete-for-everyone — own message, recipient hasn't read it yet; both then see a tombstone.
  const handleUnsend = useCallback(async (peerId, msg) => {
    if (!user || msg.sender_id !== user.id || msg.read) return;
    setConvs(prev => patchMsg(prev, peerId, msg.id, { deleted: true }, user.id));
    if (!String(msg.id).startsWith('t_')) await setMessageDeleted(msg.id, true);
  }, [user]);

  // Roll back a delete within the 5s window.
  const handleUndoDelete = useCallback(async (peerId, msg, mode) => {
    if (!user) return;
    if (mode === 'everyone') {
      setConvs(prev => patchMsg(prev, peerId, msg.id, { deleted: false }, user.id));
      if (!String(msg.id).startsWith('t_')) await setMessageDeleted(msg.id, false);
    } else {
      const nextDF = (msg.deleted_for || []).filter(id => id !== user.id);
      setConvs(prev => patchMsg(prev, peerId, msg.id, { deleted_for: nextDF }, user.id));
      if (!String(msg.id).startsWith('t_')) await setMessageDeletedFor(msg.id, nextDF);
    }
  }, [user]);

  const chatApi = useMemo(() => ({ me:user, onSend:handleSend, onReact:handleReact, onDeleteForMe:handleDeleteForMe, onUnsend:handleUnsend, onUndoDelete:handleUndoDelete, onForward:setForwardMsg }),
    [user, handleSend, handleReact, handleDeleteForMe, handleUnsend, handleUndoDelete]);

  const openConv = useCallback(peerId => {
    setActivePeer(peerId);
    setConvs(prev => prev[peerId] ? { ...prev, [peerId]: { ...prev[peerId], unread:0 } } : prev);
    if (user) markConversationRead(user.id, peerId);
  }, [user]);

  const unread = useMemo(() => Object.values(convs).reduce((s,c)=>s+(c.unread||0),0), [convs]);
  const bellCount = requests.length + useMemo(() => notifs.filter(n => !n.read).length, [notifs]);
  const bellItems = useMemo(() => ([
    ...requests.map(u => ({ kind:'request', key:'r_'+u.id, user:u, time:u.requested_at })),
    ...notifs.map(n => ({ kind:'notif', key:n.id, notif:n, time:n.created_at })),
  ].sort((a,b) => new Date(b.time) - new Date(a.time))), [requests, notifs]);
  const notifText = n => {
    const name = n.actor?.name || 'Someone';
    if (n.type === 'rating') return `${name} rated your idea ${n.data?.value ?? ''}/10`;
    if (n.type === 'suggestion') return `${name} suggested on "${n.data?.title || 'your idea'}"`;
    if (n.type === 'comment_like') return `${name} liked your comment`;
    if (n.type === 'reply') return `${name} replied to your comment`;
    if (n.type === 'repost') return `${name} reposted your idea`;
    if (n.type === 'follow_accept') return `${name} accepted your follow request`;
    if (n.type === 'connect_accept') return `${name} accepted your connection request`;
    return `${name} interacted with your idea`;
  };
  const openNotif = n => { setBellOpen(false); if (n.post_id) focusPost(n.post_id); else if (n.actor?.id) goProfile(n.actor.id); };
  const toggleR = id => { setROpen(p=>p===id?null:id); setCOpen(null); };
  const toggleC = id => { setCOpen(p=>p===id?null:id); setROpen(null); };
  const goProfile = uid => { setPid(uid); setView('profile'); };
  const goFeed = () => setView('feed');
  const goMessages = () => { if (!user) return onSignIn?.(); setView('messages'); };
  const goOpenings = () => setView('openings');

  const focusPost = useCallback(async postId => {
    setView('feed'); setBellOpen(false);
    if (!posts.some(p => p.id === postId)) {
      const p = await fetchPostById(postId);
      if (p) setPosts(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]);
    }
    setFocusId(postId);
    setTimeout(() => document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior:'smooth', block:'center' }), 150);
    setTimeout(() => setFocusId(f => f === postId ? null : f), 2800);
  }, [posts]);

  useEffect(() => {
    if (focusPostId && !loading && !didFocus.current) {
      didFocus.current = true;
      focusPost(focusPostId);
      onConsumeFocus?.();
    }
  }, [focusPostId, loading, focusPost, onConsumeFocus]);

  const shown = useMemo(() => {
    let l = [...posts];
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(p => p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q) || p.tags?.some(t=>t.toLowerCase().includes(q)) || p.author?.name?.toLowerCase().includes(q));
    }
    if (tab === 'following') l = l.filter(p => followingIds.has(p.user_id));
    if (tab === 'saved') l = l.filter(p => savedIds.has(p.id));
    if (tab === 'top-rated') l.sort((a,b) => avg10(b.ratings) - avg10(a.ratings));
    if (tab === 'most-discussed') l.sort((a,b) => (b.sugCount||0) - (a.sugCount||0));
    return l;
  }, [posts, tab, search, followingIds, savedIds]);

  const cardProps = { me:user, followingIds, pendingIds, onFollow:handleFollow, onProfile:goProfile, onRate:handleRate, rOpen, cOpen, requireAuth, onDelete:p=>setConfirmDel(p), onDM:openDM, onSave:handleSave, onRepost:o=>setRepostOf(o), onOpenPost:focusPost, onVote:handleVote, verifiedIds };

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:F, fontSize:14, color:'rgba(0,0,0,.9)' }}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#c0bfbc;border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fade-up{animation:fadeUp .18s ease both}
        @keyframes slideDown{from{opacity:0;max-height:0}to{opacity:1;max-height:600px}}
        .slide-down{animation:slideDown .2s ease both;overflow:hidden}
        @keyframes dmSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes dmPulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes dmType{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}
        .dm-typing span{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.45);display:inline-block;animation:dmType 1.2s infinite}
        .dm-typing span:nth-child(2){animation-delay:.15s}
        .dm-typing span:nth-child(3){animation-delay:.3s}
        .act-btn{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px;border:none;background:none;cursor:pointer;font-size:11.5px;font-weight:600;color:rgba(0,0,0,.6);border-radius:8px;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif}
        .act-btn:hover{background:${GREEN_SOFT};color:${GREEN}}
        .act-btn.on{color:${GREEN};background:${GREEN_SOFT}}
        .act-btn.rated{color:${GREEN}}
        @media (max-width:1100px){ .comm-right{display:none!important} }
        @media (max-width:840px){ .comm-left{display:none!important} .comm-page{padding-bottom:74px!important} }
        .comm-mobnav{display:none}
        @media (max-width:840px){ .comm-mobnav{display:flex} }
        .mobnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:none;background:none;cursor:pointer;font-size:18px;color:rgba(0,0,0,.55);font-family:'DM Sans',system-ui,sans-serif;position:relative}
        .mobnav-btn.on{color:rgba(0,0,0,.95)}
        .mobnav-btn span{font-size:10px;font-weight:600}
      `}</style>

      {/* Top nav */}
      <header style={{ height:62, background:'#fff', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', padding:'0 22px', gap:16, position:'sticky', top:0, zIndex:100 }}>
        <span onClick={onHome} style={{ fontSize:20, fontWeight:800, letterSpacing:'-0.5px', color:GREEN, whiteSpace:'nowrap', cursor:'pointer' }}>startup oracle</span>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.05)', borderRadius:8, padding:'0 12px', height:38, flex:'0 1 320px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setView('feed'); }} placeholder="Search ideas, people…"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:14, fontFamily:F, minWidth:0 }}/>
        </div>
        <div style={{ flex:1 }}/>
        <nav style={{ display:'flex', alignItems:'center', gap:2 }} className="comm-topnav">
          <NavBtn icon="home" label="Home" active={view==='feed'} onClick={goFeed}/>
          <NavBtn icon="openings" label="Openings" active={view==='openings'} onClick={goOpenings}/>
          <NavBtn icon="messages" label="Messages" active={view==='messages'} onClick={goMessages} badge={unread}/>
          {/* Alerts (notifications) */}
          <div style={{ position:'relative' }}>
            <NavBtn icon="alerts" label="Alerts" active={bellOpen} badge={bellCount}
              onClick={user ? ()=>{ const next = !bellOpen; setBellOpen(next); if (next) { fetchFollowRequests(user.id).then(setRequests); fetchNotifications(user.id).then(n => setNotifs(n.map(x=>({...x,read:true})))); markNotificationsRead(user.id); } } : requireAuth(()=>{})}/>

          {bellOpen && (
            <>
              <div onClick={()=>setBellOpen(false)} style={{ position:'fixed', inset:0, zIndex:240 }}/>
              <div className="fade-up" style={{ position:'absolute', top:42, right:0, width:330, maxWidth:'90vw', background:'#fff', borderRadius:10, border:'1px solid rgba(0,0,0,.08)', boxShadow:'0 12px 40px rgba(0,0,0,.14)', zIndex:241, overflow:'hidden' }}>
                <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(0,0,0,.08)', fontSize:14, fontWeight:700 }}>Notifications</div>
                <div style={{ maxHeight:360, overflowY:'auto', padding:'4px 16px 8px' }}>
                  {bellItems.length === 0 && (
                    <div style={{ padding:'26px 0', textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>No new notifications.</div>
                  )}
                  {bellItems.map((it,i)=> it.kind === 'request' ? (
                    <div key={it.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:i===bellItems.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                      <Av name={it.user.name} uid={it.user.id} url={it.user.avatar_url} sz={38} onClick={()=>{ setBellOpen(false); goProfile(it.user.id); }}/>
                      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>{ setBellOpen(false); goProfile(it.user.id); }}>
                        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.user.name || 'Founder'}</div>
                        <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)' }}>requested to follow you · {timeAgo(it.user.requested_at)}</div>
                      </div>
                      <button onClick={()=>respondRequest(it.user.id, true)}
                        style={{ padding:'5px 13px', borderRadius:99, border:'none', background:'rgba(0,0,0,.9)', color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Accept</button>
                      <button onClick={()=>respondRequest(it.user.id, false)}
                        style={{ padding:'5px 11px', borderRadius:99, border:'1px solid rgba(0,0,0,.2)', background:'transparent', color:'rgba(0,0,0,.6)', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Reject</button>
                    </div>
                  ) : (
                    <div key={it.key} onClick={()=>openNotif(it.notif)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', cursor:'pointer', borderBottom:i===bellItems.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                      <Av name={it.notif.actor?.name} uid={it.notif.actor?.id||it.key} url={it.notif.actor?.avatar_url} sz={38}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:'rgba(0,0,0,.8)', lineHeight:1.4 }}>{notifText(it.notif)}</div>
                        <div style={{ fontSize:11.5, color:'rgba(0,0,0,.45)' }}>{timeAgo(it.notif.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </div>
        </nav>
        {user ? (
          <div onClick={()=>onAccount?.()} title="My Account" style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', paddingLeft:8, borderLeft:'1px solid rgba(0,0,0,.1)' }}>
            <Av name={nameOf(user)} uid={user.id} url={user.user_metadata?.avatar_url} sz={34}/>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        ) : (
          <span onClick={()=>onSignIn?.()} style={{ fontSize:13, color:'rgba(0,0,0,.6)', cursor:'pointer', fontWeight:600, paddingLeft:8 }}>Sign in</span>
        )}
        <button onClick={onSubmitIdea} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:GREEN, color:'#fff', border:'none', borderRadius:99, fontSize:13.5, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:F }}>✦ Validate My Idea</button>
      </header>

      {/* 3-column layout */}
      <div className="comm-page" style={{ maxWidth:1128, margin:'0 auto', padding:'20px 16px', display:'flex', gap:16, alignItems:'flex-start' }}>
        <div className="comm-left" style={{ display:'block' }}>
          <LeftBar me={user} posts={posts} followerCount={followerCount} unread={unread} view={view==='profile'&&pid===user?.id?'profile-self':view} goFeed={goFeed} goProfile={goProfile} goMessages={goMessages} goOpenings={goOpenings} onPost={()=>setComposerOpen(true)} requireAuth={requireAuth} verifiedIds={verifiedIds}/>
        </div>

        <div style={{ flex:1, minWidth:0, maxWidth:view==='messages'?'none':600 }}>
          {view === 'feed' && (
            <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {/* Composer trigger */}
              <div style={{ ...card, padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <Av name={nameOf(user)} uid={user?.id||'me'} url={user?.user_metadata?.avatar_url} sz={44} onClick={user?()=>goProfile(user.id):undefined}/>
                  <button onClick={user ? ()=>setComposerOpen(true) : requireAuth(()=>{})}
                    style={{ flex:1, textAlign:'left', height:48, borderRadius:99, border:'1px solid rgba(0,0,0,.15)', background:'#fff', color:'rgba(0,0,0,.5)', padding:'0 20px', fontSize:14.5, cursor:'pointer', fontFamily:F }}>
                    Share your idea or startup update…
                  </button>
                </div>
                <div style={{ display:'flex', marginTop:10, paddingTop:4, borderTop:'1px solid rgba(0,0,0,.06)' }}>
                  {[['🖼','Photo'],['🎥','Video'],['✎','Idea']].map(([ic,l])=>(
                    <button key={l} onClick={user ? ()=>setComposerOpen(true) : requireAuth(()=>{})}
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px 4px', marginTop:6, border:'none', background:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, color:'rgba(0,0,0,.6)', borderRadius:8, fontFamily:F }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <span style={{ fontSize:15 }}>{ic}</span>{l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...card, display:'flex' }}>
                {[['all','All'],['top-rated','Top Rated'],['most-discussed','Most Discussed'],['following','Following'],['saved','Saved']].map(([id,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'13px 4px', border:'none', borderBottom:tab===id?`2.5px solid ${GREEN}`:'2.5px solid transparent', background:'transparent', fontSize:13, fontWeight:tab===id?700:500, cursor:'pointer', color:tab===id?GREEN:'rgba(0,0,0,.55)', fontFamily:F, transition:'all .15s' }}>
                    {label}
                  </button>
                ))}
              </div>
              {loading && <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>Loading ideas…</div>}
              {!loading && shown.length === 0 && (
                <div style={{ ...card, padding:48, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>
                  {search ? `No ideas matching "${search}".` : tab==='following' ? 'Follow some founders to see their ideas here.' : tab==='saved' ? 'No saved ideas yet. Tap Save on any idea to keep it here.' : 'No ideas yet — be the first to share one.'}
                </div>
              )}
              {shown.map(p=>(
                <PostCard key={p.id} post={p} {...cardProps} onTR={()=>toggleR(p.id)} onTC={()=>toggleC(p.id)} rOpen={rOpen===p.id} cOpen={cOpen===p.id} highlight={focusId===p.id} saved={savedIds.has(p.id)}/>
              ))}
            </div>
          )}

          {view === 'profile' && pid && (
            <ProfileView uid={pid} me={user} posts={posts} followingIds={followingIds} pendingIds={pendingIds} onFollow={handleFollow} onProfile={goProfile} onRate={handleRate} rOpen={rOpen} onTR={toggleR} cOpen={cOpen} onTC={toggleC} onBack={goFeed} openDM={openDM} requireAuth={requireAuth} onDelete={p=>setConfirmDel(p)} onSave={handleSave} onRepost={o=>setRepostOf(o)} onOpenPost={focusPost} savedIds={savedIds} onVote={handleVote} verifiedIds={verifiedIds}/>
          )}

          {view === 'messages' && (
            user
              ? <MessagesView convs={convs} activePeer={activePeer} onOpenConv={openConv} chat={chatApi}/>
              : <div style={{ ...card, padding:48, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>Sign in to see your messages.</div>
          )}

          {view === 'openings' && (
            <OpeningsView onSubmitIdea={onSubmitIdea}/>
          )}
        </div>

        {view !== 'messages' && (
          <RightBar me={user} posts={posts} followingIds={followingIds} pendingIds={pendingIds} onFollow={handleFollow} onProfile={goProfile} requireAuth={requireAuth} verifiedIds={verifiedIds}/>
        )}
      </div>

      {/* Composer modal */}
      {composerOpen && user && (
        <ComposerModal me={user} onClose={()=>setComposerOpen(false)} onPosted={p=>{ setPosts(prev=>[p,...prev]); setView('feed'); }}/>
      )}

      {/* Repost modal */}
      {repostOf && user && (
        <RepostModal original={repostOf} me={user} onClose={()=>setRepostOf(null)} onDone={txt=>handleRepost(repostOf, txt)}/>
      )}


      {/* Forward a message */}
      {forwardMsg && user && (
        <ForwardDialog msg={forwardMsg} convs={convs} me={user} onClose={()=>setForwardMsg(null)}
          onForward={ids=>{ ids.forEach(pid=>handleSend(pid, { text:forwardMsg.text||'', media:forwardMsg.media||null, forwarded:true })); setForwardMsg(null); }}/>
      )}

      {/* DM slide-over */}
      {dmUser && user && (
        <DMPanel peer={dmUser} msgs={convs[dmUser.id]?.messages || []} chat={chatApi} onClose={()=>setDmUser(null)}/>
      )}

      {/* Mobile bottom nav */}
      <div className="comm-mobnav" style={{ position:'fixed', left:0, right:0, bottom:0, height:62, background:'#fff', borderTop:'1px solid rgba(0,0,0,.1)', zIndex:200, alignItems:'stretch', padding:'0 6px', boxShadow:'0 -4px 16px rgba(0,0,0,.05)' }}>
        <button className={'mobnav-btn'+(view==='feed'?' on':'')} onClick={goFeed}>▦<span>Ideas</span></button>
        <button className="mobnav-btn" onClick={user ? ()=>setComposerOpen(true) : requireAuth(()=>{})}>
          <span style={{ fontSize:22, lineHeight:1, fontWeight:400 }}>＋</span><span>Post</span>
        </button>
        <button className={'mobnav-btn'+(view==='messages'?' on':'')} onClick={goMessages}>
          ✉<span>Messages</span>
          {unread>0 && <span style={{ position:'absolute', top:4, right:'28%', minWidth:15, height:15, background:'#DC2626', color:'#fff', borderRadius:8, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{unread}</span>}
        </button>
        <button className={'mobnav-btn'+(view==='profile'&&pid===user?.id?' on':'')} onClick={user ? ()=>goProfile(user.id) : requireAuth(()=>{})}>◉<span>Profile</span></button>
      </div>

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:16 }} onClick={()=>setConfirmDel(null)}>
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.18)', width:'100%', maxWidth:380, padding:24 }} onClick={e=>e.stopPropagation()}>
            <p style={{ margin:'0 0 6px', fontSize:16, fontWeight:700 }}>Delete this idea?</p>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'rgba(0,0,0,.55)', lineHeight:1.6 }}>"{confirmDel.title}" and all its ratings and suggestions will be permanently deleted.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>handleDelete(confirmDel)} style={{ flex:1, fontSize:13, fontWeight:600, background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:10, cursor:'pointer', fontFamily:F }}>Delete</button>
              <button onClick={()=>setConfirmDel(null)} style={{ flex:1, fontSize:13, fontWeight:500, background:'#fff', color:'rgba(0,0,0,.6)', border:'1px solid rgba(0,0,0,.15)', borderRadius:8, padding:10, cursor:'pointer', fontFamily:F }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
