import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

async function sendInstagramReply(recipientId: string, message: string) {
  const response = await fetch(
    `https://graph.instagram.com/v21.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    }
  )
  const data = await response.json()
  console.log('Instagram reply response:', JSON.stringify(data))
  return data
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('Webhook received:', JSON.stringify(body, null, 2))

  try {
    const entry = body.entry?.[0]
    const messaging = entry?.messaging?.[0]

    console.log('Entry ID:', entry?.id)
    console.log('Messaging:', JSON.stringify(messaging, null, 2))

    if (!messaging) {
      return NextResponse.json({ status: 'no messaging' })
    }

    const senderId = messaging.sender.id
    const messageText = messaging.message?.text

    if (!messageText) {
      return NextResponse.json({ status: 'no text' })
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('instagram_account_id', entry.id)
      .single()

    console.log('Client found:', clientData ? 'yes' : 'no')

    if (!clientData) {
      return NextResponse.json({ status: 'client not found', entry_id: entry.id })
    }

    const voiceProfile = clientData.voice_profile || 'You are a friendly business assistant.'

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
      messages: [{ role: 'user', content: messageText }],
    })

    const aiReply = response.content[0].type === 'text' ? response.content[0].text : ''

    const leadKeywords = ['price', 'cost', 'how much', 'interested', 'buy', 'purchase', 'book', 'appointment', 'available', 'sign up']
    const isLead = leadKeywords.some(keyword => messageText.toLowerCase().includes(keyword))

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

    if (isLead && savedMessage) {
      await supabase.from('leads').insert({
        client_id: clientData.id,
        message_id: savedMessage.id,
        from_username: senderId,
        intent_summary: `User asked: "${messageText}"`,
        status: 'new',
      })
    }

    await sendInstagramReply(senderId, aiReply)
    return NextResponse.json({ status: 'ok', reply: aiReply })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}