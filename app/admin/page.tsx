import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, Pill } from '@/components/admin-ui'
import { statNumber } from '@/lib/theme'
import FleetBriefing from './FleetBriefing'

export const dynamic = 'force-dynamic'

interface Client { id: string; name: string | null; email: string; status: string; plan: string; mrr: number; agency_id: string | null; instagram_account_id: string | null }
interface Message { client_id: string; is_lead: boolean; created_at: string; status: string }
interface AuditEntry { id: string; actor_email: string; action: string; target_client_id: string | null; created_at: string; meta: Record<string, unknown> | null }

export default async function AdminOverview() {
  // eslint-disable-next-line react-hooks/purity -- server component, dynamic per-request
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line react-hooks/purity -- server component, dynamic per-request
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: clients }, { data: msgs24 }, { data: msgs7 }, { data: audit }] = await Promise.all([
    supabaseAdmin.from('clients').select('id, name, email, status, plan, mrr, agency_id, instagram_account_id'),
    supabaseAdmin.from('messages').select('client_id, is_lead, created_at, status').gte('created_at', since24),
    supabaseAdmin.from('messages').select('client_id, is_lead, created_at, status').gte('created_at', since7),
    supabaseAdmin.from('audit_log').select('id, actor_email, action, target_client_id, created_at, meta').order('created_at', { ascending: false }).limit(8),
  ])

  const allClients = (clients ?? []) as Client[]
  const liveClients = allClients.filter(c => c.status === 'active')
  const m24 = (msgs24 ?? []) as Message[]
  const m7 = (msgs7 ?? []) as Message[]
  const audits = (audit ?? []) as AuditEntry[]

  const dms24 = m24.length
  const leads24 = m24.filter(m => m.is_lead).length
  const dms7 = m7.length
  const leads7 = m7.filter(m => m.is_lead).length
  const mrr = allClients.reduce((s, c) => s + (c.mrr || 0), 0)
  const connected = allClients.filter(c => c.instagram_account_id).length

  const clientNameById = new Map(allClients.map(c => [c.id, c.name || c.email]))

  // Per-client 7-day DM count, used to flag a "quiet" client.
  const dmCount7 = new Map<string, number>()
  m7.forEach(m => dmCount7.set(m.client_id, (dmCount7.get(m.client_id) || 0) + 1))
  const quiet = liveClients
    .map(c => ({ c, n: dmCount7.get(c.id) || 0 }))
    .filter(x => x.n === 0)
    .slice(0, 5)

  const kpi = (eb: string, big: string, sub?: string) => (
    <div style={card as React.CSSProperties}>
      <p style={eyebrow}>{eb}</p>
      <p style={{ ...statNumber, marginTop: '0.7rem' }}>{big}</p>
      {sub ? <p style={{ ...muted, marginTop: '0.4rem', fontSize: '0.78rem' }}>{sub}</p> : null}
    </div>
  )

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Walter & Co · Admin</p>
        <h1 style={h1}>Fleet overview</h1>
        <p style={muted}>Everything happening across every client account, right now.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpi('Active clients', `${liveClients.length}`, `${allClients.length - liveClients.length} paused/churned`)}
        {kpi('Monthly recurring', `$${mrr.toLocaleString()}`, 'Sum of client MRR')}
        {kpi('DMs · 24h', `${dms24}`, `${leads24} leads captured`)}
        {kpi('DMs · 7d', `${dms7}`, `${leads7} leads captured`)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <FleetBriefing />
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Quiet clients · 7d</p>
          <p style={{ ...muted, marginTop: '0.4rem', marginBottom: '1rem', fontSize: '0.8rem' }}>Live accounts with zero DM activity this week. Possible churn signal.</p>
          {quiet.length === 0 ? (
            <p style={muted}>Every active client got at least one DM. 🎯</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quiet.map(({ c }) => (
                <a key={c.id} href={`/admin/clients/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.9rem', background: '#f4f4f5', borderRadius: 10, textDecoration: 'none', color: '#111' }}>
                  <span style={{ fontSize: '0.92rem' }}>{c.name || c.email}</span>
                  <Pill tone="warn">silent</Pill>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Connection coverage</p>
          <p style={{ fontSize: '2rem', color: '#111', marginTop: '0.6rem' }}>{connected} / {allClients.length}</p>
          <p style={{ ...muted, fontSize: '0.78rem', marginTop: '0.3rem' }}>Clients with a stored Instagram account.</p>
          <Link href="/admin/health" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111', textDecoration: 'none', borderBottom: '1px solid #111', paddingBottom: 2 }}>Run health check →</Link>
        </div>

        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Recent admin activity</p>
          {audits.length === 0 ? (
            <p style={{ ...muted, marginTop: '0.8rem' }}>Nothing logged yet.</p>
          ) : (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {audits.map(a => (
                <div key={a.id} style={{ fontSize: '0.82rem', color: '#444' }}>
                  <span style={{ color: '#111', fontWeight: 500 }}>{a.action}</span>
                  {a.target_client_id ? <> · {clientNameById.get(a.target_client_id) || 'unknown'}</> : null}
                  <span style={{ color: '#bbb', float: 'right', fontSize: '0.75rem' }}>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/audit" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111', textDecoration: 'none', borderBottom: '1px solid #111', paddingBottom: 2 }}>Full audit log →</Link>
        </div>
      </div>
    </div>
  )
}
