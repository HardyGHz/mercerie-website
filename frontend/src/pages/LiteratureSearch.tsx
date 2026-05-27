import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, ExternalLink, AlertCircle } from 'lucide-react'
import { searchLiterature } from '@/lib/api'
import type { Article } from '@/types'

const HISTORY_KEY = 'novu_search_history'
function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function removeFromHistory(q: string): string[] {
  const h = loadHistory().filter(x => x !== q)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
  return h
}
function saveToHistory(q: string) {
  const h = [q, ...loadHistory().filter(x => x !== q)].slice(0, 8)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TopBar({ query, count }: { query: string; count: number | null }) {
  return (
    <div className="h-[52px] border-b border-[#27272a] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="font-label-caps text-label-caps text-primary">SEC-01 // LITERATURE</span>
        {query && (
          <>
            <span className="text-outline-variant text-[10px]">/</span>
            <span className="font-data-md text-[10px] text-outline max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
              {query}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 font-data-md text-[10px] text-outline">
        {count !== null && <span>{count} result{count !== 1 ? 's' : ''}</span>}
        <span className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-primary inline-block" />
          LIVE
        </span>
      </div>
    </div>
  )
}

function SearchBar({
  value,
  onChange,
  onSearch,
  onHistoryPick,
  loading,
}: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  onHistoryPick: (q: string) => void
  loading: boolean
}) {
  const disabled = loading || !value.trim()
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowHistory(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = history.filter(h => !value || h.toLowerCase().includes(value.toLowerCase()))

  return (
    <div className="px-6 py-5 border-b border-[#27272a] shrink-0">
      <div className="flex gap-2">
        <div className="flex-1 relative" ref={wrapRef}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none z-10" />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => { setHistory(loadHistory()); setShowHistory(true) }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !loading) { onSearch(); setShowHistory(false) }
              if (e.key === 'Escape') setShowHistory(false)
            }}
            placeholder="e.g. CRISPR gene editing, p53 tumor suppressor..."
            className="w-full bg-[#18181b] border border-[#27272a] text-on-surface font-data-md text-[12px] py-2.5 pl-8 pr-3 outline-none focus:border-primary transition-colors"
          />
          {showHistory && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-[#1d2027] border border-[#27272a] border-t-0 z-50">
              {filtered.map((h, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#272a31] cursor-pointer group"
                  onMouseDown={e => { e.preventDefault(); setShowHistory(false); onHistoryPick(h) }}
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
        <button
          onClick={() => { onSearch(); setShowHistory(false) }}
          disabled={disabled}
          className={[
            'font-label-caps text-label-caps px-5 border transition-all whitespace-nowrap',
            disabled
              ? 'bg-[#18181b] border-[#27272a] text-outline cursor-not-allowed'
              : 'bg-primary border-primary text-[#09090b] cursor-pointer hover:brightness-110',
          ].join(' ')}
        >
          {loading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </div>
      <div className="mt-2 font-data-md text-[10px] text-outline">
        Supports NCBI query syntax: boolean operators, MeSH terms, field tags [tiab], [au], date ranges
      </div>
    </div>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false)
  const authorStr = article.authors.slice(0, 3).join(', ') + (article.authors.length > 3 ? ' et al.' : '')
  const abstract = article.abstract ?? ''
  const truncated = abstract.length > 300

  return (
    <div className="bg-[#18181b] border border-[#27272a] p-5 hover:border-[#4edea3]/40 transition-all duration-200 group">
      {/* Header: journal + date */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-label-caps text-[9px] text-[#8c909f] tracking-wider">
          {article.journal ?? 'UNKNOWN JOURNAL'}
        </span>
        <span className="font-data-md text-[10px] text-[#8c909f]">
          {article.pubdate ?? '—'}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-data-md text-[13px] text-[#e1e2ec] leading-relaxed mb-2 group-hover:text-[#4edea3] transition-colors">
        {article.title ?? '—'}
      </h3>

      {/* Authors */}
      <div className="font-data-md text-[10px] text-[#8c909f] mb-3">
        {authorStr || '—'}
      </div>

      {/* Abstract */}
      {abstract && (
        <div className="font-data-md text-[11px] text-[#8c909f]/80 leading-relaxed mb-3">
          {expanded || !truncated ? abstract : abstract.slice(0, 300) + '…'}
          {truncated && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="bg-transparent border-none text-[#adc6ff] cursor-pointer font-data-md text-[9px] px-1 hover:opacity-70 transition-opacity"
            >
              {expanded ? '[COLLAPSE]' : '[EXPAND]'}
            </button>
          )}
        </div>
      )}

      {/* Footer: PMID + DOI */}
      <div className="flex items-center gap-4 pt-3 border-t border-[#27272a]">
        <span className="font-label-caps text-[9px] text-[#424754]">PMID: {article.pmid}</span>
        {article.doi && (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-label-caps text-[9px] text-[#adc6ff] no-underline hover:opacity-70 transition-opacity"
          >
            <ExternalLink size={10} />
            DOI
          </a>
        )}
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-label-caps text-[9px] text-[#4edea3] no-underline hover:opacity-70 transition-opacity ml-auto"
        >
          <ExternalLink size={10} />
          PUBMED
        </a>
      </div>
    </div>
  )
}

function EmptyState({ searched }: { searched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      {searched
        ? <AlertCircle size={24} strokeWidth={1} className="text-outline-variant" />
        : <Search size={24} strokeWidth={1} className="text-outline-variant" />
      }
      <span className="font-label-caps text-label-caps text-outline">
        {searched ? 'NO RESULTS FOUND' : 'ENTER A QUERY TO SEARCH PUBMED'}
      </span>
      <span className="font-data-md text-[10px] text-outline-variant">
        {searched ? 'Try broader terms or different MeSH descriptors' : 'Access 36M+ biomedical articles'}
      </span>
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#18181b] border border-[#27272a] p-5">
          <div className="flex justify-between mb-3">
            <div className="skeleton h-[10px] w-24" />
            <div className="skeleton h-[10px] w-16" />
          </div>
          <div className="skeleton h-[13px] w-4/5 mb-2" />
          <div className="skeleton h-[10px] w-2/5 mb-3" />
          <div className="skeleton h-[10px] w-full mb-1" />
          <div className="skeleton h-[10px] w-3/4" />
        </div>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LiteratureSearch() {
  const [localQuery, setLocalQuery] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    saveToHistory(trimmed)
    setLoading(true)
    setQuery(trimmed)
    setArticles([])
    try {
      const res = await searchLiterature(trimmed, 20)
      setArticles(res.results)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [loading])

  const handleLocalSearch = useCallback(() => handleSearch(localQuery), [localQuery, handleSearch])

  return (
    <div className="flex flex-col bg-surface overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <TopBar query={query} count={!loading ? articles.length : null} />
      <SearchBar value={localQuery} onChange={setLocalQuery} onSearch={handleLocalSearch} onHistoryPick={(q) => { setLocalQuery(q); handleSearch(q) }} loading={loading} />

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading && <SkeletonCards />}
        {!loading && articles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {articles.map(a => (
              <ArticleCard key={a.pmid} article={a} />
            ))}
          </div>
        )}
        {!loading && articles.length === 0 && (
          <EmptyState searched={!!query} />
        )}
      </div>
    </div>
  )
}
