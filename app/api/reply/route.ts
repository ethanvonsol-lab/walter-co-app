import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  const { message, voiceProfile } = await req.json()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: `You are a social media assistant replying on behalf of a business owner on Instagram.
    
Here is the personality and voice profile of the person you are replying as:
${voiceProfile}

Rules:
- Keep replies short and conversational (1-3 sentences max)
- Sound like a real human, not a bot
- Never mention you are an AI
- If asked about pricing, appointments, or anything you can't answer confidently, say: "Great question! I'll get [the owner] to reach out to you personally 😊"
- Always end with a question or a friendly call to action`,
    messages: [
      { role: 'user', content: message }
    ],
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ reply })
}