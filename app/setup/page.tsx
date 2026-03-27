'use client'

import { useEffect, useState } from 'react'
import { Button } from '@teamsparta/stack-button'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { TextInput } from '@teamsparta/stack-input'
import { Tag } from '@teamsparta/stack-tag'
import { AnnualGoal, SquadGoal } from '@/types'

type SquadGoalWithAnnual = SquadGoal & { annual_goals: AnnualGoal }

export default function SetupPage() {
  const [annualGoals, setAnnualGoals] = useState<AnnualGoal[]>([])
  const [squadGoals, setSquadGoals] = useState<SquadGoalWithAnnual[]>([])
  const [saving, setSaving] = useState(false)

  // 연간 목표 추가 폼
  const [showAgForm, setShowAgForm] = useState(false)
  const [agTitle, setAgTitle] = useState('')
  const [agYear, setAgYear] = useState('')

  // 연간 목표 수정
  const [editingAg, setEditingAg] = useState<AnnualGoal | null>(null)

  // 챕터 목표 추가 폼 (annual_goal_id 기준으로 어느 연간 목표 하위에 추가할지)
  const [addingSquadGoalFor, setAddingSquadGoalFor] = useState<string | null>(null)
  const [sgTitle, setSgTitle] = useState('')
  const [sgTarget, setSgTarget] = useState('')
  const [sgUnit, setSgUnit] = useState('')

  // 챕터 목표 수정
  const [editingSg, setEditingSg] = useState<SquadGoalWithAnnual | null>(null)

  async function load() {
    const [ag, sg] = await Promise.all([
      fetch('/api/annual-goals').then((r) => r.json()),
      fetch('/api/squad-goals').then((r) => r.json()),
    ])
    setAnnualGoals(ag)
    setSquadGoals(sg)
  }

  useEffect(() => {
    load()
    setAgYear(new Date().getFullYear().toString())
  }, [])

  // 연간 목표 CRUD
  async function addAnnualGoal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/annual-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: agTitle, year: Number(agYear) }),
    })
    setAgTitle(''); setShowAgForm(false)
    await load()
    setSaving(false)
  }

  async function updateAnnualGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAg) return
    setSaving(true)
    await fetch(`/api/annual-goals/${editingAg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editingAg.title, year: editingAg.year }),
    })
    setEditingAg(null)
    await load()
    setSaving(false)
  }

  async function deleteAnnualGoal(id: string) {
    if (!confirm('연간 목표를 삭제하면 연결된 챕터 목표도 함께 삭제될 수 있습니다. 삭제할까요?')) return
    await fetch(`/api/annual-goals/${id}`, { method: 'DELETE' })
    await load()
  }

  // 챕터 목표 CRUD
  async function addSquadGoal(e: React.FormEvent, annualGoalId: string) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/squad-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annual_goal_id: annualGoalId,
        title: sgTitle,
        target_value: sgTarget ? Number(sgTarget) : null,
        unit: sgUnit || null,
      }),
    })
    setSgTitle(''); setSgTarget(''); setSgUnit('')
    setAddingSquadGoalFor(null)
    await load()
    setSaving(false)
  }

  async function updateSquadGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSg) return
    setSaving(true)
    await fetch(`/api/squad-goals/${editingSg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annual_goal_id: editingSg.annual_goal_id,
        title: editingSg.title,
        target_value: editingSg.target_value ?? null,
        unit: editingSg.unit || null,
      }),
    })
    setEditingSg(null)
    await load()
    setSaving(false)
  }

  async function deleteSquadGoal(id: string) {
    if (!confirm('챕터 목표를 삭제하면 연결된 프로젝트 목표도 해제됩니다. 삭제할까요?')) return
    await fetch(`/api/squad-goals/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <FlexV2.Column gap={32} maxWidth={700}>
      <Text as="h1" font="title2">목표 설정</Text>

      {/* 연간 목표 목록 (계층형) */}
      <FlexV2.Column gap={16}>
        {annualGoals.map((ag) => {
          const agSquadGoals = squadGoals.filter((sg) => sg.annual_goal_id === ag.id)
          return (
            <FlexV2.Column
              key={ag.id}
              padding={20}
              background="#fff"
              border="1px solid #e5e7eb"
              borderRadius={14}
              gap={16}
            >
              {/* 연간 목표 헤더 */}
              {editingAg?.id === ag.id ? (
                <FlexV2 as="form" gap={8} align="end" onSubmit={updateAnnualGoal}>
                  <FlexV2 width={80}>
                    <TextInput value={String(editingAg.year)}
                      onValueChange={(v) => setEditingAg({ ...editingAg, year: Number(v) })}
                      size="sm" />
                  </FlexV2>
                  <FlexV2 flex={1}>
                    <TextInput value={editingAg.title}
                      onValueChange={(v) => setEditingAg({ ...editingAg, title: v })}
                      size="sm" />
                  </FlexV2>
                  <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setEditingAg(null)}>취소</Button>
                  <Button type="submit" size="sm" loading={saving} disabled={saving}>저장</Button>
                </FlexV2>
              ) : (
                <FlexV2 align="center" gap={8}>
                  <Tag size="sm" bgColor="#f3f4f6" color="#6b7280">{ag.year}년 연간 목표</Tag>
                  <Text as="span" font="subTitle3" color="#111827" style={{ flex: 1 }}>{ag.title}</Text>
                  <button type="button" onClick={() => setEditingAg(ag)}
                    style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>수정</button>
                  <button type="button" onClick={() => deleteAnnualGoal(ag.id)}
                    style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>삭제</button>
                </FlexV2>
              )}

              {/* 챕터 목표 목록 */}
              <FlexV2.Column gap={8} style={{ marginLeft: 12, borderLeft: '2px solid #e5e7eb', paddingLeft: 16 }}>
                {agSquadGoals.map((sg) => (
                  <div key={sg.id}>
                    {editingSg?.id === sg.id ? (
                      <FlexV2.Column as="form" gap={8} padding="10px 14px" background="#eff6ff"
                        border="1px solid #bfdbfe" borderRadius={8} onSubmit={updateSquadGoal}>
                        <FlexV2 gap={8} align="end" wrap="wrap">
                          <FlexV2 flex={1}>
                            <TextInput value={editingSg.title}
                              onValueChange={(v) => setEditingSg({ ...editingSg, title: v })}
                              placeholder="챕터 목표" size="sm" />
                          </FlexV2>
                          <FlexV2 width={100}>
                            <TextInput
                              value={editingSg.target_value != null ? String(editingSg.target_value) : ''}
                              onValueChange={(v) => setEditingSg({ ...editingSg, target_value: v ? Number(v) : null })}
                              type="number" placeholder="목표값" size="sm" />
                          </FlexV2>
                          <FlexV2 width={70}>
                            <TextInput value={editingSg.unit ?? ''}
                              onValueChange={(v) => setEditingSg({ ...editingSg, unit: v })}
                              placeholder="단위" size="sm" />
                          </FlexV2>
                        </FlexV2>
                        <FlexV2 gap={8} justify="end">
                          <Button type="button" variant="outline" colorScheme="secondary" size="sm" onClick={() => setEditingSg(null)}>취소</Button>
                          <Button type="submit" size="sm" loading={saving} disabled={saving}>저장</Button>
                        </FlexV2>
                      </FlexV2.Column>
                    ) : (
                      <FlexV2 align="center" gap={8} padding="10px 14px" background="#f9fafb"
                        borderRadius={8}>
                        <Text as="span" font="captionM" color="#9ca3af" style={{ marginRight: 2 }}>└</Text>
                        <Text as="span" font="bodyCompact" color="#111827" style={{ flex: 1 }}>{sg.title}</Text>
                        {sg.target_value != null && (
                          <Tag size="xs" bgColor="#eff6ff" color="#2563eb">
                            {sg.target_value.toLocaleString()}{sg.unit ?? ''}
                          </Tag>
                        )}
                        <button type="button" onClick={() => setEditingSg(sg)}
                          style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>수정</button>
                        <button type="button" onClick={() => deleteSquadGoal(sg.id)}
                          style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>삭제</button>
                      </FlexV2>
                    )}
                  </div>
                ))}

                {/* 챕터 목표 추가 폼 */}
                {addingSquadGoalFor === ag.id ? (
                  <FlexV2.Column as="form" gap={8} padding="10px 14px" background="#fff"
                    border="1px dashed #d1d5db" borderRadius={8}
                    onSubmit={(e) => addSquadGoal(e, ag.id)}>
                    <FlexV2 gap={8} align="end" wrap="wrap">
                      <FlexV2 flex={1}>
                        <TextInput label="챕터 목표" value={sgTitle} onValueChange={setSgTitle}
                          placeholder="예: B2G 전환 퍼널 최적화" size="sm" required />
                      </FlexV2>
                      <FlexV2 width={100}>
                        <TextInput label="목표값 (선택)" value={sgTarget} onValueChange={setSgTarget}
                          type="number" placeholder="21" size="sm" />
                      </FlexV2>
                      <FlexV2 width={70}>
                        <TextInput label="단위" value={sgUnit} onValueChange={setSgUnit}
                          placeholder="%" size="sm" />
                      </FlexV2>
                    </FlexV2>
                    <FlexV2 gap={8} justify="end">
                      <Button type="button" variant="outline" colorScheme="secondary" size="sm"
                        onClick={() => { setAddingSquadGoalFor(null); setSgTitle(''); setSgTarget(''); setSgUnit('') }}>
                        취소
                      </Button>
                      <Button type="submit" size="sm" loading={saving} disabled={saving || !sgTitle}>추가</Button>
                    </FlexV2>
                  </FlexV2.Column>
                ) : (
                  <button type="button"
                    onClick={() => setAddingSquadGoalFor(ag.id)}
                    style={{ alignSelf: 'flex-start', fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    + 챕터 목표 추가
                  </button>
                )}
              </FlexV2.Column>
            </FlexV2.Column>
          )
        })}

        {/* 연간 목표 추가 */}
        {showAgForm ? (
          <FlexV2.Column padding={20} background="#fff" border="1px dashed #d1d5db" borderRadius={14} gap={12}>
            <Text as="p" font="subTitle3" color="#374151">연간 목표 추가</Text>
            <FlexV2 as="form" gap={8} align="end" onSubmit={addAnnualGoal}>
              <FlexV2 width={80}>
                <TextInput label="연도" value={agYear} onValueChange={setAgYear} placeholder="2026" size="sm" />
              </FlexV2>
              <FlexV2 flex={1}>
                <TextInput label="연간 목표" value={agTitle} onValueChange={setAgTitle}
                  placeholder="예: KDT 신규 사업 전환 퍼널 구축" size="sm" required />
              </FlexV2>
              <Button type="button" variant="outline" colorScheme="secondary" size="sm"
                onClick={() => { setShowAgForm(false); setAgTitle('') }}>취소</Button>
              <Button type="submit" size="sm" loading={saving} disabled={saving || !agTitle}>추가</Button>
            </FlexV2>
          </FlexV2.Column>
        ) : (
          <Button variant="outline" colorScheme="secondary" onClick={() => setShowAgForm(true)}>
            + 연간 목표 추가
          </Button>
        )}
      </FlexV2.Column>
    </FlexV2.Column>
  )
}
