import { eyebrow, h1, muted } from '@/components/admin-ui'
import DemoChat from './DemoChat'

export const dynamic = 'force-dynamic'

export default function AdminDemoPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>Walter & Co · Admin</p>
        <h1 style={h1}>Demo</h1>
        <p style={muted}>An Instagram-style tester for content and prospect demos. Set a throwaway persona, send a DM, watch the real AI reply.</p>
      </div>
      <DemoChat />
    </div>
  )
}
