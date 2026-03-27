import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const squadGoalId = searchParams.get('squad_goal_id')
  if (!squadGoalId) return Response.json({ error: 'squad_goal_id required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  // 1. 챕터 목표 + 연간 목표
  const { data: squadGoal } = await supabase
    .from('squad_goals')
    .select('*, annual_goals(*)')
    .eq('id', squadGoalId)
    .single()

  // 2. 연결된 프로젝트 목표 + 지표 + 수치
  const { data: projectGoals } = await supabase
    .from('project_goals')
    .select('*, metrics(*, metric_entries(*))')
    .eq('squad_goal_id', squadGoalId)

  if (!squadGoal) return Response.json({ error: '챕터 목표를 찾을 수 없어요.' }, { status: 404 })

  // 3. 컨텍스트 문자열 구성
  const annualGoal = (squadGoal as any).annual_goals
  const lines: string[] = []

  lines.push(`[연간 목표] ${annualGoal?.year}년 - ${annualGoal?.title}`)
  lines.push(`[챕터 목표] ${squadGoal.title}${squadGoal.target_value != null ? ` (목표: ${squadGoal.target_value}${squadGoal.unit ?? ''})` : ''}`)
  lines.push('')

  const pgs = (projectGoals ?? []) as any[]
  if (pgs.length === 0) {
    lines.push('연결된 프로젝트 없음')
  } else {
    for (const pg of pgs) {
      lines.push(`[프로젝트] ${pg.notion_project_name} — ${pg.title}`)
      if (pg.deployed_at) lines.push(`  배포일: ${pg.deployed_at}`)
      for (const m of pg.metrics ?? []) {
        const entries = (m.metric_entries ?? [])
          .filter((e: any) => e?.recorded_at)
          .sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at))
        const latest = entries[entries.length - 1]
        const trend = entries.length >= 2
          ? `${entries[0].value} → ${latest.value}`
          : latest ? `${latest.value}` : '기록 없음'
        lines.push(`  지표: ${m.name}${m.unit ? ` (${m.unit})` : ''}${m.target_value != null ? ` / 목표: ${m.target_value}` : ''} / 현재: ${trend}`)
      }
    }
  }

  const context = lines.join('\n')

  const prompt = `당신은 그로스 스쿼드의 전략 어드바이저입니다. 아래는 팀의 목표 체계와 진행 중인 프로젝트 현황입니다.

${context}

위 데이터를 바탕으로 아래 세 가지를 분석해주세요. 각 항목은 bullet point로 간결하게, 한국어로 작성해주세요.

1. **현황 진단** (2~3줄): 목표 달성을 위한 현재 상태 요약. 데이터가 부족한 부분도 언급.
2. **추정 선행지표** (2~3개): 최종 목표에 영향을 줄 것으로 추정되는 측정 가능한 선행지표 제안. 왜 그 지표인지 근거 포함.
3. **제안 실험** (2~3개): 지금 당장 시도해볼 수 있는 구체적인 실험 또는 액션. 예상 임팩트와 함께.

추론 근거를 명확히 하고, 데이터가 부족한 경우 솔직하게 "데이터 부족으로 추론 신뢰도 낮음"이라고 표시해주세요.`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiRes.ok) return Response.json({ error: 'AI 분석 실패' }, { status: 500 })

  const aiData = await aiRes.json()
  const insight = aiData.content?.[0]?.text ?? '분석 실패'

  return Response.json({ insight })
}
