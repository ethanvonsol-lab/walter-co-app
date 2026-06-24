import { NextRequest, NextResponse } from 'next/server'
import { sendDiscord } from '@/lib/discord'

// Lets a client verify their Discord webhook from Settings (browsers can't POST
// to a Discord webhook directly — CORS — so it goes through the server).
export async function POST(req: NextRequest) {
  const { webhookUrl } = await req.json()
  if (!webhookUrl) return NextResponse.json({ ok: false, error: 'No webhook URL' }, { status: 400 })
  const ok = await sendDiscord(webhookUrl, '✅ **Walter & Co** is connected to this channel — new leads will show up here.')
  return NextResponse.json({ ok })
}
