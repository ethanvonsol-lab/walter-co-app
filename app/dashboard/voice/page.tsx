'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function VoicePage() {
  const [voiceProfile, setVoiceProfile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('clients').select('voice_profile').eq('email', user.email).single()
        if (data) setVoiceProfile(data.voice_profile || '')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('clients').update({ voice_profile: voiceProfile }).eq('email', user.email)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Walter & Co</h2>
        <a href="/dashboard" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Dashboard</a>
        <a href="/dashboard/inbox" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Inbox</a>
        <a href="/dashboard/leads" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Leads</a>
        <a href="/dashboard/analytics" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Analytics</a>
        <a href="/dashboard/voice" style={{ color: '#e94560', padding: '0.75rem', borderRadius: '8px', background: '#2a2a3e', textDecoration: 'none' }}>Voice Profile</a>
        <a href="/dashboard/settings" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Settings</a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Voice Profile</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>This is how your AI sounds. Edit it anytime.</p>

        {loading ? (
          <p style={{ color: '#888' }}>Loading...</p>
        ) : (
          <>
            <textarea
              value={voiceProfile}
              onChange={e => setVoiceProfile(e.target.value)}
              rows={20}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }}
              placeholder="Your voice profile will appear here after completing onboarding..."
            />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: '1rem', padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', background: saved ? '#22c55e' : '#e94560', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
            >
              {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}