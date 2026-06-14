import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ClientDetail from './ClientDetail'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: client }, { data: messages }, { data: leads }, { data: audits }] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', id).maybeSingle(),
    supabaseAdmin.from('messages').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('leads').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('audit_log').select('*').eq('target_client_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!client) notFound()

  let agencyLabel: string | null = null
  if (client.agency_id) {
    const { data: a } = await supabaseAdmin.from('clients').select('name, email').eq('id', client.agency_id).maybeSingle()
    if (a) agencyLabel = a.name || a.email
  }

  return (
    <ClientDetail
      client={client}
      agencyLabel={agencyLabel}
      messages={messages ?? []}
      leads={leads ?? []}
      audits={audits ?? []}
    />
  )
}
