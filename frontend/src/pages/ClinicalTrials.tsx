import { useEffect, useState, useCallback } from 'react'
import { searchClinicalTrials, getClinicalTrial } from '@/lib/api'
import type { ClinicalTrialSummary, ClinicalTrialDetail, ClinicalSearchParams } from '@/types'

const STATUS_OPTIONS = ['', 'RECRUITING', 'COMPLETED', 'ACTIVE_NOT_RECRUITING', 'NOT_YET_RECRUITING', 'TERMINATED'] as const
const PHASE_OPTIONS = ['', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'EARLY_PHASE1', 'NA'] as const

const STATUS_COLORS: Record<string, string> = {
  RECRUITING:              'text-[#4edea3] border-[#4edea3]/40',
  ACTIVE_NOT_RECRUITING:   'text-[#adc6ff] border-[#adc6ff]/40',
  NOT_YET_RECRUITING:      'text-[#c0c1ff] border-[#c0c1ff]/40',
  COMPLETED:               'text-[#8c909f] border-[#424754]',
  TERMINATED:              'text-[#ef4444] border-[#ef4444]/40',
  WITHDRAWN:               'text-[#ef4444] border-[#ef4444]/40',
  SUSPENDED:               'text-[#f59e0b] border-[#f59e0b]/40',
  UNKNOWN:                 'text-[#8c909f] border-[#424754]',
}

function statusClass(s: string | null) {
  return STATUS_COLORS[s ?? ''] ?? 'text-[#8c909f] border-[#424754]'
}

function phaseLabel(p: string) {
  return p.replace('PHASE', 'PH ').replace('EARLY_PH 1', 'EARLY PH 1')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return d
}

export default function ClinicalTrials() {
  const [condition, setCondition]   = useState('TP53')
  const [intervention, setIntervention] = useState('')
  const [status, setStatus]         = useState<string>('RECRUITING')
  const [phase, setPhase]           = useState<string>('')
  const [trials, setTrials]         = useState<ClinicalTrialSummary[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail]         = useState<ClinicalTrialDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError]     = useState<string | null>(null)

  const runSearch = useCallback(async () => {
    setLoading(true); setError(null); setTrials([]); setSelectedId(null); setDetail(null); setDetailError(null)
    const params: ClinicalSearchParams = {
      condition: condition.trim() || null,
      intervention: intervention.trim() || null,
      status: status || null,
      phase: phase || null,
      limit: 25,
    }
    try {
      const res = await searchClinicalTrials(params)
      setTrials(res.studies)
      setTotalCount(res.total_count)
      if (res.studies.length > 0 && res.studies[0].nct_id) {
        setSelectedId(res.studies[0].nct_id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [condition, intervention, status, phase])

  useEffect(() => { runSearch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    let cancelled = false
    setDetailLoading(true); setDetailError(null); setDetail(null)
    getClinicalTrial(selectedId)
      .then(d => { if (!cancelled) setDetail(d) })
      .catch(e => { if (!cancelled) setDetailError(e instanceof Error ? e.message : 'Fetch failed') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090b]">

      {/* ── Search bar ── */}
      <section className="px-6 py-4 border-b border-[#27272a] shrink-0 bg-[#0b0e15]/40">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px_180px_auto] gap-3">
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">CONDITION</label>
            <input
              type="text"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="lung cancer, TP53, ..."
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">INTERVENTION</label>
            <input
              type="text"
              value={intervention}
              onChange={e => setIntervention(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="pembrolizumab, ..."
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">STATUS</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] focus:outline-none focus:border-[#f59e0b]"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s || 'ANY'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">PHASE</label>
            <select
              value={phase}
              onChange={e => setPhase(e.target.value)}
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] focus:outline-none focus:border-[#f59e0b]"
            >
              {PHASE_OPTIONS.map(p => (
                <option key={p} value={p}>{p ? phaseLabel(p) : 'ANY'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              disabled={loading}
              onClick={runSearch}
              className="px-4 py-2 font-label-caps text-[10px] tracking-widest transition-all bg-[#f59e0b] text-[#1a1300] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">{loading ? 'hourglass_empty' : 'search'}</span>
              {loading ? 'FETCHING...' : 'SEARCH'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 font-label-caps text-[10px] text-[#ef4444] tracking-wider">⚠ {error}</div>
        )}
      </section>

      {/* ── Main: trial list + detail ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] overflow-hidden">

        {/* ── Trial list ── */}
        <aside className="border-r border-[#27272a] overflow-y-auto custom-scrollbar bg-[#0b0e15]/40">
          <div className="sticky top-0 z-10 px-4 py-2 border-b border-[#27272a] bg-[#0b0e15] flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-[#f59e0b] tracking-widest">
              TRIALS {totalCount != null ? `(${trials.length}/${totalCount.toLocaleString()})` : ''}
            </span>
            <span className="font-label-caps text-[9px] text-[#8c909f]">SOURCE: CT.GOV V2</span>
          </div>

          {loading && (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="bg-[#18181b] border border-[#27272a] p-3 animate-pulse">
                  <div className="h-3 w-24 bg-[#27272a] mb-2" />
                  <div className="h-3 w-full bg-[#27272a]" />
                </div>
              ))}
            </div>
          )}

          {!loading && trials.length === 0 && !error && (
            <div className="p-8 text-center font-label-caps text-[10px] text-[#424754] tracking-widest">NO RESULTS</div>
          )}

          {!loading && trials.map(t => {
            const active = t.nct_id === selectedId
            return (
              <button
                key={t.nct_id ?? Math.random()}
                onClick={() => t.nct_id && setSelectedId(t.nct_id)}
                className={[
                  'w-full text-left px-4 py-3 border-b border-[#27272a] transition-all block',
                  active ? 'bg-[#1d2027] border-l-2 border-l-[#f59e0b]' : 'hover:bg-[#18181b] border-l-2 border-l-transparent',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-data-md text-[10px] text-[#f59e0b] tabular-nums">{t.nct_id}</span>
                  <span className={`font-label-caps text-[8px] px-1.5 py-0.5 border tracking-widest ${statusClass(t.overall_status)}`}>
                    {t.overall_status ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="font-data-md text-[12px] text-[#e1e2ec] leading-snug line-clamp-2 mb-1.5">
                  {t.brief_title ?? '(no title)'}
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {t.phases.map(p => (
                    <span key={p} className="font-label-caps text-[8px] px-1 py-0.5 border border-[#f59e0b]/30 text-[#f59e0b]">
                      {phaseLabel(p)}
                    </span>
                  ))}
                  {t.study_type && (
                    <span className="font-label-caps text-[8px] px-1 py-0.5 border border-[#424754] text-[#8c909f]">
                      {t.study_type.slice(0, 6)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between font-label-caps text-[9px] text-[#8c909f]">
                  <span className="truncate max-w-[220px]">{t.lead_sponsor ?? '—'}</span>
                  <span className="shrink-0">
                    {t.enrollment_count != null ? `n=${t.enrollment_count}` : ''} · {t.site_count} site{t.site_count === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            )
          })}
        </aside>

        {/* ── Detail panel ── */}
        <main className="overflow-y-auto custom-scrollbar bg-[#09090b]">
          {!selectedId && !detailLoading && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[#f59e0b]/30" style={{ fontSize: 64 }}>clinical_notes</span>
              <div className="font-label-caps text-[11px] text-[#8c909f] tracking-widest">SELECT A TRIAL</div>
            </div>
          )}

          {detailLoading && (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
              <div className="font-label-caps text-[10px] text-[#f59e0b] tracking-widest animate-pulse">FETCHING TRIAL</div>
            </div>
          )}

          {detailError && (
            <div className="p-6 font-label-caps text-[10px] text-[#ef4444]">⚠ {detailError}</div>
          )}

          {detail && !detailLoading && <TrialDetail trial={detail} />}
        </main>
      </div>
    </div>
  )
}


function Section({ label, accent = '#f59e0b', children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#27272a] p-6">
      <div className="font-label-caps text-[10px] tracking-widest mb-3" style={{ color: accent }}>{label}</div>
      {children}
    </section>
  )
}


function TrialDetail({ trial }: { trial: ClinicalTrialDetail }) {
  const ctLink = trial.nct_id ? `https://clinicaltrials.gov/study/${trial.nct_id}` : null
  return (
    <article>

      {/* Header */}
      <header className="p-6 border-b border-[#27272a] bg-[#0b0e15]/60">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {ctLink ? (
            <a href={ctLink} target="_blank" rel="noopener noreferrer"
              className="font-data-md text-[11px] text-[#f59e0b] hover:underline tabular-nums">
              {trial.nct_id} ↗
            </a>
          ) : (
            <span className="font-data-md text-[11px] text-[#f59e0b] tabular-nums">{trial.nct_id}</span>
          )}
          <span className={`font-label-caps text-[9px] px-1.5 py-0.5 border tracking-widest ${statusClass(trial.overall_status)}`}>
            {trial.overall_status ?? 'UNKNOWN'}
          </span>
          {trial.phases.map(p => (
            <span key={p} className="font-label-caps text-[9px] px-1.5 py-0.5 border border-[#f59e0b]/40 text-[#f59e0b] tracking-widest">
              {phaseLabel(p)}
            </span>
          ))}
          {trial.study_type && (
            <span className="font-label-caps text-[9px] px-1.5 py-0.5 border border-[#424754] text-[#8c909f] tracking-widest">
              {trial.study_type}
            </span>
          )}
        </div>
        <h2 className="font-headline-md text-[18px] font-semibold text-[#e1e2ec] leading-snug">{trial.brief_title ?? '(no title)'}</h2>
        {trial.official_title && trial.official_title !== trial.brief_title && (
          <p className="font-data-md text-[11px] text-[#8c909f] mt-2 leading-relaxed">{trial.official_title}</p>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <Stat label="Enrollment" value={trial.enrollment_count != null ? String(trial.enrollment_count) : '—'} />
          <Stat label="Sites"      value={String(trial.sites.length)} />
          <Stat label="Start"      value={formatDate(trial.start_date)} />
          <Stat label="Primary End" value={formatDate(trial.primary_completion_date)} />
        </div>
      </header>

      {/* Summary */}
      {trial.brief_summary && (
        <Section label="SUMMARY">
          <p className="font-data-md text-[12px] text-[#c2c6d6] leading-relaxed whitespace-pre-wrap">{trial.brief_summary}</p>
        </Section>
      )}

      {/* Conditions */}
      {trial.conditions.length > 0 && (
        <Section label="CONDITIONS" accent="#adc6ff">
          <div className="flex flex-wrap gap-1.5">
            {trial.conditions.map(c => (
              <span key={c} className="font-data-md text-[11px] px-2 py-0.5 bg-[#18181b] border border-[#adc6ff]/30 text-[#adc6ff]">{c}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Interventions */}
      {trial.interventions.length > 0 && (
        <Section label="INTERVENTIONS" accent="#4edea3">
          <div className="flex flex-col gap-2">
            {trial.interventions.map((i, idx) => (
              <div key={idx} className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#4edea3] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-caps text-[9px] text-[#4edea3] tracking-widest">{i.type ?? 'INTERVENTION'}</span>
                  <span className="font-data-md text-[12px] text-[#e1e2ec]">{i.name ?? '—'}</span>
                </div>
                {i.description && (
                  <p className="font-data-md text-[11px] text-[#8c909f] leading-relaxed">{i.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Outcomes */}
      {(trial.primary_outcomes.length > 0 || trial.secondary_outcomes.length > 0) && (
        <Section label="OUTCOMES" accent="#c0c1ff">
          {trial.primary_outcomes.length > 0 && (
            <div className="mb-4">
              <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-2">PRIMARY</div>
              <ul className="space-y-2">
                {trial.primary_outcomes.map((o, i) => (
                  <li key={i} className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#c0c1ff] p-3">
                    <div className="font-data-md text-[12px] text-[#e1e2ec] leading-snug">{o.measure ?? '—'}</div>
                    {o.time_frame && (
                      <div className="font-label-caps text-[9px] text-[#8c909f] mt-1">{o.time_frame}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trial.secondary_outcomes.length > 0 && (
            <div>
              <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-2">SECONDARY</div>
              <ul className="space-y-2">
                {trial.secondary_outcomes.map((o, i) => (
                  <li key={i} className="bg-[#18181b] border border-[#27272a] p-3">
                    <div className="font-data-md text-[12px] text-[#c2c6d6] leading-snug">{o.measure ?? '—'}</div>
                    {o.time_frame && (
                      <div className="font-label-caps text-[9px] text-[#8c909f] mt-1">{o.time_frame}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Eligibility */}
      {(trial.eligibility_criteria || trial.minimum_age || trial.sex) && (
        <Section label="ELIGIBILITY">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Age" value={
              trial.minimum_age || trial.maximum_age
                ? `${trial.minimum_age ?? '—'} → ${trial.maximum_age ?? '—'}`
                : (trial.std_ages.join(', ') || '—')
            } />
            <Stat label="Sex" value={trial.sex ?? '—'} />
            <Stat label="Healthy Vols" value={trial.healthy_volunteers === true ? 'YES' : trial.healthy_volunteers === false ? 'NO' : '—'} />
          </div>
          {trial.eligibility_criteria && (
            <pre className="font-data-md text-[11px] text-[#c2c6d6] leading-relaxed whitespace-pre-wrap bg-black/30 border border-[#27272a] p-4 max-h-[400px] overflow-y-auto custom-scrollbar">{trial.eligibility_criteria}</pre>
          )}
        </Section>
      )}

      {/* Sites */}
      {trial.sites.length > 0 && (
        <Section label={`SITES (${trial.sites.length})`} accent="#adc6ff">
          <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {trial.sites.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-[#18181b] border border-[#27272a] p-2.5">
                <div className="min-w-0">
                  <div className="font-data-md text-[12px] text-[#e1e2ec] truncate">{s.facility ?? '—'}</div>
                  <div className="font-data-md text-[10px] text-[#8c909f] truncate">
                    {[s.city, s.state, s.country].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                {s.status && (
                  <span className={`font-label-caps text-[8px] px-1.5 py-0.5 border tracking-widest shrink-0 ${statusClass(s.status)}`}>
                    {s.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Footer / sponsor */}
      <footer className="p-6">
        <div className="font-data-md text-[10px] text-[#8c909f] leading-relaxed">
          Lead sponsor: <span className="text-[#e1e2ec]">{trial.lead_sponsor ?? '—'}</span>
          {trial.completion_date && (
            <> · Study completion: <span className="text-[#e1e2ec]">{trial.completion_date}</span></>
          )}
        </div>
      </footer>
    </article>
  )
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#f59e0b] p-2.5">
      <div className="font-label-caps text-[9px] text-[#8c909f] uppercase tracking-widest mb-1">{label}</div>
      <div className="font-data-md text-[12px] text-[#e1e2ec] tabular-nums truncate">{value}</div>
    </div>
  )
}
