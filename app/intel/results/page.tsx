'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'
import { Loader } from '../../../lib/loader'
import { HeaderLogo } from '../../../lib/headerlogo'

export const dynamic = 'force-dynamic'

const NEW_COLOR = '#9A8C77'
const NEW_GREEN = '#4E9E55'

function statusKey(signal: string): 'lost' | 'atRisk' | 'growing' | 'new' {
  if (signal === 'lapsed') return 'lost'
  if (signal === 'declining') return 'atRisk'
  if (signal === 'growing') return 'growing'
  return 'new'
}

function reasonFor(r: any): string {
  const cur = Number(r.current_90), prior = Number(r.prior_90)
  const chg = prior ? Math.round((cur - prior) / prior * 100) : 0
  if (r.signal === 'lapsed') return 'lapsed'
  if (r.signal === 'new') return 'new account'
  if (r.lost_skus) return `dropped ${String(r.lost_skus).split(',')[0].trim()}`
  if (r.signal === 'declining') return `down ${Math.abs(chg)}% · velocity`
  if (r.signal === 'growing') return `up ${chg}% · climbing`
  return 'holding steady'
}

function daysAgo(dateStr: string | null): { label: string; overdue: boolean } {
  if (!dateStr) return { label: '—', overdue: false }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { label: '—', overdue: false }
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days < 0) return { label: '0d', overdue: false }
  if (days < 90) return { label: `${days}d`, overdue: days > 45 }
  if (days < 365) return { label: `${Math.floor(days / 30)}mo`, overdue: true }
  return { label: `${Math.floor(days / 365)}y`, overdue: true }
}

function ResultsInner() {
  const params = useSearchParams()
  const router = useRouter()
  const stateFilter = params.get('state') || ''
  const cityCombo = params.get('city') || ''
  const distFilter = params.get('distributor') || ''
  const [rows, setRows] = useState<any[]>([])
  const [dates, setDates] = useState<Record<string, string>>({})
  const [lostMap, setLostMap] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<'all' | 'new' | 'risk'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const start = Date.now()

      // if a distributor is selected, resolve it to account_ids first
      let distIds: string[] | null = null
      if (distFilter) {
        try {
          const { data: di } = await supabase
            .from('clean_depletions')
            .select('account_id')
            .eq('distributor', distFilter)
            .limit(50000)
          if (di) distIds = Array.from(new Set(di.map((r: any) => r.account_id)))
        } catch (e) { /* distributor resolve optional */ }
      }

      let q = supabase
        .from('call_list')
        .select('account_name, signal, current_90, prior_90, lost_skus, city, state, account_id')
        .order('weight_volume', { ascending: false })
        .limit(200)
      if (stateFilter) q = q.eq('state', stateFilter)
      if (cityCombo) q = q.eq('city', cityCombo.split(',')[0].trim())
      if (distIds && distIds.length) q = q.in('account_id', distIds)
      const { data } = await q

      if (data) {
        setRows(data)
        const ids = data.map((r: any) => r.account_id)

        try {
          const { data: dd } = await supabase
            .from('clean_depletions')
            .select('account_id, last_invoice_date')
            .in('account_id', ids)
          if (dd) {
            const map: Record<string, string> = {}
            for (const row of dd as any[]) {
              const cur = map[row.account_id]
              if (!cur || new Date(row.last_invoice_date) > new Date(cur)) {
                map[row.account_id] = row.last_invoice_date
              }
            }
            setDates(map)
          }
        } catch (e) { /* dates optional */ }

        try {
          const { data: items } = await supabase
            .from('clean_depletions')
            .select('account_id, cases_90d, cases_90d_m3')
            .in('account_id', ids)
          if (items) {
            const lm: Record<string, number> = {}
            for (const row of items as any[]) {
              const c = Number(row.cases_90d) || 0
              const p = Number(row.cases_90d_m3) || 0
              if (c === 0 && p > 0) {
                lm[row.account_id] = (lm[row.account_id] || 0) + 1
              }
            }
            setLostMap(lm)
          }
        } catch (e) { /* lost skus optional */ }
      }

      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    load()
  }, [stateFilter, cityCombo, distFilter])

  const shown = rows.filter(r => {
    if (filter === 'new') return r.signal === 'new'
    if (filter === 'risk') return r.signal === 'lapsed' || r.signal === 'declining'
    return true
  })

  const title = cityCombo || distFilter || stateFilter || 'All accounts'

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
    <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 14px 40px' }}>
      <HeaderLogo />
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 10 }}>‹ Back</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>{title}</span>
        </div>
        <span style={{ fontSize: 11, color: theme.muted }}>{loading ? '' : `${shown.length} · by volume`}</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <span
          onClick={() => router.push(`/intel/territory?state=${encodeURIComponent(stateFilter)}&city=${encodeURIComponent(cityCombo)}`)}
          style={{ display: 'inline-block', background: theme.primary, color: theme.primaryText, fontSize: 12.5, fontWeight: 700, padding: '10px 26px', borderRadius: 19, cursor: 'pointer' }}>
          Generate Territory Report
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, background: theme.tabBg, borderRadius: 9, padding: 2, marginTop: 18 }}>
        {tab('All', 'all')}{tab('At Risk', 'risk')}{tab('New', 'new')}
      </div>

      {loading ? (
        <Loader label="Loading accounts…" />
      ) : (
        <div style={{ marginTop: 14 }}>
          {shown.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.muted, fontSize: 13, padding: '40px 20px' }}>
              No accounts match this filter.
            </div>
          )}
          {shown.map((r, i) => {
            const isNew = r.signal === 'new'
            const isSteady = r.signal === 'steady'
            const sk = isNew ? { dot: NEW_COLOR, text: NEW_COLOR } : theme.status[statusKey(r.signal)]
            const cur = Number(r.current_90), prior = Number(r.prior_90)
            const ros = Math.round(cur / 3)
            const chg = prior ? Math.round((cur - prior) / prior * 100) : 0
            const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '—'
            const acol = chg > 0 ? '#3E6E2C' : chg < 0 ? '#B23A2E' : theme.muted
            const reason = reasonFor(r)
            const last = daysAgo(dates[r.account_id])
            const nLost = lostMap[r.account_id] || 0

            const plainReason = isNew || isSteady

            let rightEl
            if (nLost > 0) {
              rightEl = (
                <div style={{ background: `${sk.dot}24`, borderRadius: 8, padding: '3px 9px', marginTop: 6 }}>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: sk.text }}>−{nLost} SKU{nLost > 1 ? 's' : ''}</span>
                </div>
              )
            } else if (isNew) {
              rightEl = (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: NEW_GREEN, letterSpacing: 0.3 }}>NEW ACCT</span>
                </div>
              )
            } else {
              const sparkMax = Math.max(cur, prior, 1)
              const y1 = 18 - (prior / sparkMax) * 14
              const y2 = 18 - (cur / sparkMax) * 14
              rightEl = (
                <svg width="46" height="22" style={{ marginTop: 8 }}>
                  <polyline points={`0,${y1.toFixed(1)} 44,${y2.toFixed(1)}`} fill="none" stroke={sk.dot} strokeWidth={1.6} strokeLinecap="round" />
                  <circle cx={44} cy={y2.toFixed(1)} r={2.2} fill={sk.dot} />
                </svg>
              )
            }

            return (
              <div
                key={i}
                onClick={() => router.push(`/intel/account?id=${encodeURIComponent(r.account_id)}`)}
                style={{
                  position: 'relative', display: 'flex', background: theme.surface,
                  border: `1px solid ${theme.surfaceBorder}`, borderRadius: 11, padding: '11px 14px 11px 14px',
                  marginBottom: 9, cursor: 'pointer', overflow: 'hidden',
                }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sk.dot }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 38, marginLeft: 2, marginRight: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted, fontFamily: theme.fontMono }}>{i + 1}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: last.overdue ? '#B23A2E' : theme.muted, fontFamily: theme.fontMono, marginTop: 3 }}>{last.label}</span>
                  <span style={{ fontSize: 5.5, color: theme.muted, letterSpacing: 0.2, marginTop: 1 }}>LAST ORDER</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.account_name}</div>

                  {!isNew && (
                    plainReason ? (
                      <div style={{ marginTop: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: theme.muted }}>{reason}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', marginTop: 5, background: `${sk.dot}22`, borderRadius: 7, padding: '2px 8px' }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: sk.text }}>{reason}</span>
                      </div>
                    )
                  )}

                  <div style={{ marginTop: 8 }}>
                    {isNew ? (
                      <span style={{ fontSize: 9, color: theme.muted }}>{ros} cs/mo · first 90 days</span>
                    ) : (
                      <span style={{ fontSize: 9, color: theme.muted }}>
                        {ros} cs/mo <span style={{ fontWeight: 700, color: acol, marginLeft: 6 }}>{arrow} {Math.abs(chg)}% vs prior 90</span>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono, lineHeight: 1 }}>{cur}</div>
                    <div style={{ fontSize: 7, color: theme.muted, letterSpacing: 0.5, marginTop: 2 }}>90-DAY CS</div>
                  </div>
                  {rightEl}
                </div>
              </div>
            )
          })}
        </div>
      )}
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