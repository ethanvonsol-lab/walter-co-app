'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [replyDelay, setReplyDelay] = useState('5')
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
    <main style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Walter & Co</h2>
        <a href="/dashboard" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Dashboard</a>
        <a href="/dashboard/inbox" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Inbox</a>
        <a href="/dashboard/leads" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Leads</a>
        <a href="/dashboard/analytics" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Analytics</a>
        <a href="/dashboard/voice" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Voice Profile</a>
        <a href="/dashboard/settings" style={{ color: '#e94560', padding: '0.75rem', borderRadius: '8px', background: '#2a2a3e', textDecoration: 'none' }}>Settings</a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Manage your account and bot preferences</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>

          {/* Auto reply toggle */}
          <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Auto Reply</h3>
            <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>Turn the AI reply bot on or off</p>
            <button
              onClick={() => setAutoReply(!autoReply)}
              style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: autoReply ? '#22c55e' : '#333', color: 'white', cursor: 'pointer' }}
            >
              {autoReply ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Reply delay */}
          <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Reply Delay</h3>
            <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>How many minutes before the AI replies (feels more human)</p>
            <select
              value={replyDelay}
              onChange={e => setReplyDelay(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#0f0f0f', color: 'white', fontSize: '1rem' }}
            >
              <option value="1">1 minute</option>
              <option value="3">3 minutes</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', background: saved ? '#22c55e' : '#e94560', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
          >
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '1rem' }}
          >
            Log Out
          </button>

        </div>
      </div>
    </main>
  )
}