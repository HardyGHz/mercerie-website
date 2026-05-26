export interface Article {
  pmid: string
  title: string | null
  authors: string[]
  journal: string | null
  pubdate: string | null
  doi: string | null
  abstract: string | null
}

export interface SearchResponse {
  results: Article[]
  query: string
  count: number
}

export type Page = 'literature' | 'protein' | 'genomic' | 'clinical' | 'system' | 'genomics-explorer'

export interface Variant {
  id: string        // pl. "R175H"
  freq: string      // pl. "0.024" vagy "—" ha nem kinyerhető
  status: 'PATHOGENIC' | 'VUS' | 'BENIGN'
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
