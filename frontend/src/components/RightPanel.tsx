import { useState, useEffect, useRef, useCallback } from 'react'
import type { Page, ResearchContext } from '@/types'

interface Props {
  page: Page
  loading: boolean
  query: string
  articleCount: number
  researchContext: ResearchContext
  activeTool: string | null
  onSearch: (q: string) => void
  onNavigate: (page: Page) => void
}

interface LogEntry { text: string; cls: string }

const INITIAL_LOGS: LogEntry[] = [
  { text: '[BOOT] INITIALIZING NOVU_CORE_OS...', cls: 'text-[#4edea3]' },
  { text: '>> Handshaking with SEC-04 node...', cls: 'text-[#8c909f]' },
  { text: '[OK] CONNECTION ESTABLISHED (12ms)', cls: 'text-[#4edea3]' },
  { text: '>> awaiting user query', cls: 'text-[#8c909f]' },
]

const PAGE_OPS: Record<Page, { primary: { icon: string; label: string }; secondary: { icon: string; label: string } }> = {
  'genomic':           { primary: { icon: 'search',         label: 'NEW SEARCH'    }, secondary: { icon: 'download',  label: 'EXPORT REPORT' } },
  'literature':        { primary: { icon: 'library_add',    label: 'SEARCH PAPERS' }, secondary: { icon: 'csv',       label: 'EXPORT CSV'    } },
  'protein':           { primary: { icon: 'play_arrow',     label: 'RUN ANALYSIS'  }, secondary: { icon: 'download',  label: 'EXPORT PDB'    } },
  'clinical':          { primary: { icon: 'clinical_notes', label: 'FETCH TRIALS'  }, secondary: { icon: 'download',  label: 'EXPORT JSON'   } },
  'genomics-explorer': { primary: { icon: 'genetics',       label: 'EXPLORE'       }, secondary: { icon: 'download',  label: 'EXPORT'        } },
  'instrument':        { primary: { icon: 'play_arrow',     label: 'RUN TOOL'      }, secondary: { icon: 'clear',     label: 'CLEAR'         } },
}

function getTs() {
  const n = new Date()
  return `[${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}:${n.getSeconds().toString().padStart(2,'0')}]`
}

export default function RightPanel({ page, loading, query, articleCount, researchContext, activeTool: _activeTool, onSearch, onNavigate }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [terminalCmd, setTerminalCmd] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const prevLoadingRef = useRef(false)

  const addLog = useCallback((text: string, cls: string) => {
    setLogs(prev => [...prev.slice(-40), { text, cls }])
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  useEffect(() => {
    if (loading && !prevLoadingRef.current) {
      const t = getTs()
      addLog(`${t} QUERY: "${query}"`, 'text-[#4edea3]')
      const t1 = setTimeout(() => addLog(`>> CALLING NOVU_BRAIN...`, 'text-[#8c909f]'), 300)
      const t2 = setTimeout(() => addLog(`${getTs()} SEARCHING PubMed...`, 'text-[#4edea3]'), 750)
      const t3 = setTimeout(() => addLog(`>> Querying NCBI E-utilities...`, 'text-[#8c909f]'), 1300)
      prevLoadingRef.current = true
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
    if (!loading && prevLoadingRef.current) {
      const t = getTs()
      addLog(`${t} FOUND ${articleCount} RESULTS`, 'text-[#4edea3]')
      if (researchContext.gene) addLog(`>> GENE: ${researchContext.gene} | VARIANTS: ${researchContext.variants.length}`, 'text-[#c0c1ff]')
      addLog(`>> awaiting next query`, 'text-[#8c909f]')
      prevLoadingRef.current = false
    }
  }, [loading, articleCount, query, researchContext, addLog])

  function handleTerminalKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const cmd = terminalCmd.trim()
    setTerminalCmd('')
    if (!cmd) return
    if (cmd === 'clear') { setLogs(INITIAL_LOGS); return }
    if (cmd === 'help') {
      addLog(`>> commands: <query> | clear | help`, 'text-[#8c909f]')
      return
    }
    addLog(`>> ${cmd}`, 'text-[#e1e2ec]')
    onSearch(cmd)
    onNavigate('genomic')
  }

  const ops = PAGE_OPS[page] ?? PAGE_OPS['genomic']

  return (
    <aside className="w-72 bg-[#0b0e15] border-l border-[#424754] flex flex-col z-40 shrink-0">
      {/* Operations */}
      <div className="p-4 flex flex-col gap-3 border-b border-[#424754]">
        <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-1">SYSTEM_OPERATIONS</div>
        <button className="w-full bg-[#4edea3] text-[#003824] py-2 font-label-caps text-[11px] tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">{ops.primary.icon}</span>
          {ops.primary.label}
        </button>
        <button className="w-full border border-[#424754] text-[#e1e2ec] py-2 font-label-caps text-[11px] tracking-widest hover:bg-[#1d2027] transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">{ops.secondary.icon}</span>
          {ops.secondary.label}
        </button>
      </div>

      {/* Parameters */}
      <div className="p-4 flex flex-col gap-3 border-b border-[#424754]">
        <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-1">PARAMETERS</div>
        <div className="space-y-1">
          <div className="flex justify-between font-label-caps text-[10px]">
            <span className="text-[#8c909f]">MAX_RESULTS</span>
            <span className="text-[#e1e2ec]">10</span>
          </div>
          <input className="w-full h-0.5 bg-[#272a31] appearance-none accent-[#4edea3] cursor-pointer" type="range" defaultValue={10} min={5} max={20} />
        </div>
        <div className="flex items-center justify-between p-2 border border-[#424754] bg-[#1d2027]">
          <span className="font-label-caps text-[10px] text-[#8c909f]">AUTO_ENRICH</span>
          <div className="w-8 h-4 bg-[#4edea3]/20 relative border border-[#4edea3] cursor-pointer">
            <div className="absolute top-0 right-0 w-4 h-full bg-[#4edea3]" />
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-[#424754]">
        <div className="p-2 border border-[#424754] bg-[#1d2027] flex flex-col gap-0.5">
          <span className="font-label-caps text-[9px] text-[#8c909f]">ARTICLES</span>
          <span className="font-data-md text-data-md text-[#4edea3]">{loading ? '...' : articleCount}</span>
        </div>
        <div className="p-2 border border-[#424754] bg-[#1d2027] flex flex-col gap-0.5">
          <span className="font-label-caps text-[9px] text-[#8c909f]">VARIANTS</span>
          <span className="font-data-md text-data-md text-[#c0c1ff]">{researchContext.variants.length || '—'}</span>
        </div>
      </div>

      {/* AI Co-Pilot Monitor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#424754] shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[#4edea3] animate-pulse' : 'bg-[#4edea3]'}`} />
            <span className="font-label-caps text-[10px] text-[#4edea3] tracking-widest">AI_COPILOT_MONITOR</span>
          </div>
          <span className="font-label-caps text-[9px] text-[#8c909f]">LIVE</span>
        </div>

        <div
          ref={logRef}
          className="flex-1 p-3 overflow-y-auto custom-scrollbar font-data-md text-[11px] leading-relaxed"
        >
          {logs.map((log, i) => (
            <div key={i} className={`${log.cls} mb-0.5`}>{log.text}</div>
          ))}
          {loading && (
            <div className="text-[#4edea3] animate-pulse">{'>> processing...'}</div>
          )}
          {!loading && (
            <div className="text-[#e1e2ec] flex items-center gap-1">
              {'>>'}
              <span className="terminal-cursor" />
            </div>
          )}
        </div>

        {/* Terminal input */}
        <div className="px-4 py-3 border-t border-[#424754] bg-[#0b0e15] shrink-0">
          <div className="flex gap-2 items-center">
            <span className="font-data-md text-[11px] text-[#4edea3] shrink-0">sys@novu:~$</span>
            <input
              type="text"
              value={terminalCmd}
              onChange={e => setTerminalCmd(e.target.value)}
              onKeyDown={handleTerminalKey}
              placeholder="query or command..."
              className="flex-1 bg-transparent border-none outline-none font-data-md text-[11px] text-[#e1e2ec] placeholder:text-[#424754] focus:ring-0 p-0"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
