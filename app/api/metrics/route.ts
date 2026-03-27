import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectGoalId = searchParams.get('project_goal_id')

  let query = supabase
    .from('metrics')
    .select('*, metric_entries(recorded_at, value, created_by)')
    .order('created_at', { ascending: true })

  if (projectGoalId) {
    query = query.eq('project_goal_id', projectGoalId)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { project_goal_id, name, unit, target_value, phase, amplitude_url } = body

  if (!project_goal_id || !name) {
    return Response.json({ error: '필수 항목이 누락됐습니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('metrics')
    .insert({ project_goal_id, name, unit: unit || null, target_value: target_value || null, phase: phase || 'both', amplitude_url: amplitude_url || null })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
