import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const notionPageId = searchParams.get('notion_page_id')
  const squadGoalId = searchParams.get('squad_goal_id')
  const withMetrics = searchParams.get('with_metrics') === 'true'

  const selectFields = withMetrics
    ? '*, squad_goals(*, annual_goals(*)), metrics(*, metric_entries(id, recorded_at, value, created_by))'
    : '*, squad_goals(*, annual_goals(*))'

  let query = supabase
    .from('project_goals')
    .select(selectFields)
    .order('created_at', { ascending: true })

  if (notionPageId) query = query.eq('notion_page_id', notionPageId)
  if (squadGoalId) query = query.eq('squad_goal_id', squadGoalId)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { notion_page_id, notion_project_name, squad_goal_id, title } = body

  if (!notion_page_id || !notion_project_name || !title) {
    return Response.json({ error: '필수 항목이 누락됐습니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('project_goals')
    .insert({ notion_page_id, notion_project_name, squad_goal_id: squad_goal_id || null, title })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
