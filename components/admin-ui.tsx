// Shared inline-style primitives for /admin pages.
// Thin re-export layer over the centralized design system (lib/theme.ts) so the
// existing admin pages keep importing { card, eyebrow, h1, ... } unchanged while
// the actual look lives in one place.
import type { CSSProperties } from 'react'
import { c, card as themeCard, btn as themeBtn, btnGhost as themeBtnGhost, input as themeInput, font } from '@/lib/theme'

export const card: CSSProperties = themeCard

// "eyebrow" kept for backwards-compat — now a restrained modern label.
export const eyebrow: CSSProperties = {
  color: c.faint,
  fontSize: '0.7rem',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export const h1: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: c.ink,
  marginBottom: '0.15rem',
}

export const muted: CSSProperties = { color: c.muted, fontSize: '0.875rem', lineHeight: 1.5 }

export const btn: CSSProperties = themeBtn
export const btnGhost: CSSProperties = themeBtnGhost
export const input: CSSProperties = themeInput

export const label: CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 500,
  color: c.body,
  marginBottom: '0.35rem',
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) {
  const colors: Record<string, [string, string, string]> = {
    good: [c.good, c.goodBg, '#bbf7d0'],
    bad: [c.bad, c.badBg, '#fecaca'],
    warn: [c.warn, c.warnBg, '#fde68a'],
    neutral: [c.muted, c.surfaceAlt, c.border],
  }
  const [fg, bg, bd] = colors[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0.15rem 0.5rem', borderRadius: 6,
      fontSize: '0.72rem', fontWeight: 500, letterSpacing: '-0.005em',
      color: fg, background: bg, border: `1px solid ${bd}`, fontFamily: font,
    }}>{children}</span>
  )
}
