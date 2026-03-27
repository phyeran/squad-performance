'use client'

import { useEffect, useState } from 'react'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { Tag } from '@teamsparta/stack-tag'
import { AnnualGoal, SquadGoal } from '@/types'

type SquadGoalWithAnnual = SquadGoal & { annual_goals: AnnualGoal }

type ChapterData = { label: string; goal: string; kpi: string }
type SheetKPI = { squad: string; annualGoal: string; metricName: string; targetValue: string; chapters: ChapterData[] }

export default function SetupPage() {
  const [squadGoals, setSquadGoals] = useState<SquadGoalWithAnnual[]>([])

  const [sheetKPIs, setSheetKPIs] = useState<SheetKPI[]>([])
  const [kpiLinks, setKpiLinks] = useState<Map<string, string>>(new Map())
  const [savingKpiLink, setSavingKpiLink] = useState<string | null>(null)
  const [sheetError, setSheetError] = useState(false)

  async function loadKpiData() {
    const [sgRes, sheetRes, linksRes] = await Promise.all([
      fetch('/api/squad-goals').then((r) => r.json()).catch(() => []),
      fetch('/api/sheets').then((r) => r.json()).catch(() => null),
      fetch('/api/kpi-links').then((r) => r.json()).catch(() => []),
    ])

    setSquadGoals(sgRes ?? [])

    if (!sheetRes || sheetRes.error) {
      setSheetError(true)
    } else {
      const myKPIs = (sheetRes.businessKPIs ?? []).filter((k: SheetKPI) => k.squad === '그로스 스쿼드')
      setSheetKPIs(myKPIs)
    }

    const lMap = new Map<string, string>()
    for (const link of (linksRes ?? [])) {
      if (link.squad_goal_id) lMap.set(`${link.metric_name}::${link.chapter}`, link.squad_goal_id)
    }
    setKpiLinks(lMap)
  }

  async function saveKpiLink(metricName: string, chapter: string, squadGoalId: string) {
    const key = `${metricName}::${chapter}`
    setSavingKpiLink(key)
    await fetch('/api/kpi-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_name: metricName, chapter, squad_goal_id: squadGoalId || null }),
    })
    setKpiLinks((prev) => {
      const next = new Map(prev)
      if (squadGoalId) next.set(key, squadGoalId)
      else next.delete(key)
      return next
    })
    setSavingKpiLink(null)
  }

  useEffect(() => { loadKpiData() }, [])

  return (
    <FlexV2.Column gap={32} maxWidth={700}>
      <FlexV2.Column gap={4}>
        <Text as="h1" font="title2" color="#111827">목표 설정</Text>
        <Text as="p" font="captionM" color="#9ca3af">시트의 챕터별 KPI를 앱의 챕터 목표와 연결합니다.</Text>
      </FlexV2.Column>

      {sheetError && (
        <FlexV2 padding="12px 16px" background="#fef2f2" border="1px solid #fecaca" borderRadius={8}>
          <Text as="p" font="captionM" color="#dc2626">시트 연동 오류 — GOOGLE_SHEETS_API_KEY를 .env.local에 추가해주세요.</Text>
        </FlexV2>
      )}

      {!sheetError && sheetKPIs.length === 0 && (
        <Text as="p" font="captionM" color="#9ca3af">시트에서 불러온 KPI가 없어요.</Text>
      )}

      {sheetKPIs.map((kpi, ki) => (
        <FlexV2.Column key={ki} gap={0} background="#fff" border="1px solid #e5e7eb" borderRadius={12}
          style={{ overflow: 'hidden' }}>
          <FlexV2.Column gap={4} padding="14px 20px" background="#f9fafb">
            <Text as="p" font="captionM" color="#9ca3af" style={{ fontSize: 11 }}>
              {kpi.annualGoal.split('\n')[0]}
            </Text>
            <FlexV2 align="center" gap={8} wrap="wrap">
              <Text as="span" font="bodyB" color="#111827">{kpi.metricName}</Text>
              {kpi.targetValue && (
                <Tag size="xs" bgColor="#fef3c7" color="#92400e">목표 {kpi.targetValue}</Tag>
              )}
            </FlexV2>
          </FlexV2.Column>

          {kpi.chapters.length === 0 ? (
            <FlexV2 padding="12px 20px">
              <Text as="p" font="captionM" color="#9ca3af">시트에 챕터 목표가 없어요.</Text>
            </FlexV2>
          ) : (
            kpi.chapters.map((ch, ci) => {
              const key = `${kpi.metricName}::${ch.label}`
              const linkedSgId = kpiLinks.get(key) ?? ''
              const isSaving = savingKpiLink === key
              return (
                <FlexV2.Column key={ci} gap={10} padding="14px 20px"
                  style={{ borderTop: '1px solid #e5e7eb' }}>
                  <FlexV2 align="center" justify="between" wrap="wrap" gap={8}>
                    <Tag size="sm" bgColor="#fef3c7" color="#92400e">챕터 › {ch.label}</Tag>
                    <FlexV2 align="center" gap={8} style={{ flex: 1, minWidth: 200 }}>
                      <select
                        value={linkedSgId}
                        onChange={(e) => saveKpiLink(kpi.metricName, ch.label, e.target.value)}
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
                  </FlexV2>
                  <Text as="p" font="captionM" color="#6b7280" style={{ lineHeight: 1.6 }}>{ch.goal}</Text>
                  {ch.kpi && ch.kpi !== '-' && (
                    <FlexV2.Column gap={2} padding="8px 12px" background="#fef3c7" borderRadius={6}>
                      <Text as="span" font="captionSb" color="#92400e" style={{ fontSize: 11 }}>KPI</Text>
                      <Text as="p" font="captionM" color="#78350f"
                        style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ch.kpi}</Text>
                    </FlexV2.Column>
                  )}
                </FlexV2.Column>
              )
            })
          )}
        </FlexV2.Column>
      ))}
    </FlexV2.Column>
  )
}
