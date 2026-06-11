'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAEEDA', padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 16 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D85A30', display: 'inline-block' }} />
        <span style={{ fontWeight: 600, fontSize: 18, color: '#4A1B0C', letterSpacing: 0.3 }}>datum</span>
      </div>

      <h1 style={{ fontSize: 26, color: '#4A1B0C', marginTop: 48, marginBottom: 4 }}>Good morning, Joe.</h1>
      <p style={{ fontSize: 15, color: '#854F0B', marginTop: 0 }}>Where do you want to start?</p>

      <Link href="/intel" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'white', borderRadius: 22, padding: 20, marginTop: 28, display: 'block' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#4A1B0C' }}>Territory Overview</div>
          <div style={{ fontSize: 13, color: '#5F5E5A', marginTop: 6 }}>how your whole area is doing — health, trends, the big picture</div>
          <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 10, textAlign: 'right' }}>coming soon</div>
        </div>
      </Link>

      <Link href="/intel" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'white', borderRadius: 22, padding: 20, marginTop: 16, display: 'block' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#4A1B0C' }}>Account Intel</div>
          <div style={{ fontSize: 13, color: '#5F5E5A', marginTop: 6 }}>find accounts by area & see exactly what's happening at each one</div>
          <div style={{ fontSize: 12, color: '#993C1D', marginTop: 10, textAlign: 'right' }}>tap to open ›</div>
        </div>
      </Link>
    </main>
  )
}