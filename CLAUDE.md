@AGENTS.md

# CLAUDE.md - 사내 서비스 바이브코딩 가이드

## 프로젝트 정보

- 프로젝트명: squad-performance
- Supabase Project ID: yddzfdutoonelrojsmvh
- 용도: 스쿼드 성과 관리 대시보드 (사내 서비스)
- 서비스 개요: 목표-프로젝트-태스크-지표를 하나로 연결하는 대시보드. 기존 노션 페이지 연동으로 관리 포인트 일원화. 팀이 현황을 스스로 확인하고 움직이는 구조.

## 해결하는 문제

- 목표-프로젝트-태스크-지표가 각각 따로 관리되어 맥락이 끊김
- 프로젝트 히스토리가 쌓이지 않아 매번 처음부터 고민
- PM이 일일이 챙기지 않으면 팀이 현황 파악이 어려움

## 기술 스택 (변경 금지)

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (DB + Auth + Storage) — 개인 계정 무료 티어
- Notion API — 기존 노션 페이지 연동
- Vercel (배포) — Hobby 플랜
- 서버 로직이 필요한 경우: Next.js API Routes (app/api/) 사용

## 보안 규칙 (필수 준수)

### 환경 변수
- .env.local에 민감 정보 저장, 절대 Git에 커밋하지 않는다
- NEXT_PUBLIC_ 접두사: 브라우저에 노출됨. Supabase URL과 publishable key만 허용
- service_role 키: 서버사이드(API Routes)에서만 사용. 프론트엔드 코드에 절대 포함 금지
- NOTION_API_KEY: 서버사이드(API Routes)에서만 사용. NEXT_PUBLIC_ 절대 금지

### Supabase 보안
- 모든 테이블 생성 시 RLS(Row Level Security)를 반드시 활성화한다
- 테이블 생성 SQL에 반드시 ALTER TABLE 테이블명 ENABLE ROW LEVEL SECURITY; 를 포함한다
- 기본 RLS 정책: 인증된 사용자만 CRUD 가능
- 사용자별 데이터 분리 시 user_id 기반 RLS 정책 추가

### 금지 사항
- service_role 키를 NEXT_PUBLIC_ 변수로 설정하지 않는다
- RLS를 비활성화한 상태로 배포하지 않는다
- 고객 개인정보(PII)를 수집하는 기능을 만들지 않는다
- .env, .env.local 파일을 Git에 커밋하지 않는다
- Notion API 키를 프론트엔드 코드에 노출하지 않는다

## 코딩 컨벤션
- 컴포넌트: app/ 디렉토리 (App Router)
- 스타일: Tailwind CSS 사용, 별도 CSS 파일 금지
- Supabase 클라이언트: lib/supabase.ts에 singleton으로 생성
- Notion 클라이언트: lib/notion.ts에 singleton으로 생성 (서버사이드 전용)
- 타입: TypeScript strict mode
- 서버 로직이 필요한 경우: Next.js API Routes (app/api/) 사용

## 배포
- Vercel Hobby 플랜에 배포한다
- 환경 변수는 Vercel 대시보드에서 설정한다
- main 브랜치에 push하면 자동 배포된다

## Supabase MCP 활용
- 테이블 생성/수정은 MCP를 통해 실행한다
- RLS 정책도 MCP를 통해 SQL로 실행한다
- 테이블 생성 후 반드시 RLS 활성화를 확인한다
