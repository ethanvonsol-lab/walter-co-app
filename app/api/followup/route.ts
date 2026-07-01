import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Inline server client (no user session); kept independent of lib/supabase.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { clientId, username, lastMessage, lastReply } = await req.json()

    let voiceProfile = ''
    if (clientId) {
      const { data } = await supabase
        .from('clients')
        .select('voice_profile')
        .eq('id', clientId)
        .maybeSingle()
      voiceProfile = data?.voice_profile || ''
    }

    // User-clicked, low-volume, quality-sensitive → Sonnet (the high-volume
    // auto-replies stay on Haiku in /api/reply + the webhook).
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: `You write Instagram DM follow-ups on behalf of a real person, in their exact voice.

${voiceProfile ? `Here is how they communicate:\n${voiceProfile}` : 'Be warm, casual and human.'}

Write ONE short follow-up DM to gently re-engage @${username}, who went quiet after the last exchange. Rules:
- Sound like a real person texting — casual, warm, 1-2 sentences max.
- Low pressure. No "just following up!" corporate energy. No guilt.
- End with an easy question or a clear, light next step.
- Never mention being an AI. Vary your opener — don't start with "Hey!".
- Return ONLY the message text, no quotes, no preamble.`,
      messages: [
        {
          role: 'user',
          content: `They last messaged: "${lastMessage}". I replied: "${lastReply || '(no reply sent yet)'}". They've gone quiet — draft my follow-up.`,
        },
      ],
    })

    const followup = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ followup })
  } catch (error) {
    console.error('Follow-up error:', error)
    return NextResponse.json(
      { followup: '', error: "Walter couldn't draft a follow-up right now." },
      { status: 200 }
    )
  }
}
