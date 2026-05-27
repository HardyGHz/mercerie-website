import type { Page } from '@/types'
import { INSTRUMENTS_BY_CATEGORY, CATEGORY_META, type InstrumentCategory } from '@/lib/instruments'

const PRIMARY_WORKSPACES: { id: Page; icon: string; label: string; tag: string; desc: string; color: string }[] = [
  {
    id: 'genomic', icon: 'hub', label: 'Research OS', tag: 'OS', color: '#4edea3',
    desc: 'Multi-modal research dashboard — literature results, variant panel, proteomics overview, agent log',
  },
  {
    id: 'literature', icon: 'menu_book', label: 'Literature', tag: 'LIT', color: '#adc6ff',
    desc: 'Direct PubMed search across 36M+ biomedical articles with abstract viewer and DOI links',
  },
  {
    id: 'protein', icon: 'science', label: 'Protein Viewer', tag: 'PDB', color: '#c0c1ff',
    desc: 'AlphaFold & PDB structure viewer — 3D ribbon model, binding site analysis, domain annotation',
  },
  {
    id: 'clinical', icon: 'clinical_notes', label: 'Clinical', tag: 'CLIN', color: '#f59e0b',
    desc: 'ClinicalTrials.gov browser — phase tracking, eligibility criteria, trial matching by gene target',
  },
]

const TOOLBOX_CATEGORIES: { cat: InstrumentCategory; icon: string; label: string }[] = [
  { cat: 'genomics',   icon: 'genetics',      label: 'Genomics'    },
  { cat: 'protein',    icon: 'deployed_code', label: 'Protein'     },
  { cat: 'systems',    icon: 'account_tree',  label: 'Systems'     },
  { cat: 'clinical',   icon: 'lab_profile',   label: 'Clinical DB' },
  { cat: 'literature', icon: 'article',       label: 'Literature'  },
  { cat: 'utility',    icon: 'construction',  label: 'Utility'     },
]

interface Props {
  activePage: Page
  activeTool: string | null
  onNavigate: (page: Page) => void
  onToolSelect: (toolId: string) => void
}

export default function Sidebar({ activePage, activeTool, onNavigate, onToolSelect }: Props) {
  // Derive active category from activeTool
  const activeToolCat = activeTool?.startsWith('cat:')
    ? activeTool.slice(4)
    : null

  return (
    <aside className="w-14 bg-[#0b0e15] border-r border-[#424754] flex flex-col items-center z-40 shrink-0">

      {/* Logo */}
      <div className="w-8 h-8 border border-[#4edea3]/30 flex items-center justify-center mt-3 mb-3 shrink-0">
        <span className="material-symbols-outlined text-[#4edea3] text-[14px]">biotech</span>
      </div>

      {/* ── PRIMARY WORKSPACES ── */}
      <div className="w-full flex flex-col items-center gap-0.5">
        {PRIMARY_WORKSPACES.map(({ id, icon, label, tag, desc, color }) => {
          const active = activePage === id && activeTool === null
          return (
            <button
              key={id}
              title={`${label} — ${desc}`}
              onClick={() => onNavigate(id)}
              className={[
                'w-full h-[52px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 border-l-2 px-1',
                active
                  ? 'bg-[#272a31]'
                  : 'border-transparent text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027]',
              ].join(' ')}
              style={active ? { borderColor: color, color } : undefined}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <span className="font-label-caps text-[7px] tracking-widest leading-none opacity-70">{tag}</span>
            </button>
          )
        })}
      </div>

      {/* ── TOOLBOX DIVIDER ── */}
      <div className="w-full flex flex-col items-center my-2 shrink-0">
        <div className="w-6 h-px bg-[#424754]" />
        <span className="font-label-caps text-[7px] text-[#424754] tracking-widest mt-1">TOOLS</span>
      </div>

      {/* ── TOOLBOX: 6 category icons ── */}
      <div className="w-full flex flex-col items-center gap-0.5">
        {TOOLBOX_CATEGORIES.map(({ cat, icon, label }) => {
          const count = INSTRUMENTS_BY_CATEGORY[cat]?.length ?? 0
          const active = activeToolCat === cat
          const meta = CATEGORY_META[cat]
          return (
            <button
              key={cat}
              title={`${label} (${count} instruments)`}
              onClick={() => onToolSelect(`cat:${cat}`)}
              className={[
                'w-10 h-10 flex items-center justify-center transition-all duration-150 border-l-2 relative',
                active
                  ? 'bg-[#272a31]'
                  : 'border-transparent text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027]',
              ].join(' ')}
              style={active ? { borderColor: meta.color, color: meta.color } : undefined}
            >
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
            </button>
          )
        })}
      </div>

      {/* ── SETTINGS (pinned bottom) ── */}
      <div className="mt-auto w-full flex flex-col items-center py-2 border-t border-[#424754]">
        <button
          title="System Config"
          onClick={() => onNavigate('system')}
          className={[
            'w-10 h-10 flex items-center justify-center transition-all border-l-2',
            activePage === 'system' && activeTool === null
              ? 'border-[#8c909f] bg-[#272a31] text-[#8c909f]'
              : 'border-transparent text-[#424754] hover:text-[#8c909f] hover:bg-[#1d2027]',
          ].join(' ')}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
      </div>
    </aside>
  )
}
