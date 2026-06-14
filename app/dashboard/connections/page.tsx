'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, pageTitle, muted, statNumber, input as themeInput, btn, btnGhost, tabular } from '@/lib/theme'

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

export default function ConnectionsPage() {
  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  const [igId, setIgId] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [banner, setBanner] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)

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

  // Surface the result of the OAuth round-trip (?connected=1 / ?error=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorMessages: Record<string, string> = {
      oauth_not_configured: 'One-click connect isn’t enabled yet — use the manual option below for now.',
      oauth_denied: 'Connection cancelled. You can try again any time.',
      oauth_state_mismatch: 'Security check failed — please try connecting again.',
      not_signed_in: 'Your session expired. Sign in again, then reconnect.',
      token_exchange_failed: 'Instagram rejected the connection. Please try again.',
      save_failed: 'We couldn’t save your connection. Please try again.',
      oauth_error: 'Something went wrong connecting. Please try again.',
    }
    const next: { kind: 'good' | 'bad'; text: string } | null =
      params.get('connected') ? { kind: 'good', text: 'Instagram connected. Walter is ready to handle your DMs.' }
      : params.get('error') ? { kind: 'bad', text: errorMessages[params.get('error') || ''] || 'Could not connect Instagram.' }
      : null
    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from URL query on mount
      setBanner(next)
      window.history.replaceState({}, '', '/dashboard/connections')
    }
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
    // eslint-disable-next-line react-hooks/purity -- relative timestamp, fine to recompute on render
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Connections" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ ...label, marginBottom: '0.4rem' }}>Integrations</p>
            <h1 style={pageTitle}>Connections</h1>
            <p style={{ ...muted, marginTop: '0.3rem' }}>Your Instagram account and the live status of your automation.</p>
          </div>
          <button onClick={() => checkStatus(clientId)} disabled={verifying || !clientId}
            style={{ ...btnGhost, opacity: verifying || !clientId ? 0.5 : 1 }}>
            {verifying ? 'Checking…' : 'Re-verify'}
          </button>
        </div>

        {banner && (
          <div style={{ maxWidth: 720, marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: radius.md, fontSize: '0.85rem', background: banner.kind === 'good' ? c.goodBg : c.badBg, border: `1px solid ${banner.kind === 'good' ? c.goodBorder : c.badBorder}`, color: banner.kind === 'good' ? c.good : c.bad }}>
            {banner.text}
          </div>
        )}

        {loading ? (
          <p style={{ color: c.faint, fontSize: '0.875rem' }}>Loading…</p>
        ) : (
          <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Status hero */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: radius.lg, background: status?.connected ? c.ink : c.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: status?.connected ? '#fff' : c.faint, fontSize: '1.1rem', fontWeight: 600 }}>
                    {status?.username ? status.username.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status?.connected ? '#22c55e' : c.bad, animation: status?.connected ? 'walterpulse 1.6s ease-in-out infinite' : 'none' }} />
                    <p style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.02em', color: c.ink }}>
                      {status?.connected ? `Connected as @${status.username}` : 'Not connected'}
                    </p>
                  </div>
                  <p style={{ color: c.muted, fontSize: '0.8rem', marginTop: '0.3rem' }}>
                    {status?.connected
                      ? `Instagram account ${status.liveAccountId}${status.usingGlobalToken ? ' · using shared token' : ' · using your token'}`
                      : (status?.error || 'Connect your Instagram below to start automating DMs.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Health checklist */}
            <div style={card}>
              <p style={{ ...label, marginBottom: '1.1rem' }}>Connection Health</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {checks.map((chk, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: chk.ok ? '#22c55e' : c.surfaceAlt, color: chk.ok ? '#fff' : c.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                      {chk.ok ? '✓' : '–'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, color: c.ink }}>{chk.label}</p>
                      <p style={{ fontSize: '0.74rem', color: c.faint }}>{chk.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={card}>
                <p style={{ ...label, marginBottom: '0.85rem' }}>DMs Received</p>
                <p style={{ ...statNumber, ...tabular }}>{status?.messageCount ?? 0}</p>
              </div>
              <div style={card}>
                <p style={{ ...label, marginBottom: '0.85rem' }}>Last DM</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '-0.02em', color: c.ink, lineHeight: 1.2 }}>
                  {status?.lastMessageAt ? timeAgo(status.lastMessageAt) : '—'}
                </p>
              </div>
            </div>

            {/* One-click connect */}
            <div style={card}>
              <p style={{ ...label, marginBottom: '0.3rem' }}>Connect with Instagram</p>
              <p style={{ ...muted, marginBottom: '1.1rem' }}>
                The easy way — sign in with Instagram and approve access. We&apos;ll link your account automatically, no copy-pasting tokens.
              </p>
              <a href="/api/instagram/oauth/start" style={{ ...btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}>
                <span style={{ fontSize: '1rem' }}>◎</span> Connect Instagram
              </a>
              <p style={{ color: c.faint, fontSize: '0.74rem', marginTop: '0.7rem' }}>Opens Instagram&apos;s secure login. You&apos;ll be brought right back here.</p>
            </div>

            {/* Manual connect / update */}
            <div style={card}>
              <p style={{ ...label, marginBottom: '0.3rem' }}>Connect manually</p>
              <p style={{ ...muted, marginBottom: '1.25rem' }}>
                Prefer to do it by hand? Paste your Instagram Business account ID and access token. Leave the token blank to keep the shared one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ ...label, marginBottom: '0.4rem' }}>Instagram Account ID</p>
                  <input value={igId} onChange={e => setIgId(e.target.value)} placeholder="e.g. 17841456859075586" style={themeInput} />
                </div>
                <div>
                  <p style={{ ...label, marginBottom: '0.4rem' }}>Access Token</p>
                  <input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="Paste a long-lived Instagram access token" style={themeInput} />
                </div>
                {saveMsg && <p style={{ fontSize: '0.8rem', color: saveMsg.includes('Saved') ? c.good : c.bad }}>{saveMsg}</p>}
                <button onClick={handleConnect} disabled={saving || !igId}
                  style={{ ...btn, alignSelf: 'flex-start', opacity: saving || !igId ? 0.5 : 1 }}>
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
