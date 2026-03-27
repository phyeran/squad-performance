# 제작 원칙 — Squad Performance

Claude Code로 바이브코딩하면서 적용한 중요 기준·원칙·가이드를 정리한 문서입니다.

- **제작일**: 2026-03-27
- **제작 방식**: Claude Code (claude-sonnet-4-6) 기반 바이브코딩
- **배포 URL**: https://squad-performance.vercel.app

---

## 1. 기술 스택 고정 원칙

**"한번 정한 스택은 바꾸지 않는다."**

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase (DB + Auth) — 무료 티어 내에서 운영
- Vercel Hobby 플랜으로 배포

> 사내 서비스 특성상 운영 비용 최소화가 중요 기준이었기 때문에, 유료 플랜 전환을 유발하는 스택 추가를 금지했다.

---

## 2. 보안 규칙 (필수 준수)

### 환경 변수 분리
- `NEXT_PUBLIC_` 접두사: 브라우저 노출 허용 범위는 **Supabase URL과 anon key만**
- `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_API_KEY`, `ANTHROPIC_API_KEY`: 반드시 **서버사이드(API Routes)에서만** 사용
- `.env.local` 파일은 절대 Git에 커밋하지 않는다

### Supabase RLS 필수 활성화
- 테이블 생성 시 반드시 포함:
  ```sql
  ALTER TABLE 테이블명 ENABLE ROW LEVEL SECURITY;
  ```
- RLS 없이 배포 금지

### 금지 사항
- Notion API 키를 프론트엔드 코드에 포함하는 것
- 고객 개인정보(PII) 수집 기능 추가
- service_role 키를 `NEXT_PUBLIC_` 변수로 설정하는 것

---

## 3. 서버/클라이언트 로직 분리 원칙

**"민감한 로직은 무조건 API Route로 분리한다."**

- 외부 API 호출(Notion, Google Sheets, Claude AI)은 모두 `app/api/` 하위에 구현
- 프론트엔드 컴포넌트는 `/api/` 엔드포인트를 호출하는 방식으로만 연동
- `lib/notion.ts`는 서버사이드 전용 — 클라이언트 컴포넌트에서 직접 import 금지

---

## 4. 코딩 컨벤션

### 파일 구조
- 컴포넌트: `app/` 디렉터리 (App Router 규칙 준수)
- 스타일: Tailwind CSS만 사용, 별도 CSS 파일 금지
- Supabase 클라이언트: `lib/supabase.ts` singleton 하나만 사용
- 타입: TypeScript strict mode, `types/index.ts`에 공통 타입 정의

### UI 컴포넌트
- TeamSparta Stack (`@teamsparta/stack-*`) 우선 사용
- `Text`, `FlexV2`, `Button`, `Tag`, `TextInput` 등 제공되는 컴포넌트 활용
- 커스텀 CSS는 인라인 style prop으로만 처리 (Tailwind utility와 병행)

---

## 5. 기능 범위 원칙

**"사내 서비스에 필요한 최소한의 기능만 만든다."**

- 현재 팀(그로스 스쿼드)이 당장 쓸 수 있는 기능만 구현
- 가상의 미래 요구사항을 위한 추상화·설정·플래그 추가 금지
- 비슷한 코드 3줄이 성급한 추상화 하나보다 낫다

### 데이터 흐름 설계
- 목표 계층: **연간목표 → 챕터목표 → 프로젝트 → 지표 → 측정값**
- 각 레이어는 상위 ID를 외래키로 연결 (Supabase foreign key 활용)
- 노션 연동은 Read-only (노션은 원본 데이터 소스로만 활용)

---

## 6. AI 기능 활용 원칙

**"AI는 판단 보조 도구다. 데이터 입력·저장의 주체는 사람이다."**

- Claude Sonnet을 활용한 AI 기능은 모두 **온디맨드(버튼 클릭 시)**로만 동작
- AI 응답은 읽기 전용으로 표시하고, 저장이나 자동 액션에 연결하지 않는다
- AI 호출은 반드시 서버사이드 API Route에서만 수행 (API 키 노출 방지)

### 구현된 AI 기능
| 기능 | 엔드포인트 | 설명 |
|---|---|---|
| 챕터 목표 AI 인사이트 | `GET /api/insight` | 해당 목표의 프로젝트·지표 현황 종합 분석 |
| 북극성 KPI 해석 | `POST /api/north-star-context` | 특정 KPI와 관련 프로젝트 데이터 해석 |
| 북극성 전체 인사이트 | `POST /api/north-star-insight` | 전체 KPI 현황 종합 분석 |
| 노션 프로젝트 요약 | `POST /api/notion-summary` | 노션 페이지 내용 요약 |

---

## 7. 외부 연동 원칙

### Notion API
- 노션 DB는 **조회 전용**으로 사용 (쓰기 없음)
- 프로젝트 목록, 상태, 담당자, 일정 등을 읽어와 서비스 내 데이터와 매핑

### Google Sheets
- 제품실 현황판 시트를 **읽기 전용**으로 연동
- 사업 KPI·북극성 KPI 데이터를 시트에서 파싱해 표시
- 시트 연동 실패 시 graceful degradation (오류 메시지 표시 후 나머지 기능 정상 동작)

---

## 8. 배포 원칙

- 환경 변수는 Vercel 대시보드에서 직접 설정 (코드에 포함 금지)
- Supabase Project ID: `yddzfdutoonelrojsmvh`
- GitHub 레포: https://github.com/phyeran/squad-performance

### 배포 명령어
```bash
git add .
git commit -m "커밋 메시지"
git push origin main
vercel --prod --scope hrpark-teamspartacs-projects
```

### 배포 시 주의사항 (트러블슈팅 기록)
Vercel이 프로젝트를 자동으로 **Next.js가 아닌 정적 빌드(static-build)로 잘못 감지**하는 문제가 있었다.
증상: 빌드는 성공(Ready)하지만 모든 URL에서 `404: NOT_FOUND` 반환.
원인: Vercel 프로젝트의 `framework` 설정이 `null`이어서 `@vercel/static-build`로 처리됨.
해결: Vercel API로 프레임워크를 명시적으로 `nextjs`로 설정한 뒤 재배포.

```bash
# 프레임워크 강제 설정 (최초 1회)
curl -X PATCH "https://api.vercel.com/v9/projects/{PROJECT_ID}" \
  -H "Authorization: Bearer {VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"framework": "nextjs"}'
```

→ 이후 배포부터는 빌드 로그에 `Detected Next.js version: x.x.x` 가 출력되면 정상.
