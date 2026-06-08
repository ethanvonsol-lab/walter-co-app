'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
        .from('leads')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
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

  const statusColor = (status: string) => {
    if (status === 'converted') return { bg: '#f0faf0', color: '#2a7a2a', border: '#c0e0c0' }
    if (status === 'contacted') return { bg: '#f0f0ff', color: '#2a2a7a', border: '#c0c0e0' }
    if (status === 'dismissed') return { bg: '#f5f5f5', color: '#999', border: '#e0e0e0' }
    return { bg: '#fff8f0', color: '#7a4a2a', border: '#e0d0c0' }
  }

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
          { label: 'Leads', href: '/dashboard/leads', active: true },
          { label: 'Analytics', href: '/dashboard/analytics', active: false },
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
      <main style={{ marginLeft: '280px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Lead List */}
        <div style={{ width: '360px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pipeline</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '300', color: '#111' }}>Leads</h2>
            <p style={{ color: '#bbb', fontSize: '0.75rem', marginTop: '0.5rem' }}>{leads.length} total · {leads.filter(l => l.status === 'new').length} new</p>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '0.8rem' }}>Loading...</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ccc' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</p>
                <p style={{ fontSize: '0.8rem' }}>No leads yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Leads appear when AI detects buying intent</p>
              </div>
            ) : leads.map(lead => {
              const s = statusColor(lead.status)
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    background: selected?.id === lead.id ? '#fafafa' : '#fff',
                    borderLeft: selected?.id === lead.id ? '2px solid #111' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#111', fontWeight: '500' }}>@{lead.from_username}</p>
                    <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{timeAgo(lead.created_at)}</p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.intent_summary}</p>
                  <span style={{ fontSize: '0.55rem', background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '0.15rem 0.5rem', borderRadius: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{lead.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lead Detail */}
        <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a lead to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selected.created_at)}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '1rem' }}>@{selected.from_username}</h2>
                <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{selected.intent_summary}</p>

                {/* Status buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {['new', 'contacted', 'converted', 'dismissed'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: selected.status === s ? '#111' : '#e0e0e0',
                        background: selected.status === s ? '#111' : '#fff',
                        color: selected.status === s ? '#fff' : '#888',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '12px', padding: '2rem' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>Next Steps</p>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.7' }}>
                  This lead was identified because they showed buying intent. Reach out to <strong>@{selected.from_username}</strong> personally to close the deal. Mark as <em>contacted</em> once you've reached out, and <em>converted</em> once they become a client.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}