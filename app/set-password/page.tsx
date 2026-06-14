'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Landing page invited clients hit after clicking the email link. Supabase has
// already logged them in by the time they get here — they just need to set a
// password so they can come back via /login next time.
export default function SetPasswordPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const run = async () => {
      // Supabase email links land here with a `?code=...` (PKCE) or a
      // `#access_token=...` (hash) param. Exchange the code first; the hash
      // form is auto-handled by the browser client on load.
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        // Clean the URL so refreshes don't try to re-exchange a used code.
        window.history.replaceState({}, '', url.pathname)
      }
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setAuthed(true)
        setEmail(data.user.email || '')
      } else {
        setAuthed(false)
      }
    }
    run()
  }, [])

  const save = async () => {
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }
  const card: React.CSSProperties = { width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #ebebed', borderRadius: 16, padding: '2.5rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }
  const input: React.CSSProperties = { width: '100%', padding: '0.825rem 1rem', borderRadius: 8, border: '1px solid #ebebed', fontSize: '0.875rem', color: '#111', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
  const label: React.CSSProperties = { color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }

  if (authed === null) return <div style={wrap}><p style={{ color: '#999' }}>Loading…</p></div>

  if (!authed) return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Walter & Co</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#111', marginBottom: '0.6rem' }}>This link has expired.</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Invite links are single-use. Ask your admin to resend.</p>
        <a href="/login" style={{ display: 'inline-block', color: '#111', textDecoration: 'none', borderBottom: '1px solid #111', paddingBottom: 2, fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Back to login</a>
      </div>
    </div>
  )

  if (done) return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Walter & Co</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#111', marginBottom: '0.6rem' }}>You&apos;re set.</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Password saved. Next, let&apos;s teach your AI how you talk — takes about 2 minutes.</p>
        <a href="/onboarding" style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '0.825rem 2rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.9rem', letterSpacing: '0.06em' }}>Set up my AI →</a>
        <a href="/dashboard" style={{ display: 'block', marginTop: '1rem', color: '#999', fontSize: '0.8rem', textDecoration: 'none' }}>Skip for now</a>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Walter & Co</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#111', marginBottom: '0.4rem' }}>Choose a password.</h1>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '2rem' }}>Setting up <strong style={{ color: '#444' }}>{email}</strong>. You&apos;ll use this to sign in from now on.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <p style={label}>New password</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={input} />
          </div>
          <div>
            <p style={label}>Confirm password</p>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Type it again" style={input} />
          </div>
          {error && <p style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>}
          <button onClick={save} disabled={saving || !password || !confirm} style={{ background: '#111', color: '#fff', border: 'none', padding: '0.9rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', letterSpacing: '0.06em', marginTop: '0.5rem', opacity: saving || !password || !confirm ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save password & continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
