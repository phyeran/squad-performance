'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@teamsparta/stack-button'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { TextInput } from '@teamsparta/stack-input'
import { Tag } from '@teamsparta/stack-tag'
import { NotionProject, SquadGoal, AnnualGoal } from '@/types'

type SheetKPI = { squad: string; annualGoal: string; metricName: string; chapters: { label: string; goal: string }[] }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '진행 중': { bg: '#eff6ff', text: '#2563eb' },
  '완료':   { bg: '#f0fdf4', text: '#16a34a' },
  '시작 전': { bg: '#f9fafb', text: '#6b7280' },
  '대기':   { bg: '#fefce8', text: '#ca8a04' },
  '백로그': { bg: '#f9fafb', text: '#9ca3af' },
  '피봇':   { bg: '#fdf2f8', text: '#9333ea' },
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        border: active ? '1.5px solid #2563eb' : '1px solid #e5e7eb',
        background: active ? '#eff6ff' : '#fff',
        color: active ? '#2563eb' : '#6b7280',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function NewProjectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetSquadGoalId = searchParams.get('squad_goal_id') ?? ''

  const [projects, setProjects] = useState<NotionProject[]>([])
  const [squadGoals, setSquadGoals] = useState<(SquadGoal & { annual_goals: AnnualGoal })[]>([])
  const [loading, setLoading] = useState(true)
  const [noNotionKey, setNoNotionKey] = useState(false)

  // squad_goal_id → 시트 기반 표시 이름 ("KPI명 › 챕터")
  const [sgLabelMap, setSgLabelMap] = useState<Map<string, string>>(new Map())

  const [selected, setSelected] = useState('')
  const [pgTitle, setPgTitle] = useState('')
  const [pgSquadId, setPgSquadId] = useState(presetSquadGoalId)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // 필터 상태
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterCH, setFilterCH] = useState<string | null>(null)
  const [filterProduct, setFilterProduct] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => {
        if (r.status === 503) { setNoNotionKey(true); return [] }
        return r.json()
      }),
      fetch('/api/squad-goals').then((r) => r.json()),
      fetch('/api/kpi-links').then((r) => r.json()).catch(() => []),
      fetch('/api/sheets').then((r) => r.json()).catch(() => null),
    ]).then(([p, s, links, sheetData]) => {
      setProjects(p)
      setSquadGoals(s)
      // URL 파라미터가 없을 때만 첫 번째 목표 기본 선택
      if (!presetSquadGoalId && s.length > 0) setPgSquadId(s[0].id)

      // kpi_links + sheet 데이터로 squad_goal_id → 실제 챕터 목표 텍스트 맵 구성
      if (sheetData && !sheetData.error && links) {
        const kpiMap = new Map<string, string>() // metricName::chapter → goal text
        for (const kpi of (sheetData.businessKPIs ?? []) as SheetKPI[]) {
          for (const ch of kpi.chapters) {
            kpiMap.set(`${kpi.metricName}::${ch.label}`, `${kpi.metricName} › ${ch.label}`)
          }
        }
        const labelMap = new Map<string, string>()
        for (const link of links) {
          if (link.squad_goal_id) {
            const label = kpiMap.get(`${link.metric_name}::${link.chapter}`)
            if (label) labelMap.set(link.squad_goal_id, label)
          }
        }
        setSgLabelMap(labelMap)
      }
    }).finally(() => setLoading(false))
  }, [])

  // 필터 옵션 동적 생성
  const allStatuses = useMemo(() => [...new Set(projects.map((p) => p.status).filter(Boolean))] as string[], [projects])
  const allCH = useMemo(() => [...new Set(projects.flatMap((p) => p.ch ?? []))].sort(), [projects])
  const allProducts = useMemo(() => [...new Set(projects.map((p) => p.product).filter(Boolean))] as string[], [projects])

  const filtered = useMemo(() => projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.product ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterCH && !(p.ch ?? []).includes(filterCH)) return false
    if (filterProduct && p.product !== filterProduct) return false
    return true
  }), [projects, search, filterStatus, filterCH, filterProduct])

  const selectedProject = projects.find((p) => p.id === selected)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pgTitle) return
    setSaving(true)
    await fetch('/api/project-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notion_page_id: selected || 'manual',
        notion_project_name: selectedProject?.name ?? pgTitle,
        squad_goal_id: pgSquadId || null,
        title: pgTitle,
      }),
    })
    if (selected) {
      router.push(`/projects/${encodeURIComponent(selected)}`)
    } else {
      router.push('/')
    }
  }

  const hasFilter = filterStatus || filterCH || filterProduct

  function sgLabel(sgId: string, sg: SquadGoal & { annual_goals: AnnualGoal }) {
    return sgLabelMap.get(sgId) ?? sg.title
  }

  return (
    <FlexV2.Column gap={32} maxWidth={640}>
      <FlexV2.Column gap={4}>
        <Text as="h1" font="title2">프로젝트 연결</Text>
        {presetSquadGoalId && (() => {
          const sg = squadGoals.find((s) => s.id === presetSquadGoalId)
          return sg ? (
            <FlexV2 align="center" gap={6}>
              <Text as="span" font="captionM" color="#9ca3af">챕터 목표:</Text>
              <Tag size="xs" bgColor="#eff6ff" color="#2563eb">{sgLabel(sg.id, sg)}</Tag>
            </FlexV2>
          ) : null
        })()}
      </FlexV2.Column>

      {noNotionKey && (
        <FlexV2 padding="16px" background="#fffbeb" border="1px solid #fde68a" borderRadius={12}>
          <FlexV2.Column gap={4}>
            <Text as="p" font="bodyCompact" color="#92400e">Notion API 키가 없어요</Text>
            <Text as="p" font="captionM" color="#b45309">.env.local에 NOTION_API_KEY를 추가해주세요.</Text>
          </FlexV2.Column>
        </FlexV2>
      )}

      {!noNotionKey && (
        <FlexV2.Column gap={12}>
          <Text as="label" font="subTitle3">노션 프로젝트 선택</Text>

          {/* 검색 */}
          <TextInput
            value={search}
            onValueChange={setSearch}
            placeholder="프로젝트명 검색..."
            size="sm"
          />

          {/* 필터 */}
          {!loading && (
            <FlexV2.Column gap={8}>
              {/* 상태 필터 */}
              {allStatuses.length > 0 && (
                <FlexV2 gap={6} align="center" wrap="wrap">
                  <Text as="span" font="captionM" color="#9ca3af" style={{ minWidth: 28 }}>상태</Text>
                  {allStatuses.map((s) => (
                    <FilterChip
                      key={s}
                      label={s}
                      active={filterStatus === s}
                      onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                    />
                  ))}
                </FlexV2>
              )}

              {/* CH 필터 */}
              {allCH.length > 0 && (
                <FlexV2 gap={6} align="center" wrap="wrap">
                  <Text as="span" font="captionM" color="#9ca3af" style={{ minWidth: 28 }}>CH</Text>
                  {allCH.map((c) => (
                    <FilterChip
                      key={c}
                      label={c}
                      active={filterCH === c}
                      onClick={() => setFilterCH(filterCH === c ? null : c)}
                    />
                  ))}
                </FlexV2>
              )}

              {/* 프로덕트 필터 */}
              {allProducts.length > 0 && (
                <FlexV2 gap={6} align="center" wrap="wrap">
                  <Text as="span" font="captionM" color="#9ca3af" style={{ minWidth: 28 }}>제품</Text>
                  {allProducts.map((p) => (
                    <FilterChip
                      key={p}
                      label={p}
                      active={filterProduct === p}
                      onClick={() => setFilterProduct(filterProduct === p ? null : p)}
                    />
                  ))}
                </FlexV2>
              )}

              {/* 필터 초기화 */}
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => { setFilterStatus(null); setFilterCH(null); setFilterProduct(null) }}
                  style={{ alignSelf: 'flex-start', fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  필터 초기화
                </button>
              )}
            </FlexV2.Column>
          )}

          {/* 프로젝트 목록 */}
          {loading ? (
            <Text as="p" font="captionM" color="#9ca3af">불러오는 중...</Text>
          ) : (
            <FlexV2.Column
              gap={4}
              padding={8}
              border="1px solid #e5e7eb"
              borderRadius={12}
              background="#fff"
              maxHeight={280}
              style={{ overflowY: 'auto' }}
            >
              {filtered.length === 0 && (
                <Text as="p" font="captionM" color="#9ca3af" style={{ padding: 8 }}>결과 없음</Text>
              )}
              {filtered.map((p) => {
                const sc = p.status ? (STATUS_COLORS[p.status] ?? { bg: '#f9fafb', text: '#6b7280' }) : null
                return (
                  <FlexV2
                    key={p.id}
                    as="button"
                    align="center"
                    gap={8}
                    padding="8px 12px"
                    borderRadius={8}
                    background={selected === p.id ? '#eff6ff' : 'transparent'}
                    border={selected === p.id ? '1px solid #bfdbfe' : '1px solid transparent'}
                    onClick={() => setSelected(p.id)}
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                  >
                    <Text as="span" font="bodyCompact" color="#111827" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </Text>
                    {p.product && (
                      <Text as="span" font="captionM" color="#9ca3af" style={{ whiteSpace: 'nowrap' }}>{p.product}</Text>
                    )}
                    {p.status && sc && (
                      <Tag size="xs" bgColor={sc.bg} color={sc.text}>{p.status}</Tag>
                    )}
                    {p.ch?.slice(0, 2).map((c) => (
                      <Tag key={c} size="xs">{c}</Tag>
                    ))}
                  </FlexV2>
                )
              })}
            </FlexV2.Column>
          )}

          {!loading && (
            <Text as="p" font="captionM" color="#9ca3af">
              {filtered.length}개 표시 중 (전체 {projects.length}개)
            </Text>
          )}
        </FlexV2.Column>
      )}

      <FlexV2 as="form" direction="column" gap={20} onSubmit={handleSubmit}>
        <TextInput
          label="이 프로젝트의 목표"
          value={pgTitle}
          onValueChange={setPgTitle}
          placeholder="예: 결제 전환율 3% 향상"
          required
        />

        {squadGoals.length > 0 && (
          <FlexV2.Column gap={6}>
            <Text as="label" font="captionSb" color="#374151">연결할 챕터 목표</Text>
            <select
              value={pgSquadId}
              onChange={(e) => setPgSquadId(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', outline: 'none', width: '100%' }}
            >
              <option value="">없음</option>
              {squadGoals.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sgLabel(sg.id, sg)}
                </option>
              ))}
            </select>
          </FlexV2.Column>
        )}

        <FlexV2 gap={12}>
          <Button type="button" variant="outline" colorScheme="secondary" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" loading={saving} disabled={saving || !pgTitle}>
            연결하기
          </Button>
        </FlexV2>
      </FlexV2>
    </FlexV2.Column>
  )
}

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectContent />
    </Suspense>
  )
}
