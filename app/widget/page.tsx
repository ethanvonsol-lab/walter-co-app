'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function WidgetPage() {
  const [clientId, setClientId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (data) setClientId(data.id)
    }
    fetch()
  }, [])

  const embedCode = `<script src="https://walter-co-app.vercel.app/widget.js" data-client-id="${clientId}"></script>`

  const copy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Chat Widget" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem' }}>

        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Embed</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Chat Widget</h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Add your AI assistant to any website with one line of code.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your Embed Code</p>
              <div style={{ background: '#fafaf8', border: '1px solid #ebebeb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem', overflowX: 'auto' }}>
                <code style={{ color: '#888', fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{embedCode}</code>
              </div>
              <button
                onClick={copy}
                style={{ padding: '0.825rem 2rem', borderRadius: '8px', border: '1px solid #111', background: copied ? '#2a7a2a' : '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'inherit', transition: 'background 0.3s' }}
              >
                {copied ? 'Copied ✓' : 'Copy Code'}
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>How to Install</p>
              {[
                'Copy the embed code above',
                "Open your website's HTML editor",
                'Paste the code just before the </body> tag',
                'Save and publish — the widget appears instantly',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ccc', fontSize: '0.8rem', minWidth: '20px' }}>{i + 1}.</span>
                  <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: '1.55' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Preview</p>
            <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '2rem' }}>What visitors will see on your website</p>
            <div style={{ background: '#fafaf8', borderRadius: '12px', height: '420px', position: 'relative', overflow: 'hidden', border: '1px solid #ebebeb' }}>
              <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', width: '260px', border: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111' }} />
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#111' }}>AI Assistant</p>
                      <p style={{ fontSize: '0.62rem', color: '#bbb' }}>Typically replies instantly</p>
                    </div>
                  </div>
                  <div style={{ background: '#fafaf8', borderRadius: '10px 10px 10px 4px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#555', lineHeight: '1.5' }}>Hey! 👋 How can I help you today?</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input placeholder="Type a message..." readOnly style={{ flex: 1, padding: '0.6rem 0.875rem', borderRadius: '20px', border: '1px solid #ebebeb', fontSize: '0.75rem', outline: 'none', background: '#fafaf8' }} />
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>↑</button>
                  </div>
                </div>
                <button style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#111', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>💬</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}