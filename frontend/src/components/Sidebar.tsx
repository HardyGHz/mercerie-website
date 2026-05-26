import type { Page } from '@/types'

const NAV = [
  { id: 'genomics-explorer' as Page, label: 'GENOMICS',   icon: 'genetics' },
  { id: 'literature'        as Page, label: 'LITERATURE', icon: 'menu_book' },
  { id: 'clinical'          as Page, label: 'CLINICAL',   icon: 'clinical_notes' },
  { id: 'system'            as Page, label: 'SYSTEM',     icon: 'settings' },
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <aside className="bg-surface-container-low fixed left-0 top-0 h-full w-64 border-r border-outline-variant flex flex-col pt-20 pb-8 z-40">
      {/* Logo */}
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary">biotech</span>
          </div>
          <div>
            <div className="font-display text-headline-md font-bold text-on-surface">SEC-04</div>
            <div className="text-[10px] tracking-widest text-secondary font-data-md">STATUS: ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(({ id, label, icon }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={[
                'font-label-caps text-label-caps cursor-pointer duration-200 ease-in-out flex items-center gap-3 px-6 py-3 w-full border-none text-left border-l-2',
                active
                  ? 'text-secondary bg-secondary-container/10 border-secondary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 border-transparent',
              ].join(' ')}
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-6 pt-4 border-t border-outline-variant mt-auto">
        <div className="text-[10px] font-data-md text-outline mb-2">COORD: 46.7667 N, 23.5833 E</div>
        <div className="text-[10px] font-data-md text-outline">UPTIME: 452:12:08</div>
      </div>
    </aside>
  )
}
