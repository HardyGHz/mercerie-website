import { useState, useRef, useEffect } from 'react'

const INITIAL_LOGS = [
  { text: '[08:14:02] TRIAL NCT04685135 LOADED', cls: 'text-amber-400' },
  { text: '>> Connecting to ClinicalTrials.gov API...', cls: 'text-outline' },
  { text: '[08:14:03] ENROLLMENT DATA SYNCED (67/120)', cls: 'text-amber-400' },
  { text: '>> Parsing adverse event reports...', cls: 'text-outline' },
  { text: '[08:14:05] 3 GRADE 3+ EVENTS FLAGGED', cls: 'text-error' },
  { text: '>> Cross-referencing CTCAE v5.0...', cls: 'text-outline' },
  { text: '[08:14:08] SITE BOSTON: 34 pts ACTIVE', cls: 'text-amber-400' },
  { text: '[08:14:09] SITE NEW YORK: 28 pts ACTIVE', cls: 'text-amber-400' },
  { text: '>> Recalculating OS endpoint...', cls: 'text-outline' },
  { text: '[08:14:12] OS 24MO: 68.2% (CI: 59.1–76.8)', cls: 'text-on-surface' },
]

const EXTRA_LOGS = [
  '[08:15:00] INTERIM ANALYSIS SCHEDULED: 2026-07-15',
  '>> Querying DSMB safety report...',
  '[08:15:04] ORR UPDATE: 42% (n=50)',
  '>> Updating Kaplan-Meier curves...',
  '[08:15:08] NEW ADVERSE EVENT REPORTED: Site Chicago',
  '>> Notifying principal investigator...',
]

const ENROLLMENT_BARS = [
  { label: 'Screened',   val: 312, max: 312 },
  { label: 'Eligible',   val: 189, max: 312 },
  { label: 'Consented',  val: 134, max: 312 },
  { label: 'Enrolled',   val: 120, max: 312 },
  { label: 'Active',     val: 98,  max: 312 },
  { label: 'Completed',  val: 43,  max: 312 },
]

const AE_ROWS = [
  { event: 'Neutropenia',      grade: 'G3', freq: '28%', color: 'text-error' },
  { event: 'Fatigue',          grade: 'G2', freq: '41%', color: 'text-amber-400' },
  { event: 'Nausea',           grade: 'G2', freq: '35%', color: 'text-amber-400' },
  { event: 'Thrombocytopenia', grade: 'G4', freq: '8%',  color: 'text-error' },
]

const SITES = [
  { name: 'Boston, MA',    status: 'ACTIVE',    pts: 34,  cls: 'text-secondary border-secondary/20 bg-secondary/10' },
  { name: 'New York, NY',  status: 'ACTIVE',    pts: 28,  cls: 'text-secondary border-secondary/20 bg-secondary/10' },
  { name: 'Houston, TX',   status: 'ENROLLING', pts: 12,  cls: 'text-amber-400 border-amber-400/20 bg-amber-400/10' },
  { name: 'Chicago, IL',   status: 'PENDING',   pts: 0,   cls: 'text-outline border-outline-variant bg-surface-container' },
]

export default function ClinicalTrials() {
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [termCmd, setTermCmd] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let i = 0
    function add() {
      if (i < EXTRA_LOGS.length) {
        const idx = i
        setLogs(prev => [...prev, { text: EXTRA_LOGS[idx], cls: idx % 2 === 0 ? 'text-amber-400' : 'text-outline' }])
        i++
        setTimeout(add, Math.random() * 3000 + 2000)
      }
    }
    const t = setTimeout(add, 2500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div className="p-margin-desktop bg-surface overflow-hidden relative" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="bento-grid">

        {/* ── SEC-05 // CLINICAL_PHASE ── */}
        <div className="col-span-8 row-span-5 bg-[#18181b] border border-[#27272a] p-4 flex flex-col overflow-hidden">
          <div className="flex justify-between items-start mb-4 shrink-0">
            <div>
              <span className="font-label-caps text-label-caps text-amber-400">SEC-05 // CLINICAL_PHASE</span>
              <h2 className="font-headline-md text-headline-md text-on-surface mt-1">NCT04685135 — APR-246 + AZACITIDINE</h2>
            </div>
            <div className="flex gap-2">
              <span className="font-data-md text-data-md text-amber-400 border border-amber-400/30 px-2 py-1">PHASE II</span>
              <span className="font-data-md text-data-md text-secondary border border-secondary/30 px-2 py-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse inline-block" />
                RECRUITING
              </span>
            </div>
          </div>

          {/* Enrollment progress */}
          <div className="mb-4 shrink-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-data-md text-[10px] text-outline">ENROLLMENT PROGRESS</span>
              <span className="font-data-md text-[10px] text-on-surface">67 / 120 patients</span>
            </div>
            <div className="h-1.5 bg-surface-container-high rounded-none overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: '55.8%' }} />
            </div>
          </div>

          {/* Endpoint stats */}
          <div className="grid grid-cols-3 gap-3 flex-1">
            {[
              { label: 'PRIMARY ENDPOINT', sub: 'OS at 24 months', value: '68.2%', detail: 'CI: 59.1–76.8', color: 'text-secondary border-secondary/20' },
              { label: 'SECONDARY ENDPOINT', sub: 'Objective Response Rate', value: '42%', detail: 'n=50 evaluable', color: 'text-primary border-primary/20' },
              { label: 'SAFETY SIGNAL', sub: 'Grade 3+ Adverse Events', value: '12%', detail: 'per protocol', color: 'text-error border-error/20' },
            ].map(s => (
              <div key={s.label} className={`bg-surface-container border ${s.color} p-3 flex flex-col justify-between`}>
                <div>
                  <div className="font-label-caps text-[9px] text-outline uppercase mb-0.5">{s.label}</div>
                  <div className="font-data-md text-[10px] text-on-surface-variant">{s.sub}</div>
                </div>
                <div>
                  <div className={`font-data-lg text-data-lg font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
                  <div className="font-data-md text-[10px] text-outline">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-07 // TRIAL_LOG ── */}
        <div className="col-span-4 row-span-12 bg-[#18181b] border border-[#27272a] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-surface-container-high/50 shrink-0">
            <span className="font-label-caps text-label-caps text-amber-400">SEC-07 // TRIAL_LOG</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div ref={logRef} className="flex-1 font-data-md text-data-md p-4 overflow-y-auto custom-scrollbar bg-black/20">
            {logs.map((l, i) => (
              <div key={i} className={`${l.cls} ${l.text.startsWith('[') ? 'mb-2' : 'mb-1'}`}>{l.text}</div>
            ))}
            <div className="text-on-surface flex items-center gap-1">
              {'>> awaiting command'}
              <span className="terminal-cursor" />
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-[#27272a] shrink-0">
            <div className="flex gap-2">
              <span className="text-amber-400 font-data-md text-data-md">trial@novu:~$</span>
              <input
                type="text"
                placeholder="..."
                value={termCmd}
                onChange={e => setTermCmd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setTermCmd('') }}
                className="bg-transparent border-none outline-none font-data-md text-data-md text-on-surface w-full p-0 focus:ring-0 placeholder:text-outline-variant/50"
              />
            </div>
          </div>
        </div>

        {/* ── SEC-08 // ENROLLMENT ── */}
        <div className="col-span-4 row-span-7 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-amber-400">SEC-08 // ENROLLMENT</span>
            <span className="material-symbols-outlined text-outline text-lg">biotech</span>
          </div>
          <div className="flex-1 flex flex-col justify-end gap-2">
            {ENROLLMENT_BARS.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="font-data-md text-[10px] text-outline w-20 shrink-0">{b.label}</span>
                <div className="flex-1 h-5 bg-surface-container-high relative">
                  <div
                    className="h-full bg-amber-400/80 border border-amber-400/40"
                    style={{ width: `${(b.val / b.max) * 100}%` }}
                  />
                </div>
                <span className="font-data-md text-[11px] text-on-surface w-8 text-right">{b.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-09 // ADVERSE_EVENTS ── */}
        <div className="col-span-4 row-span-5 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-error">SEC-09 // ADVERSE_EVENTS</span>
            <span className="material-symbols-outlined text-outline text-lg">warning</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left font-data-md text-[12px]">
              <thead>
                <tr className="text-outline border-b border-outline-variant">
                  <th className="pb-2 font-medium">EVENT</th>
                  <th className="pb-2 font-medium">GRADE</th>
                  <th className="pb-2 font-medium">FREQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {AE_ROWS.map(r => (
                  <tr key={r.event}>
                    <td className="py-2 text-on-surface">{r.event}</td>
                    <td className={`py-2 font-bold ${r.color}`}>{r.grade}</td>
                    <td className="py-2 text-on-surface-variant">{r.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEC-10 // SITES ── */}
        <div className="col-span-4 row-span-5 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-primary">SEC-10 // SITES</span>
            <span className="material-symbols-outlined text-outline text-lg">location_on</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {SITES.map(s => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                <div>
                  <div className="font-data-md text-[12px] text-on-surface">{s.name}</div>
                  <span className={`font-label-caps text-[9px] px-1 border ${s.cls}`}>{s.status}</span>
                </div>
                <div className="font-data-lg text-data-lg text-on-surface">{s.pts} <span className="text-[10px] text-outline">pts</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-64 right-0 h-16 bg-surface-container-high border-t border-outline-variant px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-6">
          <span className="font-label-caps text-label-caps text-amber-400">SEC-05 // CLINICAL_PHASE</span>
          {[
            { label: 'PHASE I',   w: 'w-full', active: true },
            { label: 'PHASE II',  w: 'w-[55%]', active: true },
            { label: 'PHASE III', w: 'w-0',    active: false },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2">
              <div className={`h-1 w-12 rounded-full overflow-hidden ${p.active ? 'bg-amber-400/40' : 'bg-outline-variant'}`}>
                <div className={`h-full bg-amber-400 ${p.w}`} />
              </div>
              <span className={`text-[10px] font-data-md ${p.active ? 'text-on-surface' : 'text-outline-variant'}`}>{p.label}</span>
            </div>
          ))}
        </div>
        <button className="bg-amber-400 text-black px-4 py-1 font-label-caps text-label-caps hover:brightness-110 transition-all border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
          SUBMIT_REPORT
        </button>
      </div>
    </div>
  )
}
