'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#f7f7f5' }}>
      <aside style={{ width: '280px', background: '#0f0f0f', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', height: '100vh' }}>
        <div style={{ marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Walter & Co" style={{ width: '150px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
        </div>
        <p style={{ color: '#333', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Navigation</p>
        {[
          { label: 'Dashboard', href: '/dashboard', active: false },
          { label: 'Inbox', href: '/dashboard/inbox', active: false },
          { label: 'Leads', href: '/dashboard/leads', active: false },
          { label: 'Analytics', href: '/dashboard/analytics', active: false },
          { label: 'Voice Profile', href: '/dashboard/voice', active: false },
          { label: 'Settings', href: '/dashboard/settings', active: false },
          { label: 'Chat Widget', href: '/widget', active: true },
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

      <main style={{ marginLeft: '280px', flex: 1, padding: '4rem' }}>
        <div style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Embed</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', marginBottom: '0.5rem' }}>Chat Widget</h2>
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Add your AI assistant to any website with one line of code.</p>
          <div style={{ width: '40px', height: '1px', background: '#111', marginTop: '1.5rem' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your Embed Code</p>
              <div style={{ background: '#0f0f0f', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem', overflowX: 'auto' }}>
                <code style={{ color: '#888', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{embedCode}</code>
              </div>
              <button onClick={copy} style={{ padding: '0.875rem 2rem', borderRadius: '8px', border: 'none', background: copied ? '#2a7a2a' : '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {copied ? 'Copied ✓' : 'Copy Code'}
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>How to Install</p>
              {[
                'Copy the embed code above',
                'Open your website\'s HTML editor',
                'Paste the code just before the </body> tag',
                'Save and publish — the chat widget appears instantly',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ddd', fontSize: '0.8rem', fontWeight: '300', minWidth: '20px' }}>{i + 1}.</span>
                  <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: '1.5' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Preview</p>
            <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: '2rem' }}>This is what visitors will see on your website</p>
            <div style={{ background: '#f7f7f5', borderRadius: '12px', height: '400px', position: 'relative', overflow: 'hidden', border: '1px solid #ebebeb' }}>
              <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', width: '260px', border: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111' }} />
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: '500', color: '#111' }}>AI Assistant</p>
                      <p style={{ fontSize: '0.65rem', color: '#bbb' }}>Typically replies instantly</p>
                    </div>
                  </div>
                  <div style={{ background: '#f7f7f5', borderRadius: '10px 10px 10px 4px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#555', lineHeight: '1.5' }}>Hey! 👋 How can I help you today?</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input placeholder="Type a message..." style={{ flex: 1, padding: '0.6rem 0.875rem', borderRadius: '20px', border: '1px solid #ebebeb', fontSize: '0.75rem', outline: 'none' }} readOnly />
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>↑</button>
                  </div>
                </div>
                <button style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#111', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>💬</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}