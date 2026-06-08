(function () {
  const clientId = document.currentScript.getAttribute('data-client-id')
  if (!clientId) return

  const API = 'https://walter-co-app.vercel.app'
  let isOpen = false
  let messages = []

  // Styles
  const style = document.createElement('style')
  style.textContent = `
    #wc-widget * { box-sizing: border-box; font-family: Georgia, serif; }
    #wc-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: #111; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 99999; font-size: 22px; transition: transform 0.2s; }
    #wc-btn:hover { transform: scale(1.08); }
    #wc-box { position: fixed; bottom: 92px; right: 24px; width: 340px; background: #fff; border-radius: 20px; box-shadow: 0 16px 50px rgba(0,0,0,0.15); z-index: 99999; overflow: hidden; border: 1px solid #f0f0f0; display: none; flex-direction: column; max-height: 500px; }
    #wc-box.open { display: flex; animation: wcFadeUp 0.25s ease; }
    #wc-header { background: #111; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; }
    #wc-header p { color: #fff; font-size: 0.85rem; margin: 0; }
    #wc-header span { color: #555; font-size: 0.65rem; display: block; margin-top: 2px; }
    #wc-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px; }
    .wc-msg { max-width: 85%; padding: 0.7rem 0.9rem; border-radius: 14px; font-size: 0.82rem; line-height: 1.5; }
    .wc-msg.user { background: #111; color: #fff; align-self: flex-end; border-radius: 14px 14px 4px 14px; }
    .wc-msg.ai { background: #f5f5f5; color: #333; align-self: flex-start; border-radius: 14px 14px 14px 4px; }
    .wc-typing { display: flex; gap: 4px; padding: 0.7rem 0.9rem; background: #f5f5f5; border-radius: 14px; align-self: flex-start; width: 50px; }
    .wc-dot { width: 6px; height: 6px; border-radius: 50%; background: #ccc; animation: wcPulse 1.4s infinite; }
    .wc-dot:nth-child(2) { animation-delay: 0.2s; }
    .wc-dot:nth-child(3) { animation-delay: 0.4s; }
    #wc-input-row { display: flex; gap: 0.5rem; padding: 0.875rem; border-top: 1px solid #f5f5f5; }
    #wc-input { flex: 1; padding: 0.6rem 1rem; border-radius: 20px; border: 1px solid #e8e8e8; font-size: 0.82rem; outline: none; font-family: Georgia, serif; background: #fafafa; }
    #wc-send { width: 36px; height: 36px; border-radius: 50%; background: #111; border: none; color: #fff; cursor: pointer; font-size: 0.9rem; flex-shrink: 0; }
    @keyframes wcFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes wcPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
  `
  document.head.appendChild(style)

  // Widget HTML
  const widget = document.createElement('div')
  widget.id = 'wc-widget'
  widget.innerHTML = `
    <button id="wc-btn">💬</button>
    <div id="wc-box">
      <div id="wc-header">
        <div style="width:32px;height:32px;border-radius:50%;background:#333;flex-shrink:0"></div>
        <div>
          <p>AI Assistant</p>
          <span>Typically replies instantly</span>
        </div>
      </div>
      <div id="wc-messages">
        <div class="wc-msg ai">Hey! 👋 How can I help you today?</div>
      </div>
      <div id="wc-input-row">
        <input id="wc-input" placeholder="Type a message..." />
        <button id="wc-send">↑</button>
      </div>
    </div>
  `
  document.body.appendChild(widget)

  const btn = document.getElementById('wc-btn')
  const box = document.getElementById('wc-box')
  const input = document.getElementById('wc-input')
  const send = document.getElementById('wc-send')
  const msgContainer = document.getElementById('wc-messages')

  btn.addEventListener('click', () => {
    isOpen = !isOpen
    box.classList.toggle('open', isOpen)
    btn.textContent = isOpen ? '✕' : '💬'
    if (isOpen) input.focus()
  })

  const addMessage = (text, role) => {
    const div = document.createElement('div')
    div.className = `wc-msg ${role}`
    div.textContent = text
    msgContainer.appendChild(div)
    msgContainer.scrollTop = msgContainer.scrollHeight
  }

  const showTyping = () => {
    const div = document.createElement('div')
    div.className = 'wc-typing'
    div.id = 'wc-typing'
    div.innerHTML = '<div class="wc-dot"></div><div class="wc-dot"></div><div class="wc-dot"></div>'
    msgContainer.appendChild(div)
    msgContainer.scrollTop = msgContainer.scrollHeight
  }

  const removeTyping = () => {
    const t = document.getElementById('wc-typing')
    if (t) t.remove()
  }

  const sendMessage = async () => {
    const text = input.value.trim()
    if (!text) return
    input.value = ''

    addMessage(text, 'user')
    messages.push({ role: 'user', content: text })
    showTyping()

    try {
      const res = await fetch(`${API}/api/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: text, history: messages.slice(-6) })
      })
      const data = await res.json()
      removeTyping()
      addMessage(data.reply, 'ai')
      messages.push({ role: 'assistant', content: data.reply })
    } catch {
      removeTyping()
      addMessage("Sorry, I'm having trouble connecting. Please try again.", 'ai')
    }
  }

  send.addEventListener('click', sendMessage)
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage() })
})()