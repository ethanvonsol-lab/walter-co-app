// Fetch a relevant GIF URL from Tenor (Google). Best-effort + DORMANT: returns
// null unless TENOR_API_KEY is set, so the bot just stays text-only until you
// add a (free) key. Used sparingly — follow-ups and troll send-offs.
//
// Get a free key: https://developers.google.com/tenor/guides/quickstart → add
// TENOR_API_KEY to the Vercel env.
export async function getGif(query: string): Promise<string | null> {
  const key = process.env.TENOR_API_KEY
  if (!key) return null
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${key}&client_key=walterco&limit=12&media_filter=gif&contentfilter=high&random=true`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const results: Array<{ media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } } }> = data.results || []
    if (results.length === 0) return null
    const pick = results[Math.floor(Math.random() * results.length)]
    return pick.media_formats?.gif?.url || pick.media_formats?.tinygif?.url || null
  } catch {
    return null
  }
}
