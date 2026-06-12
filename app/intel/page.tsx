'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { theme } from '../../lib/theme'
import { Loader } from '../../lib/loader'
import { HeaderLogo } from '../../lib/headerlogo'

export const dynamic = 'force-dynamic'

export default function IntelSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [distributors, setDistributors] = useState<string[]>([])
  const [selState, setSelState] = useState('')
  const [selCity, setSelCity] = useState('')
  const [selDist, setSelDist] = useState('')

  const [nearbyOn, setNearbyOn] = useState(false)
  const [miles, setMiles] = useState(10)

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
      // distributors come from clean_depletions (call_list doesn't carry it)
      try {
        const { data: dd } = await supabase.from('clean_depletions').select('distributor').limit(20000)
        if (dd) {
          const ds = Array.from(new Set(dd.map((r: any) => r.distributor).filter(Boolean))).sort() as string[]
          setDistributors(ds)
        }
      } catch (e) { /* distributors optional */ }

      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    load()
  }, [])

  function showAccounts() {
    const params = new URLSearchParams()
    if (selState) params.set('state', selState)
    if (selCity) params.set('city', selCity)
    if (selDist) params.set('distributor', selDist)
    router.push(`/intel/results?${params.toString()}`)
  }

  const box: React.CSSProperties = {
    background: theme.surface, borderRadius: 14, padding: '14px 16px', marginTop: 12,
    border: `1.5px solid ${theme.surfaceBorder}`, fontSize: 15, color: theme.ink, width: '100%',
    fontFamily: theme.font,
  }

  const mileOptions = [5, 10, 25, 50]

  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: theme.font, maxWidth: 480, margin: '0 auto' }}>
      <HeaderLogo />
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 10 }}>‹ Back</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Your Accounts</span>
      </div>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>find the accounts you need</p>

      {loading ? (
        <Loader label="Loading selection menu…" />
      ) : (
        <>
          {/* Nearby me (visual only) */}
          <div
            onClick={() => setNearbyOn(v => !v)}
            style={{
              background: nearbyOn ? `${theme.primary}10` : theme.surface,
              border: `1.5px solid ${nearbyOn ? theme.primary : theme.surfaceBorder}`,
              borderRadius: 14, padding: '14px 16px', marginTop: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M9 1 C5.4 1 2.5 3.9 2.5 7.5 C2.5 12 9 17 9 17 C9 17 15.5 12 15.5 7.5 C15.5 3.9 12.6 1 9 1 Z"
                  fill="none" stroke={nearbyOn ? theme.primary : theme.muted} strokeWidth="1.6" />
                <circle cx="9" cy="7.3" r="2.3" fill={nearbyOn ? theme.primary : theme.muted} />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: nearbyOn ? theme.primary : theme.ink }}>Nearby me</span>
            </div>
            <div style={{
              width: 40, height: 23, borderRadius: 12, background: nearbyOn ? theme.primary : theme.line,
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 19, height: 19, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                left: nearbyOn ? 19 : 2, transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {nearbyOn && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, color: theme.muted, marginBottom: 8 }}>within radius</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {mileOptions.map(m => (
                  <div
                    key={m}
                    onClick={(e) => { e.stopPropagation(); setMiles(m) }}
                    style={{
                      flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 11, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      background: miles === m ? theme.primary : theme.surface,
                      color: miles === m ? theme.primaryText : theme.muted,
                      border: `1.5px solid ${miles === m ? theme.primary : theme.surfaceBorder}`,
                    }}>
                    {m} mi
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10.5, color: theme.muted, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
                location-based search coming soon
              </p>
            </div>
          )}

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: theme.line }} />
            <span style={{ fontSize: 11, color: theme.muted }}>or filter by distributor or location</span>
            <div style={{ flex: 1, height: 1, background: theme.line }} />
          </div>

          <select style={{ ...box, opacity: nearbyOn ? 0.5 : 1 }} value={selDist} onChange={e => setSelDist(e.target.value)}>
            <option value="">Distributor — all</option>
            {distributors.map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select style={{ ...box, opacity: nearbyOn ? 0.5 : 1 }} value={selState} onChange={e => setSelState(e.target.value)}>
            <option value="">State — all</option>
            {states.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select style={{ ...box, opacity: nearbyOn ? 0.5 : 1 }} value={selCity} onChange={e => setSelCity(e.target.value)}>
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