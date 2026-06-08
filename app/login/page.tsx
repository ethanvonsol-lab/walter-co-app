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
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#f7f7f5' }}>

      {/* Left panel */}
      <div style={{ width: '50%', background: '#0f0f0f', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4rem', position: 'relative', overflow: 'hidden' }}>
        <div>
          <img src="/logo.png" alt="Walter & Co" style={{ width: '160px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
        </div>
        <div>
          <p style={{ color: '#333', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>What we do</p>
          <h2 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: '300', lineHeight: '1.3', letterSpacing: '0.02em', marginBottom: '2rem' }}>
            AI-powered Instagram replies that sound exactly like you.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              'Replies to DMs automatically',
              'Trained on your voice and personality',
              'Captures leads while you sleep',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#444', flexShrink: 0 }} />
                <p style={{ color: '#555', fontSize: '0.85rem', letterSpacing: '0.03em' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#222', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
      </div>

      {/* Right panel */}
      <div style={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1rem' }}>Client Portal</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>Welcome back.</h1>
          <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '3rem' }}>Sign in to your dashboard.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.875rem', color: '#111', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Password</p>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.875rem', color: '#111', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {error && (
              <p style={{ color: '#cc4444', fontSize: '0.78rem', letterSpacing: '0.02em' }}>{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ padding: '1rem', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.5rem', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ebebeb' }}>
            <p style={{ color: '#ccc', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Not a client yet? <a href="mailto:ethanvonl@icloud.com" style={{ color: '#888', textDecoration: 'underline' }}>Get in touch →</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}