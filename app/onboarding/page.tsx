'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius, btn, btnGhost, input as themeInput } from '@/lib/theme'

const questions = [
  "What's your name and what do you do?",
  "How would you describe your personality in 3 words?",
  "What tone do you use when talking to clients? (e.g. casual, professional, friendly)",
  "Give an example of how you'd greet someone who messages you.",
  "What are 3 things you'd never say to a client?",
  "How do you handle someone asking about your prices?",
  "How do you respond to negative comments or complaints?",
  "What's your main call to action? (e.g. book a call, DM me, visit my website)",
  "What makes you different from others in your industry?",
  "Is there anything else the AI should know about how you communicate?",
]

export default function OnboardingPage() {
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''))
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const voiceProfile = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n')

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('clients').upsert({
        email: user.email,
        voice_profile: voiceProfile,
      })
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>Voice profile saved</h1>
          <p style={{ color: c.muted, fontSize: '0.95rem', marginBottom: '1.75rem' }}>One last step — connect your Instagram so Walter can start replying to your DMs.</p>
          <a href="/dashboard/connections" style={{ ...btn, textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.75rem' }}>Connect Instagram →</a>
          <a href="/dashboard" style={{ display: 'block', marginTop: '1rem', color: c.faint, fontSize: '0.8rem', textDecoration: 'none' }}>I&apos;ll do this later</a>
        </div>
      </main>
    )
  }

  return (
    <main style={wrap}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <p style={{ color: c.faint, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Question {step + 1} of {questions.length}</p>

        {/* Progress bar */}
        <div style={{ background: c.surfaceAlt, borderRadius: radius.pill, height: '6px', marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ background: c.ink, height: '6px', borderRadius: radius.pill, width: `${((step + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>

        <h2 style={{ marginBottom: '1.25rem', fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{questions[step]}</h2>

        <textarea
          value={answers[step]}
          onChange={e => {
            const newAnswers = [...answers]
            newAnswers[step] = e.target.value
            setAnswers(newAnswers)
          }}
          placeholder="Type your answer here…"
          rows={4}
          style={{ ...themeInput, padding: '0.85rem 1rem', fontSize: '0.95rem', resize: 'vertical', lineHeight: 1.6 }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          {step > 0 && (
            <button onClick={handleBack} style={{ ...btnGhost, padding: '0.65rem 1.5rem' }}>
              Back
            </button>
          )}
          {step < questions.length - 1 ? (
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
