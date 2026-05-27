import type { Page } from '@/types'

interface Props {
  onNavigate: (page: Page) => void
}

export default function ProteinViewer({ onNavigate }: Props) {
  return (
    <div className="p-margin-desktop bg-surface h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <span className="font-label-caps text-label-caps text-tertiary">SEC-04 // PROTEOMICS</span>
          <h1 className="font-headline-md text-headline-md text-on-surface mt-1 uppercase">Protein Structure Viewer</h1>
        </div>
        <span className="font-data-md text-data-md text-outline border border-outline-variant px-3 py-1">PHASE II</span>
      </div>

      {/* Placeholder viewer */}
      <div className="flex-1 bg-[#18181b] border border-[#27272a] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-tertiary" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-tertiary" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-tertiary" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-tertiary" />

        <span className="material-symbols-outlined text-tertiary/40" style={{ fontSize: 72 }}>biotech</span>

        <div className="text-center">
          <div className="font-label-caps text-label-caps text-tertiary mb-2">NGL VIEWER — PHASE II</div>
          <div className="font-data-md text-data-md text-outline max-w-sm text-center leading-relaxed">
            3D protein structure rendering with PDB integration will be available in Phase II.
          </div>
        </div>

        <button
          onClick={() => onNavigate('literature')}
          className="font-label-caps text-label-caps text-tertiary border border-tertiary/40 px-4 py-2 hover:border-tertiary hover:bg-tertiary/10 transition-all"
        >
          SEARCH LITERATURE INSTEAD
        </button>
      </div>

      {/* Stats row — placeholder */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'PDB Structures', value: '—' },
          { label: 'Resolution',     value: '—' },
          { label: 'Chain Length',   value: '—' },
          { label: 'Binding Aff',    value: '—' },
        ].map(s => (
          <div key={s.label} className="bg-[#18181b] border border-[#27272a] p-4 border-l-2 border-l-tertiary">
            <div className="font-label-caps text-[10px] text-outline uppercase mb-1">{s.label}</div>
            <div className="font-data-lg text-data-lg text-outline">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
