-- Voice memos (roadmap feature, built dormant). The AI can send an AUDIO reply
-- to an Instagram DM instead of text. Run once in the Supabase SQL editor.
--
-- Per-client controls:
--   voice_replies_enabled — turn audio replies on for this client
--   elevenlabs_voice_id   — which ElevenLabs voice to speak in (clone of the
--                           client's voice for the "sounds like you" effect)
alter table public.clients
  add column if not exists voice_replies_enabled boolean not null default false,
  add column if not exists elevenlabs_voice_id text;

-- ── Remaining setup to actually switch it on (all required) ───────────────────
-- 1. Add ELEVENLABS_API_KEY to the Vercel env (Settings → Environment Variables),
--    then redeploy. Until it's set, the bot always falls back to text.
-- 2. Create a PUBLIC Storage bucket named "voice-replies" (Supabase dashboard →
--    Storage → New bucket → public). Generated MP3s are uploaded there and the
--    public URL is sent to Instagram as an audio attachment.
-- 3. Per client: set voice_replies_enabled = true and elevenlabs_voice_id to the
--    voice you created in ElevenLabs.
--
-- See lib/voice-memo.ts for the generation/hosting logic.
