'use client'

import { useMemo, useState } from 'react'
import { Pill } from '@/components/admin-ui'
import { c, font, radius } from '@/lib/theme'

export interface ClientRow {
  id: string
  name: string | null
  email: string
  industry: string | null
  status: string
  plan: string
  mrr: number
  agency_id: string | null
  connected: boolean
  using_own_token: boolean
  dms_7d: number
  leads_7d: number
  created_at: string
}

type SortKey = 'name' | 'mrr' | 'dms_7d' | 'leads_7d' | 'created_at'

export default function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'churned'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!needle) return true
      return (
        (r.name || '').toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        (r.industry || '').toLowerCase().includes(needle)
      )
    })
    list.sort((a, b) => {
      const av = a[sortKey] as string | number | null
      const bv = b[sortKey] as string | number | null
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, q, statusFilter, sortKey, sortDir])

  const sort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('desc') }
  }

  const th: React.CSSProperties = { textAlign: 'left', padding: '0.7rem 0.6rem', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: c.faint, borderBottom: `1px solid ${c.border}`, cursor: 'pointer', userSelect: 'none' }
  const td: React.CSSProperties = { padding: '0.8rem 0.6rem', fontSize: '0.9rem', color: c.body, borderBottom: `1px solid ${c.border}` }

  const filterBtn = (val: typeof statusFilter): React.CSSProperties => ({
    padding: '0.4rem 0.85rem', borderRadius: radius.pill, fontSize: '0.72rem', fontWeight: 500,
    textTransform: 'capitalize', border: `1px solid ${statusFilter === val ? c.ink : c.border}`, cursor: 'pointer',
    background: statusFilter === val ? c.ink : c.surface, color: statusFilter === val ? '#fff' : c.muted,
    fontFamily: font,
  })

  const planTone = (p: string): 'good' | 'warn' | 'neutral' =>
    p === 'agency' || p === 'whitelabel' ? 'good' : 'neutral'

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name, email, industry…"
          style={{ flex: 1, minWidth: 240, padding: '0.5rem 0.8rem', border: `1px solid ${c.border}`, borderRadius: radius.md, fontSize: '0.9rem', fontFamily: font, outline: 'none', background: c.surfaceAlt, color: c.ink }}
        />
        <button style={filterBtn('all')} onClick={() => setStatusFilter('all')}>All</button>
        <button style={filterBtn('active')} onClick={() => setStatusFilter('active')}>Active</button>
        <button style={filterBtn('paused')} onClick={() => setStatusFilter('paused')}>Paused</button>
        <button style={filterBtn('churned')} onClick={() => setStatusFilter('churned')}>Churned</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th} onClick={() => sort('name')}>Client</th>
              <th style={th}>Plan</th>
              <th style={th} onClick={() => sort('mrr')}>MRR</th>
              <th style={th}>IG</th>
              <th style={th} onClick={() => sort('dms_7d')}>DMs · 7d</th>
              <th style={th} onClick={() => sort('leads_7d')}>Leads · 7d</th>
              <th style={th}>Status</th>
              <th style={th} onClick={() => sort('created_at')}>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#999', padding: '2rem' }}>No clients match.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { window.location.href = `/admin/clients/${r.id}` }}>
                <td style={td}>
                  <p style={{ color: '#111', fontSize: '0.95rem' }}>{r.name || '—'}</p>
                  <p style={{ color: '#999', fontSize: '0.75rem', marginTop: 2 }}>{r.email}{r.industry ? ` · ${r.industry}` : ''}</p>
                </td>
                <td style={td}><Pill tone={planTone(r.plan)}>{r.plan}</Pill></td>
                <td style={td}>${(r.mrr || 0).toLocaleString()}</td>
                <td style={td}>
                  {r.connected
                    ? <Pill tone={r.using_own_token ? 'good' : 'warn'}>{r.using_own_token ? 'own token' : 'shared'}</Pill>
                    : <Pill tone="bad">none</Pill>}
                </td>
                <td style={td}>{r.dms_7d}</td>
                <td style={td}>{r.leads_7d}</td>
                <td style={td}>
                  {r.status === 'active' ? <Pill tone="good">active</Pill>
                    : r.status === 'paused' ? <Pill tone="warn">paused</Pill>
                    : <Pill tone="bad">churned</Pill>}
                </td>
                <td style={{ ...td, color: '#888', fontSize: '0.78rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
