'use client'

import { useEffect, useState } from 'react'
import { card, eyebrow, muted } from '@/components/admin-ui'

interface Flag { client: string; issue: string; severity: 'high' | 'med' | 'low' }

export default function FleetBriefing() {
  const [briefing, setBriefing] = useState('')
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/briefing', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        setBriefing(d.briefing || '')
        setFlags(d.flags || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const sevColor = (s: Flag['severity']) =>
    s === 'high' ? '#b91c1c' : s === 'med' ? '#b45309' : '#555'

  return (
    <div style={card as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={eyebrow}>Walter Intelligence · Fleet briefing</p>
        <p style={{ ...muted, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{loading ? 'Reading…' : 'Updated just now'}</p>
      </div>
      {loading ? (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ height: 14, borderRadius: 4, background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite', marginBottom: 8 }} />
          <div style={{ height: 14, width: '80%', borderRadius: 4, background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
        </div>
      ) : (
        <>
          <p style={{ marginTop: '1rem', color: '#222', fontSize: '1.05rem', lineHeight: 1.55 }}>{briefing}</p>
          {flags.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {flags.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', background: '#f4f4f5', borderRadius: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: sevColor(f.severity), flexShrink: 0 }} />
                  <span style={{ fontSize: '0.88rem', color: '#111', fontWeight: 500 }}>{f.client}</span>
                  <span style={{ fontSize: '0.85rem', color: '#555', flex: 1 }}>{f.issue}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes waltershimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  )
}
