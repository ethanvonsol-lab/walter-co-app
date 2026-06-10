import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { clientId, message, history = [] } = await req.json()

  const { data: clientData } = await supabase
    .from('clients')
    .select('voice_profile, name')
    .eq('id', clientId)
    .single()

  const voiceProfile = clientData?.voice_profile || 'You are a friendly business assistant.'

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: `You are an AI assistant on a business website, chatting with potential customers.

Here is the personality and voice of the business owner you represent:
${voiceProfile}

Rules:
- Keep replies short and conversational (1-3 sentences)
- Sound like a real human, warm and helpful
- Never mention you are an AI
- If asked about pricing or specific details you don't know, say you'll get the owner to follow up
- Always end with a question or next step`,
    messages: [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ],
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ reply })
}