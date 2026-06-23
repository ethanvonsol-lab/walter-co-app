'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import FeedbackForm from '@/components/FeedbackForm'
import { c, font, radius, card, label as themeLabel, input as themeInput, btn, pageTitle, muted } from '@/lib/theme'

export default function SettingsPage() {
  const [delayType, setDelayType] = useState('minutes')
  const [replyDelay, setReplyDelay] = useState('5')
  const [customDelay, setCustomDelay] = useState('')
  const [autoReply, setAutoReply] = useState(true)
  const [saved, setSaved] = useState(false)

  // Profile (name + industry + avg deal value) — persisted to the clients table.
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [avgDealValue, setAvgDealValue] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfileLoaded(true); return }
      const { data } = await supabase
        .from('clients')
        .select('name, industry, avg_deal_value')
        .eq('email', user.email)
        .maybeSingle()
      if (data) {
        setName(data.name || '')
        setIndustry(data.industry || '')
        setAvgDealValue(data.avg_deal_value ? String(data.avg_deal_value) : '')
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

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const secondsOptions: [string, string][] = [['5', '5 sec'], ['10', '10 sec'], ['15', '15 sec'], ['30', '30 sec']]
  const minutesOptions: [string, string][] = [['1', '1 min'], ['3', '3 mins'], ['5', '5 mins'], ['10', '10 mins'], ['15', '15 mins']]

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
            <p style={themeLabel}>Reply Delay</p>
            <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.1rem' }}>How long before the AI replies — feels more human.</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['seconds', 'minutes', 'custom'].map(type => (
                <button key={type} onClick={() => setDelayType(type)} style={{ ...chip(delayType === type), textTransform: 'capitalize' }}>{type}</button>
              ))}
            </div>

            {delayType === 'seconds' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {secondsOptions.map(([val, lbl]) => (
                  <button key={val} onClick={() => setReplyDelay(val)} style={chip(replyDelay === val)}>{lbl}</button>
                ))}
              </div>
            )}

            {delayType === 'minutes' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {minutesOptions.map(([val, lbl]) => (
                  <button key={val} onClick={() => setReplyDelay(val)} style={chip(replyDelay === val)}>{lbl}</button>
                ))}
              </div>
            )}

            {delayType === 'custom' && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="number"
                  value={customDelay}
                  onChange={e => setCustomDelay(e.target.value)}
                  placeholder="Enter value"
                  style={{ ...themeInput, width: '120px' }}
                />
                <span style={{ ...muted }}>seconds</span>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{ ...btn, padding: '0.7rem', background: saved ? c.good : c.ink, borderColor: saved ? c.good : c.ink }}
          >
            {saved ? 'Saved ✓' : 'Save settings'}
          </button>

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
