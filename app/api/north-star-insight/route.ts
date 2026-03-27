export async function POST(request: Request) {
  const { context } = await request.json()
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  const prompt = `당신은 그로스 스쿼드의 전략 어드바이저입니다. 아래는 사업 KPI와 스쿼드 북극성 지표 현황입니다.

${context}

위 데이터를 바탕으로 아래를 분석해주세요. 각 항목은 bullet point로 간결하게, 한국어로 작성해주세요.

1. **얼라인먼트 진단** (2~3줄): 북극성 지표들이 사업 KPI 달성에 올바르게 기여하고 있는지. 방향성은 맞는지.
2. **현황 진단** (2~3줄): 달성률 기반으로 잘 되고 있는 것과 주의가 필요한 것.
3. **추천 액션** (2~3개): 지금 당장 집중해야 할 것. 근거 포함.

데이터가 부족한 경우 솔직하게 언급해주세요.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!res.ok) return Response.json({ error: 'AI 분석 실패' }, { status: 500 })
  const data = await res.json()
  return Response.json({ insight: data.content?.[0]?.text ?? '분석 실패' })
}
