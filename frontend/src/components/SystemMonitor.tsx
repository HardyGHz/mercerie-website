import { useState, useEffect, useRef } from 'react'
import { getSystemStats } from '@/lib/api'
import type { SystemStatsResponse } from '@/types'

// Theme colors for each subsystem
const COLORS = {
  brain: { stroke: '#adc6ff', fill: 'url(#gradient-brain)', border: 'border-[#adc6ff]/20', text: 'text-[#adc6ff]' },
  bus: { stroke: '#4edea3', fill: 'url(#gradient-bus)', border: 'border-[#4edea3]/20', text: 'text-[#4edea3]' },
  pubmed: { stroke: '#c0c1ff', fill: 'url(#gradient-pubmed)', border: 'border-[#c0c1ff]/20', text: 'text-[#c0c1ff]' },
  db: { stroke: '#f59e0b', fill: 'url(#gradient-db)', border: 'border-[#f59e0b]/20', text: 'text-[#f59e0b]' },
  cache: { stroke: '#38bdf8', fill: 'url(#gradient-cache)', border: 'border-[#38bdf8]/20', text: 'text-[#38bdf8]' },
}

type TabType = 'brain' | 'bus' | 'pubmed' | 'db' | 'cache'

interface SystemMonitorProps {
  onClose: () => void
}

export default function SystemMonitor({ onClose }: SystemMonitorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('brain')
  const [stats, setStats] = useState<SystemStatsResponse | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [copied, setCopied] = useState(false)

  const startCommand = 'cd backend && uvicorn main:app --reload'

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(startCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable
    }
  }
  
  // Keep 60 points of history for each tab
  const [history, setHistory] = useState<Record<TabType, number[]>>({
    brain: Array(60).fill(0),
    bus: Array(60).fill(0),
    pubmed: Array(60).fill(0),
    db: Array(60).fill(0),
    cache: Array(60).fill(0),
  })

  const statsRef = useRef<SystemStatsResponse | null>(null)

  // Zero-state stats shown when backend is unreachable — no fake waveform.
  const zeroStats = (): SystemStatsResponse => ({
    brain: { percent: 0, tokens_per_sec: 0, model: 'gemini-3.1-flash-lite', latency_ms: 0, active_sessions: 0, total_queries: 0 },
    bus: { percent: 0, events_per_sec: 0, active_bindings: 0, extraction_latency_ms: 0, genes_extracted: 0, status: 'OFFLINE' },
    pubmed: { percent: 0, latency_ms: 0, requests_per_hour: 0, error_rate: 0, uptime: '—' },
    db: { percent: 0, latency_ms: 0, provider: 'Supabase', queue_items: 0, status: 'OFFLINE' },
    cache: { percent: 0, hit_rate: 0, allocated_mb: 0, capacity_mb: 128.0, cached_queries: 0 },
  })

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const data = await getSystemStats()
        if (!active) return
        setStats(data)
        statsRef.current = data
        setIsOffline(false)

        setHistory(prev => ({
          brain: [...prev.brain.slice(1), data.brain.percent],
          bus: [...prev.bus.slice(1), data.bus.percent],
          pubmed: [...prev.pubmed.slice(1), data.pubmed.percent],
          db: [...prev.db.slice(1), data.db.percent],
          cache: [...prev.cache.slice(1), data.cache.percent],
        }))
      } catch {
        if (!active) return
        setIsOffline(true)
        const zero = zeroStats()
        setStats(zero)
        statsRef.current = zero

        setHistory(prev => ({
          brain: [...prev.brain.slice(1), 0],
          bus: [...prev.bus.slice(1), 0],
          pubmed: [...prev.pubmed.slice(1), 0],
          db: [...prev.db.slice(1), 0],
          cache: [...prev.cache.slice(1), 0],
        }))
      } finally {
        // Schedule the next tick only after the previous one finishes — prevents
        // stale, slow error responses from clobbering a fresh successful state.
        if (active) timer = setTimeout(poll, 1000)
      }
    }

    poll()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!stats) {
    return (
      <div className="w-[660px] h-[400px] bg-[#0c0c0e] border border-[#424754] flex items-center justify-center">
        <span className="font-label-caps text-[10px] text-[#8c909f] animate-pulse">CONNECTING TELEMETRY BUS...</span>
      </div>
    )
  }

  // Draw chart calculations
  const currentHistory = history[activeTab]
  const activeColor = COLORS[activeTab]

  // SVG grid and path generation
  const width = 380
  const height = 150
  const maxVal = 100

  // Generate SVG path for line
  const points = currentHistory.map((val, index) => {
    const x = (index / 59) * width
    const y = height - 10 - (val / maxVal) * (height - 20)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${width},${height - 10} L 0,${height - 10} Z`

  // Generate vertical lines
  const gridVLines = Array(10).fill(0).map((_, i) => (i / 9) * width)
  // Generate horizontal lines
  const gridHLines = Array(5).fill(0).map((_, i) => 10 + (i / 4) * (height - 20))

  return (
    <div className={`w-[660px] ${isOffline ? 'h-[470px]' : 'h-[410px]'} bg-[#0d0f14] border ${isOffline ? 'border-[#f59e0b]/60' : 'border-[#424754]'} flex flex-col font-data-md select-none text-[#e1e2ec] shadow-2xl relative`}>

      {/* ── HEADER ── */}
      <div className="h-10 border-b border-[#424754]/70 px-4 flex items-center justify-between bg-[#0b0e15]/90 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-label-caps text-[10px] font-bold text-[#adc6ff] tracking-wider">NOVU_SYSTEM_PERFORMANCE</span>
          {isOffline ? (
            <span className="text-[9px] text-[#f59e0b] border border-[#f59e0b]/30 px-1.5 py-0.5 bg-[#f59e0b]/5 font-label-caps">
              BACKEND_OFFLINE
            </span>
          ) : (
            <span className="text-[9px] text-[#4edea3] border border-[#4edea3]/30 px-1.5 py-0.5 bg-[#4edea3]/5 font-label-caps flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] inline-block animate-pulse" />
              TELEMETRY_LIVE
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-[#8c909f] hover:text-[#e1e2ec] cursor-pointer text-[18px] transition-colors"
        >
          close
        </button>
      </div>

      {/* ── OFFLINE WARNING BANNER ── */}
      {isOffline && (
        <div className="shrink-0 bg-[#f59e0b]/[0.06] border-b border-[#f59e0b]/30 px-4 py-2.5 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#f59e0b] text-[20px] shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <div className="font-label-caps text-[10px] text-[#f59e0b] tracking-wider font-bold mb-0.5">
              NO LIVE DATA
            </div>
            <div className="font-data-md text-[10px] text-[#c2c6d6]">
              Backend unreachable. Start it to see telemetry:
            </div>
          </div>
          <button
            onClick={copyCommand}
            title="Copy command"
            className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 bg-black/40 border border-[#f59e0b]/40 hover:border-[#f59e0b] hover:bg-black/60 transition-colors cursor-pointer group"
          >
            <code className="font-data-md text-[10px] text-[#f59e0b] whitespace-nowrap">{startCommand}</code>
            <span className="material-symbols-outlined text-[#f59e0b]/70 group-hover:text-[#f59e0b] text-[14px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* Left Side: Subsystems List (Task Manager sidebar) */}
        <div className="w-[230px] border-r border-[#424754]/50 flex flex-col bg-[#0b0e15]/40 overflow-y-auto custom-scrollbar shrink-0">
          
          {/* BRAIN Tab */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`w-full text-left p-3 border-b border-[#424754]/20 flex justify-between items-center transition-all cursor-pointer group ${
              activeTab === 'brain' ? 'bg-[#1c1e28] border-l-[3px] border-l-[#adc6ff] pl-[9px]' : 'hover:bg-[#12141c]'
            }`}
          >
            <div>
              <div className="font-label-caps text-[10px] text-[#8c909f] group-hover:text-[#e1e2ec] transition-colors">BRAIN (Gemini)</div>
              <div className="text-[12px] font-bold mt-1 text-[#e1e2ec]">
                {stats.brain.percent}% <span className="font-normal text-[10px] text-[#8c909f]">| {stats.brain.tokens_per_sec} t/s</span>
              </div>
            </div>
            <div className="w-14 h-8 opacity-60">
              <MiniSparkline data={history.brain} stroke="#adc6ff" />
            </div>
          </button>

          {/* DATA BUS Tab */}
          <button
            onClick={() => setActiveTab('bus')}
            className={`w-full text-left p-3 border-b border-[#424754]/20 flex justify-between items-center transition-all cursor-pointer group ${
              activeTab === 'bus' ? 'bg-[#1c1e28] border-l-[3px] border-l-[#4edea3] pl-[9px]' : 'hover:bg-[#12141c]'
            }`}
          >
            <div>
              <div className="font-label-caps text-[10px] text-[#8c909f] group-hover:text-[#e1e2ec] transition-colors">DATA BUS</div>
              <div className="text-[12px] font-bold mt-1 text-[#e1e2ec]">
                {stats.bus.percent}% <span className="font-normal text-[10px] text-[#8c909f]">| {stats.bus.events_per_sec} ev/s</span>
              </div>
            </div>
            <div className="w-14 h-8 opacity-60">
              <MiniSparkline data={history.bus} stroke="#4edea3" />
            </div>
          </button>

          {/* PUBMED Tab */}
          <button
            onClick={() => setActiveTab('pubmed')}
            className={`w-full text-left p-3 border-b border-[#424754]/20 flex justify-between items-center transition-all cursor-pointer group ${
              activeTab === 'pubmed' ? 'bg-[#1c1e28] border-l-[3px] border-l-[#c0c1ff] pl-[9px]' : 'hover:bg-[#12141c]'
            }`}
          >
            <div>
              <div className="font-label-caps text-[10px] text-[#8c909f] group-hover:text-[#e1e2ec] transition-colors">PUBMED API</div>
              <div className="text-[12px] font-bold mt-1 text-[#e1e2ec]">
                {stats.pubmed.percent}% <span className="font-normal text-[10px] text-[#8c909f]">| {stats.pubmed.latency_ms}ms</span>
              </div>
            </div>
            <div className="w-14 h-8 opacity-60">
              <MiniSparkline data={history.pubmed} stroke="#c0c1ff" />
            </div>
          </button>

          {/* DB SYNC Tab */}
          <button
            onClick={() => setActiveTab('db')}
            className={`w-full text-left p-3 border-b border-[#424754]/20 flex justify-between items-center transition-all cursor-pointer group ${
              activeTab === 'db' ? 'bg-[#1c1e28] border-l-[3px] border-l-[#f59e0b] pl-[9px]' : 'hover:bg-[#12141c]'
            }`}
          >
            <div>
              <div className="font-label-caps text-[10px] text-[#8c909f] group-hover:text-[#e1e2ec] transition-colors">DB SYNC</div>
              <div className="text-[12px] font-bold mt-1 text-[#e1e2ec]">
                {stats.db.percent}% <span className="font-normal text-[10px] text-[#8c909f]">| {stats.db.status}</span>
              </div>
            </div>
            <div className="w-14 h-8 opacity-60">
              <MiniSparkline data={history.db} stroke="#f59e0b" />
            </div>
          </button>

          {/* CACHE Tab */}
          <button
            onClick={() => setActiveTab('cache')}
            className={`w-full text-left p-3 border-b border-[#424754]/20 flex justify-between items-center transition-all cursor-pointer group ${
              activeTab === 'cache' ? 'bg-[#1c1e28] border-l-[3px] border-l-[#38bdf8] pl-[9px]' : 'hover:bg-[#12141c]'
            }`}
          >
            <div>
              <div className="font-label-caps text-[10px] text-[#8c909f] group-hover:text-[#e1e2ec] transition-colors">CACHE MEMORY</div>
              <div className="text-[12px] font-bold mt-1 text-[#e1e2ec]">
                {stats.cache.percent}% <span className="font-normal text-[10px] text-[#8c909f]">| {stats.cache.allocated_mb} MB</span>
              </div>
            </div>
            <div className="w-14 h-8 opacity-60">
              <MiniSparkline data={history.cache} stroke="#38bdf8" />
            </div>
          </button>

        </div>

        {/* Right Side: Detailed Dashboard Panel */}
        <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-[#08090d]/60">
          
          {/* Tab Subtitle & Title */}
          <div className="flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-[15px] font-bold uppercase tracking-wide flex items-center gap-2">
                {activeTab === 'brain' && 'BRAIN // GEMINI AGENT LOAD'}
                {activeTab === 'bus' && 'DATA BUS // EXTRACTOR WORKFLOW'}
                {activeTab === 'pubmed' && 'PUBMED // API REQUEST LATENCY'}
                {activeTab === 'db' && 'DB SYNC // SUPABASE LINK'}
                {activeTab === 'cache' && 'CACHE // HIT RATE'}
              </h2>
              <p className="text-[10px] text-[#8c909f] font-label-caps mt-0.5">
                {activeTab === 'brain' && 'Agent token parsing capacity over 60 seconds'}
                {activeTab === 'bus' && 'NLP entity extraction event processing speed'}
                {activeTab === 'pubmed' && 'PubMed E-Utilities REST endpoint latency'}
                {activeTab === 'db' && 'Supabase transaction logging queue operations'}
                {activeTab === 'cache' && 'Cache effectiveness over recent lookups (hit rate %)'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-[18px] font-bold ${activeColor.text}`}>
                {stats[activeTab].percent}%
              </div>
              <div className="text-[9px] text-[#8c909f] font-label-caps">UTILIZATION</div>
            </div>
          </div>

          {/* SVG History Chart */}
          <div className="h-[150px] relative my-2 border border-[#424754]/40 bg-black/40">
            {/* Chart Grid values */}
            <span className="absolute top-1 left-2 text-[8px] text-[#8c909f] font-label-caps">100%</span>
            <span className="absolute bottom-1 left-2 text-[8px] text-[#8c909f] font-label-caps">0%</span>
            <span className="absolute bottom-1 right-2 text-[8px] text-[#8c909f] font-label-caps">60 seconds</span>
            
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
              <defs>
                <linearGradient id="gradient-brain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#adc6ff" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="gradient-bus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="gradient-pubmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c0c1ff" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#c0c1ff" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="gradient-db" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="gradient-cache" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Vertical Gridlines */}
              {gridVLines.map((x, i) => (
                <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={height - 10} stroke="#272a35" strokeWidth="0.5" strokeDasharray="2 3" />
              ))}
              
              {/* Horizontal Gridlines */}
              {gridHLines.map((y, i) => (
                <line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} stroke="#272a35" strokeWidth="0.5" strokeDasharray="2 3" />
              ))}

              {/* Area path */}
              <path d={areaPath} fill={activeColor.fill} />
              
              {/* Stroke line path */}
              <path d={linePath} fill="none" stroke={activeColor.stroke} strokeWidth="1.5" />
            </svg>
          </div>

          {/* Details Table at the bottom (2x2 or 2x3 Grid of parameters) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-[#424754]/30 shrink-0 text-[10px]">
            
            {activeTab === 'brain' && (
              <>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">AGENT MODEL:</span>
                  <span className="font-bold text-on-surface">{stats.brain.model}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">TOKEN PROCESSING:</span>
                  <span className="font-bold text-[#adc6ff]">{stats.brain.tokens_per_sec} tokens/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">INFERENCE LATENCY:</span>
                  <span className="font-bold text-on-surface">{stats.brain.latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">ACTIVE SESSION:</span>
                  <span className="font-bold text-on-surface">{stats.brain.active_sessions} units</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">TOTAL QUERIES:</span>
                  <span className="font-bold text-on-surface">{stats.brain.total_queries} runs</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">AGENT TEMP:</span>
                  <span className="font-bold text-[#4edea3]">0.2</span>
                </div>
              </>
            )}

            {activeTab === 'bus' && (
              <>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">ROUTER STATUS:</span>
                  <span className="font-bold text-[#4edea3]">{stats.bus.status}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">DISPATCH SPEED:</span>
                  <span className="font-bold text-[#4edea3]">{stats.bus.events_per_sec} events/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">PROPAGATION LAG:</span>
                  <span className="font-bold text-on-surface">{stats.bus.extraction_latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">BINDINGS ACTIVE:</span>
                  <span className="font-bold text-on-surface">{stats.bus.active_bindings} channels</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">IDENTIFIED GENES:</span>
                  <span className="font-bold text-on-surface">{stats.bus.genes_extracted} unique</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">BUS CAPACITY:</span>
                  <span className="font-bold text-[#adc6ff]">64 ch/s</span>
                </div>
              </>
            )}

            {activeTab === 'pubmed' && (
              <>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">API ENDPOINT:</span>
                  <span className="font-bold text-on-surface">E-Utilities</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">RESPONSE LATENCY:</span>
                  <span className="font-bold text-[#c0c1ff]">{stats.pubmed.latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">THROUGHPUT RATIO:</span>
                  <span className="font-bold text-on-surface">{stats.pubmed.requests_per_hour} req/hr</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">ERROR RATIO:</span>
                  <span className="font-bold text-on-surface">{(stats.pubmed.error_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">SYS UPTIME:</span>
                  <span className="font-bold text-on-surface">{stats.pubmed.uptime}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">SSL HANDSHAKE:</span>
                  <span className="font-bold text-[#4edea3]">TLS 1.3</span>
                </div>
              </>
            )}

            {activeTab === 'db' && (
              <>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">DATABASE STATUS:</span>
                  <span className={`font-bold ${stats.db.status === 'CONNECTED' ? 'text-[#4edea3]' : 'text-error'}`}>
                    {stats.db.status}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">PROVIDER LINK:</span>
                  <span className="font-bold text-on-surface">{stats.db.provider}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">DB TRANSACTION LAG:</span>
                  <span className="font-bold text-[#f59e0b]">{stats.db.latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">SYNC WRITE QUEUE:</span>
                  <span className="font-bold text-on-surface">{stats.db.queue_items} items</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">CACHE TABLE:</span>
                  <span className="font-bold text-on-surface">pubmed_cache</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">AUDIT LOGGER:</span>
                  <span className="font-bold text-on-surface">Active (pg)</span>
                </div>
              </>
            )}

            {activeTab === 'cache' && (
              <>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">CACHE HIT RATE:</span>
                  <span className="font-bold text-[#38bdf8]">{stats.cache.hit_rate}%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">ALLOCATED BUFFER:</span>
                  <span className="font-bold text-[#38bdf8]">{stats.cache.allocated_mb} MB</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">MAX BUFFER LIMIT:</span>
                  <span className="font-bold text-on-surface">{stats.cache.capacity_mb} MB</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">CACHED QUERIES:</span>
                  <span className="font-bold text-on-surface">{stats.cache.cached_queries} entries</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">CLEANUP THRESHOLD:</span>
                  <span className="font-bold text-on-surface">80.0%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#424754]/10">
                  <span className="text-[#8c909f] font-label-caps">DATA EXPIRATION:</span>
                  <span className="font-bold text-on-surface">24 Hours</span>
                </div>
              </>
            )}

          </div>

        </div>

      </div>

    </div>
  )
}

// Sub-component for rendering mini preview sparklines in the sidebar list items
function MiniSparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 60
  const height = 24
  const maxVal = 100

  const points = data.map((val, index) => {
    const x = (index / 59) * width
    const y = height - 2 - (val / maxVal) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={`M ${points.join(' L ')}`} fill="none" stroke={stroke} strokeWidth="1" />
    </svg>
  )
}
