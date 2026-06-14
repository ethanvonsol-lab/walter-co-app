import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, btn } from '@/components/admin-ui'
import ClientsTable, { type ClientRow } from './ClientsTable'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  // eslint-disable-next-line react-hooks/purity -- server component, dynamic per-request
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: clients }, { data: msgs }] = await Promise.all([
    supabaseAdmin.from('clients').select('id, name, email, industry, status, plan, mrr, agency_id, instagram_account_id, access_token, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('messages').select('client_id, is_lead, created_at').gte('created_at', since7),
  ])

  type Msg = { client_id: string; is_lead: boolean; created_at: string }
  const messages = (msgs ?? []) as Msg[]
  const dms = new Map<string, number>()
  const leads = new Map<string, number>()
  messages.forEach(m => {
    dms.set(m.client_id, (dms.get(m.client_id) || 0) + 1)
    if (m.is_lead) leads.set(m.client_id, (leads.get(m.client_id) || 0) + 1)
  })

  const rows: ClientRow[] = (clients ?? []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    industry: c.industry,
    status: c.status,
    plan: c.plan,
    mrr: c.mrr,
    agency_id: c.agency_id,
    connected: !!c.instagram_account_id,
    using_own_token: !!c.access_token,
    dms_7d: dms.get(c.id) || 0,
    leads_7d: leads.get(c.id) || 0,
    created_at: c.created_at,
  }))

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <p style={eyebrow}>Clients</p>
          <h1 style={h1}>All client accounts</h1>
          <p style={muted}>{rows.length} total · {rows.filter(r => r.status === 'active').length} active · ${rows.reduce((s, r) => s + (r.mrr || 0), 0).toLocaleString()}/mo MRR</p>
        </div>
        <Link href="/admin/clients/new" style={{ ...btn, textDecoration: 'none', display: 'inline-block' }}>+ New client</Link>
      </div>

      <div style={card as React.CSSProperties}>
        <ClientsTable rows={rows} />
      </div>

      <p style={{ ...muted, marginTop: '1rem', fontSize: '0.78rem' }}>Click any row to drill in. Use the search box to filter by name, email, or industry.</p>
    </div>
  )
}
