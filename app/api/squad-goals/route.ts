import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('squad_goals')
    .select('*, annual_goals(*)')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { annual_goal_id, title, target_value, unit } = body

  if (!annual_goal_id || !title) {
    return Response.json({ error: '연간 목표와 제목은 필수입니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('squad_goals')
    .insert({ annual_goal_id, title, target_value: target_value || null, unit: unit || null })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
