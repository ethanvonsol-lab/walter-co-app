import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Fleet-wide morning briefing. Uses Opus 4.8 — quality-sensitive, low-volume.
// (Per-client briefing already exists at /api/briefing; this is the cross-
// client cousin for the owner/operator view.)

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    briefing: { type: 'string' },
    flags: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          client: { type: 'string' },
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'med', 'low'] },
        },
        required: ['client', 'issue', 'severity'],
      },
    },
  },
  required: ['briefing', 'flags'],
}

const EMPTY = {
  briefing: "Quiet across the fleet — no DM activity in the last week. Once messages flow, this brief will surface what needs your attention.",
  flags: [] as Array<{ client: string; issue: string; severity: 'high' | 'med' | 'low' }>,
}

export async function POST() {
  try {
    const admin = await getAdmin()
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: clients }, { data: messages }] = await Promise.all([
      supabaseAdmin.from('clients').select('id, name, email, status, plan, mrr, instagram_account_id'),
      supabaseAdmin
        .from('messages')
        .select('client_id, from_username, content, ai_reply, is_lead, status, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ])

    if (!clients || clients.length === 0) {
      return NextResponse.json(EMPTY)
    }

    // Compact per-client snapshot — keeps the prompt small.
    type Msg = { client_id: string; from_username: string; content: string; ai_reply: string; is_lead: boolean; status: string; created_at: string }
    const msgs = (messages ?? []) as Msg[]
    const byClient = new Map<string, Msg[]>()
    msgs.forEach(m => {
      const arr = byClient.get(m.client_id) ?? []
      arr.push(m)
      byClient.set(m.client_id, arr)
    })

    const snapshot = clients.map((c: { id: string; name: string | null; email: string; status: string; mrr: number; instagram_account_id: string | null }) => {
      const list = byClient.get(c.id) ?? []
      const leads = list.filter(m => m.is_lead)
      const unanswered = list.filter(m => m.is_lead && m.status === 'manual').slice(0, 3)
      return {
        name: c.name || c.email,
        status: c.status,
        connected: !!c.instagram_account_id,
        mrr: c.mrr,
        dms_7d: list.length,
        leads_7d: leads.length,
        hot_unanswered: unanswered.map(m => `@${m.from_username}: "${m.content.slice(0, 80)}"`),
      }
    })

    const prompt = `You are the operations brief for Walter & Co, an AI Instagram DM bot SaaS. The owner is reviewing the entire client fleet.

Here is the last 7 days of activity per client:
${JSON.stringify(snapshot, null, 2)}

Write a calm, executive briefing (3–5 sentences) that highlights what the owner should pay attention to today: revenue trends, clients gaining momentum, clients going silent, hot leads that haven't been replied to, broken connections. Be specific — name clients. No fluff, no preamble.

Then return a "flags" array of up to 6 specific things to act on, each with: client name, one-line issue, severity ('high' for revenue/churn/broken-connection risk, 'med' for missed hot leads or sharp drops, 'low' for nice-to-knows).

Respond with JSON matching the schema.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ name: 'fleet_briefing', description: 'Operations briefing for the fleet', input_schema: schema as unknown as Anthropic.Tool['input_schema'] }],
      tool_choice: { type: 'tool', name: 'fleet_briefing' },
    })

    const block = response.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return NextResponse.json(EMPTY)
    return NextResponse.json(block.input)
  } catch (err) {
    console.error('admin briefing error:', err)
    return NextResponse.json(EMPTY)
  }
}
