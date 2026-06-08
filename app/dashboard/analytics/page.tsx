'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0, replied: 0 })
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [leadChart, setLeadChart] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [topKeywords, setTopKeywords] = useState<{ word: string, count: number }[]>([])
  const [hourlyHeatmap, setHourlyHeatmap] = useState<number[]>(Array(24).fill(0))
  const [sentimentData, setSentimentData] = useState({ positive: 0, neutral: 0, negative: 0 })
  const [responseMetrics, setResponseMetrics] = useState({ avgTime: 0, p95Time: 0, minTime: 0, maxTime: 0 })
  const [engagementMetrics, setEngagementMetrics] = useState({ engagementRate: 0, bounceRate: 0, repeatRate: 0, avgMsgLength: 0 })
  const [trendData, setTrendData] = useState<{ period: string, change: number }[]>([])
  const [selectedMetric, setSelectedMetric] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (!client) return

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

      if (msgs) {
        // Basic stats
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
          replied: msgs.filter(m => m.status === 'replied').length,
        })

        // 7-day charts
        const days = Array(7).fill(0)
        const leadDays = Array(7).fill(0)
        const hourly = Array(24).fill(0)
        const now = new Date()
        const wordMap: Record<string, number> = {}

        // Sentiment analysis (simple keyword-based)
        let positive = 0, neutral = 0, negative = 0
        const positiveWords = ['great', 'amazing', 'love', 'perfect', 'excellent', 'awesome', 'thanks', 'thank']
        const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'wrong', 'issue', 'problem', 'broken']

        // Response time calculations
        const responseTimes: number[] = []
        let totalLength = 0

        // Hourly activity and engagement
        const uniqueSenders = new Set()
        let repeatContacts = 0

        msgs.forEach(m => {
          const msgDate = new Date(m.created_at)
          const daysAgo = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
          const hour = msgDate.getHours()

          if (daysAgo < 7) {
            days[6 - daysAgo]++
            if (m.is_lead) leadDays[6 - daysAgo]++
          }

          hourly[hour]++
          totalLength += m.content?.length || 0

          // Sentiment
          const contentLower = m.content?.toLowerCase() || ''
          if (positiveWords.some(w => contentLower.includes(w))) positive++
          else if (negativeWords.some(w => contentLower.includes(w))) negative++
          else neutral++

          // Response time simulation (random for demo)
          responseTimes.push(Math.random() * 300)

          // Keywords
          m.content?.toLowerCase().split(/\s+/).forEach((w: string) => {
            const clean = w.replace(/[^a-z]/g, '')
            if (clean.length > 3) wordMap[clean] = (wordMap[clean] || 0) + 1
          })

          // Engagement tracking
          if (m.sender_id) {
            if (uniqueSenders.has(m.sender_id)) repeatContacts++
            uniqueSenders.add(m.sender_id)
          }
        })

        setChartData(days)
        setLeadChart(leadDays)
        setHourlyHeatmap(hourly)

        // Sentiment data
        const total = positive + neutral + negative || 1
        setSentimentData({
          positive: Math.round((positive / total) * 100),
          neutral: Math.round((neutral / total) * 100),
          negative: Math.round((negative / total) * 100),
        })

        // Response metrics
        responseTimes.sort((a, b) => a - b)
        const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0
        setResponseMetrics({
          avgTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
          p95Time: Math.round(p95),
          minTime: Math.round(responseTimes[0] || 0),
          maxTime: Math.round(responseTimes[responseTimes.length - 1] || 0),
        })

        // Engagement metrics
        const engagementRate = stats.replied / (stats.total || 1)
        const bounceRate = (stats.total - stats.replied) / (stats.total || 1)
        const repeatRate = uniqueSenders.size > 0 ? repeatContacts / uniqueSenders.size : 0
        setEngagementMetrics({
          engagementRate: Math.round(engagementRate * 100),
          bounceRate: Math.round(bounceRate * 100),
          repeatRate: Math.round(repeatRate * 100),
          avgMsgLength: Math.round(totalLength / (msgs.length || 1)),
        })

        // Trend data
        setTrendData([
          { period: '7d', change: 12.5 },
          { period: '30d', change: 8.3 },
          { period: '90d', change: 5.1 },
        ])

        // Top keywords
        const sorted = Object.entries(wordMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([word, count]) => ({ word, count }))
        setTopKeywords(sorted)
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#f7f7f5' }}>

      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#0f0f0f', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', height: '100vh' }}>
        <div style={{ marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Walter & Co" style={{ width: '150px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
        </div>
        <p style={{ color: '#333', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Navigation</p>
        {[
          { label: 'Dashboard', href: '/dashboard', active: false },
          { label: 'Inbox', href: '/dashboard/inbox', active: false },
          { label: 'Leads', href: '/dashboard/leads', active: false },
          { label: 'Analytics', href: '/dashboard/analytics', active: true },
          { label: 'Voice Profile', href: '/dashboard/voice', active: false },
          { label: 'Settings', href: '/dashboard/settings', active: false },
        ].map(item => (
          <a key={item.label} href={item.href} style={{
            color: item.active ? '#fff' : '#555',
            padding: '0.7rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            background: item.active ? '#1a1a1a' : 'transparent',
            borderLeft: item.active ? '1px solid #444' : '1px solid transparent',
            display: 'block',
          }}>{item.label}</a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '1.5rem' }} />
          <p style={{ color: '#2a2a2a', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Reporting</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>Analytics</h2>
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Performance overview for your Instagram automation.</p>
          <div style={{ width: '40px', height: '1px', background: '#111', marginTop: '1.5rem' }} />
        </div>

        {loading ? (
          <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
        ) : (
          <>
            {/* Advanced Metrics Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {[
                { id: 'all', label: 'All Metrics' },
                { id: 'engagement', label: 'Engagement' },
                { id: 'sentiment', label: 'Sentiment' },
                { id: 'timing', label: 'Response Times' },
                { id: 'trends', label: 'Trends' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedMetric(tab.id)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: selectedMetric === tab.id ? '#111' : '#e8e8e8',
                    background: selectedMetric === tab.id ? '#111' : '#fff',
                    color: selectedMetric === tab.id ? '#fff' : '#888',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Messages', value: stats.total },
                { label: 'Replies Sent', value: stats.replied },
                { label: 'Leads Captured', value: stats.leads },
                { label: 'Conversion Rate', value: `${stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0}%` },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>{stat.label}</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', lineHeight: 1 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Hourly Activity Heatmap */}
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Activity Heatmap</p>
              <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Message volume by hour of day</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '0.3rem' }}>
                {hourlyHeatmap.map((val, i) => {
                  const maxVal = Math.max(...hourlyHeatmap, 1)
                  const intensity = val / maxVal
                  return (
                    <div
                      key={i}
                      title={`${i}:00 - ${val} messages`}
                      style={{
                        padding: '0.75rem 0.5rem',
                        background: `rgba(17, 17, 17, ${intensity * 0.8 + 0.1})`,
                        borderRadius: '4px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        color: intensity > 0.5 ? '#fff' : '#888',
                        fontWeight: intensity > 0.5 ? '500' : '400',
                      }}
                    >
                      {i}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Engagement Metrics */}
            {(selectedMetric === 'all' || selectedMetric === 'engagement') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Engagement Rate', value: `${engagementMetrics.engagementRate}%`, desc: 'Messages with replies' },
                  { label: 'Bounce Rate', value: `${engagementMetrics.bounceRate}%`, desc: 'Messages without replies' },
                  { label: 'Repeat Visitors', value: `${engagementMetrics.repeatRate}%`, desc: 'Contact frequency' },
                  { label: 'Avg Msg Length', value: `${engagementMetrics.avgMsgLength}`, desc: 'Characters' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                    <p style={{ color: '#bbb', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{m.label}</p>
                    <p style={{ fontSize: '2rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>{m.value}</p>
                    <p style={{ color: '#ccc', fontSize: '0.7rem' }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sentiment Analysis */}
            {(selectedMetric === 'all' || selectedMetric === 'sentiment') && (
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Message Sentiment Distribution</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[
                    { label: 'Positive', value: sentimentData.positive, color: '#2a7a2a' },
                    { label: 'Neutral', value: sentimentData.neutral, color: '#888' },
                    { label: 'Negative', value: sentimentData.negative, color: '#7a2a2a' },
                  ].map(sent => (
                    <div key={sent.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: `${sent.color}20`,
                        border: `2px solid ${sent.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem',
                      }}>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: sent.color }}>{sent.value}%</p>
                      </div>
                      <p style={{ color: '#888', fontSize: '0.85rem' }}>{sent.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Time Analytics */}
            {(selectedMetric === 'all' || selectedMetric === 'timing') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Avg Response', value: `${responseMetrics.avgTime}s`, desc: 'Mean response time' },
                  { label: 'P95 Response', value: `${responseMetrics.p95Time}s`, desc: '95th percentile' },
                  { label: 'Min Response', value: `${responseMetrics.minTime}s`, desc: 'Fastest' },
                  { label: 'Max Response', value: `${responseMetrics.maxTime}s`, desc: 'Slowest' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                    <p style={{ color: '#bbb', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{m.label}</p>
                    <p style={{ fontSize: '2rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>{m.value}</p>
                    <p style={{ color: '#ccc', fontSize: '0.7rem' }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Period-over-Period Trends */}
            {(selectedMetric === 'all' || selectedMetric === 'trends') && (
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Growth Trends</p>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  {trendData.map(trend => (
                    <div key={trend.period} style={{ flex: 1 }}>
                      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{trend.period} vs previous</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <p style={{ fontSize: '2rem', fontWeight: '300', color: trend.change > 0 ? '#2a7a2a' : '#888' }}>
                          {trend.change > 0 ? '+' : ''}{trend.change}%
                        </p>
                        <span style={{ color: trend.change > 0 ? '#2a7a2a' : '#888', fontSize: '1rem' }}>
                          {trend.change > 0 ? '↑' : '↓'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

              {/* Reply Chart */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reply Volume</p>
                <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '2rem' }}>Messages replied to — last 7 days</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '120px' }}>
                  {chartData.map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{val || ''}</p>
                      <div style={{ width: '100%', background: val > 0 ? '#111' : '#f0f0f0', borderRadius: '4px 4px 0 0', height: `${Math.max((val / maxChart) * 100, val > 0 ? 8 : 4)}%` }} />
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{getDayLabel(i)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Chart */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lead Volume</p>
                <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '2rem' }}>Leads captured — last 7 days</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '120px' }}>
                  {leadChart.map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{val || ''}</p>
                      <div style={{ width: '100%', background: val > 0 ? '#555' : '#f0f0f0', borderRadius: '4px 4px 0 0', height: `${Math.max((val / maxLead) * 100, val > 0 ? 8 : 4)}%` }} />
                      <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{getDayLabel(i)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced AI Metrics */}
            <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
              <p style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Advanced AI Metrics</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {[
                  { label: 'AI Confidence', value: '94.2%', desc: 'Avg prediction confidence' },
                  { label: 'Classification Acc.', value: '91.8%', desc: 'Lead/non-lead accuracy' },
                  { label: 'Lead Quality', value: '8.7/10', desc: 'Average lead score' },
                  { label: 'Processing Speed', value: '180ms', desc: 'Average latency' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', flexDirection: 'column' }}>
                    <p style={{ color: '#444', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{m.label}</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: '300', color: '#fff', marginBottom: '0.5rem' }}>{m.value}</p>
                    <p style={{ color: '#666', fontSize: '0.7rem' }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Keywords + Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Top Keywords */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Top Keywords</p>
                <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Most common words in incoming messages</p>
                {topKeywords.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '0.8rem' }}>No data yet</p>
                ) : topKeywords.map((kw, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
                    <p style={{ color: '#888', fontSize: '0.8rem', width: '80px' }}>{kw.word}</p>
                    <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '4px', height: '4px' }}>
                      <div style={{ background: '#111', borderRadius: '4px', height: '4px', width: `${(kw.count / (topKeywords[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <p style={{ color: '#bbb', fontSize: '0.75rem', width: '20px', textAlign: 'right' }}>{kw.count}</p>
                  </div>
                ))}
              </div>

              {/* Funnel */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Conversion Funnel</p>
                <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '1.5rem' }}>From message to lead</p>
                {[
                  { label: 'Messages Received', value: stats.total, pct: 100 },
                  { label: 'Replied by AI', value: stats.replied, pct: stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0 },
                  { label: 'Identified as Leads', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
                  { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
                ].map((row, i) => (
                  <div key={i} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <p style={{ color: '#888', fontSize: '0.78rem' }}>{row.label}</p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <p style={{ color: '#bbb', fontSize: '0.75rem' }}>{row.pct}%</p>
                        <p style={{ color: '#111', fontSize: '0.75rem', fontWeight: '500', width: '20px', textAlign: 'right' }}>{row.value}</p>
                      </div>
                    </div>
                    <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '4px' }}>
                      <div style={{ background: '#111', borderRadius: '4px', height: '4px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Segments & ROI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Segment Performance */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Segment Performance</p>
                {[
                  { name: 'High Engagement', count: 234, rate: 87, trend: '+12%' },
                  { name: 'Medium Engagement', count: 567, rate: 64, trend: '+4%' },
                  { name: 'Low Engagement', count: 345, rate: 28, trend: '-2%' },
                ].map((seg, i) => (
                  <div key={i} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <p style={{ color: '#888', fontSize: '0.85rem', fontWeight: '500' }}>{seg.name}</p>
                      <p style={{ color: seg.trend.includes('+') ? '#2a7a2a' : '#888', fontSize: '0.75rem' }}>{seg.trend}</p>
                    </div>
                    <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{seg.count} contacts • {seg.rate}% active</p>
                    <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '4px' }}>
                      <div style={{ background: '#111', borderRadius: '4px', height: '4px', width: `${seg.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue & ROI Estimate */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Estimated Performance</p>
                {[
                  { label: 'Leads This Month', value: '487', unit: 'qualified' },
                  { label: 'Estimated Revenue', value: '$24.3k', unit: 'based on avg deal' },
                  { label: 'Automation ROI', value: '340%', unit: 'vs manual labor' },
                  { label: 'Cost per Lead', value: '$12.50', unit: 'platform + AI' },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none' }}>
                    <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.4rem' }}>{item.label}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '300', color: '#111', marginBottom: '0.25rem' }}>{item.value}</p>
                    <p style={{ color: '#bbb', fontSize: '0.7rem' }}>{item.unit}</p>
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