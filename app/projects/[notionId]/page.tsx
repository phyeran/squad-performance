'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { Button } from '@teamsparta/stack-button'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { TextInput } from '@teamsparta/stack-input'
import { Tag } from '@teamsparta/stack-tag'
import { Metric, MetricEntry, ProjectGoal, SquadGoal, AnnualGoal, NotionProject } from '@/types'

type MetricWithEntries = Metric & { metric_entries: MetricEntry[] }
type PGWithRelations = ProjectGoal & { squad_goals: (SquadGoal & { annual_goals: AnnualGoal }) | null }

const statusColor: Record<string, { bg: string; text: string }> = {
  '진행 중': { bg: '#eff6ff', text: '#2563eb' },
  '완료':   { bg: '#f0fdf4', text: '#16a34a' },
  '시작 전': { bg: '#f9fafb', text: '#6b7280' },
  '대기':   { bg: '#fefce8', text: '#ca8a04' },
}

function Sparkline({ entries, targetValue }: { entries: MetricEntry[]; targetValue: number | null }) {
  if (entries.length < 2) return null
  const values = entries.map((e) => e.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 140; const H = 48
  const points = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ')
  const targetY = targetValue != null ? H - ((Math.min(Math.max(targetValue, min), max) - min) / range) * H : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 128, height: 48 }} preserveAspectRatio="none">
      {targetY != null && <line x1="0" y1={targetY} x2={W} y2={targetY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />}
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function SectionDivider({ label, color = '#6b7280', bg = '#f9fafb', border = '#e5e7eb' }: { label: string; color?: string; bg?: string; border?: string }) {
  return (
    <FlexV2 align="center" gap={12}>
      <div style={{ flex: 1, height: 1, background: border }} />
      <Text as="span" font="captionSb" color={color}
        style={{ padding: '3px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 999 }}>
        {label}
      </Text>
      <div style={{ flex: 1, height: 1, background: border }} />
    </FlexV2>
  )
}

function MetricForm({
  pgId, hasDeployedAt, defaultPhase,
  mName, setMName, mUnit, setMUnit, mTarget, setMTarget,
  mPhase, setMPhase, mAmplitudeUrl, setMAmplitudeUrl,
  onSubmit, onCancel, saving,
}: {
  pgId: string
  hasDeployedAt: boolean
  defaultPhase?: 'pre' | 'post' | 'both'
  mName: string; setMName: (v: string) => void
  mUnit: string; setMUnit: (v: string) => void
  mTarget: string; setMTarget: (v: string) => void
  mPhase: 'pre' | 'post' | 'both'; setMPhase: (v: 'pre' | 'post' | 'both') => void
  mAmplitudeUrl: string; setMAmplitudeUrl: (v: string) => void
  onSubmit: (e: React.FormEvent, pgId: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const phaseLabel: Record<string, string> = { pre: '배포 전', post: '배포 후', both: '전체 (배포 전·후)' }
  return (
    <FlexV2.Column gap={10} padding={16} background="#fff" border="1px solid #e5e7eb" borderRadius={12}>
      <Text as="p" font="subTitle3">지표 추가</Text>
      <FlexV2 as="form" direction="column" gap={10} onSubmit={(e) => onSubmit(e, pgId)}>
        <FlexV2 gap={8} align="end" wrap="wrap">
          <FlexV2 flex={1}>
            <TextInput label="지표명" value={mName} onValueChange={setMName} placeholder="예: 결제 전환율" size="sm" required />
          </FlexV2>
          <FlexV2 width={80}>
            <TextInput label="단위" value={mUnit} onValueChange={setMUnit} placeholder="%" size="sm" />
          </FlexV2>
          <FlexV2 width={100}>
            <TextInput label="목표값 (선택)" type="number" value={mTarget} onValueChange={setMTarget} placeholder="15" size="sm" />
          </FlexV2>
        </FlexV2>

        {hasDeployedAt && (
          <FlexV2.Column gap={4}>
            <Text as="label" font="captionSb" color="#374151">측정 시점</Text>
            <FlexV2 gap={6}>
              {(['pre', 'post', 'both'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setMPhase(p)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                    border: mPhase === p ? '1.5px solid #2563eb' : '1px solid #e5e7eb',
                    background: mPhase === p ? '#eff6ff' : '#fff',
                    color: mPhase === p ? '#2563eb' : '#6b7280',
                    fontWeight: mPhase === p ? 600 : 400,
                  }}>
                  {phaseLabel[p]}
                </button>
              ))}
            </FlexV2>
          </FlexV2.Column>
        )}

        <FlexV2.Column gap={4}>
          <Text as="label" font="captionSb" color="#374151">Amplitude 차트 URL (선택)</Text>
          <input
            value={mAmplitudeUrl}
            onChange={(e) => setMAmplitudeUrl(e.target.value)}
            placeholder="https://app.amplitude.com/..."
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' }}
          />
        </FlexV2.Column>

        <FlexV2 gap={8} justify="end">
          <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={onCancel}>취소</Button>
          <Button type="submit" size="sm" loading={saving} disabled={saving || !mName}>저장</Button>
        </FlexV2>
      </FlexV2>
    </FlexV2.Column>
  )
}

function MetricCard({
  m, phase, deployedAt,
  onAddEntry, onEditMetric, onDeleteMetric, onEditEntry, onDeleteEntry,
  showEntryForm, setShowEntryForm,
  eDate, setEDate, eValue, setEValue, eBy, setEBy, eNote, setENote,
  editingEntry, setEditingEntry,
  saving,
}: {
  m: MetricWithEntries
  phase: 'pre' | 'post' | 'all'
  deployedAt: string | null
  onAddEntry: (e: React.FormEvent, metricId: string) => void
  onEditMetric: (m: Metric) => void
  onDeleteMetric: (id: string) => void
  onEditEntry: (entry: MetricEntry) => void
  onDeleteEntry: (id: string) => void
  showEntryForm: string | null
  setShowEntryForm: (v: string | null) => void
  eDate: string; setEDate: (v: string) => void
  eValue: string; setEValue: (v: string) => void
  eBy: string; setEBy: (v: string) => void
  eNote: string; setENote: (v: string) => void
  editingEntry: MetricEntry | null
  setEditingEntry: (v: MetricEntry | null) => void
  saving: boolean
}) {
  const sorted = [...m.metric_entries]
    .filter((e) => {
      if (!e?.recorded_at) return false
      if (phase === 'all' || !deployedAt) return true
      if (phase === 'pre') return e.recorded_at < deployedAt
      return e.recorded_at >= deployedAt
    })
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))

  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null

  return (
    <FlexV2.Column padding={20} background="#fff" border="1px solid #e5e7eb" borderRadius={12} gap={12}>
      {/* 지표 헤더 */}
      <FlexV2 justify="between" align="start" gap={16}>
        <FlexV2.Column gap={4} style={{ flex: 1 }}>
          <FlexV2 align="center" gap={8} wrap="wrap">
            <Text as="p" font="bodyB" color="#111827">{m.name}</Text>
            {m.amplitude_url && (
              <a href={m.amplitude_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Tag size="xs" bgColor="#fff7ed" color="#ea580c">Amplitude ↗</Tag>
              </a>
            )}
            <button type="button" onClick={() => onEditMetric(m)}
              style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>수정</button>
            <button type="button" onClick={() => onDeleteMetric(m.id)}
              style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>삭제</button>
          </FlexV2>
          {m.target_value != null && (
            <Text as="p" font="captionM" color="#d97706">목표: {m.target_value.toLocaleString()}{m.unit ?? ''}</Text>
          )}
        </FlexV2.Column>
        <FlexV2 align="center" gap={16}>
          {sorted.length >= 2 && <Sparkline entries={sorted} targetValue={m.target_value} />}
          <FlexV2.Column align="end" gap={2}>
            {latest ? (
              <>
                <Text as="p" font="title2" color="#111827">
                  {latest.value.toLocaleString()}
                  <Text as="span" font="bodyCompact" color="#6b7280"> {m.unit ?? ''}</Text>
                </Text>
                <Text as="p" font="captionM" color="#9ca3af">{latest.recorded_at}</Text>
              </>
            ) : (
              <Text as="p" font="captionM" color="#9ca3af">기록 없음</Text>
            )}
          </FlexV2.Column>
        </FlexV2>
      </FlexV2>

      {/* 히스토리 테이블 */}
      {sorted.length > 0 && (
        <table style={{ width: '100%', fontSize: 12, color: '#6b7280', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6', color: '#9ca3af' }}>
              <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 400 }}>날짜</th>
              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 400 }}>값</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>입력자</th>
              <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 400 }}>노트</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...sorted].reverse().slice(0, 5).map((entry) =>
              editingEntry != null && editingEntry.id === entry.id ? (
                <tr key={entry.id}>
                  <td colSpan={5} style={{ padding: '6px 0' }}>
                    <form onSubmit={(e) => { e.preventDefault(); onEditEntry(entry) }}>
                      <FlexV2 gap={6} align="center" wrap="wrap">
                        <input type="date" value={editingEntry.recorded_at}
                          onChange={(e) => setEditingEntry({ ...editingEntry, recorded_at: e.target.value })}
                          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
                        <input type="number" value={editingEntry.value}
                          onChange={(e) => setEditingEntry({ ...editingEntry, value: Number(e.target.value) })}
                          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 80 }} />
                        <input value={editingEntry.created_by ?? ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, created_by: e.target.value })}
                          placeholder="입력자"
                          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 70 }} />
                        <input value={editingEntry.note ?? ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, note: e.target.value })}
                          placeholder="노트"
                          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 12, flex: 1, minWidth: 80 }} />
                        <button type="button" onClick={() => setEditingEntry(null)}
                          style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>취소</button>
                        <button type="submit"
                          style={{ fontSize: 12, color: '#fff', background: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>저장</button>
                      </FlexV2>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '4px 0' }}>{entry.recorded_at}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500, color: '#111827' }}>{entry.value.toLocaleString()}{m.unit ?? ''}</td>
                  <td style={{ padding: '4px 8px', color: '#9ca3af' }}>{entry.created_by ?? '-'}</td>
                  <td style={{ padding: '4px 0', color: '#9ca3af' }}>{entry.note ?? '-'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => setEditingEntry(entry)}
                      style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>수정</button>
                    <button type="button" onClick={() => onDeleteEntry(entry.id)}
                      style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>삭제</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {/* 수치 입력 폼 */}
      {showEntryForm === m.id ? (
        <FlexV2 as="form" gap={8} align="end" wrap="wrap"
          style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}
          onSubmit={(e) => onAddEntry(e, m.id)}>
          <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} required />
          <TextInput type="number" value={eValue} onValueChange={setEValue}
            placeholder={`값${m.unit ? ` (${m.unit})` : ''}`} size="sm" style={{ width: 110 }} />
          <TextInput value={eBy} onValueChange={setEBy} placeholder="입력자" size="sm" style={{ width: 80 }} />
          <TextInput value={eNote} onValueChange={setENote} placeholder="노트 (선택)" size="sm" style={{ flex: 1, minWidth: 120 }} />
          <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setShowEntryForm(null)}>취소</Button>
          <Button type="submit" size="sm" loading={saving} disabled={saving || !eValue}>저장</Button>
        </FlexV2>
      ) : (
        <Button variant="outline" colorScheme="secondary" size="sm"
          onClick={() => setShowEntryForm(m.id)} style={{ alignSelf: 'flex-start' }}>
          + 수치 입력
        </Button>
      )}
    </FlexV2.Column>
  )
}

export default function ProjectPage({ params }: { params: Promise<{ notionId: string }> }) {
  const { notionId } = use(params)
  const decodedId = decodeURIComponent(notionId)

  const [projectGoals, setProjectGoals] = useState<PGWithRelations[]>([])
  const [metrics, setMetrics] = useState<MetricWithEntries[]>([])
  const [squadGoals, setSquadGoals] = useState<(SquadGoal & { annual_goals: AnnualGoal })[]>([])
  const [notionProject, setNotionProject] = useState<NotionProject | null>(null)

  // 목표 폼
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [pgTitle, setPgTitle] = useState('')
  const [pgSquadId, setPgSquadId] = useState('')
  const [pgProjectName, setPgProjectName] = useState('')
  const [editingPg, setEditingPg] = useState<PGWithRelations | null>(null)

  // 배포일 편집
  const [editingDeployedAt, setEditingDeployedAt] = useState<string | null>(null) // pgId
  const [deployedAtInput, setDeployedAtInput] = useState('')

  // 지표 폼
  const [showMetricForm, setShowMetricForm] = useState<string | null>(null)
  const [mName, setMName] = useState('')
  const [mUnit, setMUnit] = useState('')
  const [mTarget, setMTarget] = useState('')
  const [mPhase, setMPhase] = useState<'pre' | 'post' | 'both'>('both')
  const [mAmplitudeUrl, setMAmplitudeUrl] = useState('')
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null)

  // 수치 폼
  const [showEntryForm, setShowEntryForm] = useState<string | null>(null)
  const [eValue, setEValue] = useState('')
  const [eDate, setEDate] = useState('')
  const [eNote, setENote] = useState('')
  const [eBy, setEBy] = useState('')
  const [editingEntry, setEditingEntry] = useState<MetricEntry | null>(null)

  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  async function loadAll() {
    const [pgRes, sgRes] = await Promise.all([
      fetch(`/api/project-goals?notion_page_id=${decodedId}`).then((r) => r.json()),
      fetch('/api/squad-goals').then((r) => r.json()),
    ])
    setProjectGoals(pgRes)
    setSquadGoals(sgRes)
    if (sgRes.length > 0 && !pgSquadId) setPgSquadId(sgRes[0].id)

    if (pgRes.length > 0) {
      const allMetrics: MetricWithEntries[] = []
      for (const pg of pgRes) {
        const m = await fetch(`/api/metrics?project_goal_id=${pg.id}`).then((r) => r.json())
        allMetrics.push(...m)
      }
      setMetrics(allMetrics)
    } else {
      setMetrics([])
    }

    try {
      const projects: NotionProject[] = await fetch('/api/projects').then((r) => r.json())
      const found = projects.find((p) => p.id === decodedId)
      if (found) setNotionProject(found)
    } catch {}
  }


  // 프로젝트 목표 CRUD
  async function linkProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/project-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notion_page_id: decodedId,
        notion_project_name: pgProjectName || notionProject?.name || decodedId,
        squad_goal_id: pgSquadId || null,
        title: pgTitle,
      }),
    })
    setPgTitle(''); setPgProjectName('')
    setShowLinkForm(false)
    await loadAll()
    setSaving(false)
  }

  async function updateProjectGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPg) return
    setSaving(true)
    await fetch(`/api/project-goals/${editingPg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editingPg.title,
        squad_goal_id: editingPg.squad_goal_id || null,
        notion_project_name: editingPg.notion_project_name,
        deployed_at: editingPg.deployed_at || null,
      }),
    })
    setEditingPg(null)
    await loadAll()
    setSaving(false)
  }

  async function deleteProjectGoal(id: string) {
    if (!confirm('이 프로젝트 목표와 연결된 지표/수치 데이터가 모두 삭제됩니다. 삭제할까요?')) return
    await fetch(`/api/project-goals/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function saveDeployedAt(pgId: string) {
    setSaving(true)
    await fetch(`/api/project-goals/${pgId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployed_at: deployedAtInput || null }),
    })
    setEditingDeployedAt(null)
    setDeployedAtInput('')
    await loadAll()
    setSaving(false)
  }

  async function removeDeployedAt(pgId: string) {
    if (!confirm('배포일을 삭제할까요?')) return
    setSaving(true)
    await fetch(`/api/project-goals/${pgId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployed_at: null }),
    })
    await loadAll()
    setSaving(false)
  }

  // 지표 CRUD
  async function addMetric(e: React.FormEvent, projectGoalId: string) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_goal_id: projectGoalId, name: mName, unit: mUnit || null, target_value: mTarget ? Number(mTarget) : null, phase: mPhase, amplitude_url: mAmplitudeUrl || null }),
    })
    setMName(''); setMUnit(''); setMTarget(''); setMPhase('both'); setMAmplitudeUrl('')
    setShowMetricForm(null)
    await loadAll()
    setSaving(false)
  }

  async function handleEditMetric(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMetric) return
    setSaving(true)
    await fetch(`/api/metrics/${editingMetric.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingMetric.name, unit: editingMetric.unit || null, target_value: editingMetric.target_value ?? null, phase: editingMetric.phase, amplitude_url: editingMetric.amplitude_url || null }),
    })
    setEditingMetric(null)
    await loadAll()
    setSaving(false)
  }

  async function deleteMetric(id: string) {
    if (!confirm('지표와 모든 수치 기록이 삭제됩니다. 삭제할까요?')) return
    await fetch(`/api/metrics/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  // 수치 CRUD
  async function addEntry(e: React.FormEvent, metricId: string) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/metric-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_id: metricId, recorded_at: eDate, value: Number(eValue), note: eNote || null, created_by: eBy || null }),
    })
    setEValue(''); setENote('')
    setShowEntryForm(null)
    await loadAll()
    setSaving(false)
  }

  async function handleEditEntry(entry: MetricEntry) {
    if (!editingEntry) return
    setSaving(true)
    await fetch(`/api/metric-entries/${editingEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recorded_at: editingEntry.recorded_at, value: editingEntry.value, note: editingEntry.note || null, created_by: editingEntry.created_by || null }),
    })
    setEditingEntry(null)
    await loadAll()
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    if (!confirm('이 수치 기록을 삭제할까요?')) return
    await fetch(`/api/metric-entries/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function loadSummary() {
    setSummaryLoading(true)
    const res = await fetch(`/api/notion-summary?page_id=${decodedId}`)
    const data = await res.json()
    setSummary(data.summary ?? data.error ?? '요약 실패')
    setSummaryLoading(false)
  }

  useEffect(() => {
    loadAll()
    setEDate(new Date().toISOString().slice(0, 10))
    loadSummary()
  }, [decodedId])

  const projectName = notionProject?.name ?? (projectGoals[0]?.notion_project_name ?? '프로젝트')

  const metricCardProps = {
    onAddEntry: addEntry,
    onEditMetric: (m: Metric) => setEditingMetric(m),
    onDeleteMetric: deleteMetric,
    onEditEntry: (entry: MetricEntry) => setEditingEntry(entry),
    onDeleteEntry: deleteEntry,
    showEntryForm, setShowEntryForm,
    eDate, setEDate, eValue, setEValue, eBy, setEBy, eNote, setENote,
    editingEntry, setEditingEntry,
    saving,
  }

  return (
    <FlexV2.Column gap={32} maxWidth={768}>

      {/* ── 헤더 ── */}
      <FlexV2 justify="between" align="start">
        <FlexV2.Column gap={8}>
          <Text as="h1" font="title2">{projectName}</Text>
          {notionProject && (
            <FlexV2 align="center" gap={8} wrap="wrap">
              {notionProject.status && (() => {
                const sc = statusColor[notionProject.status!] ?? { bg: '#f9fafb', text: '#6b7280' }
                return <Tag size="sm" bgColor={sc.bg} color={sc.text}>{notionProject.status}</Tag>
              })()}
              {notionProject.ch?.map((c) => (
                <Tag key={c} size="sm" bgColor="#eff6ff" color="#2563eb">{c}</Tag>
              ))}
              {notionProject.product && (
                <Text as="span" font="captionM" color="#6b7280">{notionProject.product}</Text>
              )}
            </FlexV2>
          )}
        </FlexV2.Column>

        {/* 노션 버튼 + 요약 버튼 */}
        <FlexV2 gap={8} style={{ flexShrink: 0 }}>
          <Button variant="outline" colorScheme="secondary" size="sm"
            onClick={loadSummary} loading={summaryLoading} disabled={summaryLoading}>
            AI 요약
          </Button>
          {notionProject?.url && (
            <a href={notionProject.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="outline" colorScheme="secondary" size="sm">
                노션 열기 ↗
              </Button>
            </a>
          )}
        </FlexV2>
      </FlexV2>

      {/* AI 요약 결과 */}
      {summary && (
        <FlexV2.Column gap={8} padding="16px 20px" background="#f0f9ff"
          border="1px solid #bae6fd" borderRadius={12}>
          <FlexV2 justify="between" align="center">
            <FlexV2 align="center" gap={6}>
              <Text as="span" font="captionSb" color="#0369a1">AI 요약</Text>
              <Text as="span" font="captionM" color="#7dd3fc">Claude 기반</Text>
            </FlexV2>
            <button type="button" onClick={() => setSummary(null)}
              style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </FlexV2>
          <Text as="p" font="bodyCompact" color="#0c4a6e" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {summary}
          </Text>
        </FlexV2.Column>
      )}

      {/* 목표 미연결 */}
      {projectGoals.length === 0 && !showLinkForm && (
        <FlexV2 padding="16px" background="#fffbeb" border="1px solid #fde68a" borderRadius={12} align="center" gap={8}>
          <Text as="p" font="bodyCompact" color="#92400e">아직 연결된 목표가 없어요.</Text>
          <Button size="sm" variant="outline" colorScheme="secondary" onClick={() => setShowLinkForm(true)}>
            목표 연결하기
          </Button>
        </FlexV2>
      )}

      {/* 목표 연결 추가 폼 */}
      {showLinkForm && (
        <FlexV2.Column gap={12} padding={20} background="#fff" border="1px solid #e5e7eb" borderRadius={12}>
          <Text as="h3" font="subTitle3">목표 연결</Text>
          <FlexV2 as="form" direction="column" gap={12} onSubmit={linkProject}>
            <TextInput label="프로젝트명" value={pgProjectName} onValueChange={setPgProjectName}
              placeholder={notionProject?.name ?? '자동'} size="sm" />
            <TextInput label="이 프로젝트의 목표" value={pgTitle} onValueChange={setPgTitle}
              placeholder="예: 전환율 3% 향상" required size="sm" />
            {squadGoals.length > 0 && (
              <FlexV2.Column gap={4}>
                <Text as="label" font="captionSb" color="#374151">챕터 목표 연결</Text>
                <select value={pgSquadId} onChange={(e) => setPgSquadId(e.target.value)}
                  style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
                  <option value="">없음</option>
                  {squadGoals.map((sg) => (
                    <option key={sg.id} value={sg.id}>{sg.annual_goals?.year}년 / {sg.title}</option>
                  ))}
                </select>
              </FlexV2.Column>
            )}
            <FlexV2 gap={8} justify="end">
              <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setShowLinkForm(false)}>취소</Button>
              <Button type="submit" size="sm" loading={saving} disabled={saving}>저장</Button>
            </FlexV2>
          </FlexV2>
        </FlexV2.Column>
      )}

      {/* ── 프로젝트 목표별 섹션 ── */}
      {projectGoals.map((pg) => {
        const pgMetrics = metrics.filter((m) => m.project_goal_id === pg.id)
        const preMetrics = pgMetrics.filter((m) => m.phase === 'pre' || m.phase === 'both')
        const postMetrics = pgMetrics.filter((m) => m.phase === 'post' || m.phase === 'both')
        const allMetrics = pgMetrics

        return (
          <FlexV2.Column key={pg.id} gap={20}>

            {/* 목표 breadcrumb */}
            {editingPg?.id === pg.id ? (
              <FlexV2.Column as="form" gap={10} padding="14px 16px" background="#eff6ff"
                border="1px solid #bfdbfe" borderRadius={10} onSubmit={updateProjectGoal}>
                <Text as="p" font="captionSb" color="#374151">프로젝트 목표 수정</Text>
                <TextInput label="프로젝트명" value={editingPg.notion_project_name}
                  onValueChange={(v) => setEditingPg({ ...editingPg, notion_project_name: v })} size="sm" />
                <TextInput label="목표" value={editingPg.title}
                  onValueChange={(v) => setEditingPg({ ...editingPg, title: v })} size="sm" />
                {squadGoals.length > 0 && (
                  <FlexV2.Column gap={4}>
                    <Text as="label" font="captionSb" color="#374151">챕터 목표 연결</Text>
                    <select value={editingPg.squad_goal_id ?? ''}
                      onChange={(e) => setEditingPg({ ...editingPg, squad_goal_id: e.target.value || null })}
                      style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, background: '#fff', outline: 'none' }}>
                      <option value="">없음</option>
                      {squadGoals.map((sg) => (
                        <option key={sg.id} value={sg.id}>{sg.annual_goals?.year}년 / {sg.title}</option>
                      ))}
                    </select>
                  </FlexV2.Column>
                )}
                <FlexV2 gap={8} justify="end">
                  <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setEditingPg(null)}>취소</Button>
                  <Button type="submit" size="sm" loading={saving} disabled={saving}>저장</Button>
                </FlexV2>
              </FlexV2.Column>
            ) : (
              <FlexV2 align="center" gap={6} wrap="wrap" padding="12px 16px" background="#f9fafb" borderRadius={8}>
                {pg.squad_goals?.annual_goals && (
                  <>
                    <Text as="span" font="captionM" color="#9ca3af">{pg.squad_goals.annual_goals.year}년</Text>
                    <Text as="span" font="captionM" color="#d1d5db">›</Text>
                    <Text as="span" font="captionM" color="#6b7280">{pg.squad_goals.annual_goals.title}</Text>
                    <Text as="span" font="captionM" color="#d1d5db">›</Text>
                    <Text as="span" font="captionSb" color="#2563eb">{pg.squad_goals.title}</Text>
                    <Text as="span" font="captionM" color="#d1d5db">›</Text>
                  </>
                )}
                <Text as="span" font="bodyB" color="#111827" style={{ flex: 1 }}>{pg.title}</Text>
                <button type="button" onClick={() => setEditingPg(pg)}
                  style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>수정</button>
                <button type="button" onClick={() => deleteProjectGoal(pg.id)}
                  style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>삭제</button>
              </FlexV2>
            )}

            {/* ── 배포일 없을 때: 일반 지표 뷰 ── */}
            {!pg.deployed_at && (
              <FlexV2.Column gap={12}>
                {allMetrics.map((m) => (
                  editingMetric?.id === m.id ? (
                    <FlexV2.Column key={m.id} as="form" gap={8} padding="12px 14px"
                      background="#eff6ff" border="1px solid #bfdbfe" borderRadius={8}
                      onSubmit={handleEditMetric}>
                      <FlexV2 gap={8} align="end" wrap="wrap">
                        <FlexV2 flex={1}><TextInput value={editingMetric.name} onValueChange={(v) => setEditingMetric({ ...editingMetric, name: v })} placeholder="지표명" size="sm" /></FlexV2>
                        <FlexV2 width={80}><TextInput value={editingMetric.unit ?? ''} onValueChange={(v) => setEditingMetric({ ...editingMetric, unit: v })} placeholder="단위" size="sm" /></FlexV2>
                        <FlexV2 width={100}><TextInput type="number" value={editingMetric.target_value != null ? String(editingMetric.target_value) : ''} onValueChange={(v) => setEditingMetric({ ...editingMetric, target_value: v ? Number(v) : null })} placeholder="목표값" size="sm" /></FlexV2>
                      </FlexV2>
                      {pg.deployed_at && (
                        <FlexV2 gap={6}>
                          {(['pre', 'post', 'both'] as const).map((p) => (
                            <button key={p} type="button" onClick={() => setEditingMetric({ ...editingMetric, phase: p })}
                              style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: editingMetric.phase === p ? '1.5px solid #2563eb' : '1px solid #d1d5db', background: editingMetric.phase === p ? '#eff6ff' : '#fff', color: editingMetric.phase === p ? '#2563eb' : '#6b7280', fontWeight: editingMetric.phase === p ? 600 : 400 }}>
                              {p === 'pre' ? '배포 전' : p === 'post' ? '배포 후' : '전체'}
                            </button>
                          ))}
                        </FlexV2>
                      )}
                      <input value={editingMetric.amplitude_url ?? ''} onChange={(e) => setEditingMetric({ ...editingMetric, amplitude_url: e.target.value })}
                        placeholder="Amplitude URL (선택)"
                        style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }} />
                      <FlexV2 gap={8} justify="end">
                        <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setEditingMetric(null)}>취소</Button>
                        <Button type="submit" size="sm" loading={saving} disabled={saving}>저장</Button>
                      </FlexV2>
                    </FlexV2.Column>
                  ) : (
                    <MetricCard key={m.id} m={m} phase="all" deployedAt={null} {...metricCardProps} />
                  )
                ))}

                {showMetricForm === pg.id ? (
                  <MetricForm pgId={pg.id} hasDeployedAt={!!pg.deployed_at}
                    mName={mName} setMName={setMName} mUnit={mUnit} setMUnit={setMUnit}
                    mTarget={mTarget} setMTarget={setMTarget} mPhase={mPhase} setMPhase={setMPhase}
                    mAmplitudeUrl={mAmplitudeUrl} setMAmplitudeUrl={setMAmplitudeUrl}
                    onSubmit={addMetric} onCancel={() => setShowMetricForm(null)} saving={saving} />
                ) : (
                  <Button variant="outline" colorScheme="secondary" size="sm"
                    onClick={() => setShowMetricForm(pg.id)} style={{ alignSelf: 'flex-start' }}>
                    + 지표 추가
                  </Button>
                )}
              </FlexV2.Column>
            )}

            {/* ── 배포일 있을 때: 전/배포일/후 구조 ── */}
            {pg.deployed_at && (
              <FlexV2.Column gap={20}>

                {/* 배포 전 */}
                <FlexV2.Column gap={12}>
                  <SectionDivider label="배포 전" color="#6b7280" bg="#f9fafb" border="#e5e7eb" />
                  {preMetrics.length === 0 ? (
                    <Text as="p" font="captionM" color="#9ca3af" style={{ marginLeft: 4 }}>배포 전 지표가 없어요.</Text>
                  ) : (
                    preMetrics.map((m) => {
                      const preEntries = m.metric_entries.filter((e) => e?.recorded_at && e.recorded_at < pg.deployed_at!)
                      return <MetricCard key={m.id} m={{ ...m, metric_entries: preEntries }} phase="pre" deployedAt={pg.deployed_at} {...metricCardProps} />
                    })
                  )}
                  {showMetricForm === `${pg.id}-pre` ? (
                    <MetricForm pgId={pg.id} hasDeployedAt={true} defaultPhase="pre"
                      mName={mName} setMName={setMName} mUnit={mUnit} setMUnit={setMUnit}
                      mTarget={mTarget} setMTarget={setMTarget} mPhase={mPhase} setMPhase={setMPhase}
                      mAmplitudeUrl={mAmplitudeUrl} setMAmplitudeUrl={setMAmplitudeUrl}
                      onSubmit={addMetric} onCancel={() => setShowMetricForm(null)} saving={saving} />
                  ) : (
                    <Button variant="outline" colorScheme="secondary" size="sm"
                      onClick={() => { setMPhase('pre'); setShowMetricForm(`${pg.id}-pre`) }}
                      style={{ alignSelf: 'flex-start' }}>
                      + 배포 전 지표 추가
                    </Button>
                  )}
                </FlexV2.Column>

                {/* 배포일 */}
                <SectionDivider
                  label={`🚀 배포일: ${pg.deployed_at}`}
                  color="#16a34a" bg="#f0fdf4" border="#bbf7d0"
                />
                <FlexV2 justify="center" gap={8}>
                  <button type="button"
                    onClick={() => { setEditingDeployedAt(pg.id); setDeployedAtInput(pg.deployed_at ?? '') }}
                    style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    날짜 수정
                  </button>
                  <button type="button" onClick={() => removeDeployedAt(pg.id)}
                    style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    배포일 삭제
                  </button>
                </FlexV2>

                {/* 배포 후 */}
                <FlexV2.Column gap={12}>
                  <SectionDivider label="배포 후" color="#2563eb" bg="#eff6ff" border="#bfdbfe" />
                  {postMetrics.length === 0 ? (
                    <Text as="p" font="captionM" color="#9ca3af" style={{ marginLeft: 4 }}>배포 후 지표가 없어요.</Text>
                  ) : (
                    postMetrics.map((m) => {
                      const postEntries = m.metric_entries.filter((e) => e?.recorded_at && e.recorded_at >= pg.deployed_at!)
                      return <MetricCard key={m.id} m={{ ...m, metric_entries: postEntries }} phase="post" deployedAt={pg.deployed_at} {...metricCardProps} />
                    })
                  )}
                  {showMetricForm === `${pg.id}-post` ? (
                    <MetricForm pgId={pg.id} hasDeployedAt={true} defaultPhase="post"
                      mName={mName} setMName={setMName} mUnit={mUnit} setMUnit={setMUnit}
                      mTarget={mTarget} setMTarget={setMTarget} mPhase={mPhase} setMPhase={setMPhase}
                      mAmplitudeUrl={mAmplitudeUrl} setMAmplitudeUrl={setMAmplitudeUrl}
                      onSubmit={addMetric} onCancel={() => setShowMetricForm(null)} saving={saving} />
                  ) : (
                    <Button variant="outline" colorScheme="secondary" size="sm"
                      onClick={() => { setMPhase('post'); setShowMetricForm(`${pg.id}-post`) }}
                      style={{ alignSelf: 'flex-start' }}>
                      + 배포 후 지표 추가
                    </Button>
                  )}
                </FlexV2.Column>
              </FlexV2.Column>
            )}

            {/* 배포일 입력 */}
            {editingDeployedAt === pg.id ? (
              <FlexV2 align="center" gap={8} padding="14px 16px" background="#f0fdf4" border="1px solid #bbf7d0" borderRadius={10}>
                <Text as="span" font="captionSb" color="#15803d">배포일</Text>
                <input type="date" value={deployedAtInput} onChange={(e) => setDeployedAtInput(e.target.value)}
                  style={{ border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
                <Button type="button" size="sm" onClick={() => saveDeployedAt(pg.id)} loading={saving} disabled={saving || !deployedAtInput}>저장</Button>
                <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setEditingDeployedAt(null)}>취소</Button>
              </FlexV2>
            ) : !pg.deployed_at ? (
              <button type="button"
                onClick={() => { setEditingDeployedAt(pg.id); setDeployedAtInput('') }}
                style={{ alignSelf: 'flex-start', fontSize: 13, color: '#16a34a', background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                🚀 배포일 입력하기
              </button>
            ) : null}

          </FlexV2.Column>
        )
      })}

      {projectGoals.length > 0 && !showLinkForm && (
        <Button variant="outline" colorScheme="secondary" size="sm"
          onClick={() => setShowLinkForm(true)} style={{ alignSelf: 'flex-start' }}>
          + 다른 목표 연결
        </Button>
      )}
    </FlexV2.Column>
  )
}
