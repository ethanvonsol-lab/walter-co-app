export default function AnalyticsPage() {
  return (
    <main style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Walter & Co</h2>
        <a href="/dashboard" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Dashboard</a>
        <a href="/dashboard/inbox" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Inbox</a>
        <a href="/dashboard/leads" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Leads</a>
        <a href="/dashboard/analytics" style={{ color: '#e94560', padding: '0.75rem', borderRadius: '8px', background: '#2a2a3e', textDecoration: 'none' }}>Analytics</a>
        <a href="/dashboard/voice" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Voice Profile</a>
        <a href="/dashboard/settings" style={{ color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none' }}>Settings</a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Analytics</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Your Instagram performance at a glance</p>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Replies', value: '0', icon: '💬' },
            { label: 'Leads Captured', value: '0', icon: '🎯' },
            { label: 'Escalated', value: '0', icon: '🚨' },
            { label: 'Avg Reply Time', value: '—', icon: '⚡' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '12px' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{stat.icon}</p>
              <p style={{ color: '#888', fontSize: '0.875rem' }}>{stat.label}</p>
              <h2 style={{ color: 'white', marginTop: '0.25rem' }}>{stat.value}</h2>
            </div>
          ))}
        </div>

        {/* Empty chart area */}
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#888' }}>
          <p>Charts will appear here once messages start coming in 📈</p>
        </div>
      </div>
    </main>
  )
}