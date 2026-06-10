'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const EXAMPLES = [
  'How much do your sessions cost?',
  'Do you have any availability this week?',
  'Loved your latest post! 😍',
  'Can you tell me more about what you offer?',
]

export default function VoicePage() {
  const [voiceProfile, setVoiceProfile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clientId, setClientId] = useState('')

  // Live test — runs against the CURRENT textarea value, saved or not.
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('clients').select('id, voice_profile').eq('email', user.email).maybeSingle()
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

  const runTest = async (msg?: string) => {
    const message = msg ?? testMsg
    if (!message) return
    setTestMsg(message)
    setTesting(true)
    setTestReply('')
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, voiceProfile }),
      })
      const data = await res.json()
      setTestReply(data.reply || 'No reply returned.')
    } catch {
      setTestReply("Couldn't generate a reply right now.")
    }
    setTesting(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Voice Profile" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem' }}>

        <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Personalisation</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Voice Profile</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>This is how your AI sounds. Edit it, then test it live below — changes apply instantly, no save needed to preview.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Editor */}
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

          {/* Live test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#111', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>✦</span> Test Your Voice
              </p>
              <p style={{ color: '#aaa', fontSize: '0.78rem', marginBottom: '1.25rem' }}>Type a DM a follower might send and hear how your AI replies — using the profile as edited right now.</p>

              <input
                type="text"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runTest()}
                placeholder="e.g. How much do your sessions cost?"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.82rem', color: '#111', background: '#fafaf8', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', marginBottom: '0.75rem' }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => runTest(ex)} style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', border: '1px solid #eee', background: '#fff', color: '#999', fontSize: '0.66rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                    {ex.length > 26 ? ex.slice(0, 26) + '…' : ex}
                  </button>
                ))}
              </div>

              <button
                onClick={() => runTest()}
                disabled={testing || !testMsg}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #111', background: '#111', color: '#fff', cursor: testing || !testMsg ? 'default' : 'pointer', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: testing || !testMsg ? 0.4 : 1, fontFamily: 'inherit' }}
              >
                {testing ? 'Generating…' : 'Hear my AI reply →'}
              </button>

              {(testing || testReply) && (
                <div style={{ marginTop: '1.25rem' }}>
                  {testMsg && (
                    <div style={{ background: '#f0f0ee', borderRadius: '12px 12px 12px 4px', padding: '0.7rem 0.95rem', maxWidth: '85%', marginBottom: '0.6rem' }}>
                      <p style={{ color: '#666', fontSize: '0.8rem', lineHeight: '1.5' }}>{testMsg}</p>
                    </div>
                  )}
                  {testing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                      {[60, 75].map((w, i) => (
                        <div key={i} style={{ height: '12px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#e8e8e6,#dedede,#e8e8e6)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#111', borderRadius: '12px 12px 4px 12px', padding: '0.8rem 1rem', maxWidth: '85%', marginLeft: 'auto' }}>
                      <p style={{ color: '#fff', fontSize: '0.82rem', lineHeight: '1.55' }}>{testReply}</p>
                      <p style={{ color: '#555', fontSize: '0.58rem', marginTop: '0.4rem', letterSpacing: '0.05em' }}>Your AI · in your voice</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.5rem 1.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Tips</p>
              {[
                'Include your name and what you do',
                'Describe your tone — casual, warm, professional',
                'List phrases you\'d never say',
                'Include your main call to action',
                'Mention how you handle pricing questions',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.7rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ccc', fontSize: '0.7rem', marginTop: '0.1rem' }}>—</span>
                  <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: '1.5' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
