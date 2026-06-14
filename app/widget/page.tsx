'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, pageTitle, muted, btn, fontMono } from '@/lib/theme'

export default function WidgetPage() {
  const [clientId, setClientId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (data) setClientId(data.id)
    }
    fetchClient()
  }, [])

  const embedCode = `<script src="https://walter-co-app.vercel.app/widget.js" data-client-id="${clientId}"></script>`

  const copy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Chat Widget" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ ...label, marginBottom: '0.4rem' }}>Embed</p>
          <h1 style={pageTitle}>Chat Widget</h1>
          <p style={{ ...muted, marginTop: '0.3rem' }}>Add your AI assistant to any website with one line of code.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={card}>
              <p style={{ ...label, marginBottom: '1rem' }}>Your Embed Code</p>
              <div style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: radius.md, padding: '1rem', marginBottom: '1rem', overflowX: 'auto' }}>
                <code style={{ color: c.body, fontSize: '0.74rem', fontFamily: fontMono, whiteSpace: 'nowrap' }}>{embedCode}</code>
              </div>
              <button onClick={copy} style={{ ...btn, padding: '0.6rem 1.5rem', background: copied ? c.good : c.ink, borderColor: copied ? c.good : c.ink }}>
                {copied ? 'Copied ✓' : 'Copy code'}
              </button>
            </div>

            <div style={card}>
              <p style={{ ...label, marginBottom: '1rem' }}>How to Install</p>
              {[
                'Copy the embed code above',
                "Open your website's HTML editor",
                'Paste the code just before the </body> tag',
                'Save and publish — the widget appears instantly',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.9rem', alignItems: 'flex-start' }}>
                  <span style={{ color: c.faint, fontSize: '0.82rem', fontWeight: 500, minWidth: '18px' }}>{i + 1}.</span>
                  <p style={{ color: c.muted, fontSize: '0.85rem', lineHeight: 1.55 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={label}>Preview</p>
            <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.5rem' }}>What visitors will see on your website.</p>
            <div style={{ background: c.surfaceAlt, borderRadius: radius.lg, height: '420px', position: 'relative', overflow: 'hidden', border: `1px solid ${c.border}` }}>
              <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                <div style={{ background: c.surface, borderRadius: radius.lg, padding: '1.1rem', boxShadow: '0 8px 30px rgba(9,9,11,0.1)', width: '260px', border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.9rem', paddingBottom: '0.7rem', borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.ink }} />
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 500, color: c.ink }}>AI Assistant</p>
                      <p style={{ fontSize: '0.66rem', color: c.faint }}>Typically replies instantly</p>
                    </div>
                  </div>
                  <div style={{ background: c.surfaceAlt, borderRadius: '10px 10px 10px 4px', padding: '0.7rem', marginBottom: '0.7rem' }}>
                    <p style={{ fontSize: '0.78rem', color: c.body, lineHeight: 1.5 }}>Hey! 👋 How can I help you today?</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input placeholder="Type a message…" readOnly style={{ flex: 1, padding: '0.55rem 0.8rem', borderRadius: radius.pill, border: `1px solid ${c.border}`, fontSize: '0.75rem', outline: 'none', background: c.surfaceAlt, fontFamily: font }} />
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.ink, border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>↑</button>
                  </div>
                </div>
                <button style={{ width: '52px', height: '52px', borderRadius: '50%', background: c.ink, border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(9,9,11,0.15)' }}>💬</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
