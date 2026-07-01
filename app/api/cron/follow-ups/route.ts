import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildSalesSystemPrompt, type SalesProfile } from '@/lib/sales-prompt'
import { getGif } from '@/lib/gif'

// Daily cron: find leads who went quiet after the AI replied (~24h, no follow-up
// sent) and send ONE re-engagement DM in the client's voice, optionally with a
// GIF. Marks followup_sent_at so nobody gets nagged twice. Scheduled in
// vercel.json; protected by CRON_SECRET.

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const QUIET_HOURS = 24
const MAX_PER_RUN = 25

async function sendDM(igsid: string, text: string, token: string) {
  try {
    await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
    })
  } catch { /* best-effort */ }
}
async function sendGif(igsid: string, url: string, token: string) {
  try {
    await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient: { id: igsid }, message: { attachment: { type: 'image', payload: { url } } } }),
    })
  } catch { /* best-effort */ }
}

export async function GET(req: NextRequest) {
  // Vercel Cron triggers a GET and (when CRON_SECRET is set) adds it as a bearer.
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const cutoff = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString()
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, client_id, from_username, intent_summary, created_at')
    .eq('status', 'new')
    .is('followup_sent_at', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)

  if (!leads || leads.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const clientCache: Record<string, (SalesProfile & { id: string; access_token: string | null }) | null> = {}
  let sent = 0

  for (const lead of leads) {
    // Did they message again since becoming a lead? If so, they're engaged — skip.
    const { count: newer } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', lead.client_id)
      .eq('from_username', lead.from_username)
      .gt('created_at', lead.created_at)
    if (newer && newer > 0) continue

    // Skip if the conversation is paused (owner handling it, or a troll).
    const { data: cs } = await supabaseAdmin
      .from('conversation_settings')
      .select('ai_enabled')
      .eq('client_id', lead.client_id)
      .eq('from_username', lead.from_username)
      .maybeSingle()
    if (cs && cs.ai_enabled === false) continue

    if (!(lead.client_id in clientCache)) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name, access_token, voice_profile, niche, offer, ideal_customer, price_point, main_objection, main_goal, ai_aggressiveness, lead_destination')
        .eq('id', lead.client_id)
        .maybeSingle()
      clientCache[lead.client_id] = client ?? null
    }
    const client = clientCache[lead.client_id]
    const token = client?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || ''
    if (!client || !token) continue

    let text = ''
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 180,
        system: buildSalesSystemPrompt(client),
        messages: [{
          role: 'user',
          content: `(SYSTEM NOTE — not from the prospect: This person messaged you about a day ago showing interest, then went quiet. Their message was: "${lead.intent_summary}". Write a short, warm follow-up DM in your voice to gently re-open the conversation and nudge toward the next step. 1-2 sentences max. Casual, never needy or pushy. Avoid opening with "Hey". Output only the message.)`,
        }],
      })
      text = resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
    } catch { text = '' }
    if (!text) continue

    await sendDM(lead.from_username, text, token)
    const gif = await getGif('checking in friendly wave')
    if (gif) await sendGif(lead.from_username, gif, token)

    await supabaseAdmin.from('leads').update({ followup_sent_at: new Date().toISOString() }).eq('id', lead.id)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
