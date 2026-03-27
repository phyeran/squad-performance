const PROJECTS_DB_ID = '1d12dc3ef51480f6abcbd5c161e1768f'

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 503 })
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${PROJECTS_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return Response.json({ error: err.message ?? 'Notion API error', status: res.status }, { status: res.status })
  }

  const data = await res.json()

  const projects = data.results.map((page: any) => {
    const props = page.properties
    return {
      id: page.id,
      url: page.url,
      name: props['프로젝트 이름']?.title?.[0]?.plain_text ?? '(제목 없음)',
      status: props['상태']?.status?.name ?? null,
      ch: props['CH']?.multi_select?.map((s: any) => s.name) ?? [],
      product: props['프로덕트']?.select?.name ?? null,
      start_date: props['진행 일정']?.date?.start ?? null,
      end_date: props['진행 일정']?.date?.end ?? null,
    }
  })

  return Response.json(projects)
}
