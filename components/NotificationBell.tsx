'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius, shadow } from '@/lib/theme'

// Real-time lead notifications (2.5). A bell with an unread count that lives in
// the dashboard header. New leads stream in live via a Supabase realtime
// subscription on the notifications table; opening the panel marks them read.

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  lead_id: string | null
  read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const clientId = useRef<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle()
      if (!client) return
      clientId.current = client.id
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setNotifs(data)

      channel = supabase
        .channel('notif-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `client_id=eq.${client.id}` }, payload => {
          setNotifs(prev => [payload.new as Notif, ...prev].slice(0, 20))
        })
        .subscribe()
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // Close the panel on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0 && clientId.current) {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      await supabase.from('notifications').update({ read: true }).eq('client_id', clientId.current).eq('read', false)
    }
  }

  const timeAgo = (iso: string) => {
    // eslint-disable-next-line react-hooks/purity -- relative timestamp, fine to recompute on render
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: radius.pill,
          background: c.surface, border: `1px solid ${c.border}`, cursor: 'pointer',
          fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: radius.pill, background: '#ef4444', color: '#fff', fontSize: '0.66rem',
            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + c.bg,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: 320, maxHeight: 400, overflowY: 'auto',
          background: c.surface, border: `1px solid ${c.border}`, borderRadius: radius.lg, boxShadow: shadow.lg, zIndex: 50,
        }}>
          <div style={{ padding: '0.85rem 1rem', borderBottom: `1px solid ${c.border}`, fontSize: '0.8rem', fontWeight: 600, color: c.ink }}>
            Notifications
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: c.faint, fontSize: '0.82rem' }}>
              No notifications yet — new leads show up here.
            </div>
          ) : notifs.map(n => (
            <a
              key={n.id}
              href={n.lead_id ? '/dashboard/leads' : '/dashboard'}
              style={{ display: 'block', padding: '0.8rem 1rem', borderBottom: `1px solid ${c.border}`, textDecoration: 'none', background: n.read ? c.surface : c.surfaceHover }}
            >
              <p style={{ fontSize: '0.82rem', fontWeight: 500, color: c.ink, marginBottom: '0.15rem' }}>{n.title}</p>
              {n.body && <p style={{ fontSize: '0.76rem', color: c.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</p>}
              <p style={{ fontSize: '0.68rem', color: c.faint, marginTop: '0.25rem' }}>{timeAgo(n.created_at)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
