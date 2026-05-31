import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import SystemMonitor from '@/components/SystemMonitor'
import RightPanel from '@/components/RightPanel'
import Dashboard from '@/pages/Dashboard'
import LiteratureSearch from '@/pages/LiteratureSearch'
import GenomicsExplorer from '@/pages/GenomicsExplorer'
import type { GenomicsState } from '@/pages/GenomicsExplorer'
import ClinicalTrials from '@/pages/ClinicalTrials'
import InstrumentPanel from '@/pages/InstrumentPanel'

// Heavy 3D viewer — lazy-loaded only when user navigates to /protein
const ProteinViewer = lazy(() => import('@/pages/ProteinViewer'))

function ProteinViewerFallback() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-[#09090b]">
      <div className="w-8 h-8 border-2 border-[#c0c1ff] border-t-transparent rounded-full animate-spin" />
      <div className="font-label-caps text-[10px] text-[#c0c1ff] tracking-widest animate-pulse">LOADING 3D VIEWER</div>
    </div>
  )
}
import { searchLiterature, enrichVariants } from '@/lib/api'
import { logSearch } from '@/lib/supabase'
import { getInstrument, CATEGORY_META } from '@/lib/instruments'
import type { Article, Page, ResearchContext, ProteinTarget } from '@/types'

const HISTORY_KEY = 'novu_search_history'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveToHistory(q: string) {
  const h = [q, ...loadHistory().filter(x => x !== q)].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}
function removeFromHistory(q: string): string[] {
  const h = loadHistory().filter(x => x !== q)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
  return h
}

const PAGE_META: Record<Page, { sec: string; source: string; color: string }> = {
  'genomic':           { sec: 'RESEARCH_OS',    source: 'PubMed // Gemini',   color: '#4edea3' },
  'literature':        { sec: 'LITERATURE',     source: 'PubMed',             color: '#adc6ff' },
  'protein':           { sec: 'PROTEOMICS',     source: 'PDB // AlphaFold',   color: '#c0c1ff' },
  'genomics-explorer': { sec: 'GENOMICS',       source: 'ClinVar // gnomAD',  color: '#4edea3' },
  'clinical':          { sec: 'CLINICAL_PHASE', source: 'ClinicalTrials.gov', color: '#f59e0b' },
  'instrument':        { sec: 'TOOLBOX',        source: 'Science Skills',     color: '#adc6ff' },
}

export default function App() {
  const [page, setPage]                     = useState<Page>('genomic')
  const [activeTool, setActiveTool]         = useState<string | null>(null)
  const [headerInput, setHeaderInput]       = useState('')
  const [dashQuery, setDashQuery]           = useState('')
  const [dashArticles, setDashArticles]     = useState<Article[]>([])
  const [researchContext, setResearchContext] = useState<ResearchContext>({ gene: null, variants: [], proteinName: null })
  const [dashLoading, setDashLoading]       = useState(false)
  const [proteinTarget, setProteinTarget]   = useState<ProteinTarget | null>(null)
  // Genomics state lifted here so it survives navigation (the page unmounts on switch)
  const [genomicsState, setGenomicsState]   = useState<GenomicsState>({
    gene: 'TP53',
    variantInput: 'R175H, R248W, R248Q, R273H, G245S',
    variants: [],
    lastGene: null,
  })
  const [showHistory, setShowHistory]       = useState(false)
  const [history, setHistory]               = useState<string[]>([])
  const [showSystemMonitor, setShowSystemMonitor] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowHistory(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSearch(query: string) {
    const q = query.trim()
    if (!q) return
    setShowHistory(false)
    setHeaderInput('')
    saveToHistory(q)
    setHistory(loadHistory())
    setDashLoading(true)
    setDashQuery(q)
    setDashArticles([])
    setResearchContext({ gene: null, variants: [], proteinName: null })
    try {
      const res = await searchLiterature(q, 10)
      setDashArticles(res.results)
      setResearchContext(res.researchContext)
      logSearch(q, res.results.length)
      const pendingIds = res.researchContext.variants.map(v => v.id)
      if (pendingIds.length > 0) {
        enrichVariants(res.researchContext.gene, pendingIds)
          .then(enriched => setResearchContext(prev => ({ ...prev, variants: enriched })))
          .catch(() => {})
      }
    } catch {
      // errors surfaced in agent log
    } finally {
      setDashLoading(false)
    }
  }

  function handleToolSelect(toolId: string) {
    if (toolId === 'back') {
      handleNavigate('genomic')
      return
    }
    setActiveTool(toolId)
    setPage('instrument')
  }

  function handleNavigate(p: Page) {
    setPage(p)
    if (p !== 'instrument') setActiveTool(null)
  }

  function handleSendToProtein(gene: string, variant: string | null) {
    console.log('[App] Sending to protein viewer:', { gene, variant })
    setProteinTarget({ gene: gene.trim().toUpperCase(), variant: variant?.trim() || null })
    setPage('protein')
    setActiveTool(null)
  }

  useEffect(() => {
    handleSearch('TP53 p53 tumor suppressor apoptosis')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive context bar metadata
  const pageMeta = PAGE_META[page] ?? PAGE_META['genomic']
  const activeInstrument = activeTool ? getInstrument(activeTool) : null
  const instCat = activeInstrument ? CATEGORY_META[activeInstrument.category] : null
  const contextColor = activeInstrument ? instCat!.color : pageMeta.color

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#09090b] relative">

      {/* ── HEADER ── */}
      <header className="h-14 bg-[#0b0e15] border-b border-[#424754] flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-headline-md text-[15px] font-bold tracking-tighter text-[#e1e2ec]">NOVU RESEARCH // OS</span>
          <span className="px-2 py-0.5 border border-[#4edea3] text-[#4edea3] font-label-caps text-[9px] tracking-widest">V2.1.0-BETA</span>
        </div>

        <div ref={searchRef} className="relative w-96">
          <div className="flex items-center bg-[#1d2027]/60 backdrop-blur-md border border-[#424754] px-4 py-2 gap-3">
            <span className="material-symbols-outlined text-[#8c909f] text-[16px]">search</span>
            <input
              className="bg-transparent border-none outline-none font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:ring-0 w-full uppercase"
              placeholder="QUERY_SYSTEM_RESOURCES..."
              value={headerInput}
              onChange={e => setHeaderInput(e.target.value)}
              onFocus={() => { setHistory(loadHistory()); setShowHistory(true) }}
              onKeyDown={e => {
                if (e.key === 'Enter' && headerInput.trim()) { handleSearch(headerInput); handleNavigate('genomic') }
                if (e.key === 'Escape') setShowHistory(false)
              }}
            />
            <span className="font-label-caps text-[9px] text-[#424754] shrink-0">CMD+K</span>
            {headerInput && (
              <span className="material-symbols-outlined text-[#8c909f] text-[14px] cursor-pointer hover:text-[#e1e2ec]"
                onClick={() => { setHeaderInput(''); setShowHistory(false) }}>close</span>
            )}
          </div>
          {showHistory && history.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-[#1d2027] border border-[#424754] border-t-0 z-50">
              {history
                .filter(h => !headerInput || h.toLowerCase().includes(headerInput.toLowerCase()))
                .map((h, i) => (
                  <div key={i}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#272a31] cursor-pointer group"
                    onMouseDown={e => { e.preventDefault(); handleSearch(h); handleNavigate('genomic') }}
                  >
                    <span className="material-symbols-outlined text-[#8c909f] text-[14px]">history</span>
                    <span className="font-data-md text-[11px] text-[#c2c6d6] group-hover:text-[#e1e2ec] flex-1 truncate">{h}</span>
                    <span
                      className="material-symbols-outlined text-[14px] text-[#424754] hover:text-[#e1e2ec] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setHistory(removeFromHistory(h)) }}
                    >close</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span 
            className={`material-symbols-outlined transition-colors cursor-pointer text-[20px] ${showSystemMonitor ? 'text-[#4edea3]' : 'text-[#8c909f] hover:text-[#4edea3]'}`}
            onClick={() => setShowSystemMonitor(prev => !prev)}
          >
            memory
          </span>
          <span className="material-symbols-outlined text-[#8c909f] hover:text-[#4edea3] transition-colors cursor-pointer text-[20px]">notifications</span>
          <div className="w-8 h-8 bg-[#272a31] border border-[#424754] flex items-center justify-center">
            <span className="font-data-md text-[9px] font-bold text-[#e1e2ec]">H</span>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          activePage={page}
          activeTool={activeTool}
          onNavigate={handleNavigate}
          onToolSelect={handleToolSelect}
        />

        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Context bar */}
          <div className="h-8 border-b border-[#424754] flex items-center justify-between px-4 bg-[#0b0e15] shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-label-caps text-[10px] tracking-widest" style={{ color: contextColor }}>
                SEC // {activeInstrument ? activeInstrument.name.toUpperCase() : pageMeta.sec}
              </span>
              <div className="w-px h-3 bg-[#424754]" />
              <span className="font-label-caps text-[9px] text-[#8c909f]">SOURCE:</span>
              <span className="font-label-caps text-[9px] text-[#e1e2ec]">
                {activeInstrument ? instCat!.label : pageMeta.source}
              </span>
              {activeInstrument && (
                <span className="font-label-caps text-[9px] px-1.5 py-0.5 border"
                  style={{ color: contextColor, borderColor: `${contextColor}30` }}>
                  {activeInstrument.status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {dashLoading && page === 'genomic' && (
                <span className="font-label-caps text-[9px] text-[#4edea3] animate-pulse">PROCESSING...</span>
              )}
              {researchContext.gene && page !== 'instrument' && (
                <span className="font-label-caps text-[9px] text-[#c0c1ff] border border-[#c0c1ff]/30 px-2 py-0.5">
                  {researchContext.gene}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${dashLoading ? 'bg-[#4edea3] animate-pulse' : 'bg-[#4edea3]'}`} />
                <span className="font-label-caps text-[9px] text-[#8c909f]">LIVE</span>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-hidden">
            {page === 'genomic'           && <Dashboard articles={dashArticles} researchContext={researchContext} loading={dashLoading} query={dashQuery} onSearch={handleSearch} onNavigate={handleNavigate} />}
            {page === 'literature'        && <LiteratureSearch />}
            {page === 'genomics-explorer' && <GenomicsExplorer onNavigate={handleNavigate} onSendToProtein={handleSendToProtein} state={genomicsState} onStateChange={setGenomicsState} />}
            {page === 'protein'           && (
              <Suspense fallback={<ProteinViewerFallback />}>
                <ProteinViewer onNavigate={handleNavigate} target={proteinTarget} />
              </Suspense>
            )}
            {page === 'clinical'          && <ClinicalTrials />}
            {page === 'instrument'        && activeTool && <InstrumentPanel toolId={activeTool} onToolSelect={handleToolSelect} />}
          </div>

          {/* Status bar */}
          <div className="h-6 border-t border-[#424754] flex items-center justify-between px-4 bg-[#0b0e15] shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-label-caps text-[9px] text-[#4edea3]">NOVU_SYS_CORE</span>
              <span className="font-label-caps text-[9px] text-[#8c909f]">TEMP: 34°C</span>
              <span className="font-label-caps text-[9px] text-[#8c909f]">LOAD: 14.2%</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-label-caps text-[9px] text-[#4edea3]">STATUS: OK</span>
              <span className="font-label-caps text-[9px] text-[#8c909f]">AES-256</span>
            </div>
          </div>
        </main>

        {(page === 'genomic' || page === 'literature') && (
          <RightPanel
            page={page}
            loading={dashLoading}
            query={dashQuery}
            articleCount={dashArticles.length}
            researchContext={researchContext}
            activeTool={activeTool}
            onSearch={handleSearch}
            onNavigate={handleNavigate}
          />
        )}
      </div>

      {showSystemMonitor && (
        <div className="absolute top-14 right-6 z-[100]">
          <SystemMonitor onClose={() => setShowSystemMonitor(false)} />
        </div>
      )}
    </div>
  )
}
