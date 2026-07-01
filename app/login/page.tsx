'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius } from '@/lib/theme'

const REMEMBER_KEY = 'walter_remembered_email'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  // Prefill the email we saved last time "Remember me" was on, so returning
  // clients don't retype it. The password itself is never stored by us — the
  // browser's own password manager handles that (see the autoComplete fields).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    } catch { /* localStorage unavailable — no prefill */ }
  }, [])

  const handleReset = async () => {
    setError(''); setResetMsg('')
    if (!email) return setError('Enter your email above first.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    if (error) setError(error.message)
    else setResetMsg('Check your email for a reset link.')
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Remember the email for next time (or clear it if they unticked the box).
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, email)
        else localStorage.removeItem(REMEMBER_KEY)
      } catch { /* ignore storage failures */ }
      window.location.replace('/dashboard')
    }
  }

  const fieldLabel: React.CSSProperties = { color: c.faint, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.45rem' }
  const fieldInput: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: radius.md, border: `1px solid ${c.border}`, fontSize: '0.9rem', color: c.ink, background: c.surface, boxSizing: 'border-box', outline: 'none', fontFamily: font, transition: 'border-color 0.15s, box-shadow 0.15s' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font }}>

      {/* Left panel */}
      <div style={{ width: '50%', background: c.ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3.5rem', position: 'relative', overflow: 'hidden' }}>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#fff' }}>Walter &amp; Co</p>
          <p style={{ fontSize: '0.68rem', color: '#52525b', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '0.25rem' }}>AI Marketing</p>
        </div>
        <div>
          <p style={{ color: '#52525b', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>What we do</p>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: '2.25rem' }}>
            AI-powered Instagram replies that sound exactly like you.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              'Replies to every DM automatically',
              'Trained on your voice and personality',
              'Captures leads while you sleep',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#52525b', flexShrink: 0 }} />
                <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#3f3f46', fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>© 2026 Walter &amp; Co</p>
      </div>

      {/* Right panel */}
      <div style={{ width: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        <div style={{ width: '100%', maxWidth: '370px' }}>
          <p style={{ color: c.faint, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>Client Portal</p>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.025em', color: c.ink, marginBottom: '0.35rem' }}>Welcome back</h1>
          <p style={{ color: c.muted, fontSize: '0.875rem', marginBottom: '2.5rem' }}>Sign in to your dashboard.</p>

          <form onSubmit={e => { e.preventDefault(); handleLogin() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={fieldLabel}>Email</p>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={fieldInput}
              />
            </div>
            <div>
              <p style={fieldLabel}>Password</p>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={fieldInput}
              />
            </div>

            {error && <p style={{ color: c.bad, fontSize: '0.8rem' }}>{error}</p>}
            {resetMsg && <p style={{ color: c.good, fontSize: '0.8rem' }}>{resetMsg}</p>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: c.muted, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: c.ink, cursor: 'pointer' }}
                />
                Remember me
              </label>
              <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: c.muted, fontSize: '0.78rem', cursor: 'pointer', fontFamily: font, padding: 0 }}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '0.7rem', borderRadius: radius.md, border: `1px solid ${c.ink}`, background: c.ink, color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s', fontFamily: font }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: `1px solid ${c.border}` }}>
            <p style={{ color: c.faint, fontSize: '0.8rem' }}>Not a client yet? <a href="mailto:ethanvonl@icloud.com" style={{ color: c.muted, textDecoration: 'none', borderBottom: `1px solid ${c.borderStrong}` }}>Get in touch →</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
