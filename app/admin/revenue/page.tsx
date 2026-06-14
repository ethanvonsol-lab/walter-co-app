import { supabaseAdmin } from '@/lib/supabase-admin'
import { card, eyebrow, h1, muted, Pill } from '@/components/admin-ui'
import { c, statNumber } from '@/lib/theme'

export const dynamic = 'force-dynamic'

interface Client { id: string; name: string | null; email: string; status: string; plan: string; mrr: number; setup_fee: number; agency_id: string | null; created_at: string }

export default async function RevenuePage() {
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, plan, mrr, setup_fee, agency_id, created_at')
    .order('mrr', { ascending: false })

  const all = (clients ?? []) as Client[]
  const active = all.filter(c => c.status === 'active')
  const paused = all.filter(c => c.status === 'paused')
  const churned = all.filter(c => c.status === 'churned')
  const mrr = active.reduce((s, c) => s + (c.mrr || 0), 0)
  const arr = mrr * 12
  const setupYTD = all.filter(c => new Date(c.created_at).getFullYear() === new Date().getFullYear()).reduce((s, c) => s + (c.setup_fee || 0), 0)

  const byPlan = ['direct', 'agency', 'whitelabel'].map(p => ({
    plan: p,
    count: active.filter(c => c.plan === p).length,
    mrr: active.filter(c => c.plan === p).reduce((s, c) => s + (c.mrr || 0), 0),
  }))

  // 12-month new-client trend.
  const months: { label: string; count: number; mrrAdded: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const inMonth = all.filter(c => {
      const t = new Date(c.created_at)
      return t >= start && t < end
    })
    months.push({
      label: d.toLocaleString('en', { month: 'short' }),
      count: inMonth.length,
      mrrAdded: inMonth.reduce((s, c) => s + (c.mrr || 0), 0),
    })
  }
  const maxCount = Math.max(1, ...months.map(m => m.count))

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Revenue</p>
        <h1 style={h1}>The board</h1>
        <p style={muted}>Live MRR, plan breakdown, growth curve.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={card as React.CSSProperties}><p style={eyebrow}>MRR</p><p style={{ ...statNumber, marginTop: '0.6rem' }}>${mrr.toLocaleString()}</p></div>
        <div style={card as React.CSSProperties}><p style={eyebrow}>ARR</p><p style={{ ...statNumber, marginTop: '0.6rem' }}>${arr.toLocaleString()}</p></div>
        <div style={card as React.CSSProperties}><p style={eyebrow}>Setup fees · YTD</p><p style={{ ...statNumber, marginTop: '0.6rem' }}>${setupYTD.toLocaleString()}</p></div>
        <div style={card as React.CSSProperties}><p style={eyebrow}>Customers</p><p style={{ ...statNumber, marginTop: '0.6rem' }}>{active.length}</p><p style={{ ...muted, fontSize: '0.75rem', marginTop: '0.4rem' }}>{paused.length} paused · {churned.length} churned</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>By plan</p>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {byPlan.map(p => (
              <div key={p.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.9rem', background: '#f4f4f5', borderRadius: 10 }}>
                <Pill tone={p.plan === 'direct' ? 'neutral' : 'good'}>{p.plan}</Pill>
                <span style={{ fontSize: '0.88rem' }}>{p.count} clients · <strong>${p.mrr.toLocaleString()}/mo</strong></span>
              </div>
            ))}
          </div>
        </div>

        <div style={card as React.CSSProperties}>
          <p style={eyebrow}>New clients · last 12 months</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginTop: '1.5rem', height: 140 }}>
            {months.map(m => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div title={`${m.count} new · $${m.mrrAdded} MRR`} style={{
                  width: '100%', height: `${(m.count / maxCount) * 100}%`,
                  minHeight: m.count > 0 ? 4 : 0,
                  background: c.ink, borderRadius: '4px 4px 0 0',
                }} />
                <p style={{ fontSize: '0.65rem', color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={card as React.CSSProperties}>
        <p style={eyebrow}>Top clients by MRR</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.8rem' }}>
          <thead>
            <tr>{['Client', 'Plan', 'MRR', 'Setup', 'Status'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', borderBottom: '1px solid #ebebed' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {all.slice(0, 20).map(c => (
              <tr key={c.id}>
                <td style={{ padding: '0.7rem 0.6rem', borderBottom: '1px solid #f4f4f5' }}><a href={`/admin/clients/${c.id}`} style={{ color: '#111', textDecoration: 'none' }}>{c.name || c.email}</a></td>
                <td style={{ padding: '0.7rem 0.6rem', borderBottom: '1px solid #f4f4f5' }}><Pill tone={c.plan === 'direct' ? 'neutral' : 'good'}>{c.plan}</Pill></td>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.9rem', borderBottom: '1px solid #f4f4f5' }}>${(c.mrr || 0).toLocaleString()}</td>
                <td style={{ padding: '0.7rem 0.6rem', fontSize: '0.9rem', color: '#666', borderBottom: '1px solid #f4f4f5' }}>${c.setup_fee || 0}</td>
                <td style={{ padding: '0.7rem 0.6rem', borderBottom: '1px solid #f4f4f5' }}>
                  {c.status === 'active' ? <Pill tone="good">active</Pill> : c.status === 'paused' ? <Pill tone="warn">paused</Pill> : <Pill tone="bad">churned</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
