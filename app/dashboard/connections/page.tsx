'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

interface Status {
  connected: boolean
  username?: string | null
  liveAccountId?: string
  storedAccountId?: string | null
  matchesStored?: boolean | null
  usingGlobalToken?: boolean
  webhookConfigured?: boolean
  messageCount?: number
  lastMessageAt?: string | null
  reason?: string
  error?: string
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }
const eyebrow: React.CSSProperties = { color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }

export default function ConnectionsPage() {
  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  const [igId, setIgId] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const checkStatus = useCallback(async (id: string) => {
    setVerifying(true)
    try {
      const res = await fetch('/api/instagram/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      })
      setStatus(await res.json())
    } catch {
      setStatus({ connected: false, reason: 'error', error: 'Could not reach the status check.' })
    }
    setVerifying(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: client } = await supabase.from('clients').select('id, instagram_account_id').eq('email', user.email).maybeSingle()
      if (client) {
        setClientId(client.id)
        setIgId(client.instagram_account_id || '')
        await checkStatus(client.id)
      }
      setLoading(false)
    }
    init()
  }, [checkStatus])

  const handleConnect = async () => {
    if (!clientId) return
    setSaving(true); setSaveMsg('')
    const { error } = await supabase
      .from('clients')
      .update({ instagram_account_id: igId.trim(), access_token: token.trim() || null })
      .eq('id', clientId)
    setSaving(false)
    if (error) { setSaveMsg(error.message); return }
    setSaveMsg('Saved — re-checking connection…')
    setToken('')
    await checkStatus(clientId)
    setSaveMsg('')
  }

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const checks = status ? [
    { label: 'Access token valid', ok: status.connected, hint: status.connected ? 'Meta recognises the token' : (status.error || 'Token rejected or missing') },
    { label: 'Account ID matches', ok: status.matchesStored === true, hint: status.matchesStored === null ? 'No account ID stored yet' : status.matchesStored ? 'Stored ID matches the live account' : 'Stored ID differs from the token’s account' },
    { label: 'Webhook configured', ok: !!status.webhookConfigured, hint: status.webhookConfigured ? 'Verify token is set' : 'WEBHOOK_VERIFY_TOKEN missing' },
    { label: 'Receiving messages', ok: (status.messageCount ?? 0) > 0, hint: `${status.messageCount ?? 0} DMs recorded` },
  ] : []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Connections" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <p style={{ ...eyebrow, fontSize: '0.62rem', letterSpacing: '0.25em', marginBottom: '0.5rem' }}>Integrations</p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '300', color: '#111' }}>Connections</h1>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Your Instagram account and the live status of your automation.</p>
          </div>
          <button onClick={() => checkStatus(clientId)} disabled={verifying || !clientId}
            style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1px solid #111', background: '#fff', color: '#111', cursor: verifying ? 'default' : 'pointer', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: verifying || !clientId ? 0.5 : 1, fontFamily: 'inherit' }}>
            {verifying ? 'Checking…' : 'Re-verify'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Loading...</p>
        ) : (
          <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Status hero */}
            <div style={{ ...card, padding: '2rem 2.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: status?.connected ? '#111' : '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: status?.connected ? '#fff' : '#bbb', fontSize: '1.2rem', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
                    {status?.username ? status.username.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status?.connected ? '#1d9e75' : '#cc4444', animation: status?.connected ? 'walterpulse 1.6s ease-in-out infinite' : 'none' }} />
                    <p style={{ fontSize: '1.4rem', fontWeight: 300, color: '#111' }}>
                      {status?.connected ? `Connected as @${status.username}` : 'Not connected'}
                    </p>
                  </div>
                  <p style={{ color: '#aaa', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                    {status?.connected
                      ? `Instagram account ${status.liveAccountId}${status.usingGlobalToken ? ' · using shared token' : ' · using your token'}`
                      : (status?.error || 'Connect your Instagram below to start automating DMs.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Health checklist */}
            <div style={card}>
              <p style={{ ...eyebrow, marginBottom: '1.25rem' }}>Connection Health</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {checks.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: c.ok ? '#1d9e75' : '#f0f0ee', color: c.ok ? '#fff' : '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                      {c.ok ? '✓' : '–'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', color: '#111' }}>{c.label}</p>
                      <p style={{ fontSize: '0.72rem', color: '#bbb' }}>{c.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={card}>
                <p style={{ ...eyebrow, marginBottom: '1rem' }}>DMs Received</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 300, color: '#111', lineHeight: 1 }}>{status?.messageCount ?? 0}</p>
              </div>
              <div style={card}>
                <p style={{ ...eyebrow, marginBottom: '1rem' }}>Last DM</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 300, color: '#111', lineHeight: 1.2 }}>
                  {status?.lastMessageAt ? timeAgo(status.lastMessageAt) : '—'}
                </p>
              </div>
            </div>

            {/* Connect / update */}
            <div style={card}>
              <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Connect your account</p>
              <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                Paste your Instagram Business account ID and access token to link your own account. Leave the token blank to keep the shared one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ ...eyebrow, fontSize: '0.58rem', marginBottom: '0.5rem' }}>Instagram Account ID</p>
                  <input value={igId} onChange={e => setIgId(e.target.value)} placeholder="e.g. 17841456859075586"
                    style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.85rem', color: '#111', background: '#fafaf8', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <p style={{ ...eyebrow, fontSize: '0.58rem', marginBottom: '0.5rem' }}>Access Token</p>
                  <input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="Paste a long-lived Instagram access token"
                    style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.85rem', color: '#111', background: '#fafaf8', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                {saveMsg && <p style={{ fontSize: '0.78rem', color: saveMsg.includes('Saved') ? '#2a7a2a' : '#cc4444' }}>{saveMsg}</p>}
                <button onClick={handleConnect} disabled={saving || !igId}
                  style={{ alignSelf: 'flex-start', padding: '0.7rem 1.75rem', borderRadius: '10px', border: '1px solid #111', background: '#111', color: '#fff', cursor: saving || !igId ? 'default' : 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: saving || !igId ? 0.5 : 1, fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : 'Save & verify'}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
