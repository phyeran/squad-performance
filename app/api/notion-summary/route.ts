const NOTION_VERSION = '2022-06-28'

async function fetchBlocksText(blockId: string, apiKey: string, depth = 0): Promise<string> {
  if (depth > 2) return ''
  const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
    },
  })
  if (!res.ok) return ''
  const data = await res.json()

  const lines: string[] = []
  for (const block of data.results ?? []) {
    const type = block.type
    // 블록 자체 텍스트
    const rich = block[type]?.rich_text ?? []
    const text = rich.map((r: any) => r.plain_text).join('')
    if (text.trim()) lines.push(text)

    // 하위 블록 재귀 탐색 (toggle, bulleted_list_item, numbered_list_item, column 등)
    if (block.has_children) {
      const childText = await fetchBlocksText(block.id, apiKey, depth + 1)
      if (childText.trim()) lines.push(childText)
    }
  }
  return lines.join('\n')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pageId = searchParams.get('page_id')

  if (!pageId) return Response.json({ error: 'page_id required' }, { status: 400 })

  const notionKey = process.env.NOTION_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!notionKey) return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 503 })
  if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  const content = await fetchBlocksText(pageId, notionKey)

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `아래는 노션 프로젝트 문서야. "프로젝트 배경"과 "프로젝트 목표" 중심으로 핵심 내용을 3~5줄로 간결하게 한국어로 요약해줘. 내용이 부족하면 있는 텍스트 기반으로 요약해줘. 불필요한 설명 없이 바로 요약만 해줘.\n\n${content.slice(0, 4000) || '(내용 없음)'}`,
        },
      ],
    }),
  })

  if (!aiRes.ok) {
    return Response.json({ error: 'AI 요약 실패' }, { status: 500 })
  }

  const aiData = await aiRes.json()
  const summary = aiData.content?.[0]?.text ?? '요약 실패'

  return Response.json({ summary })
}
