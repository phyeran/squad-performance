const SPREADSHEET_ID = '1Jr9UUyzjUOYN-fElN-EC4fFNL5Zhf3c-CidLp52pPnA'

export type ChapterData = {
  label: string  // e.g. '2챕터', '3챕터'
  goal: string
  kpi: string
}

export type SheetKPI = {
  squad: string
  annualGoal: string
  metricName: string
  targetValue: string
  chapters: ChapterData[]  // 챕터별 목표+KPI 배열
}

export type NorthStarKPI = {
  squad: string
  businessMetric: string
  kpiDescription: string
  metricName: string
}

async function fetchRange(apiKey: string, sheet: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheet)}!${range}?key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return (data.values ?? []) as string[][]
}

// 헤더 행에서 챕터 컬럼 위치를 자동 탐지
// "N챕터 목표" 패턴으로 컬럼을 찾고 { label, goalIdx, kpiIdx } 반환
function detectChapterColumns(header: string[]): Array<{ label: string; goalIdx: number; kpiIdx: number }> {
  const result: Array<{ label: string; goalIdx: number; kpiIdx: number }> = []
  for (let i = 0; i < header.length; i++) {
    const cell = header[i]?.trim() ?? ''
    const m = cell.match(/^(\d+챕터)\s*목표$/)
    if (m) {
      const label = m[1]
      // 바로 다음 열이 KPI인지 확인
      const nextCell = header[i + 1]?.trim() ?? ''
      const kpiIdx = nextCell.includes('KPI') ? i + 1 : -1
      result.push({ label, goalIdx: i, kpiIdx })
    }
  }
  // 탐지 실패 시 fallback: I열=2챕터 목표, J열=2챕터 KPI
  if (result.length === 0) {
    result.push({ label: '2챕터', goalIdx: 8, kpiIdx: 9 })
  }
  return result
}

export async function GET() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!apiKey) return Response.json({ error: 'GOOGLE_SHEETS_API_KEY not configured' }, { status: 503 })

  // ── 탭1: 제품실 현황판 → 사업 KPI ──
  const rows1 = await fetchRange(apiKey, '제품실 현황판', 'A1:P50')
  const businessKPIs: SheetKPI[] = []

  const header = rows1[0] ?? []
  const chapterCols = detectChapterColumns(header)

  let sq1 = '', ag1 = ''
  for (let i = 1; i < rows1.length; i++) {
    const r = rows1[i]
    if (!r || r.length === 0) continue
    if (r[0]?.trim()) sq1 = r[0].trim()
    if (r[1]?.trim()) ag1 = r[1].trim()
    const metricName = r[3]?.trim()
    const targetValue = r[5]?.trim()
    if (!metricName || metricName === '목표 미정') continue

    const chapters: ChapterData[] = []
    for (const col of chapterCols) {
      const goal = r[col.goalIdx]?.trim() ?? ''
      const kpi = col.kpiIdx >= 0 ? (r[col.kpiIdx]?.trim() ?? '') : ''
      if (goal && goal !== '-') {
        chapters.push({ label: col.label, goal, kpi })
      }
    }

    businessKPIs.push({ squad: sq1, annualGoal: ag1, metricName, targetValue: targetValue ?? '', chapters })
  }

  // ── 탭2: 제품실 지표설계 → 스쿼드 북극성 (지표유형 = KPI인 행) ──
  const rows2 = await fetchRange(apiKey, '제품실 지표설계', 'A1:G60')
  const northStarKPIs: NorthStarKPI[] = []
  let sq2 = '', biz2 = '', kpiDesc2 = '', metricName2 = ''
  for (let i = 1; i < rows2.length; i++) {
    const r = rows2[i]
    if (!r || r.length === 0) continue
    if (r[0]?.trim()) sq2 = r[0].trim()
    if (r[1]?.trim()) biz2 = r[1].trim()
    if (r[2]?.trim()) { kpiDesc2 = r[2].trim(); metricName2 = r[3]?.trim() ?? '' }
    const metricType = r[4]?.trim()
    if (metricType === 'KPI' && metricName2) {
      northStarKPIs.push({
        squad: sq2,
        businessMetric: biz2,
        kpiDescription: kpiDesc2,
        metricName: metricName2,
      })
    }
  }

  return Response.json({ businessKPIs, northStarKPIs })
}
