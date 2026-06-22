'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius, btn, btnGhost, input as themeInput } from '@/lib/theme'

// ─────────────────────────────────────────────────────────────────────────────
// Expanded onboarding (Day 1 — "AI Sales Closer").
// Section 1 captures VOICE (how they talk). Sections 2-4 capture STRATEGY
// (what they sell + how the AI should close). Voice answers are combined into
// `voice_profile`; strategy answers map 1:1 to columns on `clients`
// (see supabase/onboarding.sql). Both feed lib/sales-prompt.ts.
// ─────────────────────────────────────────────────────────────────────────────

type FieldType = 'textarea' | 'text' | 'choice'

interface Question {
  key: string // 'voice' answers are combined; everything else is a clients column
  section: string
  blurb: string // shown under the section label — explains why we ask
  prompt: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
}

const SECTIONS = ['Voice Profile', 'Your Business', 'Customer & Offer', 'Goals & Behaviour']

const questions: Question[] = [
  // ── Section 1: Voice Profile (how you talk + how you sell) ──────────────────
  { key: 'voice0', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: "What's your name and what do you do?", type: 'text', placeholder: 'e.g. Jake — I run an online fitness coaching business' },
  { key: 'voice1', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'How would you describe your personality in 3 words?', type: 'text', placeholder: 'e.g. warm, direct, a bit funny' },
  { key: 'voice2', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'What tone do you use when talking to people in your DMs?', type: 'text', placeholder: 'e.g. casual and friendly, never corporate' },
  { key: 'voice3', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: "Give an example of how you'd greet someone who messages you.", type: 'textarea', placeholder: 'Write it exactly how you would type it' },
  { key: 'voice4', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: "What are 3 things you'd never say to a customer?", type: 'textarea' },
  { key: 'voice5', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'How do you handle someone asking about your prices?', type: 'textarea' },
  { key: 'voice6', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'How do you respond to negative comments or complaints?', type: 'textarea' },
  { key: 'voice7', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'What words, phrases or emojis do you use a lot?', type: 'text', placeholder: 'e.g. "let’s go", 💪, "honestly"' },
  { key: 'voice8', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'What makes you different from others in your industry?', type: 'textarea' },
  { key: 'voice9', section: 'Voice Profile', blurb: 'This teaches the AI to sound exactly like you.', prompt: 'Anything else the AI should know about how you communicate?', type: 'textarea', placeholder: 'Optional — anything that makes your voice yours' },

  // ── Section 2: Your Business ────────────────────────────────────────────────
  { key: 'niche', section: 'Your Business', blurb: 'This tells the AI what world it’s selling in.', prompt: "What's your niche?", type: 'text', placeholder: 'e.g. fitness coach, real estate, skincare brand, agency' },
  { key: 'content_type', section: 'Your Business', blurb: 'This tells the AI what world it’s selling in.', prompt: 'What type of content do you mostly post?', type: 'text', placeholder: 'e.g. educational + behind-the-scenes' },
  { key: 'content_volume', section: 'Your Business', blurb: 'This tells the AI what world it’s selling in.', prompt: 'How much content do you post per week?', type: 'text', placeholder: 'e.g. 3-4 posts a week' },
  { key: 'dm_volume', section: 'Your Business', blurb: 'This tells the AI what world it’s selling in.', prompt: 'Roughly how many DMs do you get per week?', type: 'text', placeholder: 'e.g. around 20-30' },
  { key: 'offer', section: 'Your Business', blurb: 'This tells the AI what world it’s selling in.', prompt: "What's your main offer or service?", type: 'textarea', placeholder: 'e.g. 12-week 1:1 online coaching program' },

  // ── Section 3: Customer & Offer ─────────────────────────────────────────────
  { key: 'ideal_customer', section: 'Customer & Offer', blurb: 'This helps the AI qualify the right people.', prompt: "Who's your ideal customer?", type: 'textarea', placeholder: 'e.g. busy professionals, 30-45, want to get fit but have no time' },
  {
    key: 'price_point', section: 'Customer & Offer', blurb: 'This helps the AI qualify the right people.', prompt: "What's your typical price point?", type: 'choice',
    options: [
      { value: '$ (budget, under $100)', label: '$ · under $100' },
      { value: '$$ (mid, $100–$1,000)', label: '$$ · $100–$1k' },
      { value: '$$$ (premium, $1,000+)', label: '$$$ · $1k+' },
    ],
  },
  {
    key: 'main_objection', section: 'Customer & Offer', blurb: 'This helps the AI qualify the right people.', prompt: 'What’s the main objection you hear?', type: 'choice',
    options: [
      { value: 'price', label: 'Price — "too expensive"' },
      { value: 'timing', label: 'Timing — "not right now"' },
      { value: 'trust', label: 'Trust — "will this work?"' },
      { value: 'skepticism', label: 'Skepticism — "is this real?"' },
    ],
  },

  // ── Section 4: Goals & Behaviour ────────────────────────────────────────────
  {
    key: 'main_goal', section: 'Goals & Behaviour', blurb: 'This is what every conversation drives toward.', prompt: "What's your main goal with the AI?", type: 'choice',
    options: [
      { value: 'book_calls', label: 'Book calls' },
      { value: 'drive_traffic', label: 'Drive traffic to a link' },
      { value: 'collect_emails', label: 'Collect emails' },
      { value: 'direct_sales', label: 'Direct sales' },
    ],
  },
  {
    key: 'ai_aggressiveness', section: 'Goals & Behaviour', blurb: 'This is what every conversation drives toward.', prompt: 'How aggressive should the AI be?', type: 'choice',
    options: [
      { value: 'soft', label: 'Soft — consultative, patient' },
      { value: 'medium', label: 'Balanced — nudge, don’t push' },
      { value: 'hard', label: 'Direct — confident hard close' },
    ],
  },
  { key: 'lead_destination', section: 'Goals & Behaviour', blurb: 'This is what every conversation drives toward.', prompt: 'Where should leads be sent?', type: 'text', placeholder: 'e.g. calendly.com/you, your website, or your email' },
]

// Strategy answers that map directly to a clients column (everything not 'voice*').
const COLUMN_KEYS = questions.map(q => q.key).filter(k => !k.startsWith('voice'))
// Voice questions, in order, for building the combined voice_profile string.
const VOICE_QUESTIONS = questions.filter(q => q.key.startsWith('voice'))

export default function OnboardingPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const total = questions.length
  const q = questions[step]
  const value = answers[q.key] || ''
  const sectionIndex = SECTIONS.indexOf(q.section)
  const set = (v: string) => setAnswers(a => ({ ...a, [q.key]: v }))

  const handleNext = () => step < total - 1 && setStep(step + 1)
  const handleBack = () => step > 0 && setStep(step - 1)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const voiceProfile = VOICE_QUESTIONS
      .map(vq => `Q: ${vq.prompt}\nA: ${answers[vq.key] || ''}`)
      .join('\n\n')

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const row: Record<string, string | null> = {
        email: user.email!,
        voice_profile: voiceProfile,
        onboarded_at: new Date().toISOString(),
      }
      for (const key of COLUMN_KEYS) row[key] = answers[key]?.trim() || null

      const { error: upsertError } = await supabase
        .from('clients')
        .upsert(row, { onConflict: 'email' })

      if (upsertError) {
        setLoading(false)
        setError('Something went wrong saving your profile. Please try again.')
        return
      }
    }

    setLoading(false)
    setDone(true)
  }

  const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: c.bg, color: c.ink, padding: '2rem', fontFamily: font }

  if (done) {
    return (
      <main style={wrap}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.goodBg, border: `1px solid ${c.goodBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.4rem' }}>✓</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>You&apos;re all set</h1>
          <p style={{ color: c.muted, fontSize: '0.95rem', marginBottom: '1.75rem' }}>Your AI now knows how you talk <em>and</em> how you sell. One last step — connect your Instagram so it can start closing in your DMs.</p>
          <a href="/dashboard/connections" style={{ ...btn, textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.75rem' }}>Connect Instagram →</a>
          <a href="/dashboard" style={{ display: 'block', marginTop: '1rem', color: c.faint, fontSize: '0.8rem', textDecoration: 'none' }}>I&apos;ll do this later</a>
        </div>
      </main>
    )
  }

  // Last question in the current section? Used only for the button label nicety.
  const isLastQuestion = step === total - 1

  return (
    <main style={wrap}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Section + progress context */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
          <p style={{ color: c.ink, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {q.section}
            <span style={{ color: c.faint, fontWeight: 600 }}> · Section {sectionIndex + 1} of {SECTIONS.length}</span>
          </p>
          <p style={{ color: c.faint, fontSize: '0.72rem', fontWeight: 600 }}>{step + 1} / {total}</p>
        </div>

        {/* Progress bar */}
        <div style={{ background: c.surfaceAlt, borderRadius: radius.pill, height: '6px', marginBottom: '0.75rem', overflow: 'hidden' }}>
          <div style={{ background: c.ink, height: '6px', borderRadius: radius.pill, width: `${((step + 1) / total) * 100}%`, transition: 'width 0.3s' }} />
        </div>

        <p style={{ color: c.muted, fontSize: '0.8rem', marginBottom: '2rem' }}>{q.blurb}</p>

        <h2 style={{ marginBottom: '1.25rem', fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{q.prompt}</h2>

        {q.type === 'choice' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {q.options!.map(opt => {
              const selected = value === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => set(opt.value)}
                  style={{
                    textAlign: 'left', padding: '0.85rem 1rem', borderRadius: radius.md, cursor: 'pointer',
                    fontFamily: font, fontSize: '0.95rem', fontWeight: 500,
                    border: `1px solid ${selected ? c.ink : c.border}`,
                    background: selected ? c.ink : c.surface,
                    color: selected ? '#fff' : c.body,
                    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        ) : q.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={e => set(e.target.value)}
            placeholder={q.placeholder || 'Type your answer here…'}
            rows={4}
            style={{ ...themeInput, padding: '0.85rem 1rem', fontSize: '0.95rem', resize: 'vertical', lineHeight: 1.6 }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => set(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { if (isLastQuestion) handleSubmit(); else handleNext() } }}
            placeholder={q.placeholder || 'Type your answer here…'}
            style={{ ...themeInput, padding: '0.85rem 1rem', fontSize: '0.95rem' }}
          />
        )}

        {error && <p style={{ color: c.bad, fontSize: '0.82rem', marginTop: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          {step > 0 && (
            <button onClick={handleBack} style={{ ...btnGhost, padding: '0.65rem 1.5rem' }}>
              Back
            </button>
          )}
          {!isLastQuestion ? (
            <button onClick={handleNext} style={{ ...btn, padding: '0.65rem 1.5rem' }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ ...btn, padding: '0.65rem 1.5rem', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving…' : 'Finish & save'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
