'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { card, eyebrow, h1, muted, btn, btnGhost, input, label as Label, Pill } from '@/components/admin-ui'

interface Client {
  id: string; name: string | null; email: string; industry: string | null
  status: string; plan: string; mrr: number; setup_fee: number; avg_deal_value: number
  agency_id: string | null; instagram_account_id: string | null; access_token: string | null
  voice_profile: string | null; notes: string | null; is_admin: boolean
  created_at: string; paused_at: string | null
  billing_status?: string | null; stripe_customer_id?: string | null; stripe_subscription_id?: string | null
}
interface Message { id: string; from_username: string; content: string; ai_reply: string; is_lead: boolean; status: string; created_at: string }
interface Lead { id: string; from_username: string; intent: string | null; created_at: string }
interface Audit { id: string; actor_email: string; action: string; created_at: string }

export default function ClientDetail({ client: c0, agencyLabel, messages, leads, audits }: {
  client: Client; agencyLabel: string | null; messages: Message[]; leads: Lead[]; audits: Audit[]
}) {
  const [client, setClient] = useState(c0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(c0)
  const [saving, setSaving] = useState(false)
  const [impersonateUrl, setImpersonateUrl] = useState('')
  const [igStatus, setIgStatus] = useState<{ connected: boolean; username?: string | null; reason?: string; error?: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [billingUrl, setBillingUrl] = useState('')
  const [billingLoading, setBillingLoading] = useState(false)
  const [welcomeNoEmail, setWelcomeNoEmail] = useState(false)

  // Flag set by the create-client flow when the invite email couldn't send.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('welcome') === 'no_email') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from URL query on mount
      setWelcomeNoEmail(true)
      window.history.replaceState({}, '', `/admin/clients/${c0.id}`)
    }
  }, [c0.id])

  const createBillingLink = async () => {
    setBillingLoading(true); setBillingUrl('')
    const res = await fetch(`/api/admin/clients/${client.id}/checkout`, { method: 'POST' })
    const data = await res.json()
    setBillingLoading(false)
    if (data.url) setBillingUrl(data.url)
    else alert(data.message || data.error || 'Could not create payment link')
  }

  const [pw, setPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSet, setPwSet] = useState(false)

  const setClientPassword = async () => {
    setPwSaving(true); setPwSet(false)
    const res = await fetch(`/api/admin/clients/${client.id}/set-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }),
    })
    const data = await res.json()
    setPwSaving(false)
    if (res.ok) setPwSet(true)
    else alert(data.error || 'Could not set password')
  }

  const checkIG = async () => {
    setChecking(true)
    const res = await fetch('/api/instagram/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: client.id }) })
    setIgStatus(await res.json())
    setChecking(false)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    setSaving(false)
    if (res.ok) { setClient(draft); setEditing(false) }
    else { const d = await res.json(); alert(d.error || 'Save failed') }
  }

  const setStatus = async (status: string) => {
    if (status === 'churned' && !confirm('Mark this client as churned?')) return
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (res.ok) { setClient({ ...client, status }); setDraft({ ...draft, status }) }
  }

  const del = async () => {
    if (!confirm(`DELETE ${client.email}? This removes their clients row + auth user. Messages/leads stay (foreign keys cascade per your schema). This cannot be undone.`)) return
    const res = await fetch(`/api/admin/clients/${client.id}`, { method: 'DELETE' })
    if (res.ok) window.location.href = '/admin/clients'
    else alert('Delete failed')
  }

  const impersonate = async () => {
    const res = await fetch(`/api/admin/clients/${client.id}/impersonate`, { method: 'POST' })
    const data = await res.json()
    if (data.url) setImpersonateUrl(data.url)
    else alert(data.error || 'Could not generate link')
  }

  const planTone: 'good' | 'neutral' = client.plan === 'agency' || client.plan === 'whitelabel' ? 'good' : 'neutral'

  const field = (k: keyof Client, lbl: string, type: string = 'text') => (
    <div key={k as string}>
      <label style={Label}>{lbl}</label>
      <input
        type={type}
        value={String(draft[k] ?? '')}
        onChange={e => setDraft({ ...draft, [k]: type === 'number' ? Number(e.target.value) : e.target.value })}
        style={input}
      />
    </div>
  )

  return (
    <div style={{ maxWidth: 1100 }}>
      <Link href="/admin/clients" style={{ color: '#999', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.1em' }}>← All clients</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.75rem', marginBottom: '2rem' }}>
        <div>
          <p style={eyebrow}>Client</p>
          <h1 style={h1}>{client.name || client.email}</h1>
          <p style={muted}>
            {client.email} · joined {new Date(client.created_at).toLocaleDateString()}
            {agencyLabel ? <> · under <strong style={{ color: '#222' }}>{agencyLabel}</strong></> : null}
            {client.is_admin ? <> · <Pill tone="good">admin</Pill></> : null}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={impersonate} style={btnGhost}>View as client</button>
          {client.status === 'active'
            ? <button onClick={() => setStatus('paused')} style={btnGhost}>Pause</button>
            : <button onClick={() => setStatus('active')} style={btn}>Reactivate</button>}
          <button onClick={del} style={{ ...btnGhost, color: '#b91c1c', borderColor: '#fecaca' }}>Delete</button>
        </div>
      </div>

      {welcomeNoEmail && (
        <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <p style={eyebrow}>Account created — email not sent</p>
          <p style={{ margin: '0.6rem 0 0', color: '#1d4ed8', fontSize: '0.88rem' }}>
            Email isn&apos;t set up yet, so no invite was sent. Onboard {client.email} by <strong>setting a login password</strong> below and sharing it with them — they sign in at <code>/login</code>.
          </p>
        </div>
      )}

      {/* Set login password — reliable, email-free onboarding. */}
      <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem' }}>
        <p style={eyebrow}>Set login password</p>
        <p style={{ ...muted, margin: '0.4rem 0 0.9rem' }}>Give {client.email} a password (no email needed). Share it with them; they sign in at <code>/login</code> and can change it later.</p>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', maxWidth: 460 }}>
          <input
            type="text"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwSet(false) }}
            placeholder="At least 8 characters"
            style={{ ...input, fontFamily: 'monospace' }}
          />
          <button onClick={setClientPassword} disabled={pwSaving || pw.length < 8} style={{ ...btn, whiteSpace: 'nowrap', opacity: pwSaving || pw.length < 8 ? 0.5 : 1 }}>
            {pwSaving ? 'Setting…' : pwSet ? 'Set ✓' : 'Set password'}
          </button>
        </div>
        {pwSet && <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.6rem' }}>Done — {client.email} can now sign in at /login with this password.</p>}
      </div>

      {impersonateUrl && (
        <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem', background: '#fffbeb', borderColor: '#fde68a' }}>
          <p style={eyebrow}>One-time magic link</p>
          <p style={{ margin: '0.6rem 0', color: '#b45309', fontSize: '0.88rem' }}>Open this in a private/incognito window to sign in as {client.email}. Single-use — if it says &quot;expired,&quot; use the password method above instead (more reliable).</p>
          <input readOnly value={impersonateUrl} onFocus={e => e.currentTarget.select()} style={{ ...input, fontFamily: 'monospace', fontSize: '0.75rem' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Plan</p>
          <p style={{ fontSize: '1.4rem', color: '#111', marginTop: '0.4rem' }}><Pill tone={planTone}>{client.plan}</Pill></p>
          <p style={{ ...muted, fontSize: '0.78rem', marginTop: '0.3rem' }}>${client.mrr.toLocaleString()}/mo · ${client.setup_fee} setup</p>
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Status</p>
          <p style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
            {client.status === 'active' ? <Pill tone="good">active</Pill>
              : client.status === 'paused' ? <Pill tone="warn">paused</Pill>
              : <Pill tone="bad">churned</Pill>}
          </p>
          {client.paused_at && <p style={{ ...muted, fontSize: '0.75rem', marginTop: '0.4rem' }}>since {new Date(client.paused_at).toLocaleDateString()}</p>}
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>DMs total</p>
          <p style={{ fontSize: '2rem', color: '#111', marginTop: '0.4rem' }}>{messages.length >= 15 ? '15+' : messages.length}</p>
          <p style={{ ...muted, fontSize: '0.75rem' }}>shown · all in inbox</p>
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Leads (recent)</p>
          <p style={{ fontSize: '2rem', color: '#111', marginTop: '0.4rem' }}>{leads.length}</p>
        </div>
      </div>

      {/* Billing */}
      <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={eyebrow}>Billing</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
              {(() => {
                const bs = client.billing_status || 'none'
                if (bs === 'active' || bs === 'trialing') return <><Pill tone="good">{bs}</Pill> · ${client.mrr.toLocaleString()}/mo</>
                if (bs === 'past_due') return <><Pill tone="bad">past due</Pill> · payment failed</>
                if (bs === 'canceled') return <><Pill tone="bad">canceled</Pill></>
                return <><Pill tone="neutral">not billed</Pill> · ${client.mrr.toLocaleString()}/mo + ${client.setup_fee} setup</>
              })()}
            </p>
            {client.stripe_subscription_id && <p style={{ ...muted, fontSize: '0.72rem', marginTop: '0.3rem', fontFamily: 'monospace' }}>{client.stripe_subscription_id}</p>}
          </div>
          <button onClick={createBillingLink} disabled={billingLoading} style={{ ...btn, opacity: billingLoading ? 0.6 : 1 }}>
            {billingLoading ? 'Creating…' : (client.billing_status === 'active' ? 'New payment link' : 'Create payment link')}
          </button>
        </div>
        {billingUrl && (
          <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#f4f4f5', borderRadius: 10 }}>
            <p style={{ ...muted, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Send this Stripe checkout link to {client.email}. They pay → the account flips to active automatically.</p>
            <input readOnly value={billingUrl} onFocus={e => e.currentTarget.select()} style={{ ...input, fontFamily: 'monospace', fontSize: '0.75rem' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={card as React.CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={eyebrow}>Instagram connection</p>
            <button onClick={checkIG} disabled={checking} style={{ ...btnGhost, padding: '0.35rem 0.8rem', fontSize: '0.7rem' }}>{checking ? 'Checking…' : 'Live check'}</button>
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#444' }}>Stored ID: <strong>{client.instagram_account_id || '—'}</strong></p>
            <p style={{ fontSize: '0.85rem', color: '#444', marginTop: '0.3rem' }}>Token: <strong>{client.access_token ? `••••${client.access_token.slice(-6)}` : 'using shared env token'}</strong></p>
            {igStatus && (
              <div style={{ marginTop: '0.8rem', padding: '0.75rem', background: '#f4f4f5', borderRadius: 10 }}>
                {igStatus.connected
                  ? <p style={{ fontSize: '0.85rem' }}><Pill tone="good">live</Pill> @{igStatus.username}</p>
                  : <p style={{ fontSize: '0.85rem' }}><Pill tone="bad">offline</Pill> {igStatus.reason}{igStatus.error ? ` · ${igStatus.error}` : ''}</p>}
              </div>
            )}
          </div>
        </div>

        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Recent audit · this client</p>
          {audits.length === 0 ? (
            <p style={{ ...muted, marginTop: '0.8rem' }}>No actions yet.</p>
          ) : (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {audits.map(a => (
                <div key={a.id} style={{ fontSize: '0.82rem', color: '#444' }}>
                  <span style={{ color: '#111' }}>{a.action}</span> by {a.actor_email}
                  <span style={{ color: '#bbb', float: 'right', fontSize: '0.72rem' }}>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <p style={eyebrow}>Account fields</p>
          {!editing
            ? <button onClick={() => setEditing(true)} style={btnGhost}>Edit</button>
            : <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setDraft(client); setEditing(false) }} style={btnGhost}>Cancel</button>
                <button onClick={save} disabled={saving} style={btn}>{saving ? 'Saving…' : 'Save'}</button>
              </div>}
        </div>
        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem 2rem' }}>
            {[
              ['Name', client.name], ['Email', client.email], ['Industry', client.industry],
              ['MRR', `$${client.mrr.toLocaleString()}`], ['Setup', `$${client.setup_fee}`], ['Avg deal', `$${client.avg_deal_value}`],
              ['IG ID', client.instagram_account_id], ['Token', client.access_token ? `••••${client.access_token.slice(-6)}` : '—'], ['Admin', client.is_admin ? 'yes' : 'no'],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p style={eyebrow}>{k}</p>
                <p style={{ marginTop: '0.4rem', color: '#222', fontSize: '0.95rem' }}>{v || '—'}</p>
              </div>
            ))}
            {client.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={eyebrow}>Notes</p>
                <p style={{ marginTop: '0.4rem', color: '#222', fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{client.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {field('name', 'Name')}
            {field('email', 'Email', 'email')}
            {field('industry', 'Industry')}
            <div>
              <label style={Label}>Plan</label>
              <select value={draft.plan} onChange={e => setDraft({ ...draft, plan: e.target.value })} style={input as React.CSSProperties}>
                <option value="direct">Direct</option>
                <option value="agency">Agency</option>
                <option value="whitelabel">White-label</option>
              </select>
            </div>
            {field('mrr', 'MRR', 'number')}
            {field('setup_fee', 'Setup fee', 'number')}
            {field('avg_deal_value', 'Avg deal value', 'number')}
            {field('instagram_account_id', 'IG account ID')}
            {field('access_token', 'IG access token')}
            <div>
              <label style={Label}>Admin</label>
              <select value={String(draft.is_admin)} onChange={e => setDraft({ ...draft, is_admin: e.target.value === 'true' })} style={input as React.CSSProperties}>
                <option value="false">Regular client</option>
                <option value="true">Admin (full /admin access)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={Label}>Voice profile</label>
              <textarea value={draft.voice_profile || ''} onChange={e => setDraft({ ...draft, voice_profile: e.target.value })} rows={6} style={{ ...input, fontFamily: 'inherit' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={Label}>Notes (internal)</label>
              <textarea value={draft.notes || ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} style={{ ...input, fontFamily: 'inherit' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Latest messages</p>
          {messages.length === 0 ? <p style={{ ...muted, marginTop: '0.8rem' }}>No messages yet.</p> : (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: 380, overflow: 'auto' }}>
              {messages.map(m => (
                <div key={m.id} style={{ borderLeft: m.is_lead ? '2px solid #15803d' : '2px solid #ebebeb', paddingLeft: '0.75rem' }}>
                  <p style={{ fontSize: '0.78rem', color: '#888' }}>@{m.from_username} · {new Date(m.created_at).toLocaleString()} {m.is_lead ? '· LEAD' : ''}</p>
                  <p style={{ fontSize: '0.88rem', color: '#222', marginTop: 2 }}>{m.content}</p>
                  {m.ai_reply && <p style={{ fontSize: '0.82rem', color: '#555', marginTop: 4, fontStyle: 'italic' }}>↳ {m.ai_reply}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Recent leads</p>
          {leads.length === 0 ? <p style={{ ...muted, marginTop: '0.8rem' }}>None.</p> : (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {leads.map(l => (
                <div key={l.id} style={{ padding: '0.65rem 0.85rem', background: '#f4f4f5', borderRadius: 10 }}>
                  <p style={{ fontSize: '0.9rem', color: '#111' }}>@{l.from_username}</p>
                  {l.intent && <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>{l.intent}</p>}
                  <p style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>{new Date(l.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
