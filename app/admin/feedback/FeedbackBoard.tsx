'use client'

import { useMemo, useState } from 'react'
import { c, font, radius, card, input as themeInput } from '@/lib/theme'
import { Pill } from '@/components/admin-ui'

export interface FeedbackRow {
  id: string
  client_id: string | null
  client_name: string
  type: string
  title: string
  details: string | null
  priority: string
  status: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = { bug: '🐞 Bug', idea: '💡 Idea', tweak: '🔧 Tweak' }
const STATUSES = ['new', 'in_progress', 'done']
const STATUS_LABEL: Record<string, string> = { new: 'New', in_progress: 'In progress', done: 'Done' }
const PRIORITIES = ['low', 'medium', 'high']

export default function FeedbackBoard({ initial }: { initial: FeedbackRow[] }) {
  const [rows, setRows] = useState(initial)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r =>
      (typeFilter === 'all' || r.type === typeFilter) &&
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || r.title.toLowerCase().includes(q) || r.client_name.toLowerCase().includes(q) || (r.details || '').toLowerCase().includes(q))
    )
  }, [rows, typeFilter, statusFilter, search])

  const counts = useMemo(() => ({
    new: rows.filter(r => r.status === 'new').length,
    in_progress: rows.filter(r => r.status === 'in_progress').length,
    done: rows.filter(r => r.status === 'done').length,
  }), [rows])

  const patch = async (id: string, body: Record<string, string>) => {
    setBusyId(id)
    const prev = rows
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...body } : r)))
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) setRows(prev) // revert on failure
    setBusyId(null)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this feedback permanently?')) return
    setBusyId(id)
    const prev = rows
    setRows(rs => rs.filter(r => r.id !== id))
    const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' })
    if (!res.ok) setRows(prev)
    setBusyId(null)
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.85rem', borderRadius: radius.md, border: `1px solid ${active ? c.ink : c.border}`,
    background: active ? c.ink : c.surface, color: active ? '#fff' : c.muted,
    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: font, transition: 'all 0.12s', textTransform: 'capitalize',
  })

  const priorityTone = (p: string) => (p === 'high' ? 'bad' : p === 'medium' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral'

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['all', 'bug', 'idea', 'tweak'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={chip(typeFilter === t)}>{t === 'all' ? 'All types' : t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={chip(statusFilter === s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}{s !== 'all' ? ` (${counts[s as keyof typeof counts]})` : ''}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or client…"
          style={{ ...themeInput, maxWidth: 240, marginLeft: 'auto' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '3rem 1rem', color: c.faint }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗳️</p>
          <p style={{ fontSize: '0.9rem' }}>{rows.length === 0 ? 'No feedback yet.' : 'Nothing matches those filters.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...card, opacity: busyId === r.id ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: c.muted }}>{TYPE_LABEL[r.type] ?? r.type}</span>
                    <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>
                    <span style={{ fontSize: '0.78rem', color: c.faint }}>· {r.client_name}</span>
                    <span style={{ fontSize: '0.74rem', color: c.faint }}>· {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: c.ink, marginBottom: r.details ? '0.3rem' : 0 }}>{r.title}</p>
                  {r.details && <p style={{ fontSize: '0.85rem', color: c.body, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.details}</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                  {/* Status segmented control */}
                  <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: 'hidden' }}>
                    {STATUSES.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => patch(r.id, { status: s })}
                        disabled={busyId === r.id}
                        style={{
                          padding: '0.35rem 0.7rem', border: 'none', cursor: 'pointer', fontFamily: font,
                          fontSize: '0.74rem', fontWeight: 500,
                          borderLeft: i > 0 ? `1px solid ${c.border}` : 'none',
                          background: r.status === s ? c.ink : c.surface,
                          color: r.status === s ? '#fff' : c.muted,
                        }}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <select
                      value={r.priority}
                      onChange={e => patch(r.id, { priority: e.target.value })}
                      disabled={busyId === r.id}
                      style={{ ...themeInput, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.76rem', cursor: 'pointer' }}
                    >
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busyId === r.id}
                      style={{ padding: '0.3rem 0.6rem', borderRadius: radius.sm, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, cursor: 'pointer', fontSize: '0.74rem', fontFamily: font }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
