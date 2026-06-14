import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Pings every active client's IG token against the Graph API and stores a
// snapshot per check in ig_health_snapshots. Two callers:
//  - the operator clicks "Run health check" on /admin/health
//  - a Vercel cron schedules a POST with `Authorization: Bearer ${CRON_SECRET}`.

export const maxDuration = 60

async function ping(token: string): Promise<{ connected: boolean; username?: string | null; reason?: string; error?: string }> {
  if (!token) return { connected: false, reason: 'no_token' }
  try {
    const r = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`)
    const d = await r.json()
    if (r.ok && d.user_id) return { connected: true, username: d.username || null }
    return { connected: false, reason: 'token_rejected', error: d?.error?.message || `HTTP ${r.status}` }
  } catch (e) {
    return { connected: false, reason: 'network', error: e instanceof Error ? e.message : 'unknown' }
  }
}

async function runHealthCheck() {
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, access_token, instagram_account_id, status')
    .neq('status', 'churned')

  const fallback = process.env.INSTAGRAM_ACCESS_TOKEN || ''
  const results = await Promise.all((clients ?? []).map(async c => {
    const token = c.access_token || fallback
    const res = await ping(token)
    return { client: c, res, used_own_token: !!c.access_token }
  }))

  const rows = results.map(r => ({
    client_id: r.client.id,
    connected: r.res.connected,
    username: r.res.username || null,
    reason: r.res.reason || null,
    error: r.res.error || null,
  }))
  if (rows.length) await supabaseAdmin.from('ig_health_snapshots').insert(rows)

  const broken = results.filter(r => !r.res.connected).map(r => ({
    id: r.client.id, name: r.client.name || r.client.email, reason: r.res.reason, error: r.res.error, own_token: r.used_own_token,
  }))

  // Alert on broken tokens. Posts to ALERT_WEBHOOK_URL (Slack or Discord
  // incoming webhook — both accept a JSON body with a `text`/`content` field).
  // Fire-and-forget; never let a webhook failure break the health check.
  if (broken.length > 0) {
    await notifyBroken(broken).catch(e => console.error('health alert failed:', e))
  }

  return {
    checked: results.length,
    healthy: results.filter(r => r.res.connected).length,
    broken,
  }
}

async function notifyBroken(broken: Array<{ name: string; reason?: string | null; error?: string | null }>): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return
  const lines = broken.map(b => `• ${b.name} — ${b.reason || 'offline'}${b.error ? ` (${b.error})` : ''}`).join('\n')
  const message = `⚠️ Walter & Co — ${broken.length} Instagram connection${broken.length === 1 ? '' : 's'} broken:\n${lines}`
  // Slack uses `text`; Discord uses `content`. Send both so one webhook URL works either way.
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message, content: message }),
  })
}

export async function POST(req: NextRequest) {
  // Cron path — Vercel can call this with the configured secret.
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    const summary = await runHealthCheck()
    return NextResponse.json(summary)
  }

  // Operator path — gated by admin.
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const summary = await runHealthCheck()
  return NextResponse.json(summary)
}

// Vercel cron uses GET in some configurations — accept it too.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    const summary = await runHealthCheck()
    return NextResponse.json(summary)
  }
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
