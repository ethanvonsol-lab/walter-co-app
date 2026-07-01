'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, pageTitle, tabular } from '@/lib/theme'

interface Lead {
  id: string
  from_username: string
  from_handle?: string | null
  intent_summary: string
  status: string
  created_at: string
  budget_range?: string | null
  timeline?: string | null
  pain_point?: string | null
  decision_maker?: string | null
  enriched_at?: string | null
}

// Fallback $ value per lead at full intent when the client hasn't set their own.
const DEFAULT_DEAL_VALUE = 1500

// Buying-intent score (0-100) from the signals the webhook already keys on,
// plus whether they left contact details and how recent it is. Heuristic and
// instant — no extra AI call. The dashboard's "Act now" brief is the AI view;
// this is the always-on pipeline ranking.
//
// Weighting note: CONCRETE buying signals (wanting to buy/book, asking price,
// leaving contact details) drive the score. Soft enthusiasm — "interested",
// "looking", "keen" — only nudges it. Someone repeatedly gushing that they're
// "interested" with no specifics is a mild lead, NOT a hot one; over-weighting
// enthusiasm is exactly what used to inflate a single chatty person's value.
function scoreLead(intentSummary: string, createdAt: string): number {
  const t = (intentSummary || '').toLowerCase()
  let score = 15 // baseline so a real lead never reads as zero intent
  const high = ['buy', 'purchase', 'book', 'sign up', 'signup', 'invest', 'hire', 'ready', 'enroll', 'deposit', 'get started', 'pay']
  const pricing = ['price', 'cost', 'how much', 'pricing', 'quote', 'rate', 'fee']
  const contact = ['email', 'call', 'phone', 'whatsapp', 'text me', 'dm me']
  const interest = ['interested', 'want', 'looking', 'need', 'keen', 'curious', 'info', 'details', 'available']
  if (high.some(k => t.includes(k))) score += 35
  if (pricing.some(k => t.includes(k))) score += 22
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t) || contact.some(k => t.includes(k))) score += 18
  if (interest.some(k => t.includes(k))) score += 8 // enthusiasm alone ≠ hot
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hrs <= 24) score += 8
  else if (hrs <= 72) score += 4
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [sortMode, setSortMode] = useState<'hot' | 'recent'>('hot')
  const [avgDealValue, setAvgDealValue] = useState(DEFAULT_DEAL_VALUE)
  const [enrichingId, setEnrichingId] = useState<string | null>(null)
  const [handleMap, setHandleMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchLeads = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id, avg_deal_value').eq('email', user.email).maybeSingle()
      if (!client) { setLoading(false); return }
      if (client.avg_deal_value) setAvgDealValue(client.avg_deal_value)
      const { data } = await supabase
        .from('leads').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (data) {
        setLeads(data)
        if (data.length > 0) setSelected(data[0])

        // Show real @handles: seed cached ones, lazily resolve numeric IGSIDs.
        const seed: Record<string, string> = {}
        data.forEach((l: Lead) => { if (l.from_handle) seed[l.from_username] = l.from_handle })
        setHandleMap(seed)
        ;[...new Set(data.map((l: Lead) => l.from_username))]
          .filter(u => !seed[u] && /^\d+$/.test(u))
          .forEach(igsid => {
            fetch('/api/instagram/resolve-handle', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: client.id, igsid }),
            })
              .then(r => r.json())
              .then(({ handle }) => { if (handle) setHandleMap(prev => ({ ...prev, [igsid]: handle })) })
              .catch(() => {})
          })
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
          const l = payload.new as Lead
          setLeads(prev => [l, ...prev])
          if (l.from_handle) setHandleMap(prev => ({ ...prev, [l.from_username]: l.from_handle as string }))
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

  // Ask the AI to read this lead's conversation and pull a qualification
  // profile (budget / timeline / pain / decision-maker). Cached via enriched_at.
  const runEnrich = async (lead: Lead) => {
    setEnrichingId(lead.id)
    try {
      const res = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const { profile } = await res.json()
      if (profile) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...profile, enriched_at: new Date().toISOString() } : l))
      }
    } catch {
      // leave un-enriched; the user can retry from the card
    }
    setEnrichingId(null)
  }

  // Auto-profile a lead the first time it's opened. Fetch-on-select is a valid
  // effect; the setState inside runEnrich just toggles the "analyzing" state.
  useEffect(() => {
    if (selected && !selected.enriched_at && enrichingId !== selected.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runEnrich(selected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const timeAgo = (date: string) => {
    // eslint-disable-next-line react-hooks/purity -- relative timestamp, fine to recompute on render
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const statusStyle = (status: string) => {
    if (status === 'converted') return { bg: c.goodBg, color: c.good, border: c.goodBorder }
    if (status === 'contacted') return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    if (status === 'dismissed') return { bg: c.surfaceAlt, color: c.faint, border: c.border }
    return { bg: c.warnBg, color: c.warn, border: c.warnBorder }
  }

  // One row per person. New leads are deduped at the webhook now, but older data
  // can hold several lead rows for the same chatty sender — collapse them to the
  // most recent (`leads` is already newest-first) so one person is one lead and
  // never double-counts in the pipeline total below.
  const seenUser = new Set<string>()
  const uniqueLeads = leads.filter(l => {
    if (seenUser.has(l.from_username)) return false
    seenUser.add(l.from_username)
    return true
  })

  // Decorate with score + estimated value, then rank.
  const scored = uniqueLeads.map(l => {
    const score = scoreLead(l.intent_summary, l.created_at)
    return { ...l, score, value: Math.round((score / 100) * avgDealValue) }
  })
  const ranked = [...scored].sort((a, b) =>
    sortMode === 'hot' ? b.score - a.score : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  // Resolve by id, but fall back to the same person's current (deduped) row so
  // the detail pane never blanks out if a newer lead row supersedes the selected
  // one — e.g. a realtime message arrives from someone already on screen.
  const selectedScored = selected
    ? (scored.find(l => l.id === selected.id) || scored.find(l => l.from_username === selected.from_username) || null)
    : null
  // Show the resolved @handle when we have it, otherwise the raw id.
  const nameFor = (u: string) => handleMap[u] || u

  // Pipeline value = sum of estimated value for still-open leads (one per person).
  const open = scored.filter(l => l.status === 'new' || l.status === 'contacted')
  const pipelineValue = open.reduce((sum, l) => sum + l.value, 0)
  const newCount = scored.filter(l => l.status === 'new').length

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.85rem', borderRadius: radius.pill, border: `1px solid ${active ? c.ink : c.border}`,
    background: active ? c.ink : 'transparent', color: active ? '#fff' : c.muted,
    fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', fontFamily: font,
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Leads" />

      <main style={{ marginLeft: '244px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Lead List */}
        <div style={{ width: '360px', background: c.surface, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '1.75rem 1.5rem', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={label}>Pipeline</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: c.faint }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> live
              </span>
            </div>
            <h1 style={{ ...pageTitle, fontSize: '1.4rem', marginBottom: '0.3rem' }}>Leads</h1>
            <p style={{ color: c.muted, fontSize: '0.78rem', marginBottom: '1rem', ...tabular }}>
              {scored.length} total · {newCount} new · <span style={{ color: c.ink, fontWeight: 500 }}>${pipelineValue.toLocaleString()}</span> open
            </p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {([['hot', 'Hottest'], ['recent', 'Recent']] as const).map(([mode, lbl]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={chip(sortMode === mode)}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: c.faint, fontSize: '0.85rem' }}>Loading…</div>
            ) : ranked.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: c.faint }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</p>
                <p style={{ fontSize: '0.85rem' }}>No leads yet</p>
                <p style={{ fontSize: '0.78rem', marginTop: '0.25rem', color: c.faint }}>Leads appear when AI detects buying intent</p>
              </div>
            ) : ranked.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelected(lead)}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: `1px solid ${c.border}`,
                  cursor: 'pointer',
                  background: selected?.id === lead.id ? c.surfaceAlt : c.surface,
                  borderLeft: selected?.id === lead.id ? `2px solid ${c.ink}` : '2px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: c.ink }}>@{nameFor(lead.from_username)}</p>
                  <p style={{ fontSize: '0.68rem', color: c.faint }}>{timeAgo(lead.created_at)}</p>
                </div>
                <p style={{ fontSize: '0.78rem', color: c.muted, marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.intent_summary}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, height: '5px', background: c.surfaceAlt, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${lead.score}%`, height: '100%', background: lead.status === 'dismissed' ? '#d4d4d8' : c.ink, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: c.muted, width: '20px', textAlign: 'right', ...tabular }}>{lead.score}</span>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 500, ...(() => { const s = statusStyle(lead.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` } })(), padding: '0.1rem 0.45rem', borderRadius: '5px', textTransform: 'uppercase' }}>{lead.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Detail */}
        <div style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto', background: c.bg }}>
          {!selectedScored ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.faint }}>
              <p style={{ fontSize: '0.875rem' }}>Select a lead to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.75rem', paddingBottom: '1.75rem', borderBottom: `1px solid ${c.border}` }}>
                <p style={{ ...label, marginBottom: '0.5rem' }}>{timeAgo(selectedScored.created_at)}</p>
                <h2 style={{ ...pageTitle, fontSize: '1.5rem', marginBottom: '1rem' }}>@{nameFor(selectedScored.from_username)}</h2>
                <p style={{ color: c.body, fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.5rem', maxWidth: '520px' }}>{selectedScored.intent_summary}</p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['new', 'contacted', 'converted', 'dismissed'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedScored.id, s)}
                      style={{
                        padding: '0.4rem 1rem', borderRadius: radius.md,
                        border: `1px solid ${selectedScored.status === s ? c.ink : c.border}`,
                        background: selectedScored.status === s ? c.ink : c.surface,
                        color: selectedScored.status === s ? '#fff' : c.muted,
                        fontSize: '0.72rem', fontWeight: 500, textTransform: 'capitalize',
                        cursor: 'pointer', fontFamily: font,
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Intent + value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={card}>
                  <p style={label}>Buying Intent</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', margin: '0.85rem 0 0.75rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 600, color: c.ink, lineHeight: 1, letterSpacing: '-0.03em', ...tabular }}>{selectedScored.score}</span>
                    <span style={{ fontSize: '0.85rem', color: c.faint, marginBottom: '0.25rem' }}>/ 100</span>
                  </div>
                  <div style={{ height: '5px', background: c.surfaceAlt, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedScored.score}%`, height: '100%', background: c.ink }} />
                  </div>
                </div>
                <div style={{ background: c.ink, borderRadius: radius.lg, padding: '1.5rem' }}>
                  <p style={{ ...label, color: '#a1a1aa' }}>Est. Value</p>
                  <span style={{ display: 'block', marginTop: '0.85rem', fontSize: '2.25rem', fontWeight: 600, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', ...tabular }}>${selectedScored.value.toLocaleString()}</span>
                  <p style={{ color: '#a1a1aa', fontSize: '0.72rem', marginTop: '0.6rem' }}>intent × avg deal size</p>
                </div>
              </div>

              {/* AI-extracted qualification profile */}
              <div style={{ ...card, marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={label}>Lead Profile</p>
                  {enrichingId === selectedScored.id ? (
                    <span style={{ fontSize: '0.68rem', color: c.faint }}>analyzing…</span>
                  ) : (
                    <button
                      onClick={() => runEnrich(selectedScored)}
                      style={{ fontSize: '0.68rem', color: c.faint, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font }}
                    >
                      {selectedScored.enriched_at ? '↻ refresh' : 'AI-extracted'}
                    </button>
                  )}
                </div>
                {enrichingId === selectedScored.id && !selectedScored.enriched_at ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {[78, 64, 82, 56].map((w, i) => (
                      <div key={i} style={{ height: '12px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f0f0f1,#e7e7e9,#f0f0f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.25rem' }}>
                    {([['Budget', selectedScored.budget_range], ['Timeline', selectedScored.timeline], ['Pain point', selectedScored.pain_point], ['Decision-maker', selectedScored.decision_maker]] as const).map(([k, v]) => {
                      const known = !!v && v !== 'Unknown'
                      return (
                        <div key={k}>
                          <p style={{ ...label, fontSize: '0.64rem', marginBottom: '0.3rem' }}>{k}</p>
                          <p style={{ fontSize: '0.9rem', color: known ? c.ink : c.faint, fontWeight: known ? 500 : 400 }}>{known ? v : '—'}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={card}>
                <p style={{ ...label, marginBottom: '0.9rem' }}>Next Steps</p>
                <p style={{ color: c.body, fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {selectedScored.score >= 70
                    ? <>Hot lead — reach out to <strong style={{ color: c.ink }}>@{nameFor(selectedScored.from_username)}</strong> now while intent is high. Mark <em>contacted</em> once you&apos;ve messaged them, <em>converted</em> when they sign.</>
                    : <>Reach out to <strong style={{ color: c.ink }}>@{nameFor(selectedScored.from_username)}</strong> personally to close the deal. Mark as <em>contacted</em> once you&apos;ve reached out, and <em>converted</em> once they become a client.</>}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
