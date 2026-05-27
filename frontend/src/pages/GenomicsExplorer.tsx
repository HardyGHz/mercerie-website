import type { Page } from '@/types'

interface Props {
  onNavigate: (page: Page) => void
}

export default function GenomicsExplorer({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#09090b]">
      <span className="material-symbols-outlined text-[48px] text-[#4edea3]/40">genetics</span>
      <div className="font-label-caps text-[11px] text-[#8c909f] tracking-widest">GENOMICS EXPLORER</div>
      <div className="font-data-md text-[11px] text-[#424754]">COMING SOON — Full genome browser in development</div>
      <button
        onClick={() => onNavigate('genomic')}
        className="mt-4 px-4 py-2 font-label-caps text-[10px] border border-[#424754] text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027] transition-all"
      >
        BACK TO RESEARCH OS
      </button>
    </div>
  )
}
