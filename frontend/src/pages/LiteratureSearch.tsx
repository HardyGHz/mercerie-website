import { useState, useMemo, useCallback } from 'react'
import { Search, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle } from 'lucide-react'
import type { Article } from '@/types'
import { searchLiterature } from '@/lib/api'

type SortField = 'title' | 'journal' | 'pubdate'
type SortDir = 'asc' | 'desc'

// ─── Styles ────────────────────────────────────────────────────────────────

const T = {
  accent: '#adc6ff',
  bg: '#09090b',
  surface: '#10131a',
  surface2: '#18181b',
  border: '#27272a',
  text: '#e1e2ec',
  muted: '#8c909f',
  muted2: '#424754',
  font: "'JetBrains Mono', ui-monospace, monospace",
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TopBar({ query, count }: { query: string; count: number | null }) {
  return (
    <div style={{
      height: 52,
      borderBottom: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: T.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.font }}>
          SEC-01 // LITERATURE
        </span>
        {query && (
          <>
            <span style={{ color: T.muted2, fontSize: 10 }}>/</span>
            <span style={{ color: T.muted, fontSize: 10, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {query}
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: T.muted, fontSize: 10 }}>
        {count !== null && (
          <span>{count} result{count !== 1 ? 's' : ''}</span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
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
  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: T.muted,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && onSearch()}
            placeholder="e.g. CRISPR gene editing, p53 tumor suppressor..."
            autoFocus
            style={{
              width: '100%',
              background: T.surface2,
              border: `1px solid ${T.border}`,
              borderRadius: 0,
              color: T.text,
              fontFamily: T.font,
              fontSize: 12,
              padding: '10px 12px 10px 34px',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = T.accent }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border }}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={loading || !value.trim()}
          style={{
            background: loading || !value.trim() ? T.surface2 : T.accent,
            border: `1px solid ${loading || !value.trim() ? T.border : T.accent}`,
            color: loading || !value.trim() ? T.muted : '#09090b',
            fontFamily: T.font,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            padding: '0 20px',
            cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </div>
      <div style={{ marginTop: 8, color: T.muted, fontSize: 10 }}>
        Supports NCBI query syntax: boolean operators, MeSH terms, field tags [tiab], [au], date ranges
      </div>
    </div>
  )
}

function SortIcon({ field, active, dir }: { field: SortField; active: SortField | null; dir: SortDir }) {
  if (active !== field) return <ChevronsUpDown size={10} style={{ color: T.muted2, marginLeft: 4 }} />
  return dir === 'asc'
    ? <ChevronUp size={10} style={{ color: T.accent, marginLeft: 4 }} />
    : <ChevronDown size={10} style={{ color: T.accent, marginLeft: 4 }} />
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
          <td style={{ padding: '12px 16px', width: 60 }}>
            <div className="skeleton" style={{ height: 10, width: 40 }} />
          </td>
          <td style={{ padding: '12px 16px' }}>
            <div className="skeleton" style={{ height: 10, width: `${60 + Math.random() * 30}%`, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 8, width: `${40 + Math.random() * 20}%` }} />
          </td>
          <td style={{ padding: '12px 16px', width: 120 }}>
            <div className="skeleton" style={{ height: 10, width: 80 }} />
          </td>
          <td style={{ padding: '12px 16px', width: 160 }}>
            <div className="skeleton" style={{ height: 10, width: 120 }} />
          </td>
          <td style={{ padding: '12px 16px', width: 60 }}>
            <div className="skeleton" style={{ height: 10, width: 36 }} />
          </td>
          <td style={{ padding: '12px 16px', width: 50 }}>
            <div className="skeleton" style={{ height: 10, width: 24 }} />
          </td>
        </tr>
      ))}
    </>
  )
}

function EmptyState({ searched }: { searched: boolean }) {
  if (!searched) {
    return (
      <tr>
        <td colSpan={6}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            color: T.muted,
            gap: 12,
          }}>
            <Search size={24} strokeWidth={1} style={{ color: T.muted2 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.08em' }}>ENTER A QUERY TO SEARCH PUBMED</span>
            <span style={{ fontSize: 10, color: T.muted2 }}>Access 36M+ biomedical articles</span>
          </div>
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <td colSpan={6}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          color: T.muted,
          gap: 12,
        }}>
          <AlertCircle size={24} strokeWidth={1} style={{ color: T.muted2 }} />
          <span style={{ fontSize: 11, letterSpacing: '0.08em' }}>NO RESULTS FOUND</span>
          <span style={{ fontSize: 10, color: T.muted2 }}>Try broader terms or different MeSH descriptors</span>
        </div>
      </td>
    </tr>
  )
}

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const authorStr = article.authors.slice(0, 3).join(', ') + (article.authors.length > 3 ? ' et al.' : '')
  const abstract = article.abstract ?? ''
  const truncated = abstract.length > 160

  return (
    <tr
      style={{
        borderBottom: `1px solid ${T.border}`,
        background: hovered ? '#16161a' : 'transparent',
        transition: 'background 0.1s',
        verticalAlign: 'top',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* # */}
      <td style={{ padding: '11px 16px', color: T.muted2, fontSize: 10, whiteSpace: 'nowrap', width: 50 }}>
        {String(index + 1).padStart(2, '0')}
      </td>

      {/* Title + Abstract */}
      <td style={{ padding: '11px 16px' }}>
        <div style={{ color: T.text, fontSize: 12, lineHeight: 1.5, marginBottom: abstract ? 5 : 0 }}>
          {article.title ?? '—'}
        </div>
        {abstract && (
          <div style={{ color: T.muted, fontSize: 10, lineHeight: 1.6 }}>
            {expanded || !truncated
              ? abstract
              : abstract.slice(0, 160) + '…'}
            {truncated && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.accent,
                  cursor: 'pointer',
                  fontFamily: T.font,
                  fontSize: 9,
                  padding: '0 4px',
                  letterSpacing: '0.06em',
                }}
              >
                {expanded ? '[LESS]' : '[MORE]'}
              </button>
            )}
          </div>
        )}
      </td>

      {/* Authors */}
      <td style={{ padding: '11px 16px', color: T.muted, fontSize: 10, whiteSpace: 'nowrap', width: 140, verticalAlign: 'top' }}>
        {authorStr || '—'}
      </td>

      {/* Journal */}
      <td style={{ padding: '11px 16px', color: T.muted, fontSize: 10, width: 180, verticalAlign: 'top' }}>
        {article.journal ?? '—'}
      </td>

      {/* Year */}
      <td style={{ padding: '11px 16px', color: T.muted, fontSize: 10, whiteSpace: 'nowrap', width: 70, verticalAlign: 'top' }}>
        {article.pubdate?.slice(0, 4) ?? '—'}
      </td>

      {/* DOI */}
      <td style={{ padding: '11px 16px', width: 50, verticalAlign: 'top' }}>
        {article.doi ? (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            title={article.doi}
            style={{
              color: T.accent,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.7' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          >
            <ExternalLink size={11} />
          </a>
        ) : (
          <span style={{ color: T.muted2, fontSize: 10 }}>—</span>
        )}
      </td>
    </tr>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    color: T.muted,
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textAlign: 'left',
    borderBottom: `1px solid ${T.border}`,
    background: T.surface,
    position: 'sticky',
    top: 0,
    zIndex: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  const sortable = (field: SortField): React.CSSProperties => ({
    ...thStyle,
    cursor: 'pointer',
    color: sortField === field ? T.accent : T.muted,
  })

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
          <th style={thStyle}>#</th>
          <th
            style={sortable('title')}
            onClick={() => handleSort('title')}
          >
            TITLE <SortIcon field="title" active={sortField} dir={sortDir} />
          </th>
          <th style={thStyle}>AUTHORS</th>
          <th
            style={sortable('journal')}
            onClick={() => handleSort('journal')}
          >
            JOURNAL <SortIcon field="journal" active={sortField} dir={sortDir} />
          </th>
          <th
            style={sortable('pubdate')}
            onClick={() => handleSort('pubdate')}
          >
            YEAR <SortIcon field="pubdate" active={sortField} dir={sortDir} />
          </th>
          <th style={thStyle}>DOI</th>
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
    <div style={{
      margin: '16px 24px 0',
      padding: '10px 14px',
      background: '#1a0f0f',
      border: '1px solid #7f1d1d',
      color: '#ffb4ab',
      fontSize: 11,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <span><AlertCircle size={11} style={{ display: 'inline', marginRight: 6 }} />{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: '#ffb4ab', cursor: 'pointer', fontFamily: T.font, fontSize: 10 }}
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar query={lastQuery} count={searched && !loading ? articles.length : null} />
      <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} loading={loading} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody><SkeletonRows /></tbody>
          </table>
        )}
        {!loading && articles.length > 0 && <ResultsTable articles={articles} />}
        {!loading && articles.length === 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><EmptyState searched={searched} /></tbody>
          </table>
        )}
      </div>
    </div>
  )
}

