'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
   const { error } = await supabase.auth.signInWithPassword({ email, password })
if (!error) window.location.href = '/dashboard'
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f' }}>
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>Walter & Co</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', fontSize: '1rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', fontSize: '1rem' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ padding: '0.75rem', borderRadius: '8px', background: '#e94560', color: 'white', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </main>
  )
}