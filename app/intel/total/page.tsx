'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'
import { Loader } from '../../../lib/loader'
import { HeaderLogo } from '../../../lib/headerlogo'

export const dynamic = 'force-dynamic'

const GROW = '#4E9E55', STEADY = '#B3A48E', RISK = '#E0A100', LOST = '#D8463A'
const GLOW_G = '#E4F0DC', GLOW_R = '#FBE4E0'

const STATE_NAMES: Record<string, string> = {
  IL: 'Illinois', OH: 'Ohio', MI: 'Michigan', WI: 'Wisconsin', MN: 'Minnesota',
  IN: 'Indiana', IA: 'Iowa', MO: 'Missouri', KS: 'Kansas', NE: 'Nebraska',
  KY: 'Kentucky', TN: 'Tennessee', ND: 'North Dakota', SD: 'South Dakota',
}

function pct(cur: number, prior: number): number {
  if (!prior) return 0
  return Math.round((cur - prior) / prior * 100)
}
function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n)}`
}
function dir(cur: number, prior: number): number {
  if (!prior) return 0
  if (cur > prior * 1.02) return 1
  if (cur < prior * 0.98) return -1
  return 0
}
function titleCase(s: string): string {
  return String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function cleanProduct(p: string): string {
  return titleCase(String(p).replace('DATUM ENERGY ', '').trim())
}

function Tri({ d, size = 9 }: { d: number; size?: number }) {
  if (d === 0) return <span />
  const color = d > 0 ? GROW : LOST
  return <span style={{ fontSize: size, color, fontWeight: 700 }}>{d > 0 ? '▲' : '▼'}</span>
}

type Cand = {
  scope: string
  dimension: string
  metric: 'mom' | 'ros' | 'dist' | 'health'
  direction: number
  score: number
  phrase: string
}

function placeName(scope: string, dimension: string): string {
  if (scope === 'state') return STATE_NAMES[dimension] || dimension
  if (scope === 'city') {
    const parts = String(dimension).split(',')
    const city = titleCase(parts[0].trim())
    const st = parts[1] ? parts[1].trim() : ''
    return st ? `${city}, ${STATE_NAMES[st] || st}` : city
  }
  return titleCase(dimension)  // channel / chain
}

function cityState(dimension: string): string {
  const parts = String(dimension).split(',')
  return parts[1] ? parts[1].trim() : ''
}

function buildCandidates(scope: string, rows: any[]): Cand[] {
  const out: Cand[] = []
  for (const r of rows) {
    const cur = Number(r.cases_cur), prior = Number(r.cases_prior)
    const vol = cur
    const activeCur = Number(r.active_cur), activePrior = Number(r.active_prior)
    const rosCur = activeCur ? cur / activeCur : 0
    const rosPrior = activePrior ? prior / activePrior : 0
    const g = Number(r.n_growing), s = Number(r.n_steady), rk = Number(r.n_atrisk), l = Number(r.n_lost)
    const total = g + s + rk + l || 1

    const momPct = pct(cur, prior)
    if (dir(cur, prior) !== 0) {
      out.push({ scope, dimension: r.dimension, metric: 'mom', direction: momPct > 0 ? 1 : -1, score: Math.abs(momPct) * vol, phrase: '' })
    }
    const rosD = dir(rosCur, rosPrior)
    if (rosD !== 0) {
      const rp = pct(rosCur, rosPrior)
      out.push({ scope, dimension: r.dimension, metric: 'ros', direction: rosD, score: Math.abs(rp) * vol, phrase: '' })
    }
    const distD = dir(activeCur, activePrior)
    if (distD !== 0) {
      const dp = pct(activeCur, activePrior)
      out.push({ scope, dimension: r.dimension, metric: 'dist', direction: distD, score: Math.abs(dp) * vol, phrase: '' })
    }
    const badShare = (rk + l) / total
    if (badShare >= 0.45) {
      out.push({ scope, dimension: r.dimension, metric: 'health', direction: -1, score: badShare * vol, phrase: '' })
    } else if (g / total >= 0.5) {
      out.push({ scope, dimension: r.dimension, metric: 'health', direction: 1, score: (g / total) * vol, phrase: '' })
    }
  }
  return out
}

function Grid({ title, scope, rows, highlights }: { title: string; scope: string; rows: any[]; highlights: Record<string, string> }) {
  if (!rows.length) return null
  const hi = (dim: string, metric: string) => highlights[`${scope}:${dim}:${metric}`]
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.ink }}>{title}</span>
        <span style={{ fontSize: 8.5, color: theme.muted }}>ROS · DIST · health</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, paddingBottom: 5, borderBottom: `1px solid ${theme.line}` }}>
        <span style={{ flex: 1 }}></span>
        <span style={{ width: 52, textAlign: 'right', fontSize: 7.5, fontWeight: 700, color: theme.muted }}>L90 CS</span>
        <span style={{ width: 42, textAlign: 'right', fontSize: 7.5, fontWeight: 700, color: theme.muted }}>MOM</span>
        <span style={{ width: 38, textAlign: 'center', fontSize: 7.5, fontWeight: 700, color: theme.muted }}>ROS</span>
        <span style={{ width: 38, textAlign: 'center', fontSize: 7.5, fontWeight: 700, color: theme.muted }}>DIST</span>
        <span style={{ width: 62, textAlign: 'center', fontSize: 7.5, fontWeight: 700, color: theme.muted }}>HEALTH</span>
      </div>
      {rows.map((r, i) => {
        const cur = Number(r.cases_cur), prior = Number(r.cases_prior)
        const mom = pct(cur, prior)
        const momColor = mom > 0 ? '#3E6E2C' : mom < 0 ? '#B23A2E' : theme.muted
        const activeCur = Number(r.active_cur), activePrior = Number(r.active_prior)
        const rosCur = activeCur ? cur / activeCur : 0
        const rosPrior = activePrior ? prior / activePrior : 0
        const g = Number(r.n_growing), s = Number(r.n_steady), rk = Number(r.n_atrisk), l = Number(r.n_lost)
        const total = g + s + rk + l || 1
        const cell = (metric: string): React.CSSProperties => {
          const h = hi(r.dimension, metric)
          if (!h) return {}
          return { background: h === 'g' ? GLOW_G : GLOW_R, borderRadius: 5 }
        }
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${theme.line}55` }}>
            <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {placeName(scope, r.dimension)}
            </span>
            <span style={{ width: 52, textAlign: 'right', fontSize: 11, fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono }}>{cur.toLocaleString()}</span>
            <span style={{ width: 42, textAlign: 'right', fontSize: 9.5, fontWeight: 700, color: momColor, fontFamily: theme.fontMono, padding: '3px 2px', ...cell('mom') }}>{mom > 0 ? '+' : ''}{mom}%</span>
            <span style={{ width: 38, display: 'flex', justifyContent: 'center', padding: '3px 0', ...cell('ros') }}><Tri d={dir(rosCur, rosPrior)} /></span>
            <span style={{ width: 38, display: 'flex', justifyContent: 'center', padding: '3px 0', ...cell('dist') }}><Tri d={dir(activeCur, activePrior)} /></span>
            <span style={{ width: 62, display: 'flex', justifyContent: 'center', padding: '3px 2px', ...cell('health') }}>
              <span style={{ display: 'flex', width: 56, height: 9, borderRadius: 2, overflow: 'hidden', border: `0.5px solid ${theme.surfaceBorder}` }}>
                <div style={{ width: `${g / total * 100}%`, background: GROW }} />
                <div style={{ width: `${s / total * 100}%`, background: STEADY }} />
                <div style={{ width: `${rk / total * 100}%`, background: RISK }} />
                <div style={{ width: `${l / total * 100}%`, background: LOST }} />
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TotalInner() {
  const router = useRouter()
  const [totals, setTotals] = useState<any>(null)
  const [states, setStates] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [chains, setChains] = useState<any[]>([])
  const [chanItems, setChanItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const start = Date.now()
      try { const { data: t } = await supabase.from('tbr_totals').select('*').maybeSingle(); if (t) setTotals(t) } catch (e) {}
      try { const { data } = await supabase.from('tbr_by_state').select('*'); if (data) setStates(data) } catch (e) {}
      try { const { data } = await supabase.from('tbr_by_city').select('*'); if (data) setCities(data) } catch (e) {}
      try { const { data } = await supabase.from('tbr_by_channel').select('*'); if (data) setChannels(data) } catch (e) {}
      try { const { data } = await supabase.from('tbr_by_chain').select('*'); if (data) setChains(data) } catch (e) {}
      try { const { data } = await supabase.from('tbr_channel_items').select('*'); if (data) setChanItems(data) } catch (e) {}
      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    load()
  }, [])

  const boxes = totals ? [
    { label: 'L52W CASES', value: fmtK(Number(totals.cases_52w)), sub: 'vs PY', pct: pct(Number(totals.cases_52w), Number(totals.cases_52w_ya)) },
    { label: 'L90D CASES', value: fmtK(Number(totals.cases_90)), sub: 'vs prev 90', pct: pct(Number(totals.cases_90), Number(totals.cases_90_prior)) },
    { label: 'ACCOUNTS L90', value: Number(totals.accts_cur).toLocaleString(), sub: 'vs prior', pct: pct(Number(totals.accts_cur), Number(totals.accts_prior)) },
  ] : []

  function channelDriver(channelRaw: string, direction: number): string {
    const rows = chanItems.filter((r: any) => String(r.channel).toLowerCase() === String(channelRaw).toLowerCase())
    let best: any = null, bestScore = -1
    for (const r of rows) {
      const cur = Number(r.cur), prior = Number(r.prior)
      const d = dir(cur, prior)
      if (d !== direction) continue
      const change = Math.abs(cur - prior)
      if (change > bestScore) { bestScore = change; best = r }
    }
    return best ? cleanProduct(best.product) : ''
  }

  function makePhrase(c: Cand, flaggedStates: Map<string, number>): string {
    const place = placeName(c.scope, c.dimension)

    if (c.scope === 'city') {
      const st = cityState(c.dimension)
      if (st && flaggedStates.get(st) === c.direction) {
        const cityOnly = titleCase(String(c.dimension).split(',')[0].trim())
        const stName = STATE_NAMES[st] || st
        if (c.direction > 0) return `${stName} is growing, led by ${cityOnly}`
        return `${stName} is softening, led by ${cityOnly}`
      }
    }

    if (c.scope === 'channel') {
      const driver = channelDriver(c.dimension, c.direction)
      const ch = titleCase(c.dimension)
      if (c.direction > 0) return driver ? `${ch} is climbing, led by ${driver}` : `${ch} is climbing`
      return driver ? `${ch} is softening, driven by ${driver}` : `${ch} is softening`
    }

    if (c.metric === 'mom') return `${c.direction > 0 ? 'Volume up' : 'Volume down'} in ${place}`
    if (c.metric === 'ros') return `${c.direction > 0 ? 'Velocity rising' : 'Velocity slipping'} in ${place}`
    if (c.metric === 'dist') return `${c.direction > 0 ? 'Gaining doors' : 'Losing doors'} in ${place}`
    if (c.metric === 'health') return `${c.direction > 0 ? 'Account health strong' : 'Account health eroding'} in ${place}`
    return place
  }

  const allCands = [
    ...buildCandidates('state', states),
    ...buildCandidates('city', cities),
    ...buildCandidates('channel', channels),
    ...buildCandidates('chain', chains),
  ]

  function flaggedStateMap(cands: Cand[]): Map<string, number> {
    const m = new Map<string, number>()
    for (const c of cands.filter(x => x.scope === 'state')) {
      m.set(c.dimension, c.direction)
    }
    return m
  }
  const stateDir = flaggedStateMap(allCands)

  function pickWithRollup(cands: Cand[], n: number): Cand[] {
    const sorted = [...cands].sort((a, b) => b.score - a.score)
    const picked: Cand[] = []
    const seenScopeMetric = new Set<string>()
    const seenDim = new Set<string>()
    const rolledStates = new Set<string>()

    for (const c of sorted) {
      if (picked.length >= n) break
      if (c.scope === 'city') {
        const st = cityState(c.dimension)
        if (st && stateDir.get(st) === c.direction) {
          if (rolledStates.has(st)) continue
          rolledStates.add(st)
        }
      }
      if (c.scope === 'state' && rolledStates.has(c.dimension)) continue
      const key = `${c.scope}:${c.metric}`
      if (seenScopeMetric.has(key) || seenDim.has(c.dimension)) continue
      picked.push(c); seenScopeMetric.add(key); seenDim.add(c.dimension)
    }
    for (const c of sorted) {
      if (picked.length >= n) break
      if (picked.includes(c)) continue
      if (c.scope === 'state' && rolledStates.has(c.dimension)) continue
      if (seenDim.has(c.dimension)) continue
      picked.push(c); seenDim.add(c.dimension)
    }
    return picked
  }

  const tailwinds = pickWithRollup(allCands.filter(c => c.direction > 0), 3)
  const headwinds = pickWithRollup(allCands.filter(c => c.direction < 0), 3)

  const highlights: Record<string, string> = {}
  for (const c of tailwinds) highlights[`${c.scope}:${c.dimension}:${c.metric}`] = 'g'
  for (const c of headwinds) highlights[`${c.scope}:${c.dimension}:${c.metric}`] = 'r'

  function Card({ kind, items }: { kind: 'tail' | 'head'; items: Cand[] }) {
    const color = kind === 'tail' ? GROW : LOST
    return (
      <div style={{ flex: 1, background: theme.surface, border: `1.2px solid ${color}`, borderRadius: 12, padding: '12px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>{kind === 'tail' ? 'TAILWINDS' : 'HEADWINDS'}</span>
        </div>
        {items.length === 0 && <div style={{ fontSize: 9, color: theme.muted }}>—</div>}
        {items.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'flex-start' }}>
            <span style={{ color, fontWeight: 700, fontSize: 10, lineHeight: '14px' }}>–</span>
            <span style={{ fontSize: 9.5, color: theme.ink, lineHeight: '14px' }}>{makePhrase(c, stateDir)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 16px 48px' }}>
      <HeaderLogo />
      <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

      {loading ? (
        <Loader label="Building business recap…" />
      ) : (
        <>
          <div style={{ fontSize: 19, fontWeight: 700, color: theme.ink }}>Total Business</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>all markets · last 52 weeks</div>

          {boxes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {boxes.map((b, i) => (
                <div key={i} style={{ flex: 1, background: theme.surface, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 12, padding: '12px 10px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: theme.muted, letterSpacing: 0.3 }}>{b.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: theme.ink, fontFamily: theme.fontMono, marginTop: 6 }}>{b.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, color: b.pct > 0 ? '#3E6E2C' : b.pct < 0 ? '#B23A2E' : theme.muted }}>
                    {b.pct > 0 ? '▲' : b.pct < 0 ? '▼' : '—'} {Math.abs(b.pct)}% {b.sub}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <Card kind="tail" items={tailwinds} />
            <Card kind="head" items={headwinds} />
          </div>

          <Grid title="By State" scope="state" rows={states} highlights={highlights} />
          <Grid title="Top 15 Cities" scope="city" rows={cities} highlights={highlights} />
          <Grid title="By Channel" scope="channel" rows={channels} highlights={highlights} />
          <Grid title="Top 15 Chains" scope="chain" rows={chains} highlights={highlights} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 20 }}>
            {[['growing', GROW], ['steady', STEADY], ['at risk', RISK], ['lost', LOST]].map(([lab, col], i) => (
              <span key={i} style={{ fontSize: 9, color: theme.ink, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 9, background: col as string, borderRadius: 1 }} /> {lab}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 9, color: theme.muted, marginTop: 12, lineHeight: 1.5 }}>
            ROS = cases per account (L90 vs prior 90). DIST = active account count (L90 vs prior 90). Blank = no meaningful change.
          </div>
        </>
      )}
    </main>
  )
}

export default function TotalBusiness() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <TotalInner />
    </Suspense>
  )
}