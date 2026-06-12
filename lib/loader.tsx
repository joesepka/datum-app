'use client'

import { useEffect, useState } from 'react'
import { theme } from './theme'

export function Loader({ label = 'Loading…' }: { label?: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf: number
    const start = Date.now()
    const loop = () => {
      const t = ((Date.now() - start) % 1400) / 1400
      setProgress(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const cx = 60, cy = 44, s = 0.62
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
  const ah = 7 * s
  const b1 = ang + (150 * Math.PI) / 180
  const b2 = ang - (150 * Math.PI) / 180
  const arrow = progress > 0.05
    ? `M ${(tip.x + ah * Math.cos(b1)).toFixed(1)} ${(tip.y + ah * Math.sin(b1)).toFixed(1)} L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${(tip.x + ah * Math.cos(b2)).toFixed(1)} ${(tip.y + ah * Math.sin(b2)).toFixed(1)}`
    : ''

  const L = `M ${cx} ${cy} q ${-36 * s} ${-14 * s} ${-56 * s} ${-7 * s} v ${46 * s} q ${22 * s} ${-8 * s} ${56 * s} ${7 * s} z`
  const R = `M ${cx} ${cy} q ${36 * s} ${-14 * s} ${56 * s} ${-7 * s} v ${46 * s} q ${-22 * s} ${-8 * s} ${-56 * s} ${7 * s} z`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 14 }}>
      <svg viewBox="0 0 120 100" style={{ width: 90, height: 'auto' }}>
        <path d={L} stroke={theme.ink} strokeWidth={1.6} fill="none" strokeLinejoin="round" opacity={0.45} />
        <path d={R} stroke={theme.ink} strokeWidth={1.6} fill="none" strokeLinejoin="round" opacity={0.45} />
        {drawnPts.length > 1 && (
          <path d={linePath} stroke={theme.primary} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pts.slice(0, fullSeg + 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={theme.primary} />
        ))}
        {arrow && <path d={arrow} stroke={theme.primary} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div style={{ fontSize: 13, color: theme.muted }}>{label}</div>
    </div>
  )
}