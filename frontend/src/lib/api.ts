import type { SearchResponse, Variant, GenomicsResponse, ProteinResponse, SystemStatsResponse } from '@/types'
import { logError } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function enrichVariants(gene: string | null, variantIds: string[]): Promise<Variant[]> {
  const res = await fetch(`${API_BASE}/api/enrichment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gene, variants: variantIds }),
  })
  if (!res.ok) throw new Error(`Enrichment error: ${res.status}`)
  return res.json()
}

export async function lookupGenomics(gene: string, variants: string[]): Promise<GenomicsResponse> {
  const res = await fetch(`${API_BASE}/api/genomics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gene, variants }),
  })
  if (!res.ok) {
    const msg = `Genomics API error: ${res.status}`
    logError('genomics_error', msg, { gene, variants })
    throw new Error(msg)
  }
  return res.json()
}

export async function lookupProtein(gene: string, variant: string | null = null): Promise<ProteinResponse> {
  const res = await fetch(`${API_BASE}/api/protein`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gene, variant }),
  })
  if (!res.ok) {
    const msg = `Protein API error: ${res.status}`
    logError('protein_error', msg, { gene, variant })
    throw new Error(msg)
  }
  return res.json()
}

export async function searchLiterature(query: string, maxResults = 10): Promise<SearchResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, max_results: maxResults }),
    })
    if (!res.ok) {
      const msg = `API error: ${res.status} ${res.statusText}`
      logError('api_error', msg, { query, status: res.status })
      throw new Error(msg)
    }
    const data = await res.json()
    const rc = data.research_context
    return {
      results: data.results,
      query: data.query,
      count: data.count,
      researchContext: {
        gene: rc?.gene ?? null,
        variants: (rc?.variants ?? []) as Variant[],
        proteinName: rc?.protein_name ?? null,
      },
    }
  } catch (err) {
    if (err instanceof Error && !err.message.startsWith('API error:')) {
      logError('fetch_error', err.message, { query })
    }
    throw err
  }
}

export async function getSystemStats(): Promise<SystemStatsResponse> {
  const res = await fetch(`${API_BASE}/api/system/stats`)
  if (!res.ok) throw new Error(`System stats error: ${res.status}`)
  return res.json()
}

