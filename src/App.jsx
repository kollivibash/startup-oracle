import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Home from './Home'
import Gateway from './Gateway'
import ErrorBoundary from './ErrorBoundary'
import WelcomeSlides from './WelcomeSlides'
import { supabase } from './supabaseClient'

// Code-split the heavy views so the landing page ships a small initial bundle —
// each chunk loads on demand when its view is first opened. Home stays eager
// (it's the default screen, so lazy-loading it would just add a loading flash).
const SubmitIdea   = lazy(() => import('./SubmitIdea'))
const Community    = lazy(() => import('./Community'))
const Auth         = lazy(() => import('./Auth'))
const Account      = lazy(() => import('./Account'))
const MasterReport = lazy(() => import('./MasterReport'))
const Pricing      = lazy(() => import('./Pricing'))
const Legal        = lazy(() => import('./Legal'))
const Invest       = lazy(() => import('./Invest'))
const InvestorOnboarding = lazy(() => import('./InvestorOnboarding'))

const PERSISTED_VIEWS = ['oracle', 'submit', 'community', 'account', 'pricing', 'terms', 'privacy', 'gateway', 'invest']

// Minimal full-screen fallback while a lazy view's chunk downloads.
function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(0,0,0,.12)', borderTopColor: 'rgba(0,0,0,.7)', borderRadius: '50%', animation: 'soSpin .7s linear infinite' }} />
      <style>{`@keyframes soSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  // Survive page reloads on the same view (e.g. stay in Community on refresh)
  const [view, setView]           = useState(() => {
    try {
      if (/^#\/idea\/([\w-]+)/.test(window.location.hash)) return 'community'
      const lm = window.location.hash.match(/^#\/legal\/(terms|privacy)/)
      if (lm) return lm[1]
      const v = sessionStorage.getItem('so_view'); return PERSISTED_VIEWS.includes(v) ? v : 'oracle'
    } catch { return 'oracle' }
  })
  const [afterAuth, setAfterAuth] = useState('oracle')
  const [user, setUser]           = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [recovery, setRecovery]   = useState(false)  // password-reset landing (AUTH-002)
  const [online, setOnline]       = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  // First-run welcome slides — shown once on first visit (not during an OAuth/recovery/deep-link
  // boot), once after signup (so_welcome_pending), and replayable via "How it works".
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      if (localStorage.getItem('so_welcome_seen')) return false
      const h = window.location.hash
      if (h.includes('access_token') || /^#\/(idea|legal)\//.test(h)) return false
      return true
    } catch { return false }
  })
  const dismissWelcome = () => { try { localStorage.setItem('so_welcome_seen', '1') } catch { /* private mode */ } setShowWelcome(false) }
  const [activeIdea, setActiveIdea] = useState(null)
  // Founder/Investor role (account_type). Seeded from localStorage for an instant gateway
  // highlight; refreshed from the profile once the user is known.
  const [acctType, setAcctType] = useState(() => { try { return localStorage.getItem('so_account_type') } catch { return null } })
  // Investor onboarding gate: null = unknown (still checking), false = must onboard, true = done.
  const [investorOnboarded, setInvestorOnboarded] = useState(null)
  const [deepPost, setDeepPost] = useState(() => {
    try { const m = window.location.hash.match(/^#\/idea\/([\w-]+)/); return m ? m[1] : null } catch { return null }
  })
  const histInit = useRef(false)

  useEffect(() => {
    try { if (PERSISTED_VIEWS.includes(view)) sessionStorage.setItem('so_view', view) } catch { /* private mode */ }
  }, [view])

  // A persisted 'account' view is invalid once the user is signed out
  useEffect(() => {
    if (!authReady || view !== 'account' || user) return
    const t = setTimeout(() => setView('oracle'), 0)
    return () => clearTimeout(t)
  }, [authReady, view, user])

  useEffect(() => {
    const navTo = () => {
      const dest = localStorage.getItem('afterAuth') || 'oracle'
      localStorage.removeItem('afterAuth')
      window.history.replaceState(null, '', window.location.pathname)
      setView(dest)
    }
    const hash = window.location.hash
    if (/^#\/idea\/([\w-]+)/.test(hash) || /^#\/legal\/(terms|privacy)/.test(hash)) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (hash.includes('access_token')) {
      const p = new URLSearchParams(hash.slice(1))
      const access_token = p.get('access_token')
      const refresh_token = p.get('refresh_token')
      const isRecovery = p.get('type') === 'recovery'
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
          if (error || !data?.session) { console.error('setSession failed', error); window.history.replaceState(null, '', window.location.pathname); return }
          // A recovery link authenticates the user but must land on the
          // "set a new password" screen instead of the normal destination.
          if (isRecovery) { window.history.replaceState(null, '', window.location.pathname); setRecovery(true); setView('auth'); return }
          navTo()
        })
      }
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && localStorage.getItem('afterAuth')) navTo()
      })
    }

    // Track auth state globally — persists across reloads until logout
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Browser back/forward: reflect the in-app view in history so the back button
  // returns to the previous view (e.g. Community → back → Home).
  useEffect(() => {
    if (!histInit.current) {
      histInit.current = true
      window.history.replaceState({ soView: view }, '')
      return
    }
    if (window.history.state?.soView !== view) {
      window.history.pushState({ soView: view }, '')
    }
  }, [view])

  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.soView
      setView(PERSISTED_VIEWS.includes(v) ? v : 'oracle')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Show the welcome slides once right after a new user signs up.
  useEffect(() => {
    if (!user) return undefined
    let t
    try {
      if (localStorage.getItem('so_welcome_pending')) {
        localStorage.removeItem('so_welcome_pending')
        t = setTimeout(() => setShowWelcome(true), 0) // defer out of the effect body
      }
    } catch { /* private mode */ }
    return () => clearTimeout(t)
  }, [user])

  // Sync the Founder/Investor role with the profile once the user is known: persist a role
  // chosen while logged out, otherwise refresh state from what's stored on the profile.
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    import('./communityDB').then(({ getAccountType, setAccountType }) => {
      if (cancelled) return
      let pending = null
      try { pending = localStorage.getItem('so_account_type_pending') ? localStorage.getItem('so_account_type') : null } catch { /* private mode */ }
      if (pending) {
        setAccountType(user.id, pending).catch(() => {})
        try { localStorage.removeItem('so_account_type_pending') } catch { /* private mode */ }
        setAcctType(pending)
      } else {
        getAccountType(user.id).then(t => {
          if (cancelled || !t) return
          setAcctType(t)
          try { localStorage.setItem('so_account_type', t) } catch { /* private mode */ }
        }).catch(() => {})
      }
    })
    return () => { cancelled = true }
  }, [user])

  // Resolve the investor-onboarding gate once the user is known. A locally-remembered completion
  // wins immediately (so it works before supabase_investor_profile.sql is run); otherwise check
  // the profile blob's `completed` flag.
  useEffect(() => {
    if (!user) { const t = setTimeout(() => setInvestorOnboarded(null), 0); return () => clearTimeout(t) }
    let cancelled = false
    let local = false
    try { local = localStorage.getItem('so_investor_onboarded') === '1' } catch { /* private mode */ }
    if (local) { const t = setTimeout(() => setInvestorOnboarded(true), 0); return () => clearTimeout(t) }
    import('./communityDB').then(({ getInvestorProfile }) => {
      if (cancelled) return
      getInvestorProfile(user.id)
        .then(p => { if (!cancelled) setInvestorOnboarded(!!(p && p.completed)) })
        .catch(() => { if (!cancelled) setInvestorOnboarded(false) })
    })
    return () => { cancelled = true }
  }, [user])

  // Offline awareness (CROSS-003) — a banner instead of silent failures on flaky networks.
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  // Never show the auth screen to someone who is already logged in —
  // except during password recovery, which intentionally has a session.
  useEffect(() => {
    if (view !== 'auth' || !user || recovery) return
    const t = setTimeout(() => setView(afterAuth || 'submit'), 0)
    return () => clearTimeout(t)
  }, [view, user, afterAuth, recovery])

  // Check the session directly so navigation never relies on stale state
  const goAuth = async (dest) => {
    const { data } = await supabase.auth.getSession()
    if (data.session) { setUser(data.session.user); setView(dest); return }
    setAfterAuth(dest); setView('auth')
  }
  const goSignIn = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) { setUser(data.session.user); setView('oracle'); return }
    setAfterAuth('oracle'); setView('auth')
  }
  const handleLogout = async () => {
    // Hard logout: revoke the session on the server (all devices) and clear
    // any locally cached app state, not just the in-memory session.
    try { await supabase.auth.signOut({ scope: 'global' }) } catch (e) { console.error('signOut failed', e) }
    try {
      localStorage.removeItem('myIdeas')
      localStorage.removeItem('afterAuth')
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
    } catch (e) { console.error('clear storage failed', e) }
    setUser(null); setView('oracle')
  }
  const goAccount = () => { if (user) setView('account'); else { setAfterAuth('account'); setView('auth') } }

  // Founder/Investor gateway: remember the choice, persist it to the profile (or queue it for
  // after login), then route to that side. Doubles as the role switcher.
  const chooseRole = (type) => {
    try { localStorage.setItem('so_account_type', type) } catch { /* private mode */ }
    setAcctType(type)
    if (user) {
      import('./communityDB').then(({ setAccountType }) => setAccountType(user.id, type).catch(() => {}))
    } else {
      try { localStorage.setItem('so_account_type_pending', '1') } catch { /* private mode */ }
    }
    goAuth(type === 'investor' ? 'invest' : 'community')
  }
  // Investor opens a pitch → jump into the community feed focused on that post (where the DM
  // button lives), reusing the existing deep-link focus mechanism.
  const openPitchInCommunity = (id) => { setDeepPost(id); setView('community') }
  // Investor finished (or is leaving) onboarding.
  const finishInvestorOnboarding = () => {
    try { localStorage.setItem('so_investor_onboarded', '1') } catch { /* private mode */ }
    setInvestorOnboarded(true)
    setView('invest')
  }

  // Wait for the stored session before rendering, so the header never
  // flashes "Sign in" for a logged-in user. Show the spinner (not a blank
  // screen) so a slow getSession() round-trip doesn't look like a broken site. (AUTH-006)
  if (!authReady) return <Loading />

  let screen
  if (view === 'report' && activeIdea) {
    screen = (
      <MasterReport
        data={activeIdea.sections}
        meta={activeIdea.meta}
        ideaName={activeIdea.title}
        onBack={() => { setView('account'); setActiveIdea(null); }}
      />
    )
  } else if (view === 'account') {
    screen = user
      ? <Account
          user={user}
          onHome={() => setView('oracle')}
          onLogout={handleLogout}
          onSubmitIdea={() => setView('submit')}
          onViewReport={idea => { setActiveIdea(idea); setView('report'); }}
        />
      : null
  } else if (view === 'pricing') {
    screen = <Pricing user={user} onHome={() => setView('oracle')} onSignIn={() => goAuth('pricing')} />
  } else if (view === 'submit') {
    screen = <SubmitIdea onHome={() => setView('oracle')} user={user} onLogout={handleLogout} onAccount={goAccount} onPricing={() => setView('pricing')} onSignIn={() => goAuth('submit')} />
  } else if (view === 'community') {
    screen = <Community onSubmitIdea={() => goAuth('submit')} onHome={() => setView('oracle')} user={user} onLogout={handleLogout} onSignIn={goSignIn} onAccount={goAccount} focusPostId={deepPost} onConsumeFocus={() => setDeepPost(null)} />
  } else if (view === 'gateway') {
    screen = (
      <Gateway
        current={acctType}
        onFounder={() => chooseRole('founder')}
        onInvestor={() => chooseRole('investor')}
        onHome={() => setView('oracle')}
      />
    )
  } else if (view === 'invest') {
    // Required, no-skip investor onboarding gate: a signed-in investor must finish onboarding
    // before the deal-flow dashboard renders. Anonymous visitors can still browse.
    if (user && investorOnboarded === null) {
      screen = <Loading />
    } else if (user && investorOnboarded === false) {
      screen = (
        <InvestorOnboarding
          user={user}
          onComplete={finishInvestorOnboarding}
          onExit={() => setView('gateway')}
        />
      )
    } else {
      screen = (
        <Invest
          user={user}
          onHome={() => setView('oracle')}
          onAccount={goAccount}
          onSignIn={goSignIn}
          onOpenPitch={openPitchInCommunity}
          onSwitchToFounder={() => chooseRole('founder')}
        />
      )
    }
  } else if (view === 'auth') {
    screen = (
      <Auth
        onHome={() => setView('oracle')}
        onSubmitIdea={() => setView('submit')}
        onCommunity={() => setView('community')}
        onInvest={() => setView('invest')}
        afterAuth={afterAuth}
        onPricing={() => setView('pricing')}
        recovery={recovery}
        onRecoveryDone={() => { setRecovery(false); setView('oracle') }}
      />
    )
  } else if (view === 'terms' || view === 'privacy') {
    screen = (
      <Legal
        doc={view}
        onHome={() => setView('oracle')}
        onDoc={(d) => setView(d)}
      />
    )
  } else {
    screen = (
      <Home
        user={user}
        onGateway={() => setView('gateway')}
        onCommunity={() => goAuth('community')}
        onAnalyse={() => goAuth('submit')}
        onSignIn={goSignIn}
        onAccount={goAccount}
        onPricing={() => setView('pricing')}
        onHowItWorks={() => setShowWelcome(true)}
      />
    )
  }

  return (
    <>
      {showWelcome && <WelcomeSlides onClose={dismissWelcome} onStart={() => { dismissWelcome(); goAuth('submit') }} />}
      {!online && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000, background: '#1f2937', color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '8px 16px', fontFamily: 'var(--font)' }}>
          You're offline — some actions may not work until you reconnect.
        </div>
      )}
      <ErrorBoundary resetKey={view} onReset={() => setView('oracle')}>
        <Suspense fallback={<Loading />}>{screen}</Suspense>
      </ErrorBoundary>
    </>
  )
}
