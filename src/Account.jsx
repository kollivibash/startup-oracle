import { useState } from 'react'
import { supabase } from './supabaseClient'

const F = "'Plus Jakarta Sans', system-ui, sans-serif"

// ── Helpers to read real user data ───────────────────────────────────────────

const displayName = u => u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'User'

const joinedDate = u => u?.created_at
  ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  : '—'

const providersOf = u => {
  const p = u?.app_metadata?.providers || (u?.app_metadata?.provider ? [u.app_metadata.provider] : [])
  return p.map(x => x.toLowerCase())
}

const loadIdeas = () => {
  try { return JSON.parse(localStorage.getItem('myIdeas') || '[]') } catch { return [] }
}

const scoreStatus = score => {
  if (score == null)  return { label: 'Analysed',   bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' }
  if (score >= 70)    return { label: 'Validated',  bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' }
  if (score >= 40)    return { label: 'Promising',  bg: '#FFFBEB', text: '#D97706', dot: '#D97706' }
  return                     { label: 'Needs Work', bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' }
}

// ── Shared micro-components (from the Claude Design file) ────────────────────

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
      <div>
        <h2 style={{ margin:0, fontSize:17, fontWeight:600, color:'#111827', lineHeight:1.3 }}>{title}</h2>
        {subtitle && <p style={{ margin:'4px 0 0', fontSize:13, color:'#9CA3AF' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Toast({ msg, color = '#166534', bg = '#F0FDF4', border = '#DCFCE7' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color, background:bg, border:`1px solid ${border}`, borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {msg}
    </div>
  )
}

function OutlineBtn({ children, onClick, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ fontSize:13, fontWeight:500, border:`1px solid ${danger ? '#FECACA' : '#E5E7EB'}`,
        borderRadius:8, padding:'6px 12px', cursor:'pointer', transition:'background .15s',
        background: hov ? (danger ? '#FEF2F2' : '#F9FAFB') : '#fff',
        color: danger ? '#DC2626' : '#374151', fontFamily:F }}>
      {children}
    </button>
  )
}

function PrimaryBtn({ children, onClick, disabled, type }) {
  const [hov, setHov] = useState(false)
  return (
    <button type={type} onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ fontSize:13, fontWeight:600, borderRadius:8, padding:'7px 16px', cursor: disabled ? 'not-allowed' : 'pointer',
        border:'none', transition:'background .15s', opacity: disabled ? 0.4 : 1,
        background: hov && !disabled ? '#1F2937' : '#111827', color:'#fff', fontFamily:F }}>
      {children}
    </button>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      style={{ position:'relative', width:36, height:20, borderRadius:99, border:'none', cursor:'pointer',
        background: on ? '#111827' : '#D1D5DB', padding:0, transition:'background .2s', flexShrink:0 }}>
      <span style={{ position:'absolute', top:2, left: on ? 18 : 2, width:16, height:16, borderRadius:'50%',
        background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s' }}/>
    </button>
  )
}

const cardStyle = { background:'#fff', border:'1px solid #F3F4F6', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }
const rowStyle  = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #F9FAFB' }
const inputStyle = { width:'100%', fontSize:13, color:'#111827', border:'1px solid #E5E7EB', borderRadius:8, padding:'7px 10px', outline:'none', fontFamily:F, boxSizing:'border-box' }

function Avatar({ user, size = 'md' }) {
  const sz = { sm:32, md:40, lg:52 }[size]
  const fs = { sm:11, md:13, lg:17 }[size]
  const url = user?.user_metadata?.avatar_url
  if (url) return <img src={url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', flexShrink:0 }}/>
  const initials = displayName(user).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width:sz, height:sz, borderRadius:'50%', background:'#111827', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:fs, flexShrink:0, letterSpacing:'0.02em' }}>
      {initials}
    </div>
  )
}

// ── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection({ user, onUserUpdated }) {
  const meta = user?.user_metadata || {}
  const initial = { full_name: meta.full_name || '', role: meta.role || '', company: meta.company || '' }
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState(initial)

  const handleSave = async () => {
    setSaving(true); setError('')
    const { data, error } = await supabase.auth.updateUser({ data: { ...form } })
    setSaving(false)
    if (error) { setError(error.message); return }
    setEditing(false); setSaved(true)
    onUserUpdated?.(data.user)
    setTimeout(() => setSaved(false), 3000)
  }

  const rows = [
    { key:'full_name', label:'Full Name',         value: form.full_name, editable:true,  placeholder:'Your name' },
    { key:'email',     label:'Email Address',     value: user?.email,    editable:false },
    { key:'role',      label:'Role',              value: form.role,      editable:true,  placeholder:'e.g. First-time founder' },
    { key:'company',   label:'Company / Project', value: form.company,   editable:true,  placeholder:'e.g. Stealth Labs' },
    { key:'joined',    label:'Member Since',      value: joinedDate(user), editable:false },
  ]

  return (
    <div>
      <SectionHeader title="Profile Information" subtitle="Manage your personal details."
        action={!editing && <OutlineBtn onClick={() => setEditing(true)}>Edit</OutlineBtn>}/>
      {saved && <Toast msg="Profile updated successfully."/>}
      {error && <Toast msg={error} color="#DC2626" bg="#FEF2F2" border="#FECACA"/>}

      <div style={cardStyle}>
        {rows.map(({ key, label, value, editable, placeholder }, i) => (
          <div key={key} style={{ ...rowStyle, borderBottom: i === rows.length-1 ? 'none' : '1px solid #F9FAFB' }}>
            <span style={{ width:160, flexShrink:0, fontSize:13, fontWeight:500, color:'#6B7280' }}>{label}</span>
            <div style={{ flex:1, minWidth:0 }}>
              {editing && editable ? (
                <input value={form[key]} placeholder={placeholder}
                  onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle}/>
              ) : (
                <span style={{ fontSize:13, color: value ? '#111827' : '#C0C4CC' }}>{value || 'Not set'}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</PrimaryBtn>
          <button onClick={() => { setEditing(false); setForm(initial); setError('') }}
            style={{ fontSize:13, color:'#6B7280', background:'none', border:'none', cursor:'pointer', padding:'7px 4px', fontFamily:F }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Security Section ─────────────────────────────────────────────────────────

const GoogleIcon = () => <svg width="16" height="16" viewBox="0 0 18 18"><path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6A7.8 7.8 0 0016.51 8z" fill="#4285F4"/><path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/><path d="M4.5 10.48A4.75 4.75 0 014.5 7.52V5.45H1.83a8 8 0 000 7.1l2.67-2.07z" fill="#FBBC05"/><path d="M8.98 4.27c1.2 0 2.26.41 3.1 1.22l2.3-2.3A8 8 0 001.83 5.45L4.5 7.52A4.77 4.77 0 018.98 4.27z" fill="#EA4335"/></svg>
const GitHubIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>

function SecuritySection({ user }) {
  const providers = providersOf(user)
  const hasEmail  = providers.includes('email')
  const [pwOpen, setPwOpen]   = useState(false)
  const [pw, setPw]           = useState({ next:'', confirm:'' })
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [saving, setSaving]   = useState(false)

  const handlePwSave = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pw.next.length < 6)     { setPwError('Password must be at least 6 characters.'); return }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSaving(false)
    if (error) { setPwError(error.message); return }
    setPwOpen(false); setPw({ next:'', confirm:'' }); setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  const linked = [
    { id:'google', name:'Google', icon:<GoogleIcon/>, on: providers.includes('google') },
    { id:'github', name:'GitHub', icon:<GitHubIcon/>, on: providers.includes('github') },
  ]

  return (
    <div>
      <SectionHeader title="Account Security" subtitle="Password and linked authentication."/>
      {pwSaved && <Toast msg="Password changed successfully."/>}

      <div style={{ ...cardStyle, marginBottom:12 }}>
        <div style={rowStyle}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#111827' }}>Password</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'#9CA3AF' }}>
              {hasEmail ? 'Change the password you use to sign in.' : `You sign in with ${providers.map(p => p[0].toUpperCase()+p.slice(1)).join(' / ') || 'a social account'} — no password needed.`}
            </p>
          </div>
          {hasEmail && <OutlineBtn onClick={() => setPwOpen(o => !o)}>Change Password</OutlineBtn>}
        </div>
        {pwOpen && hasEmail && (
          <form onSubmit={handlePwSave} style={{ borderTop:'1px solid #F3F4F6', padding:'16px 20px' }}>
            {[['next','New Password'],['confirm','Confirm New Password']].map(([k, lbl]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#6B7280', marginBottom:4 }}>{lbl}</label>
                <input type="password" value={pw[k]} onChange={e => setPw({ ...pw, [k]: e.target.value })} style={inputStyle}/>
              </div>
            ))}
            {pwError && <p style={{ margin:'0 0 10px', fontSize:12, color:'#DC2626', fontWeight:500 }}>{pwError}</p>}
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</PrimaryBtn>
              <button type="button" onClick={() => { setPwOpen(false); setPwError('') }}
                style={{ fontSize:13, color:'#6B7280', background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div style={cardStyle}>
        <p style={{ margin:0, padding:'10px 20px', fontSize:11, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #F3F4F6' }}>
          Linked Accounts
        </p>
        {linked.map(({ id, name, icon, on }, i) => (
          <div key={id} style={{ ...rowStyle, borderBottom: i === linked.length-1 ? 'none' : '1px solid #F9FAFB' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:8, border:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
              <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#111827' }}>{name}</p>
            </div>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: on ? '#16A34A' : '#9CA3AF' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: on ? '#16A34A' : '#D1D5DB' }}/>
              {on ? 'Connected' : 'Not connected'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ideas Section ────────────────────────────────────────────────────────────

function IdeasSection({ onSubmitIdea }) {
  const ideas = loadIdeas()

  return (
    <div>
      <SectionHeader title="My Ideas" subtitle={ideas.length ? `Your ${ideas.length} most recent validation${ideas.length > 1 ? 's' : ''}.` : 'Ideas you validate will appear here.'}
        action={<PrimaryBtn onClick={onSubmitIdea}>+ New Idea</PrimaryBtn>}/>

      {ideas.length === 0 ? (
        <div style={{ ...cardStyle, padding:'40px 24px', textAlign:'center' }}>
          <div style={{ fontSize:26, marginBottom:10 }}>💡</div>
          <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:'#111827' }}>No ideas yet</p>
          <p style={{ margin:'0 0 18px', fontSize:13, color:'#9CA3AF' }}>Run your first idea through the oracle and it will show up here.</p>
          <PrimaryBtn onClick={onSubmitIdea}>Validate My Idea →</PrimaryBtn>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ideas.map((idea, i) => {
            const cfg = scoreStatus(idea.score)
            return (
              <div key={i} style={{ ...cardStyle, display:'flex', alignItems:'center', gap:14, padding:'14px 20px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{idea.title}</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:cfg.bg, color:cfg.text }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                      {cfg.label}
                    </span>
                    {idea.score != null && <span style={{ fontSize:12, color:'#9CA3AF' }}>Score {idea.score}</span>}
                  </div>
                  <p style={{ margin:'4px 0 0', fontSize:12, color:'#9CA3AF' }}>
                    {idea.date ? new Date(idea.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''}{idea.category ? ` · ${idea.category}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Preferences Section ──────────────────────────────────────────────────────

function PreferencesSection({ user, onUserUpdated }) {
  const stored = user?.user_metadata?.prefs || {}
  const [prefs, setPrefs] = useState({
    statusUpdates: stored.statusUpdates ?? true,
    weeklyDigest:  stored.weeklyDigest  ?? false,
    productNews:   stored.productNews   ?? false,
    publicProfile: stored.publicProfile ?? true,
  })

  const toggle = async k => {
    const next = { ...prefs, [k]: !prefs[k] }
    setPrefs(next)
    const { data } = await supabase.auth.updateUser({ data: { prefs: next } })
    if (data?.user) onUserUpdated?.(data.user)
  }

  const groups = [
    { label:'Email Notifications', items:[
      { key:'statusUpdates', label:'Idea status updates', desc:'Notified when your idea status changes.' },
      { key:'weeklyDigest',  label:'Weekly digest',       desc:'Platform activity summary every Monday.' },
      { key:'productNews',   label:'Product news & tips', desc:'Occasional emails about new features.' },
    ]},
    { label:'Privacy', items:[
      { key:'publicProfile', label:'Public profile', desc:'Make your profile visible to other members.' },
    ]},
  ]

  return (
    <div>
      <SectionHeader title="Preferences" subtitle="Notifications and privacy settings."/>
      {groups.map(({ label, items }) => (
        <div key={label} style={{ marginBottom:16 }}>
          <p style={{ margin:'0 0 8px 2px', fontSize:11, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
          <div style={cardStyle}>
            {items.map(({ key, label: lbl, desc }, i) => (
              <div key={key} style={{ ...rowStyle, borderBottom: i === items.length-1 ? 'none' : '1px solid #F9FAFB' }}>
                <div style={{ paddingRight:16 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#111827' }}>{lbl}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'#9CA3AF' }}>{desc}</p>
                </div>
                <Toggle on={prefs[key]} onToggle={() => toggle(key)}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Danger Zone ──────────────────────────────────────────────────────────────

function DangerSection({ user, onLogout }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [text, setText]               = useState('')
  const CONFIRM_PHRASE = 'delete my account'

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({
      profile: { name: displayName(user), email: user?.email, ...user?.user_metadata },
      joined: user?.created_at,
      ideas: loadIdeas(),
    }, null, 2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'startup-oracle-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleDelete = async () => {
    localStorage.removeItem('myIdeas')
    setConfirmOpen(false)
    onLogout?.()
  }

  return (
    <div>
      <SectionHeader title="Danger Zone" subtitle="Irreversible actions. Proceed with caution."/>

      <div style={{ ...cardStyle, border:'1px solid #FEE2E2' }}>
        <div style={{ ...rowStyle, borderBottom:'1px solid #FEF2F2' }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#111827' }}>Export my data</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'#9CA3AF' }}>Download a copy of your profile and idea history.</p>
          </div>
          <OutlineBtn onClick={handleExport}>Export</OutlineBtn>
        </div>
        <div style={{ ...rowStyle, borderBottom:'none' }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#DC2626' }}>Delete account</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'#9CA3AF' }}>Erase your idea history and sign out everywhere.</p>
          </div>
          <OutlineBtn danger onClick={() => setConfirmOpen(true)}>Delete Account</OutlineBtn>
        </div>
      </div>

      {confirmOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.18)', width:'100%', maxWidth:420, padding:24 }}>
            <p style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'#111827' }}>Delete your account?</p>
            <p style={{ margin:'0 0 16px', fontSize:13, color:'#6B7280', lineHeight:1.6 }}>
              This erases your idea history and signs you out. Type <strong style={{ color:'#111827' }}>{CONFIRM_PHRASE}</strong> to confirm.
            </p>
            <input value={text} onChange={e => setText(e.target.value)} placeholder={CONFIRM_PHRASE}
              style={{ ...inputStyle, marginBottom:14 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button disabled={text !== CONFIRM_PHRASE} onClick={handleDelete}
                style={{ flex:1, fontSize:13, fontWeight:600, background: text === CONFIRM_PHRASE ? '#DC2626' : '#FCA5A5', color:'#fff', border:'none', borderRadius:8, padding:10, cursor: text === CONFIRM_PHRASE ? 'pointer' : 'not-allowed', transition:'background .15s', fontFamily:F }}>
                Delete Account
              </button>
              <button onClick={() => { setConfirmOpen(false); setText('') }}
                style={{ flex:1, fontSize:13, fontWeight:500, background:'#fff', color:'#374151', border:'1px solid #E5E7EB', borderRadius:8, padding:10, cursor:'pointer', fontFamily:F }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Navigation (sidebar + mobile) ────────────────────────────────────────────

const NAV = [
  { id:'profile',     label:'Profile Info', danger:false,
    Icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="5" r="2.5"/><path d="M2 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"/></svg> },
  { id:'security',    label:'Security', danger:false,
    Icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1L2 3.5v4c0 3.04 2.46 5.5 5.5 6.5 3.04-1 5.5-3.46 5.5-6.5v-4L7.5 1z"/></svg> },
  { id:'ideas',       label:'My Ideas', danger:false,
    Icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1.5a3.5 3.5 0 011 6.85V10H6.5V8.35A3.5 3.5 0 017.5 1.5z"/><path d="M6 11.5h3M6.5 13h2"/></svg> },
  { id:'preferences', label:'Preferences', danger:false,
    Icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.1 3.1l1.4 1.4M10.5 10.5l1.4 1.4M3.1 11.9l1.4-1.4M10.5 4.5l1.4-1.4"/></svg> },
  { id:'danger',      label:'Danger Zone', danger:true,
    Icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1.5L1 13.5h13L7.5 1.5z"/><path d="M7.5 6v3.5M7.5 11.2v.3"/></svg> },
]

function NavBtn({ item, active, onClick, count }) {
  const [hov, setHov] = useState(false)
  const isActive = active === item.id
  const bg = isActive ? (item.danger ? '#FEF2F2' : '#111827') : hov ? (item.danger ? '#FEF2F2' : '#F3F4F6') : 'transparent'
  const color = isActive ? (item.danger ? '#DC2626' : '#fff') : item.danger ? '#DC2626' : '#4B5563'
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', background:bg, color, transition:'background .13s, color .13s', textAlign:'left', fontFamily:F }}>
      <span style={{ flexShrink:0, opacity: isActive ? 1 : 0.7 }}><item.Icon/></span>
      <span style={{ flex:1, fontSize:13, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
      {count > 0 && item.id === 'ideas' && (
        <span style={{ fontSize:11, fontWeight:600, padding:'1px 6px', borderRadius:99, background: isActive ? 'rgba(255,255,255,.15)' : '#E5E7EB', color: isActive ? '#fff' : '#6B7280' }}>{count}</span>
      )}
    </button>
  )
}

function Sidebar({ user, active, setActive, onLogout, ideaCount }) {
  const [hovLogout, setHovLogout] = useState(false)
  return (
    <aside style={{ width:232, flexShrink:0, background:'#fff', borderRight:'1px solid #F3F4F6', display:'flex', flexDirection:'column', alignSelf:'stretch' }}>
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid #F3F4F6' }}>
        <Avatar user={user} size="lg"/>
        <p style={{ margin:'12px 0 2px', fontSize:14, fontWeight:700, color:'#111827' }}>{displayName(user)}</p>
        <p style={{ margin:'0 0 10px', fontSize:12, color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
        {user?.user_metadata?.role && (
          <span style={{ display:'inline-block', fontSize:11, fontWeight:600, background:'#F3F4F6', color:'#4B5563', borderRadius:99, padding:'3px 10px' }}>{user.user_metadata.role}</span>
        )}
      </div>

      <nav style={{ flex:1, padding:'10px 12px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(item => (
          <NavBtn key={item.id} item={item} active={active} onClick={() => setActive(item.id)} count={ideaCount}/>
        ))}
      </nav>

      <div style={{ padding:'12px 12px 16px', borderTop:'1px solid #F3F4F6' }}>
        <button onClick={onLogout} onMouseEnter={() => setHovLogout(true)} onMouseLeave={() => setHovLogout(false)}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', background: hovLogout ? '#F3F4F6' : 'transparent', color:'#6B7280', transition:'background .13s', fontFamily:F }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 12.5H3a1 1 0 01-1-1v-8a1 1 0 011-1h2.5M9.5 10l3-2.5-3-2.5M12.5 7.5H5.5"/>
          </svg>
          <span style={{ fontSize:13, fontWeight:500 }}>Log Out</span>
        </button>
      </div>
    </aside>
  )
}

function MobileNav({ user, active, setActive, onLogout }) {
  return (
    <div style={{ background:'#fff', borderBottom:'1px solid #F3F4F6' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
        <Avatar user={user} size="sm"/>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName(user)}</p>
          <p style={{ margin:'1px 0 0', fontSize:11, color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
        </div>
        <button onClick={onLogout} style={{ fontSize:12, fontWeight:500, color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:7, padding:'5px 10px', background:'#fff', cursor:'pointer', fontFamily:F }}>
          Log Out
        </button>
      </div>
      <div style={{ display:'flex', overflowX:'auto', padding:'0 12px 10px', gap:4 }}>
        {NAV.map(({ id, label, danger }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => setActive(id)}
              style={{ flexShrink:0, fontSize:12, fontWeight: isActive ? 600 : 500, padding:'5px 12px', borderRadius:99, border:'none', cursor:'pointer', transition:'background .13s, color .13s', fontFamily:F,
                background: isActive ? (danger ? '#DC2626' : '#111827') : '#F3F4F6',
                color: isActive ? '#fff' : danger ? '#DC2626' : '#4B5563' }}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Page root ────────────────────────────────────────────────────────────────

export default function Account({ user, onHome, onLogout, onSubmitIdea }) {
  const [active, setActive] = useState('profile')
  // Local copy so profile/preference saves reflect immediately without a reload
  const [freshUser, setFreshUser] = useState(user)
  const u = freshUser || user
  const ideaCount = loadIdeas().length

  const sectionMap = {
    profile:     <ProfileSection user={u} onUserUpdated={setFreshUser}/>,
    security:    <SecuritySection user={u}/>,
    ideas:       <IdeasSection onSubmitIdea={onSubmitIdea}/>,
    preferences: <PreferencesSection user={u} onUserUpdated={setFreshUser}/>,
    danger:      <DangerSection user={u} onLogout={onLogout}/>,
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', fontFamily:F }}>
      <style>{`
        * { box-sizing:border-box }
        .acct-mobile  { display:block }
        .acct-desktop { display:none }
        @media (min-width: 768px) {
          .acct-mobile  { display:none }
          .acct-desktop { display:flex }
        }
        .acct-mobile ::-webkit-scrollbar { display:none }
      `}</style>

      {/* Site nav */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'#fff', borderBottom:'1px solid #F3F4F6', height:60, padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span onClick={onHome} style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.5px', color:'#111827', cursor:'pointer' }}>startup oracle</span>
        <span onClick={onHome} style={{ fontSize:14, color:'#9CA3AF', fontWeight:500, cursor:'pointer' }}>← Home</span>
      </div>

      {/* Mobile */}
      <div className="acct-mobile">
        <MobileNav user={u} active={active} setActive={setActive} onLogout={onLogout}/>
        <div style={{ padding:'20px 16px 60px', maxWidth:600, margin:'0 auto' }}>
          {sectionMap[active]}
        </div>
      </div>

      {/* Desktop */}
      <div className="acct-desktop" style={{ minHeight:'calc(100vh - 60px)' }}>
        <Sidebar user={u} active={active} setActive={setActive} onLogout={onLogout} ideaCount={ideaCount}/>
        <main style={{ flex:1, minWidth:0, padding:'36px 40px 80px', maxWidth:660 }}>
          {sectionMap[active]}
        </main>
      </div>
    </div>
  )
}
