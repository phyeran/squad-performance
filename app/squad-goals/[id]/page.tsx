'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { Button } from '@teamsparta/stack-button'
import { Tag } from '@teamsparta/stack-tag'
import { SquadGoal, AnnualGoal, ProjectGoal, Metric, MetricEntry, NotionProject } from '@/types'

type MetricWithEntries = Metric & { metric_entries: MetricEntry[] }
type ProjectGoalWithMetrics = ProjectGoal & {
  squad_goals: (SquadGoal & { annual_goals: AnnualGoal }) | null
  metrics: MetricWithEntries[]
}

function Sparkline({ entries, targetValue }: { entries: MetricEntry[]; targetValue: number | null }) {
  if (entries.length < 2) return null
  const values = entries.map((e) => e.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 100
  const H = 36
  const points = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ')
  const targetY = targetValue != null
    ? H - ((Math.min(Math.max(targetValue, min), max) - min) / range) * H
    : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 80, height: 32 }} preserveAspectRatio="none">
      {targetY != null && (
        <line x1="0" y1={targetY} x2={W} y2={targetY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />
      )}
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  const fmt = (d: string) => { const [y, m] = d.split('-'); return `${y}.${m}` }
  return end && end !== start ? `${fmt(start)} ~ ${fmt(end)}` : fmt(start)
}

export default function SquadGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [squadGoal, setSquadGoal] = useState<(SquadGoal & { annual_goals: AnnualGoal }) | null>(null)
  const [projects, setProjects] = useState<ProjectGoalWithMetrics[]>([])
  const [notionMap, setNotionMap] = useState<Map<string, NotionProject>>(new Map())
  const [loading, setLoading] = useState(true)

  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  async function loadInsight() {
    setInsightLoading(true)
    const res = await fetch(`/api/insight?squad_goal_id=${id}`)
    const data = await res.json()
    setInsight(data.insight ?? data.error ?? '분석 실패')
    setInsightLoading(false)
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/project-goals?squad_goal_id=${id}&with_metrics=true`).then((r) => r.json()),
      fetch('/api/squad-goals').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([pgs, sgs, notionProjects]) => {
      const sg = (sgs as (SquadGoal & { annual_goals: AnnualGoal })[]).find((s) => s.id === id)
      setSquadGoal(sg ?? null)
      setProjects(pgs)
      const map = new Map<string, NotionProject>()
      ;(notionProjects as NotionProject[]).forEach((p) => map.set(p.id, p))
      setNotionMap(map)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <FlexV2 justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Text as="p" font="bodyM" color="#9ca3af">불러오는 중...</Text>
      </FlexV2>
    )
  }

  return (
    <FlexV2.Column gap={32} maxWidth={900}>
      {/* 헤더 */}
      <FlexV2.Column gap={8}>
        {squadGoal?.annual_goals && (
          <FlexV2 align="center" gap={6}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Text as="span" font="captionM" color="#9ca3af" style={{ cursor: 'pointer' }}>대시보드</Text>
            </Link>
            <Text as="span" font="captionM" color="#d1d5db">›</Text>
            <Text as="span" font="captionM" color="#6b7280">{squadGoal.annual_goals.year}년 {squadGoal.annual_goals.title}</Text>
          </FlexV2>
        )}
        <FlexV2 justify="between" align="start">
          <FlexV2 align="center" gap={10}>
            <Tag size="sm" bgColor="#eff6ff" color="#2563eb">챕터 목표</Tag>
            <Text as="h1" font="title2" color="#111827">{squadGoal?.title ?? '챕터 목표'}</Text>
          </FlexV2>
          <Button
            variant="outline" colorScheme="secondary" size="sm"
            onClick={loadInsight} loading={insightLoading} disabled={insightLoading}
          >
            AI 인사이트
          </Button>
        </FlexV2>
        {squadGoal?.target_value != null && (
          <Text as="p" font="bodyCompact" color="#6b7280">
            목표 {squadGoal.target_value.toLocaleString()}{squadGoal.unit ?? ''}
          </Text>
        )}
      </FlexV2.Column>

      {/* AI 인사이트 패널 */}
      {insight && (
        <FlexV2.Column gap={10} padding="20px 24px" background="#fafaf9"
          border="1px solid #e7e5e4" borderRadius={14}>
          <FlexV2 justify="between" align="center">
            <FlexV2 align="center" gap={8}>
              <Text as="span" font="captionSb" color="#78716c">AI 인사이트</Text>
              <Text as="span" font="captionM" color="#a8a29e">Claude Sonnet 기반</Text>
            </FlexV2>
            <button type="button" onClick={() => setInsight(null)}
              style={{ fontSize: 12, color: '#a8a29e', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </FlexV2>
          <Text as="p" font="bodyCompact" color="#292524"
            style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {insight}
          </Text>
          <FlexV2 justify="end">
            <button type="button" onClick={loadInsight}
              style={{ fontSize: 12, color: '#78716c', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              다시 분석
            </button>
          </FlexV2>
        </FlexV2.Column>
      )}

      {/* 연결된 프로젝트 목록 */}
      {projects.length === 0 ? (
        <FlexV2.Column gap={12} align="center" style={{ minHeight: '30vh' }} justify="center">
          <Text as="p" font="bodyM" color="#9ca3af">연결된 프로젝트가 없어요.</Text>
          <Button size="sm" onClick={() => router.push('/projects/new')}>+ 프로젝트 연결</Button>
        </FlexV2.Column>
      ) : (
        <FlexV2.Column gap={8}>
          <Text as="p" font="captionM" color="#9ca3af">{projects.length}개 프로젝트</Text>
          {projects.map((pg) => {
            const notion = notionMap.get(pg.notion_page_id)
            const dateRange = formatDateRange(notion?.start_date ?? null, notion?.end_date ?? null)
            const topMetrics = pg.metrics.slice(0, 3)
            return (
              <Link
                key={pg.id}
                href={`/projects/${encodeURIComponent(pg.notion_page_id)}`}
                style={{ textDecoration: 'none' }}
              >
                <FlexV2
                  justify="between"
                  align="center"
                  gap={16}
                  padding="16px 20px"
                  background="#fff"
                  border="1px solid #e5e7eb"
                  borderRadius={12}
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                >
                  <FlexV2.Column gap={6} style={{ minWidth: 0 }}>
                    <Text as="p" font="bodyB" color="#111827"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pg.notion_project_name}
                    </Text>
                    <Text as="p" font="captionM" color="#6b7280">{pg.title}</Text>
                    {(notion?.ch?.length || dateRange) && (
                      <FlexV2 align="center" gap={6} wrap="wrap">
                        {notion?.ch?.map((c) => (
                          <Tag key={c} size="xs" bgColor="#f0fdf4" color="#16a34a">{c}</Tag>
                        ))}
                        {dateRange && (
                          <Text as="span" font="captionM" color="#9ca3af">{dateRange}</Text>
                        )}
                      </FlexV2>
                    )}
                  </FlexV2.Column>

                  {topMetrics.length > 0 ? (
                    <FlexV2 gap={20} align="center">
                      {topMetrics.map((m) => {
                        const sorted = [...m.metric_entries].filter((e) => e?.recorded_at).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
                        const latest = sorted[0]?.value ?? null
                        return (
                          <FlexV2.Column key={m.id} align="end" gap={4}>
                            <Text as="p" font="captionM" color="#9ca3af">{m.name}</Text>
                            <FlexV2 align="center" gap={8}>
                              <Sparkline entries={[...sorted].reverse()} targetValue={m.target_value} />
                              <FlexV2.Column align="end" gap={2}>
                                {latest != null ? (
                                  <Text as="p" font="bodyB" color="#111827">
                                    {latest.toLocaleString()}
                                    <Text as="span" font="captionM" color="#6b7280"> {m.unit ?? ''}</Text>
                                  </Text>
                                ) : (
                                  <Text as="p" font="captionM" color="#9ca3af">기록 없음</Text>
                                )}
                                {m.target_value != null && (
                                  <Text as="p" font="captionM" color="#d97706">
                                    목표 {m.target_value.toLocaleString()}{m.unit ?? ''}
                                  </Text>
                                )}
                              </FlexV2.Column>
                            </FlexV2>
                          </FlexV2.Column>
                        )
                      })}
                    </FlexV2>
                  ) : (
                    <Text as="p" font="captionM" color="#9ca3af">지표 없음 — 클릭해서 추가</Text>
                  )}
                </FlexV2>
              </Link>
            )
          })}
        </FlexV2.Column>
      )}

      <FlexV2 gap={12}>
        <Button variant="outline" colorScheme="secondary" onClick={() => router.push('/projects/new')}>+ 프로젝트 연결</Button>
      </FlexV2>
    </FlexV2.Column>
  )
}
