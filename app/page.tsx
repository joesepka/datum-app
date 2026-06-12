'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { theme } from '../lib/theme'
import { HeaderLogo } from '../lib/headerlogo'

function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const dur = 1500
    let raf: number
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 250)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  const cx = 170, cy = 150, s = 1.6
  const pts = [
    { x: cx - 40 * s, y: cy + 22 * s },
    { x: cx - 22 * s, y: cy + 26 * s },
    { x: cx - 4 * s,  y: cy + 16 * s },
    { x: cx + 16 * s, y: cy + 10 * s },
    { x: cx + 44 * s, y: cy - 14 * s },
  ]
  const totalSeg = pts.length - 1
  const segFloat = progress * totalSeg
  const fullSeg = Math.floor(segFloat)
  const frac = segFloat - fullSeg

  const drawnPts: { x: number; y: number }[] = [pts[0]]
  for (let i = 1; i <= fullSeg && i < pts.length; i++) drawnPts.push(pts[i])
  let tip = drawnPts[drawnPts.length - 1]
  if (fullSeg < totalSeg) {
    const a = pts[fullSeg], b = pts[fullSeg + 1]
    tip = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
    drawnPts.push(tip)
  } else {
    tip = pts[pts.length - 1]
  }
  const linePath = 'M ' + drawnPts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')

  const prev = drawnPts[drawnPts.length - 2] || drawnPts[0]
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  const ah = 9 * s
  const b1 = ang + (150 * Math.PI) / 180
  const b2 = ang - (150 * Math.PI) / 180
  const arrow = progress > 0.05
    ? `M ${(tip.x + ah * Math.cos(b1)).toFixed(1)} ${(tip.y + ah * Math.sin(b1)).toFixed(1)} L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${(tip.x + ah * Math.cos(b2)).toFixed(1)} ${(tip.y + ah * Math.sin(b2)).toFixed(1)}`
    : ''

  const L = `M ${cx} ${cy} q ${-36 * s} ${-14 * s} ${-56 * s} ${-7 * s} v ${46 * s} q ${22 * s} ${-8 * s} ${56 * s} ${7 * s} z`
  const R = `M ${cx} ${cy} q ${36 * s} ${-14 * s} ${56 * s} ${-7 * s} v ${46 * s} q ${-22 * s} ${-8 * s} ${-56 * s} ${7 * s} z`

  return (
    <div style={{
      position: 'fixed', inset: 0, background: theme.bg, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.4s ease', opacity: progress >= 1 ? 0 : 1,
    }}>
      <svg viewBox="0 0 340 260" style={{ width: 260, height: 'auto' }}>
        <path d={L} stroke={theme.ink} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.5} />
        <path d={R} stroke={theme.ink} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.5} />
        {drawnPts.length > 1 && (
          <path d={linePath} stroke={theme.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pts.slice(0, fullSeg + 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={theme.primary} />
        ))}
        {arrow && <path d={arrow} stroke={theme.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>

      <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: theme.ink, letterSpacing: 1, marginTop: 18 }}>ShelfStory</div>

      <div style={{ width: 130, height: 4, background: theme.line, borderRadius: 2, marginTop: 22, overflow: 'hidden' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: theme.primary, borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: theme.font, maxWidth: 480, margin: '0 auto' }}>
        <HeaderLogo />

        <h1 style={{ fontSize: 26, color: theme.ink, marginTop: 48, marginBottom: 4 }}>Good morning, Joe.</h1>
        <p style={{ fontSize: 15, color: theme.muted, marginTop: 0 }}>Where do you want to start?</p>

        <Link href="/intel/total" style={{ textDecoration: 'none' }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 22, padding: 20, marginTop: 28, cursor: 'pointer' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Total Business Recap</div>
            <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>the whole book at a glance — volume, momentum, and account health by market</div>
            <div style={{ fontSize: 12, color: theme.primary, marginTop: 10, textAlign: 'right' }}>tap to open ›</div>
          </div>
        </Link>

        <Link href="/intel" style={{ textDecoration: 'none' }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 22, padding: 20, marginTop: 16, cursor: 'pointer' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Account Intel</div>
            <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>find accounts by area & see exactly what's happening at each one</div>
            <div style={{ fontSize: 12, color: theme.primary, marginTop: 10, textAlign: 'right' }}>tap to open ›</div>
          </div>
        </Link>

        <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 22, padding: 20, marginTop: 16, cursor: 'pointer' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Distributor Review</div>
          <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>performance by distributor — depletions, gaps, and trends</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 10, textAlign: 'right' }}>coming soon</div>
        </div>
      </main>
    </>
  )
}