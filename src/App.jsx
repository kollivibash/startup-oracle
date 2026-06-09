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
        return
      }
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && localStorage.getItem('afterAuth')) navTo()
    })
  }, [])

  const goAuth = (dest) => { setAfterAuth(dest); setView('auth'); }

  if (view === 'submit')    return <SubmitIdea onHome={() => setView('oracle')} />
  if (view === 'community') return <Community onSubmitIdea={() => setView('submit')} onHome={() => setView('oracle')} />
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
          />
        : <OracleDashboard />}
    </>
  )
}
