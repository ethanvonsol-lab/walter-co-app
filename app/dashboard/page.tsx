'use client'

import { useState } from 'react'

export default function Dashboard() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  const testReply = async () => {
    setLoading(true)
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        voiceProfile: 'You are a friendly personal trainer named Jake. You are energetic, motivating, and love helping people reach their fitness goals. You speak casually and use the occasional emoji.'
      })
    })
    const data = await res.json()
    setReply(data.reply)
    setLoading(false)
  }

  return (
    <main style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Walter & Co</h2>
        <a href="/dashboard" style={{ color: '#e94560', padding: '0.75rem', borderRadius: '8px', background: '#2a2a3e', textDecoration: 'none' }}>Dashboard</a>
        <a href="/dashboard/inbox" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Inbox</a>
        <a href="/dashboard/leads" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Leads</a>
        <a href="/dashboard/analytics" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Analytics</a>
        <a href="/dashboard/voice" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Voice Profile</a>
        <a href="/dashboard/settings" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Settings</a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem' }}>
        <h1>Welcome back 👋</h1>
        <p style={{ color: '#888', marginTop: '0.5rem', marginBottom: '2rem' }}>Here's what's happening with your Instagram.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
            <p style={{ color: '#888' }}>Replies Sent</p>
            <h2 style={{ color: 'white', marginTop: '0.5rem' }}>0</h2>
          </div>
          <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
            <p style={{ color: '#888' }}>Leads Captured</p>
            <h2 style={{ color: 'white', marginTop: '0.5rem' }}>0</h2>
          </div>
          <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
            <p style={{ color: '#888' }}>Escalated</p>
            <h2 style={{ color: 'white', marginTop: '0.5rem' }}>0</h2>
          </div>
        </div>

        {/* AI Test */}
        <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '1rem' }}>🤖 Test AI Reply</h3>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message as if you're a follower..."
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#0f0f0f', color: 'white', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }}
          />
          <button
            onClick={testReply}
            disabled={loading || !message}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#e94560', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
          >
            {loading ? 'Thinking...' : 'Get AI Reply'}
          </button>
          {reply && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#0f0f0f', borderRadius: '8px', borderLeft: '3px solid #e94560' }}>
              <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.5rem' }}>AI Reply:</p>
              <p>{reply}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}