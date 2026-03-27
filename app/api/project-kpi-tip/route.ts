import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectGoalId = searchParams.get('project_goal_id')
  if (!projectGoalId) return Response.json({ error: 'project_goal_id required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  // 1. 프로젝트 목표 + 지표 + 수치 + squad_goal
  const { data: pg } = await supabase
    .from('project_goals')
    .select('*, squad_goals(*, annual_goals(*)), metrics(*, metric_entries(*))')
    .eq('id', projectGoalId)
    .single()

  if (!pg) return Response.json({ error: '프로젝트를 찾을 수 없어요.' }, { status: 404 })

  // 2. squad_goal에 연결된 kpi_link 조회 → 시트 챕터 컨텍스트
  let kpiChapter: { metricName: string; chapter: string; goal: string; kpi: string } | null = null
  let businessKPI: { annualGoal: string; targetValue: string } | null = null
  let northStarMetricName: string | null = null

  const sgId = (pg as any).squad_goals?.id
  if (sgId) {
    const { data: link } = await supabase
      .from('kpi_links')
      .select('metric_name, chapter')
      .eq('squad_goal_id', sgId)
      .maybeSingle()

    if (link) {
      // 시트 데이터에서 해당 KPI 챕터 텍스트 조회
      try {
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY
        if (apiKey) {
          const sheetRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/sheets`
          ).then((r) => r.json()).catch(() => null)

          if (sheetRes?.businessKPIs) {
            const kpi = sheetRes.businessKPIs.find((k: any) => k.metricName === link.metric_name)
            if (kpi) {
              const ch = kpi.chapters.find((c: any) => c.label === link.chapter)
              kpiChapter = {
                metricName: kpi.metricName,
                chapter: link.chapter,
                goal: ch?.goal ?? '',
                kpi: ch?.kpi ?? '',
              }
              businessKPI = { annualGoal: kpi.annualGoal, targetValue: kpi.targetValue }
            }
          }
          if (sheetRes?.northStarKPIs) {
            const ns = sheetRes.northStarKPIs.find((k: any) =>
              k.businessMetric === link.metric_name || k.kpiDescription?.includes(link.metric_name)
            )
            if (ns) northStarMetricName = ns.metricName
          }
        }
      } catch {}
    }
  }

  // 3. 컨텍스트 문자열 구성
  const lines: string[] = []
  lines.push(`[프로젝트] ${(pg as any).notion_project_name}`)
  lines.push(`[프로젝트 목표] ${(pg as any).title}`)

  if (kpiChapter) {
    lines.push(``)
    lines.push(`[연결된 챕터 KPI] ${kpiChapter.metricName} › ${kpiChapter.chapter}`)
    lines.push(`[챕터 목표 텍스트] ${kpiChapter.goal}`)
    if (kpiChapter.kpi) lines.push(`[챕터 KPI 지표] ${kpiChapter.kpi}`)
    if (businessKPI?.annualGoal) lines.push(`[사업 연간 목표] ${businessKPI.annualGoal}`)
    if (businessKPI?.targetValue) lines.push(`[사업 KPI 목표값] ${businessKPI.targetValue}`)
  }
  if (northStarMetricName) {
    lines.push(`[북극성 지표] ${northStarMetricName}`)
  }

  const metrics = (pg as any).metrics ?? []
  if (metrics.length > 0) {
    lines.push(``)
    lines.push(`[측정 지표]`)
    for (const m of metrics) {
      const entries = (m.metric_entries ?? [])
        .filter((e: any) => e?.recorded_at)
        .sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at))
      const latest = entries[entries.length - 1]
      const prev = entries[entries.length - 2]
      const trend = entries.length >= 2
        ? `${prev.value} → ${latest.value} (${latest.value > prev.value ? '상승' : latest.value < prev.value ? '하락' : '유지'})`
        : latest ? `현재 ${latest.value}` : '기록 없음'
      lines.push(`  - ${m.name}${m.unit ? ` (${m.unit})` : ''}${m.target_value != null ? ` | 목표: ${m.target_value}` : ''} | 추이: ${trend}`)
    }
  } else {
    lines.push(``)
    lines.push(`[측정 지표] 아직 등록된 지표 없음`)
  }

  const context = lines.join('\n')

  const prompt = `당신은 그로스 스쿼드의 PM 어드바이저입니다. 아래는 특정 프로젝트의 목표와 지표 현황, 그리고 이 프로젝트가 기여하는 상위 KPI 정보입니다.

${context}

아래 두 가지를 간결하고 실용적으로 분석해주세요. 한국어, bullet point 형식으로 작성하세요.

1. **상위 KPI와의 연결성** (2~3줄): 이 프로젝트의 목표/지표가 챕터 KPI, 사업 KPI와 어떻게 연결되는지. 지표 선택이 적절한지.

2. **해석 시 주의할 포인트** (2~3개): 이 프로젝트의 지표를 볼 때 오해하기 쉬운 부분, 외부 변수, 인과 vs 상관 관계 등 유의할 점.

데이터가 부족한 경우 솔직하게 언급하고, 짧게 핵심만 써주세요.`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiRes.ok) return Response.json({ error: 'AI 분석 실패' }, { status: 500 })
  const aiData = await aiRes.json()
  const tip = aiData.content?.[0]?.text ?? '분석 실패'

  return Response.json({ tip, kpiChapter, businessKPI, northStarMetricName })
}
