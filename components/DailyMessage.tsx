'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, radius, card } from '@/lib/theme'

// "Today from Ethan" — the latest admin daily note, shown atop the client
// dashboard. Dismissible, but a newer note reappears (dismissal is keyed by id).

interface Note { id: string; message: string; created_at: string }

export default function DailyMessage() {
  const [note, setNote] = useState<Note | null>(null)
  const [dismissed, setDismissed] = useState(true) // assume hidden until we know otherwise

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('daily_messages')
        .select('id, message, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) return
      setNote(data)
      const seen = typeof window !== 'undefined' ? localStorage.getItem('walter_daily_dismissed') : null
      setDismissed(seen === data.id)
    }
    load()
  }, [])

  if (!note || dismissed) return null

  const dismiss = () => {
    localStorage.setItem('walter_daily_dismissed', note.id)
    setDismissed(true)
  }

  return (
    <div style={{ ...card, marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.9rem', borderLeft: `3px solid ${c.ink}` }}>
      <span style={{ fontSize: '1.1rem', lineHeight: 1.3, flexShrink: 0 }}>📌</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.72rem', color: c.muted, fontWeight: 600, marginBottom: '0.3rem' }}>Today from Ethan</p>
        <p style={{ fontSize: '0.95rem', color: c.ink, fontStyle: 'italic', lineHeight: 1.55 }}>{note.message}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.faint, fontSize: '1.1rem', lineHeight: 1, padding: '0.1rem 0.3rem', borderRadius: radius.sm, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
}
