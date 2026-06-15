import { useState, useEffect, useRef } from 'react'
import Home from './Home'
import SubmitIdea from './SubmitIdea'
import Community from './Community'
import Auth from './Auth'
import Account from './Account'
import MasterReport from './MasterReport'
import Pricing from './Pricing'
import { supabase } from './supabaseClient'

const PERSISTED_VIEWS = ['oracle', 'submit', 'community', 'account', 'pricing']

export default function App() {
  // Survive page reloads on the same view (e.g. stay in Community on refresh)
  const [view, setView]           = useState(() => {
    try {
      if (/^#\/idea\/([\w-]+)/.test(window.location.hash)) return 'community'
      const v = sessionStorage.getItem('so_view'); return PERSISTED_VIEWS.includes(v) ? v : 'oracle'
    } catch { return 'oracle' }
  })
  const [afterAuth, setAfterAuth] = useState('oracle')
  const [user, setUser]           = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [activeIdea, setActiveIdea] = useState(null)
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
    if (/^#\/idea\/([\w-]+)/.test(hash)) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (hash.includes('access_token')) {
      const p = new URLSearchParams(hash.slice(1))
      const access_token = p.get('access_token')
      const refresh_token = p.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
          if (error || !data?.session) { console.error('setSession failed', error); window.history.replaceState(null, '', window.location.pathname); return }
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

  // Never show the auth screen to someone who is already logged in
  useEffect(() => {
    if (view !== 'auth' || !user) return
    const t = setTimeout(() => setView(afterAuth || 'submit'), 0)
    return () => clearTimeout(t)
  }, [view, user, afterAuth])

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

  // Wait for the stored session before rendering, so the header never
  // flashes "Sign in" for a logged-in user
  if (!authReady) return null

  if (view === 'report' && activeIdea) return (
    <MasterReport
      data={activeIdea.sections}
      meta={activeIdea.meta}
      ideaName={activeIdea.title}
      onBack={() => { setView('account'); setActiveIdea(null); }}
    />
  )
  if (view === 'account')   return user
    ? <Account
        user={user}
        onHome={() => setView('oracle')}
        onLogout={handleLogout}
        onSubmitIdea={() => setView('submit')}
        onViewReport={idea => { setActiveIdea(idea); setView('report'); }}
      />
    : null
  if (view === 'pricing')   return <Pricing user={user} onHome={() => setView('oracle')} onSignIn={goSignIn} />
  if (view === 'submit')    return <SubmitIdea onHome={() => setView('oracle')} user={user} onLogout={handleLogout} onAccount={goAccount} onPricing={() => setView('pricing')} />
  if (view === 'community') return <Community onSubmitIdea={() => goAuth('submit')} onHome={() => setView('oracle')} user={user} onLogout={handleLogout} onSignIn={goSignIn} onAccount={goAccount} focusPostId={deepPost} onConsumeFocus={() => setDeepPost(null)} />
  if (view === 'auth')      return (
    <Auth
      onHome={() => setView('oracle')}
      onSubmitIdea={() => setView('submit')}
      onCommunity={() => setView('community')}
      afterAuth={afterAuth}
    />
  )

  return (
    <Home
      user={user}
      onCommunity={() => goAuth('community')}
      onAnalyse={() => goAuth('submit')}
      onSignIn={goSignIn}
      onAccount={goAccount}
      onPricing={() => setView('pricing')}
    />
  )
}
