import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { buildSalesSystemPrompt } from '@/lib/sales-prompt'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function sendInstagramReply(recipientId: string, message: string, accessToken: string) {
  const response = await fetch(
    `https://graph.instagram.com/v21.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    }
  )
  const data = await response.json()
  return data
}

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

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('instagram_account_id', entry.id)
      .single()

    if (!clientData) {
      return NextResponse.json({ status: 'client not found', entry_id: entry.id })
    }

    // Per-conversation AI switch: if the owner paused the bot for this person,
    // record the DM but don't auto-reply (they're taking the convo over).
    // Defensive — a missing conversation_settings table/row defaults to enabled.
    const { data: convo } = await supabase
      .from('conversation_settings')
      .select('ai_enabled')
      .eq('client_id', clientData.id)
      .eq('from_username', senderId)
      .maybeSingle()
    const aiEnabled = convo?.ai_enabled !== false

    // Use the client's own Instagram token if they've connected one; otherwise
    // fall back to the shared token (the original single-account setup).
    const accessToken = clientData.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || ''

    let aiReply = ''
    if (aiEnabled) {
    // Build the sales-focused system prompt: the client's voice + their offer,
    // goal, and how aggressive they want the AI to close. See lib/sales-prompt.ts.
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: buildSalesSystemPrompt(clientData),
      messages: [
        { role: 'user', content: messageText }
      ],
    })

    aiReply = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // Detect leads — buying intent keywords
    const leadKeywords = ['price', 'cost', 'how much', 'interested', 'buy', 'purchase', 'book', 'appointment', 'available', 'sign up', 'join', 'start', 'package', 'plan', 'invest', 'hire', 'work with', 'collab', 'partnership']
    const isLead = leadKeywords.some(keyword => messageText.toLowerCase().includes(keyword))

    // Detect email in message
    const emailMatch = messageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const detectedEmail = emailMatch ? emailMatch[0] : null

    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        client_id: clientData.id,
        instagram_message_id: messaging.message.mid,
        type: 'dm',
        from_username: senderId,
        content: messageText,
        ai_reply: aiReply,
        status: aiEnabled ? 'replied' : 'manual',
        is_lead: isLead || !!detectedEmail,
      })
      .select()
      .single()

    if ((isLead || detectedEmail) && savedMessage) {
      await supabase.from('leads').insert({
        client_id: clientData.id,
        message_id: savedMessage.id,
        from_username: senderId,
        intent_summary: detectedEmail
          ? `User provided email: ${detectedEmail}. Message: "${messageText}"`
          : `User asked: "${messageText}"`,
        status: 'new',
      })
    }

    if (aiEnabled) {
      await sendInstagramReply(senderId, aiReply, accessToken)
    }
    return NextResponse.json({ status: aiEnabled ? 'ok' : 'manual', reply: aiReply })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}