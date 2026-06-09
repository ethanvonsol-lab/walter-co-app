'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SidebarProps {
  active: string
}

export default function Sidebar({ active }: SidebarProps) {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [industry, setIndustry] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('clients').select('name, industry').eq('email', user.email).single()
      setClientEmail(user.email || '')
      if (data) {
        setClientName(data.name || '')
        setIndustry(data.industry || '')
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

  return (
    <aside style={{
      width: '260px',
      background: '#fff',
      borderRight: '1px solid #ebebeb',
      padding: '2.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      top: 0,
      left: 0,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '1rem', fontWeight: '400', letterSpacing: '0.12em', color: '#111', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>WALTER & CO</p>
        <p style={{ fontSize: '0.62rem', color: '#bbb', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.2rem' }}>AI Marketing</p>
      </div>

      {/* Nav */}
      <p style={{ color: '#ccc', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>Menu</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={{
            color: active === item.label ? '#111' : '#999',
            padding: '0.65rem 0.75rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.82rem',
            letterSpacing: '0.04em',
            background: active === item.label ? '#f5f5f3' : 'transparent',
            borderLeft: active === item.label ? '2px solid #111' : '2px solid transparent',
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            display: 'block',
            transition: 'all 0.15s',
          }}>{item.label}</a>
        ))}
      </nav>

      {/* User Profile */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: '#111', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <p style={{ color: '#fff', fontSize: '0.8rem', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
              {clientName ? clientName.charAt(0).toUpperCase() : '?'}
            </p>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#111', fontSize: '0.82rem', fontFamily: '"Cormorant Garamond", Georgia, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clientName || 'Your Name'}
            </p>
            <p style={{ color: '#bbb', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
              {industry || clientEmail}
            </p>
          </div>
        </div>
        <p style={{ color: '#ddd', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
      </div>
    </aside>
  )
}