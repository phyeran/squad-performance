'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { Tag } from '@teamsparta/stack-tag'
import { AnnualGoal, SquadGoal, ProjectGoal, Metric, MetricEntry } from '@/types'

type ChapterData = { label: string; goal: string; kpi: string }
type SheetKPI = { squad: string; annualGoal: string; metricName: string; targetValue: string; chapters: ChapterData[] }
type NorthStarKPI = { squad: string; businessMetric: string; kpiDescription: string; metricName: string }
type MetricWithEntries = Metric & { metric_entries: MetricEntry[] }
type ProjectWithMetrics = ProjectGoal & { metrics: MetricWithEntries[] }
type SquadGoalFull = SquadGoal & { annual_goals: AnnualGoal }

// kpiLinks map key: `${metricName}::${chapterLabel}`
function linkKey(metricName: string, chapterLabel: string) {
  return `${metricName}::${chapterLabel}`
}

function Sparkline({ entries }: { entries: MetricEntry[] }) {
  const valid = entries.filter((e) => e?.recorded_at)
  if (valid.length < 2) return null
  const values = valid.map((e) => e.value)
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const W = 60; const H = 24
  const points = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 48, height: 20 }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function ProjectCard({ p, isFirst }: { p: ProjectWithMetrics; isFirst: boolean }) {
  const topMetrics = (p.metrics ?? []).slice(0, 3)
  return (
    <Link href={`/projects/${encodeURIComponent(p.notion_page_id)}`} style={{ textDecoration: 'none' }}>
      <FlexV2 justify="between" align="center" gap={16} padding="14px 20px"
        style={{
          borderTop: isFirst ? undefined : '1px solid #f3f4f6',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
        <FlexV2.Column gap={2} style={{ minWidth: 0 }}>
          <Text as="p" font="bodyCompact" color="#111827"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.notion_project_name}
          </Text>
          {p.title && p.title !== p.notion_project_name && (
            <Text as="p" font="captionM" color="#9ca3af">{p.title}</Text>
          )}
        </FlexV2.Column>
        {topMetrics.length > 0 ? (
          <FlexV2 gap={16} align="center" style={{ flexShrink: 0 }}>
            {topMetrics.map((m) => {
              const sorted = (m.metric_entries ?? [])
                .filter((e) => e?.recorded_at)
                .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
              const latest = sorted[sorted.length - 1]
              const prev = sorted[sorted.length - 2]
              const trend = latest && prev
                ? (latest.value > prev.value ? '↑' : latest.value < prev.value ? '↓' : '→') : ''
              const trendColor = trend === '↑' ? '#16a34a' : trend === '↓' ? '#dc2626' : '#6b7280'
              return (
                <FlexV2.Column key={m.id} align="end" gap={2}>
                  <Text as="p" font="captionM" color="#9ca3af">{m.name}</Text>
                  <FlexV2 align="center" gap={4}>
                    <Sparkline entries={sorted} />
                    <Text as="p" font="captionSb" color="#111827">
                      {latest?.value?.toLocaleString() ?? '—'}{m.unit ?? ''}
                      {trend && <span style={{ color: trendColor, marginLeft: 4 }}>{trend}</span>}
                    </Text>
                  </FlexV2>
                </FlexV2.Column>
              )
            })}
          </FlexV2>
        ) : (
          <Text as="p" font="captionM" color="#d1d5db">지표 없음</Text>
        )}
      </FlexV2>
    </Link>
  )
}

export default function NorthStarPage() {
  const [businessKPIs, setBusinessKPIs] = useState<SheetKPI[]>([])
  const [northStarKPIs, setNorthStarKPIs] = useState<NorthStarKPI[]>([])
  const [squadGoals, setSquadGoals] = useState<SquadGoalFull[]>([])
  const [projectMap, setProjectMap] = useState<Map<string, ProjectWithMetrics[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [sheetError, setSheetError] = useState(false)

  const [expandedKPI, setExpandedKPI] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'business' | 'squad'>('business')

  // key: `${metricName}::${chapterLabel}` → squad_goal_id
  const [kpiLinks, setKpiLinks] = useState<Map<string, string>>(new Map())
  const [savingLink, setSavingLink] = useState<string | null>(null)

  async function loadAll() {
    const [sheetRes, sgRes, linksRes] = await Promise.all([
      fetch('/api/sheets').then((r) => r.json()).catch(() => null),
      fetch('/api/squad-goals').then((r) => r.json()).catch(() => []),
      fetch('/api/kpi-links').then((r) => r.json()).catch(() => []),
    ])

    if (!sheetRes || sheetRes.error) {
      setSheetError(true)
    } else {
      setBusinessKPIs(sheetRes.businessKPIs ?? [])
      setNorthStarKPIs(sheetRes.northStarKPIs ?? [])
    }
    setSquadGoals(sgRes ?? [])

    const lMap = new Map<string, string>()
    for (const link of (linksRes ?? [])) {
      if (link.squad_goal_id) {
        lMap.set(linkKey(link.metric_name, link.chapter), link.squad_goal_id)
      }
    }
    setKpiLinks(lMap)

    const pMap = new Map<string, ProjectWithMetrics[]>()
    for (const sg of (sgRes ?? [])) {
      const projects = await fetch(`/api/project-goals?squad_goal_id=${sg.id}&with_metrics=true`)
        .then((r) => r.json()).catch(() => [])
      pMap.set(sg.id, projects)
    }
    setProjectMap(pMap)
    setLoading(false)
  }

  async function saveLink(metricName: string, chapterLabel: string, squadGoalId: string) {
    const key = linkKey(metricName, chapterLabel)
    setSavingLink(key)
    await fetch('/api/kpi-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_name: metricName, chapter: chapterLabel, squad_goal_id: squadGoalId || null }),
    })
    setKpiLinks((prev) => {
      const next = new Map(prev)
      if (squadGoalId) next.set(key, squadGoalId)
      else next.delete(key)
      return next
    })
    setSavingLink(null)
  }

  useEffect(() => { loadAll() }, [])

  const myNorthStars = northStarKPIs.filter((k) => k.squad === '그로스 스쿼드')
  const myBusinessKPIs = businessKPIs.filter((k) => k.squad === '그로스 스쿼드')

  if (loading) {
    return (
      <FlexV2 justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Text as="p" font="bodyM" color="#9ca3af">불러오는 중...</Text>
      </FlexV2>
    )
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? '#111827' : '#9ca3af',
    borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    background: 'none', border: 'none',
    cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <FlexV2.Column gap={32} maxWidth={960}>
      <Text as="h1" font="title2" color="#111827">북극성 지표</Text>

      {/* 탭 */}
      <FlexV2 gap={0} style={{ borderBottom: '1px solid #e5e7eb', marginBottom: -20 }}>
        <button style={tabStyle(activeTab === 'business')} onClick={() => setActiveTab('business')}>
          사업 KPI
        </button>
        <button style={tabStyle(activeTab === 'squad')} onClick={() => setActiveTab('squad')}>
          스쿼드 북극성
        </button>
      </FlexV2>

      {sheetError && (
        <FlexV2 padding="14px 16px" background="#fef2f2" border="1px solid #fecaca" borderRadius={10}>
          <Text as="p" font="captionM" color="#dc2626">시트 연동 오류 — GOOGLE_SHEETS_API_KEY를 .env.local에 추가해주세요.</Text>
        </FlexV2>
      )}

      {/* ── 사업 KPI 탭 ── */}
      {activeTab === 'business' && (
        <FlexV2.Column gap={8}>
          {myBusinessKPIs.length === 0 && !sheetError && (
            <Text as="p" font="captionM" color="#9ca3af">시트에서 불러온 KPI가 없어요.</Text>
          )}
          {myBusinessKPIs.map((kpi, ki) => {
            const isOpen = expandedKPI === kpi.metricName
            // 챕터 중 하나라도 연결된 게 있으면 연결됨으로 표시
            const anyLinked = kpi.chapters.some((ch) => kpiLinks.has(linkKey(kpi.metricName, ch.label)))

            return (
              <FlexV2.Column key={ki} gap={0} background="#fff"
                border={`1px solid ${isOpen ? '#fde68a' : '#e5e7eb'}`} borderRadius={12}
                style={{ overflow: 'hidden', transition: 'border-color 0.15s' }}>

                {/* ── KPI 카드 헤더 (클릭 → 펼침) ── */}
                <button type="button"
                  onClick={() => setExpandedKPI(isOpen ? null : kpi.metricName)}
                  style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}>
                  <FlexV2 justify="between" align="center" padding="16px 20px"
                    background={isOpen ? '#fffbeb' : '#fff'}>
                    <FlexV2.Column gap={4}>
                      <Text as="span" font="captionM" color="#9ca3af" style={{ fontSize: 11 }}>
                        {kpi.annualGoal.split('\n')[0]}
                      </Text>
                      <FlexV2 align="center" gap={8} wrap="wrap">
                        <Text as="span" font="bodyB" color="#111827">{kpi.metricName}</Text>
                        {kpi.targetValue && (
                          <Tag size="xs" bgColor="#fef3c7" color="#92400e">목표 {kpi.targetValue}</Tag>
                        )}
                        {kpi.chapters.length === 0 ? (
                          <Tag size="xs" bgColor="#f9fafb" color="#9ca3af">챕터 미정</Tag>
                        ) : anyLinked ? (
                          <Tag size="xs" bgColor="#f0fdf4" color="#15803d">프로젝트 연결됨</Tag>
                        ) : (
                          <Tag size="xs" bgColor="#fff7ed" color="#c2410c">프로젝트 미연결</Tag>
                        )}
                      </FlexV2>
                    </FlexV2.Column>
                    <Text as="span" font="captionM" color="#9ca3af"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      ›
                    </Text>
                  </FlexV2>
                </button>

                {/* ── 펼쳐지는 챕터 목록 ── */}
                {isOpen && (
                  <FlexV2.Column gap={0} style={{ borderTop: '1px solid #fde68a' }}>
                    {kpi.chapters.length === 0 ? (
                      <FlexV2 padding="16px 20px">
                        <Text as="p" font="captionM" color="#9ca3af">시트에 챕터 목표가 없어요.</Text>
                      </FlexV2>
                    ) : (
                      kpi.chapters.map((ch, ci) => {
                        const key = linkKey(kpi.metricName, ch.label)
                        const linkedSgId = kpiLinks.get(key) ?? ''
                        const linkedSG = linkedSgId ? squadGoals.find((sg) => sg.id === linkedSgId) ?? null : null
                        const linkedProjects = linkedSgId ? (projectMap.get(linkedSgId) ?? []) : []
                        const isSaving = savingLink === key

                        return (
                          <FlexV2.Column key={ci} gap={0}
                            style={{ borderTop: ci > 0 ? '1px solid #fde68a' : undefined }}>

                            {/* 챕터 라벨 + 목표/KPI */}
                            <FlexV2.Column gap={10} padding="16px 20px" background="#fffbeb">
                              <FlexV2 align="center" gap={8}>
                                <Tag size="sm" bgColor="#fef3c7" color="#92400e">챕터 › {ch.label}</Tag>
                              </FlexV2>

                              <FlexV2.Column gap={4}>
                                <Text as="span" font="captionSb" color="#78350f">목표</Text>
                                <Text as="p" font="bodyCompact" color="#111827" style={{ lineHeight: 1.65 }}>
                                  {ch.goal}
                                </Text>
                              </FlexV2.Column>

                              {ch.kpi && ch.kpi !== '-' && (
                                <FlexV2.Column gap={4} padding="10px 14px" background="#fef3c7" borderRadius={8}>
                                  <Text as="span" font="captionSb" color="#92400e">KPI</Text>
                                  <Text as="p" font="captionM" color="#78350f"
                                    style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {ch.kpi}
                                  </Text>
                                </FlexV2.Column>
                              )}
                            </FlexV2.Column>

                            {/* 프로젝트 연결 드롭다운 */}
                            <FlexV2.Column gap={8} padding="12px 20px" background="#fff"
                              style={{ borderTop: '1px solid #fef3c7' }}>
                              <FlexV2 align="center" gap={8}>
                                <Text as="span" font="captionSb" color="#374151" style={{ whiteSpace: 'nowrap' }}>
                                  연결 챕터 목표
                                </Text>
                                <select
                                  value={linkedSgId}
                                  onChange={(e) => saveLink(kpi.metricName, ch.label, e.target.value)}
                                  disabled={isSaving}
                                  style={{
                                    flex: 1, padding: '5px 10px', fontSize: 13, borderRadius: 7,
                                    border: '1px solid #d1d5db', background: '#fff', color: '#111827',
                                    cursor: 'pointer', outline: 'none',
                                  }}>
                                  <option value="">— 연결 안 함</option>
                                  {squadGoals.map((sg) => (
                                    <option key={sg.id} value={sg.id}>{sg.title}</option>
                                  ))}
                                </select>
                                {isSaving && <Text as="span" font="captionM" color="#9ca3af">저장 중...</Text>}
                              </FlexV2>
                            </FlexV2.Column>

                            {/* 연결된 프로젝트 목록 */}
                            {linkedSG && (
                              <FlexV2.Column gap={0} background="#fafafa"
                                style={{ borderTop: '1px solid #f3f4f6' }}>
                                <FlexV2 align="center" justify="between" padding="8px 20px">
                                  <FlexV2 align="center" gap={6}>
                                    <Text as="span" font="captionSb" color="#374151">연결된 프로젝트</Text>
                                    <Text as="span" font="captionM" color="#9ca3af">{linkedProjects.length}개</Text>
                                  </FlexV2>
                                  <Link href={`/squad-goals/${linkedSG.id}`}
                                    style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                                    {linkedSG.title} →
                                  </Link>
                                </FlexV2>
                                {linkedProjects.length === 0 ? (
                                  <FlexV2 padding="10px 20px">
                                    <Text as="p" font="captionM" color="#9ca3af">이 챕터 목표에 등록된 프로젝트가 없어요.</Text>
                                  </FlexV2>
                                ) : (
                                  <FlexV2.Column gap={0} background="#fff"
                                    style={{ borderTop: '1px solid #f3f4f6' }}>
                                    {linkedProjects.map((p, pi) => (
                                      <ProjectCard key={p.id} p={p} isFirst={pi === 0} />
                                    ))}
                                  </FlexV2.Column>
                                )}
                              </FlexV2.Column>
                            )}

                          </FlexV2.Column>
                        )
                      })
                    )}
                  </FlexV2.Column>
                )}

              </FlexV2.Column>
            )
          })}
        </FlexV2.Column>
      )}

      {/* ── 스쿼드 북극성 탭 ── */}
      {activeTab === 'squad' && (
        <FlexV2.Column gap={8}>
          <FlexV2 align="center" gap={8}>
            <Tag size="sm" bgColor="#eff6ff" color="#2563eb">스쿼드 북극성</Tag>
            <Text as="span" font="captionM" color="#9ca3af">제품실 지표설계 시트 · KPI 기준</Text>
          </FlexV2>

          {myNorthStars.map((ns, i) => {
            // 이 북극성 KPI에 연결된 모든 챕터 프로젝트 수집
            const allLinkedProjects: Array<{ chapter: string; sg: SquadGoalFull; projects: ProjectWithMetrics[] }> = []
            for (const [key, sgId] of kpiLinks.entries()) {
              if (!key.startsWith(`${ns.metricName}::`)) continue
              const chapterLabel = key.split('::')[1]
              const sg = squadGoals.find((s) => s.id === sgId)
              const projects = projectMap.get(sgId) ?? []
              if (sg) allLinkedProjects.push({ chapter: chapterLabel, sg, projects })
            }

            return (
              <FlexV2.Column key={i} gap={0} background="#fff" border="1px solid #e5e7eb" borderRadius={14}
                style={{ overflow: 'hidden' }}>
                <FlexV2.Column gap={6} padding="18px 20px">
                  <FlexV2 align="center" gap={8} wrap="wrap">
                    <Text as="p" font="bodyB" color="#111827">{ns.metricName}</Text>
                    {ns.businessMetric && (
                      <Tag size="xs" bgColor="#fef3c7" color="#92400e">↕ {ns.businessMetric}</Tag>
                    )}
                  </FlexV2>
                  {ns.kpiDescription && (
                    <Text as="p" font="captionM" color="#6b7280" style={{ lineHeight: 1.5 }}>
                      {ns.kpiDescription.split('\n')[0]}
                    </Text>
                  )}
                </FlexV2.Column>

                <FlexV2.Column gap={0} style={{ borderTop: '1px solid #f3f4f6' }}>
                  {allLinkedProjects.length === 0 ? (
                    <FlexV2 padding="12px 20px" background="#f9fafb">
                      <Text as="p" font="captionM" color="#9ca3af">
                        연결된 챕터 목표 없음 — 사업 KPI 탭에서 챕터별로 연결해주세요
                      </Text>
                    </FlexV2>
                  ) : (
                    allLinkedProjects.map(({ chapter, sg, projects }, gi) => (
                      <FlexV2.Column key={gi} gap={0}
                        style={{ borderTop: gi > 0 ? '1px solid #f3f4f6' : undefined }}>
                        <FlexV2 align="center" justify="between" padding="10px 20px" background="#f9fafb">
                          <FlexV2 align="center" gap={6}>
                            <Tag size="xs" bgColor="#eff6ff" color="#2563eb">챕터 › {chapter}</Tag>
                            <Text as="span" font="captionSb" color="#374151">{sg.title}</Text>
                          </FlexV2>
                          <FlexV2 align="center" gap={8}>
                            <Text as="span" font="captionM" color="#9ca3af">프로젝트 {projects.length}개</Text>
                            <Link href={`/squad-goals/${sg.id}`}
                              style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                              목표 상세 →
                            </Link>
                          </FlexV2>
                        </FlexV2>
                        {projects.length > 0 && (
                          <FlexV2.Column gap={0} background="#fff" style={{ borderTop: '1px solid #f3f4f6' }}>
                            {projects.map((p, pi) => (
                              <ProjectCard key={p.id} p={p} isFirst={pi === 0} />
                            ))}
                          </FlexV2.Column>
                        )}
                      </FlexV2.Column>
                    ))
                  )}
                </FlexV2.Column>
              </FlexV2.Column>
            )
          })}
        </FlexV2.Column>
      )}

    </FlexV2.Column>
  )
}
