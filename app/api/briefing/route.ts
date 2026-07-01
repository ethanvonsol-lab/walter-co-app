import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Dedicated server client for this machine-to-machine read (no user session).
// Constructed inline so the route doesn't depend on lib/supabase, which is in
// flux across other in-flight branches.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// JSON shape Claude returns: a short brief plus an intent-ranked "act now" list.
const briefingSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    briefing: { type: 'string' },
    leads: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          username: { type: 'string' },
          score: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['username', 'score', 'reason'],
      },
    },
  },
  required: ['briefing', 'leads'],
}

interface BriefingLead {
  username: string
  score: number
  reason: string
}

const EMPTY = {
  briefing:
    "You're all set up, but Walter hasn't handled any DMs yet. Once messages start coming in, your morning briefing will appear here.",
  leads: [] as BriefingLead[],
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json()
    if (!clientId) {
      return NextResponse.json({ ...EMPTY }, { status: 200 })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('name, voice_profile')
      .eq('id', clientId)
      .single()

    // Look at the last 7 days of activity.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: messages } = await supabase
      .from('messages')
      .select('from_username, content, ai_reply, is_lead, status, created_at')
      .eq('client_id', clientId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(60)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ ...EMPTY }, { status: 200 })
    }

    const transcript = messages
      .map(
        (m) =>
          `@${m.from_username} (${new Date(m.created_at).toLocaleString()})${
            m.is_lead ? ' [flagged lead]' : ''
          }: "${m.content}"`
      )
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: `You are Walter, the intelligence layer behind an AI that auto-replies to a creator's Instagram DMs in their voice. Each morning you write the creator a sharp, human briefing of what happened, then rank the hottest leads to act on now.

The creator is ${client?.name || 'the owner'}.${
        client?.voice_profile
          ? ` For context, their voice profile is:\n${client.voice_profile}`
          : ''
      }

Write the "briefing" as 2-4 punchy sentences, warm but direct, like a sharp chief of staff. Call out the single most important thing to do. Reference real usernames and what they asked. No fluff, no preamble, no markdown.

For "leads", return up to 5 conversations ranked by genuine buying intent, highest first. List each person ONCE — never repeat a username. "score" is 0-100 purchase intent and must be grounded in CONCRETE signals: asking price, wanting to book/buy, sharing a budget or contact details, a firm timeline. Vague enthusiasm — someone repeatedly saying they're "interested" or "love this" with no specifics — is mild intent (cap it around 40), NOT hot. Do not let repetition or excitement inflate a score. "reason" is a short phrase (under 12 words) on why they're hot. Only include people who showed real interest — if no one did, return an empty list.`,
      messages: [
        {
          role: 'user',
          content: `Here are the last DMs Walter handled (newest first):\n\n${transcript}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: briefingSchema } },
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let parsed: { briefing: string; leads: BriefingLead[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { ...EMPTY }
    }

    // Keep leads sorted by score, clamp to a sane range, and — critically — keep
    // only ONE entry per person. The prompt asks the model not to repeat a
    // username, but that's not guaranteed; without this the dashboard's pipeline
    // total (which sums these) could double-count a single chatty prospect and
    // over-state pipeline, the exact inflation this change is meant to prevent.
    const seenUser = new Set<string>()
    const leads = (parsed.leads || [])
      .map((l) => ({ ...l, score: Math.max(0, Math.min(100, Math.round(l.score))) }))
      .sort((a, b) => b.score - a.score)
      .filter((l) => {
        const key = (l.username || '').toLowerCase().replace(/^@/, '').trim()
        if (!key || seenUser.has(key)) return false
        seenUser.add(key)
        return true
      })
      .slice(0, 5)

    return NextResponse.json({ briefing: parsed.briefing || EMPTY.briefing, leads })
  } catch (error) {
    console.error('Briefing error:', error)
    return NextResponse.json(
      { briefing: "Walter couldn't generate your briefing right now. Try refreshing in a moment.", leads: [] },
      { status: 200 }
    )
  }
}
