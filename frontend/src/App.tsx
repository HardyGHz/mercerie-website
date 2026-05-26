import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import LiteratureSearch from '@/pages/LiteratureSearch'
import GenomicsExplorer from '@/pages/GenomicsExplorer'
import ClinicalTrials from '@/pages/ClinicalTrials'
import SystemConfig from '@/pages/SystemConfig'
import { searchLiterature } from '@/lib/api'
import { logSearch } from '@/lib/supabase'
import type { Article, Page } from '@/types'

const HISTORY_KEY = 'novu_search_history'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveToHistory(q: string) {
  const h = [q, ...loadHistory().filter(x => x !== q)].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

export default function App() {
  const [page, setPage] = useState<Page>('genomic')
  const [headerInput, setHeaderInput] = useState('')
  const [dashQuery, setDashQuery] = useState('')
  const [dashArticles, setDashArticles] = useState<Article[]>([])
  const [dashLoading, setDashLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
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
    try {
      const res = await searchLiterature(q, 10)
      setDashArticles(res.results)
      logSearch(q, res.results.length)
    } catch {
      // errors surfaced in agent log via Dashboard
    } finally {
      setDashLoading(false)
    }
  }

  // Auto-load on mount with default research context
  useEffect(() => {
    handleSearch('TP53 p53 tumor suppressor apoptosis')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (page === 'genomics-explorer') {
    return (
      <div className="fixed inset-0 z-50 bg-surface">
        <GenomicsExplorer onNavigate={setPage} />
      </div>
    )
  }

  return (
    <div className="bg-surface overflow-hidden" style={{ height: '100vh' }}>
      {/* Fixed Header */}
      <header className="bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center h-16 px-margin-desktop w-full z-50 fixed top-0">
        <div className="flex items-center gap-8">
          <span className="font-label-caps text-label-caps tracking-widest text-secondary uppercase">OS // RESEARCH</span>
          <div ref={searchRef} className="relative w-96">
            <div className="flex items-center bg-surface-container-high px-4 py-2 border border-outline-variant gap-3">
              <span className="material-symbols-outlined text-outline text-lg">search</span>
              <input
                className="bg-transparent border-none outline-none text-data-md font-data-md placeholder:text-outline-variant focus:ring-0 w-full"
                placeholder="NOVU BRAIN // SEARCH"
                type="text"
                value={headerInput}
                onChange={e => setHeaderInput(e.target.value)}
                onFocus={() => { setHistory(loadHistory()); setShowHistory(true) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && headerInput.trim()) {
                    handleSearch(headerInput)
                    setPage('genomic')
                  }
                  if (e.key === 'Escape') setShowHistory(false)
                }}
              />
              {headerInput && (
                <span
                  className="material-symbols-outlined text-outline text-base cursor-pointer hover:text-on-surface"
                  onClick={() => { setHeaderInput(''); setShowHistory(false) }}
                >close</span>
              )}
            </div>
            {showHistory && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#18181b] border border-[#27272a] border-t-0 z-50">
                {history
                  .filter(h => !headerInput || h.toLowerCase().includes(headerInput.toLowerCase()))
                  .map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container-high cursor-pointer group"
                      onMouseDown={e => { e.preventDefault(); handleSearch(h); setPage('genomic') }}
                    >
                      <span className="material-symbols-outlined text-outline text-sm">history</span>
                      <span className="font-data-md text-data-md text-on-surface-variant group-hover:text-on-surface flex-1 truncate">{h}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-2">memory</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-2">sensors</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-2">potted_plant</span>
          </div>
          <div className="h-8 w-8 bg-primary rounded-none border border-outline-variant overflow-hidden flex items-center justify-center">
            <span className="font-data-md text-[9px] font-bold text-on-primary">H</span>
          </div>
        </div>
      </header>

      {/* Fixed Sidebar */}
      <Sidebar activePage={page} onNavigate={setPage} />

      {/* Main Content */}
      <main className="ml-64 pt-16 h-screen bg-surface overflow-hidden">
        {page === 'genomic' && (
          <Dashboard
            articles={dashArticles}
            loading={dashLoading}
            query={dashQuery}
            onSearch={handleSearch}
            onNavigate={setPage}
          />
        )}
        {page === 'literature' && <LiteratureSearch />}
        {page === 'protein'    && <SystemConfig />}
        {page === 'clinical'   && <ClinicalTrials />}
        {page === 'system'     && <SystemConfig />}
      </main>
    </div>
  )
}
