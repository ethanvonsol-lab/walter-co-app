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

    // Auto-pause: when the OWNER replies to a DM by hand, step aside for that
    // conversation. Instagram echoes back EVERY message sent by the business
    // account (message.is_echo === true) — including our own AI replies. On the
    // Instagram Login API `app_id` is NOT a reliable "this came from our app"
    // signal (our API-sent replies usually have none), so we can't use it to
    // tell our own replies apart from a human one. Instead we match the echo
    // text against the AI reply we just stored for this person: a match means
    // it's our own message → ignore; no match means the owner typed it → pause
    // the AI (they resume from the inbox toggle).
    if (messaging.message?.is_echo) {
      const follower = messaging.recipient?.id
      const echoText = (messaging.message?.text || '').trim()

      // Did WE just send this exact text to this person? Then it's our own AI
      // reply echoing back — never pause on that.
      let isOwnReply = false
      if (follower && echoText) {
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: ownReply } = await supabase
          .from('messages')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('from_username', follower)
          .eq('ai_reply', echoText)
          .gte('created_at', since)
          .limit(1)
          .maybeSingle()
        isOwnReply = !!ownReply
      }

      if (isOwnReply) {
        return NextResponse.json({ status: 'echo ignored (our AI reply)' })
      }

      // No match → a human (the owner) sent it → pause the AI for this convo.
      if (follower) {
        await supabase.from('conversation_settings').upsert(
          { client_id: clientData.id, from_username: follower, ai_enabled: false, updated_at: new Date().toISOString() },
          { onConflict: 'client_id,from_username' },
        )
      }
      return NextResponse.json({ status: 'owner replied — AI paused', from_username: follower })
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
    // Conversation memory: pull the recent thread with this person so the AI
    // knows what's already been said and doesn't re-ask questions or restart
    // with a greeting. Only rows that have both an inbound message and a reply
    // are included, which keeps the user/assistant turns cleanly alternating.
    const { data: history } = await supabase
      .from('messages')
      .select('content, ai_reply')
      .eq('client_id', clientData.id)
      .eq('from_username', senderId)
      .eq('status', 'replied')
      .order('created_at', { ascending: false })
      .limit(12)

    const priorTurns = (history || [])
      .reverse()
      .filter(m => m.content && m.ai_reply)
      .flatMap(m => ([
        { role: 'user' as const, content: m.content as string },
        { role: 'assistant' as const, content: m.ai_reply as string },
      ]))

    // Build the sales-focused system prompt: the client's voice + their offer,
    // goal, and how aggressive they want the AI to close. See lib/sales-prompt.ts.
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: buildSalesSystemPrompt(clientData),
      messages: [
        ...priorTurns,
        { role: 'user', content: messageText },
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