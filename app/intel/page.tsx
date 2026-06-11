'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function IntelSelect() {
  const router = useRouter()
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [selState, setSelState] = useState('')
  const [selCity, setSelCity] = useState('')

  // load the list of states and cities from the data
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('call_list')
        .select('state, city')
        .limit(5000)

      if (data) {
        const st = Array.from(new Set(data.map(r => r.state).filter(Boolean))).sort()
        const ct = Array.from(new Set(data.map(r => `${r.city}, ${r.state}`).filter(Boolean))).sort()
        setStates(st)
        setCities(ct)
      }
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
    background: 'white', borderRadius: 14, padding: '14px 16px', marginTop: 12,
    border: '1.5px solid #E7D8BE', fontSize: 15, color: '#4A1B0C', width: '100%',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAEEDA', padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <a href="/" style={{ fontSize: 16, fontWeight: 600, color: '#4A1B0C', textDecoration: 'none' }}>‹ Account Intel</a>
      <p style={{ fontSize: 13, color: '#854F0B', marginTop: 6 }}>find the accounts you need</p>

      <p style={{ fontSize: 13, color: '#854F0B', marginTop: 24 }}>filter by location</p>

      <select style={box} value={selState} onChange={e => setSelState(e.target.value)}>
        <option value="">State — all</option>
        {states.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select style={box} value={selCity} onChange={e => setSelCity(e.target.value)}>
        <option value="">City — all</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <p style={{ fontSize: 12, color: '#B4A98C', textAlign: 'center', marginTop: 18 }}>leave blank to see all accounts</p>

      <button
        onClick={showAccounts}
        style={{ background: '#27500A', color: '#EAF3DE', border: 'none', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 600, width: '100%', marginTop: 8, cursor: 'pointer' }}>
        Show accounts
      </button>
    </main>
  )
}