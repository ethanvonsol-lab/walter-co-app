'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  if (done) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f', color: 'white' }}>
        <h1 style={{ color: '#e94560' }}>You're all set! 🎉</h1>
        <p style={{ color: '#888', marginTop: '1rem' }}>Your voice profile has been saved.</p>
        <a href="/dashboard" style={{ marginTop: '2rem', padding: '0.75rem 2rem', background: '#e94560', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>Go to Dashboard</a>
      </main>
    )
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f', color: 'white', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <p style={{ color: '#e94560', marginBottom: '0.5rem' }}>Question {step + 1} of {questions.length}</p>
        
        {/* Progress bar */}
        <div style={{ background: '#1a1a2e', borderRadius: '8px', height: '6px', marginBottom: '2rem' }}>
          <div style={{ background: '#e94560', height: '6px', borderRadius: '8px', width: `${((step + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>

        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>{questions[step]}</h2>
        
        <textarea
          value={answers[step]}
          onChange={e => {
            const newAnswers = [...answers]
            newAnswers[step] = e.target.value
            setAnswers(newAnswers)
          }}
          placeholder="Type your answer here..."
          rows={4}
          style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '1rem', resize: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {step > 0 && (
            <button onClick={handleBack} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: 'white', cursor: 'pointer' }}>
              Back
            </button>
          )}
          {step < questions.length - 1 ? (
            <button onClick={handleNext} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#e94560', color: 'white', cursor: 'pointer' }}>
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#e94560', color: 'white', cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Finish & Save'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}