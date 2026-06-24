'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius } from '@/lib/theme'

interface SidebarProps {
  active: string
}

export default function Sidebar({ active }: SidebarProps) {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [industry, setIndustry] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setClientEmail(user.email || '')
      // maybeSingle() returns null instead of erroring when there's no client row.
      const { data } = await supabase
        .from('clients')
        .select('name, industry, is_admin')
        .eq('email', user.email)
        .maybeSingle()
      if (data) {
        setClientName(data.name || '')
        setIndustry(data.industry || '')
        setIsAdmin(!!data.is_admin)
      }
    }
    fetchProfile()
  }, [])

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Inbox', href: '/dashboard/inbox' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Voice Profile', href: '/dashboard/voice' },
    { label: 'Settings', href: '/dashboard/settings' },
    { label: 'Chat Widget', href: '/widget' },
  ]

  const navLink = (isActive: boolean): React.CSSProperties => ({
    color: isActive ? c.ink : c.muted,
    padding: '0.5rem 0.7rem',
    borderRadius: radius.md,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: isActive ? 500 : 400,
    letterSpacing: '-0.01em',
    background: isActive ? c.surfaceAlt : 'transparent',
    display: 'block',
    transition: 'background 0.12s, color 0.12s',
  })

  const initial = (clientName.trim()[0] || clientEmail.trim()[0] || '·').toUpperCase()

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
      {/* Logo */}
      <div style={{ padding: '0 0.7rem', marginBottom: '1.75rem' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.02em', color: c.ink }}>Walter &amp; Co</p>
        <p style={{ fontSize: '0.72rem', color: c.faint, fontWeight: 500, marginTop: '0.1rem' }}>AI Marketing</p>
      </div>

      {/* Nav */}
      <p style={{ color: c.faint, fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem', paddingLeft: '0.7rem' }}>Menu</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={navLink(active === item.label)}>{item.label}</a>
        ))}

        {isAdmin && (
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: `1px solid ${c.border}` }}>
            <a href="/admin" style={navLink(active === 'Admin')}>Admin Console</a>
          </div>
        )}
      </nav>

      {/* User Profile */}
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
            <p style={{ color: c.ink, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clientName || 'Your Name'}
            </p>
            <p style={{ color: c.faint, fontSize: '0.7rem', marginTop: '0.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {industry || clientEmail}
            </p>
          </div>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: c.faint, fontSize: '0.68rem', marginTop: '0.85rem', paddingLeft: '0.4rem' }}>
          <span>🔒</span> Encrypted &amp; secure
        </p>
      </div>
    </aside>
  )
}
