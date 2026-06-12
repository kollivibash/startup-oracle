import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchPosts, createPost, deletePost, ratePost, uploadPostFile, fetchSuggestions, addSuggestion, fetchFollowState, setFollow, fetchFollowList, fetchFollowCounts, fetchFollowRequests, respondFollowRequest, fetchRatingsReceived, fetchConversations, sendMessage, markConversationRead, subscribeToMessages, fetchProfile } from "./communityDB";

const F = "'DM Sans',system-ui,sans-serif";
const BG = '#f3f2ef';
const AV_COLORS = ['#2563EB','#7c3aed','#C2410C','#d97706','#0891b2','#DB2777','#4F46E5','#059669','#dc2626'];
const avColor = id => AV_COLORS[(String(id).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AV_COLORS.length];
const coverOf = id => `linear-gradient(160deg,#1e1b4b 0%,${avColor(id)} 100%)`;
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

const card = { background:'#fff', borderRadius:8, border:'1px solid rgba(0,0,0,.08)', boxShadow:'0 0 0 1px rgba(0,0,0,.04)' };

const Av = ({ name, uid, url, sz=40, onClick, border=false }) => {
  const base = { width:sz, height:sz, borderRadius:'50%', flexShrink:0, cursor:onClick?'pointer':'default', border:border?'2px solid #fff':'none' };
  if (url) return <img src={url} alt="" onClick={onClick} style={{ ...base, objectFit:'cover' }}/>;
  return (
    <div onClick={onClick} style={{ ...base, background:avColor(uid), color:'#fff', fontSize:Math.max(10,Math.round(sz*.34)), fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none' }}>
      {initials(name)}
    </div>
  );
};

const Tag = ({ t }) => <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:99, fontSize:12, fontWeight:500, background:'rgba(0,0,0,.06)', color:'rgba(0,0,0,.7)' }}>{t}</span>;

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
const Suggestions = ({ postId, me, requireAuth, onCount }) => {
  const [items, setItems] = useState(null);
  const [txt, setTxt] = useState('');
  useEffect(() => { let on = true; fetchSuggestions(postId).then(s => on && setItems(s)); return () => { on = false; }; }, [postId]);
  const submit = async () => {
    if (!txt.trim() || !me) return;
    try {
      const row = await addSuggestion(me.id, postId, txt.trim());
      setItems(p => [...(p||[]), { ...row, author:{ name:nameOf(me), avatar_url:me.user_metadata?.avatar_url } }]);
      onCount?.();
      setTxt('');
    } catch { /* surfaced in console */ }
  };
  return (
    <div className="slide-down" style={{ padding:'12px 16px', borderTop:'1px solid rgba(0,0,0,.08)', display:'flex', flexDirection:'column', gap:12 }}>
      {items === null && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>Loading…</div>}
      {items?.length === 0 && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>No suggestions yet. Be the first.</div>}
      {items?.map(c=>(
        <div key={c.id} style={{ display:'flex', gap:8 }}>
          <Av name={c.author?.name} uid={c.user_id} url={c.author?.avatar_url} sz={32}/>
          <div style={{ flex:1 }}>
            <div style={{ background:'rgba(0,0,0,.04)', borderRadius:8, padding:'8px 12px' }}>
              <span style={{ fontSize:13, fontWeight:700 }}>{c.author?.name || 'Founder'}</span>
              <span style={{ fontSize:12, color:'rgba(0,0,0,.45)', marginLeft:6 }}>{timeAgo(c.created_at)}</span>
              <p style={{ margin:'4px 0 0', fontSize:13, lineHeight:1.5, color:'rgba(0,0,0,.8)' }}>{c.text}</p>
            </div>
          </div>
        </div>
      ))}
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

// ── Post card ────────────────────────────────────────────────────────────────
const formatSize = b => !b ? '' : b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b/1024))} KB`;

// Renders attached photos (grid) + documents (download chips) on a post.
const MediaGrid = ({ media }) => {
  const images = media.filter(m => m.type === 'image');
  const files = media.filter(m => m.type !== 'image');
  return (
    <div style={{ margin:'6px 0 8px' }}>
      {images.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr', gap:4, borderRadius:8, overflow:'hidden', border:'1px solid rgba(0,0,0,.08)' }}>
          {images.map((m,i)=>(
            <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', lineHeight:0 }}>
              <img src={m.url} alt={m.name||''} loading="lazy"
                style={{ width:'100%', height: images.length === 1 ? 'auto' : 168, maxHeight:420, objectFit:'cover', display:'block' }}/>
            </a>
          ))}
        </div>
      )}
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

function PostCard({ post, me, followingIds, pendingIds, onFollow, onProfile, onRate, rOpen, onTR, cOpen, onTC, requireAuth, onDelete, onDM }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extraSug, setExtraSug] = useState(0);
  const author = post.author || {};
  const isSelf = me && post.user_id === me.id;
  const ratings = post.ratings || [];
  const myR = me ? ratings.find(r=>r.user_id===me.id) : null;
  const uRating = myR ? to10(myR.value) : null;
  const isF = followingIds.has(post.user_id);
  const isP = pendingIds?.has(post.user_id);
  const body = post.body || '';
  const isLong = body.length > 220;
  const shown = expanded || !isLong ? body : body.slice(0,220)+'…';
  const sugCount = (post.sugCount ?? 0) + extraSug;

  const share = () => {
    try { navigator.clipboard.writeText(`"${post.title}" — idea on Startup Oracle: ${window.location.origin}`); setCopied(true); setTimeout(()=>setCopied(false), 1600); } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{ ...card, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:8 }}>
          <Av name={author.name} uid={post.user_id} url={author.avatar_url} sz={48} onClick={()=>onProfile(post.user_id)}/>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>onProfile(post.user_id)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', fontFamily:F }}>{author.name || 'Founder'}</button>
              {!isSelf && <button onClick={requireAuth(()=>onFollow(post.user_id))} style={{ fontSize:13, fontWeight:600, color:'#0f172a', background:'none', border:'none', cursor:'pointer', padding:'0 2px', fontFamily:F }}>{isF?'· Following':isP?'· Requested':'· + Follow'}</button>}
            </div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.6)', lineHeight:1.4 }}>{headlineOf(author)}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.45)', marginTop:1 }}>{timeAgo(post.created_at)} · 🌐</div>
          </div>
        </div>
        {isSelf && onDelete && (
          <button onClick={()=>onDelete(post)} title="Delete idea" style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.45)', padding:4, fontSize:13, fontFamily:F }}>🗑</button>
        )}
      </div>

      <div style={{ padding:'10px 16px 0' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', marginBottom:4, lineHeight:1.4 }}>{post.title}</div>
        {body && <p style={{ margin:0, fontSize:14, lineHeight:1.6, color:'rgba(0,0,0,.8)', whiteSpace:'pre-line' }}>{shown}</p>}
        {isLong && <button onClick={()=>setExpanded(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:'rgba(0,0,0,.55)', padding:'2px 0', fontFamily:F }}>{expanded?'…show less':'…see more'}</button>}
        {post.media?.length > 0 && <MediaGrid media={post.media}/>}
        {post.tags?.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:5, margin:'10px 0 8px' }}>{post.tags.map(t=><Tag key={t} t={t}/>)}</div>}
      </div>

      <div style={{ padding:'4px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(0,0,0,.08)' }}>
        <span style={{ fontSize:12, color:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ background:'rgba(0,0,0,.9)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>★</span>
          {ratings.length ? <>avg <b style={{ color:'rgba(0,0,0,.7)' }}>{avg10(ratings).toFixed(1)}</b>/10 · {ratings.length} rating{ratings.length!==1?'s':''}</> : 'no ratings yet'}
        </span>
        <span style={{ fontSize:12, color:'rgba(0,0,0,.5)' }}>{sugCount} suggestion{sugCount!==1?'s':''}</span>
      </div>

      <div style={{ display:'flex', padding:'4px 4px' }}>
        <button className={'act-btn'+(uRating?' rated':'')} onClick={isSelf?undefined:requireAuth(onTR)} style={isSelf?{opacity:.35,cursor:'default'}:undefined} title={isSelf?"You can't rate your own idea":''}>
          ★ {uRating?`Rated ${uRating}`:'Rate'}
        </button>
        <button className="act-btn" onClick={onTC}>💬 Suggest</button>
        {!isSelf && <button className="act-btn" onClick={requireAuth(()=>onFollow(post.user_id))}>👤 {isF?'Following':isP?'Requested':'Follow'}</button>}
        {!isSelf && onDM && <button className="act-btn" onClick={requireAuth(()=>onDM({ id:post.user_id, name:author.name, avatar_url:author.avatar_url }))}>✉ DM</button>}
        <button className="act-btn" onClick={share}>{copied?'✓ Copied':'↗ Share'}</button>
      </div>

      {rOpen && !isSelf && <RatingScale current={uRating} avg={avg10(ratings)} rc={ratings.length} onRate={n=>onRate(post.id, n)}/>}
      {cOpen && <Suggestions postId={post.id} me={me} requireAuth={requireAuth} onCount={()=>setExtraSug(n=>n+1)}/>}
    </div>
  );
}

// ── Composer modal (text + photo + document upload) ──────────────────────────
const DOC_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md';
const MAX_FILE = 25 * 1024 * 1024; // 25 MB

function ComposerModal({ me, onClose, onPosted }) {
  const [body, setBody] = useState('');
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

  const submit = async () => {
    if ((!body.trim() && files.length === 0) || !me) return;
    setBusy(true); setErr('');
    try {
      const media = [];
      for (const f of files) {
        const url = await uploadPostFile(me.id, f.file);
        media.push({ url, type: f.type, name: f.name, size: f.size });
      }
      const lines = body.trim();
      const title = (lines.split('\n')[0].trim().slice(0, 80)) || 'New Idea';
      const rest = lines.split('\n').slice(1).join('\n').trim();
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
      const row = await createPost(me.id, { title, body: rest, tags: tagArr, media });
      onPosted({ id: row.id, created_at: row.created_at, user_id: me.id, title, body: rest, tags: tagArr, media,
        author: { id: me.id, name: nameOf(me), avatar_url: me.user_metadata?.avatar_url }, ratings: [], sugCount: 0 });
      onClose();
    } catch (e) {
      setErr(e?.message || 'Could not post. Please try again.');
    }
    setBusy(false);
  };

  const toolBtn = { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:6, border:'none', background:'transparent', color:'rgba(0,0,0,.65)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card, width:'100%', maxWidth:560, padding:0, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>Share an idea</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:18, padding:4 }}>✕</button>
        </div>

        <div style={{ padding:'14px 18px', display:'flex', gap:10, alignItems:'center' }}>
          <Av name={nameOf(me)} uid={me?.id||'me'} url={me?.user_metadata?.avatar_url} sz={44}/>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>{nameOf(me)}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,.5)' }}>Posting to the community feed</div>
          </div>
        </div>

        <div style={{ padding:'0 18px' }}>
          <textarea autoFocus value={body} onChange={e=>setBody(e.target.value)} rows={5}
            placeholder={"Idea title on the first line…\nThen describe the problem, your solution, and what feedback you need."}
            style={{ width:'100%', border:'none', outline:'none', fontSize:15, color:'rgba(0,0,0,.9)', lineHeight:1.65, background:'transparent', padding:0, fontFamily:F, resize:'none', boxSizing:'border-box' }}/>

          {files.length > 0 && (
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
            style={{ width:'100%', height:36, borderRadius:4, padding:'0 12px', fontSize:13, border:'1px solid rgba(0,0,0,.15)', background:'rgba(0,0,0,.02)', outline:'none', margin:'10px 0', fontFamily:F, boxSizing:'border-box' }}/>
          {err && <div style={{ fontSize:12.5, color:'#DC2626', marginBottom:8 }}>{err}</div>}
        </div>

        <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={e=>{ addFiles(e.target.files,'image'); e.target.value=''; }}/>
        <input ref={docInput} type="file" accept={DOC_ACCEPT} multiple hidden onChange={e=>{ addFiles(e.target.files,'file'); e.target.value=''; }}/>

        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,.08)' }}>
          <button onClick={()=>imgInput.current?.click()} style={toolBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>🖼 Photo</button>
          <button onClick={()=>docInput.current?.click()} style={toolBtn} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>📎 Document</button>
          <div style={{ flex:1 }}/>
          <button onClick={onClose} style={{ fontSize:13, fontWeight:600, color:'rgba(0,0,0,.5)', background:'none', border:'none', cursor:'pointer', fontFamily:F, marginRight:4 }}>Cancel</button>
          <button onClick={submit} disabled={busy || (!body.trim() && files.length===0)}
            style={{ padding:'8px 22px', borderRadius:99, background:'rgba(0,0,0,.9)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(body.trim()||files.length)&&!busy?1:.5, fontFamily:F }}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chat (Messages view + DM panel) ──────────────────────────────────────────
function ChatArea({ peer, msgs, me, onSend }) {
  const [input, setInput] = useState('');
  const boxRef = useRef(null);
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs]);
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput(''); };
  return (
    <>
      <div ref={boxRef} style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
        {msgs.length === 0 && <div style={{ textAlign:'center', color:'rgba(0,0,0,.4)', fontSize:13, paddingTop:60 }}>Start a conversation with {peer.name || 'this founder'}</div>}
        {msgs.map(m => {
          const mine = m.sender_id === me.id;
          return (
            <div key={m.id} style={{ display:'flex', gap:8, maxWidth:'75%', alignSelf:mine?'flex-end':'flex-start', flexDirection:mine?'row-reverse':'row' }}>
              {!mine && <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={26}/>}
              <div>
                <div style={{ padding:'8px 13px', fontSize:13, lineHeight:1.5,
                  background:mine?'rgba(0,0,0,.9)':'rgba(0,0,0,.05)', color:mine?'#fff':'rgba(0,0,0,.85)',
                  borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px' }}>{m.text}</div>
                <div style={{ fontSize:10, color:'rgba(0,0,0,.4)', marginTop:3, textAlign:'right' }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:'13px 22px', borderTop:'1px solid rgba(0,0,0,.08)', display:'flex', gap:9, alignItems:'center', flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={`Message ${peer.name || 'founder'}…`}
          onKeyDown={e=>e.key==='Enter'&&send()}
          style={{ flex:1, border:'1px solid rgba(0,0,0,.2)', borderRadius:22, padding:'9px 16px', fontSize:13, fontFamily:F, outline:'none' }}/>
        <button onClick={send} disabled={!input.trim()}
          style={{ width:34, height:34, background:'rgba(0,0,0,.9)', border:'none', borderRadius:'50%', color:'#fff', cursor:'pointer', flexShrink:0, opacity:input.trim()?1:.3, fontSize:13 }}>➤</button>
      </div>
    </>
  );
}

function MessagesView({ me, convs, activePeer, onOpenConv, onSend }) {
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
          const last = c.messages[c.messages.length-1];
          return (
            <div key={c.peer.id} onClick={()=>onOpenConv(c.peer.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', background:activePeer===c.peer.id?'rgba(0,0,0,.05)':'transparent' }}>
              <Av name={c.peer.name} uid={c.peer.id} url={c.peer.avatar_url} sz={38}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{c.peer.name || 'Founder'}</div>
                <div style={{ fontSize:11.5, color:'rgba(0,0,0,.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.text || ''}</div>
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
          <ChatArea peer={act.peer} msgs={act.messages} me={me} onSend={text=>onSend(act.peer.id, text)}/>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(0,0,0,.4)', fontSize:13 }}>Select a conversation</div>
      )}
    </div>
  );
}

function DMPanel({ peer, me, msgs, onSend, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:300, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', right:0, top:0, bottom:0, width:368, maxWidth:'92vw', background:'#fff', borderLeft:'1px solid rgba(0,0,0,.08)', display:'flex', flexDirection:'column', zIndex:301, boxShadow:'-12px 0 48px rgba(0,0,0,.07)', animation:'dmSlide .22s ease both' }}>
        <div style={{ padding:'13px 18px', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <Av name={peer.name} uid={peer.id} url={peer.avatar_url} sz={34}/>
          <div style={{ flex:1, fontSize:14, fontWeight:700 }}>{peer.name || 'Founder'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(0,0,0,.5)', fontSize:16, padding:4 }}>✕</button>
        </div>
        <ChatArea peer={peer} msgs={msgs} me={me} onSend={text=>onSend(peer.id, text)}/>
      </div>
    </>
  );
}

// ── Left sidebar ─────────────────────────────────────────────────────────────
function LeftBar({ me, posts, followerCount, unread, view, goFeed, goProfile, goMessages, onPost, requireAuth }) {
  const myPosts = me ? posts.filter(p=>p.user_id===me.id) : [];
  const myRatings = myPosts.flatMap(p=>p.ratings||[]);
  const myAvg = myRatings.length ? (avg10(myRatings)).toFixed(1) : '—';
  const tagCounts = useMemo(() => {
    const c = {};
    posts.forEach(p=>(p.tags||[]).forEach(t=>{ c[t]=(c[t]||0)+1; }));
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }, [posts]);

  return (
    <div style={{ width:225, flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ height:56, background:coverOf(me?.id||'me'), cursor:'pointer' }} onClick={me?()=>goProfile(me.id):requireAuth(()=>{})}/>
        <div style={{ padding:'0 12px 12px', position:'relative' }}>
          <div style={{ position:'absolute', top:-24 }}>
            <Av name={nameOf(me)} uid={me?.id||'me'} url={me?.user_metadata?.avatar_url} sz={56} border onClick={me?()=>goProfile(me.id):undefined}/>
          </div>
          <div style={{ paddingTop:36 }}>
            <button onClick={me?()=>goProfile(me.id):requireAuth(()=>{})} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:15, fontWeight:700, color:'rgba(0,0,0,.9)', display:'block', textAlign:'left', fontFamily:F }}>{me?nameOf(me):'Sign in'}</button>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'rgba(0,0,0,.6)', lineHeight:1.4 }}>{me?'Founder · Startup Oracle':'Join the founder community'}</p>
          </div>
        </div>
        {me && (
          <div style={{ borderTop:'1px solid rgba(0,0,0,.08)', padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
            {[['Followers', followerCount],['Ideas posted', myPosts.length],['Avg rating', myAvg==='—'?'—':`${myAvg}/10`]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'rgba(0,0,0,.6)' }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'rgba(0,0,0,.9)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, padding:'8px 0' }}>
        <div style={{ padding:'4px 12px 8px' }}>
          <button onClick={me ? onPost : requireAuth(()=>{})}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background:'rgba(0,0,0,.9)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F }}>
            ✎ Post an Idea
          </button>
        </div>
        {[
          ['feed','Browse Ideas','▦', goFeed],
          ['profile','My Profile','◉', me?()=>goProfile(me.id):requireAuth(()=>{})],
          ['messages','Messages','✉', goMessages],
        ].map(([id,label,icon,fn])=>{
          const act = view===id || (id==='profile' && view==='profile-self');
          return (
            <button key={id} onClick={fn} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 16px', border:'none', background:act?'rgba(0,0,0,.06)':'transparent', color:act?'rgba(0,0,0,.9)':'rgba(0,0,0,.6)', fontSize:13, fontWeight:act?700:500, cursor:'pointer', borderLeft:act?'3px solid rgba(0,0,0,.9)':'3px solid transparent', fontFamily:F, transition:'all .15s' }}>
              <span>{icon}</span>{label}
              {id==='messages' && unread>0 && <span style={{ marginLeft:'auto', background:'rgba(0,0,0,.9)', color:'#fff', fontSize:9.5, fontWeight:700, minWidth:17, height:17, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{unread}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ ...card, padding:'12px 16px' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'rgba(0,0,0,.9)' }}>Trending topics</div>
        {tagCounts.length === 0 && <div style={{ fontSize:12, color:'rgba(0,0,0,.4)' }}>No topics yet.</div>}
        {tagCounts.map(([t,n])=>(
          <div key={t} style={{ fontSize:12, color:'rgba(0,0,0,.6)', marginBottom:6, lineHeight:1.4 }}>
            <span style={{ fontWeight:600, color:'rgba(0,0,0,.8)' }}>#{t.replace(/\s+/g,'')}</span> <span style={{ color:'rgba(0,0,0,.45)' }}>·</span> {n} idea{n!==1?'s':''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right sidebar ────────────────────────────────────────────────────────────
// Live startup news via TechCrunch's RSS feed (through a CORS-friendly proxy),
// with a static fallback if the feed can't be reached.
const NEWS_FALLBACK = [
  { h:'Visit TechCrunch for the latest startup news', t:'Live feed', link:'https://techcrunch.com/category/startups/' },
  { h:'YC, a16z, and Sequoia portfolio updates', t:'Markets', link:'https://news.crunchbase.com/' },
  { h:'Funding rounds, launches & acquisitions', t:'Daily', link:'https://techcrunch.com/category/venture/' },
];
const NEWS_FEED = 'https://techcrunch.com/category/startups/feed/';

function useStartupNews() {
  const [news, setNews] = useState(NEWS_FALLBACK);
  useEffect(() => {
    let on = true;
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(NEWS_FEED)}`)
      .then(r => r.json())
      .then(d => {
        if (!on || d.status !== 'ok' || !d.items?.length) return;
        setNews(d.items.slice(0, 6).map(i => ({ h: i.title, t: timeAgo(i.pubDate.replace(' ', 'T') + 'Z'), link: i.link })));
      })
      .catch(() => { /* keep fallback */ });
    return () => { on = false; };
  }, []);
  return news;
}

function RightBar({ me, posts, followingIds, pendingIds, onFollow, onProfile, requireAuth }) {
  const news = useStartupNews();
  const founders = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of posts) {
      if (p.user_id === me?.id || seen.has(p.user_id)) continue;
      seen.add(p.user_id);
      out.push({ id:p.user_id, ...p.author });
      if (out.length >= 4) break;
    }
    return out;
  }, [posts, me]);

  return (
    <div className="comm-right" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ ...card, padding:'12px 16px' }}>
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
      <div style={{ ...card, padding:'12px 16px' }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Founders to follow</div>
        {founders.length === 0 && <div style={{ fontSize:12.5, color:'rgba(0,0,0,.4)' }}>New founders will appear here.</div>}
        {founders.map(f=>(
          <div key={f.id} style={{ display:'flex', gap:10, marginBottom:14, alignItems:'flex-start' }}>
            <Av name={f.name} uid={f.id} url={f.avatar_url} sz={40} onClick={()=>onProfile(f.id)}/>
            <div style={{ flex:1, minWidth:0 }}>
              <button onClick={()=>onProfile(f.id)} style={{ background:'none', border:'none', padding:0, fontSize:14, fontWeight:700, color:'rgba(0,0,0,.9)', cursor:'pointer', display:'block', textAlign:'left', fontFamily:F }}>{f.name || 'Founder'}</button>
              <div style={{ fontSize:12, color:'rgba(0,0,0,.6)', lineHeight:1.4, marginBottom:6 }}>{headlineOf(f)}</div>
              <button onClick={requireAuth(()=>onFollow(f.id))} style={{ padding:'4px 16px', borderRadius:99, border:`1.5px solid ${pendingIds?.has(f.id)?'rgba(0,0,0,.3)':'rgba(0,0,0,.9)'}`, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s', background:followingIds.has(f.id)?'rgba(0,0,0,.9)':'transparent', color:followingIds.has(f.id)?'#fff':pendingIds?.has(f.id)?'rgba(0,0,0,.45)':'rgba(0,0,0,.9)', fontFamily:F }}>
                {followingIds.has(f.id)?'Following':pendingIds?.has(f.id)?'Requested':'Follow'}
              </button>
            </div>
          </div>
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

// ── Profile view (any founder) ───────────────────────────────────────────────
function ProfileView({ uid, me, posts, followingIds, pendingIds, onFollow, onProfile, onRate, rOpen, onTR, cOpen, onTC, onBack, openDM, requireAuth, onDelete }) {
  const isSelf = me && uid === me.id;
  const [prof, setProf] = useState(null);
  const [counts, setCounts] = useState({ followers:0, following:0 });
  const [tab, setTab] = useState('ideas');
  const [received, setReceived] = useState(null);
  const [requests, setRequests] = useState(null);
  const [peopleModal, setPeopleModal] = useState(null); // 'followers' | 'following'

  useEffect(() => {
    let on = true;
    fetchProfile(uid).then(p => on && setProf(p));
    fetchFollowCounts(uid).then(c => on && setCounts(c));
    if (me && uid === me.id) fetchFollowRequests(uid).then(r => on && setRequests(r));
    return () => { on = false; };
  }, [uid, me]);
  useEffect(() => {
    if (!isSelf) return;
    let on = true;
    if (tab === 'ratings') fetchRatingsReceived(uid).then(r => on && setReceived(r));
    return () => { on = false; };
  }, [tab, uid, isSelf]);

  const respond = async (followerId, accept) => {
    setRequests(prev => (prev||[]).filter(p => p.id !== followerId));
    if (accept) setCounts(c => ({ ...c, followers: c.followers + 1 }));
    await respondFollowRequest(me.id, followerId, accept);
  };

  const fps = posts.filter(p=>p.user_id===uid);
  const name = isSelf ? nameOf(me) : (prof?.name || fps[0]?.author?.name || 'Founder');
  const avatar = isSelf ? me.user_metadata?.avatar_url : prof?.avatar_url;
  const isF = followingIds.has(uid);
  const isP = pendingIds?.has(uid);
  const reqCount = requests?.length || 0;

  const tabs = isSelf
    ? [['ideas','My Ideas'],['ratings','Ratings Received'],['requests', reqCount ? `Requests (${reqCount})` : 'Requests']]
    : [];

  return (
    <div key={uid} className="fade-up" style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ height:140, background:coverOf(uid), position:'relative' }}>
          <button onClick={onBack} style={{ position:'absolute', top:12, left:12, padding:'6px 14px', borderRadius:99, background:'rgba(0,0,0,.35)', backdropFilter:'blur(10px)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>← Back</button>
        </div>
        <div style={{ padding:'0 24px 20px', position:'relative' }}>
          <div style={{ position:'absolute', top:-40 }}>
            <Av name={name} uid={uid} url={avatar} sz={80} border/>
          </div>
          <div style={{ paddingTop:50, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:'rgba(0,0,0,.9)' }}>{name}</div>
              <div style={{ fontSize:14, color:'rgba(0,0,0,.6)', marginTop:2 }}>{headlineOf(prof)}</div>
            </div>
            {!isSelf && (
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={requireAuth(()=>onFollow(uid))} style={{ padding:'8px 20px', borderRadius:99, border:`1.5px solid ${isP?'rgba(0,0,0,.3)':'rgba(0,0,0,.9)'}`, fontSize:14, fontWeight:700, cursor:'pointer', background:isF?'rgba(0,0,0,.9)':'transparent', color:isF?'#fff':isP?'rgba(0,0,0,.45)':'rgba(0,0,0,.9)', fontFamily:F }}>{isF?'Following':isP?'Requested':'Follow'}</button>
                <button onClick={requireAuth(()=>openDM({ id:uid, name, avatar_url:avatar }))} style={{ padding:'8px 20px', borderRadius:99, border:'1.5px solid rgba(0,0,0,.25)', fontSize:14, fontWeight:600, cursor:'pointer', background:'transparent', color:'rgba(0,0,0,.7)', fontFamily:F }}>Message</button>
              </div>
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
        fps.length === 0
          ? <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>No ideas posted yet.</div>
          : fps.map(p=><PostCard key={p.id} post={p} me={me} followingIds={followingIds} pendingIds={pendingIds} onFollow={onFollow} onProfile={onProfile} onRate={onRate} rOpen={rOpen===p.id} onTR={()=>onTR(p.id)} cOpen={cOpen===p.id} onTC={()=>onTC(p.id)} requireAuth={requireAuth} onDelete={onDelete} openDM={openDM}/>)
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
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────
export default function Community({ onSubmitIdea, onHome, user, onSignIn, onAccount }) {
  const [view, setView] = useState('feed');         // feed | profile | messages
  const [pid, setPid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const activePeerRef = useRef(null);
  const dmUserRef = useRef(null);
  useEffect(() => { activePeerRef.current = view === 'messages' ? activePeer : null; }, [view, activePeer]);
  useEffect(() => { dmUserRef.current = dmUser?.id ?? null; }, [dmUser]);

  useEffect(() => { fetchPosts().then(p => { setPosts(p); setLoading(false); }); }, []);
  useEffect(() => {
    let on = true;
    fetchFollowState(user?.id ?? null).then(s => { if (on) setFollowState(s); });
    if (user) {
      fetchFollowCounts(user.id).then(c => { if (on) setFollowerCount(c.followers); });
      fetchFollowRequests(user.id).then(r => { if (on) setRequests(r); });
      // Keep the bell fresh — poll for new follow requests every 30s
      const iv = setInterval(() => fetchFollowRequests(user.id).then(r => { if (on) setRequests(r); }), 30000);
      return () => { on = false; clearInterval(iv); };
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
    const unsub = subscribeToMessages(user.id, async row => {
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
  }, [user]);

  const handleRate = useCallback(async (postId, n10) => {
    if (!user) return;
    const value = n10 / 2;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const others = (p.ratings||[]).filter(r => r.user_id !== user.id);
      return { ...p, ratings:[...others, { user_id:user.id, value }] };
    }));
    setTimeout(() => setROpen(null), 700);
    await ratePost(user.id, postId, value);
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

  const handleSend = useCallback(async (peerId, text) => {
    if (!user) return;
    const temp = { id:`t_${Date.now()}`, sender_id:user.id, recipient_id:peerId, text, created_at:new Date().toISOString() };
    setConvs(prev => ({ ...prev, [peerId]: { ...prev[peerId], messages:[...(prev[peerId]?.messages||[]), temp] } }));
    try {
      const row = await sendMessage(user.id, peerId, text);
      setConvs(prev => ({ ...prev, [peerId]: { ...prev[peerId], messages:prev[peerId].messages.map(m => m.id===temp.id?row:m) } }));
    } catch { /* surfaced in console */ }
  }, [user]);

  const openConv = useCallback(peerId => {
    setActivePeer(peerId);
    setConvs(prev => prev[peerId] ? { ...prev, [peerId]: { ...prev[peerId], unread:0 } } : prev);
    if (user) markConversationRead(user.id, peerId);
  }, [user]);

  const unread = useMemo(() => Object.values(convs).reduce((s,c)=>s+(c.unread||0),0), [convs]);
  const toggleR = id => { setROpen(p=>p===id?null:id); setCOpen(null); };
  const toggleC = id => { setCOpen(p=>p===id?null:id); setROpen(null); };
  const goProfile = uid => { setPid(uid); setView('profile'); };
  const goFeed = () => setView('feed');
  const goMessages = () => { if (!user) return onSignIn?.(); setView('messages'); };

  const shown = useMemo(() => {
    let l = [...posts];
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(p => p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q) || p.tags?.some(t=>t.toLowerCase().includes(q)) || p.author?.name?.toLowerCase().includes(q));
    }
    if (tab === 'following') l = l.filter(p => followingIds.has(p.user_id));
    if (tab === 'top-rated') l.sort((a,b) => avg10(b.ratings) - avg10(a.ratings));
    if (tab === 'most-discussed') l.sort((a,b) => (b.sugCount||0) - (a.sugCount||0));
    return l;
  }, [posts, tab, search, followingIds]);

  const cardProps = { me:user, followingIds, pendingIds, onFollow:handleFollow, onProfile:goProfile, onRate:handleRate, rOpen, cOpen, requireAuth, onDelete:p=>setConfirmDel(p), onDM:openDM };

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
        .act-btn{display:flex;flex:1;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border:none;background:none;cursor:pointer;font-size:13.5px;font-weight:600;color:rgba(0,0,0,.6);border-radius:4px;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif}
        .act-btn:hover{background:rgba(0,0,0,.08);color:rgba(0,0,0,.9)}
        .act-btn.on{color:#0f172a;background:rgba(0,0,0,.06)}
        .act-btn.rated{color:#92400e}
        @media (max-width:1100px){ .comm-right{display:none!important} }
        @media (max-width:840px){ .comm-left{display:none!important} }
      `}</style>

      {/* Top nav */}
      <header style={{ height:52, background:'#fff', borderBottom:'1px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, position:'sticky', top:0, zIndex:100 }}>
        <span onClick={onHome} style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.5px', color:'rgba(0,0,0,.9)', whiteSpace:'nowrap', cursor:'pointer' }}>startup oracle</span>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.06)', borderRadius:4, padding:'0 10px', height:34, flex:'0 1 220px' }}>
          🔍<input value={search} onChange={e=>{ setSearch(e.target.value); setView('feed'); }} placeholder="Search ideas"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:13, fontFamily:F, minWidth:0 }}/>
        </div>
        <div style={{ flex:1 }}/>
        {/* Notifications bell */}
        <div style={{ position:'relative' }}>
          <button onClick={user ? ()=>{ const next = !bellOpen; setBellOpen(next); if (next) fetchFollowRequests(user.id).then(setRequests); } : requireAuth(()=>{})}
            title="Notifications"
            style={{ position:'relative', width:36, height:36, borderRadius:'50%', border:'none', background:bellOpen?'rgba(0,0,0,.08)':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s' }}
            onMouseEnter={e=>{ if(!bellOpen) e.currentTarget.style.background='rgba(0,0,0,.05)'; }}
            onMouseLeave={e=>{ if(!bellOpen) e.currentTarget.style.background='transparent'; }}>
            <svg width="19" height="19" viewBox="0 0 22 22" fill="none"><path d="M11 2a7 7 0 00-7 7v5l-2 2v1h18v-1l-2-2V9a7 7 0 00-7-7Z" stroke="rgba(0,0,0,.65)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 18a2 2 0 004 0" stroke="rgba(0,0,0,.65)" strokeWidth="1.6" strokeLinecap="round"/></svg>
            {requests.length > 0 && (
              <span style={{ position:'absolute', top:2, right:1, minWidth:16, height:16, background:'#DC2626', color:'#fff', borderRadius:9, fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid #fff' }}>{requests.length}</span>
            )}
          </button>

          {bellOpen && (
            <>
              <div onClick={()=>setBellOpen(false)} style={{ position:'fixed', inset:0, zIndex:240 }}/>
              <div className="fade-up" style={{ position:'absolute', top:42, right:0, width:330, maxWidth:'90vw', background:'#fff', borderRadius:10, border:'1px solid rgba(0,0,0,.08)', boxShadow:'0 12px 40px rgba(0,0,0,.14)', zIndex:241, overflow:'hidden' }}>
                <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(0,0,0,.08)', fontSize:14, fontWeight:700 }}>Notifications</div>
                <div style={{ maxHeight:360, overflowY:'auto', padding:'4px 16px 8px' }}>
                  {requests.length === 0 && (
                    <div style={{ padding:'26px 0', textAlign:'center', fontSize:13, color:'rgba(0,0,0,.4)' }}>No new notifications.</div>
                  )}
                  {requests.map((u,i)=>(
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:i===requests.length-1?'none':'1px solid rgba(0,0,0,.06)' }}>
                      <Av name={u.name} uid={u.id} url={u.avatar_url} sz={38} onClick={()=>{ setBellOpen(false); goProfile(u.id); }}/>
                      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>{ setBellOpen(false); goProfile(u.id); }}>
                        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name || 'Founder'}</div>
                        <div style={{ fontSize:11.5, color:'rgba(0,0,0,.5)' }}>requested to follow you · {timeAgo(u.requested_at)}</div>
                      </div>
                      <button onClick={()=>respondRequest(u.id, true)}
                        style={{ padding:'5px 13px', borderRadius:99, border:'none', background:'rgba(0,0,0,.9)', color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Accept</button>
                      <button onClick={()=>respondRequest(u.id, false)}
                        style={{ padding:'5px 11px', borderRadius:99, border:'1px solid rgba(0,0,0,.2)', background:'transparent', color:'rgba(0,0,0,.6)', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 }}>Reject</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        {user ? (
          <div onClick={()=>onAccount?.()} title="My Account" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <Av name={nameOf(user)} uid={user.id} url={user.user_metadata?.avatar_url} sz={30}/>
            <span style={{ fontSize:13, fontWeight:600, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nameOf(user)}</span>
          </div>
        ) : (
          <span onClick={()=>onSignIn?.()} style={{ fontSize:13, color:'rgba(0,0,0,.6)', cursor:'pointer', fontWeight:500 }}>Sign in</span>
        )}
        <button onClick={onSubmitIdea} style={{ padding:'7px 16px', background:'rgba(0,0,0,.9)', color:'#fff', border:'none', borderRadius:99, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:F }}>Validate My Idea →</button>
      </header>

      {/* 3-column layout */}
      <div style={{ maxWidth:1128, margin:'0 auto', padding:'20px 16px', display:'flex', gap:16, alignItems:'flex-start' }}>
        <div className="comm-left" style={{ display:'block' }}>
          <LeftBar me={user} posts={posts} followerCount={followerCount} unread={unread} view={view==='profile'&&pid===user?.id?'profile-self':view} goFeed={goFeed} goProfile={goProfile} goMessages={goMessages} onPost={()=>setComposerOpen(true)} requireAuth={requireAuth}/>
        </div>

        <div style={{ flex:1, minWidth:0, maxWidth:view==='messages'?'none':555 }}>
          {view === 'feed' && (
            <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ ...card, display:'flex' }}>
                {[['all','All'],['top-rated','Top Rated'],['most-discussed','Most Discussed'],['following','Following']].map(([id,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'12px 4px', border:'none', borderBottom:tab===id?'2px solid rgba(0,0,0,.9)':'2px solid transparent', background:'transparent', fontSize:13, fontWeight:tab===id?700:500, cursor:'pointer', color:tab===id?'rgba(0,0,0,.9)':'rgba(0,0,0,.55)', fontFamily:F, transition:'all .15s' }}>
                    {label}
                  </button>
                ))}
              </div>
              {loading && <div style={{ ...card, padding:40, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>Loading ideas…</div>}
              {!loading && shown.length === 0 && (
                <div style={{ ...card, padding:48, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>
                  {search ? `No ideas matching "${search}".` : tab==='following' ? 'Follow some founders to see their ideas here.' : 'No ideas yet — be the first to share one.'}
                </div>
              )}
              {shown.map(p=>(
                <PostCard key={p.id} post={p} {...cardProps} onTR={()=>toggleR(p.id)} onTC={()=>toggleC(p.id)} rOpen={rOpen===p.id} cOpen={cOpen===p.id}/>
              ))}
            </div>
          )}

          {view === 'profile' && pid && (
            <ProfileView uid={pid} me={user} posts={posts} followingIds={followingIds} pendingIds={pendingIds} onFollow={handleFollow} onProfile={goProfile} onRate={handleRate} rOpen={rOpen} onTR={toggleR} cOpen={cOpen} onTC={toggleC} onBack={goFeed} openDM={openDM} requireAuth={requireAuth} onDelete={p=>setConfirmDel(p)}/>
          )}

          {view === 'messages' && (
            user
              ? <MessagesView me={user} convs={convs} activePeer={activePeer} onOpenConv={openConv} onSend={handleSend}/>
              : <div style={{ ...card, padding:48, textAlign:'center', fontSize:14, color:'rgba(0,0,0,.4)' }}>Sign in to see your messages.</div>
          )}
        </div>

        {view !== 'messages' && (
          <RightBar me={user} posts={posts} followingIds={followingIds} pendingIds={pendingIds} onFollow={handleFollow} onProfile={goProfile} requireAuth={requireAuth}/>
        )}
      </div>

      {/* Composer modal */}
      {composerOpen && user && (
        <ComposerModal me={user} onClose={()=>setComposerOpen(false)} onPosted={p=>{ setPosts(prev=>[p,...prev]); setView('feed'); }}/>
      )}

      {/* DM slide-over */}
      {dmUser && user && (
        <DMPanel peer={dmUser} me={user} msgs={convs[dmUser.id]?.messages || []} onSend={handleSend} onClose={()=>setDmUser(null)}/>
      )}

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
