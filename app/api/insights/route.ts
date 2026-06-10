import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    insights: { type: 'array', items: { type: 'string' } },
  },
  required: ['insights'],
}

const EMPTY = {
  insights: [
    'Not enough activity yet — insights appear once Walter has handled some DMs.',
  ],
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json()
    if (!clientId) return NextResponse.json({ ...EMPTY })

    const { data: msgs } = await supabase
      .from('messages')
      .select('content, is_lead, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!msgs || msgs.length === 0) return NextResponse.json({ ...EMPTY })

    // Aggregate so we send a tiny, cheap summary (not raw messages).
    const now = Date.now()
    const within = (d: number, days: number) => now - new Date(d).getTime() < days * 86400000
    const total = msgs.length
    const leads = msgs.filter((m) => m.is_lead).length
    const escalated = msgs.filter((m) => m.status === 'escalated').length
    const last7 = msgs.filter((m) => within(m.created_at, 7)).length
    const prev7 = msgs.filter((m) => !within(m.created_at, 7) && within(m.created_at, 14)).length
    const conversion = total > 0 ? Math.round((leads / total) * 100) : 0

    const wordMap: Record<string, number> = {}
    msgs.forEach((m) =>
      (m.content || '')
        .toLowerCase()
        .split(/\s+/)
        .forEach((w: string) => {
          const c = w.replace(/[^a-z]/g, '')
          if (c.length > 3) wordMap[c] = (wordMap[c] || 0) + 1
        })
    )
    const topWords = Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w)
      .join(', ')

    const summary = `Total messages: ${total}. Leads captured: ${leads} (${conversion}% conversion). Escalated: ${escalated}. Last 7 days: ${last7} messages vs ${prev7} the previous 7 days. Most common words in incoming DMs: ${topWords}.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      system: `You are Walter, the intelligence layer for an AI that auto-replies to a creator's Instagram DMs and captures leads. Given the performance summary, write exactly 3 insights as short, specific, punchy sentences (each under 18 words): one on what's working, one on what to improve, and one concrete action to take this week. Reference the real numbers. No fluff, no preamble, no markdown.`,
      messages: [{ role: 'user', content: summary }],
      output_config: { format: { type: 'json_schema', schema } },
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let parsed: { insights: string[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { ...EMPTY }
    }
    return NextResponse.json({ insights: (parsed.insights || []).slice(0, 3) })
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json(
      { insights: ["Walter couldn't generate insights right now — try refreshing."] },
      { status: 200 }
    )
  }
}
