import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const client =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

function getSessionId(): string {
  const KEY = 'novu_session_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

export async function logSearch(query: string, resultsCount: number): Promise<void> {
  if (!client) return
  try {
    await client.from('searches').insert({
      query,
      results_count: resultsCount,
      session_id: getSessionId(),
    })
  } catch { /* non-critical */ }
}

export async function logBrowse(
  pmid: string,
  title: string | null,
  journal: string | null,
  pubdate: string | null,
  queryContext: string,
): Promise<void> {
  if (!client) return
  try {
    await client.from('browse_history').insert({
      pmid,
      title,
      journal,
      pubdate,
      query_context: queryContext,
      session_id: getSessionId(),
    })
  } catch { /* non-critical */ }
}

export async function logError(
  errorType: string,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!client) return
  try {
    await client.from('error_logs').insert({
      source: 'frontend',
      error_type: errorType,
      message: message.slice(0, 2000),
      context_json: context ?? {},
      session_id: getSessionId(),
    })
  } catch { /* non-critical */ }
}
