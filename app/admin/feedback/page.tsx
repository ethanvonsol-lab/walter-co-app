import { supabaseAdmin } from '@/lib/supabase-admin'
import { eyebrow, h1, muted } from '@/components/admin-ui'
import FeedbackBoard, { type FeedbackRow } from './FeedbackBoard'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  const [{ data: feedback }, { data: clients }] = await Promise.all([
    supabaseAdmin
      .from('feedback')
      .select('id, client_id, type, title, details, priority, status, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('clients').select('id, name, email'),
  ])

  const nameById = new Map((clients ?? []).map(c => [c.id, c.name || c.email]))
  const rows: FeedbackRow[] = (feedback ?? []).map(f => ({
    ...f,
    client_name: f.client_id ? (nameById.get(f.client_id) ?? 'Unknown') : 'Anonymous',
  }))

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Walter & Co · Admin</p>
        <h1 style={h1}>Feedback</h1>
        <p style={muted}>Bugs, ideas and tweak requests from every client.</p>
      </div>
      <FeedbackBoard initial={rows} />
    </div>
  )
}
