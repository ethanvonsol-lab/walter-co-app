'use client'

import { useState } from 'react'
import Link from 'next/link'
import { card, label as Label, input, btn, btnGhost, muted } from '@/components/admin-ui'

interface Agency { id: string; label: string }

export default function NewClientForm({ agencies }: { agencies: Agency[] }) {
  const [form, setForm] = useState({
    name: '', email: '', industry: '',
    plan: 'direct', mrr: '500', setup_fee: '350', avg_deal_value: '1500',
    agency_id: '', instagram_account_id: '', access_token: '',
    voice_profile: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const planPreset = (plan: string) => {
    if (plan === 'agency') return { mrr: '1000', setup_fee: '500' }
    if (plan === 'whitelabel') return { mrr: '1000', setup_fee: '500' }
    return { mrr: '500', setup_fee: '350' }
  }

  const onPlanChange = (v: string) => {
    const p = planPreset(v)
    setForm(f => ({ ...f, plan: v, mrr: p.mrr, setup_fee: p.setup_fee }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          agency_id: form.agency_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      // If the invite email couldn't send (no SMTP yet), flag it on the detail
      // page so the admin knows to onboard via the "View as client" link.
      const suffix = data.emailSent ? '' : '?welcome=no_email'
      window.location.href = `/admin/clients/${data.id}${suffix}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setSubmitting(false)
    }
  }

  const field = (k: keyof typeof form, lbl: string, type: string = 'text', placeholder: string = '') => (
    <div key={k}>
      <label style={Label}>{lbl}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} style={input} />
    </div>
  )

  return (
    <form onSubmit={submit} style={card as React.CSSProperties}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {field('name', 'Name', 'text', 'Jane Doe')}
        {field('email', 'Email *', 'email', 'jane@brand.com')}
        {field('industry', 'Industry', 'text', 'Fitness coach, esthetician…')}
        <div>
          <label style={Label}>Plan</label>
          <select value={form.plan} onChange={e => onPlanChange(e.target.value)} style={input as React.CSSProperties}>
            <option value="direct">Direct ($350 + $500/mo)</option>
            <option value="agency">Agency ($500 + $1k/mo)</option>
            <option value="whitelabel">White-label</option>
          </select>
        </div>
        {field('mrr', 'MRR ($/mo)', 'number')}
        {field('setup_fee', 'Setup fee ($)', 'number')}
        {field('avg_deal_value', 'Avg deal value ($)', 'number')}
        <div>
          <label style={Label}>Parent agency</label>
          <select value={form.agency_id} onChange={e => set('agency_id', e.target.value)} style={input as React.CSSProperties}>
            <option value="">— None (direct) —</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', margin: '1.5rem 0' }} />
      <p style={{ ...muted, fontSize: '0.78rem', marginBottom: '0.8rem' }}>Optional — set later from the client&apos;s detail page.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {field('instagram_account_id', 'IG account ID', 'text', '17841456859075586')}
        {field('access_token', 'IG access token', 'text', 'IGQVJ…')}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={Label}>Voice profile (optional)</label>
        <textarea value={form.voice_profile} onChange={e => set('voice_profile', e.target.value)} rows={4} style={{ ...input, fontFamily: 'inherit' }} placeholder="Paste their onboarding answers if you have them. Otherwise the client fills this in." />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={Label}>Internal notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...input, fontFamily: 'inherit' }} placeholder="Anything for you and the team." />
      </div>

      {error && <p style={{ color: '#b91c1c', marginTop: '1rem', fontSize: '0.88rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="submit" disabled={submitting || !form.email} style={{ ...btn, opacity: submitting || !form.email ? 0.6 : 1 }}>
          {submitting ? 'Creating…' : 'Create client & send invite'}
        </button>
        <Link href="/admin/clients" style={{ ...btnGhost, textDecoration: 'none', display: 'inline-block' }}>Cancel</Link>
      </div>
    </form>
  )
}
