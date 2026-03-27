import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: 모든 kpi_links 조회
export async function GET() {
  const { data, error } = await supabase
    .from('kpi_links')
    .select('*')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

// POST: kpi_link upsert (metric_name + chapter 기준)
export async function POST(request: Request) {
  const { metric_name, chapter, squad_goal_id } = await request.json()
  if (!metric_name || !chapter) return Response.json({ error: 'metric_name and chapter required' }, { status: 400 })

  const { data, error } = await supabase
    .from('kpi_links')
    .upsert({ metric_name, chapter, squad_goal_id: squad_goal_id || null }, { onConflict: 'metric_name,chapter' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
