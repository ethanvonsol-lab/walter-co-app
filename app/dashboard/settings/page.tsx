'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function SettingsPage() {
  const [delayType, setDelayType] = useState('minutes')
  const [replyDelay, setReplyDelay] = useState('5')
  const [customDelay, setCustomDelay] = useState('')
  const [autoReply, setAutoReply] = useState(true)
  const [saved, setSaved] = useState(false)

  // Profile (name + industry) — persisted to the clients table.
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
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
        .select('name, industry')
        .eq('email', user.email)
        .maybeSingle()
      if (data) {
        setName(data.name || '')
        setIndustry(data.industry || '')
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
      .update({ name: name.trim(), industry: industry.trim() })
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

  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb',
    fontSize: '0.85rem', color: '#111', background: '#fafaf8', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  }
  const fieldLabel: React.CSSProperties = {
    color: '#bbb', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Settings" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem' }}>

        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Account</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Settings</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Manage your bot preferences and account.</p>
        </div>

        <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Profile */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Profile</p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Your name and industry — shown across your dashboard and sidebar</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <p style={fieldLabel}>Name</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={profileLoaded ? 'e.g. Walter & Co' : 'Loading…'}
                  disabled={!profileLoaded}
                  style={fieldInput}
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
                  style={fieldInput}
                />
              </div>

              {profileError && <p style={{ color: '#cc4444', fontSize: '0.78rem' }}>{profileError}</p>}

              <button
                onClick={handleSaveProfile}
                disabled={!profileLoaded || profileSaving}
                style={{ alignSelf: 'flex-start', padding: '0.7rem 1.75rem', borderRadius: '10px', border: '1px solid #111', background: profileSaved ? '#2a7a2a' : '#111', color: '#fff', cursor: profileLoaded && !profileSaving ? 'pointer' : 'default', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: !profileLoaded || profileSaving ? 0.5 : 1, transition: 'background 0.3s', fontFamily: 'inherit' }}
              >
                {profileSaved ? 'Saved ✓' : profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Auto Reply */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Auto Reply</p>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>Automatically reply to incoming DMs</p>
              </div>
              <button
                onClick={() => setAutoReply(!autoReply)}
                style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', background: autoReply ? '#111' : '#e0e0e0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '4px', left: autoReply ? '26px' : '4px', transition: 'left 0.2s' }} />
              </button>
            </div>
          </div>

          {/* Reply Delay */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Reply Delay</p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.25rem' }}>How long before the AI replies — feels more human</p>

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['seconds', 'minutes', 'custom'].map(type => (
                <button
                  key={type}
                  onClick={() => setDelayType(type)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid',
                    borderColor: delayType === type ? '#111' : '#e8e8e8',
                    background: delayType === type ? '#111' : '#fff',
                    color: delayType === type ? '#fff' : '#888',
                    fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.05em', textTransform: 'capitalize'
                  }}
                >{type}</button>
              ))}
            </div>

            {delayType === 'seconds' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {secondsOptions.map(([val, label]) => (
                  <button key={val} onClick={() => setReplyDelay(val)} style={{ padding: '0.45rem 1.1rem', borderRadius: '6px', border: '1px solid', borderColor: replyDelay === val ? '#111' : '#e8e8e8', background: replyDelay === val ? '#111' : '#fff', color: replyDelay === val ? '#fff' : '#888', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                ))}
              </div>
            )}

            {delayType === 'minutes' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {minutesOptions.map(([val, label]) => (
                  <button key={val} onClick={() => setReplyDelay(val)} style={{ padding: '0.45rem 1.1rem', borderRadius: '6px', border: '1px solid', borderColor: replyDelay === val ? '#111' : '#e8e8e8', background: replyDelay === val ? '#111' : '#fff', color: replyDelay === val ? '#fff' : '#888', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
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
                  style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.85rem', width: '120px', outline: 'none', fontFamily: 'inherit', background: '#fafaf8' }}
                />
                <span style={{ color: '#888', fontSize: '0.85rem' }}>seconds</span>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{ padding: '0.925rem', borderRadius: '10px', border: '1px solid #111', background: saved ? '#2a7a2a' : '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'background 0.3s', fontFamily: 'inherit' }}
          >
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>

          {/* Account */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Account</p>
            <button onClick={handleLogout} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #e8e8e8', background: '#fff', color: '#999', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
              Sign out →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
