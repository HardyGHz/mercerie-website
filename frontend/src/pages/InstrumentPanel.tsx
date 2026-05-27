import { useState } from 'react'
import { getInstrument, CATEGORY_META, INSTRUMENTS_BY_CATEGORY, type InstrumentCategory } from '@/lib/instruments'

interface Props {
  toolId: string
  onToolSelect?: (id: string) => void
}

const STATUS_DOT: Record<string, string> = {
  active:        'bg-[#4edea3]',
  beta:          'bg-[#adc6ff]',
  'coming-soon': 'bg-[#424754]',
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 font-label-caps text-[10px] text-[#8c909f] hover:text-[#e1e2ec] transition-colors group"
    >
      <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
      BACK
    </button>
  )
}

function CategoryBrowser({ category, onToolSelect, onBack }: { category: InstrumentCategory; onToolSelect?: (id: string) => void; onBack?: () => void }) {
  const instruments = INSTRUMENTS_BY_CATEGORY[category] ?? []
  const meta = CATEGORY_META[category]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090b]">
      {/* Header */}
      <div className="p-6 border-b border-[#424754] shrink-0">
        <div className="mb-4"><BackButton onClick={() => onBack?.()} /></div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-label-caps text-[9px] px-1.5 py-0.5 border tracking-widest"
            style={{ color: meta.color, borderColor: `${meta.color}40` }}>
            {meta.label}
          </span>
          <span className="font-data-md text-[10px] text-[#424754]">{instruments.length} instruments</span>
        </div>
        <h1 className="font-headline-md text-[20px] font-semibold text-[#e1e2ec]">{meta.label} TOOLBOX</h1>
        <p className="font-data-md text-[11px] text-[#8c909f] mt-1 leading-relaxed">{meta.desc}</p>
      </div>

      {/* Instrument list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="flex flex-col gap-2">
          {instruments.map(inst => (
            <button
              key={inst.id}
              onClick={() => onToolSelect?.(inst.id)}
              className="w-full text-left bg-[#18181b] border border-[#27272a] p-4 hover:border-[#424754] transition-all group flex items-center gap-4"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ color: meta.color }}>{inst.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-data-md text-[13px] text-[#e1e2ec] group-hover:text-white">{inst.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[inst.status]}`} />
                </div>
                <p className="font-data-md text-[10px] text-[#8c909f] truncate">{inst.tagline}</p>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#424754] group-hover:text-[#8c909f] shrink-0">chevron_right</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:       { label: 'ACTIVE',       cls: 'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10' },
  beta:         { label: 'BETA',         cls: 'text-[#adc6ff] border-[#adc6ff]/30 bg-[#adc6ff]/10' },
  'coming-soon':{ label: 'COMING SOON',  cls: 'text-[#8c909f] border-[#424754] bg-[#1d2027]' },
}

export default function InstrumentPanel({ toolId, onToolSelect }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  // Category browser mode
  if (toolId.startsWith('cat:')) {
    const cat = toolId.slice(4) as InstrumentCategory
    return <CategoryBrowser category={cat} onToolSelect={onToolSelect} onBack={() => onToolSelect?.('back')} />
  }

  const inst = getInstrument(toolId)

  if (!inst) {
    return (
      <div className="h-full flex items-center justify-center text-[#424754] font-label-caps text-[11px]">
        INSTRUMENT NOT FOUND: {toolId}
      </div>
    )
  }

  const cat = CATEGORY_META[inst.category]
  const statusBadge = STATUS_BADGE[inst.status]
  const isRunnable = inst.status !== 'coming-soon'
  const allFilled = inst.inputs.filter(i => i.required).every(i => inputs[i.id]?.trim())

  async function handleRun() {
    if (!inst || !isRunnable || !allFilled) return
    setRunning(true)
    setOutput(null)

    if (inst.id === 'pubmed-database') {
      try {
        const res = await fetch('http://localhost:8000/api/search/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: inputs['query'], max_results: parseInt(inputs['max_results'] ?? '10') }),
        })
        const data = await res.json()
        const articles = data.results ?? []
        setOutput(
          articles.length === 0
            ? 'No results found.'
            : articles.map((a: { title?: string; journal?: string; pubdate?: string; pmid: string }) =>
                `[${a.pmid}] ${a.title ?? 'Untitled'}\n   ${a.journal ?? ''} · ${a.pubdate ?? ''}`
              ).join('\n\n')
        )
      } catch {
        setOutput('ERROR: Could not reach backend. Make sure the server is running.')
      }
    } else if (inst.id === 'clinvar-database') {
      try {
        const res = await fetch('http://localhost:8000/api/enrichment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gene: inputs['gene'] || null, variants: [inputs['variant']] }),
        })
        const data = await res.json()
        const v = data[0]
        setOutput(`VARIANT: ${v.id}\nSTATUS:  ${v.status}\nFREQ:    ${v.freq}`)
      } catch {
        setOutput('ERROR: Could not reach backend.')
      }
    }

    setRunning(false)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090b]">

      {/* Instrument header */}
      <div className="p-6 border-b border-[#424754] shrink-0">
        <div className="mb-4">
          <BackButton onClick={() => onToolSelect?.(`cat:${inst.category}`)} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-[20px]" style={{ color: cat.color }}>{inst.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-label-caps text-[9px] tracking-widest px-1.5 py-0.5 border"
                style={{ color: cat.color, borderColor: `${cat.color}40` }}>
                {cat.label}
              </span>
              <span className={`font-label-caps text-[9px] px-1.5 py-0.5 border ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>
            <h1 className="font-headline-md text-[18px] font-semibold text-[#e1e2ec]">{inst.name.toUpperCase()}</h1>
          </div>
        </div>
        <p className="font-data-md text-[12px] text-[#8c909f] leading-relaxed">{inst.tagline}</p>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-[9px] text-[#424754]">IN:</span>
            <span className="font-data-md text-[10px] text-[#c2c6d6]">{inst.inputLabel}</span>
          </div>
          <div className="w-px h-3 bg-[#424754]" />
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-[9px] text-[#424754]">OUT:</span>
            <span className="font-data-md text-[10px] text-[#c2c6d6]">{inst.outputLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 p-6">

        {/* Input parameters */}
        <div>
          <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-4 flex items-center gap-2">
            INPUT PARAMETERS
            <div className="flex-1 h-px bg-[#424754]" />
          </div>

          {inst.status === 'coming-soon' ? (
            <div className="border border-dashed border-[#424754] p-6 text-center">
              <span className="material-symbols-outlined text-[#424754] text-[32px] block mb-2">construction</span>
              <div className="font-label-caps text-[11px] text-[#424754]">INSTRUMENT IN DEVELOPMENT</div>
              <div className="font-data-md text-[11px] text-[#424754]/60 mt-1">Backend skill not yet connected</div>
            </div>
          ) : (
            <div className="space-y-4">
              {inst.inputs.map(input => (
                <div key={input.id}>
                  <label className="font-label-caps text-[10px] text-[#8c909f] block mb-1.5">
                    {input.label}{input.required && <span style={{ color: cat.color }}> *</span>}
                  </label>
                  {input.type === 'select' ? (
                    <select
                      className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] focus:outline-none focus:border-[#4edea3] appearance-none"
                      value={inputs[input.id] ?? ''}
                      onChange={e => setInputs(prev => ({ ...prev, [input.id]: e.target.value }))}
                    >
                      {input.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#4edea3]"
                      placeholder={input.placeholder}
                      value={inputs[input.id] ?? ''}
                      onChange={e => setInputs(prev => ({ ...prev, [input.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  disabled={!allFilled || running}
                  onClick={handleRun}
                  className="flex items-center gap-2 px-4 py-2 font-label-caps text-[11px] tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: allFilled ? cat.color : '#272a31', color: allFilled ? '#003824' : '#8c909f' }}
                >
                  <span className="material-symbols-outlined text-[16px]">{running ? 'hourglass_empty' : 'play_arrow'}</span>
                  {running ? 'RUNNING...' : 'RUN ANALYSIS'}
                </button>
                <button
                  onClick={() => { setInputs({}); setOutput(null) }}
                  className="flex items-center gap-2 px-4 py-2 font-label-caps text-[11px] tracking-widest border border-[#424754] text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027] transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">clear</span>
                  CLEAR
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        <div>
          <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-4 flex items-center gap-2">
            OUTPUT
            <div className="flex-1 h-px bg-[#424754]" />
            {running && <span className="font-label-caps text-[9px] text-[#4edea3] animate-pulse">PROCESSING</span>}
            {output && !running && <span className="font-label-caps text-[9px] text-[#4edea3]">COMPLETE</span>}
          </div>

          <div className="bg-[#0b0e15] border border-[#424754] p-4 min-h-32 font-data-md text-[12px] leading-relaxed">
            {running ? (
              <div className="text-[#4edea3] animate-pulse">{'>> Executing query...'}</div>
            ) : output ? (
              <pre className="text-[#e1e2ec] whitespace-pre-wrap text-[11px]">{output}</pre>
            ) : (
              <div className="text-[#424754]">{'>> Awaiting input. Fill in the required fields and press RUN ANALYSIS.'}</div>
            )}
          </div>
        </div>

        {/* Chain to */}
        {inst.chainTo.length > 0 && (
          <div>
            <div className="font-label-caps text-[10px] text-[#8c909f] tracking-widest mb-3 flex items-center gap-2">
              CHAIN TO
              <div className="flex-1 h-px bg-[#424754]" />
            </div>
            <div className="flex flex-wrap gap-2">
              {inst.chainTo.map(id => {
                const target = getInstrument(id)
                if (!target) return null
                const tcat = CATEGORY_META[target.category]
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 border border-[#424754] hover:border-[#4edea3]/30 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[12px]" style={{ color: tcat.color }}>{target.icon}</span>
                    <span className="font-label-caps text-[9px] text-[#c2c6d6]">{target.name}</span>
                    <span className="material-symbols-outlined text-[10px] text-[#424754]">arrow_forward</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
