'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }
const eyebrow: React.CSSProperties = { color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0, replied: 0 })
  const [series, setSeries] = useState<number[]>(Array(30).fill(0))
  const [leadSeries, setLeadSeries] = useState<number[]>(Array(30).fill(0))
  const [topKeywords, setTopKeywords] = useState<{ word: string, count: number }[]>([])
  const [weekDelta, setWeekDelta] = useState(0)
  const [loading, setLoading] = useState(true)

  const [insights, setInsights] = useState<string[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle()
      if (!client) { setLoading(false); setInsightsLoading(false); return }

      const { data: msgs } = await supabase
        .from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false })

      if (msgs) {
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
          replied: msgs.filter(m => m.status === 'replied').length,
        })

        const days = Array(30).fill(0)
        const leadDays = Array(30).fill(0)
        const now = new Date()
        const wordMap: Record<string, number> = {}
        let last7 = 0, prev7 = 0

        msgs.forEach(m => {
          const daysAgo = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400000)
          if (daysAgo < 30) {
            days[29 - daysAgo]++
            if (m.is_lead) leadDays[29 - daysAgo]++
          }
          if (daysAgo < 7) last7++
          else if (daysAgo < 14) prev7++
          ;(m.content || '').toLowerCase().split(/\s+/).forEach((w: string) => {
            const clean = w.replace(/[^a-z]/g, '')
            if (clean.length > 3) wordMap[clean] = (wordMap[clean] || 0) + 1
          })
        })

        setSeries(days)
        setLeadSeries(leadDays)
        setWeekDelta(prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 > 0 ? 100 : 0))
        setTopKeywords(
          Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word, count]) => ({ word, count }))
        )
      }
      setLoading(false)

      // AI insights — Walter reads the numbers and tells you what to do.
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
        .then(r => r.json())
        .then(data => setInsights(data.insights || []))
        .catch(() => setInsights(["Walter couldn't generate insights right now."]))
        .finally(() => setInsightsLoading(false))
    }
    fetchData()
  }, [])

  const conversionRate = stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0
  const maxSeries = Math.max(...series, 1)

  // 30-day line + area path (viewBox 0 0 600 150).
  const pts = series.map((v, i) => [(i / 29) * 600, 150 - (v / maxSeries) * 130])
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L600,150 L0,150 Z`
  const maxLead = Math.max(...leadSeries, 1)

  const dateLabel = (i: number) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Analytics" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem', overflowY: 'auto' }}>

        <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ ...eyebrow, fontSize: '0.62rem', letterSpacing: '0.25em', marginBottom: '0.5rem' }}>Reporting</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Analytics</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Performance overview for your Instagram automation.</p>
        </div>

        {/* AI Insights */}
        <div style={{ ...card, padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ ...eyebrow, color: '#111', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem' }}>✦</span> Walter&apos;s Read
          </p>
          {insightsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {[88, 76, 82].map((w, i) => (
                <div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {insights.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#111', marginTop: '0.55rem', flexShrink: 0 }} />
                  <p style={{ color: '#333', fontSize: '1rem', lineHeight: '1.5', fontWeight: 300 }}>{line}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Messages', value: stats.total },
                { label: 'Replies Sent', value: stats.replied },
                { label: 'Leads Captured', value: stats.leads },
                { label: 'Conversion Rate', value: `${conversionRate}%` },
              ].map(stat => (
                <div key={stat.label} style={card}>
                  <p style={{ ...eyebrow, marginBottom: '1rem' }}>{stat.label}</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', lineHeight: 1 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* 30-day trend */}
            <div style={{ ...card, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Message Volume</p>
                  <p style={{ color: '#ccc', fontSize: '0.75rem' }}>Incoming DMs — last 30 days</p>
                </div>
                <p style={{ fontSize: '0.8rem', color: weekDelta >= 0 ? '#1d9e75' : '#cc4444' }}>
                  {weekDelta >= 0 ? '↑' : '↓'} {Math.abs(weekDelta)}% vs prior week
                </p>
              </div>
              <svg viewBox="0 0 600 150" preserveAspectRatio="none" style={{ width: '100%', height: '180px', display: 'block' }}>
                <path d={areaPath} fill="#111" fillOpacity="0.04" />
                <path d={linePath} fill="none" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ color: '#ccc', fontSize: '0.6rem' }}>{dateLabel(0)}</span>
                <span style={{ color: '#ccc', fontSize: '0.6rem' }}>{dateLabel(15)}</span>
                <span style={{ color: '#ccc', fontSize: '0.6rem' }}>{dateLabel(29)}</span>
              </div>
            </div>

            {/* Keywords + Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={card}>
                <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Top Keywords</p>
                <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Most common words in incoming messages</p>
                {topKeywords.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '0.8rem' }}>No data yet</p>
                ) : topKeywords.map((kw, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
                    <p style={{ color: '#888', fontSize: '0.8rem', width: '80px' }}>{kw.word}</p>
                    <div style={{ flex: 1, background: '#f5f5f3', borderRadius: '3px', height: '3px' }}>
                      <div style={{ background: '#111', borderRadius: '3px', height: '3px', width: `${(kw.count / (topKeywords[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <p style={{ color: '#ccc', fontSize: '0.75rem', width: '20px', textAlign: 'right' }}>{kw.count}</p>
                  </div>
                ))}
              </div>

              <div style={card}>
                <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Conversion Funnel</p>
                <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.5rem' }}>From message to lead</p>
                {[
                  { label: 'Messages Received', value: stats.total, pct: 100 },
                  { label: 'Replied by AI', value: stats.replied, pct: stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0 },
                  { label: 'Identified as Leads', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
                  { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
                ].map((row, i) => (
                  <div key={i} style={{ marginBottom: '1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <p style={{ color: '#888', fontSize: '0.78rem' }}>{row.label}</p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <p style={{ color: '#ccc', fontSize: '0.75rem' }}>{row.pct}%</p>
                        <p style={{ color: '#111', fontSize: '0.75rem', width: '20px', textAlign: 'right' }}>{row.value}</p>
                      </div>
                    </div>
                    <div style={{ background: '#f5f5f3', borderRadius: '3px', height: '3px' }}>
                      <div style={{ background: '#111', borderRadius: '3px', height: '3px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead volume sparkbars */}
            <div style={{ ...card, marginBottom: '1.5rem' }}>
              <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Lead Volume</p>
              <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Leads captured — last 30 days</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '70px' }}>
                {leadSeries.map((val, i) => (
                  <div key={i} style={{ flex: 1, background: val > 0 ? '#111' : '#f3f3f1', borderRadius: '2px 2px 0 0', height: `${Math.max((val / maxLead) * 100, val > 0 ? 10 : 4)}%`, transition: 'height 0.3s ease' }} title={`${dateLabel(i)}: ${val}`} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
