import { useState, useEffect } from 'react'
import StartupOracle from './StartupOracle'
import OracleDashboard from './OracleDashboard'
import SubmitIdea from './SubmitIdea'
import Community from './Community'
import Auth from './Auth'
import { supabase } from './supabaseClient'

export default function App() {
  const [view, setView]           = useState('oracle')
  const [afterAuth, setAfterAuth] = useState('submit')
  const [user, setUser]           = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const navTo = () => {
      const dest = localStorage.getItem('afterAuth') || 'submit'
      localStorage.removeItem('afterAuth')
      window.history.replaceState(null, '', window.location.pathname)
      setView(dest)
    }
    const hash = window.location.hash
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

  // Never show the auth screen to someone who is already logged in
  useEffect(() => {
    if (view === 'auth' && user) setView(afterAuth || 'submit')
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
    try { await supabase.auth.signOut() } catch (e) { console.error('signOut failed', e) }
    setUser(null); setView('oracle')
  }

  // Wait for the stored session before rendering, so the header never
  // flashes "Sign in" for a logged-in user
  if (!authReady) return null

  if (view === 'submit')    return <SubmitIdea onHome={() => setView('oracle')} user={user} onLogout={handleLogout} />
  if (view === 'community') return <Community onSubmitIdea={() => goAuth('submit')} onHome={() => setView('oracle')} user={user} onLogout={handleLogout} onSignIn={goSignIn} />
  if (view === 'auth')      return (
    <Auth
      onHome={() => setView('oracle')}
      onSubmitIdea={() => setView('submit')}
      onCommunity={() => setView('community')}
      afterAuth={afterAuth}
    />
  )

  return (
    <>
      {view === 'oracle'
        ? <StartupOracle
            onSubmitIdea={() => goAuth('submit')}
            onCommunity={() => goAuth('community')}
            user={user}
            onLogout={handleLogout}
            onSignIn={goSignIn}
          />
        : <OracleDashboard />}
    </>
  )
}
