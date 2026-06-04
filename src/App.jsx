import { useState } from 'react'
import StartupOracle from './StartupOracle'
import OracleDashboard from './OracleDashboard'
import SubmitIdea from './SubmitIdea'
import Community from './Community'
import Auth from './Auth'

export default function App() {
  const [view, setView]           = useState('oracle')
  const [afterAuth, setAfterAuth] = useState('submit')

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
