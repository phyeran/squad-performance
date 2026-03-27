import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('annual_goals')
    .select('*')
    .order('year', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, year } = body

  if (!title || !year) {
    return Response.json({ error: '제목과 연도는 필수입니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('annual_goals')
    .insert({ title, year })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
