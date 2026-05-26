import type { SearchResponse } from '@/types'
import { logError } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
    return res.json()
  } catch (err) {
    if (err instanceof Error && !err.message.startsWith('API error:')) {
      logError('fetch_error', err.message, { query })
    }
    throw err
  }
}
