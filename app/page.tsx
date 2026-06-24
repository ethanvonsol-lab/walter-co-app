'use client'

import { useState, useEffect, useRef } from 'react'

const industries = [
  {
    name: 'Personal Trainer',
    handle: '@jakefitness',
    messages: [
      { from: 'follower', text: 'Hey! Do you offer online coaching?' },
      { from: 'ai', text: 'Hey! Yes absolutely — I run personalised online programs tailored to your goals 💪 Are you looking to build muscle, lose weight, or something else?' },
      { from: 'follower', text: 'Mostly lose weight and get toned' },
      { from: 'ai', text: "Perfect, that's exactly what I specialise in! I've helped over 50 clients transform in 12 weeks. Want me to send you the details on my current program?" },
    ]
  },
  {
    name: 'Real Estate Agent',
    handle: '@sarahsellshomes',
    messages: [
      { from: 'follower', text: 'Is the property on Elm Street still available?' },
      { from: 'ai', text: "Great question! I'll get Sarah to reach out to you personally with the latest status — she'll have all the details 😊 Are you looking to buy or just exploring the area?" },
      { from: 'follower', text: 'Looking to buy, budget around 800k' },
      { from: 'ai', text: "That's a great budget for this area! Sarah works with buyers in that range regularly. What's most important to you — location, size, or school zone?" },
    ]
  },
  {
    name: 'Content Creator',
    handle: '@emmacreates',
    messages: [
      { from: 'follower', text: 'Love your content! Do you do brand deals?' },
      { from: 'ai', text: "Thank you so much, that means everything! 🙏 Yes, I do select brand partnerships — I'm pretty picky about who I work with though. What brand are you from?" },
      { from: 'follower', text: 'We make sustainable skincare' },
      { from: 'ai', text: "Oh I love that — sustainability is so aligned with my values. Send me an email with your brief and I'll take a look! What's your timeline?" },
    ]
  },
]

export default function HomePage() {
  const [activeIndustry, setActiveIndustry] = useState(0)
  const [visibleMessages, setVisibleMessages] = useState(1)
  const [demoMessage, setDemoMessage] = useState('')
  const [demoReply, setDemoReply] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Reveal messages one by one. The reset to 1 is scheduled (not a synchronous
    // setState in the effect body) so it reveals just after paint on each switch.
    const timers = [0, 1200, 2400, 3600].map((delay, i) =>
      setTimeout(() => setVisibleMessages(i === 0 ? 1 : i + 1), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [activeIndustry])

  const handleDemo = async () => {
  if (!demoMessage.trim()) return
  setDemoLoading(true)
  setDemoReply('')
  try {
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: demoMessage,
        voiceProfile: `Your name is Ethan and you run Walter & Co, an AI marketing agency based in New Zealand. You sell an AI-powered Instagram reply bot that handles DMs automatically for businesses.

Your tone: confident, friendly, direct. You speak casually like a real person texting — not corporate, not salesy. You believe in what you sell because it genuinely works.

When someone asks about the product: explain it simply and get them interested without overwhelming them.
When someone asks about pricing: explain that pricing is custom — you scope it to their business on a quick call rather than a fixed plan — then ask what kind of business they run so you can point them in the right direction.
When someone asks how it works: keep it simple — "we train an AI on your voice and it handles your DMs 24/7"
Your goal: qualify them and get them on a call or to send an email to ethanvonl@icloud.com
Always end with a question to keep the conversation going.`
      })
    })
    const data = await res.json()
    setDemoReply(data.reply)
  } catch {
    setDemoReply('Something went wrong. Try again.')
  }
  setDemoLoading(false)
}

  const currentConvo = industries[activeIndustry]

  return (
    <div style={{ background: '#fff', color: '#111', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.75rem 4rem', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)', zIndex: 100,
        boxShadow: scrollY > 20 ? '0 1px 20px rgba(0,0,0,0.06)' : 'none',
        transition: 'box-shadow 0.3s'
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '400', letterSpacing: '0.1em', color: '#111' }}>WALTER & CO</div>
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          <a href="#how-it-works" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.05em' }}>How it works</a>
          <a href="#demo" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.05em' }}>Live Demo</a>
          <a href="#pricing" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.05em' }}>Pricing</a>
          <a href="#faq" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.05em' }}>FAQ</a>
          <a href="#agencies" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.05em' }}>Agencies</a>
          <a href="/login" style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', background: '#111', color: '#fff', fontSize: '0.72rem', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Login</a>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} style={{ padding: '7rem 4rem 5rem', maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
        <div>
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f0f0f0', borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '2rem' }}>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a7a2a' }} />
    <p style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em' }}>Your 24/7 AI sales rep is online</p>
  </div>
  <h1 style={{ fontSize: 'clamp(2.5rem, 4.5vw, 4.5rem)', fontWeight: '300', lineHeight: '1.1', letterSpacing: '-0.01em', marginBottom: '2rem' }}>
    Stop replying<br />
    to DMs.<br />
    <span style={{ fontStyle: 'italic', color: '#888' }}>Start closing sales.</span>
  </h1>
  <p style={{ fontSize: '1.15rem', color: '#444', lineHeight: '1.6', maxWidth: '440px', marginBottom: '1.5rem', fontWeight: '400' }}>
    A 24/7 AI sales rep that sounds exactly like you — qualifying leads and closing them while you sleep.
  </p>
  <p style={{ fontSize: '1.05rem', color: '#777', lineHeight: '1.75', maxWidth: '440px', marginBottom: '3rem', fontWeight: '300' }}>
    Every unanswered DM is a lost sale. Walter trains an AI on your voice <em>and</em> your sales playbook — it works every DM, handles objections, and drives leads to book, buy, or hand over their details.
  </p>
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
    <a href="mailto:ethanvonl@icloud.com" style={{ padding: '1rem 2.5rem', borderRadius: '8px', background: '#111', color: '#fff', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
      Get Started →
    </a>
    <a href="#demo" style={{ padding: '1rem 2rem', color: '#888', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
      Try the live demo ↓
    </a>
  </div>
  {/* Trust signals — truthful: official Meta API + Claude, no unverified badges */}
  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
    {['Built on Meta’s official API', 'Powered by Claude', 'Encrypted & secure'].map(t => (
      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ color: '#2a7a2a', fontSize: '0.75rem' }}>✓</span>
        <p style={{ color: '#999', fontSize: '0.72rem', letterSpacing: '0.02em' }}>{t}</p>
      </div>
    ))}
  </div>
  <div style={{ display: 'flex', gap: '2.5rem', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0' }}>
    {[{ v: '< 3s', l: 'Reply time' }, { v: '24/7', l: 'Always closing' }, { v: '100%', l: 'Your voice' }].map(s => (
      <div key={s.l}>
        <p style={{ fontSize: '1.5rem', fontWeight: '300', color: '#111' }}>{s.v}</p>
        <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.l}</p>
      </div>
    ))}
  </div>
</div>

        {/* DM Mockup */}
        <div style={{ position: 'relative' }}>
          <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 30px 80px rgba(0,0,0,0.12)', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
            {/* Phone header */}
            <div style={{ background: '#fafafa', padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0' }} />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: '500', color: '#111' }}>{currentConvo.handle}</p>
                <p style={{ fontSize: '0.65rem', color: '#bbb' }}>Instagram · Active now</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e0e0e0' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e0e0e0' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e0e0e0' }} />
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: '1.5rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {currentConvo.messages.slice(0, visibleMessages).map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'ai' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.4s ease' }}>
                  <div style={{
                    maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: msg.from === 'ai' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.from === 'ai' ? '#111' : '#f0f0f0',
                    color: msg.from === 'ai' ? '#fff' : '#333',
                    fontSize: '0.82rem', lineHeight: '1.5',
                  }}>
                    {msg.text}
                    {msg.from === 'ai' && (
                      <p style={{ fontSize: '0.6rem', color: '#555', marginTop: '0.4rem' }}>AI · Just now</p>
                    )}
                  </div>
                </div>
              ))}
              {visibleMessages < currentConvo.messages.length && (
                <div style={{ display: 'flex', gap: '4px', padding: '0.5rem 0' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ddd', animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Industry selector */}
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', background: '#fafafa' }}>
              {industries.map((ind, i) => (
                <button key={i} onClick={() => setActiveIndustry(i)} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid',
                  borderColor: activeIndustry === i ? '#111' : '#e0e0e0',
                  background: activeIndustry === i ? '#111' : '#fff',
                  color: activeIndustry === i ? '#fff' : '#888',
                  fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.05em'
                }}>{ind.name}</button>
              ))}
            </div>
          </div>

          {/* Floating lead badge */}
          <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', borderRadius: '12px', padding: '0.875rem 1.25rem', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2a7a2a' }} />
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#111' }}>New lead captured</p>
              <p style={{ fontSize: '0.65rem', color: '#bbb' }}>Just now · Instagram DM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ padding: '6rem 4rem', background: '#f7f7f5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>The Dashboard</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '1rem' }}>Everything in one place.</h2>
          <p style={{ color: '#888', fontSize: '1rem', marginBottom: '4rem', maxWidth: '500px', lineHeight: '1.7' }}>Your clients get a beautiful, real-time dashboard showing every message, lead, and reply.</p>

          {/* Dashboard mockup */}
          <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #ebebeb' }}>
            {/* Browser bar */}
            <div style={{ background: '#f5f5f5', padding: '0.875rem 1.5rem', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
              <div style={{ flex: 1, background: '#e8e8e8', borderRadius: '4px', padding: '0.3rem 1rem', marginLeft: '0.75rem', fontSize: '0.7rem', color: '#888' }}>walter-co-app.vercel.app/dashboard</div>
            </div>

            {/* Dashboard preview */}
            <div style={{ display: 'flex', height: '420px' }}>
              {/* Sidebar */}
              <div style={{ width: '200px', background: '#0f0f0f', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ width: '80px', height: '12px', background: '#1a1a1a', borderRadius: '4px', marginBottom: '1.5rem' }} />
                {['Dashboard', 'Inbox', 'Leads', 'Analytics', 'Voice', 'Settings'].map((item, i) => (
                  <div key={item} style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', background: i === 0 ? '#1a1a1a' : 'transparent', borderLeft: i === 0 ? '1px solid #333' : '1px solid transparent' }}>
                    <div style={{ width: i === 0 ? '60px' : `${40 + i * 8}px`, height: '8px', background: i === 0 ? '#444' : '#222', borderRadius: '3px' }} />
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: '2rem', background: '#f7f7f5', overflowY: 'hidden' }}>
                <div style={{ width: '120px', height: '8px', background: '#e0e0e0', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ width: '200px', height: '20px', background: '#d0d0d0', borderRadius: '4px', marginBottom: '2rem' }} />

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {['247', '18', '3'].map((val, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #ebebeb' }}>
                      <div style={{ width: '60px', height: '6px', background: '#e8e8e8', borderRadius: '3px', marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', lineHeight: 1 }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ background: '#fff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #ebebeb', marginBottom: '1rem' }}>
                  <div style={{ width: '80px', height: '6px', background: '#e8e8e8', borderRadius: '3px', marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '60px' }}>
                    {[30, 55, 40, 80, 60, 90, 70].map((h, i) => (
                      <div key={i} style={{ flex: 1, background: i === 5 ? '#111' : '#e8e8e8', borderRadius: '3px 3px 0 0', height: `${h}%` }} />
                    ))}
                  </div>
                </div>

                {/* Messages preview */}
                <div style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #ebebeb' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: i < 3 ? '1px solid #f5f5f5' : 'none' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e8e8e8', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: `${60 + i * 20}px`, height: '6px', background: '#e0e0e0', borderRadius: '3px', marginBottom: '0.35rem' }} />
                        <div style={{ width: `${100 + i * 30}px`, height: '5px', background: '#ebebeb', borderRadius: '3px' }} />
                      </div>
                      {i === 1 && <div style={{ width: '30px', height: '14px', borderRadius: '3px', background: '#111' }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '8rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>The Process</p>
<h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '1.5rem', maxWidth: '500px', lineHeight: '1.2' }}>Set up once. Run forever.</h2>
<p style={{ color: '#999', fontSize: '1rem', lineHeight: '1.7', maxWidth: '500px', marginBottom: '5rem' }}>Most businesses are still replying to DMs manually in 2026. That&apos;s hours of your week gone — and messages still falling through the cracks. There&apos;s a better way.</p>        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
          {[
            { num: '01', title: 'We train your AI', desc: 'A few quick questions about your voice, your offer, and how you sell. We build an AI that replies exactly how you would — and closes like your best rep.' },
            { num: '02', title: 'Connect Instagram', desc: 'Link your Instagram account in one click. The AI starts working your DMs and comments immediately.' },
            { num: '03', title: 'Watch leads close', desc: 'Every message gets a personalised reply that qualifies and pushes for the next step. Leads land in your dashboard in real time.' },
          ].map(step => (
            <div key={step.num}>
              <p style={{ color: '#e0e0e0', fontSize: '4rem', fontWeight: '300', marginBottom: '1.5rem', lineHeight: 1 }}>{step.num}</p>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '400', marginBottom: '1rem' }}>{step.title}</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.75' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" style={{ padding: '8rem 4rem', background: '#0f0f0f' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#444', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Live Demo</p>
          <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.7', marginBottom: '3rem' }}>Type any message below and see how the AI replies — just like a real Instagram DM.</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', color: '#fff', lineHeight: '1.2', marginBottom: '1rem' }}>Talk to our AI. Right now.</h2>
<p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.7', marginBottom: '3rem' }}>Ask us anything — about the product, pricing, how it works. This is exactly what your clients&apos; DMs will feel like.</p>
          <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '2rem', border: '1px solid #222', textAlign: 'left' }}>
            <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Send a DM</p>
            <input
              type="text"
              value={demoMessage}
              onChange={e => setDemoMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDemo()}
              placeholder="e.g. What does Walter & Co actually do?"
              style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#111', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem', outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleDemo}
              disabled={demoLoading || !demoMessage.trim()}
              style={{ width: '100%', padding: '1rem', borderRadius: '10px', border: 'none', background: demoLoading || !demoMessage.trim() ? '#222' : '#fff', color: demoLoading || !demoMessage.trim() ? '#444' : '#111', cursor: demoLoading || !demoMessage.trim() ? 'default' : 'pointer', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'all 0.2s' }}
            >
              {demoLoading ? 'Generating reply...' : 'See AI Reply →'}
            </button>

            {demoReply && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#111', borderRadius: '10px', borderLeft: '2px solid #333' }}>
                <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>AI Reply</p>
                <p style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.65', fontStyle: 'italic' }}>{demoReply}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '8rem 4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Features</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '4rem' }}>Everything you need.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { title: 'AI Reply Engine', desc: 'Replies to every DM and comment in your exact voice, around the clock.' },
              { title: 'Lead Detection', desc: 'Automatically identifies buying intent and flags potential clients instantly.' },
              { title: 'Voice Training', desc: 'Trained on your personality so every reply sounds genuinely human.' },
              { title: 'Live Dashboard', desc: 'See every message, reply, and lead captured in real time.' },
              { title: 'Deep Analytics', desc: 'Reply volume, lead conversion, sentiment analysis, and more.' },
              { title: 'Smart Escalation', desc: 'Complex questions get flagged immediately so nothing falls through.' },
            ].map(f => (
              <div key={f.title} style={{ background: '#fafafa', borderRadius: '16px', padding: '2rem', border: '1px solid #f0f0f0', transition: 'all 0.2s' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111', marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '400', marginBottom: '0.75rem' }}>{f.title}</h3>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.65' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison — Hire someone vs. Walter & Co */}
      <section style={{ padding: '8rem 4rem', background: '#f7f7f5' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>The Comparison</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '1rem' }}>Hire someone, or hire Walter.</h2>
          <p style={{ color: '#999', fontSize: '1rem', marginBottom: '3.5rem', maxWidth: '520px', lineHeight: '1.7' }}>A salesperson costs thousands a month, works one shift, and takes months to sound like you. Walter does it all from day one.</p>

          <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #ebebeb', overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr' }}>
              <div style={{ padding: '1.5rem 1.75rem' }} />
              <div style={{ padding: '1.5rem 1.75rem', textAlign: 'center', borderLeft: '1px solid #f0f0f0' }}>
                <p style={{ color: '#888', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Hiring someone</p>
              </div>
              <div style={{ padding: '1.5rem 1.75rem', textAlign: 'center', background: '#111' }}>
                <p style={{ color: '#fff', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Walter &amp; Co</p>
              </div>
            </div>
            {[
              { feature: 'Monthly cost', human: '$3,000–5,000 salary', walter: 'A fraction of a hire' },
              { feature: 'Availability', human: 'One shift, sick days, holidays', walter: '24/7/365, never off' },
              { feature: 'Response time', human: 'Minutes to hours', walter: 'Under 3 seconds' },
              { feature: 'Sounds like you', human: 'Months to learn your voice', walter: 'Trained on your voice day one' },
              { feature: 'Sells consistently', human: 'Varies with mood & energy', walter: 'On-script, on-brand, every time' },
              { feature: 'Time to go live', human: 'Weeks of hiring & training', walter: 'Live in 48 hours' },
              { feature: 'Scales with volume', human: 'Hire more people', walter: 'Handles unlimited DMs' },
            ].map((row, i) => (
              <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ padding: '1.15rem 1.75rem', display: 'flex', alignItems: 'center' }}>
                  <p style={{ color: '#111', fontSize: '0.88rem', fontWeight: '500' }}>{row.feature}</p>
                </div>
                <div style={{ padding: '1.15rem 1.75rem', textAlign: 'center', borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.3rem' }}>
                  <p style={{ color: '#999', fontSize: '0.82rem', lineHeight: '1.4' }}>{row.human}</p>
                </div>
                <div style={{ padding: '1.15rem 1.75rem', textAlign: 'center', background: i % 2 === 0 ? '#fafafa' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#2a7a2a', fontSize: '0.85rem', flexShrink: 0 }}>✓</span>
                  <p style={{ color: '#111', fontSize: '0.85rem', fontWeight: '500', lineHeight: '1.4' }}>{row.walter}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section style={{ padding: '8rem 4rem', background: '#fff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '4rem', alignItems: 'center' }}>
          {/* Founder photo. Drop your picture at public/founder.jpg — the img
              overlays the placeholder; if the file is missing it hides itself
              (onError) and the placeholder shows through. */}
          <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '20px', overflow: 'hidden', background: 'linear-gradient(135deg, #f0f0f0, #e4e4e4)', border: '1px solid #ebebeb' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '300' }}>E</span>
              </div>
              <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your photo here</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/founder.jpg"
              alt="Ethan von Landkammer"
              onError={e => { e.currentTarget.style.display = 'none' }}
              ref={el => { if (el && el.complete && el.naturalWidth === 0) el.style.display = 'none' }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div>
            <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>The Founder</p>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '300', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Ethan von Landkammer</h2>
            <p style={{ color: '#888', fontSize: '0.95rem', letterSpacing: '0.02em', marginBottom: '2rem' }}>CEO &amp; Founder, Walter &amp; Co</p>
            <p style={{ color: '#555', fontSize: '1.1rem', lineHeight: '1.75', fontStyle: 'italic', marginBottom: '2rem', borderLeft: '2px solid #111', paddingLeft: '1.5rem' }}>
              “Honestly, this started out of pure frustration. I was answering the same handful of questions in my DMs all day, every day — the same stuff on repeat — and it was burning hours I didn&apos;t have. So I trained an AI to handle it exactly the way I would: in my voice, around the clock, never letting a real lead slip through. Turns out nearly everyone I knew had the same headache. And then I thought — why stop at sounding like me? Why not give it the skillset of the best salesman on the planet? That&apos;s why Walter &amp; Co exists.”
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="https://instagram.com/walterandco.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', borderBottom: '1px solid #e0e0e0', paddingBottom: '2px' }}>Instagram ↗</a>
              <a href="https://www.linkedin.com/in/ethan-von-landkammer-256006419/" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', borderBottom: '1px solid #e0e0e0', paddingBottom: '2px' }}>LinkedIn ↗</a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '8rem 4rem', background: '#f7f7f5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Pricing</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '1rem' }}>Pricing that fits your business.</h2>
          <p style={{ color: '#999', fontSize: '1rem', marginBottom: '1.5rem', maxWidth: '560px', lineHeight: '1.6' }}>Every business is different, so we don&apos;t force you into a one-size-fits-all plan. We learn how you work on a quick call, then send a custom quote built around the value it brings you.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
            {['14-day money-back guarantee on setup', 'Cancel anytime', 'Encrypted & never sold'].map(t => (
              <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#fff', border: '1px solid #ebebeb', borderRadius: '999px', padding: '0.5rem 1rem' }}>
                <span style={{ color: '#2a7a2a', fontSize: '0.8rem' }}>✓</span>
                <span style={{ color: '#555', fontSize: '0.8rem' }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', maxWidth: '860px' }}>
            {[
              {
                name: 'Standard', tagline: 'Scoped to your business on a quick call',
                desc: 'For individual businesses and creators',
                features: ['1 Instagram account', 'AI reply automation', 'Lead capture & detection', 'Analytics dashboard', 'Voice profile training', 'Monthly reporting'],
                cta: 'Book a call', highlight: false,
              },
              {
                name: 'Agency', tagline: 'Volume pricing, scoped on a call',
                desc: 'White-label for agencies with multiple clients',
                features: ['Multiple client accounts', 'White-label dashboard', 'Your own branding & domain', 'Agency-wide analytics', 'Priority support', 'Custom onboarding'],
                cta: 'Book a call', highlight: true,
              },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? '#111' : '#fff', border: `1px solid ${plan.highlight ? '#111' : '#ebebeb'}`, borderRadius: '20px', padding: '2.5rem', boxShadow: plan.highlight ? '0 20px 60px rgba(0,0,0,0.15)' : '0 2px 20px rgba(0,0,0,0.04)' }}>
                <p style={{ color: plan.highlight ? '#555' : '#bbb', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>{plan.name}</p>
                <div style={{ marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '300', color: plan.highlight ? '#fff' : '#111' }}>Custom</span>
                </div>
                <p style={{ color: plan.highlight ? '#888' : '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{plan.tagline}</p>
                <p style={{ color: plan.highlight ? '#555' : '#999', fontSize: '0.82rem', marginBottom: '2rem', lineHeight: '1.5' }}>{plan.desc}</p>
                <div style={{ marginBottom: '2rem' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem', alignItems: 'flex-start' }}>
                      <span style={{ color: plan.highlight ? '#444' : '#bbb', marginTop: '0.1rem' }}>—</span>
                      <p style={{ color: plan.highlight ? '#aaa' : '#777', fontSize: '0.82rem', lineHeight: '1.4' }}>{f}</p>
                    </div>
                  ))}
                </div>
                <a href="mailto:ethanvonl@icloud.com" style={{ display: 'block', textAlign: 'center', padding: '1rem', borderRadius: '10px', background: plan.highlight ? '#fff' : '#111', color: plan.highlight ? '#111' : '#fff', textDecoration: 'none', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '8rem 4rem', background: '#fff' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>FAQ</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '1rem' }}>Questions, answered.</h2>
          <p style={{ color: '#999', fontSize: '1rem', marginBottom: '3.5rem', lineHeight: '1.7' }}>Everything you might be wondering before you hand your DMs to an AI.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { q: 'Will the AI actually sound like me?', a: 'Yes — that’s the whole point. During setup we capture how you talk, your tone, your phrases, even the things you’d never say. Every reply comes out in your voice, not a generic chatbot voice. Most people can’t tell it isn’t you.' },
              { q: 'What if it says something wrong?', a: 'The AI is trained on your rules and your offer, and it’s built to stay in its lane. For anything sensitive — exact pricing, guarantees, edge cases — it warmly redirects and captures the lead instead of guessing. You can also jump into any conversation from your dashboard and take over at any time.' },
              { q: 'How much does it cost?', a: 'We tailor pricing to your business rather than forcing you into a fixed plan. There’s a one-time setup and a monthly fee, both scoped on a quick call once we understand what you need and the value it brings. No long contracts — cancel anytime, and the setup fee is refundable within the first 14 days if it’s not the right fit.' },
              { q: 'How fast can I go live?', a: 'We have your AI trained and replying within 48 hours of signing up. Setup is a few quick questions and a one-click Instagram connection.' },
              { q: 'Is my data safe? Do you need my password?', a: 'No password sharing, ever. We connect through Meta’s official Instagram API, the same secure standard the big tools use. Your data is encrypted, never sold, and only used to power your replies.' },
              { q: 'What happens with complex questions or unhappy customers?', a: 'The AI acknowledges, stays calm, and never gets defensive. When something needs a human, it’s flagged in your dashboard so nothing falls through — and you can step in and reply yourself whenever you want.' },
              { q: 'Can I cancel anytime?', a: 'Yes. It’s month-to-month with no lock-in. Cancel whenever you like — and within the first 14 days, the setup fee is refundable too.' },
            ].map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q} style={{ background: '#fafafa', borderRadius: '14px', border: '1px solid #ebebeb', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{ width: '100%', textAlign: 'left', padding: '1.4rem 1.75rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: '500', color: '#111' }}>{item.q}</span>
                    <span style={{ fontSize: '1.25rem', color: '#bbb', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>+</span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 1.75rem 1.5rem' }}>
                      <p style={{ color: '#777', fontSize: '0.92rem', lineHeight: '1.7' }}>{item.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* For Agencies */}
      <section id="agencies" style={{ padding: '8rem 4rem', background: '#0f0f0f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>For Agencies</p>
            <h2 style={{ fontSize: '3rem', fontWeight: '300', color: '#fff', lineHeight: '1.2', marginBottom: '1.5rem' }}>Add AI to your service offering.</h2>
            <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.75', marginBottom: '2.5rem' }}>
              White-label our platform under your brand. Your clients see your logo, your domain — powered by our AI behind the scenes. You keep the margin.
            </p>
            <a href="mailto:ethanvonl@icloud.com" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: '#fff', color: '#111', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Partner With Us →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { title: 'Your brand, our technology', desc: 'Full white-label — your logo, domain, and colours on everything your clients see.' },
              { title: 'Scalable seat pricing', desc: 'Pay per client slot. Start with 10, grow to unlimited. No upfront commitment.' },
              { title: 'You keep the margin', desc: 'Charge your clients whatever you want. We charge you a flat platform fee.' },
              { title: 'Onboarded in 48 hours', desc: "We handle setup. You focus on signing clients. We&apos;ll have everything live fast." },
            ].map(item => (
              <div key={item.title} style={{ padding: '1.5rem', border: '1px solid #1a1a1a', borderRadius: '12px', transition: 'border-color 0.2s' }}>
                <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '400', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#444', fontSize: '0.82rem', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '10rem 4rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#bbb', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Get Started Today</p>
          <h2 style={{ fontSize: '4rem', fontWeight: '300', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
            Ready to automate your Instagram?
          </h2>
          <p style={{ color: '#888', fontSize: '1rem', lineHeight: '1.75', marginBottom: '3rem' }}>
            We&apos;ll have your AI live and replying within 48 hours of signing up.
          </p>
          <a href="mailto:ethanvonl@icloud.com" style={{ display: 'inline-block', padding: '1.25rem 3.5rem', borderRadius: '8px', background: '#111', color: '#fff', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Contact Us →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '2.5rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: '400', letterSpacing: '0.1em', color: '#888' }}>WALTER & CO</p>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <a href="/privacy" style={{ color: '#ccc', fontSize: '0.75rem', textDecoration: 'none' }}>Privacy</a>
          <a href="/login" style={{ color: '#ccc', fontSize: '0.75rem', textDecoration: 'none' }}>Client Login</a>
          <a href="mailto:ethanvonl@icloud.com" style={{ color: '#ccc', fontSize: '0.75rem', textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ color: '#ddd', fontSize: '0.7rem', letterSpacing: '0.1em' }}>© 2026 WALTER & CO</p>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  )
}