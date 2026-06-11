import { useState, useEffect, useMemo, useCallback, useId } from "react";
import { fetchPosts, createPost, deletePost, ratePost, fetchSuggestions, addSuggestion, fetchFollowingIds, setFollow, fetchFollowList, fetchFollowCounts, fetchRatingsReceived } from "./communityDB";

const F = "'Plus Jakarta Sans',system-ui,sans-serif";
const C = { bg:'#F7F7F7', surf:'#fff', bdr:'#E8E8E8', bdrLt:'#F2F2F2', ink:'#0C0C0C', ink2:'#5C5C5C', ink3:'#ADADAD', star:'#B45309', grn:'#22C55E' };
const AV_COLORS = ['#2563EB','#7C3AED','#C2410C','#B45309','#0D9488','#DB2777','#4F46E5','#15803D'];

const avColor = id => AV_COLORS[(String(id).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AV_COLORS.length];
const initials = name => (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const timeAgo = d => {
  const s = Math.floor((Date.now() - new Date(d).getTime())/1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});
};

const Av = ({ name, uid, url, sz=32 }) => url
  ? <img src={url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', flexShrink:0, objectFit:'cover' }}/>
  : <div style={{ width:sz, height:sz, borderRadius:'50%', background:avColor(uid), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:650, fontSize:sz<=28?9.5:sz<=36?11.5:sz<=44?13.5:17, flexShrink:0, letterSpacing:'-0.4px' }}>{initials(name)}</div>;

// ── Stars (half-star precision) ──────────────────────────────────────────────
const StarShape = ({ fill, sz, clipId }) => {
  const d = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z";
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" style={{ display:'block', flexShrink:0 }}>
      {fill>0 && fill<1 && <defs><clipPath id={clipId}><rect x="0" y="0" width={24*fill} height="24"/></clipPath></defs>}
      <path d={d} fill="#EBEBEB" stroke="#EBEBEB" strokeWidth=".5"/>
      {fill>0 && <path d={d} fill={C.star} stroke={C.star} strokeWidth=".5" clipPath={fill<1?`url(#${clipId})`:undefined}/>}
    </svg>
  );
};

const Stars = ({ rating=0, onRate, sz=15, readOnly=false, showVal=false }) => {
  const uid = useId().replace(/:/g,'_');
  const [hov, setHov] = useState(null);
  const disp = hov !== null ? hov : rating;
  const getFill = i => disp >= i ? 1 : disp >= i-.5 ? .5 : 0;
  const onMov = (e,i) => {
    if (readOnly) return;
    const r = e.currentTarget.getBoundingClientRect();
    setHov(e.clientX - r.left < r.width/2 ? i-.5 : i);
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ display:'flex', gap:2 }} onMouseLeave={()=>!readOnly&&setHov(null)}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ cursor:readOnly?'default':'pointer', display:'flex' }}
            onMouseMove={e=>onMov(e,i)}
            onClick={()=>!readOnly&&onRate&&onRate(hov!==null?hov:i)}>
            <StarShape fill={getFill(i)} sz={sz} clipId={`sc_${uid}_${i}`}/>
          </div>
        ))}
      </div>
      {showVal && disp>0 && <span style={{ fontSize:11, color:C.ink2, fontWeight:600 }}>{Number(disp).toFixed(1)}</span>}
    </div>
  );
};

const FollowBtn = ({ following, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:'4px 13px', borderRadius:20, fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap', transition:'all .13s',
        background: following ? (hov?'#FEF2F2':'transparent') : C.ink,
        color: following ? (hov?'#DC2626':C.ink2) : '#fff',
        border: `1px solid ${following ? (hov?'#F87171':C.bdr) : C.ink}` }}>
      {following ? (hov?'Unfollow':'Following') : 'Follow'}
    </button>
  );
};

// ── Idea card ────────────────────────────────────────────────────────────────
function IdeaCard({ post, me, followingIds, onFollow, onRate, requireAuth, onDelete, showAuthor=true }) {
  const [open, setOpen]   = useState(false);
  const [sugs, setSugs]   = useState(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const isMine   = me && post.user_id === me.id;
  const ratings  = post.ratings || [];
  const myRating = me ? ratings.find(r=>r.user_id===me.id)?.value : null;
  const avg      = ratings.length ? ratings.reduce((a,r)=>a+Number(r.value),0)/ratings.length : 0;
  const author   = post.author || {};
  const sugCount = (post.sugCount ?? 0) + (sugs ? Math.max(0, sugs.length - (post.sugCount ?? 0)) : 0);

  const toggleThread = async () => {
    const next = !open;
    setOpen(next);
    if (next && sugs === null) setSugs(await fetchSuggestions(post.id));
  };

  const postSug = async () => {
    if (!draft.trim() || !me) return;
    setPosting(true);
    try {
      const row = await addSuggestion(me.id, post.id, draft.trim());
      setSugs(p => [...(p||[]), { ...row, author: { name: me.user_metadata?.full_name || me.email?.split('@')[0], avatar_url: me.user_metadata?.avatar_url } }]);
      setDraft('');
    } catch { /* surfaced in console */ }
    setPosting(false);
  };

  return (
    <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'18px 22px', transition:'border-color .15s' }}>
      {showAuthor && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:13 }}>
          <Av name={author.name} uid={post.user_id} url={author.avatar_url} sz={34}/>
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{author.name || 'Founder'}</span>
            <span style={{ fontSize:11.5, color:C.ink3, marginLeft:8 }}>{timeAgo(post.created_at)}</span>
          </div>
          {!isMine && <FollowBtn following={followingIds.has(post.user_id)} onClick={requireAuth(()=>onFollow(post.user_id))}/>}
        </div>
      )}

      <div style={{ fontSize:14.5, fontWeight:650, letterSpacing:'-.25px', lineHeight:1.35, color:C.ink }}>{post.title}</div>
      {post.body && <div style={{ fontSize:13, color:C.ink2, lineHeight:1.6, margin:'6px 0 12px' }}>{post.body}</div>}
      {post.tags?.length > 0 && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
          {post.tags.map(t=><span key={t} style={{ padding:'2px 8px', background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:4, fontSize:10.5, fontWeight:500, color:C.ink2 }}>{t}</span>)}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:12, borderTop:`1px solid ${C.bdrLt}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Stars rating={myRating ?? avg} sz={14} readOnly={!!isMine}
            onRate={isMine ? null : requireAuth(v=>onRate(post.id, v))} showVal/>
          <span style={{ fontSize:11.5, color:C.ink3 }}>
            {myRating ? 'your rating' : `${ratings.length} rating${ratings.length!==1?'s':''}`}
          </span>
        </div>
        <button onClick={toggleThread}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:12, color:C.ink3, cursor:'pointer', padding:'4px 8px', borderRadius:5, border:'none', background:'none', fontFamily:F }}>
          💬 {sugCount} suggestion{sugCount!==1?'s':''}
        </button>
        {isMine && onDelete && (
          <button onClick={()=>onDelete(post)} style={{ fontSize:11.5, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:F }}>Delete</button>
        )}
      </div>

      {open && (
        <div style={{ marginTop:14, paddingTop:4, borderTop:`1px solid ${C.bdrLt}` }}>
          {sugs === null && <div style={{ fontSize:12.5, color:C.ink3, padding:'10px 0' }}>Loading…</div>}
          {sugs?.length === 0 && <div style={{ fontSize:12.5, color:C.ink3, padding:'10px 0' }}>No suggestions yet. Be the first.</div>}
          {sugs?.map(s=>(
            <div key={s.id} style={{ display:'flex', gap:9, padding:'9px 0', borderBottom:`1px solid ${C.bdrLt}` }}>
              <Av name={s.author?.name} uid={s.user_id} url={s.author?.avatar_url} sz={27}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:7, alignItems:'baseline', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:C.ink }}>{s.author?.name || 'Founder'}</span>
                  <span style={{ fontSize:10.5, color:C.ink3 }}>{timeAgo(s.created_at)}</span>
                </div>
                <div style={{ fontSize:12.5, color:C.ink, lineHeight:1.55 }}>{s.text}</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'flex-end' }}>
            <textarea placeholder={me ? 'Leave a suggestion…' : 'Sign in to leave a suggestion'} value={draft} rows={1} disabled={!me}
              onChange={e=>setDraft(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),postSug())}
              style={{ flex:1, border:`1px solid ${C.bdr}`, borderRadius:8, padding:'8px 12px', fontSize:12.5, fontFamily:F, color:C.ink, background:C.bg, resize:'none', outline:'none', lineHeight:1.5 }}/>
            <button onClick={me ? postSug : requireAuth(()=>{})} disabled={posting || (me && !draft.trim())}
              style={{ background:C.ink, color:'#fff', border:'none', borderRadius:7, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, opacity: posting?0.5:1 }}>
              {me ? 'Post' : 'Sign in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────
function Composer({ me, onPosted, requireAuth }) {
  const [openC, setOpenC] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [tags, setTags]   = useState('');
  const [busy, setBusy]   = useState(false);

  const submit = async () => {
    if (!title.trim() || !me) return;
    setBusy(true);
    try {
      const tagArr = tags.split(',').map(t=>t.trim()).filter(Boolean).slice(0,5);
      const row = await createPost(me.id, { title:title.trim(), body:body.trim(), tags:tagArr });
      onPosted({ id: row.id, created_at: row.created_at, user_id: me.id, title:title.trim(), body:body.trim(), tags:tagArr,
        author:{ id:me.id, name: me.user_metadata?.full_name || me.email?.split('@')[0], avatar_url: me.user_metadata?.avatar_url },
        ratings:[], sugCount:0 });
      setTitle(''); setBody(''); setTags(''); setOpenC(false);
    } catch { /* surfaced in console */ }
    setBusy(false);
  };

  if (!openC) return (
    <div onClick={me ? ()=>setOpenC(true) : requireAuth(()=>{})}
      style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:11, cursor:'pointer' }}>
      <Av name={me?.user_metadata?.full_name || me?.email || 'You'} uid={me?.id || 'me'} url={me?.user_metadata?.avatar_url} sz={32}/>
      <span style={{ fontSize:13, color:C.ink3 }}>{me ? 'Share your startup idea with the community…' : 'Sign in to share your startup idea…'}</span>
    </div>
  );

  return (
    <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'18px 20px' }}>
      <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Idea title — what are you building?"
        style={{ width:'100%', border:'none', outline:'none', fontSize:15, fontWeight:650, color:C.ink, fontFamily:F, marginBottom:10, background:'transparent' }}/>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3} placeholder="Describe the problem and your solution…"
        style={{ width:'100%', border:`1px solid ${C.bdr}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:F, color:C.ink, background:C.bg, resize:'none', outline:'none', lineHeight:1.6, marginBottom:10, boxSizing:'border-box' }}/>
      <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags, comma separated (AI, SaaS, FinTech)"
        style={{ width:'100%', border:`1px solid ${C.bdr}`, borderRadius:8, padding:'8px 12px', fontSize:12, fontFamily:F, color:C.ink2, background:C.bg, outline:'none', marginBottom:12, boxSizing:'border-box' }}/>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={()=>setOpenC(false)} style={{ background:'transparent', border:`1px solid ${C.bdr}`, color:C.ink2, borderRadius:7, padding:'7px 16px', fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:F }}>Cancel</button>
        <button onClick={submit} disabled={busy || !title.trim()}
          style={{ background:C.ink, color:'#fff', border:'none', borderRadius:7, padding:'7px 18px', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:F, opacity: busy||!title.trim()?0.5:1 }}>
          {busy ? 'Posting…' : 'Post idea'}
        </button>
      </div>
    </div>
  );
}

// ── Profile view ─────────────────────────────────────────────────────────────
function ProfileView({ me, posts, followingIds, onFollow, onRate, requireAuth, onDelete }) {
  const [tab, setTab] = useState('ideas');
  const [counts, setCounts] = useState({ followers:0, following:0 });
  const [received, setReceived] = useState(null);
  const [people, setPeople] = useState(null);

  const myPosts = posts.filter(p => p.user_id === me?.id);
  const myName  = me?.user_metadata?.full_name || me?.email?.split('@')[0] || 'You';

  useEffect(() => { if (me) fetchFollowCounts(me.id).then(setCounts); }, [me]);
  useEffect(() => {
    if (!me) return;
    let on = true;
    if (tab === 'ratings') fetchRatingsReceived(me.id).then(r => on && setReceived(r));
    if (tab === 'followers' || tab === 'following') fetchFollowList(me.id, tab).then(p => on && setPeople(p));
    return () => { on = false; };
  }, [tab, me]);

  if (!me) return <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'60px 0' }}>Sign in to see your profile.</div>;

  const avgR = received?.length ? (received.reduce((a,r)=>a+Number(r.value),0)/received.length).toFixed(1) : null;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:18 }}>
        <Av name={myName} uid={me.id} url={me.user_metadata?.avatar_url} sz={52}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:21, fontWeight:700, letterSpacing:'-.5px', lineHeight:1.1, color:C.ink }}>{myName}</div>
          <div style={{ fontSize:12, color:C.ink3, margin:'3px 0 7px' }}>{me.email}</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:28, marginBottom:6 }}>
        {[['Ideas', myPosts.length], ['Followers', counts.followers], ['Following', counts.following]].map(([l,v])=>(
          <div key={l}>
            <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-.5px', color:C.ink }}>{v}</div>
            <div style={{ fontSize:11.5, color:C.ink3, marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.bdr}`, marginTop:16, marginBottom:16 }}>
        {[['ideas','My Ideas'],['ratings','Ratings Received'],['followers','Followers'],['following','Following']].map(([k,l])=>(
          <div key={k} onClick={()=>{ setTab(k); setPeople(null); setReceived(null); }}
            style={{ padding:'9px 14px', fontSize:12.5, fontWeight:500, cursor:'pointer', color: tab===k?C.ink:C.ink3, borderBottom:`2px solid ${tab===k?C.ink:'transparent'}`, marginBottom:-1 }}>
            {l}
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tab==='ideas' && (myPosts.length === 0
          ? <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'40px 0' }}>You haven't shared any ideas yet.</div>
          : myPosts.map(p=><IdeaCard key={p.id} post={p} me={me} followingIds={followingIds} onFollow={onFollow} onRate={onRate} requireAuth={requireAuth} onDelete={onDelete} showAuthor={false}/>))}

        {tab==='ratings' && (
          received === null ? <div style={{ color:C.ink3, fontSize:13, padding:'20px 0', textAlign:'center' }}>Loading…</div>
          : received.length === 0 ? <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'40px 0' }}>No ratings received yet.</div>
          : (
            <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'4px 20px' }}>
              {avgR && <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.bdrLt}`, fontSize:12.5, color:C.ink2 }}>Average rating across your ideas: <strong style={{ color:C.ink }}>{avgR} ★</strong></div>}
              {received.map((r,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom: i===received.length-1?'none':`1px solid ${C.bdrLt}` }}>
                  <Av name={r.rater?.name} uid={r.rater?.name || i} url={r.rater?.avatar_url} sz={35}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{r.rater?.name || 'Founder'}</div>
                    <div style={{ fontSize:11.5, color:C.ink3, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.post?.title}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                    <Stars rating={Number(r.value)} readOnly sz={13}/>
                    <span style={{ fontSize:10.5, color:C.ink3 }}>{timeAgo(r.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {(tab==='followers'||tab==='following') && (
          people === null ? <div style={{ color:C.ink3, fontSize:13, padding:'20px 0', textAlign:'center' }}>Loading…</div>
          : people.length === 0 ? <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'40px 0' }}>{tab==='followers' ? 'No followers yet — share great ideas!' : "You aren't following anyone yet."}</div>
          : (
            <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'4px 20px' }}>
              {people.map((u,i)=>(
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom: i===people.length-1?'none':`1px solid ${C.bdrLt}` }}>
                  <Av name={u.name} uid={u.id} url={u.avatar_url} sz={36}/>
                  <div style={{ flex:1, fontSize:13, fontWeight:600, color:C.ink }}>{u.name || 'Founder'}</div>
                  {u.id !== me.id && <FollowBtn following={followingIds.has(u.id)} onClick={requireAuth(()=>onFollow(u.id))}/>}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────
export default function Community({ onSubmitIdea, onHome, user, onSignIn, onAccount }) {
  const [view, setView]   = useState('feed');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [followingIds, setFollowingIds] = useState(new Set());
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    fetchPosts().then(p => { setPosts(p); setLoading(false); });
  }, []);
  useEffect(() => {
    let on = true;
    fetchFollowingIds(user?.id ?? null).then(s => { if (on) setFollowingIds(s); });
    return () => { on = false; };
  }, [user]);

  const requireAuth = useCallback(fn => user ? fn : () => onSignIn?.(), [user, onSignIn]);

  const handleFollow = useCallback(async uid => {
    if (!user) return;
    const isF = followingIds.has(uid);
    setFollowingIds(prev => { const n = new Set(prev); isF ? n.delete(uid) : n.add(uid); return n; });
    await setFollow(user.id, uid, !isF);
  }, [user, followingIds]);

  const handleRate = useCallback(async (postId, value) => {
    if (!user) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const others = (p.ratings||[]).filter(r => r.user_id !== user.id);
      return { ...p, ratings: [...others, { user_id: user.id, value }] };
    }));
    await ratePost(user.id, postId, value);
  }, [user]);

  const handleDelete = useCallback(async post => {
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setConfirmDel(null);
    await deletePost(user.id, post.id);
  }, [user]);

  const shown = useMemo(() => {
    let l = [...posts];
    if (filter === 'Following') l = l.filter(p => followingIds.has(p.user_id));
    if (filter === 'Top Rated') l.sort((a,b) => {
      const av = x => x.ratings?.length ? x.ratings.reduce((s,r)=>s+Number(r.value),0)/x.ratings.length : 0;
      return av(b) - av(a);
    });
    if (filter === 'Most Discussed') l.sort((a,b) => (b.sugCount||0) - (a.sugCount||0));
    return l;
  }, [posts, filter, followingIds]);

  const navItem = (id, label, icon) => (
    <div key={id} onClick={()=>setView(id)}
      style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px', borderRadius:8, cursor:'pointer', fontSize:13.5, color: view===id?C.ink:C.ink2, fontWeight: view===id?600:450, background: view===id?C.bg:'transparent', userSelect:'none' }}>
      <span style={{ fontSize:14 }}>{icon}</span>{label}
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F }}>
      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#DCDCDC;border-radius:2px}`}</style>

      {/* Site nav */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:C.surf, borderBottom:`1px solid ${C.bdr}`, height:64, padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span onClick={onHome} style={{ fontWeight:800, fontSize:19, letterSpacing:'-0.5px', color:C.ink, cursor:'pointer' }}>startup oracle</span>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          {user ? (
            <div onClick={()=>onAccount?.()} title="My Account" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <Av name={user.user_metadata?.full_name || user.email} uid={user.id} url={user.user_metadata?.avatar_url} sz={26}/>
              <span style={{ fontSize:13.5, color:C.ink, fontWeight:600, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.user_metadata?.full_name || user.email}</span>
            </div>
          ) : (
            <span onClick={()=>onSignIn?.()} style={{ fontSize:13.5, color:C.ink2, cursor:'pointer', fontWeight:500 }}>Sign in</span>
          )}
          <button onClick={onSubmitIdea} style={{ background:C.ink, color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F }}>Validate My Idea →</button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ maxWidth:1040, margin:'0 auto', display:'flex', gap:0, alignItems:'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width:216, flexShrink:0, position:'sticky', top:64, padding:'20px 10px', display:'flex', flexDirection:'column', gap:2 }}>
          {navItem('feed','Browse Ideas','▤')}
          {navItem('profile','My Profile','◉')}
          <div style={{ marginTop:14, padding:'12px 12px', fontSize:11.5, color:C.ink3, lineHeight:1.6, borderTop:`1px solid ${C.bdr}` }}>
            Rate ideas, leave suggestions, and follow founders you believe in.
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, minWidth:0, padding:'18px 28px 60px', maxWidth:760 }}>
          {view === 'feed' && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:15, fontWeight:650, letterSpacing:'-.3px', color:C.ink }}>Browse Ideas</span>
                <div style={{ display:'flex', gap:4, marginLeft:6 }}>
                  {['All','Top Rated','Most Discussed','Following'].map(f=>(
                    <button key={f} onClick={()=>setFilter(f)}
                      style={{ padding:'4px 11px', borderRadius:20, fontSize:11.5, fontWeight:500, cursor:'pointer', fontFamily:F, transition:'all .12s',
                        border:`1px solid ${filter===f?C.ink:C.bdr}`, background: filter===f?C.ink:C.surf, color: filter===f?'#fff':C.ink2 }}>
                      {f}
                    </button>
                  ))}
                </div>
                <span style={{ marginLeft:'auto', fontSize:11.5, color:C.ink3 }}>{shown.length} ideas</span>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <Composer me={user} requireAuth={requireAuth} onPosted={p=>setPosts(prev=>[p,...prev])}/>
                {loading && <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'40px 0' }}>Loading ideas…</div>}
                {!loading && shown.length===0 && (
                  <div style={{ textAlign:'center', color:C.ink3, fontSize:13, padding:'40px 0' }}>
                    {filter==='Following' ? 'Follow founders to see their ideas here.' : 'No ideas yet — be the first to share one.'}
                  </div>
                )}
                {shown.map(p=>(
                  <IdeaCard key={p.id} post={p} me={user} followingIds={followingIds}
                    onFollow={handleFollow} onRate={handleRate} requireAuth={requireAuth}
                    onDelete={p2=>setConfirmDel(p2)}/>
                ))}
              </div>
            </>
          )}

          {view === 'profile' && (
            <ProfileView me={user} posts={posts} followingIds={followingIds}
              onFollow={handleFollow} onRate={handleRate} requireAuth={requireAuth}
              onDelete={p=>setConfirmDel(p)}/>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:16 }}
          onClick={()=>setConfirmDel(null)}>
          <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.18)', width:'100%', maxWidth:380, padding:24 }} onClick={e=>e.stopPropagation()}>
            <p style={{ margin:'0 0 6px', fontSize:16, fontWeight:700, color:C.ink }}>Delete this idea?</p>
            <p style={{ margin:'0 0 20px', fontSize:13, color:C.ink2, lineHeight:1.6 }}>"{confirmDel.title}" and all its ratings and suggestions will be permanently deleted.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>handleDelete(confirmDel)}
                style={{ flex:1, fontSize:13, fontWeight:600, background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:10, cursor:'pointer', fontFamily:F }}>Delete</button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ flex:1, fontSize:13, fontWeight:500, background:'#fff', color:C.ink2, border:`1px solid ${C.bdr}`, borderRadius:8, padding:10, cursor:'pointer', fontFamily:F }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
