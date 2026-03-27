# Squad Performance

그로스 스쿼드의 목표·프로젝트·지표를 하나로 연결하는 사내 성과 관리 대시보드입니다.

---

## 해결하는 문제

| 기존 문제 | 해결 방식 |
|---|---|
| 목표·프로젝트·지표가 각각 따로 흩어져 맥락이 끊김 | 연간목표 → 챕터목표 → 프로젝트 → 지표를 단일 트리로 연결 |
| 프로젝트 히스토리가 쌓이지 않아 매번 처음부터 고민 | 노션 프로젝트와 연동해 이력 자동 누적 |
| PM이 일일이 챙기지 않으면 팀이 현황 파악 어려움 | 대시보드에서 팀이 직접 현황 확인 가능 |

---

## 주요 기능

### 1. 목표 계층 관리 (`/setup`)
- **연간 목표** 등록·수정·삭제
- **챕터 목표** 등록·수정·삭제 (연간 목표 하위 연결, 목표값·단위 설정 가능)

### 2. 대시보드 (`/`)
- 연간목표 → 챕터목표 → 연결 프로젝트 수를 한눈에 확인
- 챕터 목표 카드 클릭 시 상세 페이지로 이동

### 3. 챕터 목표 상세 (`/squad-goals/[id]`)
- 해당 챕터 목표에 연결된 프로젝트 목록
- 프로젝트별 지표(최신값·목표값·스파크라인 트렌드) 인라인 표시
- **AI 인사이트** 버튼: Claude Sonnet 기반 현황 분석 리포트 생성

### 4. 프로젝트 연결 (`/projects/new`)
- 노션 DB의 프로젝트 목록을 조회해 챕터 목표에 연결
- 챕터·일정 등 노션 메타데이터 자동 반영

### 5. 프로젝트 상세 (`/projects/[notionId]`)
- 지표(KPI) 추가·수정·삭제
- 지표별 측정값(metric entry) 기록 및 스파크라인 시각화
- 노션 프로젝트 요약 자동 조회 (Claude 기반)

### 6. 북극성 지표 (`/north-star`)
- **사업 KPI 탭**: 제품실 현황판 Google Sheets 시트 연동, KPI별 챕터 목표 펼쳐보기
- **스쿼드 북극성 탭**: 북극성 KPI별 현재값·목표값·진행률 바·스파크라인, 수치 직접 업데이트
- KPI별 **AI 해석** 버튼 (관련 프로젝트 지표 데이터 포함해 분석)
- **전체 AI 인사이트** 버튼 (전체 KPI 현황 종합 분석)

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16.2 (App Router) + TypeScript |
| 스타일 | Tailwind CSS v4 |
| UI 컴포넌트 | TeamSparta Stack (`@teamsparta/stack-*`) |
| DB / Auth | Supabase (PostgreSQL + RLS) |
| 외부 연동 | Notion API, Google Sheets API |
| AI | Claude Sonnet (Anthropic API) |
| 배포 | Vercel Hobby 플랜 |

---

## DB 스키마 (Supabase)

```
annual_goals
  id, title, year, created_at

squad_goals
  id, annual_goal_id → annual_goals, title, target_value, unit, created_at

project_goals
  id, notion_page_id, notion_project_name, squad_goal_id → squad_goals,
  title, deployed_at, created_at

metrics
  id, project_goal_id → project_goals, name, unit, target_value,
  phase(pre|post|both), amplitude_url, created_at

metric_entries
  id, metric_id → metrics, recorded_at, value, note, created_by, created_at

north_star_metrics
  id, squad_goal_id → squad_goals, name, unit, target_value,
  current_value, year, sheet_metric_name, created_at, updated_at
```

모든 테이블에 RLS(Row Level Security) 활성화.

---

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # API Routes 전용
NOTION_API_KEY=...              # API Routes 전용
ANTHROPIC_API_KEY=...           # API Routes 전용
GOOGLE_SHEETS_API_KEY=...       # 북극성 지표 시트 연동

# 3. 개발 서버 시작
npm run dev
```

→ http://localhost:3000

---

## 디렉터리 구조

```
app/
  page.tsx                  # 대시보드 (/)
  layout.tsx                # 공통 레이아웃 + 네비게이션
  setup/page.tsx            # 목표 설정
  squad-goals/[id]/         # 챕터 목표 상세
  projects/
    new/                    # 프로젝트 연결
    [notionId]/             # 프로젝트 상세
  north-star/page.tsx       # 북극성 지표
  api/
    annual-goals/           # 연간 목표 CRUD
    squad-goals/            # 챕터 목표 CRUD
    project-goals/          # 프로젝트 목표 CRUD
    metrics/                # 지표 CRUD
    metric-entries/         # 지표 측정값 CRUD
    north-star/             # 북극성 지표 CRUD
    projects/               # 노션 프로젝트 목록
    insight/                # AI 인사이트 생성
    north-star-insight/     # 북극성 전체 AI 인사이트
    north-star-context/     # 북극성 KPI별 AI 해석
    notion-summary/         # 노션 프로젝트 요약
    sheets/                 # Google Sheets KPI 연동
lib/
  supabase.ts               # Supabase 클라이언트 (singleton)
  notion.ts                 # Notion 클라이언트 (서버사이드 전용)
types/
  index.ts                  # 공통 TypeScript 타입 정의
```
