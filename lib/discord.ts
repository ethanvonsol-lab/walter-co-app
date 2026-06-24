// Post a message to a Discord incoming-webhook URL. Best-effort: never throws,
// so a Discord hiccup can't break the flow that triggered it (e.g. the IG
// webhook). Discord expects { content }, supports markdown, max 2000 chars.
export async function sendDiscord(webhookUrl: string, content: string): Promise<boolean> {
  if (!webhookUrl) return false
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 2000) }),
    })
    return res.ok
  } catch {
    return false
  }
}
