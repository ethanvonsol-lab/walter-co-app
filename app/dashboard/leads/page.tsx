export default function LeadsPage() {
  return (
    <main style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Walter & Co</h2>
        <a href="/dashboard" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Dashboard</a>
        <a href="/dashboard/inbox" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Inbox</a>
        <a href="/dashboard/leads" style={{ color: '#e94560', padding: '0.75rem', borderRadius: '8px', background: '#2a2a3e', textDecoration: 'none' }}>Leads</a>
        <a href="/dashboard/analytics" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Analytics</a>
        <a href="/dashboard/voice" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Voice Profile</a>
        <a href="/dashboard/settings" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Settings</a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Leads</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>People who have shown interest in your services</p>

        {/* Empty state */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', background: '#1a1a2e', borderRadius: '12px', color: '#888' }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</p>
          <p>No leads captured yet</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Leads will appear here when the AI detects buying intent in messages</p>
        </div>
      </div>
    </main>
  )
}