import { useState, useEffect } from 'react'
import StartupOracle from './StartupOracle'
import OracleDashboard from './OracleDashboard'
import SubmitIdea from './SubmitIdea'
import Community from './Community'
import Auth from './Auth'
import { supabase } from './supabase'

export default function App() {
  const [view, setView]           = useState('oracle')
  const [afterAuth, setAfterAuth] = useState('submit')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const dest = localStorage.getItem('afterAuth') || 'submit'
        localStorage.removeItem('afterAuth')
        setView(dest)
      }
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
