'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

const ALL_ITEMS = [
  'Original', 'Zero Sugar', 'Berry Rush', 'Tropical Blast', 'Citrus Surge',
  'Peach Mango', 'Watermelon Wave', 'Sour Apple', 'Blue Razz', 'Variety Pack',
]

function SoldInInner() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') || ''
  const [acctName, setAcctName] = useState('')
  const [item, setItem] = useState('')
  const [cases, setCases] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('account_detail').select('account_name').eq('account_id', id).maybeSingle()
      if (data) setAcctName(data.account_name)
    }
    if (id) load()
  }, [id])

  function confirm() {
    // scaffold only — does not save yet
    router.push(`/intel/account?id=${encodeURIComponent(id)}`)
  }

  const box: React.CSSProperties = {
    background: theme.surface, borderRadius: 14, padding: '14px 16px', marginTop: 12,
    border: `1.5px solid ${theme.surfaceBorder}`, fontSize: 15, color: theme.ink, width: '100%',
    fontFamily: theme.font,
  }

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: theme.font, maxWidth: 480, margin: '0 auto' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>New item sold in</div>
      {acctName && <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>{acctName}</div>}

      <p style={{ fontSize: 13, color: theme.muted, marginTop: 22 }}>which item?</p>
      <select style={box} value={item} onChange={e => setItem(e.target.value)}>
        <option value="">Select an item…</option>
        {ALL_ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
      </select>

      <p style={{ fontSize: 13, color: theme.muted, marginTop: 18 }}>cases (optional)</p>
      <input
        style={box}
        type="number"
        inputMode="numeric"
        placeholder="e.g. 5"
        value={cases}
        onChange={e => setCases(e.target.value)}
      />

      <button
        onClick={confirm}
        disabled={!item}
        style={{
          background: item ? theme.primary : theme.line,
          color: item ? theme.primaryText : theme.muted,
          border: 'none', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 700,
          width: '100%', marginTop: 24, cursor: item ? 'pointer' : 'default', fontFamily: theme.font,
        }}>
        Confirm
      </button>

      <p style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 14 }}>
        Logging coming soon — this won't save yet.
      </p>
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