export async function POST(request: Request) {
  const { northStarMetric, businessMetric, kpiDescription, projects } = await request.json()
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  const projectContext = projects?.length
    ? `\n연결된 프로젝트:\n${projects.map((p: any) => {
        const metrics = p.metrics?.map((m: any) => {
          const entries = m.metric_entries ?? []
          const sorted = [...entries].filter((e: any) => e?.recorded_at).sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at))
          const latest = sorted[sorted.length - 1]
          const prev = sorted[sorted.length - 2]
          const trend = latest && prev
            ? (latest.value > prev.value ? '↑' : latest.value < prev.value ? '↓' : '→')
            : ''
          return `  - ${m.name}: ${latest?.value ?? '기록없음'}${m.unit ?? ''} ${trend}`
        }).join('\n') ?? ''
        return `- ${p.notion_project_name} (${p.title})\n${metrics}`
      }).join('\n')}`
    : '\n연결된 프로젝트: 없음'

  const prompt = `당신은 그로스 스쿼드의 전략 어드바이저입니다.

[분석 대상]
- 북극성 지표: ${northStarMetric}
- 연결된 사업 KPI: ${businessMetric}
- KPI 설명: ${kpiDescription}
${projectContext}

아래 두 가지를 각각 2~3줄로 간결하게 한국어로 작성해주세요.

1. **사업 연결 해석**: 이 북극성 지표가 "${businessMetric}" 사업 KPI에 어떻게 기여하는지 인과관계 설명. 왜 이 지표가 중요한지.

2. **프로젝트 기여 해석**: 연결된 프로젝트들이 이 북극성 지표를 움직이고 있는지. 지표 트렌드 기반으로 현재 방향이 올바른지. 데이터가 부족하면 솔직하게 언급.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return Response.json({ error: 'AI 해석 실패' }, { status: 500 })
  const data = await res.json()
  return Response.json({ context: data.content?.[0]?.text ?? '해석 실패' })
}
