'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

function ResultsInner() {
  const params = useSearchParams()
  const stateFilter = params.get('state') || ''
  const cityCombo = params.get('city') || ''
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'new' | 'risk'>('all')

  useEffect(() => {
    async function load() {
      let q = supabase
        .from('call_list')
        .select('account_name, signal, current_90, prior_90, city, state, account_id')
        .order('weight_volume', { ascending: false })
        .limit(200)

      if (stateFilter) q = q.eq('state', stateFilter)
      if (cityCombo) {
        const city = cityCombo.split(',')[0].trim()
        q = q.eq('city', city)
      }

      const { data } = await q
      if (data) setRows(data)
    }
    load()
  }, [stateFilter, cityCombo])

  function look(signal: string) {
    if (signal === 'lapsed') return { bg: '#FBE3E3', fg: '#9B2C2C', label: 'lost' }
    if (signal === 'declining') return { bg: '#FBF0D0', fg: '#7A5B05', label: 'at risk' }
    if (signal === 'growing') return { bg: '#EAF3DE', fg: '#3B6D11', label: 'growing' }
    if (signal === 'new') return { bg: '#FFFFFF', fg: '#5F5E5A', label: 'new' }
    return { bg: '#FFFFFF', fg: '#5F5E5A', label: signal }
  }

  const shown = rows.filter(r => {
    if (filter === 'new') return r.signal === 'new'
    if (filter === 'risk') return r.signal === 'lapsed' || r.signal === 'declining'
    return true
  })

  const title = cityCombo || stateFilter || 'All accounts'

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 17, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: active ? 'none' : '1.5px solid #E7D8BE',
    background: active ? '#D85A30' : 'white', color: active ? '#FAECE7' : '#854F0B',
  })

  return (
    <main style={{ minHeight: '100vh', background: '#FAEEDA', padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <a href="/intel" style={{ fontSize: 16, fontWeight: 600, color: '#4A1B0C', textDecoration: 'none' }}>‹ {title}</a>
      <p style={{ fontSize: 12, color: '#854F0B', marginTop: 6 }}>{shown.length} accounts · by 52-wk volume</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 16 }}>
        <span style={btn(filter === 'new')} onClick={() => setFilter(filter === 'new' ? 'all' : 'new')}>New</span>
        <span style={btn(filter === 'risk')} onClick={() => setFilter(filter === 'risk' ? 'all' : 'risk')}>Lost & At Risk</span>
      </div>

      {shown.map((r, i) => {
        const l = look(r.signal)
        return (
          <div key={i} style={{ background: l.bg, borderRadius: 13, padding: '12px 16px', marginBottom: 8, border: l.bg === '#FFFFFF' ? '1px solid #EADFC9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4A1B0C' }}>{r.account_name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: l.fg, marginTop: 2 }}>{l.label}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4A1B0C' }}>{r.current_90}</div>
              <div style={{ fontSize: 10, color: '#5F5E5A' }}>90-day cs</div>
            </div>
          </div>
        )
      })}
    </main>
  )
}

export default function Results() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ResultsInner />
    </Suspense>
  )
}