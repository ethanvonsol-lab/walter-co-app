'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, fontSerif, card, label, pageTitle, muted, statNumber, tabular } from '@/lib/theme'

// ── shared bits ──────────────────────────────────────────────────────────────
function Delta({ pct }: { pct: number }) {
  const flat = pct === 0
  const up = pct > 0
  const color = flat ? c.faint : up ? c.good : c.bad
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.74rem', fontWeight: 500, color, ...tabular }}>
      {flat ? '—' : up ? '↑' : '↓'} {Math.abs(pct)}% <span style={{ color: c.faint, fontWeight: 400 }}>7d</span>
    </span>
  )
}

function forecastNext(seriesIn: number[], steps: number): number[] {
  const n = seriesIn.length
  if (n < 2) return Array(steps).fill(seriesIn[n - 1] || 0)
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  seriesIn.forEach((y, x) => { sx += x; sy += y; sxy += x * y; sxx += x * x })
  const denom = n * sxx - sx * sx
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0
  const intercept = (sy - slope * sx) / n
  return Array.from({ length: steps }, (_, i) => Math.max(0, intercept + slope * (n + i)))
}

function AreaForecast({ actual, forecast, height = 200 }: { actual: number[]; forecast: number[]; height?: number }) {
  const W = 600, H = height
  const all = [...actual, ...forecast]
  const max = Math.max(...all, 1)
  const n = all.length
  const px = (i: number) => (i / Math.max(n - 1, 1)) * W
  const py = (v: number) => H - (v / max) * (H - 16) - 8
  const line = (vals: number[], offset: number) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${px(offset + i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  const actualLine = line(actual, 0)
  const area = `${actualLine} L${px(actual.length - 1).toFixed(1)},${H} L0,${H} Z`
  const fcLine = line([actual[actual.length - 1] ?? 0, ...forecast], actual.length - 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: `${H}px`, display: 'block' }} aria-hidden="true">
      <path d={area} fill={c.ink} fillOpacity="0.05" />
      <path d={actualLine} fill="none" stroke={c.ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={fcLine} fill="none" stroke={c.faint} strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Buying-intent heuristic (mirrors the leads page) for the quality distribution.
function scoreLead(intent: string, createdAt: string): number {
  const t = (intent || '').toLowerCase()
  let s = 20
  const high = ['buy', 'purchase', 'book', 'sign up', 'signup', 'invest', 'hire', 'ready', 'join', 'enroll', 'work with', 'get started']
  const pricing = ['price', 'cost', 'how much', 'pricing', 'quote', 'rate', 'fee']
  const interest = ['interested', 'want', 'looking', 'need', 'keen', 'curious', 'info', 'details', 'available']
  if (high.some(k => t.includes(k))) s += 40
  if (pricing.some(k => t.includes(k))) s += 25
  if (interest.some(k => t.includes(k))) s += 15
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t) || t.includes('email')) s += 20
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hrs <= 24) s += 12; else if (hrs <= 72) s += 6
  return Math.max(0, Math.min(100, Math.round(s)))
}

interface LeadRow { intent_summary: string; status: string; created_at: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, replied: 0, leads: 0, escalated: 0 })
  const [series30, setSeries30] = useState<number[]>(Array(30).fill(0))
  const [week, setWeek] = useState({ dMsgs: 0, dLeads: 0, dConv: 0, conv: 0 })
  const [heat, setHeat] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)))
  const [quality, setQuality] = useState({ hot: 0, warm: 0, cold: 0 })
  const [keywords, setKeywords] = useState<{ word: string; count: number }[]>([])
  const [avgDealValue, setAvgDealValue] = useState(1500)
  const [mrr, setMrr] = useState(0)

  const [insights, setInsights] = useState<string[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); setInsightsLoading(false); return }
      const { data: client } = await supabase.from('clients').select('id, avg_deal_value, mrr').eq('email', user.email).maybeSingle()
      if (!client) { setLoading(false); setInsightsLoading(false); return }
      if (client.avg_deal_value) setAvgDealValue(client.avg_deal_value)
      if (client.mrr) setMrr(client.mrr)

      const [{ data: msgs }, { data: leads }] = await Promise.all([
        supabase.from('messages').select('content, is_lead, status, created_at').eq('client_id', client.id),
        supabase.from('leads').select('intent_summary, status, created_at').eq('client_id', client.id),
      ])

      const m = msgs || []
      setStats({
        total: m.length,
        replied: m.filter(x => x.status === 'replied').length,
        leads: m.filter(x => x.is_lead).length,
        escalated: m.filter(x => x.status === 'escalated').length,
      })

      const now = Date.now()
      const s = Array(30).fill(0)
      const ls = Array(30).fill(0)
      const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
      const wordMap: Record<string, number> = {}
      m.forEach(x => {
        const d = new Date(x.created_at)
        const daysAgo = Math.floor((now - d.getTime()) / 86400000)
        if (daysAgo < 30) { s[29 - daysAgo]++; if (x.is_lead) ls[29 - daysAgo]++ }
        grid[d.getDay()][d.getHours()]++
        ;(x.content || '').toLowerCase().split(/\s+/).forEach((w: string) => {
          const clean = w.replace(/[^a-z]/g, '')
          if (clean.length > 3) wordMap[clean] = (wordMap[clean] || 0) + 1
        })
      })
      setSeries30(s)
      setHeat(grid)
      setKeywords(Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word, count]) => ({ word, count })))

      const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
      const m7 = sum(s.slice(23)), mPrev = sum(s.slice(16, 23))
      const l7 = sum(ls.slice(23)), lPrev = sum(ls.slice(16, 23))
      const pctd = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0)
      const conv = m7 > 0 ? Math.round((l7 / m7) * 100) : 0
      const convPrev = mPrev > 0 ? Math.round((lPrev / mPrev) * 100) : 0
      setWeek({ dMsgs: pctd(m7, mPrev), dLeads: pctd(l7, lPrev), dConv: pctd(conv, convPrev), conv })

      const q = { hot: 0, warm: 0, cold: 0 }
      ;(leads as LeadRow[] | null || []).forEach(l => {
        const sc = scoreLead(l.intent_summary, l.created_at)
        if (sc >= 70) q.hot++; else if (sc >= 40) q.warm++; else q.cold++
      })
      setQuality(q)
      setLoading(false)

      fetch('/api/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: client.id }),
      })
        .then(r => r.json())
        .then(data => setInsights(data.insights || []))
        .catch(() => setInsights(["Walter couldn't generate insights right now."]))
        .finally(() => setInsightsLoading(false))
    }
    run()
  }, [])

  const conversion = stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0
  const fc14 = forecastNext(series30, 14)
  const projDMs = Math.round(forecastNext(series30, 30).reduce((a, b) => a + b, 0))
  const projLeads = Math.round(projDMs * (week.conv / 100))
  const projPipeline = projLeads * avgDealValue
  const costPerLead = mrr > 0 && stats.leads > 0 ? Math.round(mrr / stats.leads) : 0
  const valuePerDM = stats.total > 0 ? Math.round((stats.leads * avgDealValue) / stats.total) : 0
  const heatMax = Math.max(1, ...heat.flat())

  const ledger: { l: string; v: string | number; d?: number; sub?: string }[] = [
    { l: 'Total DMs', v: stats.total, sub: 'all time' },
    { l: 'Replies', v: stats.replied, sub: stats.total ? `${Math.round((stats.replied / stats.total) * 100)}% reply rate` : '—' },
    { l: 'Leads', v: stats.leads, d: week.dLeads },
    { l: 'Conversion', v: `${conversion}%`, d: week.dConv },
    { l: 'Pipeline', v: `$${(quality.hot + quality.warm > 0 ? (quality.hot + quality.warm) * avgDealValue : 0).toLocaleString()}`, sub: `${quality.hot + quality.warm} open` },
  ]

  const shimmer = (w: number, i: number) => (
    <div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f0f0f1,#e7e7e9,#f0f0f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
  )
  const sectionLabel: React.CSSProperties = { ...label, marginBottom: '0.3rem' }
  const sectionSub: React.CSSProperties = { color: c.faint, fontSize: '0.8rem', marginBottom: '1.4rem' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Analytics" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem', overflowY: 'auto', maxWidth: 1180 }}>

        <div style={{ paddingBottom: '1.1rem', borderBottom: `1px solid ${c.border}`, marginBottom: '1.25rem' }}>
          <p style={{ ...label, marginBottom: '0.4rem' }}>Reporting</p>
          <h1 style={pageTitle}>Analytics</h1>
          <p style={{ ...muted, marginTop: '0.4rem' }}>How your AI is performing — and where it&apos;s heading.</p>
        </div>

        {/* Walter's read */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <p style={{ ...label, color: c.ink, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem' }}>✦</span> Walter&apos;s read
          </p>
          {insightsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>{[88, 76, 82].map(shimmer)}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {insights.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.ink, marginTop: '0.5rem', flexShrink: 0 }} />
                  <p style={{ color: c.body, fontSize: '0.95rem', lineHeight: 1.55 }}>{line}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ledger */}
        <div style={{ ...card, padding: 0, marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', overflow: 'hidden' }}>
          {ledger.map((m, i) => (
            <div key={m.l} style={{ padding: '1.25rem 1.35rem', borderLeft: i > 0 ? `1px solid ${c.border}` : 'none' }}>
              <p style={{ ...label, marginBottom: '0.7rem' }}>{m.l}</p>
              <p style={{ ...statNumber, marginBottom: '0.5rem' }}>{m.v}</p>
              {m.d !== undefined ? <Delta pct={m.d} /> : <p style={{ color: c.faint, fontSize: '0.74rem' }}>{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Trend + forecast */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div>
              <p style={sectionLabel}>Volume & forecast</p>
              <p style={{ color: c.faint, fontSize: '0.8rem' }}>DMs — last 30 days, 14-day projection</p>
            </div>
            <Delta pct={week.dMsgs} />
          </div>
          <AreaForecast actual={series30} forecast={fc14} />
          <p style={{ fontSize: '0.85rem', color: c.muted, lineHeight: 1.6, borderTop: `1px solid ${c.border}`, paddingTop: '0.9rem', marginTop: '0.9rem' }}>
            On your last 30 days&apos; trend, you&apos;re on track for about <strong style={{ color: c.ink, fontWeight: 600 }}>{projDMs} DMs</strong> and <strong style={{ color: c.ink, fontWeight: 600 }}>{projLeads} leads</strong> next month{projPipeline > 0 ? <> — roughly <strong style={{ color: c.ink, fontWeight: 600 }}>${projPipeline.toLocaleString()}</strong> of new pipeline</> : ''}.
          </p>
        </div>

        {/* Heatmap — when DMs land */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <p style={sectionLabel}>When your DMs land</p>
          <p style={sectionSub}>Busiest day & hour — darker is busier. Be around for your windows.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {heat.map((row, di) => (
              <div key={di} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '30px', fontSize: '0.68rem', color: c.faint, flexShrink: 0 }}>{DAYS[di]}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px', flex: 1 }}>
                  {row.map((v, hi) => (
                    <div key={hi} title={`${DAYS[di]} ${hi}:00 — ${v}`} style={{ aspectRatio: '1 / 1', borderRadius: '2px', background: v === 0 ? c.surfaceAlt : `rgba(9,9,11,${(0.12 + 0.88 * (v / heatMax)).toFixed(2)})` }} />
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ width: '30px', flexShrink: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px', flex: 1, fontSize: '0.6rem', color: c.faint }}>
                {Array.from({ length: 24 }).map((_, h) => <span key={h} style={{ textAlign: 'center' }}>{h % 6 === 0 ? h : ''}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Funnel + Lead quality */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={card}>
            <p style={sectionLabel}>Conversion funnel</p>
            <p style={sectionSub}>Message to escalation</p>
            {[
              { label: 'Messages received', value: stats.total, pct: 100 },
              { label: 'Replied by AI', value: stats.replied, pct: stats.total ? Math.round((stats.replied / stats.total) * 100) : 0 },
              { label: 'Identified as leads', value: stats.leads, pct: stats.total ? Math.round((stats.leads / stats.total) * 100) : 0 },
              { label: 'Escalated', value: stats.escalated, pct: stats.total ? Math.round((stats.escalated / stats.total) * 100) : 0 },
            ].map((row, i) => (
              <div key={i} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <p style={{ color: c.muted, fontSize: '0.8rem' }}>{row.label}</p>
                  <p style={{ ...tabular, color: c.ink, fontSize: '0.8rem', fontWeight: 500 }}>{row.value} <span style={{ color: c.faint, fontWeight: 400 }}>· {row.pct}%</span></p>
                </div>
                <div style={{ background: c.surfaceAlt, borderRadius: '4px', height: '5px' }}>
                  <div style={{ background: c.ink, borderRadius: '4px', height: '5px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={sectionLabel}>Lead quality</p>
            <p style={sectionSub}>Buying intent across all leads</p>
            {([
              { k: 'Hot', n: quality.hot, hint: 'score 70+' },
              { k: 'Warm', n: quality.warm, hint: '40–69' },
              { k: 'Cold', n: quality.cold, hint: 'under 40' },
            ]).map((row, i) => {
              const totalQ = quality.hot + quality.warm + quality.cold
              const pct = totalQ ? Math.round((row.n / totalQ) * 100) : 0
              return (
                <div key={i} style={{ marginBottom: '1.1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <p style={{ color: c.body, fontSize: '0.82rem' }}>{row.k} <span style={{ color: c.faint, fontSize: '0.72rem' }}>{row.hint}</span></p>
                    <p style={{ ...tabular, color: c.ink, fontSize: '0.8rem', fontWeight: 500 }}>{row.n}</p>
                  </div>
                  <div style={{ background: c.surfaceAlt, borderRadius: '4px', height: '5px' }}>
                    <div style={{ background: c.ink, opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.3, borderRadius: '4px', height: '5px', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Themes + Unit economics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={card}>
            <p style={sectionLabel}>Top intent themes</p>
            <p style={sectionSub}>What people ask about most</p>
            {keywords.length === 0 ? (
              <p style={{ color: c.faint, fontSize: '0.85rem' }}>No data yet</p>
            ) : keywords.map((kw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                <p style={{ color: c.body, fontSize: '0.82rem', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.word}</p>
                <div style={{ flex: 1, background: c.surfaceAlt, borderRadius: '4px', height: '5px' }}>
                  <div style={{ background: c.ink, borderRadius: '4px', height: '5px', width: `${(kw.count / (keywords[0]?.count || 1)) * 100}%` }} />
                </div>
                <p style={{ ...tabular, color: c.faint, fontSize: '0.78rem', width: '24px', textAlign: 'right' }}>{kw.count}</p>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={sectionLabel}>Unit economics</p>
            <p style={sectionSub}>What the automation is worth</p>
            {([
              { k: 'Value per lead', v: `$${avgDealValue.toLocaleString()}`, hint: 'your avg deal value' },
              { k: 'Value per DM', v: `$${valuePerDM.toLocaleString()}`, hint: 'pipeline ÷ all DMs' },
              { k: 'Cost per lead', v: costPerLead > 0 ? `$${costPerLead.toLocaleString()}` : '—', hint: costPerLead > 0 ? 'monthly fee ÷ leads' : 'set your plan in admin' },
              { k: 'Projected revenue · 30d', v: projPipeline > 0 ? `$${projPipeline.toLocaleString()}` : '—', hint: 'from your trend' },
            ]).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.7rem 0', borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                <div>
                  <p style={{ color: c.body, fontSize: '0.85rem' }}>{row.k}</p>
                  <p style={{ color: c.faint, fontSize: '0.72rem', marginTop: '0.1rem' }}>{row.hint}</p>
                </div>
                <p style={{ ...tabular, fontFamily: fontSerif, fontSize: '1.35rem', fontWeight: 500, color: c.ink }}>{row.v}</p>
              </div>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: c.faint, fontSize: '0.85rem', marginTop: '1rem' }}>Loading…</p>}
      </main>
    </div>
  )
}
