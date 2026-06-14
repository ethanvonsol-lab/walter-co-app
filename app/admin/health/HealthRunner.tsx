'use client'

import { useState } from 'react'
import { btn, eyebrow, muted } from '@/components/admin-ui'

export default function HealthRunner() {
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<{ checked: number; healthy: number; broken: Array<{ id: string; name: string; reason?: string | null; error?: string | null }> } | null>(null)

  const run = async () => {
    setRunning(true)
    const res = await fetch('/api/admin/health-check', { method: 'POST' })
    setSummary(await res.json())
    setRunning(false)
    // The table is rendered server-side; refresh so the new snapshots appear.
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={eyebrow}>Manual check</p>
          <p style={{ ...muted, fontSize: '0.85rem', marginTop: '0.4rem' }}>Ping every active client&apos;s IG token now. Stores a snapshot.</p>
        </div>
        <button onClick={run} disabled={running} style={{ ...btn, opacity: running ? 0.6 : 1 }}>
          {running ? 'Pinging Meta…' : 'Run health check'}
        </button>
      </div>
      {summary && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f4f5', borderRadius: 10 }}>
          <p style={{ fontSize: '0.88rem', color: '#222' }}>
            Checked <strong>{summary.checked}</strong> · <strong style={{ color: '#15803d' }}>{summary.healthy}</strong> healthy · <strong style={{ color: '#b91c1c' }}>{summary.broken.length}</strong> broken
          </p>
          {summary.broken.length > 0 && (
            <ul style={{ marginTop: '0.6rem', paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#444' }}>
              {summary.broken.map(b => <li key={b.id}>{b.name} · {b.reason}{b.error ? ` (${b.error})` : ''}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
