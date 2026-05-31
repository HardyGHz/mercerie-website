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

export default function Dashboard({ articles, researchContext, loading, query, onNavigate }: Props) {
  return (
    <div className="p-3 bg-[#09090b] overflow-hidden relative" style={{ height: '100%' }}>

      {/* Corner crosshairs */}
      <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[#424754] pointer-events-none z-10" />
      <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[#424754] pointer-events-none z-10" />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[#424754] pointer-events-none z-10" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#424754] pointer-events-none z-10" />

      {/* Bento grid */}
      <div className="bento-grid" style={{ height: '100%', gridTemplateRows: '7fr 5fr' }}>

        {/* ── SEC-04 // PROTEOMICS (top-left, big) ── */}
        <div
          className="col-span-8 bg-[#18181b] border border-[#27272a] p-4 relative overflow-hidden group cursor-pointer hover:border-[#4edea3]/40 transition-all duration-300 flex flex-col"
          onClick={() => onNavigate('protein')}
        >
          {/* Corner pips */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#c0c1ff]/40" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#c0c1ff]/40" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#c0c1ff]/40" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#c0c1ff]/40" />

          <div className="flex justify-between items-start mb-3 shrink-0">
            <div>
              <span className="font-label-caps text-[10px] text-[#c0c1ff] tracking-widest">SEC-04 // PROTEOMICS</span>
              <h2 className="font-headline-md text-[16px] font-semibold text-[#e1e2ec] mt-0.5 uppercase">
                RECOMBINANT {researchContext.proteinName ?? 'P53'}-L2 FOLD
              </h2>
            </div>
            <div className="flex gap-2">
              <span className="font-data-md text-[10px] text-[#8c909f] border border-[#424754] px-2 py-0.5">PDB: 2OCJ</span>
              <span className="font-data-md text-[10px] text-[#4edea3] border border-[#4edea3]/30 px-2 py-0.5">RES: 1.85Å</span>
            </div>
          </div>

          {/* Protein image */}
          <div className="flex-1 bg-black/40 border border-[#424754]/30 flex items-center justify-center relative group-hover:border-[#c0c1ff]/20 transition-all min-h-0">
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_2px] opacity-40" />
            <img
              className="w-full h-full object-cover opacity-60 mix-blend-screen absolute inset-0"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2cboae55SBlcg3BsAJecl3QWUfnRbuxmW_t4SlY87lv_xvDbfPZK2HNymv3qQpUst6tyilHSpFDhlIVsc9etJP29wdQLWf6r9iunKQmWlCzV1A7TypPlCqBrgYq6iRKww43WHu7YcXJXFUhieAqtIIp3UYXwSoZAz7VNj5e2y_M2qc8DYEXmQChAVSFZX3a95WoQgYpIwFq4bqNtIQ25B3Br1f0C2PKxaAfHpQ-TWFTRuNEbsOG1jmb_gl__sAr3WHN6AW3ezfqo"
              alt="Protein structure"
            />
            <div className="absolute top-2 left-2 font-label-caps text-[9px] text-[#c0c1ff]/60 bg-black/60 px-1.5 py-0.5">SEC-04 // ANALYZING...</div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-3 shrink-0">
            {[
              { label: 'Chain Length', value: '393 AA',  cls: 'text-[#e1e2ec]' },
              { label: 'Helix Index',  value: '12.4%',   cls: 'text-[#e1e2ec]' },
              { label: 'Sheet Density',value: '31.8%',   cls: 'text-[#e1e2ec]' },
              { label: 'Binding Aff',  value: '0.08 nM', cls: 'text-[#4edea3]' },
            ].map(s => (
              <div key={s.label} className="border-l border-[#c0c1ff]/30 pl-2">
                <div className="font-label-caps text-[9px] text-[#8c909f] uppercase">{s.label}</div>
                <div className={`font-data-md text-[13px] font-medium ${s.cls}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEC-02 // GENOMICS (top-right) ── */}
        <div
          className="col-span-4 bg-[#18181b] border border-[#27272a] p-4 flex flex-col cursor-pointer hover:border-[#4edea3]/40 transition-all duration-300"
          onClick={() => onNavigate('genomic')}
        >
          <div className="flex justify-between items-center mb-3 shrink-0">
            <span className="font-label-caps text-[10px] text-[#4edea3] tracking-widest">
              SEC-02 // GENOMICS {researchContext.gene ? `(${researchContext.gene})` : ''}
            </span>
            <span className="material-symbols-outlined text-[#8c909f] text-[16px]">genetics</span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton h-3 w-16" />
                    <div className="skeleton h-3 w-8" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : researchContext.variants.length > 0 ? (
              <table className="w-full text-left font-data-md text-[11px]">
                <thead>
                  <tr className="text-[#8c909f] border-b border-[#424754]">
                    <th className="pb-2 font-label-caps text-[9px]">VARIANT</th>
                    <th className="pb-2 font-label-caps text-[9px]">FREQ</th>
                    <th className="pb-2 font-label-caps text-[9px]">CLINVAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#424754]/20">
                  {researchContext.variants.map(v => (
                    <tr key={v.id}>
                      <td className="py-1.5 text-[#adc6ff]">{v.id}</td>
                      <td className="py-1.5 text-[#e1e2ec]">{v.freq}</td>
                      <td className="py-1.5">
                        {v.status === 'LOADING'
                          ? <span className="px-1 border border-[#424754] text-[#8c909f] animate-pulse">…</span>
                          : <span className={`px-1 border ${v.cls}`}>{v.status}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-[#424754] font-label-caps text-[10px]">
                NO VARIANT DATA
              </div>
            )}
          </div>
        </div>

        {/* ── SEC-01 // LITERATURE (bottom, full width) ── */}
        <div
          className="col-span-12 bg-[#18181b] border border-[#27272a] p-4 flex flex-col overflow-hidden cursor-pointer hover:border-[#adc6ff]/30 transition-all duration-300"
          onClick={() => onNavigate('literature')}
        >
          <div className="flex justify-between items-center mb-3 shrink-0">
            <span className="font-label-caps text-[10px] text-[#adc6ff] tracking-widest">SEC-01 // LITERATURE</span>
            <div className="flex items-center gap-3">
              {query && (
                <span className="font-data-md text-[10px] text-[#8c909f] truncate max-w-48">
                  QUERY: {query.slice(0, 40)}{query.length > 40 ? '...' : ''}
                </span>
              )}
              <span className="material-symbols-outlined text-[#8c909f] text-[16px]">menu_book</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="border-l-2 border-[#424754] pl-3">
                    <div className="skeleton h-2 w-24 mb-2" />
                    <div className="skeleton h-3 w-full mb-1" />
                    <div className="skeleton h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {articles.slice(0, 6).map((a, i) => (
                  <div
                    key={a.pmid || i}
                    className="border-l-2 border-[#424754] pl-3 hover:border-[#adc6ff] transition-colors"
                    onClick={e => {
                      e.stopPropagation()
                      logBrowse(a.pmid, a.title ?? null, a.journal ?? null, a.pubdate ?? null, query)
                      onNavigate('literature')
                    }}
                  >
                    <div className="font-data-md text-[9px] text-[#8c909f]">
                      {a.journal ?? 'PubMed'}{a.pubdate ? ` · ${a.pubdate}` : ''}
                    </div>
                    <div className="font-data-md text-[12px] text-[#e1e2ec] leading-snug mt-0.5">
                      {(a.title ?? '').slice(0, 80)}{(a.title?.length ?? 0) > 80 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { source: 'Nature Genetics',  time: '2h ago', title: 'Novel structural insights into p53 inactivation mechanisms...' },
                  { source: 'Cell Reports',      time: '5h ago', title: 'Chromatin remodeling by the NuRD complex in development...'    },
                  { source: 'Science',           time: '1d ago', title: 'High-throughput screening of CRISPR-Cas9 libraries...'          },
                ].map((p, i) => (
                  <div key={i} className="border-l-2 border-[#424754] pl-3 hover:border-[#adc6ff] transition-colors cursor-pointer"
                    onClick={e => { e.stopPropagation(); onNavigate('literature') }}
                  >
                    <div className="font-data-md text-[9px] text-[#8c909f]">{p.source} · {p.time}</div>
                    <div className="font-data-md text-[12px] text-[#e1e2ec] leading-snug mt-0.5">{p.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
