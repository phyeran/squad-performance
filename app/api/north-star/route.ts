import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('north_star_metrics')
    .select('*, squad_goals(*, annual_goals(*))')
    .order('year', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data, error } = await supabase
    .from('north_star_metrics')
    .insert({
      squad_goal_id: body.squad_goal_id,
      name: body.name,
      unit: body.unit ?? null,
      target_value: body.target_value ?? null,
      current_value: body.current_value ?? null,
      year: body.year ?? 2026,
      sheet_metric_name: body.sheet_metric_name ?? null,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
