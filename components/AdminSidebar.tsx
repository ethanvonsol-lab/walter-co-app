'use client'

import { usePathname } from 'next/navigation'
import { c, font, radius } from '@/lib/theme'

const navItems = [
  { label: 'Overview', href: '/admin' },
  { label: 'Clients', href: '/admin/clients' },
  { label: 'New Client', href: '/admin/clients/new' },
  { label: 'Agencies', href: '/admin/agencies' },
  { label: 'Revenue', href: '/admin/revenue' },
  { label: 'Feedback', href: '/admin/feedback' },
  { label: 'Daily Note', href: '/admin/daily' },
  { label: 'Demo', href: '/admin/demo' },
  { label: 'Health', href: '/admin/health' },
  { label: 'Audit Log', href: '/admin/audit' },
]

interface Props {
  adminName: string | null
  adminEmail: string
}

export default function AdminSidebar({ adminName, adminEmail }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const displayName = adminName || adminEmail
  const initial = (displayName.trim()[0] || '·').toUpperCase()

  const navLink = (active: boolean): React.CSSProperties => ({
    color: active ? c.ink : c.muted,
    padding: '0.5rem 0.7rem',
    borderRadius: radius.md,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: active ? 500 : 400,
    letterSpacing: '-0.01em',
    background: active ? c.surfaceAlt : 'transparent',
    display: 'block',
    transition: 'background 0.12s, color 0.12s',
  })

  return (
    <aside style={{
      width: '244px',
      background: c.surface,
      borderRight: `1px solid ${c.border}`,
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      top: 0,
      left: 0,
      fontFamily: font,
    }}>
      <div style={{ padding: '0 0.7rem', marginBottom: '1.75rem' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.02em', color: c.ink }}>Walter &amp; Co</p>
        <p style={{ fontSize: '0.72rem', color: c.faint, fontWeight: 500, marginTop: '0.1rem' }}>Admin Console</p>
      </div>

      <p style={{ color: c.faint, fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem', paddingLeft: '0.7rem' }}>Operations</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={navLink(isActive(item.href))}>{item.label}</a>
        ))}

        <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: `1px solid ${c.border}` }}>
          <a href="/dashboard" style={{ ...navLink(false), fontSize: '0.82rem' }}>← Back to dashboard</a>
        </div>
      </nav>

      <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '1rem', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.4rem' }}>
          <div style={{
            width: 30, height: 30, borderRadius: radius.sm,
            background: c.ink, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <p style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>{initial}</p>
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ color: c.ink, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
            <p style={{ color: c.faint, fontSize: '0.7rem', marginTop: '0.05rem' }}>Owner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
