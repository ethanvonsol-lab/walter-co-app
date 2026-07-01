import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Lead profiling (Day 3). Given a lead, read its DM conversation and extract a
// sales qualification profile — budget, timeline, pain point, decision-maker —
// from what the PROSPECT actually said. User-triggered + low-volume, so it uses
// Sonnet with structured JSON (mirrors /api/insights). Result is cached on the
// leads row (enriched_at) so it only runs once per lead unless refreshed.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    budget_range: { type: 'string' },
    timeline: { type: 'string' },
    pain_point: { type: 'string' },
    decision_maker: { type: 'string' },
  },
  required: ['budget_range', 'timeline', 'pain_point', 'decision_maker'],
}

type Profile = { budget_range: string; timeline: string; pain_point: string; decision_maker: string }
const UNKNOWN: Profile = { budget_range: 'Unknown', timeline: 'Unknown', pain_point: 'Unknown', decision_maker: 'Unknown' }

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()
    if (!leadId) return NextResponse.json({ profile: UNKNOWN })

    const { data: lead } = await supabase
      .from('leads')
      .select('id, client_id, from_username')
      .eq('id', leadId)
      .maybeSingle()
    if (!lead) return NextResponse.json({ profile: UNKNOWN })

    const { data: msgs } = await supabase
      .from('messages')
      .select('content, ai_reply, created_at')
      .eq('client_id', lead.client_id)
      .eq('from_username', lead.from_username)
      .order('created_at', { ascending: true })
      .limit(40)

    const transcript = (msgs || [])
      .map(m => `Them: ${m.content || ''}${m.ai_reply ? `\nYou: ${m.ai_reply}` : ''}`)
      .join('\n')
      .slice(0, 6000)

    if (!transcript.trim()) {
      await supabase.from('leads').update({ ...UNKNOWN, enriched_at: new Date().toISOString() }).eq('id', leadId)
      return NextResponse.json({ profile: UNKNOWN })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: `You extract a sales qualification profile from an Instagram DM conversation between a business ("You") and a prospect ("Them"). Use ONLY what the PROSPECT actually revealed — never guess or infer beyond what's said.

Return four short fields:
- budget_range: their budget or price sensitivity (e.g. "$5k–10k", "budget-conscious", "premium ok"). Use a number/range ONLY if the prospect actually stated one. Never infer a budget from enthusiasm — someone saying they're "really interested" or "love it" reveals NO budget, so that is "Unknown".
- timeline: how soon they want to act (e.g. "this month", "ASAP", "just exploring").
- pain_point: the core problem they want solved, in a few words.
- decision_maker: whether they're the one who decides (e.g. "Yes", "Needs partner's sign-off").

Use exactly "Unknown" for anything the prospect hasn't indicated. Keep each value under 8 words. No preamble.`,
      messages: [{ role: 'user', content: transcript }],
      output_config: { format: { type: 'json_schema', schema } },
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let profile: Profile
    try {
      profile = { ...UNKNOWN, ...JSON.parse(text) }
    } catch {
      profile = UNKNOWN
    }

    await supabase
      .from('leads')
      .update({
        budget_range: profile.budget_range,
        timeline: profile.timeline,
        pain_point: profile.pain_point,
        decision_maker: profile.decision_maker,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Lead enrich error:', error)
    return NextResponse.json({ profile: UNKNOWN }, { status: 200 })
  }
}
