import { useState } from "react";
import { supabase } from "./supabaseClient";

const F = "var(--font)";           // DM Sans — unified body/UI ramp
const FD = "var(--font-display)";  // Plus Jakarta Sans — headings/display
const C = {
  black:'#0a0a0a', white:'#ffffff', border:'#e0e0e0',
  surface:'#f5f5f5', muted:'#999999', body:'#555555',
  light:'#f0f0f0', error:'#c0392b',
};

const strength = pw => {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return s;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation:'spin 0.7s linear infinite' }}>
    <circle cx="8" cy="8" r="6" fill="none" stroke="#ccc" strokeWidth="2.5"/>
    <path d="M8 2a6 6 0 016 6" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const SocialBtn = ({ icon, label, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        border:`1.5px solid ${hov?'#aaa':C.border}`, borderRadius:4,
        background:hov?C.light:C.white, padding:'12px 16px',
        fontSize:14, fontWeight:600, color:C.black, cursor:'pointer',
        transition:'all 0.15s', fontFamily:F }}>
      {icon}<span>{label}</span>
    </button>
  );
};

const signInWithOAuth = async (provider, afterAuth) => {
  localStorage.setItem('afterAuth', afterAuth || 'oracle');
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  if (error) alert(error.message);
};

// Google blocks OAuth inside embedded webviews (WhatsApp/Instagram/Facebook
// in-app browsers, very common entry points in India) — so we detect them and
// surface email/password as the primary path instead of a dead-end. (AUTH-003)
const isInAppWebview = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|Snapchat|Pinterest|MicroMessenger|; ?wv\)/i.test(ua);
};

const WebviewBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false), 2000); }
    catch { /* clipboard unavailable */ }
  };
  return (
    <div style={{ border:`1.5px solid ${C.border}`, background:C.surface, borderRadius:6, padding:'14px 16px', marginBottom:28, fontSize:13, color:C.body, lineHeight:1.6 }}>
      <strong style={{ color:C.black }}>You're in an in-app browser.</strong> Google &amp; GitHub sign-in
      are blocked here — use <strong style={{ color:C.black }}>email &amp; password</strong> below, or open
      this page in your browser (tap the ⋯ menu → “Open in browser”).
      <button onClick={copy}
        style={{ display:'inline-block', marginTop:10, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:4, padding:'7px 12px', fontSize:12, fontWeight:700, color:C.black, cursor:'pointer', fontFamily:F }}>
        {copied ? 'Link copied ✓' : 'Copy link'}
      </button>
    </div>
  );
};

const Field = ({ label, type='text', value, onChange, placeholder, error, hint, right }) => {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const isPass = type === 'password';
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
        <label style={{ fontSize:13, fontWeight:700, color:C.black }}>{label}</label>
        {right}
      </div>
      <div style={{ position:'relative' }}>
        <input type={isPass&&show?'text':type} value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ display:'block', width:'100%', border:`1.5px solid ${error?C.error:focused?C.black:C.border}`,
            borderRadius:4, padding:isPass?'13px 44px 13px 16px':'13px 16px',
            fontSize:15, color:C.black, background:C.white, transition:'border-color 0.15s',
            fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
        {isPass && (
          <button onClick={()=>setShow(s=>!s)}
            style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:C.muted, fontFamily:F }}>
            {show?'Hide':'Show'}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize:12, color:C.error, marginTop:6, fontWeight:500 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>{hint}</div>}
    </div>
  );
};

const Divider = ({ label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:14, margin:'24px 0' }}>
    <div style={{ flex:1, height:1, background:C.border }}/>
    <span style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
    <div style={{ flex:1, height:1, background:C.border }}/>
  </div>
);

const StrengthBar = ({ password }) => {
  if (!password) return null;
  const s = strength(password);
  const labels = ['','Weak','Fair','Good','Strong'];
  const colors = ['','#c0392b','#e67e22','#2980b9','#27ae60'];
  return (
    <div style={{ marginTop:-10, marginBottom:20 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=s?colors[s]:C.border, transition:'background 0.2s' }}/>
        ))}
      </div>
      <span style={{ fontSize:12, color:colors[s], fontWeight:600 }}>{labels[s]}</span>
    </div>
  );
};

const SignIn = ({ onSwitch, onSuccess, afterAuth, onForgot, webview }) => {
  const [email,setEmail]   = useState('');
  const [pass,setPass]     = useState('');
  const [errors,setErrors] = useState({});
  const [loading,setLoading] = useState(false);
  const [shake,setShake]   = useState(false);

  const validate = () => {
    const e = {};
    if (!email.includes('@')) e.email = 'Enter a valid email address';
    if (pass.length < 6)      e.pass  = 'Password must be at least 6 characters';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setShake(true); setTimeout(()=>setShake(false),500); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) { setErrors({ pass: error.message }); setShake(true); setTimeout(()=>setShake(false),500); return; }
    onSuccess();
  };

  return (
    <div>
      <div style={{ marginBottom:36 }}>
        <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:8 }}>Welcome back</h1>
        <p style={{ fontSize:15, color:C.muted }}>Sign in to your Startup Oracle account</p>
      </div>
      {!webview && (<>
        <div style={{ display:'flex', gap:10, marginBottom:4 }}>
          <SocialBtn icon={<GoogleIcon/>} label="Google" onClick={()=>signInWithOAuth('google',afterAuth)}/>
          <SocialBtn icon={<GitHubIcon/>} label="GitHub" onClick={()=>signInWithOAuth('github',afterAuth)}/>
        </div>
        <Divider label="or continue with email"/>
      </>)}
      <div style={{ animation:shake?'shake 0.4s ease':'none' }}>
        <Field label="Email" type="email" value={email} onChange={v=>{setEmail(v);setErrors(e=>({...e,email:''}));}}
          placeholder="you@example.com" error={errors.email}/>
        <Field label="Password" type="password" value={pass} onChange={v=>{setPass(v);setErrors(e=>({...e,pass:''}));}}
          placeholder="Your password" error={errors.pass}
          right={<button type="button" onClick={onForgot} style={{ background:'none', border:'none', padding:0, fontSize:12, color:C.body, fontWeight:600, cursor:'pointer', fontFamily:F }}>Forgot password?</button>}/>
      </div>
      <button onClick={submit} disabled={loading}
        style={{ width:'100%', background:loading?C.light:C.black, color:loading?C.muted:C.white, border:'none', borderRadius:4, padding:'15px 24px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:F, marginTop:4 }}>
        {loading?<span style={{ display:'inline-flex', alignItems:'center', gap:10 }}><Spinner/>Signing in…</span>:'Sign In →'}
      </button>
      <p style={{ textAlign:'center', marginTop:28, fontSize:14, color:C.muted }}>
        Don't have an account?{' '}
        <span onClick={onSwitch} style={{ color:C.black, fontWeight:700, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>Create one free</span>
      </p>
    </div>
  );
};

const SignUp = ({ onSwitch, onSuccess, afterAuth, webview }) => {
  const [name,setName]     = useState('');
  const [email,setEmail]   = useState('');
  const [pass,setPass]     = useState('');
  const [role,setRole]     = useState('');
  const [agreed,setAgreed] = useState(false);
  const [errors,setErrors] = useState({});
  const [loading,setLoading] = useState(false);
  const [shake,setShake]   = useState(false);

  const ROLES = ['First-time founder','Serial entrepreneur','Student / Hackathon','Investor','Just curious'];

  const validate = () => {
    const e = {};
    if (!name.trim())         e.name  = 'Enter your name';
    if (!email.includes('@')) e.email = 'Enter a valid email address';
    if (strength(pass) < 2)   e.pass  = 'Choose a stronger password';
    if (!role)                e.role  = 'Select how you describe yourself';
    if (!agreed)              e.agree = 'Please accept the terms to continue';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setShake(true); setTimeout(()=>setShake(false),500); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, role } }
    });
    setLoading(false);
    if (error) { setErrors({ email: error.message }); setShake(true); setTimeout(()=>setShake(false),500); return; }
    // If email confirmation required, data.user exists but session is null
    if (data?.user && !data?.session) {
      setErrors({ email: 'Check your email to confirm your account, then sign in.' });
      return;
    }
    onSuccess(true);
  };

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:8 }}>Create your account</h1>
        <p style={{ fontSize:15, color:C.muted }}>Free forever — no credit card required</p>
      </div>
      {!webview && (<>
        <div style={{ display:'flex', gap:10, marginBottom:4 }}>
          <SocialBtn icon={<GoogleIcon/>} label="Google" onClick={()=>signInWithOAuth('google',afterAuth)}/>
          <SocialBtn icon={<GitHubIcon/>} label="GitHub" onClick={()=>signInWithOAuth('github',afterAuth)}/>
        </div>
        <Divider label="or sign up with email"/>
      </>)}
      <div style={{ animation:shake?'shake 0.4s ease':'none' }}>
        <Field label="Full name" value={name} onChange={v=>{setName(v);setErrors(e=>({...e,name:''}));}} placeholder="Jane Smith" error={errors.name}/>
        <Field label="Email" type="email" value={email} onChange={v=>{setEmail(v);setErrors(e=>({...e,email:''}));}} placeholder="you@example.com" error={errors.email}/>
        <Field label="Password" type="password" value={pass} onChange={v=>{setPass(v);setErrors(e=>({...e,pass:''}));}}
          placeholder="Choose a strong password" error={errors.pass} hint="Min. 8 chars, uppercase, number recommended"/>
        <StrengthBar password={pass}/>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.black, marginBottom:8 }}>I am a…</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {ROLES.map(r=>(
              <button key={r} onClick={()=>{setRole(r);setErrors(e=>({...e,role:''}));}}
                style={{ borderRadius:100, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F,
                  border:role===r?'none':`1.5px solid ${C.border}`,
                  background:role===r?C.black:C.white, color:role===r?C.white:C.body, transition:'all 0.15s' }}>{r}</button>
            ))}
          </div>
          {errors.role && <div style={{ fontSize:12, color:C.error, marginTop:6, fontWeight:500 }}>{errors.role}</div>}
        </div>
        <div onClick={()=>{setAgreed(a=>!a);setErrors(e=>({...e,agree:''}));}}
          style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', marginBottom:24, userSelect:'none' }}>
          <div style={{ width:18, height:18, flexShrink:0, marginTop:2, border:`2px solid ${errors.agree?C.error:agreed?C.black:C.border}`, borderRadius:3, background:agreed?C.black:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
            {agreed && <span style={{ color:C.white, fontSize:10, fontWeight:900 }}>✓</span>}
          </div>
          <p style={{ fontSize:13, color:C.body, lineHeight:1.55 }}>
            I agree to the <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ color:C.black, fontWeight:600, textDecoration:'underline', textUnderlineOffset:2 }}>Terms of Service</a> and <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ color:C.black, fontWeight:600, textDecoration:'underline', textUnderlineOffset:2 }}>Privacy Policy</a>
          </p>
        </div>
        {errors.agree && <div style={{ fontSize:12, color:C.error, marginTop:-16, marginBottom:16, fontWeight:500 }}>{errors.agree}</div>}
      </div>
      <button onClick={submit} disabled={loading}
        style={{ width:'100%', background:loading?C.light:C.black, color:loading?C.muted:C.white, border:'none', borderRadius:4, padding:'15px 24px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:F }}>
        {loading?<span style={{ display:'inline-flex', alignItems:'center', gap:10 }}><Spinner/>Creating account…</span>:'Create Account →'}
      </button>
      <p style={{ textAlign:'center', marginTop:28, fontSize:14, color:C.muted }}>
        Already have an account?{' '}
        <span onClick={onSwitch} style={{ color:C.black, fontWeight:700, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>Sign in</span>
      </p>
    </div>
  );
};

const Success = ({ isNew, onSubmitIdea, onCommunity, afterAuth }) => (
  <div style={{ textAlign:'center', padding:'24px 0' }}>
    <div style={{ width:64, height:64, borderRadius:'50%', background:C.black, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:26 }}>
      <span style={{ color:C.white, fontWeight:900 }}>✓</span>
    </div>
    <h2 style={{ fontFamily:FD, fontSize:26, fontWeight:800, color:C.black, letterSpacing:'-0.8px', marginBottom:10 }}>
      {isNew?'Account created!':'Welcome back!'}
    </h2>
    <p style={{ fontSize:15, color:C.muted, lineHeight:1.65, marginBottom:36 }}>
      Redirecting you now…
    </p>
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {afterAuth === 'community'
        ? <button onClick={onCommunity}
            style={{ display:'block', width:'100%', background:C.black, color:C.white, borderRadius:4, padding:'14px 24px', fontSize:15, fontWeight:700, border:'none', cursor:'pointer', fontFamily:F }}>
            Browse Community Ideas →
          </button>
        : <button onClick={onSubmitIdea}
            style={{ display:'block', width:'100%', background:C.black, color:C.white, borderRadius:4, padding:'14px 24px', fontSize:15, fontWeight:700, border:'none', cursor:'pointer', fontFamily:F }}>
            Validate My Idea →
          </button>
      }
    </div>
  </div>
);

// Request a reset link (AUTH-002). Supabase emails a recovery link back to the
// site origin; App.jsx detects `type=recovery` in the hash and shows ResetPassword.
const ForgotPassword = ({ onBack }) => {
  const [email,setEmail]     = useState('');
  const [error,setError]     = useState('');
  const [loading,setLoading] = useState(false);
  const [sent,setSent]       = useState(false);

  const submit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  if (sent) return (
    <div style={{ textAlign:'center', padding:'12px 0' }}>
      <div style={{ width:60, height:60, borderRadius:'50%', background:C.surface, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:26 }}>📧</div>
      <h1 style={{ fontFamily:FD, fontSize:26, fontWeight:800, color:C.black, letterSpacing:'-0.8px', marginBottom:10 }}>Check your email</h1>
      <p style={{ fontSize:15, color:C.muted, lineHeight:1.65, marginBottom:32 }}>
        If an account exists for <strong style={{ color:C.body }}>{email}</strong>, we've sent a link to reset your password. The link expires in 1 hour.
      </p>
      <button onClick={onBack}
        style={{ width:'100%', background:C.black, color:C.white, border:'none', borderRadius:4, padding:'14px 24px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F }}>
        Back to sign in
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:8 }}>Reset password</h1>
        <p style={{ fontSize:15, color:C.muted }}>Enter your email and we'll send you a reset link</p>
      </div>
      <Field label="Email" type="email" value={email} onChange={v=>{setEmail(v);setError('');}}
        placeholder="you@example.com" error={error}/>
      <button onClick={submit} disabled={loading}
        style={{ width:'100%', background:loading?C.light:C.black, color:loading?C.muted:C.white, border:'none', borderRadius:4, padding:'15px 24px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:F, marginTop:4 }}>
        {loading?<span style={{ display:'inline-flex', alignItems:'center', gap:10 }}><Spinner/>Sending…</span>:'Send reset link →'}
      </button>
      <p style={{ textAlign:'center', marginTop:28, fontSize:14, color:C.muted }}>
        Remembered it?{' '}
        <span onClick={onBack} style={{ color:C.black, fontWeight:700, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>Back to sign in</span>
      </p>
    </div>
  );
};

// Landing screen after clicking the recovery link — set a new password (AUTH-002).
const ResetPassword = ({ onDone }) => {
  const [pass,setPass]       = useState('');
  const [confirm,setConfirm] = useState('');
  const [errors,setErrors]   = useState({});
  const [loading,setLoading] = useState(false);
  const [done,setDone]       = useState(false);

  const submit = async () => {
    const e = {};
    if (strength(pass) < 2) e.pass = 'Choose a stronger password';
    if (pass !== confirm)   e.confirm = 'Passwords do not match';
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) { setErrors({ pass: error.message }); return; }
    setDone(true);
    setTimeout(onDone, 1400);
  };

  if (done) return (
    <div style={{ textAlign:'center', padding:'24px 0' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:C.black, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
        <span style={{ color:C.white, fontSize:26, fontWeight:900 }}>✓</span>
      </div>
      <h2 style={{ fontFamily:FD, fontSize:26, fontWeight:800, color:C.black, letterSpacing:'-0.8px', marginBottom:10 }}>Password updated</h2>
      <p style={{ fontSize:15, color:C.muted }}>You're signed in. Redirecting…</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:800, color:C.black, letterSpacing:'-1px', marginBottom:8 }}>Set a new password</h1>
        <p style={{ fontSize:15, color:C.muted }}>Choose a strong password for your account</p>
      </div>
      <Field label="New password" type="password" value={pass} onChange={v=>{setPass(v);setErrors(e=>({...e,pass:''}));}}
        placeholder="Choose a strong password" error={errors.pass} hint="Min. 8 chars, uppercase, number recommended"/>
      <StrengthBar password={pass}/>
      <Field label="Confirm password" type="password" value={confirm} onChange={v=>{setConfirm(v);setErrors(e=>({...e,confirm:''}));}}
        placeholder="Re-enter your password" error={errors.confirm}/>
      <button onClick={submit} disabled={loading}
        style={{ width:'100%', background:loading?C.light:C.black, color:loading?C.muted:C.white, border:'none', borderRadius:4, padding:'15px 24px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:F, marginTop:4 }}>
        {loading?<span style={{ display:'inline-flex', alignItems:'center', gap:10 }}><Spinner/>Updating…</span>:'Update password →'}
      </button>
    </div>
  );
};

export default function Auth({ onHome, onSubmitIdea, onCommunity, afterAuth, recovery, onRecoveryDone }) {
  const [mode, setMode]       = useState('signin');
  const [success, setSuccess] = useState(false);
  const [isNew, setIsNew]     = useState(false);
  const webview = isInAppWebview();

  const handleSuccess = (newUser=false) => {
    setIsNew(newUser);
    setSuccess(true);
    // Auto-redirect after 1.2s to the destination they came from
    setTimeout(() => {
      if (afterAuth === 'community') onCommunity();
      else if (afterAuth === 'oracle') onHome();
      else onSubmitIdea();
    }, 1200);
  };

  return (
    <div style={{ minHeight:'100vh', background:C.white, fontFamily:F }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        *{box-sizing:border-box}
      `}</style>

      {/* Navbar */}
      <div style={{ borderBottom:`1px solid ${C.border}`, height:68, padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span onClick={onHome} style={{ fontFamily:FD, fontWeight:800, fontSize:20, letterSpacing:'-0.5px', color:C.black, cursor:'pointer' }}>startup oracle</span>
        <span onClick={onHome} style={{ fontSize:14, color:C.muted, fontWeight:500, cursor:'pointer' }}>← Home</span>
      </div>

      <div style={{ display:'flex', minHeight:'calc(100vh - 68px)' }}>
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'64px 48px', overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:420 }}>
            {webview && !success && !recovery && <WebviewBanner/>}
            {!success && !recovery && mode!=='forgot' && (
              <div style={{ display:'flex', background:C.surface, borderRadius:6, padding:4, marginBottom:44, gap:4 }}>
                {[['signin','Sign In'],['signup','Sign Up']].map(([id,label])=>(
                  <button key={id} onClick={()=>{setMode(id);setSuccess(false);}}
                    style={{ flex:1, padding:'10px 16px', borderRadius:4, border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F, transition:'all 0.15s',
                      background:mode===id?C.black:'transparent', color:mode===id?C.white:C.muted }}>{label}</button>
                ))}
              </div>
            )}
            {recovery
              ? <ResetPassword onDone={onRecoveryDone}/>
              : success
                ? <Success isNew={isNew} onSubmitIdea={onSubmitIdea} onCommunity={onCommunity} afterAuth={afterAuth}/>
                : mode==='forgot'
                  ? <ForgotPassword onBack={()=>setMode('signin')}/>
                  : mode==='signin'
                    ? <SignIn  onSwitch={()=>setMode('signup')} onForgot={()=>setMode('forgot')} onSuccess={handleSuccess} afterAuth={afterAuth} webview={webview}/>
                    : <SignUp  onSwitch={()=>setMode('signin')} onSuccess={handleSuccess} afterAuth={afterAuth} webview={webview}/>
            }
            <div style={{ marginTop:40, paddingTop:20, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'center', gap:20, fontSize:12, color:C.muted }}>
              <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color:C.muted, textDecoration:'none', fontWeight:600 }}>Terms</a>
              <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color:C.muted, textDecoration:'none', fontWeight:600 }}>Privacy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
