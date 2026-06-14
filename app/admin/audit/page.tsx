import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, Pill } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

interface Entry { id: string; actor_email: string; action: string; target_client_id: string | null; meta: Record<string, unknown> | null; created_at: string }

const actionTone = (a: string): 'good' | 'bad' | 'warn' | 'neutral' => {
  if (a.includes('delete')) return 'bad'
  if (a.includes('impersonate') || a.includes('pause')) return 'warn'
  if (a.includes('create')) return 'good'
  return 'neutral'
}

export default async function AuditPage() {
  const [{ data: entries }, { data: clients }] = await Promise.all([
    supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('clients').select('id, name, email'),
  ])

  const names = new Map<string, string>()
  for (const c of clients ?? []) names.set(c.id, c.name || c.email)

  const rows = (entries ?? []) as Entry[]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Audit log</p>
        <h1 style={h1}>Every admin action</h1>
        <p style={muted}>Append-only. Last 200 entries.</p>
      </div>

      <div style={card as React.CSSProperties}>
        {rows.length === 0 ? (
          <p style={muted}>No actions recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['When', 'Action', 'Target', 'Actor', 'Meta'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', borderBottom: '1px solid #ebebed' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id}>
                  <td style={{ padding: '0.65rem', fontSize: '0.78rem', color: '#888', borderBottom: '1px solid #f4f4f5', whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString()}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f4f4f5' }}><Pill tone={actionTone(e.action)}>{e.action}</Pill></td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f4f4f5', fontSize: '0.85rem' }}>
                    {e.target_client_id
                      ? <a href={`/admin/clients/${e.target_client_id}`} style={{ color: '#111', textDecoration: 'none' }}>{names.get(e.target_client_id) || e.target_client_id.slice(0, 8)}</a>
                      : '—'}
                  </td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f4f4f5', fontSize: '0.82rem', color: '#444' }}>{e.actor_email}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f4f4f5', fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{e.meta ? JSON.stringify(e.meta) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
