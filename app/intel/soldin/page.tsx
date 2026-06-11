'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { theme } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

const ITEMS = [
  'Original', 'Zero Sugar', 'Berry Rush', 'Tropical Blast', 'Citrus Surge',
  'Peach Mango', 'Watermelon Wave', 'Sour Apple', 'Blue Razz', 'Variety Pack',
]

function SoldInInner() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') || ''
  const [item, setItem] = useState('')
  const [cases, setCases] = useState('')

  function confirm() {
    // non-functional for now — just return to the account screen
    router.push(`/intel/account?id=${encodeURIComponent(id)}`)
  }

  const box: React.CSSProperties = {
    background: theme.surface, borderRadius: 14, padding: '14px 16px', marginTop: 10,
    border: `1.5px solid ${theme.surfaceBorder}`, fontSize: 15, color: theme.ink, width: '100%',
    fontFamily: theme.font,
  }

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 18px 40px', display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      <div style={{ fontSize: 18, fontWeight: 700, color: theme.ink }}>New item sold in</div>
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>log what the buyer took</div>

      <div style={{ fontSize: 13, color: theme.muted, marginTop: 28 }}>which item?</div>
      <select style={box} value={item} onChange={e => setItem(e.target.value)}>
        <option value="">Select an item…</option>
        {ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
      </select>

      <div style={{ fontSize: 13, color: theme.muted, marginTop: 22 }}>how many cases? (optional)</div>
      <input
        style={box}
        type="number"
        inputMode="numeric"
        value={cases}
        onChange={e => setCases(e.target.value)}
        placeholder="e.g. 4"
      />

      <div
        onClick={confirm}
        style={{
          background: item ? '#4E9E55' : theme.surfaceBorder,
          color: item ? '#EAF6E6' : theme.muted,
          textAlign: 'center', fontSize: 16, fontWeight: 700, padding: 15, borderRadius: 16,
          marginTop: 'auto', cursor: item ? 'pointer' : 'default',
        }}>
        Confirm
      </div>
    </main>
  )
}

export default function SoldIn() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <SoldInInner />
    </Suspense>
  )
}