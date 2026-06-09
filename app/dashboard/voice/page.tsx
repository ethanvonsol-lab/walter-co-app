'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Voice Profile" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem' }}>

        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Personalisation</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Voice Profile</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>This is how your AI sounds. Edit it to match your tone exactly.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>

          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f5f5f3' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>AI Personality</p>
              <p style={{ color: '#aaa', fontSize: '0.8rem' }}>This is sent to the AI before every reply. The more specific, the better.</p>
            </div>

            {loading ? (
              <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
            ) : (
              <>
                <textarea
                  value={voiceProfile}
                  onChange={e => setVoiceProfile(e.target.value)}
                  rows={18}
                  placeholder="Complete the onboarding questionnaire to generate your voice profile, or write one here..."
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '8px',
                    border: '1px solid #ebebeb', background: '#fafaf8',
                    color: '#333', fontSize: '0.85rem', lineHeight: '1.7',
                    resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                    fontFamily: 'Georgia, serif', marginBottom: '1.5rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '0.825rem 2.5rem', borderRadius: '8px', border: '1px solid #111',
                      background: saved ? '#2a7a2a' : '#111', color: '#fff', cursor: 'pointer',
                      fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                      transition: 'background 0.3s', fontFamily: 'inherit'
                    }}
                  >
                    {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Profile'}
                  </button>
                  <a href="/onboarding" style={{ color: '#bbb', fontSize: '0.75rem', textDecoration: 'underline', letterSpacing: '0.05em' }}>
                    Redo onboarding →
                  </a>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Tips</p>
              {[
                'Include your name and what you do',
                'Describe your tone — casual, warm, professional',
                'List phrases you\'d never say',
                'Include your main call to action',
                'Mention how you handle pricing questions',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ccc', fontSize: '0.7rem', marginTop: '0.1rem' }}>—</span>
                  <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: '1.5' }}>{tip}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#111', borderRadius: '16px', padding: '1.75rem' }}>
              <p style={{ color: '#444', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Remember</p>
              <p style={{ color: '#666', fontSize: '0.78rem', lineHeight: '1.65' }}>
                Your AI reads this profile before every single reply. The more detail you give, the more accurately it represents you.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}