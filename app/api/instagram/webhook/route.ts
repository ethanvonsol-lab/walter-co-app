import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// This handles Meta's webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// This handles incoming messages from Instagram
export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    const entry = body.entry?.[0]
    const messaging = entry?.messaging?.[0]

    if (!messaging) {
      return NextResponse.json({ status: 'no messaging' })
    }

    const senderId = messaging.sender.id
    const messageText = messaging.message?.text

    if (!messageText) {
      return NextResponse.json({ status: 'no text' })
    }

    // Find the client this Instagram account belongs to
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('instagram_account_id', entry.id)
      .single()

    if (!clientData) {
      return NextResponse.json({ status: 'client not found' })
    }

    const voiceProfile = clientData.voice_profile || 'You are a friendly business assistant.'

    // Generate AI reply
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
- If asked about pricing, appointments, or anything you can't answer confidently, say: "Great question! I'll get the owner to reach out to you personally 😊"
- Always end with a question or a friendly call to action`,
      messages: [
        { role: 'user', content: messageText }
      ],
    })

    const aiReply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Detect if this is a lead
    const leadKeywords = ['price', 'cost', 'how much', 'interested', 'buy', 'purchase', 'book', 'appointment', 'available', 'sign up']
    const isLead = leadKeywords.some(keyword => messageText.toLowerCase().includes(keyword))

    // Save message to database
    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        client_id: clientData.id,
        instagram_message_id: messaging.message.mid,
        type: 'dm',
        from_username: senderId,
        content: messageText,
        ai_reply: aiReply,
        status: 'replied',
        is_lead: isLead,
      })
      .select()
      .single()

    // If lead detected, save to leads table
    if (isLead && savedMessage) {
      await supabase.from('leads').insert({
        client_id: clientData.id,
        message_id: savedMessage.id,
        from_username: senderId,
        intent_summary: `User asked: "${messageText}"`,
        status: 'new',
      })
    }

    return NextResponse.json({ status: 'ok', reply: aiReply })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}