import { NextRequest, NextResponse, after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { buildSalesSystemPrompt } from '@/lib/sales-prompt'
import { sendDiscord } from '@/lib/discord'
import { generateVoiceReply } from '@/lib/voice-memo'
import { resolveIgUsername } from '@/lib/ig-username'
import { getGif } from '@/lib/gif'

// Allow the function to stay alive long enough to honour a reply delay (the
// reply is sent from an after() callback once the delay elapses). Capped at 60s.
export const maxDuration = 60
const MAX_DELAY_SECONDS = 45

// Appended to the reply prompt so the AI can flag trolls. If the sender is
// clearly messing with the bot, it replies with ONLY this token and we disengage.
const DISENGAGE_SUFFIX = `

DISENGAGING — read carefully:
If the person is CLEARLY trolling, abusing you, spamming, sending gibberish, or just messing with you / wasting your time (NOT a real prospect with a genuine question), do not engage. Reply with ONLY this exact token and nothing else:
[DISENGAGE]
Use it sparingly and only for clear cases — never for a real question, a confused person, or someone being a bit blunt. When in doubt, reply normally.`

// ── Fast, pre-AI disengagement guards ────────────────────────────────────────
// We catch the obvious cases (someone asking to stop, or being abusive) with a
// cheap keyword check BEFORE calling the model, so a time-waster never burns an
// AI credit. The nuanced cases (subtle trolling, gibberish) still fall through
// to the [DISENGAGE] token the model can raise.

const hasAny = (text: string, phrases: string[]) => phrases.some(p => text.includes(p))

// Explicit "leave me alone" — a polite opt-out. We go quiet and only come back
// if they later show real buying intent.
function detectOptOut(text: string): boolean {
  // Unambiguous — always an opt-out, whatever else is in the message.
  const hard = [
    'stop messaging', 'stop texting', 'stop dm', 'stop sending', 'stop contacting',
    'please stop', 'leave me alone', 'leave me be', "don't message", 'dont message',
    'do not message', "don't contact", 'dont contact', 'unsubscribe', 'remove me',
    'go away', 'quit messaging', 'lose my number', 'take me off',
  ]
  if (hasAny(text, hard)) return true
  // Softer rejections only count when the message is basically JUST the rejection,
  // so "not interested in the premium, but the basic one?" still gets a real reply.
  const soft = ['not interested', 'no longer interested', 'stop it', 'not keen', 'no thanks']
  if (hasAny(text, soft) && text.trim().split(/\s+/).length <= 6) return true
  return false
}

// Clearly abusive / nasty. Same outcome (go quiet) but flagged separately so the
// owner sees why, and we never send a playful send-off to someone abusive.
const ABUSE_PHRASES = [
  'fuck you', 'fuck off', 'f off', 'fuck u', 'stfu', 'shut up', 'shut the',
  'piece of shit', 'asshole', 'dickhead', 'retard', 'stupid bot', 'dumb bot',
  'idiot bot', 'you suck', 'go to hell', 'kill yourself', 'kys', 'scam bot', 'scammer',
]

// Unambiguous buying intent — used to decide whether to RE-ENGAGE someone who
// previously opted out or was abusive. Stricter than the soft lead keywords:
// "interested" alone is not enough to override an explicit "stop".
const STRONG_INTENT_PHRASES = [
  'buy', 'purchase', 'book', 'how much', 'price', 'cost', 'quote',
  'sign up', 'signup', 'get started', 'ready to', 'want to buy', 'enroll',
  'deposit', 'pay', 'invoice', 'checkout',
]

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

// Send an audio (voice memo) reply — used when the client has voice replies on.
async function sendInstagramAudio(recipientId: string, audioUrl: string, accessToken: string) {
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
        message: { attachment: { type: 'audio', payload: { url: audioUrl } } }
      })
    }
  )
  return response.json()
}

// Send a GIF (as an image attachment). Best-effort — used sparingly.
async function sendInstagramGif(recipientId: string, gifUrl: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { attachment: { type: 'image', payload: { url: gifUrl } } }
        })
      }
    )
    return response.json()
  } catch {
    return null
  }
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
          { client_id: clientData.id, from_username: follower, ai_enabled: false, paused_reason: 'owner', updated_at: new Date().toISOString() },
          { onConflict: 'client_id,from_username' },
        )
      }
      return NextResponse.json({ status: 'owner replied — AI paused', from_username: follower })
    }

    // Per-conversation AI switch. paused_reason distinguishes 'owner' (they took
    // the convo over) from 'troll' (the AI disengaged from someone messing with it).
    const { data: convo } = await supabase
      .from('conversation_settings')
      .select('ai_enabled, paused_reason')
      .eq('client_id', clientData.id)
      .eq('from_username', senderId)
      .maybeSingle()
    let aiEnabled = convo?.ai_enabled !== false

    // Disengagement signals (cheap, pre-AI). Abuse takes precedence over a plain
    // opt-out when both match (e.g. "fuck off, stop messaging me").
    const lowerText = messageText.toLowerCase()
    const abusive = hasAny(lowerText, ABUSE_PHRASES)
    const optedOut = !abusive && detectOptOut(lowerText)

    // Lead / buying-intent detection (used for routing + re-engagement). An
    // opt-out or abusive message is NEVER a lead — this also stops "not
    // interested" being mis-read as interest (it contains the word "interested").
    const leadKeywords = ['price', 'cost', 'how much', 'interested', 'buy', 'purchase', 'book', 'appointment', 'available', 'sign up', 'join', 'start', 'package', 'plan', 'invest', 'hire', 'work with', 'collab', 'partnership']
    const isLead = !abusive && !optedOut && leadKeywords.some(keyword => lowerText.includes(keyword))
    const emailMatch = messageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const detectedEmail = emailMatch ? emailMatch[0] : null
    const strongIntent = !abusive && !optedOut && hasAny(lowerText, STRONG_INTENT_PHRASES)

    // Re-engage a previously paused conversation when the person comes back
    // genuinely interested. An OWNER pause is never auto-overridden. A 'troll'
    // pause re-opens on any lead signal; an 'optout'/'abuse' pause needs clear
    // buying intent — a hard "stop" shouldn't be undone by a casual "interested".
    if (!aiEnabled && convo?.paused_reason && convo.paused_reason !== 'owner') {
      const reopen = convo.paused_reason === 'troll'
        ? (isLead || !!detectedEmail)
        : (strongIntent || !!detectedEmail)
      if (reopen) {
        await supabase.from('conversation_settings').upsert(
          { client_id: clientData.id, from_username: senderId, ai_enabled: true, paused_reason: null, updated_at: new Date().toISOString() },
          { onConflict: 'client_id,from_username' },
        )
        aiEnabled = true
      }
    }

    // Use the client's own Instagram token if they've connected one; otherwise
    // fall back to the shared token (the original single-account setup).
    const accessToken = clientData.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || ''

    // Hard disengage BEFORE spending an AI credit: an explicit opt-out or clear
    // abuse. We go quiet for this person and skip the model entirely — a
    // time-waster never costs a token. They get the AI back only if they later
    // return with genuine buying intent (handled by the re-engagement check).
    let disengageReason: 'optout' | 'abuse' | 'troll' | null = null
    if (aiEnabled && (optedOut || abusive)) {
      disengageReason = abusive ? 'abuse' : 'optout'
      aiEnabled = false
    }

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
      system: buildSalesSystemPrompt(clientData) + DISENGAGE_SUFFIX,
      messages: [
        ...priorTurns,
        { role: 'user', content: messageText },
      ],
    })

    aiReply = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // Troll detection: the AI flags clear time-wasters with a [DISENGAGE] token.
    // We don't send that token — instead we go quiet for this person (below).
    if (aiEnabled && aiReply.includes('[DISENGAGE]')) {
      disengageReason = 'troll'
      aiReply = ''
    }
    const disengaged = disengageReason !== null
    const replied = aiEnabled && !disengaged && aiReply.trim() !== ''

    // Resolve the sender's real @username once (cached on prior rows) so the
    // inbox and leads show a handle, not the numeric IGSID. Best-effort.
    const { data: priorHandle } = await supabase
      .from('messages')
      .select('from_handle')
      .eq('client_id', clientData.id)
      .eq('from_username', senderId)
      .not('from_handle', 'is', null)
      .limit(1)
      .maybeSingle()
    const fromHandle = priorHandle?.from_handle ?? await resolveIgUsername(senderId, accessToken)

    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        client_id: clientData.id,
        instagram_message_id: messaging.message.mid,
        type: 'dm',
        from_username: senderId,
        from_handle: fromHandle,
        content: messageText,
        ai_reply: aiReply,
        status: replied ? 'replied' : 'manual',
        is_lead: (isLead || !!detectedEmail) && !disengaged,
      })
      .select()
      .single()

    if ((isLead || detectedEmail) && !disengaged && savedMessage) {
      // ONE lead per person. A chatty prospect who keeps saying "interested"
      // used to spawn a fresh lead row on every message, which then summed into a
      // wildly inflated pipeline value. Instead, reuse the open lead if there is
      // one and just refresh its summary; only a genuinely new person creates a
      // new lead row (and fires the notification / Discord alert).
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('client_id', clientData.id)
        .eq('from_username', senderId)
        .in('status', ['new', 'contacted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const intentSummary = detectedEmail
        ? `User provided email: ${detectedEmail}. Message: "${messageText}"`
        : `User asked: "${messageText}"`

      if (existingLead) {
        // Already tracking this person — keep their latest message as the summary,
        // don't double-count them in the pipeline, don't re-alert.
        await supabase
          .from('leads')
          .update({ message_id: savedMessage.id, intent_summary: intentSummary, from_handle: fromHandle })
          .eq('id', existingLead.id)
      } else {
        const { data: savedLead } = await supabase
          .from('leads')
          .insert({
            client_id: clientData.id,
            message_id: savedMessage.id,
            from_username: senderId,
            from_handle: fromHandle,
            intent_summary: intentSummary,
            status: 'new',
          })
          .select()
          .single()

        // Real-time dashboard notification (2.5) — defensive: a missing
        // notifications table just means no bell yet, never break the reply.
        await supabase.from('notifications').insert({
          client_id: clientData.id,
          type: 'lead',
          title: `🔥 New lead from @${fromHandle || senderId}`,
          body: messageText.slice(0, 140),
          lead_id: savedLead?.id ?? null,
        })

        // Discord alert (2.6) — only if the client connected a webhook.
        if (clientData.discord_webhook_url) {
          await sendDiscord(
            clientData.discord_webhook_url,
            `🔥 **New lead** for ${clientData.name || 'your account'}\n@${fromHandle || senderId}: "${messageText.slice(0, 200)}"`,
          )
        }
      }
    }

    if (replied) {
      // Deliver the reply: voice memo if the client opted in (dormant unless
      // ELEVENLABS_API_KEY is set), otherwise text. See lib/voice-memo.ts.
      const deliver = async () => {
        let sentVoice = false
        if (clientData.voice_replies_enabled && clientData.elevenlabs_voice_id) {
          const audioUrl = await generateVoiceReply(aiReply, clientData.elevenlabs_voice_id)
          if (audioUrl) {
            await sendInstagramAudio(senderId, audioUrl, accessToken)
            sentVoice = true
          }
        }
        if (!sentVoice) await sendInstagramReply(senderId, aiReply, accessToken)
      }

      // Reply delay: a short wait before sending feels more human. We ack the IG
      // webhook now and send from an after() callback once the delay elapses, so
      // Instagram never sees a slow response (and never retries). No cron needed.
      const delaySeconds = Math.min(Math.max(clientData.reply_delay_seconds || 0, 0), MAX_DELAY_SECONDS)
      if (delaySeconds > 0) {
        after(async () => {
          await new Promise(r => setTimeout(r, delaySeconds * 1000))
          await deliver()
        })
      } else {
        await deliver()
      }
    } else if (disengaged) {
      // Go quiet for this person. They only get the AI back if they later message
      // with genuine buying intent (handled at the re-engagement check above).
      await supabase.from('conversation_settings').upsert(
        { client_id: clientData.id, from_username: senderId, ai_enabled: false, paused_reason: disengageReason, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,from_username' },
      )
      // A single playful GIF send-off — but only for a 'troll'. We never send
      // anything to someone who asked us to stop (optout) or was abusive: that
      // would be pestering / rewarding the behaviour. (GIF dormant unless
      // TENOR_API_KEY is set.)
      if (disengageReason === 'troll') {
        after(async () => {
          const gif = await getGif('eye roll whatever bye')
          if (gif) await sendInstagramGif(senderId, gif, accessToken)
        })
      }
    }
    return NextResponse.json({ status: replied ? 'ok' : disengaged ? `disengaged:${disengageReason}` : 'manual', reply: aiReply })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}