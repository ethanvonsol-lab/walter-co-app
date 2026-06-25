import { supabaseAdmin } from './supabase-admin'

// Voice memos (roadmap, built dormant). Turn the AI's text reply into speech
// (ElevenLabs TTS), host the MP3 on Supabase Storage, and return a public URL
// the Instagram send API can attach as an audio message.
//
// Returns null — so the caller falls back to a normal text reply — unless ALL
// of these are in place:
//   - ELEVENLABS_API_KEY env var is set
//   - the client has an elevenlabs_voice_id
//   - a PUBLIC Storage bucket named 'voice-replies' exists
// See supabase/voice_memos.sql for the full setup.

const BUCKET = 'voice-replies'

export async function generateVoiceReply(text: string, voiceId: string | null): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey || !voiceId || !text.trim()) return null

  try {
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
    })
    if (!tts.ok) return null

    const audio = new Uint8Array(await tts.arrayBuffer())
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`

    // Service-role upload so we don't depend on storage RLS policies.
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: false })
    if (error) return null

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl || null
  } catch {
    return null
  }
}
