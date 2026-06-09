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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (!client) return
      const { data } = await supabase
        .from('leads').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (data) {
        setLeads(data)
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Leads" />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Lead List */}
        <div style={{ width: '340px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Pipeline</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '0.4rem' }}>Leads</h1>
            <p style={{ color: '#ccc', fontSize: '0.75rem' }}>{leads.length} total · {leads.filter(l => l.status === 'new').length} new</p>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '0.8rem' }}>Loading...</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ccc' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</p>
                <p style={{ fontSize: '0.8rem' }}>No leads yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#ddd' }}>Leads appear when AI detects buying intent</p>
              </div>
            ) : leads.map(lead => {
              const s = statusStyle(lead.status)
              return (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#111' }}>@{lead.from_username}</p>
                    <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{timeAgo(lead.created_at)}</p>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#999', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.intent_summary}</p>
                  <span style={{ fontSize: '0.58rem', background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '0.15rem 0.5rem', borderRadius: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{lead.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lead Detail */}
        <div style={{ flex: 1, padding: '3rem 3.5rem', overflowY: 'auto', background: '#fafaf8' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a lead to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selected.created_at)}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '1rem' }}>@{selected.from_username}</h2>
                <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: '1.65', marginBottom: '1.5rem', maxWidth: '500px' }}>{selected.intent_summary}</p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['new', 'contacted', 'converted', 'dismissed'].map(s => {
                    const style = statusStyle(s)
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected.id, s)}
                        style={{
                          padding: '0.45rem 1.1rem',
                          borderRadius: '6px',
                          border: `1px solid ${selected.status === s ? '#111' : '#e8e8e8'}`,
                          background: selected.status === s ? '#111' : '#fff',
                          color: selected.status === s ? '#fff' : '#999',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >{s}</button>
                    )
                  })}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Next Steps</p>
                <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: '1.75' }}>
                  This lead was flagged because they showed buying intent. Reach out to <strong style={{ color: '#111' }}>@{selected.from_username}</strong> personally to close the deal. Mark as <em>contacted</em> once you've reached out, and <em>converted</em> once they become a client.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}