# SUB-CONSTITUTION: 문서 거버넌스 v1.2

제정: 2026-03-05
개정: 2026-03-06
범위: `docs/`, `api/docs/`, `.agent/workflows/`, 감사/이력/운영 문서 전반

## 0. 효력 및 우선순위

- 본 문서는 `.agent/Constitution.md`의 문서 운영 세부 규칙을 구체화하는 서브헌법이다.
- 충돌 시 우선순위:
  1. 사용자 명시 지시
  2. `.agent/Constitution.md`
  3. 본 문서 (`.agent/sub-constitutions/document-governance.md`)
  4. 개별 워크플로 문서

## 1. 문서 SSOT 체계

| 분류 | 경로 | 역할 | 성격 |
|------|------|------|------|
| 문서 인덱스 SSOT | `docs/README.md` | 문서 진입점과 규칙 개요 | SSOT |
| 로드맵 SSOT | `docs/IMPLEMENTATION_ROADMAP.md` | 구현 우선순위, 착수 순서, 완료 게이트 | SSOT |
| 작업 상태 SSOT | `docs/TODO.md` | 현재 작업 상태판 | SSOT |
| 영구 이력 SSOT | `docs/HISTORY.md` | 완료된 변경의 영구 기록 | SSOT |
| 공개 계약 SSOT | `api/docs/openapi.yaml` | `/api/v1/**` 공개 HTTP 계약의 단일 기준 | SSOT |
| 보조 계약 문서 | `docs/API_SPEC.md` | 정책, 인증, 예외, 레거시, 도메인 설명 | Companion |
| 분류 레지스트리 | `docs/DOCUMENT_REGISTRY.md` | 활성 문서의 역할 분류표 | SSOT |
| 검색 인덱스 | `docs/docs.db` | Markdown/계약 문서 검색용 SQLite FTS 인덱스 | Generated |
| DDL 인덱스 | `docs/ddls/README.md` | DDL 계약 문서 인덱스 | Index |
| Codex 인덱스 | `docs/codex/README.md` | Codex 프롬프트/결과 인덱스 | Index |

### 1.1 기본 원칙

- 코드와 테스트가 현재 구현의 사실을 결정한다.
- `/api/v1/**` 공개 경로의 상세 계약은 `api/docs/openapi.yaml`이 단일 기준이다.
- `docs/API_SPEC.md`는 OpenAPI를 보조하는 사람용 설명 문서다. 상세 계약보다 정책, 인증, 오류 포맷, 레거시 경로, 운영 주의사항을 책임진다.
- 구현 우선순위와 착수 순서는 `docs/IMPLEMENTATION_ROADMAP.md` 1개만 기준으로 삼는다.
- 작업 상태는 `docs/TODO.md` 1개만 기준으로 삼는다.
- 문서 정리에서 삭제보다 분류, 이동, 아카이브를 우선한다.
- `foundation`, `specs`, `docs` 같은 폴더명은 강제하지 않는다. 현재 프로젝트의 canonical 경로는 `docs/`다.

## 2. 작업 상태 관리

### 2.1 상태 전이

- `Inbox -> Next -> In Progress -> Blocked -> Done`
- 다른 상태 체계를 병행하지 않는다.
- 새 작업은 원칙적으로 `Inbox` 또는 `Next`에만 들어간다.
- `Done`은 최근 완료 작업만 짧게 유지하고, 영구 기록은 `docs/HISTORY.md`로 이관한다.

### 2.2 로드맵과 TODO의 관계

- `docs/IMPLEMENTATION_ROADMAP.md`는 "무엇을 언제 순서로 할지"를 관리한다.
- `docs/TODO.md`는 "지금 무엇이 어디 상태에 있는지"를 관리한다.
- `docs/planning/*.md`나 개별 Draft는 로드맵 SSOT를 대체할 수 없다.

## 3. 문서 계층과 분류

| 계층 | 경로 | 역할 |
|------|------|------|
| Runtime | `api/routes/`, `api/v1/`, `api/plugins/`, `tests/` | 실제 동작과 회귀 근거 |
| Contract | `api/docs/openapi.yaml`, `docs/API_SPEC.md`, `docs/ddls/*.md` | 외부/내부 계약 |
| SSOT | `docs/README.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`, `docs/HISTORY.md`, `docs/DOCUMENT_REGISTRY.md` | 운영 기준 |
| Support | `docs/architecture/*.md`, `docs/testing/*.md`, `docs/compatibility/*.md`, `docs/codex/**`, `docs/planning/*.md` | 지원 문서 |
| Record | `docs/audits/*.md` | 감사 결과와 증적 |
| Archive | `docs/archive/` | 비활성/대체 완료 문서 |

### 3.1 분류 레지스트리

- `docs/DOCUMENT_REGISTRY.md`는 활성 문서를 `SSOT / 지원 문서 / 기록 문서 / 아카이브 후보`로 분류한다.
- 문서 정리 시 대량 삭제 대신 먼저 레지스트리에 분류 결과를 기록한다.
- 이미 아카이브된 문서는 `docs/archive/` 아래에 유지한다.

## 4. 계약 문서 동기화

### 4.1 공개 API 변경

- `/api/v1/**` 공개 라우트 추가/수정/삭제 시 다음을 같은 변경에서 함께 갱신한다:
  - `api/docs/openapi.yaml`
  - `docs/API_SPEC.md`
  - 관련 `docs/ddls/*.md`
  - 필요한 테스트
  - `docs/HISTORY.md`
- 레거시 alias 경로는 `api/docs/openapi.yaml`에 `deprecated: true`로 문서화하고 표준 경로를 함께 적는다.
- `/api/v1/**` 밖 공개 진입점은 예외 문서화 대상이다.

### 4.2 DDL 및 인덱스

- 신규 테이블/도메인 노출 시 대응 DDL 문서를 추가 또는 갱신한다.
- `docs/ddls/README.md`와 `docs/API_SPEC.md`의 DDL 레퍼런스는 실제 `docs/ddls/*.md` 파일 집합과 동기화한다.
- 문서 추가/삭제/이동 시 `docs/README.md`, `docs/codex/README.md`, `docs/DOCUMENT_REGISTRY.md`를 같은 변경에서 갱신한다.

### 4.3 Draft와 Planning

- `docs/planning/*.md`, `*_DRAFT.md`는 비계약 문서다.
- Draft 문서는 구현 완료를 의미하는 표현을 실제 코드/테스트/계약 문서 근거 없이 사용할 수 없다.
- 기존 계획 문서는 삭제하지 말고 `지원 문서` 또는 `아카이브 후보`로 먼저 분류한다.

## 5. 검색 인덱스

- Markdown과 보조 계약 문서는 권위 원본으로 유지한다.
- `docs/docs.db`는 검색용 SQLite FTS 인덱스이며 권위 원본이 아니다.
- `scripts/doc-index.py`는 `docs/docs.db`를 생성/갱신한다.
- 광범위 문서 탐색이 필요하면 SQLite로 후보를 좁히고 원문 Markdown으로 확인한다.

### 5.1 AI 컨텍스트 위생

- 기본 AI 검색 범위는 현재 유효한 SSOT와 계약 문서에 우선권을 둔다.
- `docs/archive/**`, `docs/codex/**`, 활성 보관 기간이 지난 `docs/audits/**`는 `.agentignore`, `.cursorignore`로 기본 검색에서 제외한다.
- 최신 감사 요약이 필요하면 `docs/audits/AUDIT_LATEST.md`만 예외적으로 기본 검색에 포함할 수 있다.
- 과거 감사본, Codex 프롬프트, archive 문서는 기록/증적이며 명시적 필요가 있을 때만 수동으로 연다.
- ignore 규칙은 문서 거버넌스의 보조 장치일 뿐이며, 문서 권위 체계 자체는 `SSOT > 지원 문서 > 기록 문서 > archive` 순서를 따른다.

### 5.2 운영 예시

- 인덱스 재생성:
  - `python3 scripts/doc-index.py`
- FTS 후보 조회:
  - `sqlite3 docs/docs.db "SELECT path, title FROM documents_fts WHERE documents_fts MATCH 'shared AND gateway' LIMIT 10;"`
- 경로 기반 탐색:
  - `sqlite3 docs/docs.db "SELECT path, kind, title FROM documents WHERE path LIKE 'docs/testing/%' ORDER BY path;"`
- SQLite 결과는 탐색 후보일 뿐이며, 최종 판단은 원문 Markdown 또는 `api/docs/openapi.yaml` 확인으로 마친다.

## 6. 감사 문서 및 보관 정책

### 6.1 표준 산출물

- `docs/audits/AUDIT_LATEST.md` — 최신 표준 감사본
- `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md` — 일자별 표준 종합 감사본
- 범위 한정 감사는 `{SCOPE}_AUDIT_YYYY-MM-DD.md` 또는 `{SCOPE}_REPORT_YYYY-MM-DD.md`만 허용한다.

### 6.2 금지 네이밍

- `AUDIT_REPORT_YYYY-MM-DD_*` 형태의 접미사 증식 금지
- `RECHECK`, `FINAL`, `COMPREHENSIVE` 접미사 금지
- 범위가 불명확한 중복 감사 파일 생성 금지

### 6.3 활성 보관 기간

- 날짜형 감사 문서는 기본 7일 동안 `docs/audits/` 활성 영역에 둔다.
- 활성 보관 기간이 지나면 `scripts/archive_old_audits.py`로 `docs/archive/audits/`로 이동한다.
- 아카이브 대상이 생기면 `docs-check`는 실패해야 한다.

### 6.4 감사 로그 증적 규칙

- `docs/audits/*.md`만 권위 감사 보고서다.
- `*.log`는 watcher, smoke, 배치 실행 같은 보조 증적이며 단독 SSOT가 아니다.
- `.log`가 필요하면 관련 감사 보고서와 같은 날짜/범위 증적으로만 생성하고, 활성 분석이 끝나면 `docs/archive/audits/`로 이동한다.
- 활성 `docs/audits/`에 `.log`를 장기 보관하지 않는다.

## 7. 문서 보호

- `docs/ddls/*.md`, `docs/codex/*/PROMPT.md`, `.agent/Constitution.md`, 본 문서, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`는 사용자 명시 지시 없이 삭제할 수 없다.
- 대체/폐기된 문서는 삭제보다 `docs/archive/` 이동을 우선한다.

## 8. 자동 검증

다음 스크립트와 산출물을 유지한다.

- `scripts/doc-processor.py` — 문서 분류 레지스트리 생성/검증
- `scripts/doc-index.py` — Markdown/계약 문서 검색 인덱스 생성
- `scripts/archive_old_audits.py` — 감사 문서 보관 정책 적용
- `scripts/docs-check.sh` — 거버넌스 자동 검증

`./scripts/docs-check.sh`는 최소 아래를 검증한다.

- 로드맵 SSOT 존재
- TODO SSOT 존재
- README 인덱스 존재
- HISTORY 존재
- TODO 상태 섹션 존재
- 문서 분류 레지스트리 최신 상태
- SQLite 검색 인덱스 생성 가능 여부
- 감사 네이밍/보관 규칙
- OpenAPI와 실제 `/api/v1/**` 라우트 정합성
