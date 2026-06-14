import { supabaseAdmin } from '@/lib/supabase-admin'
import NewClientForm from './NewClientForm'
import { eyebrow, h1, muted } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

export default async function NewClient() {
  // Agency parent options — any client flagged as plan='agency' can parent.
  const { data: agencies } = await supabaseAdmin
    .from('clients')
    .select('id, name, email')
    .in('plan', ['agency', 'whitelabel'])
    .order('name')

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Clients · New</p>
        <h1 style={h1}>Create a client account</h1>
        <p style={muted}>Sends them an invite email, creates their dashboard account, and slots them into your fleet.</p>
      </div>
      <NewClientForm agencies={(agencies ?? []).map(a => ({ id: a.id, label: a.name || a.email }))} />
    </div>
  )
}
