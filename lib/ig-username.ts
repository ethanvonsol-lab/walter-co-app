// Resolve an Instagram @username (or name) from a sender's IGSID via the Graph
// API. Best-effort: returns null on any failure so callers fall back to the raw
// id. Requires instagram_business_manage_messages on the access token.
export async function resolveIgUsername(igsid: string, accessToken: string): Promise<string | null> {
  if (!igsid || !accessToken) return null
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${igsid}?fields=username,name&access_token=${accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.username || data.name || null
  } catch {
    return null
  }
}
