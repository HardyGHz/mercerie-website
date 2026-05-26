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
