'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

function AccountInner() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') || ''
  const [acct, setAcct] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: a } = await supabase.from('account_detail').select('*').eq('account_id', id).single()
      if (a) setAcct(a)
      const { data: it } = await supabase.from('account_items').select('product, cases_90d').eq('account_id', id).order('cases_90d', { ascending: false }).limit(5)
      if (it) setItems(it)
    }
    if (id) load()
  }, [id])

  if (!acct) {
    return <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, padding: 24 }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer' }}>‹ Back</div>
      <p style={{ color: theme.muted, marginTop: 20 }}>Loading…</p>
    </main>
  }

  const trend = [acct.ros_m6, acct.ros_m5, acct.ros_m4, acct.ros_m3, acct.ros_m2, acct.ros_m1, acct.ros_current].map(v => Number(v) || 0)
  const labels = ['M-6', 'M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'now']
  const vmax = Math.max(...trend, 1)
  const vminActual = Math.min(...trend)
  // dynamic floor: cushion below the lowest point, but clamp at 0 (true zero sits on the floor)
  const cushion = (vmax - vminActual) * 0.18 || vmax * 0.1
  const floor = Math.max(0, vminActual - cushion)
  const range = vmax - floor || 1

  const W = 300, H = 140, padX = 18, padY = 20
  const plotW = W - padX * 2, plotH = H - padY * 2 - 14
  const pts = trend.map((v, i) => {
    const x = padX + (plotW * i) / (trend.length - 1)
    const y = padY + plotH * (1 - (v - floor) / range)
    return { x, y }
  })
  const linePath = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} ${pts[pts.length - 1].x.toFixed(1)},${(padY + plotH).toFixed(1)} ${pts[0].x.toFixed(1)},${(padY + plotH).toFixed(1)}`

  const trendDir = acct.ros_current >= acct.ros_m6 ? 'trending up' : 'trending down'
  const itemMax = Math.max(...items.map(i => Number(i.cases_90d) || 0), 1)

  function signalLabel(s: string) {
    if (s === 'lapsed') return 'lost'
    if (s === 'declining') return 'declining'
    if (s === 'growing') return 'growing'
    return s
  }

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 18px 40px' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>{acct.account_name}</div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>{acct.city}, {acct.state} · {(acct.channel || '').toLowerCase()}</div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{acct.income_bucket} · {acct.area_type}</div>
      <div style={{ height: 1, background: theme.line, margin: '14px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink }}>Rate of sale / month</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.status.atRisk.text }}>{trendDir}</span>
      </div>
      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: 8, marginTop: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <polygon points={areaPath} fill="#F6E2D6" />
          <polyline points={linePath} fill="none" stroke={theme.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => {
            const isNow = i === pts.length - 1
            return (
              <g key={i}>
                {isNow ? (
                  <>
                    <circle cx={p.x} cy={p.y} r={8} fill="#E4F0DC" />
                    <circle cx={p.x} cy={p.y} r={4.5} fill="#4E9E55" />
                    <text x={p.x} y={p.y - 11} fontSize={9} fontWeight={700} fill="#3E6E2C" textAnchor="middle">{trend[i]}</text>
                    <text x={p.x} y={H - 4} fontSize={8} fontWeight={700} fill="#3E6E2C" textAnchor="middle">now</text>
                  </>
                ) : (
                  <>
                    <circle cx={p.x} cy={p.y} r={3} fill={theme.primary} />
                    <text x={p.x} y={p.y - 9} fontSize={8} fill={theme.muted} textAnchor="middle">{trend[i]}</text>
                    <text x={p.x} y={H - 4} fontSize={8} fill={theme.muted} textAnchor="middle">{labels[i]}</text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.ink, marginTop: 22 }}>Top items · last 90 days</div>
      <div style={{ marginTop: 10 }}>
        {items.map((it, i) => {
          const v = Number(it.cases_90d) || 0
          const pct = (v / itemMax) * 100
          const name = (it.product || '').replace('DATUM ENERGY ', '')
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: 92, fontSize: 11, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ flex: 1, height: 13, background: theme.tabBg, borderRadius: 6.5, position: 'relative' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: theme.primary, borderRadius: 6.5 }} />
              </div>
              <div style={{ width: 36, textAlign: 'right', fontSize: 10, color: theme.muted, fontFamily: theme.fontMono }}>{v}</div>
            </div>
          )
        })}
      </div>

      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 14, padding: 16, marginTop: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.status.atRisk.text }}>What's going on</div>
        <div style={{ fontSize: 13, color: theme.ink, marginTop: 8 }}>
          {signalLabel(acct.signal)} — {acct.current_90} cs now vs {acct.prior_90} cs prior 90.
        </div>
        {acct.lost_skus && <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>Lost: {acct.lost_skus}</div>}
        {acct.whitespace_pick && <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>Opportunity: {acct.whitespace_pick}</div>}
      </div>

      <div
        onClick={() => router.push(`/intel/soldin?id=${encodeURIComponent(id)}`)}
        style={{ background: theme.primary, color: theme.primaryText, textAlign: 'center', fontSize: 15, fontWeight: 700, padding: 15, borderRadius: 16, marginTop: 18, cursor: 'pointer' }}>
        + New item sold in
      </div>
    </main>
  )
}

export default function Account() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <AccountInner />
    </Suspense>
  )
}