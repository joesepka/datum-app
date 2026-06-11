'use client'

import Link from 'next/link'
import { theme } from '../lib/theme'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: theme.font, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary, display: 'inline-block' }} />
        <span style={{ fontWeight: 700, fontSize: 19, color: theme.ink, letterSpacing: 0.3 }}>datum</span>
      </div>

      <h1 style={{ fontSize: 26, color: theme.ink, marginTop: 48, marginBottom: 4 }}>Good morning, Joe.</h1>
      <p style={{ fontSize: 15, color: theme.muted, marginTop: 0 }}>Where do you want to start?</p>

      <Link href="/intel" style={{ textDecoration: 'none' }}>
        <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 22, padding: 20, marginTop: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Territory Overview</div>
          <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>how your whole area is doing — health, trends, the big picture</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 10, textAlign: 'right' }}>coming soon</div>
        </div>
      </Link>

      <Link href="/intel" style={{ textDecoration: 'none' }}>
        <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 22, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Account Intel</div>
          <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>find accounts by area & see exactly what's happening at each one</div>
          <div style={{ fontSize: 12, color: theme.primary, marginTop: 10, textAlign: 'right' }}>tap to open ›</div>
        </div>
      </Link>
    </main>
  )
}