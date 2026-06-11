'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

function statusKey(signal: string): 'lost' | 'atRisk' | 'growing' | 'new' {
  if (signal === 'lapsed') return 'lost'
  if (signal === 'declining') return 'atRisk'
  if (signal === 'growing') return 'growing'
  return 'new'
}
function statusLabel(signal: string) {
  if (signal === 'lapsed') return 'lost'
  if (signal === 'declining') return 'at risk'
  if (signal === 'growing') return 'growing'
  if (signal === 'new') return 'new'
  return signal
}

function ResultsInner() {
  const params = useSearchParams()
  const router = useRouter()
  const stateFilter = params.get('state') || ''
  const cityCombo = params.get('city') || ''
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'new' | 'risk'>('all')

  useEffect(() => {
    async function load() {
      let q = supabase
        .from('call_list')
        .select('account_name, signal, current_90, city, state, account_id')
        .order('weight_volume', { ascending: false })
        .limit(200)
      if (stateFilter) q = q.eq('state', stateFilter)
      if (cityCombo) q = q.eq('city', cityCombo.split(',')[0].trim())
      const { data } = await q
      if (data) setRows(data)
    }
    load()
  }, [stateFilter, cityCombo])

  const shown = rows.filter(r => {
    if (filter === 'new') return r.signal === 'new'
    if (filter === 'risk') return r.signal === 'lapsed' || r.signal === 'declining'
    return true
  })

  const title = cityCombo || stateFilter || 'All accounts'

  const tab = (label: string, key: 'all' | 'new' | 'risk') => (
    <div
      onClick={() => setFilter(key)}
      style={{
        flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, cursor: 'pointer',
        fontSize: 12, fontWeight: filter === key ? 700 : 400,
        background: filter === key ? theme.surface : 'transparent',
        color: filter === key ? theme.ink : theme.muted,
      }}>
      {label}
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 10 }}>‹ Back</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>{title}</span>
        </div>
        <span style={{ fontSize: 11, color: theme.muted }}>{shown.length} accounts</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <span style={{ display: 'inline-block', background: theme.primary, color: theme.primaryText, fontSize: 12.5, fontWeight: 700, padding: '10px 26px', borderRadius: 19 }}>
          Generate Territory Report
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, background: theme.tabBg, borderRadius: 9, padding: 2, marginTop: 18 }}>
        {tab('All', 'all')}{tab('At Risk', 'risk')}{tab('New', 'new')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 6px 8px', fontSize: 8.5, fontWeight: 700, letterSpacing: 1, color: theme.muted }}>
        <span style={{ flex: 1 }}>ACCOUNT</span>
        <span style={{ width: 70, textAlign: 'right' }}>90-DAY</span>
        <span style={{ width: 64, textAlign: 'right' }}>ROS/MO</span>
      </div>
      <div style={{ height: 1, background: theme.line, marginBottom: 8 }} />

      {shown.map((r, i) => {
        const sk = theme.status[statusKey(r.signal)]
        const ros = Math.round((r.current_90 || 0) / 3)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: theme.radius, padding: '9px 14px', marginBottom: 8 }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: sk.dot, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.account_name}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: sk.text, marginTop: 1 }}>{statusLabel(r.signal)}</div>
            </div>
            <div style={{ width: 70, textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono }}>{r.current_90}</div>
              <div style={{ fontSize: 8, color: theme.muted }}>cs</div>
            </div>
            <div style={{ width: 64, textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: theme.muted, fontFamily: theme.fontMono }}>{ros}</div>
              <div style={{ fontSize: 8, color: theme.muted }}>cs/month</div>
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