import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const metricId = searchParams.get('metric_id')

  if (!metricId) {
    return Response.json({ error: 'metric_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('metric_entries')
    .select('*')
    .eq('metric_id', metricId)
    .order('recorded_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { metric_id, recorded_at, value, note, created_by } = body

  if (!metric_id || !recorded_at || value === undefined) {
    return Response.json({ error: '필수 항목이 누락됐습니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('metric_entries')
    .insert({ metric_id, recorded_at, value, note: note || null, created_by: created_by || null })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
