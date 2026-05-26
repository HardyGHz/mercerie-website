import { useEffect, useRef } from 'react'
import type { Page } from '@/types'

interface Props {
  onNavigate: (page: Page) => void
}

const LOGS_STATIC = [
  { time: '02:42:21', text: 'TP53: LOH analysis complete.' },
  { time: '02:42:25', text: 'Checking somatic variant database...' },
  { time: '02:42:28', text: 'Recalculating allele frequencies for AMR sub-pop...' },
  { time: '02:42:32', text: 'Syncing with ClinVar v2024-Q3...' },
  { time: '02:42:35', text: 'Scanning for compensatory mutations...' },
  { time: '02:42:39', text: 'Visualizing protein-DNA binding interface...' },
  { time: '02:42:42', text: 'TP53: LOH analysis complete.' },
  { time: '02:42:46', text: 'Syncing with ClinVar v2024-Q3...' },
]

const LIVE_LOGS = [
  'Syncing with ClinVar v2024-Q3...',
  'Checking somatic variant database...',
  'Recalculating allele frequencies for AMR sub-pop...',
  'TP53: LOH analysis complete.',
  'Visualizing protein-DNA binding interface...',
  'Scanning for compensatory mutations...',
]

const NAV: { icon: string; label: string; page: Page }[] = [
  { icon: 'genetics',       label: 'Genomics',   page: 'genomics-explorer' },
  { icon: 'menu_book',      label: 'Literature', page: 'literature' },
  { icon: 'clinical_notes', label: 'Clinical',   page: 'clinical' },
  { icon: 'settings',       label: 'System',     page: 'system' },
]

export default function GenomicsExplorer({ onNavigate }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = terminalRef.current
    if (!el) return
    const interval = setInterval(() => {
      const now = new Date()
      const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
      const p = document.createElement('p')
      p.innerHTML = `<span class="text-outline">${time}</span> ${LIVE_LOGS[Math.floor(Math.random() * LIVE_LOGS.length)]}`
      el.appendChild(p)
      el.scrollTop = el.scrollHeight
      if (el.children.length > 25) el.removeChild(el.firstChild!)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-surface text-on-surface overflow-hidden" style={{ height: '100vh' }}>

      {/* Header */}
      <header className="fixed top-0 left-20 right-0 z-50 bg-surface flex justify-between items-center px-margin-desktop h-16 border-b border-outline-variant">
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('genomic')}
            className="font-display text-headline-md text-primary tracking-tighter bg-transparent border-none cursor-pointer hover:text-secondary transition-colors"
          >
            NOVU BRAIN
          </button>
          <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 border border-outline-variant">
            <span className="material-symbols-outlined text-outline mr-2" style={{ fontSize: 18 }}>search</span>
            <input
              className="bg-transparent border-none focus:ring-0 font-data-md text-data-md w-64 p-0 uppercase placeholder:text-outline-variant outline-none"
              placeholder="QUERY_GENOME_DATABASE..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {['memory', 'sensors', 'dns'].map(icon => (
            <button key={icon} className="hover:bg-surface-variant/50 p-2 transition-colors duration-150 bg-transparent border-none cursor-pointer">
              <span className="material-symbols-outlined text-primary">{icon}</span>
            </button>
          ))}
          <div className="w-8 h-8 border border-primary overflow-hidden">
            <img
              alt="Researcher"
              className="w-full h-full object-cover grayscale contrast-125"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpqFWxluo5vezs-cYOAHgfPb9BPK243N0zK0Ehm9dxoKm83Da3fYSSgBBaruv2kTDvNIhqMk4aRDnn1NhnKdraEENygpuiMDnFHEQsLmmOnwssJg6OuWOny2VlLRpFsLclDcciNZ4mxX1NZAPRvSJ-BYax10C6kJzZnTXc-AvW4A321wRbnKG0-_aTtH_fsHZ8M9kNYcafNcUy_L-5Kbgg6QbVFGPhBjBlfCRc52mhsSJUIXVq4Gp7fq7HgkqEOKyAKGokbikI2No"
            />
          </div>
        </div>
      </header>

      {/* Narrow Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 bg-surface-container-low border-r border-outline-variant z-[60]">
        <div className="mb-12 flex flex-col items-center gap-1">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>biotech</span>
          <span className="font-data-md text-[10px] text-secondary tracking-widest">NOVU-01</span>
        </div>
        <div className="flex flex-col w-full gap-4">
          {NAV.map(n => {
            const active = n.page === 'genomics-explorer'
            return (
              <button
                key={n.icon}
                onClick={() => onNavigate(n.page)}
                className={`flex flex-col items-center py-4 transition-all duration-200 cursor-pointer border-l-2 w-full bg-transparent border-t-0 border-b-0 border-r-0 ${
                  active
                    ? 'text-secondary border-secondary bg-secondary-container/10'
                    : 'text-on-surface-variant hover:text-secondary hover:bg-surface-variant/30 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined mb-1">{n.icon}</span>
                <span className="font-label-caps text-[9px] uppercase">{n.label}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-auto flex flex-col w-full gap-4">
          <a className="flex flex-col items-center py-4 text-on-surface-variant hover:text-primary transition-all cursor-pointer">
            <span className="material-symbols-outlined mb-1">terminal</span>
            <span className="font-label-caps text-[9px] uppercase">Logs</span>
          </a>
          <div className="px-4">
            <button className="w-full aspect-square border border-secondary text-secondary flex items-center justify-center hover:bg-secondary hover:text-surface transition-colors bg-transparent cursor-pointer">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-20 mt-16 p-bento-gap overflow-hidden grid grid-cols-12 gap-bento-gap" style={{ height: 'calc(100vh - 64px - 32px)' }}>

        {/* Left: Primary Content (9 cols) */}
        <div className="col-span-12 lg:col-span-9 min-h-0 flex flex-col gap-bento-gap overflow-y-auto custom-scrollbar pr-2">

          {/* 1. Variant Detail Header */}
          <section className="bento-module p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
              <span className="font-label-caps text-[64px] text-secondary">TP53</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-label-caps text-secondary text-label-caps bg-secondary/10 px-2 py-0.5 border border-secondary/20">ACTIVE_TARGET</span>
                <span className="font-data-md text-outline">SEC-04 // GENOMICS</span>
              </div>
              <div className="flex items-end gap-6">
                <h1 className="font-display leading-none font-bold text-on-surface tracking-tighter" style={{ fontSize: 56 }}>TP53</h1>
                <div className="flex flex-col mb-1">
                  <span className="font-data-md text-secondary">P53 PROTEIN</span>
                  <span className="font-data-md text-outline">CLASSIFICATION: TUMOR SUPPRESSOR</span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-8 border-t border-outline-variant pt-4">
                {[
                  { label: 'LOCUS',  value: '17p13.1'   },
                  { label: 'LENGTH', value: '25,760 bp'  },
                  { label: 'EXONS',  value: '11 TOTAL'   },
                ].map(s => (
                  <div key={s.label}>
                    <p className="font-label-caps text-outline text-[10px] mb-1">{s.label}</p>
                    <p className="font-data-md text-on-surface">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Sequence Map */}
          <section className="bento-module p-4">
            <div className="flex justify-between items-center mb-6">
              <span className="font-label-caps text-on-surface-variant flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-secondary inline-block" /> STRUCTURE_MAP_V2.1
              </span>
              <span className="font-data-md text-outline">COORD: 7,661,779 - 7,687,538</span>
            </div>
            <div className="relative h-16 bg-surface-container flex items-center px-4 overflow-hidden border border-outline-variant/30">
              {/* Backbone lines */}
              <div className="absolute inset-0 opacity-10 flex items-center justify-around pointer-events-none">
                {[0,1,2,3].map(i => <div key={i} className="h-full w-px bg-outline" />)}
              </div>
              <div className="flex-1 h-3 bg-zinc-800 relative flex items-center">
                {/* Exons */}
                {[
                  { left: '5%',  w: '4%'  },
                  { left: '15%', w: '8%'  },
                  { left: '28%', w: '12%' },
                  { left: '45%', w: '6%'  },
                  { left: '55%', w: '15%' },
                  { left: '75%', w: '10%' },
                ].map((e, i) => (
                  <div key={i} className="absolute h-full bg-secondary border border-secondary" style={{ left: e.left, width: e.w }} />
                ))}
                {/* Hotspots */}
                {[
                  { left: '32%', label: 'R175H', color: '#ef4444', cls: 'bg-red-500 text-red-400 bg-red-500/50' },
                  { left: '58%', label: 'R248Q', color: '#ef4444', cls: 'bg-red-500 text-red-400 bg-red-500/50' },
                  { left: '62%', label: 'R273H', color: '#f97316', cls: 'bg-orange-500 text-orange-400 bg-orange-500/50' },
                ].map(h => (
                  <div key={h.label} className="absolute -top-4 bottom-4 flex flex-col items-center" style={{ left: h.left }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: h.color, boxShadow: `0 0 10px ${h.color}` }} />
                    <div className="h-full w-px" style={{ background: `${h.color}80` }} />
                    <span className="font-label-caps text-[9px] mt-1" style={{ color: h.color }}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-between font-data-md text-[10px] text-outline px-4">
              <span>5' UTR</span>
              <span>3' UTR</span>
            </div>
          </section>

          {/* 3. Variant Ledger */}
          <section className="bento-module flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <span className="font-label-caps text-on-surface-variant">VARIANT_LEDGER</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-surface-container-lowest border border-outline-variant px-2 py-0.5">
                  <span className="material-symbols-outlined text-outline mr-1" style={{ fontSize: 14 }}>search</span>
                  <input type="text" placeholder="SEARCH_VARIANTS..." className="bg-transparent border-none focus:ring-0 font-data-md text-[10px] text-on-surface p-0 w-32 uppercase outline-none" />
                </div>
                <button className="text-secondary font-label-caps text-[11px] hover:underline bg-transparent border-none cursor-pointer">EXPORT_CSV</button>
              </div>
            </div>
            <div className="px-4 py-2 flex gap-2 border-b border-outline-variant bg-surface/30">
              {['ALL', 'PATHOGENIC', 'VUS', 'BENIGN'].map((f, i) => (
                <button key={f} className={`px-2 py-0.5 text-[9px] font-label-caps border transition-all cursor-pointer ${i === 0 ? 'border-secondary bg-secondary/20 text-secondary' : 'border-outline-variant text-outline hover:border-secondary hover:text-secondary'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-data-md text-data-md">
                <thead>
                  <tr className="bg-surface-container-highest/30 border-b border-outline-variant">
                    {['VARIANT', 'CONSEQUENCE', 'CLINVAR', 'GNOMAD FREQ', 'RSID'].map(h => (
                      <th key={h} className="p-4 font-label-caps text-outline font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {[
                    { v: 'R175H', c: 'Missense', s: 'PATHOGENIC', cls: 'text-secondary bg-secondary/10 border-secondary/20', f: '0.00032', r: 'rs28934571' },
                    { v: 'R248Q', c: 'Missense', s: 'PATHOGENIC', cls: 'text-secondary bg-secondary/10 border-secondary/20', f: '0.00004', r: 'rs28934572' },
                    { v: 'Y220C', c: 'Missense', s: 'PATHOGENIC', cls: 'text-secondary bg-secondary/10 border-secondary/20', f: '0.00001', r: 'rs121912666' },
                    { v: 'G245S', c: 'Missense', s: 'LIKELY_PATH', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20', f: '0.00000', r: 'rs28934575' },
                  ].map(row => (
                    <tr key={row.v} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="p-4 text-on-surface font-bold">{row.v}</td>
                      <td className="p-4 text-on-surface-variant">{row.c}</td>
                      <td className="p-4"><span className={`border px-2 py-0.5 text-[10px] font-bold ${row.cls}`}>{row.s}</span></td>
                      <td className="p-4 text-on-surface-variant">{row.f}</td>
                      <td className="p-4 text-primary underline">{row.r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Population Chart */}
          <section className="bento-module p-4 h-64">
            <span className="font-label-caps text-on-surface-variant mb-6 block">POPULATION_DISTRIBUTION // GNOMAD_V3</span>
            <div className="flex items-end justify-between h-40 gap-4 px-4">
              {[
                { label: 'AFR', pct: '100%' },
                { label: 'AMR', pct: '45%'  },
                { label: 'EAS', pct: '12%'  },
                { label: 'FIN', pct: '60%'  },
                { label: 'NFE', pct: '75%'  },
                { label: 'SAS', pct: '30%'  },
              ].map(bar => (
                <div key={bar.label} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-secondary/20 border border-secondary/30 relative" style={{ height: '85%' }}>
                    <div className="absolute bottom-0 w-full bg-secondary" style={{ height: bar.pct }} />
                  </div>
                  <span className="font-label-caps text-[9px] mt-2 text-outline">{bar.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Agent Log (3 cols) */}
        <aside className="hidden lg:flex col-span-3 min-h-0 flex-col gap-bento-gap overflow-hidden">
          <div className="bento-module flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between shrink-0">
              <span className="font-label-caps text-secondary flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                AGENT_LOG
              </span>
              <span className="font-data-md text-[10px] text-outline">V2.4.0</span>
            </div>
            <div
              ref={terminalRef}
              className="flex-1 p-4 font-data-md text-[12px] text-secondary/80 overflow-y-auto custom-scrollbar space-y-2 leading-relaxed"
            >
              <p className="text-white">Scanning population specific frequencies...</p>
              <p className="text-secondary/40">_</p>
              {LOGS_STATIC.map((l, i) => (
                <p key={i}><span className="text-outline">[{l.time}]</span> {l.text}</p>
              ))}
            </div>
            <div className="p-3 border-t border-outline-variant bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2 border border-outline-variant px-2 py-1">
                <span className="text-secondary font-data-md">$</span>
                <input className="bg-transparent border-none focus:ring-0 font-data-md text-data-md text-on-surface w-full p-0 outline-none" placeholder="COMMAND..." type="text" />
              </div>
            </div>
          </div>

          {/* Mini protein preview */}
          <div className="bento-module h-48 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
            <img
              alt="Protein Structure"
              className="w-full h-full object-cover grayscale brightness-50 group-hover:scale-110 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGHv-x8wP85lj-isKijX2u0kTU0MciY9_g8p9BOaR6bRy8Bs5uTIM0HUslpyVXj_LnWqRTWnHh-_NDQ9aJ2QmyDBBK9-ZlzqyEV_80N25LCxoP9z2UK3M5LDqoyuKPyKKiEZDjMd-gDAQF_SGda_kbg7PNcUa8jEN3W2LGuUvQ-mA4HEiDrLZwYyNdIkrKbaTSrrGRx1v8dV7SP2bGcAdCLDNwdEDJM4hVcsLN4ydkjdsPpylhBBAcgS-DO1RU1PGicBUOFuRxrs8"
            />
            <div className="absolute top-2 left-2 font-label-caps text-[9px] text-secondary bg-surface/80 px-2 py-0.5">STRUCTURE_RENDER: P53_DOMAIN</div>
            <div className="absolute bottom-2 right-2">
              <span className="material-symbols-outlined text-secondary cursor-pointer hover:scale-110">view_in_ar</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-20 right-0 h-8 flex justify-between items-center px-margin-desktop bg-surface-container-lowest border-t border-outline-variant z-50 font-data-md text-data-md text-outline">
        <div className="flex items-center gap-6">
          <span className="font-label-caps text-[10px] uppercase">NOVU_OS_V2.4 // UPTIME: 144:12:05</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            SEC_AUTH: ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-primary cursor-default">COORD: 46.7667 N, 23.5833 E</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications</span>
        </div>
      </footer>
    </div>
  )
}
