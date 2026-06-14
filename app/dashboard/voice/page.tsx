'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, input as themeInput, btn, pageTitle, muted, fontMono } from '@/lib/theme'

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Voice Profile" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ ...label, marginBottom: '0.4rem' }}>Personalisation</p>
          <h1 style={pageTitle}>Voice Profile</h1>
          <p style={{ ...muted, marginTop: '0.3rem' }}>This is how your AI sounds. Edit it, then test it live — changes apply instantly to the preview, no save needed.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', alignItems: 'start' }}>

          {/* Editor */}
          <div style={card}>
            <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${c.border}` }}>
              <p style={label}>AI Personality</p>
              <p style={{ ...muted, marginTop: '0.3rem' }}>This is sent to the AI before every reply. The more specific, the better.</p>
            </div>

            {loading ? (
              <p style={{ color: c.faint, fontSize: '0.875rem' }}>Loading…</p>
            ) : (
              <>
                <textarea
                  value={voiceProfile}
                  onChange={e => setVoiceProfile(e.target.value)}
                  rows={18}
                  placeholder="Complete the onboarding questionnaire to generate your voice profile, or write one here…"
                  style={{
                    ...themeInput, padding: '0.9rem', background: c.surfaceAlt,
                    color: c.body, lineHeight: 1.7, resize: 'vertical',
                    fontFamily: fontMono, fontSize: '0.82rem', marginBottom: '1.25rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ ...btn, padding: '0.6rem 2rem', background: saved ? c.good : c.ink, borderColor: saved ? c.good : c.ink }}
                  >
                    {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save profile'}
                  </button>
                  <a href="/onboarding" style={{ color: c.muted, fontSize: '0.8rem', textDecoration: 'none', borderBottom: `1px solid ${c.border}`, paddingBottom: 1 }}>
                    Redo onboarding →
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Live test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={card}>
              <p style={{ ...label, color: c.ink, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>✦</span> Test Your Voice
              </p>
              <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.1rem' }}>Type a DM a follower might send and hear how your AI replies — using the profile as edited right now.</p>

              <input
                type="text"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runTest()}
                placeholder="e.g. How much do your sessions cost?"
                style={{ ...themeInput, marginBottom: '0.75rem' }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => runTest(ex)} style={{ padding: '0.3rem 0.7rem', borderRadius: radius.pill, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, fontSize: '0.68rem', cursor: 'pointer', fontFamily: font }}>
                    {ex.length > 26 ? ex.slice(0, 26) + '…' : ex}
                  </button>
                ))}
              </div>

              <button
                onClick={() => runTest()}
                disabled={testing || !testMsg}
                style={{ ...btn, width: '100%', padding: '0.65rem', opacity: testing || !testMsg ? 0.4 : 1 }}
              >
                {testing ? 'Generating…' : 'Hear my AI reply →'}
              </button>

              {(testing || testReply) && (
                <div style={{ marginTop: '1.1rem' }}>
                  {testMsg && (
                    <div style={{ background: c.surfaceAlt, borderRadius: '12px 12px 12px 4px', padding: '0.65rem 0.9rem', maxWidth: '85%', marginBottom: '0.6rem' }}>
                      <p style={{ color: c.body, fontSize: '0.82rem', lineHeight: 1.5 }}>{testMsg}</p>
                    </div>
                  )}
                  {testing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                      {[60, 75].map((w, i) => (
                        <div key={i} style={{ height: '12px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#e8e8e6,#dedede,#e8e8e6)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: c.ink, borderRadius: '12px 12px 4px 12px', padding: '0.75rem 0.95rem', maxWidth: '85%', marginLeft: 'auto' }}>
                      <p style={{ color: '#fff', fontSize: '0.82rem', lineHeight: 1.55 }}>{testReply}</p>
                      <p style={{ color: '#a1a1aa', fontSize: '0.62rem', marginTop: '0.4rem' }}>Your AI · in your voice</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={card}>
              <p style={{ ...label, marginBottom: '0.9rem' }}>Tips</p>
              {[
                'Include your name and what you do',
                'Describe your tone — casual, warm, professional',
                'List phrases you\'d never say',
                'Include your main call to action',
                'Mention how you handle pricing questions',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: c.faint, fontSize: '0.75rem', marginTop: '0.1rem' }}>—</span>
                  <p style={{ color: c.muted, fontSize: '0.8rem', lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
