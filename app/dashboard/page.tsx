export default function Dashboard() {
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
        <p style={{ color: '#888', marginTop: '0.5rem' }}>Here's what's happening with your Instagram.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
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
      </div>
    </main>
  )
}