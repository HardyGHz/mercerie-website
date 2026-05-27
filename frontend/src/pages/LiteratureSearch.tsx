import { useState, useMemo, useCallback } from 'react'
import { Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle } from 'lucide-react'
import type { Article } from '@/types'
import { searchLiterature } from '@/lib/api'

type SortField = 'title' | 'journal' | 'pubdate'
type SortDir = 'asc' | 'desc'

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
  loading,
}: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  loading: boolean
}) {
  const disabled = loading || !value.trim()
  return (
    <div className="px-6 py-5 border-b border-[#27272a] shrink-0">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && onSearch()}
            placeholder="e.g. CRISPR gene editing, p53 tumor suppressor..."
            autoFocus
            className="w-full bg-[#18181b] border border-[#27272a] text-on-surface font-data-md text-[12px] py-2.5 pl-8 pr-3 outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={onSearch}
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

function SortIcon({ field, active, dir }: { field: SortField; active: SortField | null; dir: SortDir }) {
  if (active !== field) return <ChevronsUpDown size={10} className="text-outline-variant ml-1 inline-block" />
  return dir === 'asc'
    ? <ChevronUp size={10} className="text-primary ml-1 inline-block" />
    : <ChevronDown size={10} className="text-primary ml-1 inline-block" />
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-[#27272a]">
          <td className="p-4 w-[50px]"><div className="skeleton h-[10px] w-10" /></td>
          <td className="p-4">
            <div className="skeleton h-[10px] w-3/5 mb-1.5" />
            <div className="skeleton h-[8px] w-2/5" />
          </td>
          <td className="p-4 w-[140px]"><div className="skeleton h-[10px] w-20" /></td>
          <td className="p-4 w-[180px]"><div className="skeleton h-[10px] w-28" /></td>
          <td className="p-4 w-[70px]"><div className="skeleton h-[10px] w-10" /></td>
          <td className="p-4 w-[50px]"><div className="skeleton h-[10px] w-6" /></td>
        </tr>
      ))}
    </>
  )
}

function EmptyState({ searched }: { searched: boolean }) {
  return (
    <tr>
      <td colSpan={6}>
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
      </td>
    </tr>
  )
}

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const authorStr = article.authors.slice(0, 3).join(', ') + (article.authors.length > 3 ? ' et al.' : '')
  const abstract = article.abstract ?? ''
  const truncated = abstract.length > 160

  return (
    <tr className="border-b border-[#27272a] hover:bg-[#16161a] transition-colors align-top">
      <td className="p-3 font-data-md text-[10px] text-outline-variant whitespace-nowrap w-[50px]">
        {String(index + 1).padStart(2, '0')}
      </td>

      <td className="p-3">
        <div className="font-data-md text-[12px] text-on-surface leading-relaxed">
          {article.title ?? '—'}
        </div>
        {abstract && (
          <div className="font-data-md text-[10px] text-outline leading-relaxed mt-1">
            {expanded || !truncated ? abstract : abstract.slice(0, 160) + '…'}
            {truncated && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="bg-transparent border-none text-primary cursor-pointer font-data-md text-[9px] px-1 hover:opacity-70 transition-opacity"
              >
                {expanded ? '[LESS]' : '[MORE]'}
              </button>
            )}
          </div>
        )}
      </td>

      <td className="p-3 font-data-md text-[10px] text-outline whitespace-nowrap w-[140px]">
        {authorStr || '—'}
      </td>

      <td className="p-3 font-data-md text-[10px] text-outline w-[180px]">
        {article.journal ?? '—'}
      </td>

      <td className="p-3 font-data-md text-[10px] text-outline whitespace-nowrap w-[70px]">
        {article.pubdate?.slice(0, 4) ?? '—'}
      </td>

      <td className="p-3 w-[50px]">
        {article.doi ? (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            title={article.doi}
            className="text-primary inline-flex items-center gap-1 font-data-md text-[10px] no-underline hover:opacity-70 transition-opacity"
          >
            <ExternalLink size={11} />
          </a>
        ) : (
          <span className="font-data-md text-[10px] text-outline-variant">—</span>
        )}
      </td>
    </tr>
  )
}

function ResultsTable({ articles }: { articles: Article[] }) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField])

  const sorted = useMemo(() => {
    if (!sortField) return articles
    return [...articles].sort((a, b) => {
      const va = (a[sortField] ?? '') as string
      const vb = (b[sortField] ?? '') as string
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [articles, sortField, sortDir])

  const thBase = 'px-4 py-2.5 font-label-caps text-[9px] text-outline text-left border-b border-[#27272a] bg-[#0d0f14] sticky top-0 z-10 whitespace-nowrap select-none'
  const thSort = (field: SortField) =>
    `${thBase} cursor-pointer ${sortField === field ? 'text-primary' : 'hover:text-on-surface-variant'} transition-colors`

  return (
    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: 50 }} />
        <col />
        <col style={{ width: 140 }} />
        <col style={{ width: 180 }} />
        <col style={{ width: 70 }} />
        <col style={{ width: 50 }} />
      </colgroup>
      <thead>
        <tr>
          <th className={thBase}>#</th>
          <th className={thSort('title')} onClick={() => handleSort('title')}>
            TITLE <SortIcon field="title" active={sortField} dir={sortDir} />
          </th>
          <th className={thBase}>AUTHORS</th>
          <th className={thSort('journal')} onClick={() => handleSort('journal')}>
            JOURNAL <SortIcon field="journal" active={sortField} dir={sortDir} />
          </th>
          <th className={thSort('pubdate')} onClick={() => handleSort('pubdate')}>
            YEAR <SortIcon field="pubdate" active={sortField} dir={sortDir} />
          </th>
          <th className={thBase}>DOI</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((a, i) => (
          <ArticleRow key={a.pmid} article={a} index={i} />
        ))}
      </tbody>
    </table>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-6 mt-4 px-4 py-2.5 bg-error/10 border border-error/40 text-error font-data-md text-[11px] flex items-center justify-between gap-3 shrink-0">
      <span className="flex items-center gap-1.5">
        <AlertCircle size={11} className="inline shrink-0" />
        {message}
      </span>
      <button
        onClick={onDismiss}
        className="bg-transparent border-none text-error cursor-pointer font-data-md text-[10px] hover:opacity-70 transition-opacity"
      >
        [X]
      </button>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LiteratureSearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setSearched(true)
    setLastQuery(q)
    try {
      const data = await searchLiterature(q, 20)
      setArticles(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [query, loading])

  return (
    <div className="flex flex-col bg-surface overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <TopBar query={lastQuery} count={searched && !loading ? articles.length : null} />
      <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} loading={loading} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading && (
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <tbody><SkeletonRows /></tbody>
          </table>
        )}
        {!loading && articles.length > 0 && <ResultsTable articles={articles} />}
        {!loading && articles.length === 0 && (
          <table className="w-full border-collapse">
            <tbody><EmptyState searched={searched} /></tbody>
          </table>
        )}
      </div>
    </div>
  )
}
