'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { theme } from '../../../lib/theme'
import { Loader } from '../../../lib/loader'
import { HeaderLogo } from '../../../lib/headerlogo'

export const dynamic = 'force-dynamic'

function GridInner() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') || ''
  const [acct, setAcct] = useState<any>(null)
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const start = Date.now()

      const { data: a } = await supabase
        .from('account_detail')
        .select('account_name, city, state')
        .eq('account_id', id)
        .maybeSingle()
      if (a) setAcct(a)

      const { data: myItems } = await supabase
        .from('account_items')
        .select('product, cases_90d, prior_90')
        .eq('account_id', id)
      const mine: Record<string, { cur: number; prior: number }> = {}
      if (myItems) {
        for (const it of myItems as any[]) {
          mine[it.product] = { cur: Number(it.cases_90d) || 0, prior: Number(it.prior_90) || 0 }
        }
      }

      if (a) {
        let tq = supabase
          .from('clean_depletions')
          .select('product, cases_90d')
          .eq('state', a.state)
        if (a.city) tq = tq.eq('city', a.city)
        const { data: terr } = await tq
        const totals: Record<string, number> = {}
        if (terr) {
          for (const row of terr as any[]) {
            const p = row.product
            totals[p] = (totals[p] || 0) + (Number(row.cases_90d) || 0)
          }
        }
        const list = Object.keys(totals).map(product => {
          const m = mine[product] || { cur: 0, prior: 0 }
          const carried = m.cur > 0 || m.prior > 0
          return {
            product,
            territoryTotal: totals[product],
            cur: m.cur,
            prior: m.prior,
            carried,
          }
        }).sort((a, b) => b.territoryTotal - a.territoryTotal)
        setSkus(list)
      }

      const remaining = Math.max(0, 1500 - (Date.now() - start))
      setTimeout(() => setLoading(false), remaining)
    }
    if (id) load()
  }, [id])

  const carriedCount = skus.filter(s => s.carried).length

  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: theme.bg, fontFamily: theme.font, maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
      {loading ? (
        <Loader label="Building distribution grid…" />
      ) : (
        <>
          <HeaderLogo />
          <div onClick={() => router.back()} style={{ fontSize: 15, color: theme.muted, cursor: 'pointer', marginBottom: 12 }}>‹ Back</div>

          <div style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>Distribution Grid</div>
          {acct && (
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>
              {acct.account_name} · {acct.city}, {acct.state}
            </div>
          )}
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
            ranked by territory volume · {carriedCount}/{skus.length} carried
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, paddingBottom: 6, borderBottom: `1px solid ${theme.line}` }}>
            <span style={{ flex: 1, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: theme.muted }}>SKU</span>
            <span style={{ width: 50, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: theme.muted }}>CARRIED</span>
            <span style={{ width: 54, textAlign: 'right', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: theme.muted }}>90D CS</span>
            <span style={{ width: 58, textAlign: 'right', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: theme.muted }}>PRIOR 90</span>
          </div>

          {skus.map((s, i) => {
            const name = (s.product || '').replace('DATUM ENERGY ', '')
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.line}66` }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: s.carried ? 700 : 400, color: s.carried ? theme.ink : theme.muted }}>{name}</span>
                <span style={{ width: 50, display: 'flex', justifyContent: 'center' }}>
                  {s.carried ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: `${theme.status.growing.dot}22` }}>
                      <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.5 l2.2 2.2 l4.5 -5" fill="none" stroke={theme.status.growing.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: `${theme.status.lost.dot}14` }}>
                      <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 1.5 l6 6 M7.5 1.5 l-6 6" stroke={theme.status.lost.dot} strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </span>
                  )}
                </span>
                <span style={{ width: 54, textAlign: 'right', fontSize: 13, fontWeight: 700, color: s.carried ? theme.ink : theme.muted, fontFamily: theme.fontMono }}>
                  {s.carried ? s.cur : '—'}
                </span>
                <span style={{ width: 58, textAlign: 'right', fontSize: 12, color: theme.muted, fontFamily: theme.fontMono }}>
                  {s.prior > 0 ? s.prior : '—'}
                </span>
              </div>
            )
          })}

          {skus.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.muted, fontSize: 13, padding: '40px 20px' }}>
              No SKU data for this territory.
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default function Grid() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <GridInner />
    </Suspense>
  )
}