import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/admin'
import AdminSidebar from '@/components/AdminSidebar'
import { c, font } from '@/lib/theme'

// Source-of-truth gate. proxy.ts redirects most non-admins, but the proxy uses
// the anon client; this server check uses the service-role client to be sure.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin()
  if (!admin) redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: font }}>
      <AdminSidebar adminName={admin.name} adminEmail={admin.email} />
      <main style={{ marginLeft: 244, padding: '2.25rem 2.5rem' }}>
        {children}
      </main>
    </div>
  )
}
