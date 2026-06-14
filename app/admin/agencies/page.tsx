import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, Pill } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

export default async function AgenciesPage() {
  // eslint-disable-next-line react-hooks/purity -- server component, dynamic per-request
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: clients }, { data: msgs }] = await Promise.all([
    supabaseAdmin.from('clients').select('id, name, email, status, plan, mrr, agency_id, created_at'),
    supabaseAdmin.from('messages').select('client_id, is_lead').gte('created_at', since7),
  ])

  type Client = { id: string; name: string | null; email: string; status: string; plan: string; mrr: number; agency_id: string | null; created_at: string }
  type Msg = { client_id: string; is_lead: boolean }

  const all = (clients ?? []) as Client[]
  const messages = (msgs ?? []) as Msg[]
  const agencies = all.filter(c => c.plan === 'agency' || c.plan === 'whitelabel')

  const groups = agencies.map(a => {
    const children = all.filter(c => c.agency_id === a.id)
    const childIds = new Set(children.map(c => c.id))
    const dms7 = messages.filter(m => childIds.has(m.client_id)).length
    const leads7 = messages.filter(m => childIds.has(m.client_id) && m.is_lead).length
    return {
      a,
      children,
      mrr: children.reduce((s, c) => s + (c.mrr || 0), 0) + (a.mrr || 0),
      dms7, leads7,
    }
  })
  groups.sort((x, y) => y.mrr - x.mrr)

  const directs = all.filter(c => !c.agency_id && c.plan === 'direct')

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Agencies</p>
        <h1 style={h1}>White-label partners</h1>
        <p style={muted}>{agencies.length} agencies · {agencies.reduce((s, g) => s + all.filter(c => c.agency_id === g.id).length, 0)} sub-accounts · {directs.length} direct clients.</p>
      </div>

      {groups.length === 0 ? (
        <div style={card as React.CSSProperties}>
          <p style={muted}>No agency accounts yet. Create a client with plan = &quot;agency&quot; or &quot;white-label&quot; to start one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groups.map(g => (
            <div key={g.a.id} style={card as React.CSSProperties}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={eyebrow}>Agency</p>
                  <h2 style={{ fontSize: '1.4rem', color: '#111', marginTop: '0.3rem' }}><a href={`/admin/clients/${g.a.id}`} style={{ color: '#111', textDecoration: 'none' }}>{g.a.name || g.a.email}</a></h2>
                  <p style={{ ...muted, fontSize: '0.85rem' }}>{g.children.length} sub-accounts · ${g.mrr.toLocaleString()}/mo · {g.dms7} DMs / {g.leads7} leads (7d)</p>
                </div>
                <Pill tone="good">{g.a.plan}</Pill>
              </div>

              {g.children.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr>{['Sub-account', 'Plan', 'MRR', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', borderBottom: '1px solid #ebebed' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {g.children.map(c => (
                      <tr key={c.id}>
                        <td style={{ padding: '0.6rem', borderBottom: '1px solid #f4f4f5' }}><a href={`/admin/clients/${c.id}`} style={{ color: '#222', textDecoration: 'none' }}>{c.name || c.email}</a></td>
                        <td style={{ padding: '0.6rem', borderBottom: '1px solid #f4f4f5', fontSize: '0.82rem' }}>{c.plan}</td>
                        <td style={{ padding: '0.6rem', borderBottom: '1px solid #f4f4f5', fontSize: '0.85rem' }}>${(c.mrr || 0).toLocaleString()}</td>
                        <td style={{ padding: '0.6rem', borderBottom: '1px solid #f4f4f5' }}>
                          {c.status === 'active' ? <Pill tone="good">active</Pill> : c.status === 'paused' ? <Pill tone="warn">paused</Pill> : <Pill tone="bad">churned</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
