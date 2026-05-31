import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from 'ngl'
import { lookupProtein } from '@/lib/api'
import type { Page, ProteinResponse, ProteinTarget, PdbEntry } from '@/types'

interface Props {
  onNavigate: (page: Page) => void
  target: ProteinTarget | null
}

type StructureSource = { kind: 'alphafold'; url: string } | { kind: 'pdb'; pdb_id: string; url: string }

const REPRESENTATIONS = [
  { id: 'cartoon',    label: 'CARTOON',     icon: 'water' },
  { id: 'ball+stick', label: 'BALL+STICK',  icon: 'scatter_plot' },
  { id: 'surface',    label: 'SURFACE',     icon: 'blur_on' },
] as const

type RepId = typeof REPRESENTATIONS[number]['id']

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] border-l-2 border-l-[#c0c1ff] p-3">
      <div className="font-label-caps text-[9px] text-[#8c909f] uppercase tracking-widest mb-1">{label}</div>
      <div className={`font-data-md text-[14px] tabular-nums ${accent ? 'text-[#c0c1ff]' : 'text-[#e1e2ec]'}`}>{value}</div>
    </div>
  )
}

export default function ProteinViewer({ onNavigate, target }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const componentRef = useRef<any>(null)
  
  // Race guard: Incrementing ID ensures only the latest load request applies its results.
  const loadIdRef = useRef(0)
  const lastLookupRef = useRef<{ gene: string; variant: string | null } | null>(null)

  const [geneInput, setGeneInput] = useState(target?.gene ?? 'TP53')
  const [variantInput, setVariantInput] = useState(target?.variant ?? '')
  const [data, setData] = useState<ProteinResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [structLoading, setStructLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<StructureSource | null>(null)
  const [representation, setRepresentation] = useState<RepId>('cartoon')
  const [stageReady, setStageReady] = useState(0) // Track stage instantiation for React 19 remounts

  // ── Helper: Apply Representations ──
  const applyRepresentations = useCallback((comp: any, rep: RepId, residuePos?: number, variant?: string | null) => {
    if (!comp) return
    comp.removeAllRepresentations()
    comp.addRepresentation(rep, { color: 'bfactor' })
    
    if (residuePos) {
      comp.addRepresentation('ball+stick', {
        sele: `${residuePos} and protein`,
        color: '#ef4444',
        aspectRatio: 3,
        radiusScale: 2,
      })
      comp.addRepresentation('label', {
        sele: `${residuePos} and protein and .CA`,
        labelType: 'format',
        labelFormat: variant ?? `R${residuePos}`,
        color: '#ef4444',
        zOffset: 2,
        attachment: 'middle-center',
        showBorder: true,
        borderColor: '#09090b',
        borderWidth: 0.3,
      })
    }
  }, [])

  // ── Initialize NGL Stage ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const stage = new Stage(container, {
      backgroundColor: '#09090b',
      quality: 'medium',
      cameraType: 'perspective',
      // three.js r155 changed light scaling (useLegacyLights=false) → NGL models
      // can render near-black. Bump intensities to compensate.
      lightIntensity: 1.8,
      ambientIntensity: 0.5,
    })
    stageRef.current = stage
    setStageReady(prev => prev + 1) // Signal that stage is now initialized

    // Immediate resize
    stage.handleResize()

    // Robust ResizeObserver to handle grid layout settlement
    const ro = new ResizeObserver(() => {
      if (!stageRef.current) return
      stage.handleResize()
      // If we have a structure, keep it framed during resize
      if (componentRef.current) {
        componentRef.current.autoView(0) // 0 duration for instant adjustment
      }
    })
    ro.observe(container)

    const handleWinResize = () => {
      if (stageRef.current) stage.handleResize()
    }
    window.addEventListener('resize', handleWinResize)

    // Periodic safety check for the first 1.5s as CSS/Fonts/Grid settle
    const interval = setInterval(() => {
      if (stageRef.current) stage.handleResize()
    }, 500)
    setTimeout(() => clearInterval(interval), 2000)

    return () => {
      clearInterval(interval)
      ro.disconnect()
      window.removeEventListener('resize', handleWinResize)
      if (stageRef.current) {
        stage.dispose()
        stageRef.current = null
      }
      componentRef.current = null
    }
  }, [])

  const handleLookup = useCallback(async (gene: string, variant: string | null) => {
    const g = gene.trim().toUpperCase()
    if (!g) {
      setError('Gene symbol required')
      return
    }
    
    // Prevent redundant lookups if same as last
    if (lastLookupRef.current?.gene === g && lastLookupRef.current?.variant === variant && data) {
      return
    }

    lastLookupRef.current = { gene: g, variant }
    setLoading(true)
    setError(null)
    setData(null)
    setSource(null)
    
    // Clear existing components immediately to avoid ghosting
    if (stageRef.current) {
      stageRef.current.removeAllComponents()
      componentRef.current = null
    }

    try {
      const res = await lookupProtein(g, variant)
      if (res.error) {
        setError(res.error)
      } else {
        setData(res)
        // Prefer AlphaFold (full-length predicted structure)
        if (res.alphafold?.cif_url) {
          setSource({ kind: 'alphafold', url: res.alphafold.cif_url })
        } else if (res.pdb_entries && res.pdb_entries.length > 0) {
          const first = res.pdb_entries[0]
          if (first.cif_url) {
            setSource({ kind: 'pdb', pdb_id: first.pdb_id, url: first.cif_url })
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }, [data]) // Added data check to prevent loop

  // ── Trigger lookup when target prop changes ──
  useEffect(() => {
    if (target?.gene) {
      const last = lastLookupRef.current
      const currentGene = target.gene.trim().toUpperCase()
      const currentVariant = target.variant?.trim() || null

      if (last && last.gene === currentGene && last.variant === currentVariant) {
        return
      }
      setGeneInput(currentGene)
      setVariantInput(currentVariant ?? '')
      handleLookup(currentGene, currentVariant)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.gene, target?.variant, handleLookup])

  // ── Load structure into NGL when source changes ──
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !source || !stageReady) return

    const myId = ++loadIdRef.current
    let isCancelled = false
    setStructLoading(true)
    setError(null)

    // Clear old stuff BEFORE loading new, to be safe
    stage.removeAllComponents()

    // Helper for reliable framing: wait until the canvas has real dimensions
    // (grid/flex layout can settle a frame or two late), then frame + force render.
    const robustFrame = (comp: any, id: number, attempt = 0) => {
      if (isCancelled || id !== loadIdRef.current) return
      const w = containerRef.current?.clientWidth ?? 0
      const h = containerRef.current?.clientHeight ?? 0
      if ((w === 0 || h === 0) && attempt < 30) {
        // Layout not settled yet — retry next frame (max ~0.5s)
        requestAnimationFrame(() => robustFrame(comp, id, attempt + 1))
        return
      }
      stage.handleResize()
      comp.autoView(0)
      stage.viewer.requestRender()
      // One more pass after the layout fully settles
      setTimeout(() => {
        if (!isCancelled && id === loadIdRef.current) {
          stage.handleResize()
          comp.autoView(300)
          stage.viewer.requestRender()
        }
      }, 200)
    }

    console.log(`[ProteinViewer] Loading structure from: ${source.url}`)

    stage.loadFile(source.url, { ext: 'cif' })
      .then((comp: any) => {
        if (isCancelled || myId !== loadIdRef.current) {
          if (comp) stage.removeComponent(comp)
          return
        }

        componentRef.current = comp

        // Apply current representation
        applyRepresentations(comp, representation, data?.residue_position ?? undefined, data?.variant)

        robustFrame(comp, myId)
        setStructLoading(false)
      })
      .catch(err => {
        if (!isCancelled && myId === loadIdRef.current) {
          console.error('[ProteinViewer] Load failed:', err)
          setError(`Failed to load structure: ${err.message ?? 'Unknown error'}`)
          setStructLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, stageReady]) // Re-run when source URL OR stage instance changes (React 19)

  // ── Update representations when they change, WITHOUT reloading the file ──
  useEffect(() => {
    const comp = componentRef.current
    if (!comp) return
    applyRepresentations(comp, representation, data?.residue_position ?? undefined, data?.variant)
  }, [representation, data?.residue_position, data?.variant, applyRepresentations])

  // ── Manual Controls ──
  const handlePdbSelect = useCallback((entry: PdbEntry) => {
    if (entry.cif_url) {
      setSource({ kind: 'pdb', pdb_id: entry.pdb_id, url: entry.cif_url })
    }
  }, [])

  const handleAlphafold = useCallback(() => {
    if (data?.alphafold?.cif_url) {
      setSource({ kind: 'alphafold', url: data.alphafold.cif_url })
    }
  }, [data])

  const recenter = useCallback(() => {
    if (componentRef.current) {
      stageRef.current?.handleResize()
      componentRef.current.autoView(800)
    }
  }, [])

  const focusMutation = useCallback(() => {
    const comp = componentRef.current
    if (!comp || !data?.residue_position) return
    stageRef.current?.handleResize()
    comp.autoView(`${data.residue_position} and protein`, 800)
  }, [data?.residue_position])

  const af = data?.alphafold
  const plddt = af?.mean_plddt
  const plddtColor = plddt == null ? '#8c909f' : plddt >= 90 ? '#4edea3' : plddt >= 70 ? '#adc6ff' : plddt >= 50 ? '#f59e0b' : '#ef4444'

  const isBusy = loading || structLoading

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090b]">

      {/* ── Header ── */}
      <header className="h-14 border-b border-[#424754] flex items-center justify-between px-6 shrink-0 bg-[#0b0e15]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#c0c1ff] text-[20px]">science</span>
          <div>
            <div className="font-headline-md text-[14px] font-semibold text-[#e1e2ec] tracking-tight">PROTEIN VIEWER</div>
            <div className="font-label-caps text-[8px] text-[#8c909f] tracking-widest">ALPHAFOLD // PDB // NGL VIEWER</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-[#c0c1ff] animate-pulse' : 'bg-[#c0c1ff]'}`} />
            <span className="font-label-caps text-[9px] text-[#8c909f]">{isBusy ? 'LOADING' : data ? 'READY' : 'IDLE'}</span>
          </div>
          <button
            onClick={() => onNavigate('genomics-explorer')}
            className="flex items-center gap-1.5 font-label-caps text-[10px] text-[#8c909f] hover:text-[#e1e2ec] transition-colors group"
          >
            <span className="material-symbols-outlined text-[14px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            BACK TO GENOMICS
          </button>
        </div>
      </header>

      {/* ── Input bar ── */}
      <section className="px-6 py-4 border-b border-[#27272a] shrink-0 bg-[#0b0e15]/40">
        <div className="grid grid-cols-1 lg:grid-cols-[180px_180px_auto] gap-3">
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">GENE</label>
            <input
              type="text"
              value={geneInput}
              onChange={e => setGeneInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup(geneInput, variantInput || null)}
              placeholder="TP53"
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#c0c1ff] uppercase"
            />
          </div>
          <div>
            <label className="font-label-caps text-[9px] text-[#8c909f] block mb-1">VARIANT (OPTIONAL)</label>
            <input
              type="text"
              value={variantInput}
              onChange={e => setVariantInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup(geneInput, variantInput || null)}
              placeholder="R175H"
              className="w-full bg-[#1d2027] border border-[#424754] px-3 py-2 font-data-md text-[12px] text-[#e1e2ec] placeholder:text-[#424754] focus:outline-none focus:border-[#c0c1ff]"
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={isBusy}
              onClick={() => handleLookup(geneInput, variantInput || null)}
              className="px-4 py-2 font-label-caps text-[10px] tracking-widest transition-all bg-[#c0c1ff] text-[#1a1b3a] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">{isBusy ? 'hourglass_empty' : 'play_arrow'}</span>
              {isBusy ? 'FETCHING...' : 'LOAD STRUCTURE'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 font-label-caps text-[10px] text-[#ef4444] tracking-wider">
            ⚠ {error}
          </div>
        )}
      </section>

      {/* ── Main grid: viewer + sidebar ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] grid-rows-[1fr_auto] lg:grid-rows-1 overflow-hidden">

        {/* ── 3D Viewer ── */}
        <div className="relative bg-[#09090b] border-r border-[#27272a] overflow-hidden min-h-[400px]">
          {/* NGL canvas mount */}
          <div ref={containerRef} className="absolute inset-0" />

          {/* Corner crosshairs */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#c0c1ff]/40 pointer-events-none" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#c0c1ff]/40 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#c0c1ff]/40 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#c0c1ff]/40 pointer-events-none" />

          {/* Source badge */}
          {source && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 bg-[#0b0e15]/80 backdrop-blur-md border border-[#424754] px-3 py-1.5">
                <span className="font-label-caps text-[8px] text-[#8c909f] tracking-widest">SOURCE</span>
                <span className="font-label-caps text-[9px] text-[#c0c1ff] tracking-wider">
                  {source.kind === 'alphafold' ? 'ALPHAFOLD PREDICTED' : `PDB ${source.pdb_id}`}
                </span>
              </div>
              {/* DEBUG INFO FOR HARDY */}
              <div className="text-[8px] font-mono text-[#8c909f] bg-black/40 px-2 rounded max-w-[300px] truncate">
                FILE: {source.url.split('/').pop()}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!source && !isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <span className="material-symbols-outlined text-[#c0c1ff]/30" style={{ fontSize: 64 }}>biotech</span>
              <div className="font-label-caps text-[11px] text-[#8c909f] tracking-widest">NO STRUCTURE LOADED</div>
              <div className="font-data-md text-[10px] text-[#424754]">Enter a gene above and click LOAD STRUCTURE</div>
            </div>
          )}

          {/* Loading overlay */}
          {isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#09090b]/60 backdrop-blur-sm z-[50]">
              <div className="w-8 h-8 border-2 border-[#c0c1ff] border-t-transparent rounded-full animate-spin" />
              <div className="font-label-caps text-[10px] text-[#c0c1ff] tracking-widest animate-pulse text-center">
                {loading ? 'FETCHING METADATA' : 'RENDERING 3D MODEL'}
                <br />
                <span className="text-[8px] text-[#8c909f] font-mono mt-2 block opacity-50">
                  {structLoading && source ? `HITTING: ${source.kind.toUpperCase()}` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Viewer controls (bottom) */}
          {source && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0b0e15]/80 backdrop-blur-md border border-[#424754] p-1">
              {REPRESENTATIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRepresentation(r.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 font-label-caps text-[9px] tracking-widest transition-all',
                    representation === r.id
                      ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                      : 'text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027]',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[12px]">{r.icon}</span>
                  {r.label}
                </button>
              ))}
              <div className="w-px h-4 bg-[#424754] mx-1" />
              <button
                onClick={recenter}
                title="Recenter view"
                className="flex items-center gap-1.5 px-2 py-1.5 font-label-caps text-[9px] text-[#8c909f] hover:text-[#e1e2ec] hover:bg-[#1d2027] transition-all"
              >
                <span className="material-symbols-outlined text-[12px]">center_focus_strong</span>
              </button>
              {data?.residue_position && (
                <button
                  onClick={focusMutation}
                  title={`Focus ${data.variant ?? `residue ${data.residue_position}`}`}
                  className="flex items-center gap-1.5 px-2 py-1.5 font-label-caps text-[9px] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[12px]">target</span>
                  MUTATION
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar: metadata + structure picker ── */}
        <aside className="overflow-y-auto custom-scrollbar bg-[#0b0e15]/40">

          {/* Protein info */}
          {data && af && !af.error && (
            <section className="p-4 border-b border-[#27272a]">
              <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-2">PROTEIN</div>
              <div className="font-headline-md text-[16px] font-semibold text-[#e1e2ec] mb-1">{data.gene}</div>
              <div className="font-data-md text-[10px] text-[#8c909f] mb-3 leading-relaxed">{af.uniprot_description}</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <a
                  href={`https://www.uniprot.org/uniprotkb/${data.uniprot_id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="font-label-caps text-[9px] px-2 py-0.5 border border-[#c0c1ff]/30 text-[#c0c1ff] hover:bg-[#c0c1ff]/10 transition-colors"
                >
                  {data.uniprot_id} ↗
                </a>
                {af.organism_name && (
                  <span className="font-label-caps text-[9px] px-2 py-0.5 border border-[#424754] text-[#8c909f]">
                    {af.organism_name.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Length" value={`${af.sequence_length ?? '—'} aa`} />
                <Stat label="pLDDT" value={plddt != null ? plddt.toFixed(1) : '—'} accent />
              </div>
              {plddt != null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-caps text-[8px] text-[#8c909f] tracking-widest">CONFIDENCE</span>
                    <span className="font-label-caps text-[9px]" style={{ color: plddtColor }}>{af.confidence_band}</span>
                  </div>
                  <div className="h-1 bg-[#1d2027] relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0" style={{ width: `${plddt}%`, backgroundColor: plddtColor }} />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Variant info */}
          {data?.variant && data.residue_position && (
            <section className="p-4 border-b border-[#27272a] bg-[#ef4444]/5">
              <div className="font-label-caps text-[9px] text-[#ef4444] tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                MUTATION HIGHLIGHTED
              </div>
              <div className="font-headline-md text-[18px] font-semibold text-[#ef4444] mb-1">{data.variant}</div>
              <div className="font-data-md text-[10px] text-[#8c909f] leading-relaxed">
                Residue {data.residue_position} highlighted in red. Click MUTATION button to focus camera.
              </div>
            </section>
          )}

          {/* Structure sources */}
          {data && (
            <section className="p-4">
              <div className="font-label-caps text-[9px] text-[#8c909f] tracking-widest mb-3">STRUCTURE SOURCES</div>

              {/* AlphaFold entry */}
              {af && !af.error && af.cif_url && (
                <button
                  onClick={handleAlphafold}
                  className={[
                    'w-full text-left bg-[#18181b] border p-3 mb-2 transition-all flex items-start gap-2.5',
                    source?.kind === 'alphafold'
                      ? 'border-[#c0c1ff] bg-[#c0c1ff]/5'
                      : 'border-[#27272a] hover:border-[#424754]',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#c0c1ff] shrink-0">auto_awesome</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-label-caps text-[9px] text-[#c0c1ff] tracking-widest">ALPHAFOLD</span>
                      <span className="font-data-md text-[9px] text-[#8c909f]">PREDICTED</span>
                    </div>
                    <div className="font-data-md text-[10px] text-[#c2c6d6] truncate">{af.entry_id}</div>
                    <div className="font-data-md text-[9px] text-[#8c909f] mt-0.5">{af.sequence_length} aa · pLDDT {plddt?.toFixed(1)}</div>
                  </div>
                </button>
              )}

              {/* PDB entries */}
              {data.pdb_entries.map(p => (
                <button
                  key={p.pdb_id}
                  onClick={() => handlePdbSelect(p)}
                  disabled={!p.cif_url}
                  className={[
                    'w-full text-left bg-[#18181b] border p-3 mb-2 transition-all flex items-start gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed',
                    source?.kind === 'pdb' && source.pdb_id === p.pdb_id
                      ? 'border-[#4edea3] bg-[#4edea3]/5'
                      : 'border-[#27272a] hover:border-[#424754]',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#4edea3] shrink-0">science</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-label-caps text-[9px] text-[#4edea3] tracking-widest">PDB {p.pdb_id}</span>
                      <span className="font-data-md text-[9px] text-[#8c909f]">{p.method}</span>
                    </div>
                    <div className="font-data-md text-[10px] text-[#c2c6d6] line-clamp-2 leading-snug">{p.title}</div>
                    <div className="font-data-md text-[9px] text-[#8c909f] mt-0.5">
                      {p.resolution_a != null ? `${p.resolution_a.toFixed(2)}Å` : 'NMR'} · {p.chain_count} chain{p.chain_count === 1 ? '' : 's'} · {p.residue_count} residues
                    </div>
                  </div>
                </button>
              ))}

              {(!af?.cif_url && data.pdb_entries.length === 0) && (
                <div className="font-data-md text-[10px] text-[#424754] text-center py-6">No structures available</div>
              )}
            </section>
          )}

          {/* Footer disclaimer */}
          <section className="p-4 border-t border-[#27272a]">
            <div className="font-data-md text-[9px] text-[#424754] leading-relaxed">
              Structures rendered via <span className="text-[#c0c1ff]">NGL Viewer</span>. AlphaFold provides full-length predictions; PDB entries are experimental (X-ray / NMR / Cryo-EM). Mutation positions parsed from variant nomenclature (e.g. R175H → residue 175).
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
