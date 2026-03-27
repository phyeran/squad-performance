import { supabase } from '@/lib/supabase'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { title, squad_goal_id, notion_project_name, deployed_at } = body

  const { data, error } = await supabase
    .from('project_goals')
    .update({ title, squad_goal_id: squad_goal_id || null, notion_project_name, deployed_at: deployed_at || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabase.from('project_goals').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
