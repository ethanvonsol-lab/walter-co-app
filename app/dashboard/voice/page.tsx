'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function VoicePage() {
  const [voiceProfile, setVoiceProfile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('clients').select('id, voice_profile').eq('email', user.email).single()
        if (data) {
          setVoiceProfile(data.voice_profile || '')
          setClientId(data.id)
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('clients').update({ voice_profile: voiceProfile }).eq('id', clientId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#f7f7f5' }}>

      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#0f0f0f', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', height: '100vh' }}>
        <div style={{ marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Walter & Co" style={{ width: '150px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
        </div>
        <p style={{ color: '#333', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Navigation</p>
        {[
          { label: 'Dashboard', href: '/dashboard', active: false },
          { label: 'Inbox', href: '/dashboard/inbox', active: false },
          { label: 'Leads', href: '/dashboard/leads', active: false },
          { label: 'Analytics', href: '/dashboard/analytics', active: false },
          { label: 'Voice Profile', href: '/dashboard/voice', active: true },
          { label: 'Settings', href: '/dashboard/settings', active: false },
        ].map(item => (
          <a key={item.label} href={item.href} style={{
            color: item.active ? '#fff' : '#555',
            padding: '0.7rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            background: item.active ? '#1a1a1a' : 'transparent',
            borderLeft: item.active ? '1px solid #444' : '1px solid transparent',
            display: 'block',
          }}>{item.label}</a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '1.5rem' }} />
          <p style={{ color: '#2a2a2a', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Personalisation</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>Voice Profile</h2>
          <p style={{ color: '#999', fontSize: '0.85rem' }}>This is how your AI sounds. Edit it to match your tone exactly.</p>
          <div style={{ width: '40px', height: '1px', background: '#111', marginTop: '1.5rem' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

          {/* Editor */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>AI Personality</p>
              <p style={{ color: '#999', fontSize: '0.8rem' }}>This text is sent to the AI before every reply. The more specific, the better.</p>
            </div>

            {loading ? (
              <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
            ) : (
              <>
                <textarea
                  value={voiceProfile}
                  onChange={e => setVoiceProfile(e.target.value)}
                  rows={18}
                  placeholder="Complete the onboarding questionnaire to generate your voice profile automatically, or write one here..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #ebebeb',
                    background: '#fafafa',
                    color: '#333',
                    fontSize: '0.85rem',
                    lineHeight: '1.7',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'Georgia, serif',
                    marginBottom: '1.5rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '0.875rem 2.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: saved ? '#2a7a2a' : '#111',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      transition: 'background 0.3s'
                    }}
                  >
                    {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Profile'}
                  </button>
                  <a
                    href="/onboarding"
                    style={{ color: '#bbb', fontSize: '0.75rem', textDecoration: 'underline', letterSpacing: '0.05em' }}
                  >
                    Redo onboarding questionnaire →
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Tips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Tips</p>
              {[
                'Include your name and what you do',
                'Describe your tone (casual, professional, warm)',
                'List phrases you\'d never say',
                'Include your main call to action',
                'Mention how you handle pricing questions',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#bbb', fontSize: '0.7rem', marginTop: '0.1rem' }}>—</span>
                  <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: '1.5' }}>{tip}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.75rem' }}>
              <p style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Remember</p>
              <p style={{ color: '#666', fontSize: '0.78rem', lineHeight: '1.6' }}>
                Your AI reads this profile before every single reply. The more detail you provide, the more accurately it will represent you.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}