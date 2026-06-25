'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import FeedbackForm from '@/components/FeedbackForm'
import { c, font, radius, card, label as themeLabel, input as themeInput, btn, pageTitle, muted } from '@/lib/theme'

export default function SettingsPage() {
  const [autoReply, setAutoReply] = useState(true)
  const [replyDelaySeconds, setReplyDelaySeconds] = useState(0)
  const [delaySaved, setDelaySaved] = useState(false)

  // Profile (name + industry + avg deal value) — persisted to the clients table.
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [avgDealValue, setAvgDealValue] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Discord integration — per-client incoming webhook for lead alerts.
  const [discordUrl, setDiscordUrl] = useState('')
  const [discordSaving, setDiscordSaving] = useState(false)
  const [discordSaved, setDiscordSaved] = useState(false)
  const [discordTest, setDiscordTest] = useState<'' | 'sending' | 'ok' | 'fail'>('')

  // Voice replies (beta, dormant until ElevenLabs is configured).
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceId, setVoiceId] = useState('')
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [voiceSaved, setVoiceSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfileLoaded(true); return }
      const { data } = await supabase
        .from('clients')
        .select('name, industry, avg_deal_value, discord_webhook_url, voice_replies_enabled, elevenlabs_voice_id, reply_delay_seconds')
        .eq('email', user.email)
        .maybeSingle()
      if (data) {
        setName(data.name || '')
        setIndustry(data.industry || '')
        setAvgDealValue(data.avg_deal_value ? String(data.avg_deal_value) : '')
        setDiscordUrl(data.discord_webhook_url || '')
        setVoiceEnabled(!!data.voice_replies_enabled)
        setVoiceId(data.elevenlabs_voice_id || '')
        setReplyDelaySeconds(data.reply_delay_seconds ?? 0)
      }
      setProfileLoaded(true)
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    setProfileError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProfileError('You need to be signed in.'); return }
    setProfileSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({
        name: name.trim(),
        industry: industry.trim(),
        avg_deal_value: avgDealValue.trim() ? Math.max(0, Math.round(Number(avgDealValue))) : 0,
      })
      .eq('email', user.email)
    setProfileSaving(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    }
  }

  const handleSaveDiscord = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setDiscordSaving(true)
    await supabase.from('clients').update({ discord_webhook_url: discordUrl.trim() || null }).eq('email', user.email)
    setDiscordSaving(false)
    setDiscordSaved(true)
    setTimeout(() => setDiscordSaved(false), 2000)
  }

  const handleTestDiscord = async () => {
    if (!discordUrl.trim()) return
    setDiscordTest('sending')
    try {
      const res = await fetch('/api/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordUrl.trim() }),
      })
      const data = await res.json()
      setDiscordTest(data.ok ? 'ok' : 'fail')
    } catch {
      setDiscordTest('fail')
    }
    setTimeout(() => setDiscordTest(''), 3000)
  }

  const handleSaveVoice = async (nextEnabled: boolean, nextVoiceId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setVoiceSaving(true)
    await supabase.from('clients').update({
      voice_replies_enabled: nextEnabled,
      elevenlabs_voice_id: nextVoiceId.trim() || null,
    }).eq('email', user.email)
    setVoiceSaving(false)
    setVoiceSaved(true)
    setTimeout(() => setVoiceSaved(false), 2000)
  }

  const saveReplyDelay = async (seconds: number) => {
    setReplyDelaySeconds(seconds)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('clients').update({ reply_delay_seconds: seconds }).eq('email', user.email)
    setDelaySaved(true)
    setTimeout(() => setDelaySaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }


  const fieldLabel: React.CSSProperties = { ...themeLabel, fontSize: '0.72rem', marginBottom: '0.4rem' }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1rem', borderRadius: radius.md, border: `1px solid ${active ? c.ink : c.border}`,
    background: active ? c.ink : c.surface, color: active ? '#fff' : c.muted,
    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: font, transition: 'all 0.12s',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Settings" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ ...themeLabel, marginBottom: '0.4rem' }}>Account</p>
          <h1 style={pageTitle}>Settings</h1>
          <p style={{ ...muted, marginTop: '0.3rem' }}>Manage your bot preferences and account.</p>
        </div>

        <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Profile */}
          <div style={card}>
            <p style={themeLabel}>Profile</p>
            <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.25rem' }}>Your name and industry — shown across your dashboard and sidebar.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={fieldLabel}>Name</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={profileLoaded ? 'e.g. Walter & Co' : 'Loading…'}
                  disabled={!profileLoaded}
                  style={themeInput}
                />
              </div>
              <div>
                <p style={fieldLabel}>Industry</p>
                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder={profileLoaded ? 'e.g. Content, Fitness, Skincare' : 'Loading…'}
                  disabled={!profileLoaded}
                  style={themeInput}
                />
              </div>
              <div>
                <p style={fieldLabel}>Average deal value ($)</p>
                <input
                  type="number"
                  min={0}
                  value={avgDealValue}
                  onChange={e => setAvgDealValue(e.target.value)}
                  placeholder={profileLoaded ? 'e.g. 1500' : 'Loading…'}
                  disabled={!profileLoaded}
                  style={themeInput}
                />
                <p style={{ color: c.faint, fontSize: '0.74rem', marginTop: '0.35rem' }}>What one new client is worth on average. Drives the pipeline value on your dashboard and leads.</p>
              </div>

              {profileError && <p style={{ color: c.bad, fontSize: '0.82rem' }}>{profileError}</p>}

              <button
                onClick={handleSaveProfile}
                disabled={!profileLoaded || profileSaving}
                style={{ ...btn, alignSelf: 'flex-start', background: profileSaved ? c.good : c.ink, borderColor: profileSaved ? c.good : c.ink, opacity: !profileLoaded || profileSaving ? 0.5 : 1 }}
              >
                {profileSaved ? 'Saved ✓' : profileSaving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>

          {/* Auto Reply */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={themeLabel}>Auto Reply</p>
                <p style={{ ...muted, marginTop: '0.3rem' }}>Automatically reply to incoming DMs.</p>
              </div>
              <button
                onClick={() => setAutoReply(!autoReply)}
                style={{ width: '44px', height: '24px', borderRadius: '13px', border: 'none', background: autoReply ? c.ink : '#d4d4d8', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: autoReply ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          {/* Reply Delay */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={themeLabel}>Reply delay</p>
              {delaySaved && <span style={{ color: c.good, fontSize: '0.74rem' }}>Saved ✓</span>}
            </div>
            <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.1rem' }}>How long the AI waits before replying. A short pause feels more human than an instant reply.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {([[0, 'Instant'], [10, '10s'], [20, '20s'], [30, '30s'], [45, '45s']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => saveReplyDelay(val)} disabled={!profileLoaded} style={chip(replyDelaySeconds === val)}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Integrations — Discord */}
          <div style={card}>
            <p style={themeLabel}>Discord alerts</p>
            <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.1rem' }}>Get a ping in your Discord the moment the AI captures a lead. Paste an incoming-webhook URL from your server (Server Settings → Integrations → Webhooks).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="url"
                value={discordUrl}
                onChange={e => setDiscordUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                disabled={!profileLoaded}
                style={themeInput}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={handleSaveDiscord}
                  disabled={!profileLoaded || discordSaving}
                  style={{ ...btn, background: discordSaved ? c.good : c.ink, borderColor: discordSaved ? c.good : c.ink, opacity: !profileLoaded || discordSaving ? 0.5 : 1 }}
                >
                  {discordSaved ? 'Saved ✓' : discordSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleTestDiscord}
                  disabled={!discordUrl.trim() || discordTest === 'sending'}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: radius.md, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: font, opacity: !discordUrl.trim() ? 0.5 : 1 }}
                >
                  {discordTest === 'sending' ? 'Sending…' : 'Send test'}
                </button>
                {discordTest === 'ok' && <span style={{ color: c.good, fontSize: '0.8rem' }}>Sent — check Discord ✓</span>}
                {discordTest === 'fail' && <span style={{ color: c.bad, fontSize: '0.8rem' }}>Couldn&apos;t send — check the URL</span>}
              </div>
            </div>
          </div>

          {/* Voice replies (beta) */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <p style={themeLabel}>Voice replies <span style={{ color: c.warn, background: c.warnBg, border: `1px solid ${c.warnBorder}`, padding: '0.05rem 0.4rem', borderRadius: radius.sm, fontSize: '0.6rem', marginLeft: '0.3rem' }}>BETA</span></p>
                <p style={{ ...muted, marginTop: '0.3rem' }}>Reply with an audio voice memo instead of text, in your cloned voice. Requires team setup before it goes live.</p>
              </div>
              <button
                onClick={() => { const next = !voiceEnabled; setVoiceEnabled(next); handleSaveVoice(next, voiceId) }}
                disabled={!profileLoaded || voiceSaving}
                style={{ width: '44px', height: '24px', borderRadius: '13px', border: 'none', background: voiceEnabled ? c.ink : '#d4d4d8', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: voiceEnabled ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            {voiceEnabled && (
              <div style={{ marginTop: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input
                  type="text"
                  value={voiceId}
                  onChange={e => setVoiceId(e.target.value)}
                  onBlur={() => handleSaveVoice(voiceEnabled, voiceId)}
                  placeholder="ElevenLabs voice ID"
                  style={themeInput}
                />
                <p style={{ color: c.faint, fontSize: '0.74rem' }}>
                  {voiceSaved ? 'Saved ✓ — ' : ''}Dormant until an ElevenLabs key is configured for your account. Until then, replies stay as text.
                </p>
              </div>
            )}
          </div>

          {/* Feedback */}
          <FeedbackForm />

          {/* Account */}
          <div style={card}>
            <p style={{ ...themeLabel, marginBottom: '1rem' }}>Account</p>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1.1rem', borderRadius: radius.md, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: font }}>
              Sign out →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
