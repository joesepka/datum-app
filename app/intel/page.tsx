'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { theme } from '../../lib/theme'
import { Loader } from '../../lib/loader'

export const dynamic = 'force-dynamic'

export default function IntelSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [selState, setSelState] = useState('')
  const [selCity, setSelCity] = useState('')

  useEffect(() => {
    async function load() {
      const start = Date.now()
      const { data } = await supabase.from('call_list').select('state, city').limit(5000)
      if (data) {
        const st = Array.from(new Set(data.map((r: any) => r.state).filter(Boolean))).sort() as string[]
        const ct = Array.from(new Set(data.map((r: any) => `${r.city}, ${r.state}`).filter(Boolean))).sort() as string[]
        setStates(st)
        setCities(ct)
      }
      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    load()
  }, [])

  function showAccounts() {
    const params = new URLSearchParams()
    if (selState) params.set('state', selState)
    if (selCity) params.set('city', selCity)
    router.push(`/intel/results?${params.toString()}`)
  }

  const box: React.CSSProperties = {
    background: theme.surface, borderRadius: 14, padding: '14px 16px', marginTop: 12,
    border: `1.5px solid ${theme.surfaceBorder}`, fontSize: 15, color: theme.ink, width: '100%',
    fontFamily: theme.font,
  }

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: theme.font, maxWidth: 480, margin: '0 auto' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 10 }}>‹ Back</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Your Accounts</span>
      </div>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>find the accounts you need</p>

      {loading ? (
        <Loader label="Loading your territory…" />
      ) : (
        <>
          <p style={{ fontSize: 13, color: theme.muted, marginTop: 24 }}>filter by location</p>

          <select style={box} value={selState} onChange={e => setSelState(e.target.value)}>
            <option value="">State — all</option>
            {states.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select style={box} value={selCity} onChange={e => setSelCity(e.target.value)}>
            <option value="">City — all</option>
            {cities.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>

          <p style={{ fontSize: 12, color: theme.muted, textAlign: 'center', marginTop: 18 }}>leave blank to see all accounts</p>

          <button
            onClick={showAccounts}
            style={{ background: theme.primary, color: theme.primaryText, border: 'none', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 700, width: '100%', marginTop: 8, cursor: 'pointer', fontFamily: theme.font }}>
            Show accounts
          </button>
        </>
      )}
    </main>
  )
}