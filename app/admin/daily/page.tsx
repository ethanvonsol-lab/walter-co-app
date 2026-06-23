import { supabaseAdmin } from '@/lib/supabase-admin'
import { eyebrow, h1, muted } from '@/components/admin-ui'
import DailyMessageManager, { type DailyMessage } from './DailyMessageManager'

export const dynamic = 'force-dynamic'

export default async function AdminDailyPage() {
  const { data } = await supabaseAdmin
    .from('daily_messages')
    .select('id, message, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(14)

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Walter & Co · Admin</p>
        <h1 style={h1}>Daily note</h1>
        <p style={muted}>Post a short note — it shows at the top of every client&apos;s dashboard.</p>
      </div>
      <DailyMessageManager initial={(data ?? []) as DailyMessage[]} />
    </div>
  )
}
