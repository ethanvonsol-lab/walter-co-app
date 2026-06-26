import type { CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Walter & Co design system — "Linear/Stripe-grade minimal".
// Single source of truth for the modern gray/white look. Every page pulls
// tokens + style objects from here, so a redesign is a one-file edit.
//
// Principles: flat over soft (crisp 1px hairlines, minimal shadow), a refined
// cool-neutral (zinc) palette, tabular numerals for data, tight type scale.
// Font is Geist (loaded as --font-geist-sans in app/layout.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export const font =
  'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
export const fontMono =
  'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace'
// Display serif for headings — the editorial "luxury monochrome" voice.
export const fontSerif =
  'var(--font-fraunces), Georgia, "Times New Roman", serif'

// Refined cool-neutral (zinc) scale.
export const c = {
  // Surfaces
  bg: '#fafafa',          // page background (zinc-50)
  surface: '#ffffff',     // cards
  surfaceAlt: '#f4f4f5',  // inset / track / hover fills (zinc-100)
  surfaceHover: '#f9f9fa',

  // Borders — subtle crisp hairlines
  border: '#ebebed',
  borderStrong: '#e0e0e3',

  // Text hierarchy
  ink: '#09090b',         // headings / primary (zinc-950)
  body: '#3f3f46',        // body copy (zinc-700)
  muted: '#71717a',       // secondary (zinc-500)
  faint: '#a1a1aa',       // labels / placeholders (zinc-400)

  // Status accents (used sparingly)
  black: '#18181b',       // primary button (zinc-900)
  good: '#15803d',
  goodBg: '#f0fdf4',
  goodBorder: '#bbf7d0',
  warn: '#b45309',
  warnBg: '#fffbeb',
  warnBorder: '#fde68a',
  bad: '#b91c1c',
  badBg: '#fef2f2',
  badBorder: '#fecaca',

  // Dark sidebar / chrome — the monochrome "luxury" identity.
  sidebarBg: '#0f0f10',
  sidebarText: '#ededee',
  sidebarMuted: '#8a8a90',
  sidebarActiveBg: '#1d1d20',
  sidebarBorder: '#262629',
} as const

export const radius = { sm: '6px', md: '8px', lg: '12px', xl: '14px', pill: '999px' }

// Minimal shadows — cards lean on borders; elevation only for overlays.
export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(9,9,11,0.04)',
  md: '0 2px 8px rgba(9,9,11,0.06)',
  lg: '0 8px 30px rgba(9,9,11,0.10)',
}

export const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }

// ── Reusable style objects ───────────────────────────────────────────────────

export const card: CSSProperties = {
  background: c.surface,
  border: `1px solid ${c.border}`,
  borderRadius: radius.lg,
  padding: '1.5rem',
  boxShadow: shadow.sm,
}

// Small uppercase label — restrained modern tracking.
export const label: CSSProperties = {
  color: c.faint,
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

export const pageTitle: CSSProperties = {
  fontFamily: fontSerif,
  fontSize: '2.1rem',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: c.ink,
  lineHeight: 1.1,
}

// Big editorial serif heading for hero moments.
export const displayTitle: CSSProperties = {
  fontFamily: fontSerif,
  fontSize: '2.4rem',
  fontWeight: 500,
  letterSpacing: '-0.015em',
  color: c.ink,
  lineHeight: 1.05,
}

export const sectionTitle: CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: c.ink,
}

export const muted: CSSProperties = { color: c.muted, fontSize: '0.875rem', lineHeight: 1.5 }

export const statNumber: CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 600,
  letterSpacing: '-0.03em',
  color: c.ink,
  lineHeight: 1,
  ...tabular,
}

export const btn: CSSProperties = {
  background: c.black,
  color: '#fff',
  border: '1px solid ' + c.black,
  padding: '0.5rem 0.95rem',
  borderRadius: radius.md,
  cursor: 'pointer',
  fontFamily: font,
  fontSize: '0.85rem',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  transition: 'opacity 0.15s, background 0.15s, box-shadow 0.15s',
}

export const btnGhost: CSSProperties = {
  ...btn,
  background: c.surface,
  color: c.body,
  border: `1px solid ${c.border}`,
}

export const input: CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  border: `1px solid ${c.border}`,
  borderRadius: radius.md,
  background: c.surface,
  fontSize: '0.875rem',
  fontFamily: font,
  color: c.ink,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export const fieldLabel: CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 500,
  color: c.body,
  marginBottom: '0.35rem',
}
