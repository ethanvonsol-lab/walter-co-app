interface SidebarProps {
  active: string
}

export default function Sidebar({ active }: SidebarProps) {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Inbox', href: '/dashboard/inbox' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Voice Profile', href: '/dashboard/voice' },
    { label: 'Settings', href: '/dashboard/settings' },
    { label: 'Chat Widget', href: '/widget' },
  ]

  return (
    <aside style={{ width: '280px', background: '#0f0f0f', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', height: '100vh' }}>
      <div style={{ marginBottom: '3rem' }}>
        <img src="/logo.png" alt="Walter & Co" style={{ width: '150px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
      </div>
      <p style={{ color: '#333', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Navigation</p>
      {navItems.map(item => (
        <a key={item.label} href={item.href} style={{
          color: active === item.label ? '#fff' : '#555',
          padding: '0.7rem 1rem',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '0.8rem',
          letterSpacing: '0.08em',
          background: active === item.label ? '#1a1a1a' : 'transparent',
          borderLeft: active === item.label ? '1px solid #444' : '1px solid transparent',
          display: 'block',
        }}>{item.label}</a>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '1.5rem' }} />
        <p style={{ color: '#2a2a2a', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
      </div>
    </aside>
  )
}