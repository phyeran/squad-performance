'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Text } from '@teamsparta/stack-text'
import { FlexV2 } from '@teamsparta/stack-flex'
import { Button } from '@teamsparta/stack-button'
import { Tag } from '@teamsparta/stack-tag'
import { AnnualGoal, SquadGoal, ProjectGoal } from '@/types'

type ProjectGoalSimple = Pick<ProjectGoal, 'id' | 'squad_goal_id'>

export default function DashboardPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<AnnualGoal[]>([])
  const [sGoals, setSGoals] = useState<(SquadGoal & { annual_goals: AnnualGoal })[]>([])
  const [pGoals, setPGoals] = useState<ProjectGoalSimple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('annual_goals').select('*').order('year', { ascending: false }),
      supabase.from('squad_goals').select('*, annual_goals(*)').order('created_at', { ascending: true }),
      supabase.from('project_goals').select('id, squad_goal_id'),
    ]).then(([ag, sg, pg]) => {
      setGoals((ag.data as AnnualGoal[]) ?? [])
      setSGoals((sg.data as (SquadGoal & { annual_goals: AnnualGoal })[]) ?? [])
      setPGoals((pg.data as ProjectGoalSimple[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <FlexV2 justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Text as="p" font="bodyM" color="#9ca3af">불러오는 중...</Text>
      </FlexV2>
    )
  }

  if (goals.length === 0 && sGoals.length === 0) {
    return (
      <FlexV2 justify="center" align="center" direction="column" gap={16} style={{ minHeight: '60vh' }}>
        <Text as="p" font="bodyM" color="#6b7280">아직 등록된 목표가 없어요.</Text>
        <Button onClick={() => router.push('/setup')}>목표 설정하기</Button>
      </FlexV2>
    )
  }

  const goalTree = goals.map((ag) => ({
    ...ag,
    squadGoals: sGoals.filter((sg) => sg.annual_goal_id === ag.id),
  }))

  return (
    <FlexV2.Column gap={40}>
      {goalTree.map((ag) => (
        <FlexV2.Column key={ag.id} gap={16}>
          {/* 연간 목표 */}
          <FlexV2 align="center" gap={8}>
            <Tag size="sm" bgColor="#f3f4f6" color="#6b7280">{ag.year}년 연간 목표</Tag>
            <Text as="h2" font="subTitle2" color="#111827">{ag.title}</Text>
          </FlexV2>

          {ag.squadGoals.length === 0 && (
            <Text as="p" font="captionM" color="#9ca3af" style={{ marginLeft: 16 }}>
              연결된 챕터 목표가 없습니다.
            </Text>
          )}

          {/* 챕터 목표 카드 목록 */}
          <FlexV2.Column gap={8} style={{ marginLeft: 16 }}>
            {ag.squadGoals.map((sg) => {
              const projectCount = pGoals.filter((pg) => pg.squad_goal_id === sg.id).length
              return (
                <Link key={sg.id} href={`/squad-goals/${sg.id}`} style={{ textDecoration: 'none' }}>
                  <FlexV2
                    justify="between"
                    align="center"
                    gap={16}
                    padding="18px 24px"
                    background="#fff"
                    border="1px solid #e5e7eb"
                    borderRadius={12}
                    style={{ cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  >
                    <FlexV2.Column gap={4}>
                      <FlexV2 align="center" gap={8}>
                        <Tag size="xs" bgColor="#eff6ff" color="#2563eb">챕터 목표</Tag>
                        <Text as="p" font="bodyB" color="#111827">{sg.title}</Text>
                      </FlexV2>
                      {sg.target_value != null && (
                        <Text as="p" font="captionM" color="#6b7280">
                          목표 {sg.target_value.toLocaleString()}{sg.unit ?? ''}
                        </Text>
                      )}
                    </FlexV2.Column>

                    <FlexV2 align="center" gap={12}>
                      <Text as="p" font="captionM" color="#9ca3af">
                        {projectCount > 0 ? `프로젝트 ${projectCount}개` : '프로젝트 없음'}
                      </Text>
                      <Text as="span" font="captionM" color="#d1d5db">›</Text>
                    </FlexV2>
                  </FlexV2>
                </Link>
              )
            })}
          </FlexV2.Column>
        </FlexV2.Column>
      ))}

      <FlexV2 gap={12}>
        <Button variant="outline" colorScheme="secondary" onClick={() => router.push('/setup')}>목표 설정</Button>
        <Button onClick={() => router.push('/projects/new')}>+ 프로젝트 연결</Button>
      </FlexV2>
    </FlexV2.Column>
  )
}
