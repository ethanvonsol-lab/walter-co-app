'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [replyDelay, setReplyDelay] = useState('5')
  const [delayType, setDelayType] = useState('minutes')
  const [customDelay, setCustomDelay] = useState('')
  const [autoReply, setAutoReply] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
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
          { label: 'Voice Profile', href: '/dashboard/voice', active: false },
          { label: 'Settings', href: '/dashboard/settings', active: true },
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
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Account</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>Settings</h2>
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Manage your bot preferences and account.</p>
          <div style={{ width: '40px', height: '1px', background: '#111', marginTop: '1.5rem' }} />
        </div>

        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Auto Reply */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Auto Reply</p>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>Automatically reply to incoming DMs</p>
              </div>
              <button
                onClick={() => setAutoReply(!autoReply)}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: autoReply ? '#111' : '#e0e0e0',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '4px',
                  left: autoReply ? '28px' : '4px',
                  transition: 'left 0.2s'
                }} />
              </button>
            </div>
          </div>

          {/* Reply Delay */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reply Delay</p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.25rem' }}>How long before the AI replies — feels more human</p>
            
            {/* Delay Type Toggle */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {['seconds', 'minutes', 'custom'].map(type => (
                <button
                  key={type}
                  onClick={() => setDelayType(type)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: delayType === type ? '#111' : '#e8e8e8',
                    background: delayType === type ? '#111' : '#fff',
                    color: delayType === type ? '#fff' : '#888',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                    textTransform: 'capitalize'
                  }}
                >{type}</button>
              ))}
            </div>

            {/* Preset Options */}
            {delayType !== 'custom' && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(delayType === 'seconds' 
                  ? ['5 sec', '10 sec', '15 sec', '30 sec']
                  : ['1 min', '3 mins', '5 mins', '10 mins', '15 mins']
                ).map((opt, i) => {
                  const val = delayType === 'seconds' 
                    ? ['5', '10', '15', '30'][i]
                    : ['1', '3', '5', '10', '15'][i]
                  return (
                    <button
                      key={opt}
                      onClick={() => setReplyDelay(val)}
                      style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: replyDelay === val && delayType !== 'custom' ? '#111' : '#e8e8e8',
                        background: replyDelay === val && delayType !== 'custom' ? '#111' : '#fff',
                        color: replyDelay === val && delayType !== 'custom' ? '#fff' : '#888',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        letterSpacing: '0.05em'
                      }}
                    >{opt}</button>
                  )
                })}
              </div>
            )}

            {/* Custom Input */}
            {delayType === 'custom' && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="number"
                  value={customDelay}
                  onChange={e => setCustomDelay(e.target.value)}
                  placeholder="Enter value"
                  style={{
                    padding: '0.625rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #e8e8e8',
                    fontSize: '0.85rem',
                    width: '120px',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ color: '#888', fontSize: '0.85rem' }}>seconds</span>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{
              padding: '1rem',
              borderRadius: '10px',
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
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>

          {/* Danger zone */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Account</p>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                background: '#fff',
                color: '#999',
                cursor: 'pointer',
                fontSize: '0.75rem',
                letterSpacing: '0.05em'
              }}
            >
              Sign out →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}