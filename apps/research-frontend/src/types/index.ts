export interface Article {
  pmid: string
  title: string | null
  authors: string[]
  journal: string | null
  pubdate: string | null
  doi: string | null
  abstract?: string | null
}

export interface SearchResponse {
  results: Article[]
  query: string
  count: number
  researchContext: ResearchContext
}

export type Page = 'literature' | 'protein' | 'genomic' | 'clinical' | 'genomics-explorer' | 'instrument'

export interface Variant {
  id: string        // pl. "R175H"
  freq: string      // pl. "0.024" vagy "—" ha nem kinyerhető
  status: 'PATHOGENIC' | 'VUS' | 'BENIGN' | 'LOADING'
  cls: string       // Tailwind color classes
}

export interface ProteinStructure {
  pdbId: string
  resolution: string
  chainLength: string
  bindingAffinity: string
}

export interface ResearchContext {
  gene: string | null       // pl. "TP53", null ha nem azonosítható
  variants: Variant[]       // max 4, deduplikált
  proteinName: string | null // pl. "P53"
}

export interface PopulationFreq {
  id: string | null   // 'afr', 'nfe', 'eas', etc.
  af: number | null
}

export interface GenomicsVariant {
  id: string                          // pl. "R175H"
  freq: string                        // gnomAD AF formatted ('0.00024' or '—')
  af: number | null                   // raw float
  gnomad_variant_id: string | null    // pl. "17-7676154-G-A"
  populations: PopulationFreq[]       // per-population AF
  status: 'PATHOGENIC' | 'VUS' | 'BENIGN'
  cls: string                         // Tailwind color classes
}

export interface GenomicsResponse {
  gene: string
  variants: GenomicsVariant[]
}

export interface AlphaFoldInfo {
  uniprot_id: string | null
  cif_url: string | null
  pdb_url: string | null
  pae_url: string | null
  sequence: string | null
  sequence_length: number | null
  mean_plddt: number | null
  confidence_band: string | null
  model_created_date: string | null
  organism_name: string | null
  gene_symbol: string | null
  uniprot_description: string | null
  entry_id: string | null
  error: string | null
}

export interface PdbEntry {
  pdb_id: string
  title: string | null
  resolution_a: number | null
  method: string | null
  chain_count: number | null
  residue_count: number | null
  cif_url: string | null
  pdb_url: string | null
}

export interface ProteinResponse {
  gene: string
  uniprot_id: string | null
  alphafold: AlphaFoldInfo | null
  pdb_entries: PdbEntry[]
  variant: string | null
  residue_position: number | null
  error: string | null
}

export interface ProteinTarget {
  gene: string
  variant: string | null
}

export interface InterventionShort {
  type: string | null
  name: string | null
}

export interface InterventionFull extends InterventionShort {
  description: string | null
}

export interface TrialSite {
  facility: string | null
  city: string | null
  state: string | null
  country: string | null
  status: string | null
}

export interface TrialOutcome {
  measure: string | null
  time_frame: string | null
}

export interface ClinicalTrialSummary {
  nct_id: string | null
  brief_title: string | null
  overall_status: string | null
  phases: string[]
  study_type: string | null
  conditions: string[]
  interventions: InterventionShort[]
  lead_sponsor: string | null
  enrollment_count: number | null
  start_date: string | null
  primary_completion_date: string | null
  countries: string[]
  site_count: number
}

export interface ClinicalSearchResponse {
  total_count: number | null
  studies: ClinicalTrialSummary[]
  next_page_token: string | null
}

export interface ClinicalTrialDetail {
  nct_id: string | null
  brief_title: string | null
  official_title: string | null
  overall_status: string | null
  phases: string[]
  study_type: string | null
  brief_summary: string | null
  detailed_description: string | null
  conditions: string[]
  interventions: InterventionFull[]
  lead_sponsor: string | null
  enrollment_count: number | null
  start_date: string | null
  primary_completion_date: string | null
  completion_date: string | null
  eligibility_criteria: string | null
  minimum_age: string | null
  maximum_age: string | null
  sex: string | null
  std_ages: string[]
  healthy_volunteers: boolean | null
  sites: TrialSite[]
  primary_outcomes: TrialOutcome[]
  secondary_outcomes: TrialOutcome[]
}

export interface ClinicalSearchParams {
  condition?: string | null
  intervention?: string | null
  gene?: string | null
  status?: string | null
  phase?: string | null
  limit?: number
}

export interface SubsystemStats {
  percent: number
  [key: string]: any
}

export interface SystemStatsResponse {
  brain: SubsystemStats & {
    tokens_per_sec: number
    model: string
    latency_ms: number
    active_sessions: number
    total_queries: number
  }
  bus: SubsystemStats & {
    events_per_sec: number
    active_bindings: number
    extraction_latency_ms: number
    genes_extracted: number
    status: string
  }
  pubmed: SubsystemStats & {
    latency_ms: number
    requests_per_hour: number
    error_rate: number
    uptime: string
  }
  db: SubsystemStats & {
    latency_ms: number
    provider: string
    queue_items: number
    status: string
  }
  cache: SubsystemStats & {
    hit_rate: number
    allocated_mb: number
    capacity_mb: number
    cached_queries: number
  }
}

