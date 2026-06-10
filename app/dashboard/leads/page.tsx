'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

interface Lead {
  id: string
  from_username: string
  intent_summary: string
  status: string
  created_at: string
}

// Rough $ value per lead at full intent. Mirrors the dashboard pipeline metric;
// make configurable in Settings later.
const AVG_DEAL_VALUE = 1500

// Buying-intent score (0-100) from the signals the webhook already keys on,
// plus whether they left contact details and how recent it is. Heuristic and
// instant — no extra AI call. The dashboard's "Act now" brief is the AI view;
// this is the always-on pipeline ranking.
function scoreLead(intentSummary: string, createdAt: string): number {
  const t = (intentSummary || '').toLowerCase()
  let score = 20 // baseline so a real lead never reads as zero intent
  const high = ['buy', 'purchase', 'book', 'sign up', 'signup', 'invest', 'hire', 'ready', 'join', 'enroll', 'deposit', 'work with', 'get started']
  const pricing = ['price', 'cost', 'how much', 'pricing', 'quote', 'rate', 'fee']
  const interest = ['interested', 'want', 'looking', 'need', 'keen', 'curious', 'info', 'details', 'available']
  if (high.some(k => t.includes(k))) score += 40
  if (pricing.some(k => t.includes(k))) score += 25
  if (interest.some(k => t.includes(k))) score += 15
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t) || t.includes('email')) score += 20
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hrs <= 24) score += 12
  else if (hrs <= 72) score += 6
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [sortMode, setSortMode] = useState<'hot' | 'recent'>('hot')

  useEffect(() => {
    const fetchLeads = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle()
      if (!client) { setLoading(false); return }
      const { data } = await supabase
        .from('leads').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (data) {
        setLeads(data)
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)

      // Live pipeline — new leads appear the moment Walter flags them.
      const channel = supabase
        .channel('leads-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `client_id=eq.${client.id}`
        }, (payload) => {
          setLeads(prev => [payload.new as Lead, ...prev])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    fetchLeads()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l))
    if (selected?.id === id) setSelected({ ...selected, status })
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const statusStyle = (status: string) => {
    if (status === 'converted') return { bg: '#f0faf0', color: '#2a7a2a', border: '#c8e6c8' }
    if (status === 'contacted') return { bg: '#f0f0ff', color: '#3a3a9a', border: '#c8c8e6' }
    if (status === 'dismissed') return { bg: '#f5f5f5', color: '#aaa', border: '#e0e0e0' }
    return { bg: '#fffaf0', color: '#8a6a2a', border: '#e6d8c8' }
  }

  // Decorate with score + estimated value, then rank.
  const scored = leads.map(l => {
    const score = scoreLead(l.intent_summary, l.created_at)
    return { ...l, score, value: Math.round((score / 100) * AVG_DEAL_VALUE) }
  })
  const ranked = [...scored].sort((a, b) =>
    sortMode === 'hot' ? b.score - a.score : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const selectedScored = selected ? scored.find(l => l.id === selected.id) : null

  // Pipeline value = sum of estimated value for still-open leads.
  const open = scored.filter(l => l.status === 'new' || l.status === 'contacted')
  const pipelineValue = open.reduce((sum, l) => sum + l.value, 0)
  const newCount = leads.filter(l => l.status === 'new').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Leads" />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Lead List */}
        <div style={{ width: '360px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Pipeline</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6rem', color: '#bbb', letterSpacing: '0.05em' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d9e75', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> live
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '0.3rem' }}>Leads</h1>
            <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1rem' }}>
              {leads.length} total · {newCount} new · <span style={{ color: '#111' }}>${pipelineValue.toLocaleString()}</span> open pipeline
            </p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {([['hot', 'Hottest'], ['recent', 'Recent']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={{
                  padding: '0.3rem 0.875rem', borderRadius: '20px', border: '1px solid',
                  borderColor: sortMode === mode ? '#111' : '#e8e8e8',
                  background: sortMode === mode ? '#111' : 'transparent',
                  color: sortMode === mode ? '#fff' : '#aaa',
                  fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '0.8rem' }}>Loading...</div>
            ) : ranked.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ccc' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</p>
                <p style={{ fontSize: '0.8rem' }}>No leads yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#ddd' }}>Leads appear when AI detects buying intent</p>
              </div>
            ) : ranked.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelected(lead)}
                style={{
                  padding: '1.1rem 1.5rem',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  background: selected?.id === lead.id ? '#fafaf8' : '#fff',
                  borderLeft: selected?.id === lead.id ? '2px solid #111' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#111' }}>@{lead.from_username}</p>
                  <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{timeAgo(lead.created_at)}</p>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#999', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.intent_summary}</p>
                {/* Intent score bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, height: '4px', background: '#f0f0ee', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${lead.score}%`, height: '100%', background: lead.status === 'dismissed' ? '#ddd' : '#111', transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#888', width: '20px', textAlign: 'right' }}>{lead.score}</span>
                </div>
                <span style={{ fontSize: '0.58rem', ...(() => { const s = statusStyle(lead.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` } })(), padding: '0.15rem 0.5rem', borderRadius: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{lead.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Detail */}
        <div style={{ flex: 1, padding: '3rem 3.5rem', overflowY: 'auto', background: '#fafaf8' }}>
          {!selectedScored ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a lead to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selectedScored.created_at)}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '1rem' }}>@{selectedScored.from_username}</h2>
                <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: '1.65', marginBottom: '1.5rem', maxWidth: '500px' }}>{selectedScored.intent_summary}</p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['new', 'contacted', 'converted', 'dismissed'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedScored.id, s)}
                      style={{
                        padding: '0.45rem 1.1rem', borderRadius: '6px',
                        border: `1px solid ${selectedScored.status === s ? '#111' : '#e8e8e8'}`,
                        background: selectedScored.status === s ? '#111' : '#fff',
                        color: selectedScored.status === s ? '#fff' : '#999',
                        fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Intent + value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', padding: '1.5rem 1.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                  <p style={{ color: '#bbb', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>Buying Intent</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', lineHeight: 1 }}>{selectedScored.score}</span>
                    <span style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.3rem' }}>/ 100</span>
                  </div>
                  <div style={{ height: '4px', background: '#f0f0ee', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedScored.score}%`, height: '100%', background: '#111' }} />
                  </div>
                </div>
                <div style={{ background: '#111', borderRadius: '14px', padding: '1.5rem 1.75rem' }}>
                  <p style={{ color: '#777', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>Est. Value</p>
                  <span style={{ fontSize: '2.5rem', fontWeight: '300', color: '#fff', lineHeight: 1 }}>${selectedScored.value.toLocaleString()}</span>
                  <p style={{ color: '#9a9a9a', fontSize: '0.7rem', marginTop: '0.6rem' }}>intent × avg deal size</p>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Next Steps</p>
                <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: '1.75' }}>
                  {selectedScored.score >= 70
                    ? <>Hot lead — reach out to <strong style={{ color: '#111' }}>@{selectedScored.from_username}</strong> now while intent is high. Mark <em>contacted</em> once you&apos;ve messaged them, <em>converted</em> when they sign.</>
                    : <>Reach out to <strong style={{ color: '#111' }}>@{selectedScored.from_username}</strong> personally to close the deal. Mark as <em>contacted</em> once you&apos;ve reached out, and <em>converted</em> once they become a client.</>}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
