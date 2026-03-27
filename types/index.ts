export type AnnualGoal = {
  id: string
  title: string
  year: number
  created_at: string
}

export type SquadGoal = {
  id: string
  annual_goal_id: string
  title: string
  target_value: number | null
  unit: string | null
  created_at: string
  annual_goals?: AnnualGoal
}

export type ProjectGoal = {
  id: string
  notion_page_id: string
  notion_project_name: string
  squad_goal_id: string | null
  title: string
  deployed_at: string | null
  created_at: string
  squad_goals?: SquadGoal
}

export type Metric = {
  id: string
  project_goal_id: string
  name: string
  unit: string | null
  target_value: number | null
  phase: 'pre' | 'post' | 'both'
  amplitude_url: string | null
  created_at: string
  metric_entries?: MetricEntry[]
}

export type MetricEntry = {
  id: string
  metric_id: string
  recorded_at: string
  value: number
  note: string | null
  created_by: string | null
  created_at: string
}

export type NotionProject = {
  id: string
  url: string
  name: string
  status: string | null
  ch: string[]
  product: string | null
  start_date: string | null
  end_date: string | null
}
