import { useState, useRef, useEffect } from 'react'

const INITIAL_LOGS = [
  { text: '[BOOT] NOVU_OS_V2.4 INITIALIZING...', cls: 'text-on-surface' },
  { text: '>> Loading kernel modules...', cls: 'text-outline' },
  { text: '[BOOT] GEMINI_AGENT: CONNECTED', cls: 'text-primary' },
  { text: '[BOOT] PUBMED_API: CONNECTED (latency: 84ms)', cls: 'text-secondary' },
  { text: '[BOOT] CLINVAR_SYNC: ACTIVE', cls: 'text-secondary' },
  { text: '>> Mounting research filesystem...', cls: 'text-outline' },
  { text: '[SYS] SEC_AUTH: ACTIVE (session: 144h)', cls: 'text-secondary' },
  { text: '>> All systems nominal.', cls: 'text-outline' },
  { text: '[SYS] READY — awaiting commands', cls: 'text-on-surface' },
]

const LIVE_LOGS = [
  'Heartbeat check: all nodes responding',
  'PUBMED_API: 312 requests/hr',
  'Memory usage: 34%',
  'GEMINI_AGENT: session active',
  'ClinVar sync: up to date',
  'Checkpoint saved',
]

const DATA_SOURCES = [
  { name: 'PubMed',    status: 'ACTIVE', sync: '2min ago',  records: '36M+' },
  { name: 'ClinVar',   status: 'ACTIVE', sync: '2h ago',    records: '1.2M+' },
  { name: 'UniProt',   status: 'ACTIVE', sync: '1d ago',    records: '570K+' },
  { name: 'NCBI Gene', status: 'ACTIVE', sync: '6h ago',    records: '85K+' },
]

const SERVICE_STATUS = [
  { name: 'NOVU_BRAIN',    status: 'ONLINE',  detail: 'latency: 12ms',  color: 'text-secondary border-secondary/20 bg-secondary/10' },
  { name: 'PUBMED_API',    status: 'ONLINE',  detail: '99.2% uptime',   color: 'text-secondary border-secondary/20 bg-secondary/10' },
  { name: 'GEMINI_AGENT',  status: 'ACTIVE',  detail: '3 sessions',     color: 'text-primary border-primary/20 bg-primary/10' },
  { name: 'CLINVAR_SYNC',  status: 'SYNCING', detail: 'last: 2h ago',   color: 'text-amber-400 border-amber-400/20 bg-amber-400/10' },
]

export default function SystemConfig() {
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [termCmd, setTermCmd] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const ts = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
      setLogs(prev => [...prev, {
        text: `${ts} ${LIVE_LOGS[Math.floor(Math.random() * LIVE_LOGS.length)]}`,
        cls: 'text-outline',
      }])
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  function handleTermKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !termCmd.trim()) return
    const cmd = termCmd.trim()
    setTermCmd('')
    if (cmd === 'clear') { setLogs(INITIAL_LOGS); return }
    setLogs(prev => [...prev,
      { text: `root@novu-os:~$ ${cmd}`, cls: 'text-on-surface' },
      { text: `>> command not found: ${cmd} (try: status, clear, help)`, cls: 'text-outline' },
    ])
  }

  return (
    <div className="p-margin-desktop bg-surface overflow-hidden relative" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="bento-grid">

        {/* ── SEC-00 // SYSTEM_STATUS ── */}
        <div className="col-span-8 row-span-4 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-outline">SEC-00 // SYSTEM_STATUS</span>
            <span className="material-symbols-outlined text-outline text-lg">settings</span>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {SERVICE_STATUS.map(s => (
              <div key={s.name} className={`border ${s.color} p-3 flex items-center justify-between`}>
                <div>
                  <div className="font-data-md text-[11px] font-bold text-on-surface">{s.name}</div>
                  <div className="font-data-md text-[10px] text-outline">{s.detail}</div>
                </div>
                <span className={`font-label-caps text-[9px] px-2 py-0.5 border ${s.color}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-11 // SYSTEM_LOG ── */}
        <div className="col-span-4 row-span-12 bg-[#18181b] border border-[#27272a] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-surface-container-high/50 shrink-0">
            <span className="font-label-caps text-label-caps text-outline">SEC-11 // SYSTEM_LOG</span>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          </div>
          <div ref={logRef} className="flex-1 font-data-md text-data-md p-4 overflow-y-auto custom-scrollbar bg-black/20">
            {logs.map((l, i) => (
              <div key={i} className={`${l.cls} mb-1`}>{l.text}</div>
            ))}
            <div className="text-on-surface flex items-center gap-1">
              <span className="terminal-cursor" />
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-[#27272a] shrink-0">
            <div className="flex gap-2">
              <span className="text-outline font-data-md text-data-md">root@novu-os:~$</span>
              <input
                type="text"
                placeholder="..."
                value={termCmd}
                onChange={e => setTermCmd(e.target.value)}
                onKeyDown={handleTermKey}
                className="bg-transparent border-none outline-none font-data-md text-data-md text-on-surface w-full p-0 focus:ring-0 placeholder:text-outline-variant/50"
              />
            </div>
          </div>
        </div>

        {/* ── SEC-12 // API_KEYS ── */}
        <div className="col-span-4 row-span-4 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-outline">SEC-12 // API_KEYS</span>
            <span className="material-symbols-outlined text-outline text-lg">key</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {[
              { name: 'GEMINI_API',  masked: '•••••••••• GHK9', status: 'ACTIVE' },
              { name: 'NCBI_API',    masked: '•••••••••• 4M2X', status: 'ACTIVE' },
              { name: 'USER_EMAIL',  masked: 'research@novu.ai', status: 'VERIFIED' },
            ].map(k => (
              <div key={k.name} className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                <div>
                  <div className="font-label-caps text-[9px] text-outline mb-0.5">{k.name}</div>
                  <div className="font-data-md text-[11px] text-on-surface-variant">{k.masked}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-[9px] text-secondary border border-secondary/20 bg-secondary/10 px-1">{k.status}</span>
                  <button className="font-label-caps text-[9px] text-outline border border-outline-variant px-2 py-0.5 hover:border-primary hover:text-primary transition-colors bg-transparent cursor-pointer">ROTATE</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-13 // AGENT_CONFIG ── */}
        <div className="col-span-4 row-span-4 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-outline">SEC-13 // AGENT_CONFIG</span>
            <span className="material-symbols-outlined text-outline text-lg">tune</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {[
              { label: 'MAX_ITERATIONS', value: '5' },
              { label: 'DEFAULT_RESULTS', value: '10' },
              { label: 'MODEL', value: 'gemini-3.1-flash-lite' },
              { label: 'TIMEOUT', value: '30s' },
            ].map(c => (
              <div key={c.label} className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                <span className="font-label-caps text-[9px] text-outline">{c.label}</span>
                <span className="font-data-md text-[11px] text-on-surface border border-outline-variant px-2 py-0.5">{c.value}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full font-label-caps text-label-caps text-secondary border border-secondary/30 py-1.5 hover:bg-secondary/10 transition-colors bg-transparent cursor-pointer shrink-0">
            SAVE_CONFIG
          </button>
        </div>

        {/* ── SEC-14 // DATA_SOURCES ── */}
        <div className="col-span-8 row-span-4 bg-[#18181b] border border-[#27272a] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <span className="font-label-caps text-label-caps text-outline">SEC-14 // DATA_SOURCES</span>
            <span className="material-symbols-outlined text-outline text-lg">database</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left font-data-md text-[12px]">
              <thead>
                <tr className="text-outline border-b border-outline-variant">
                  <th className="pb-2 font-medium">SOURCE</th>
                  <th className="pb-2 font-medium">STATUS</th>
                  <th className="pb-2 font-medium">LAST_SYNC</th>
                  <th className="pb-2 font-medium">RECORDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {DATA_SOURCES.map(d => (
                  <tr key={d.name}>
                    <td className="py-2 text-on-surface font-medium">{d.name}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
                        <span className="text-secondary">{d.status}</span>
                      </span>
                    </td>
                    <td className="py-2 text-on-surface-variant">{d.sync}</td>
                    <td className="py-2 text-primary">{d.records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="fixed bottom-0 left-64 right-0 h-8 flex justify-between items-center px-margin-desktop bg-surface-container-lowest border-t border-outline-variant z-30 font-data-md text-[10px] text-outline">
        <div className="flex items-center gap-6">
          <span className="font-label-caps uppercase">NOVU_OS_V2.4 // UPTIME: 452:12:08</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            SEC_AUTH: ACTIVE
          </span>
        </div>
        <span>COORD: 46.7667 N, 23.5833 E</span>
      </div>
    </div>
  )
}
