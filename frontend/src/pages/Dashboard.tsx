import { useState, useEffect, useRef, useCallback } from 'react'
import type { Article, Page, ResearchContext } from '@/types'
import { logBrowse } from '@/lib/supabase'

interface Props {
  articles: Article[]
  researchContext: ResearchContext
  loading: boolean
  query: string
  onSearch: (q: string) => void
  onNavigate: (page: Page) => void
}

interface LogEntry { text: string; cls: string }

const INITIAL_LOGS: LogEntry[] = [
  { text: '[09:21:04] INITIALIZING NOVU_CORE_OS...', cls: 'text-secondary' },
  { text: '>> Handshaking with SEC-04 proteomics node...', cls: 'text-outline' },
  { text: '[09:21:05] CONNECTION ESTABLISHED (latency: 12ms)', cls: 'text-secondary' },
  { text: '>> Fetching variant table for TP53 loci...', cls: 'text-outline' },
  { text: '[09:21:08] PARSING 42,019 DATA POINTS...', cls: 'text-tertiary' },
  { text: '>> Found pathogenic mismatch at C.124A>T', cls: 'text-on-surface' },
  { text: '[09:21:12] WARNING: ANOMALOUS BINDING DETECTED', cls: 'text-error' },
  { text: '>> Re-evaluating docking matrix...', cls: 'text-outline' },
  { text: '>> Optimizing molecular dynamics...', cls: 'text-outline' },
  { text: '[09:21:15] SIMULATION STEP 01-A COMPLETE', cls: 'text-secondary' },
]

function getTs() {
  const n = new Date()
  return `[${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}]`
}

export default function Dashboard({ articles, researchContext, loading, query, onSearch, onNavigate }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [terminalCmd, setTerminalCmd] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const prevLoadingRef = useRef(false)

  const addLog = useCallback((text: string, cls: string) => {
    setLogs(prev => [...prev, { text, cls }])
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Search lifecycle → agent log entries
  useEffect(() => {
    if (loading && !prevLoadingRef.current) {
      // Search just started
      const t = getTs()
      addLog(`${t} QUERY RECEIVED: "${query}"`, 'text-secondary')
      
      const t1 = setTimeout(() => addLog(`>> CALLING NOVU_BRAIN...`, 'text-outline'), 350)
      const t2 = setTimeout(() => addLog(`${getTs()} SEARCHING PUBMED...`, 'text-secondary'), 800)
      const t3 = setTimeout(() => addLog(`>> Querying NCBI E-utilities...`, 'text-outline'), 1400)
      
      prevLoadingRef.current = true;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }

    if (!loading && prevLoadingRef.current) {
      // Search just finished
      const t = getTs()
      addLog(`${t} FOUND ${articles.length} RESULTS`, 'text-secondary')
      addLog(`>> RANKING BY RELEVANCE...`, 'text-outline')
      
      if (articles[0]?.title) {
        const title = articles[0].title.slice(0, 50)
        addLog(`${getTs()} TOP: "${title}..."`, 'text-tertiary')
      }
      addLog(`>> awaiting next query`, 'text-outline')
      
      prevLoadingRef.current = false;
    }
  }, [loading, articles, query, addLog])

  function handleTerminalKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const cmd = terminalCmd.trim()
    setTerminalCmd('')
    if (!cmd) return

    if (cmd === 'help') {
      addLog(`>> Available commands:`, 'text-outline')
      addLog(`>>   <query>   — search PubMed via NOVU_BRAIN`, 'text-outline')
      addLog(`>>   clear     — clear terminal`, 'text-outline')
      addLog(`>>   help      — show this help`, 'text-outline')
      return
    }
    if (cmd === 'clear') {
      setLogs(INITIAL_LOGS)
      return
    }

    addLog(`>> ${cmd}`, 'text-on-surface')
    onSearch(cmd)
  }

  return (
    <div className="p-margin-desktop bg-surface overflow-hidden relative" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Bento Grid */}
      <div className="bento-grid">

        {/* ── SEC-04 // PROTEOMICS ── */}
        <div 
          className="col-span-8 row-span-7 bg-[#18181b] border border-[#27272a] p-4 relative overflow-hidden group cursor-pointer hover:border-primary transition-all duration-300"
          onClick={() => onNavigate('protein')}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-label-caps text-label-caps text-tertiary">SEC-04 // PROTEOMICS</span>
              <h2 className="font-headline-md text-headline-md text-on-surface mt-1 uppercase">
                RECOMBINANT {researchContext.proteinName ?? 'P53'}-L2 FOLD
              </h2>
            </div>
            <div className="flex gap-2">
              <span className="font-data-md text-data-md text-outline border border-outline-variant px-2 py-1">PDB: 2OCJ</span>
              <span className="font-data-md text-data-md text-secondary border border-secondary/30 px-2 py-1">RESOLUTION: 1.85Å</span>
            </div>
          </div>

          {/* Viewer */}
          <div className="w-full bg-black/40 border border-outline-variant/30 flex items-center justify-center relative group-hover:border-tertiary/30 transition-all" style={{ height: 320 }}>
            <div className="scanline" />
            <img
              className="w-full h-full object-cover opacity-60 mix-blend-screen absolute inset-0"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2cboae55SBlcg3BsAJecl3QWUfnRbuxmW_t4SlY87lv_xvDbfPZK2HNymv3qQpUst6tyilHSpFDhlIVsc9etJP29wdQLWf6r9iunKQmWlCzV1A7TypPlCqBrgYq6iRKww43WHu7YcXJXFUhieAqtIIp3UYXwSoZAz7VNj5e2y_M2qc8DYEXmQChAVSFZX3a95WoQgYpIwFq4bqNtIQ25B3Br1f0C2PKxaAfHpQ-TWFTRuNEbsOG1jmb_gl__sAr3WHN6AW3ezfqo"
              alt="Protein structure visualization"
            />
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-tertiary" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-tertiary" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-tertiary" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-tertiary" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Chain Length', value: '393 AA',  color: 'text-on-surface' },
              { label: 'Helix Index',  value: '12.4%',   color: 'text-on-surface' },
              { label: 'Sheet Density',value: '31.8%',   color: 'text-on-surface' },
              { label: 'Binding Aff',  value: '0.08 nM', color: 'text-secondary' },
            ].map(s => (
              <div key={s.label} className="border-l border-tertiary pl-3">
                <div className="font-label-caps text-[10px] text-outline uppercase">{s.label}</div>
                <div className={`font-data-lg text-data-lg ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-06 // AGENT_LOG ── */}
        <div className="col-span-4 row-span-12 bg-[#18181b] border border-[#27272a] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-surface-container-high/50 shrink-0">
            <span className="font-label-caps text-label-caps text-secondary">SEC-06 // AGENT_LOG</span>
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-secondary animate-pulse' : 'bg-secondary'}`} />
          </div>
          <div
            ref={logRef}
            className="flex-1 font-data-md text-data-md p-4 overflow-y-auto custom-scrollbar bg-black/20"
          >
            {logs.map((log, i) => (
              <div key={i} className={`${log.cls} ${log.text.startsWith('[') ? 'mb-2' : 'mb-1'}`}>
                {log.text}
              </div>
            ))}
            {!loading && (
              <div className="text-on-surface flex items-center gap-1">
                {'>> awaiting user command'}
                <span className="terminal-cursor" />
              </div>
            )}
            {loading && (
              <div className="text-secondary flex items-center gap-2">
                <span className="animate-pulse">{'>> processing...'}</span>
              </div>
            )}
          </div>
          <div className="p-4 bg-surface-container-low border-t border-[#27272a] shrink-0">
            <div className="flex gap-2">
              <span className="text-secondary font-data-md text-data-md">sys@novu:~$</span>
              <input
                type="text"
                placeholder="type command or search query..."
                value={terminalCmd}
                onChange={e => setTerminalCmd(e.target.value)}
                onKeyDown={handleTerminalKey}
                className="bg-transparent border-none outline-none font-data-md text-data-md text-on-surface w-full p-0 focus:ring-0 placeholder:text-outline-variant/50"
              />
            </div>
          </div>
        </div>

        {/* ── SEC-02 // GENOMICS ── */}
        <div 
          className="col-span-4 row-span-5 bg-[#18181b] border border-[#27272a] p-4 flex flex-col cursor-pointer hover:border-primary transition-all duration-300"
          onClick={() => onNavigate('genomic')}
        >
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-primary">SEC-02 // GENOMICS {researchContext.gene ? `(${researchContext.gene})` : ''}</span>
            <span className="material-symbols-outlined text-outline text-lg">genetics</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            {researchContext.variants.length > 0 ? (
              <table className="w-full text-left font-data-md text-[12px]">
                <thead>
                  <tr className="text-outline border-b border-outline-variant">
                    <th className="pb-2 font-medium">VARIANT</th>
                    <th className="pb-2 font-medium">FREQ</th>
                    <th className="pb-2 font-medium">CLINVAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {researchContext.variants.map(v => (
                    <tr key={v.id}>
                      <td className="py-2 text-primary">{v.id}</td>
                      <td className="py-2 text-on-surface">{v.freq}</td>
                      <td className="py-2">
                        <span className={`px-1 border ${v.cls}`}>{v.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-outline text-[10px] italic">NO VARIANT DATA</div>
            )}
          </div>
        </div>

        {/* ── SEC-01 // LITERATURE ── */}
        <div 
          className="col-span-4 row-span-5 bg-[#18181b] border border-[#27272a] p-4 flex flex-col overflow-hidden cursor-pointer hover:border-primary transition-all duration-300"
          onClick={() => onNavigate('literature')}
        >
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SEC-01 // LITERATURE</span>
            <span className="material-symbols-outlined text-outline text-lg">menu_book</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="border-l-2 border-outline-variant pl-3 py-1">
                    <div className="skeleton h-2 w-28 mb-2" />
                    <div className="skeleton h-3 w-full mb-1" />
                    <div className="skeleton h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-4">
                {articles.slice(0, 3).map((a, i) => (
                  <div
                    key={a.pmid || i}
                    className="border-l-2 border-outline-variant pl-3 py-1 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => { logBrowse(a.pmid, a.title ?? null, a.journal ?? null, a.pubdate ?? null, query); onNavigate('literature') }}
                  >
                    <div className="text-[10px] text-outline font-data-md">
                      {a.journal ?? 'PubMed'} · {a.pubdate ?? ''}
                    </div>
                    <div className="font-data-md text-body-md text-on-surface leading-tight mt-1">
                      {(a.title ?? '').slice(0, 72)}{(a.title?.length ?? 0) > 72 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { source: 'Nature Genetics', time: '2h ago',  title: 'Novel structural insights into p53 inactivation mechanisms...' },
                  { source: 'Cell Reports',    time: '5h ago',  title: 'Chromatin remodeling by the NuRD complex in development...' },
                  { source: 'Science',         time: '1d ago',  title: 'High-throughput screening of CRISPR-Cas9 libraries...' },
                ].map((p, i) => (
                  <div key={i} className="border-l-2 border-outline-variant pl-3 py-1 hover:border-primary transition-colors cursor-pointer" onClick={() => onNavigate('literature')}>
                    <div className="text-[10px] text-outline font-data-md">{p.source} · {p.time}</div>
                    <div className="font-data-md text-body-md text-on-surface leading-tight mt-1">{p.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {query && (
            <div className="mt-2 shrink-0">
              <span className="font-data-md text-[10px] text-outline-variant truncate block">
                QUERY: {query.slice(0, 40)}{query.length > 40 ? '...' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SEC-05 // CLINICAL_PHASE fixed bar ── */}
      <div className="fixed bottom-0 left-64 right-0 h-16 bg-surface-container-high border-t border-outline-variant px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-6">
          <span className="font-label-caps text-label-caps text-secondary">SEC-05 // CLINICAL_PHASE</span>
          {[
            { label: 'PHASE I',   w: 'w-full', active: true },
            { label: 'PHASE II',  w: 'w-3/4',  active: true },
            { label: 'PHASE III', w: 'w-0',    active: false },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2">
              <div className={`h-1 w-12 rounded-full overflow-hidden ${p.active ? 'bg-secondary/40' : 'bg-outline-variant'}`}>
                <div className={`h-full bg-secondary ${p.w}`} />
              </div>
              <span className={`text-[10px] font-data-md ${p.active ? '' : 'text-outline-variant'}`}>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDeDuajvc1-xf9N8-wEXS6NeL6iFMHTzOhrvPI0hj7HMOSJH_asECyB6mjaT3kOf2FaYj9HQt8fbjWv3Pkrs2EReu2hnFEv4LRl_s9l6d5CJJFVBTNytZbV3uALHohAq_UOID7rHQgZFavUKEhGXe1YLzxhuYVw6ro1w1OqaMQj7K6v5zy0n06FkKnc_HKt9nlyWjt9s-9Ck_eYAoxu4lxEOBA3a2F2K85AMenZnHPdMzsUl__EIFqsNWPwNshwz3N_9OvmS6sG-aw',
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCF6KhPbq0sg0GxqCPiwPssbsnU4NcX69YHcYlzewePsCIZBQG8kBI3oFcKR9dI2WVd3IuHuM4XEuWXRqS8UqmSgkjQsZWVYYRCGHS_mxQ9F4wuBQC0KndTi1FSzTVwo_KPFFlOUIYir-iBsux5lSy7wa6187c2T4htN6MfDdFl20CWcvRVGJutmCL6KogbROa2ly9qbGPdNeZpSzdKWS-wyAPdBOTWObF5_VR3K3ERZGkCL-ZhL40nl4iryX7OEGaiTWOZq3jqvrE',
              'https://lh3.googleusercontent.com/aida-public/AB6AXuAbVb_wIHK4W0pOVXmhtqnR93ZlCr5XKlkkesByX4uXCgYTRxor3kpDJHiLLHm9MVdfFKI1ICZCt6s_seV03FvDJi-6YB5sxlu8omd7TKshKim8SlDYVU7Am_HRCmHu5dOQVxi87UuA6JueKD4XMOSn6cFWaypF25Ndr6fYePb-3hAfKvnKgVh6BSF82HVvG3E7xFzKWYqUqQKti01W-A7LHcIjwfvY_ufRwSHQ2AWi139dGUkBhCpLwgHrYaOjDy4Ka8yTinFEil0',
            ].map((src, i) => (
              <img key={i} className="w-6 h-6 rounded-none border border-background object-cover" src={src} alt="" />
            ))}
          </div>
          <button className="bg-secondary text-on-secondary px-4 py-1 font-label-caps text-label-caps hover:brightness-110 transition-all border border-secondary shadow-[0_0_10px_rgba(78,222,163,0.3)]">
            DEPLOY_COMPOUND
          </button>
        </div>
      </div>
    </div>
  )
}
