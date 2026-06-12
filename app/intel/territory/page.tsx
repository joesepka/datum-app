'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'
import { Loader } from '../../../lib/loader'
import { HeaderLogo } from '../../../lib/headerlogo'

export const dynamic = 'force-dynamic'

const HEALTH: any = {
  growing: { color: '#4E9E55', label: 'growing' },
  steady:  { color: '#B3A48E', label: 'steady' },
  at_risk: { color: '#E0A100', label: 'at risk' },
  lapsed:  { color: '#D8463A', label: 'lapsed' },
}
const ORDER = ['growing', 'steady', 'at_risk', 'lapsed']

function TerritoryInner() {
  const params = useSearchParams()
  const router = useRouter()
  const state = params.get('state') || ''
  const cityCombo = params.get('city') || ''
  const city = cityCombo ? cityCombo.split(',')[0].trim() : ''

  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [trend, setTrend] = useState<any | null>(null)
  const [channel, setChannel] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [area, setArea] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)

  useEffect(() => {
    async function load() {
      const start = Date.now()
      const applyFilter = (q: any) => {
        if (state) q = q.eq('state', state)
        if (city) q = q.eq('city', city)
        return q
      }
      const h = await applyFilter(supabase.from('territory_health').select('health_bucket, vol_52wk'))
      const it = await applyFilter(supabase.from('territory_items').select('product, cur_90, prior_90'))
      const tr = await applyFilter(supabase.from('territory_trend').select('*'))
      const ch = await applyFilter(supabase.from('territory_by_channel').select('bucket, cases_90d, accounts, cur_total, prior_total'))
      const inc = await applyFilter(supabase.from('territory_by_income').select('bucket, cases_90d, accounts, cur_total, prior_total'))
      const ar = await applyFilter(supabase.from('territory_by_area').select('bucket, cases_90d, accounts, cur_total, prior_total'))
      const sm = await applyFilter(supabase.from('territory_summary').select('*'))

      setHealth(aggBucket(h.data, 'health_bucket', ['vol_52wk']))
      setItems(aggBucket(it.data, 'product', ['cur_90', 'prior_90']).sort((a: any, b: any) => b.cur_90 - a.cur_90).slice(0, 6))
      setTrend(sumTrend(tr.data))
      setChannel(aggDim(ch.data))
      setIncome(aggDim(inc.data))
      setArea(aggDim(ar.data))
      setSummary(sumSummary(sm.data))
      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    load()
  }, [state, city])

  function aggBucket(rows: any[] | null, key: string, sums: string[]): any[] {
    if (!rows) return []
    const m: any = {}
    for (const r of rows) {
      const k = r[key] || '—'
      if (!m[k]) { m[k] = { [key]: k }; sums.forEach(s => m[k][s] = 0) }
      sums.forEach(s => m[k][s] += Number(r[s]) || 0)
    }
    return Object.values(m)
  }
  function aggDim(rows: any[] | null): any[] {
    if (!rows) return []
    const m: any = {}
    for (const r of rows) {
      const k = r.bucket || '—'
      if (!m[k]) m[k] = { bucket: k, cases_90d: 0, accounts: 0, cur_total: 0, prior_total: 0 }
      m[k].cases_90d += Number(r.cases_90d) || 0
      m[k].accounts += Number(r.accounts) || 0
      m[k].cur_total += Number(r.cur_total) || 0
      m[k].prior_total += Number(r.prior_total) || 0
    }
    return Object.values(m).filter((r: any) => r.bucket !== '—').sort((a: any, b: any) => b.cases_90d - a.cases_90d)
  }
  function sumTrend(rows: any[] | null): any {
    if (!rows || !rows.length) return null
    const keys = ['t_m6', 't_m5', 't_m4', 't_m3', 't_m2', 't_m1', 't_current']
    const out: any = {}
    keys.forEach(k => out[k] = rows.reduce((s: number, r: any) => s + (Number(r[k]) || 0), 0))
    return out
  }
  function sumSummary(rows: any[] | null): any {
    if (!rows || !rows.length) return null
    const out = { cases_cur: 0, cases_prior: 0, accts_cur: 0, accts_prior: 0 }
    for (const r of rows) {
      out.cases_cur += Number(r.cases_cur) || 0
      out.cases_prior += Number(r.cases_prior) || 0
      out.accts_cur += Number(r.accts_cur) || 0
      out.accts_prior += Number(r.accts_prior) || 0
    }
    return out
  }

  const title = cityCombo || state || 'All territory'

  if (loading) {
    return (
      <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 18px' }}>
        <HeaderLogo />
        <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>
        <Loader label="Building territory report…" />
      </main>
    )
  }

  const healthMap: any = {}
  health.forEach((h: any) => healthMap[h.health_bucket] = h.vol_52wk)
  const healthTotal = ORDER.reduce((s, k) => s + (healthMap[k] || 0), 0) || 1

  const pctChange = (cur: number, prior: number) => prior ? Math.round((cur - prior) / prior * 100) : 0
  let boxes: any[] = []
  if (summary) {
    const casesPct = pctChange(summary.cases_cur, summary.cases_prior)
    const acctsPct = pctChange(summary.accts_cur, summary.accts_prior)
    const rosCur = summary.accts_cur ? summary.cases_cur / summary.accts_cur / 3 : 0
    const rosPrior = summary.accts_prior ? summary.cases_prior / summary.accts_prior / 3 : 0
    const rosPct = rosPrior ? Math.round((rosCur - rosPrior) / rosPrior * 100) : 0
    boxes = [
      { label: 'Total Cases', sub: 'L90', value: summary.cases_cur.toLocaleString(), pct: casesPct },
      { label: 'Active Accounts', sub: 'L90', value: summary.accts_cur.toLocaleString(), pct: acctsPct },
      { label: 'Cases / Acct', sub: 'per month', value: rosCur.toFixed(1), pct: rosPct },
    ]
  }

  let chart: any = null
  if (trend) {
    const t = [trend.t_m6, trend.t_m5, trend.t_m4, trend.t_m3, trend.t_m2, trend.t_m1, trend.t_current].map(Number)
    const labels = ['M-6', 'M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'now']
    const vmax = Math.max(...t, 1), vmin = Math.min(...t)
    const range = vmax - vmin || 1
    const floor = Math.max(0, vmin - range * 0.4)
    const rng = vmax - floor || 1
    const W = 320, H = 130, padX = 20, padY = 18, plotH = H - padY * 2 - 12, plotW = W - padX * 2
    const pts = t.map((v: number, i: number) => ({ x: padX + plotW * i / 6, y: padY + plotH * (1 - (v - floor) / rng), v }))
    const line = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${line} ${pts[6].x.toFixed(1)},${(padY + plotH).toFixed(1)} ${pts[0].x.toFixed(1)},${(padY + plotH).toFixed(1)}`
    const up = t[6] >= t[0]
    chart = { t, labels, pts, line, areaPath, W, H, up }
  }

  const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`
  const itemMax = Math.max(...items.flatMap((i: any) => [Number(i.cur_90), Number(i.prior_90)]), 1)

  function Arrow({ dir }: { dir: string }) {
    if (dir === 'up') return <span style={{ color: '#4E9E55' }}>▲</span>
    if (dir === 'down') return <span style={{ color: '#D8463A' }}>▼</span>
    return <span style={{ color: theme.muted }}>—</span>
  }
  function dirOf(r: any) {
    const c = Number(r.cur_total), p = Number(r.prior_total)
    if (p === 0) return 'flat'
    if (c >= p * 1.08) return 'up'
    if (c <= p * 0.92) return 'down'
    return 'flat'
  }

  function buildAssessment(): string[] {
    const paras: string[] = []
    const pct = (k: string) => Math.round((healthMap[k] || 0) / healthTotal * 100)
    const growPct = pct('growing'), riskPct = pct('at_risk'), lapsedPct = pct('lapsed')
    const atRiskTotal = riskPct + lapsedPct
    const trendWord = chart ? (chart.up ? 'rising' : 'softening') : 'steady'
    let p1 = `${title} volume is ${trendWord}`
    if (chart) {
      const change = Math.round((chart.t[6] - chart.t[0]) / (chart.t[0] || 1) * 100)
      if (Math.abs(change) >= 3) p1 += ` (${change >= 0 ? '+' : ''}${change}% over six months)`
    }
    p1 += `. ${growPct}% of volume sits in growing accounts`
    if (atRiskTotal >= 20) p1 += `, but ${atRiskTotal}% is in at-risk or lapsed accounts that need attention`
    p1 += '.'
    if (items.length) {
      const movers = items.slice(0, 2).map((i: any) => {
        const c = Number(i.cur_90), p = Number(i.prior_90)
        const dir = p === 0 ? '' : c >= p * 1.05 ? ' (up)' : c <= p * 0.95 ? ' (down)' : ''
        return `${String(i.product).trim()}${dir}`
      })
      p1 += ` ${movers.join(' and ')} lead the book.`
    }
    paras.push(p1)
    const allRows = [...channel, ...area].filter((r: any) => Number(r.accounts) >= 5)
    const byRos = allRows.map((r: any) => ({
      name: String(r.bucket).toLowerCase(),
      ros: Number(r.accounts) ? Number(r.cases_90d) / Number(r.accounts) / 3 : 0,
    })).sort((a, b) => b.ros - a.ros)
    let p2 = ''
    if (byRos.length >= 2) {
      const best = byRos[0], worst = byRos[byRos.length - 1]
      p2 += `Productivity is highest in ${best.name} (${best.ros.toFixed(1)} cases per account each month) and lowest in ${worst.name} (${worst.ros.toFixed(1)}).`
    }
    const rising = channel.find((r: any) => dirOf(r) === 'up')
    const falling = channel.find((r: any) => dirOf(r) === 'down')
    if (rising) p2 += ` ${String(rising.bucket).toLowerCase()} is gaining`
    if (rising && falling) p2 += `, while ${String(falling.bucket).toLowerCase()} is slipping`
    if (rising) p2 += '.'
    if (atRiskTotal >= 20) p2 += ` Priority: defend the at-risk base while pressing distribution where per-account velocity is strongest.`
    if (p2.trim()) paras.push(p2.trim())
    return paras
  }
  const assessment = buildAssessment()

  function Table({ title, rows }: { title: string, rows: any[] }) {
    return (
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, color: theme.muted, paddingBottom: 4, borderBottom: `1px solid ${theme.line}` }}>
          <span style={{ flex: 1 }}></span>
          <span style={{ width: 56, textAlign: 'right' }}>90D CS</span>
          <span style={{ width: 70, textAlign: 'right' }}>CS/ACCT/MO</span>
          <span style={{ width: 44, textAlign: 'right' }}>ACCTS</span>
          <span style={{ width: 28, textAlign: 'right' }}>TRD</span>
        </div>
        {rows.map((r: any, i: number) => {
          const cs = Number(r.cases_90d), acc = Number(r.accounts)
          const ros = acc ? (cs / acc / 3) : 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 11, padding: '6px 0', borderBottom: `1px solid ${theme.line}55` }}>
              <span style={{ flex: 1, color: theme.ink, textTransform: 'capitalize' }}>{String(r.bucket).toLowerCase()}</span>
              <span style={{ width: 56, textAlign: 'right', fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono }}>{cs.toLocaleString()}</span>
              <span style={{ width: 70, textAlign: 'right', fontWeight: 700, color: theme.primary, fontFamily: theme.fontMono }}>{ros.toFixed(1)}</span>
              <span style={{ width: 44, textAlign: 'right', color: theme.muted, fontFamily: theme.fontMono }}>{acc.toLocaleString()}</span>
              <span style={{ width: 28, textAlign: 'right' }}><Arrow dir={dirOf(r)} /></span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 18px 48px' }}>
      <HeaderLogo />
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: theme.primary }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.ink }}>{title}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>Territory Overview · last 52 weeks</div>

      {boxes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {boxes.map((b, i) => (
            <div key={i} style={{ flex: 1, background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: '12px 10px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, letterSpacing: 0.3 }}>{b.label}</div>
              <div style={{ fontSize: 7.5, color: theme.muted, marginTop: 1 }}>{b.sub}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono, marginTop: 6 }}>{b.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: b.pct > 0 ? '#3E6E2C' : b.pct < 0 ? '#B23A2E' : theme.muted }}>
                {b.pct > 0 ? '▲' : b.pct < 0 ? '▼' : '—'} {Math.abs(b.pct)}% vs prior 90
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink }}>Territory health</span>
        <span style={{ fontSize: 10, color: theme.muted }}>by volume</span>
      </div>
      <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
        {ORDER.map(k => {
          const pct = (healthMap[k] || 0) / healthTotal * 100
          if (pct < 0.5) return null
          return <div key={k} style={{ width: `${pct}%`, background: HEALTH[k].color, color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pct >= 11 ? `${Math.round(pct)}%` : ''}</div>
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {ORDER.map(k => {
          const pct = (healthMap[k] || 0) / healthTotal * 100
          return <span key={k} style={{ fontSize: 9.5, color: theme.ink, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: HEALTH[k].color }} />{HEALTH[k].label} {Math.round(pct)}%
          </span>
        })}
      </div>

      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 14, padding: 16, marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.primary, marginBottom: 10 }}>Territory assessment</div>
        {assessment.map((p, i) => (
          <p key={i} style={{ fontSize: 12.5, color: theme.ink, lineHeight: 1.5, margin: i === 0 ? '0' : '12px 0 0' }}>{p}</p>
        ))}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginTop: 26 }}>Top items · current vs prior 90 days</div>
      <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: '14px 8px 8px', marginTop: 10, display: 'flex', alignItems: 'flex-end', height: 165 }}>
        {items.map((it: any, i: number) => {
          const c = Number(it.cur_90), prev = Number(it.prior_90)
          const hc = (c / itemMax) * 100, hp = (prev / itemMax) * 100
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: theme.primary, fontFamily: theme.fontMono }}>{c}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: theme.muted, fontFamily: theme.fontMono }}>{prev}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ width: 9, height: hc, background: theme.primary, borderRadius: 2 }} />
                <div style={{ width: 9, height: hp, background: theme.tabBg, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 7.5, color: theme.ink, marginTop: 4, textAlign: 'center', lineHeight: 1.1 }}>{String(it.product).slice(0, 9)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 9.5, color: theme.ink, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: theme.primary, borderRadius: 2 }} /> current 90 days</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: theme.tabBg, borderRadius: 2 }} /> prior 90 days</span>
      </div>

      {chart && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink }}>Rolling 90-day total cases</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: chart.up ? '#3E6E2C' : '#B23A2E' }}>{chart.up ? 'trending up' : 'trending down'}</span>
          </div>
          <div style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: 8, marginTop: 10 }}>
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} style={{ width: '100%' }}>
              <polygon points={chart.areaPath} fill="#F6E2D6" />
              <polyline points={chart.line} fill="none" stroke={theme.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {chart.pts.map((p: any, i: number) => i < 6 ? (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill={theme.primary} />
                  <text x={p.x} y={p.y - 8} fontSize={7} fill={theme.muted} textAnchor="middle" fontFamily={theme.fontMono}>{fmtK(p.v)}</text>
                  <text x={p.x} y={chart.H - 4} fontSize={8} fill={theme.muted} textAnchor="middle">{chart.labels[i]}</text>
                </g>
              ) : (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={8} fill="#E4F0DC" />
                  <circle cx={p.x} cy={p.y} r={4.5} fill="#4E9E55" />
                  <text x={p.x} y={p.y - 11} fontSize={8} fontWeight={700} fill="#3E6E2C" textAnchor="middle" fontFamily={theme.fontMono}>{fmtK(p.v)}</text>
                  <text x={p.x} y={chart.H - 4} fontSize={8} fontWeight={700} fill="#3E6E2C" textAnchor="middle">now</text>
                </g>
              ))}
            </svg>
          </div>
        </>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginTop: 26 }}>Who's buying</div>
      <Table title="By channel" rows={channel} />
      <Table title="By household income" rows={income} />
      <Table title="By area type" rows={area} />
    </main>
  )
}

export default function Territory() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <TerritoryInner />
    </Suspense>
  )
}