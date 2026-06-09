'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0, replied: 0 })
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [leadChart, setLeadChart] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [topKeywords, setTopKeywords] = useState<{ word: string, count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (!client) return

      const { data: msgs } = await supabase
        .from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false })

      if (msgs) {
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
          replied: msgs.filter(m => m.status === 'replied').length,
        })

        const days = Array(7).fill(0)
        const leadDays = Array(7).fill(0)
        const now = new Date()
        const wordMap: Record<string, number> = {}

        msgs.forEach(m => {
          const daysAgo = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24))
          if (daysAgo < 7) {
            days[6 - daysAgo]++
            if (m.is_lead) leadDays[6 - daysAgo]++
          }
          m.content?.toLowerCase().split(/\s+/).forEach((w: string) => {
            const clean = w.replace(/[^a-z]/g, '')
            if (clean.length > 3) wordMap[clean] = (wordMap[clean] || 0) + 1
          })
        })

        setChartData(days)
        setLeadChart(leadDays)
        setTopKeywords(
          Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word, count]) => ({ word, count }))
        )
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const getDayLabel = (i: number) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en', { weekday: 'short' })
  }

  const maxChart = Math.max(...chartData, 1)
  const maxLead = Math.max(...leadChart, 1)
  const conversionRate = stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0

  const card = { background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Analytics" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem', overflowY: 'auto' }}>

        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reporting</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Analytics</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Performance overview for your Instagram automation.</p>
        </div>

        {loading ? (
          <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Messages', value: stats.total },
                { label: 'Replies Sent', value: stats.replied },
                { label: 'Leads Captured', value: stats.leads },
                { label: 'Conversion Rate', value: `${conversionRate}%` },
              ].map(stat => (
                <div key={stat.label} style={card}>
                  <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>{stat.label}</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', lineHeight: 1 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={card}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Reply Volume</p>
                <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.75rem' }}>Messages replied to — last 7 days</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '110px' }}>
                  {chartData.map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                      <p style={{ color: '#ddd', fontSize: '0.6rem' }}>{val || ''}</p>
                      <div style={{ width: '100%', background: val > 0 ? '#111' : '#f0f0ee', borderRadius: '3px 3px 0 0', height: `${Math.max((val / maxChart) * 100, val > 0 ? 8 : 3)}%` }} />
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{getDayLabel(i)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Lead Volume</p>
                <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.75rem' }}>Leads captured — last 7 days</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '110px' }}>
                  {leadChart.map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                      <p style={{ color: '#ddd', fontSize: '0.6rem' }}>{val || ''}</p>
                      <div style={{ width: '100%', background: val > 0 ? '#555' : '#f0f0ee', borderRadius: '3px 3px 0 0', height: `${Math.max((val / maxLead) * 100, val > 0 ? 8 : 3)}%` }} />
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{getDayLabel(i)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Keywords + Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={card}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Top Keywords</p>
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
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Conversion Funnel</p>
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
          </>
        )}
      </main>
    </div>
  )
}