'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'
import { Loader } from '../../../lib/loader'

export const dynamic = 'force-dynamic'

function AccountInner() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') || ''
  const [acct, setAcct] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [bench, setBench] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const start = Date.now()
      const { data: a } = await supabase.from('account_detail').select('*').eq('account_id', id).maybeSingle()
      if (a) {
        setAcct(a)
        if (a.zip) {
          const { data: b } = await supabase.from('zip_benchmark').select('*').eq('zip', a.zip).maybeSingle()
          if (b) setBench(b)
        }
      }
      const { data: it } = await supabase.from('account_items').select('product, cases_90d, prior_90').eq('account_id', id).order('cases_90d', { ascending: false }).limit(6)
      if (it) setItems(it)
      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    if (id) load()
  }, [id])

  if (loading || !acct) {
    return <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer' }}>‹ Back</div>
      <Loader label="Loading account…" />
    </main>
  }

  const trend = [acct.ros_m6, acct.ros_m5, acct.ros_m4, acct.ros_m3, acct.ros_m2, acct.ros_m1, acct.ros_current].map((v: any) => Number(v) || 0)
  const labels = ['M-6', 'M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'now']
  const vmax = Math.max(...trend, 1)
  const vminActual = Math.min(...trend)
  const cushion = (vmax - vminActual) * 0.18 || vmax * 0.1
  const floor = Math.max(0, vminActual - cushion)
  const range = vmax - floor || 1

  const W = 300, H = 140, padX = 18, padY = 20
  const plotW = W - padX * 2, plotH = H - padY * 2 - 14
  const pts = trend.map((v: number, i: number) => {
    const x = padX + (plotW * i) / (trend.length - 1)
    const y = padY + plotH * (1 - (v - floor) / range)
    return { x, y }
  })
  const linePath = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} ${pts[pts.length - 1].x.toFixed(1)},${(padY + plotH).toFixed(1)} ${pts[0].x.toFixed(1)},${(padY + plotH).toFixed(1)}`

  const trendDir = acct.ros_current >= acct.ros_m6 ? 'trending up' : 'trending down'
  const itemMax = Math.max(...items.flatMap((i: any) => [Number(i.cases_90d), Number(i.prior_90)]), 1)

  const cur = Number(acct.current_90), prior = Number(acct.prior_90)
  const chg = prior ? Math.round((cur - prior) / prior * 100) : 0

  function buildBriefing() {
    let situation = ''
    if (acct.signal === 'growing') situation = `Growing — up ${chg}% (${cur} vs ${prior} cs prior 90).`
    else if (acct.signal === 'declining') situation = `Declining — down ${Math.abs(chg)}% (${cur} vs ${prior} cs prior 90).`
    else if (acct.signal === 'lapsed') situation = `Lost — was at ${prior} cs, not currently ordering.`
    else if (acct.signal === 'new') situation = `New account — ${cur} cs in the last 90 days.`
    else situation = `Steady — holding at ${cur} cs (${prior} prior 90).`

    let why = ''
    if (acct.lost_skus) why = `Dropped ${acct.lost_skus} — this is a distribution loss, not a velocity problem. Win the SKU back.`
    else if (acct.signal === 'declining') why = `No SKUs lost — the items they carry are slowing. This is a velocity push, not a re-stock.`
    else if (acct.signal === 'growing') why = `Momentum is positive — reinforce what's working and add range while they're receptive.`
    else if (acct.signal === 'lapsed') why = `They've stopped ordering entirely. Re-open the door with their old strong item.`
    else why = `Stable account — look for a reason to grow, not just maintain.`

    let nearby = ''
    if (bench && Number(bench.store_count) > 1) {
      const mine = cur / 3
      const avg = Number(bench.avg_cs_acct_mo)
      const others = Number(bench.store_count) - 1
      if (mine >= avg * 1.1) nearby = `Outperforming the ${others} other store${others === 1 ? '' : 's'} in ${acct.zip} (you ${mine.toFixed(1)} vs ${avg.toFixed(1)} cs/mo avg) — a model account.`
      else if (mine <= avg * 0.9) nearby = `Lagging the ${others} other store${others === 1 ? '' : 's'} in ${acct.zip} (you ${mine.toFixed(1)} vs ${avg.toFixed(1)} cs/mo avg) — real headroom here.`
      else nearby = `In line with the ${others} nearby store${others === 1 ? '' : 's'} in ${acct.zip} (~${avg.toFixed(1)} cs/mo).`
    }

    let move = ''
    if (acct.whitespace_pick) move = `Pitch ${acct.whitespace_pick}${bench && Number(bench.store_count) > 1 ? ` — it sells nearby and they don't carry it.` : '.'}`
    else if (acct.lost_skus) move = `Re-sell ${acct.lost_skus}.`
    else if (acct.signal === 'growing') move = `Add range — they're buying. Push the next strong SKU.`
    else move = `Reinforce the top sellers and confirm the order.`

    return { situation, why, nearby, move }
  }
  const brief = buildBriefing()

  return (
    <main style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 18px 40px' }}>
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>{acct.account_name}</div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>{acct.city}, {acct.state} {acct.zip} · {(acct.channel || '').toLowerCase()}</div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{acct.area_type} · avg household income in area: {acct.income_bucket}</div>
      <div style={{ height: 1, background: theme.line, margin: '14px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink }}>Rate of sale · avg cases sold / month</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.status.atRisk.text }}>{trendDir}</span>
      </div>
      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: 8, marginTop: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <polygon points={areaPath} fill="#F6E2D6" />
          <polyline points={linePath} fill="none" stroke={theme.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p: any, i: number) => {
            const isNow = i === pts.length - 1
            return (
              <g key={i}>
                {isNow ? (
                  <>
                    <circle cx={p.x} cy={p.y} r={8} fill="#E4F0DC" />
                    <circle cx={p.x} cy={p.y} r={4.5} fill="#4E9E55" />
                    <text x={p.x} y={p.y - 11} fontSize={9} fontWeight={700} fill="#3E6E2C" textAnchor="middle">{trend[i].toFixed(1)}</text>
                    <text x={p.x} y={H - 4} fontSize={8} fontWeight={700} fill="#3E6E2C" textAnchor="middle">now</text>
                  </>
                ) : (
                  <>
                    <circle cx={p.x} cy={p.y} r={3} fill={theme.primary} />
                    <text x={p.x} y={p.y - 9} fontSize={8} fill={theme.muted} textAnchor="middle">{trend[i].toFixed(1)}</text>
                    <text x={p.x} y={H - 4} fontSize={8} fill={theme.muted} textAnchor="middle">{labels[i]}</text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.ink, marginTop: 22 }}>Top items · current vs prior 90 days</div>
      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: '14px 8px 8px', marginTop: 10, display: 'flex', alignItems: 'flex-end', height: 160 }}>
        {items.map((it: any, i: number) => {
          const c = Number(it.cases_90d), prev = Number(it.prior_90)
          const hc = (c / itemMax) * 96, hp = (prev / itemMax) * 96
          const name = (it.product || '').replace('DATUM ENERGY ', '')
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: theme.primary, fontFamily: theme.fontMono }}>{c}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: theme.muted, fontFamily: theme.fontMono }}>{prev}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ width: 9, height: hc, background: theme.primary, borderRadius: 2 }} />
                <div style={{ width: 9, height: hp, background: theme.tabBg, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 7.5, color: theme.ink, marginTop: 4, textAlign: 'center', lineHeight: 1.1 }}>{name.slice(0, 9)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 9.5, color: theme.ink, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: theme.primary, borderRadius: 2 }} /> current 90 days</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: theme.tabBg, borderRadius: 2 }} /> prior 90 days</span>
      </div>

      <div style={{ background: theme.surface, border: `1.5px solid ${theme.primary}`, borderRadius: 14, padding: 16, marginTop: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>PRE-CALL BRIEFING</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.muted, letterSpacing: 0.5 }}>SITUATION</div>
          <div style={{ fontSize: 13, color: theme.ink, marginTop: 2 }}>{brief.situation}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.muted, letterSpacing: 0.5 }}>WHY</div>
          <div style={{ fontSize: 13, color: theme.ink, marginTop: 2 }}>{brief.why}</div>
        </div>
        {brief.nearby && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.muted, letterSpacing: 0.5 }}>NEARBY</div>
            <div style={{ fontSize: 13, color: theme.ink, marginTop: 2 }}>{brief.nearby}</div>
          </div>
        )}
        <div style={{ background: theme.bg, borderRadius: 10, padding: '10px 12px', marginTop: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.primary, letterSpacing: 0.5 }}>YOUR MOVE</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, marginTop: 2 }}>{brief.move}</div>
        </div>
      </div>

      <div
        onClick={() => router.push(`/intel/soldin?id=${encodeURIComponent(id)}`)}
        style={{ background: theme.primary, color: theme.primaryText, textAlign: 'center', fontSize: 15, fontWeight: 700, padding: 15, borderRadius: 16, marginTop: 22, cursor: 'pointer' }}>
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