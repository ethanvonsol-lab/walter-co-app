import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, Pill } from '@/components/admin-ui'
import { tabular } from '@/lib/theme'
import HealthRunner from './HealthRunner'

export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  // For every active client, grab their most recent snapshot.
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, instagram_account_id, access_token, status')
    .neq('status', 'churned')
    .order('name')

  const ids = (clients ?? []).map(c => c.id)
  const { data: snaps } = ids.length
    ? await supabaseAdmin.from('ig_health_snapshots').select('*').in('client_id', ids).order('checked_at', { ascending: false })
    : { data: [] as Array<{ client_id: string; connected: boolean; username: string | null; reason: string | null; error: string | null; checked_at: string }> }

  const latest = new Map<string, { connected: boolean; username: string | null; reason: string | null; error: string | null; checked_at: string }>()
  for (const s of snaps ?? []) {
    if (!latest.has(s.client_id)) latest.set(s.client_id, s)
  }

  const rows = (clients ?? []).map(c => ({
    id: c.id,
    name: c.name || c.email,
    has_token: !!c.access_token,
    snap: latest.get(c.id) || null,
  }))

  const broken = rows.filter(r => r.snap && !r.snap.connected)
  const healthy = rows.filter(r => r.snap && r.snap.connected).length
  const unchecked = rows.filter(r => !r.snap).length

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Fleet health</p>
        <h1 style={h1}>Instagram connections</h1>
        <p style={muted}>Live status of every client&apos;s IG token. Cron runs nightly; click below to check now.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Healthy</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#15803d', marginTop: '0.6rem', ...tabular }}>{healthy}</p>
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Broken</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#b91c1c', marginTop: '0.6rem', ...tabular }}>{broken.length}</p>
        </div>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>Not yet checked</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#a1a1aa', marginTop: '0.6rem', ...tabular }}>{unchecked}</p>
        </div>
      </div>

      <div style={{ ...(card as React.CSSProperties), marginBottom: '1.5rem' }}>
        <HealthRunner />
      </div>

      <div style={card as React.CSSProperties}>
        <p style={eyebrow}>All clients</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.8rem' }}>
          <thead>
            <tr>
              {['Client', 'Status', 'Username', 'Token', 'Last check'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', borderBottom: '1px solid #ebebed' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { /* no-op; allow link */ }}>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.9rem', borderBottom: '1px solid #f4f4f5' }}>
                  <a href={`/admin/clients/${r.id}`} style={{ color: '#111', textDecoration: 'none' }}>{r.name}</a>
                </td>
                <td style={{ padding: '0.7rem 0.6rem', borderBottom: '1px solid #f4f4f5' }}>
                  {!r.snap ? <Pill>unchecked</Pill>
                    : r.snap.connected ? <Pill tone="good">live</Pill>
                    : <Pill tone="bad">{r.snap.reason || 'offline'}</Pill>}
                </td>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.85rem', color: '#444', borderBottom: '1px solid #f4f4f5' }}>{r.snap?.username ? `@${r.snap.username}` : '—'}</td>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.78rem', color: '#666', borderBottom: '1px solid #f4f4f5' }}>{r.has_token ? 'own' : 'shared env'}</td>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.78rem', color: '#888', borderBottom: '1px solid #f4f4f5' }}>{r.snap ? new Date(r.snap.checked_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
