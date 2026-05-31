import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { lookupGenomics } from '@/lib/api'
import type { Page, GenomicsVariant } from '@/types'

// Persistent state lives in App.tsx so it survives navigation (the component
// unmounts on page change). Only transient loading/error stay local.
export interface GenomicsState {
  gene: string
  variantInput: string
  variants: GenomicsVariant[]
  lastGene: string | null
}

interface Props {
  onNavigate: (page: Page) => void
  onSendToProtein?: (gene: string, variant: string | null) => void
  state: GenomicsState
  onStateChange: Dispatch<SetStateAction<GenomicsState>>
}

const POP_LABELS: Record<string, string> = {
  afr: 'African',
  ami: 'Amish',
  amr: 'Latino/Admixed',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  fin: 'Finnish',
  nfe: 'Non-Finnish European',
  sas: 'South Asian',
  mid: 'Middle Eastern',
  remaining: 'Remaining',
}

const STATUS_BADGE: Record<string, string> = {
  PATHOGENIC: 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10',
  VUS:        'text-[#c0c1ff] border-[#c0c1ff]/30 bg-[#c0c1ff]/10',
  BENIGN:     'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10',
  LOADING:    'text-[#8c909f] border-[#424754] bg-[#1d2027]',
}

const PRESETS: { gene: string; variants: string[]; label: string }[] = [
  { gene: 'TP53', variants: ['R175H', 'R248W', 'R248Q', 'R273H', 'G245S'], label: 'TP53 hotspots' },
  { gene: 'BRCA1', variants: ['C61G', 'R71G', 'R1699W', 'M1775R'], label: 'BRCA1 missense' },
  { gene: 'KRAS', variants: ['G12D', 'G12V', 'G13D', 'Q61H'], label: 'KRAS oncogenic' },
  { gene: 'EGFR', variants: ['L858R', 'T790M', 'G719A'], label: 'EGFR lung cancer' },
]

function FreqBar({ af }: { af: number | null }) {
  if (af === null || af === undefined) return <span className="text-[#424754] font-data-md text-[10px]">—</span>
  const pct = Math.min(100, Math.max(0.5, af * 100000)) // log-ish scale for tiny AFs
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-[#1d2027] relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-[#4edea3]" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-data-md text-[10px] text-[#c2c6d6] tabular-nums">{af < 0.00001 ? af.toExponential(2) : af.toFixed(5)}</span>
    </div>
  )
}

function VariantRow({ v, gene, onSendToProtein }: { v: GenomicsVariant; gene: string | null; onSendToProtein?: (gene: string, variant: string | null) => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusCls = STATUS_BADGE[v.status] ?? STATUS_BADGE['VUS']
  const hasPops = v.populations.length > 0

  return (
    <>
      <tr className="border-b border-[#27272a] hover:bg-[#1d2027]/40 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasPops && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="material-symbols-outlined text-[14px] text-[#424754] hover:text-[#e1e2ec] transition-colors"
              >
                {expanded ? 'expand_more' : 'chevron_right'}
              </button>
            )}
            <span className="font-data-md text-[12px] text-[#e1e2ec]">{v.id}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <FreqBar af={v.af} />
        </td>
        <td className="px-4 py-3">
          <span className={`font-label-caps text-[9px] px-2 py-0.5 border tracking-wider ${statusCls}`}>
            {v.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-data-md text-[10px] text-[#8c909f]">
            {v.gnomad_variant_id ?? '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            {gene && onSendToProtein && (
              <button
                onClick={() => onSendToProtein(gene, v.id)}
                title={`Open ${gene} ${v.id} in 3D viewer with mutation highlighted`}
                className="flex items-center gap-1 font-label-caps text-[9px] text-[#c0c1ff] hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined text-[12px]">science</span>
                3D
              </button>
            )}
            {v.gnomad_variant_id && (
              <a
                href={`https://gnomad.broadinstitute.org/variant/${v.gnomad_variant_id}?dataset=gnomad_r4`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-caps text-[9px] text-[#4edea3] hover:opacity-70 transition-opacity"
              >
                gnomAD →
              </a>
            )}
          </div>
        </td>
      </tr>
      {expanded && hasPops && (
        <tr className="border-b border-[#27272a] bg-[#0b0e15]">
          <td colSpan={5} className="px-4 py-3">
            <div className="font-label-caps text-[9px] text-[#8c909f] mb-2 tracking-widest">POPULATION FREQUENCIES</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {v.populations.map(p => (
                <div key={p.id ?? ''} className="bg-[#18181b] border border-[#27272a] p-2">
                  <div className="font-label-caps text-[8px] text-[#8c909f] tracking-wider mb-1">
                    {POP_LABELS[p.id ?? ''] ?? (p.id ?? '').toUpperCase()}
                  </div>
                  <div className="font-data-md text-[11px] text-[#e1e2ec] tabular-nums">
                    {p.af === null || p.af === undefined ? '—' : p.af < 0.00001 ? p.af.toExponential(2) : p.af.toFixed(5)}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function GenomicsExplorer({ onNavigate, onSendToProtein, state, onStateChange }: Props) {
  const { gene, variantInput, variants, lastGene } = state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setGene = useCallback((g: string) => onStateChange(s => ({ ...s, gene: g })), [onStateChange])
  const setVariantInput = useCallback((v: string) => onStateChange(s => ({ ...s, variantInput: v })), [onStateChange])

  const handleAnalyze = useCallback(async () => {
    const g = gene.trim().toUpperCase()
    const vList = variantInput.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    if (!g || vList.length === 0) {
      setError('Enter a gene symbol and at least one variant')
      return
    }
    setLoading(true)
    setError(null)
    onStateChange(s => ({ ...s, variants: [] }))
    try {
      const res = await lookupGenomics(g, vList)
      onStateChange(s => ({ ...s, variants: res.variants, lastGene: res.gene }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }, [gene, variantInput, onStateChange])

  const handlePreset = useCallback((p: { gene: string; variants: string[] }) => {
    onStateChange(s => ({ ...s, gene: p.gene, variantInput: p.variants.join(', ') }))
  }, [onStateChange])

  const pathogenic = variants.filter(v => v.status === 'PATHOGENIC').length
  const benign = variants.filter(v => v.status === 'BENIGN').length
  const vus = variants.filter(v => v.status === 'VUS').length

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090b]">

      {/* ── Header ── */}
      <header className="h-14 border-b border-[#424754] flex items-center justify-between px-6 shrink-0 bg-[#0b0e15]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#4edea3] text-[20px]">genetics</span>
          <div>
            <div className="font-headline-md text-[14px] font-semibold text-[#e1e2ec] tracking-tight">GENOMICS EXPLORER</div>
            <div className="font-label-caps text-[8px] text-[#8c909f] tracking-widest">CLINVAR // GNOMAD R4 // LIVE</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[#4edea3] animate-pulse' : 'bg-[#4edea3]'}`} />
            <span className="font-label-caps text-[9px] text-[#8c909f]">{loading ? 'QUERYING' : 'READY'}</span>
          </div>
          <button
            onClick={() => onNavigate('genomic')}
            className="flex items-center gap-1.5 font-label-caps text-[10px] text-[#8c909f] hover:text-[#e1e2ec] transition-colors group"
          >
            <span className="material-symbols-outlined text-[14px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            BACK TO RESEARCH OS
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ── Input section ── */}
        <section className="p-6 border-b border-[#27272a]">
          <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-3">VARIANT QUERY</div>
          <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-3 mb-3">
            <div>
              <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">GENE SYMBOL</label>
              <input
                type="text"
                value={gene}
                onChange={e => setGene(e.target.value)}
                placeholder="TP53"
                className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#4edea3] uppercase"
              />
            </div>
            <div>
              <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">VARIANTS (COMMA OR SPACE SEPARATED)</label>
              <input
                type="text"
                value={variantInput}
                onChange={e => setVariantInput(e.target.value)}
                placeholder="R175H, R248W, R273H"
                className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#4edea3]"
              />
            </div>
            <div className="flex items-end">
              <button
                disabled={loading}
                onClick={handleAnalyze}
                className="px-4 py-2 font-label-caps text-[10px] tracking-widest transition-all bg-[#4edea3] text-[#003824] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">{loading ? 'hourglass_empty' : 'play_arrow'}</span>
                {loading ? 'ANALYZING...' : 'ANALYZE'}
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="font-label-caps text-[9px] text-[#424754] tracking-wider">PRESETS:</span>
            {PRESETS.map(p => (
              <button
                key={p.gene}
                onClick={() => handlePreset(p)}
                className="font-data-md text-[10px] text-[#8c909f] hover:text-[#4edea3] border border-[#424754] hover:border-[#4edea3]/30 px-2 py-1 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 font-label-caps text-[10px] text-[#ef4444] tracking-wider">
              ⚠ {error}
            </div>
          )}
        </section>

        {/* ── Summary stats ── */}
        {variants.length > 0 && (
          <section className="px-6 py-4 border-b border-[#27272a] bg-[#0b0e15]/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-1">GENE</div>
                <div className="font-data-md text-[16px] text-[#4edea3] tracking-tight">{lastGene}</div>
              </div>
              <div>
                <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-1">VARIANTS</div>
                <div className="font-data-md text-[16px] text-[#e1e2ec] tracking-tight">{variants.length}</div>
              </div>
              <div>
                <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-1">PATHOGENIC</div>
                <div className="font-data-md text-[16px] text-[#ef4444] tracking-tight">{pathogenic}</div>
              </div>
              <div>
                <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-1">VUS / BENIGN</div>
                <div className="font-data-md text-[16px] text-[#c0c1ff] tracking-tight">{vus} / {benign}</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Results table ── */}
        <section className="p-6">
          <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-3 flex items-center gap-2">
            VARIANT TABLE
            <div className="flex-1 h-px bg-[#424754]" />
            {loading && <span className="font-label-caps text-[9px] text-[#4edea3] animate-pulse">FETCHING LIVE DATA</span>}
          </div>

          <div className="border border-[#27272a]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0b0e15] border-b border-[#27272a]">
                  <th className="px-4 py-2 text-left font-label-caps text-[9px] text-[#8c909f] tracking-widest">VARIANT</th>
                  <th className="px-4 py-2 text-left font-label-caps text-[9px] text-[#8c909f] tracking-widest">GNOMAD AF</th>
                  <th className="px-4 py-2 text-left font-label-caps text-[9px] text-[#8c909f] tracking-widest">CLINVAR</th>
                  <th className="px-4 py-2 text-left font-label-caps text-[9px] text-[#8c909f] tracking-widest">GNOMAD ID</th>
                  <th className="px-4 py-2 text-right font-label-caps text-[9px] text-[#8c909f] tracking-widest">LINK</th>
                </tr>
              </thead>
              <tbody>
                {loading && variants.length === 0 && (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#27272a]">
                      <td className="px-4 py-3"><div className="skeleton h-3 w-16" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-3 w-24" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-3 w-20" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-3 w-32" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-3 w-12 ml-auto" /></td>
                    </tr>
                  ))
                )}
                {!loading && variants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <span className="material-symbols-outlined text-[32px] text-[#424754] block mb-2">science</span>
                      <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest">NO DATA</div>
                      <div className="font-data-md text-[10px] text-[#424754] mt-1">Enter a gene and variants above, then click ANALYZE</div>
                    </td>
                  </tr>
                )}
                {variants.map(v => <VariantRow key={v.id} v={v} gene={lastGene} onSendToProtein={onSendToProtein} />)}
              </tbody>
            </table>
          </div>

          <div className="mt-3 font-data-md text-[9px] text-[#424754] leading-relaxed">
            Data sources: ClinVar (NCBI E-utilities) for pathogenicity, gnomAD r4 GraphQL for population allele frequency.
            Pathogenic = disease-associated. VUS = variant of uncertain significance. AF shown is overall (exome preferred, genome fallback).
          </div>
        </section>
      </div>
    </div>
  )
}
