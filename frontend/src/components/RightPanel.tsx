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

const PAGE_OPS: Record<Page, { primary: { icon: string; label: string }; secondary: { icon: string; label: string } }> = {
  'genomic':           { primary: { icon: 'search',         label: 'NEW SEARCH'    }, secondary: { icon: 'download',  label: 'EXPORT REPORT' } },
  'literature':        { primary: { icon: 'library_add',    label: 'SEARCH PAPERS' }, secondary: { icon: 'csv',       label: 'EXPORT CSV'    } },
  'protein':           { primary: { icon: 'play_arrow',     label: 'RUN ANALYSIS'  }, secondary: { icon: 'download',  label: 'EXPORT PDB'    } },
  'clinical':          { primary: { icon: 'clinical_notes', label: 'FETCH TRIALS'  }, secondary: { icon: 'download',  label: 'EXPORT JSON'   } },
  'genomics-explorer': { primary: { icon: 'genetics',       label: 'EXPLORE'       }, secondary: { icon: 'download',  label: 'EXPORT'        } },
  'instrument':        { primary: { icon: 'play_arrow',     label: 'RUN TOOL'      }, secondary: { icon: 'clear',     label: 'CLEAR'         } },
}

export default function RightPanel({ page, loading, articleCount, researchContext }: Props) {
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
      <div className="p-4 grid grid-cols-2 gap-2">
        <div className="p-2 border border-[#424754] bg-[#1d2027] flex flex-col gap-0.5">
          <span className="font-label-caps text-[9px] text-[#8c909f]">ARTICLES</span>
          <span className="font-data-md text-data-md text-[#4edea3]">{loading ? '...' : articleCount}</span>
        </div>
        <div className="p-2 border border-[#424754] bg-[#1d2027] flex flex-col gap-0.5">
          <span className="font-label-caps text-[9px] text-[#8c909f]">VARIANTS</span>
          <span className="font-data-md text-data-md text-[#c0c1ff]">{researchContext.variants.length || '—'}</span>
        </div>
      </div>

      {/* Spacer to keep the panel full-height even without the log */}
      <div className="flex-1 bg-black/20" />
    </aside>
  )
}
