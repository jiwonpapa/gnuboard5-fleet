# 문서 관리 가이드

본 문서는 `docs/`의 단일 진입 인덱스이자 문서 운영 기준입니다.
상위 정책: `.agent/Constitution.md` → `.agent/sub-constitutions/document-governance.md`

## 1. 문서 SSOT

- 문서 인덱스 SSOT: `docs/README.md`
- 로드맵 SSOT: `docs/IMPLEMENTATION_ROADMAP.md`
- 작업 상태 SSOT: `docs/TODO.md`
- 영구 이력 SSOT: `docs/HISTORY.md`
- 감사 운영 SSOT: `docs/AUDIT_SYSTEM.md`
- 공개 API 계약 SSOT: `api/docs/openapi.yaml`
- 보조 계약 문서: `docs/API_SPEC.md`
- 감사 전략 문서: `docs/AUDIT_STRATEGY.md`
- 문서 분류 레지스트리: `docs/DOCUMENT_REGISTRY.md`
- 검색 인덱스: `docs/docs.db`

## 2. 디렉토리 지도

| 경로 | 역할 |
|------|------|
| `docs/architecture/` | 설계, 통합, 플러그인 규약 문서 |
| `docs/archive/` | 아카이브 문서 보관 |
| `docs/audits/` | 활성 감사 보고서와 증적 |
| `docs/codex/` | Codex 프롬프트, 결과, 인덱스 |
| `docs/compatibility/` | 호환성 문서 |
| `docs/ddls/` | 도메인별 DB/저장소 계약 |
| `docs/planning/` | 지원용 계획/Draft 문서 |
| `docs/testing/` | 테스트 전략과 시나리오 |

## 3. 실행 규칙

- 구현 우선순위와 착수 순서는 `docs/IMPLEMENTATION_ROADMAP.md`만 기준으로 삼습니다.
- 작업 상태는 `docs/TODO.md`만 기준으로 삼습니다.
- 계획 문서와 Draft는 지원 문서이며 SSOT를 대체하지 않습니다.
- 완료 작업의 영구 기록은 `docs/HISTORY.md`로 이관합니다.
- `/api/v1/**` 공개 계약의 상세 기준은 `api/docs/openapi.yaml`입니다.

## 4. 상태 전이

`Inbox -> Next -> In Progress -> Blocked -> Done`

## 5. 분류와 검색

- 문서 분류표: `docs/DOCUMENT_REGISTRY.md`
- SQLite 검색 인덱스: `docs/docs.db`
- 문서 정리 프로세서: `scripts/doc-processor.py`
- 문서 인덱서: `scripts/doc-index.py`
- 감사 blocker registry: `docs/audits/BLOCKERS.toml`
- 감사 waiver registry: `docs/audits/WAIVERS.toml`
- 감사 warning budget registry: `docs/audits/WARNING_BUDGETS.toml`
- admin schema provider readiness registry: `docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml`
- 구조 finding 진실 원본: `scripts/check_active_structure_boundaries.py`
- 구조 감사 generated artifact: `output/php-structure-audit/latest.{md,json}`
- 구조 감사 freshness 검증기: `scripts/check_structure_report_freshness.py`
- admin schema provider readiness artifact: `output/admin-schema-provider-readiness/latest.{md,json}`
- gateway usage registry: `docs/architecture/GATEWAY_USAGE_RULES.json`
- 감사 보관 스크립트: `scripts/archive_old_audits.py`
- 기본 AI 검색 제외: `.agentignore`, `.cursorignore`
- 기본 AI 검색 우선 문서: `docs/README.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`, `docs/HISTORY.md`, `docs/AUDIT_SYSTEM.md`, `docs/DOCUMENT_REGISTRY.md`, `docs/API_SPEC.md`, `docs/ddls/*.md`, `docs/audits/AUDIT_LATEST.md`
- `docs/archive/`, `docs/codex/`, 활성 보관 기간이 지난 `docs/audits/`는 기본 AI 검색에서 제외하고, 필요할 때만 수동 참조합니다.

### SQLite 검색 예시

`docs/docs.db`는 빠른 후보 탐색용입니다. 검색 결과를 바로 진실 원본으로 쓰지 말고, 반드시 원문 Markdown이나 `api/docs/openapi.yaml`로 다시 확인합니다.

```bash
cd ${PROJECT_ROOT}
python3 scripts/doc-index.py
sqlite3 docs/docs.db \
  "SELECT path, title FROM documents_fts WHERE documents_fts MATCH 'shared AND gateway' LIMIT 10;"
sqlite3 docs/docs.db \
  "SELECT path, kind, title FROM documents WHERE path LIKE 'docs/testing/%' ORDER BY path;"
```

### 감사 로그 운영 원칙

- `docs/audits/*.md`만 권위 감사 보고서입니다.
- `*.log`는 실행 로그나 watcher 출력 같은 증적 산출물이며, 단독 SSOT가 아닙니다.
- 활성 `docs/audits/`에는 standalone `.log`를 두지 않고, 필요하면 관련 감사 보고와 같은 날짜 증적으로만 생성한 뒤 검토가 끝나면 `docs/archive/audits/`로 이동합니다.

## 6. 지원 문서 인덱스

- `docs/ddls/README.md`
- `docs/codex/README.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/TODO.md`
- `docs/HISTORY.md`
- `docs/AUDIT_SYSTEM.md`
- `docs/AUDIT_STRATEGY.md`
- `docs/architecture/SHARED_GATEWAY_INVENTORY.md`
- `docs/DOCUMENT_REGISTRY.md`
- `docs/testing/API_BLACKBOX_TESTING.md`
- `docs/testing/EXTERNAL_PROVIDER_TESTING_REVIEW.md`
- `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`
- `docs/audits/AUDIT_LATEST.md`

## 7. 현재 외부 인증 foundation

- 공개 경계: `/auth/external/providers`, `/auth/external/{provider}/start`, `/auth/external/{provider}/complete`
- 후속 전환 경계: `/auth/external/{provider}/sessions`, `/auth/external/{provider}/claims`, `/auth/external/{provider}/registrations`
- 현재 공급자: dev runtime 전용 `fake provider`, 설정 시 노출되는 실제 `google`, `kakao` adapter
- request correlation: signed `request_token`으로 `provider/flow/state/ttl`를 무상태 검증
- post-complete transition: `available_actions` + `transition_token`(legacy alias `link_token`)으로 후속 분기 고정
- 연결 관리 경계: `/auth/external/links`, `/auth/external/{provider}/links`, `/auth/external/{provider}/links/{provider_user_id}`
- 현재 내부 저장소: `g5_api_external_auth_link`
- 공개 정책 매트릭스: `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`
- 운영 정책: `transition_token` TTL/재사용 정책과 공급자별 staging smoke는 `docs/testing/EXTERNAL_PROVIDER_SANDBOX_MATRIX.md`를 따른다
- 현재 blocker: 2026-03-10 스테이징 `.env`에 `AUTH_EXTERNAL_GOOGLE_*`, `AUTH_EXTERNAL_KAKAO_*`가 비어 있어 실제 provider smoke는 `Blocked` 상태다

## 8. 현재 관리자 대시보드

- 레거시 `adm/index.php` 대체용 `/admin/dashboard` 경계가 추가되었습니다.
- 응답에는 신규 회원, 최근 게시물, 최근 포인트, 방문 요약이 함께 포함됩니다.
- 관리자 클라이언트는 개별 통계 엔드포인트를 다시 조립하지 않고 이 요약 응답을 첫 화면 데이터로 사용할 수 있습니다.
- SMS 관리자 경로는 `ADMIN_SMS_ENABLED=false`면 라우트 자체를 등록하지 않아 스테이징에서 `404 비노출`로 운영할 수 있습니다.

## 9. 현재 구조 정상화 상태

- 중앙 조립 파일은 현재 조립기 역할만 유지합니다: `api/routes/v1.php`, `api/routes/v1/admin.php`, `api/container.php`
- `Comment/File/Like/Memo/Menu/Qa`는 도메인 `Contracts/*Gateway`를 기준으로 내부 의존을 정리했고, `Api\\Integration\\Contracts\\*`는 호환층만 남겼습니다.
- `Auth/Board/Member/Point/Post` shared gateway의 허용 소비 경계와 plugin 노출 상태는 `docs/architecture/SHARED_GATEWAY_INVENTORY.md`와 계약 테스트 allowlist로 고정했고, `Auth/Point/Post` 도메인 자체는 각각 `Api\\{Auth,Point,Post}\\Contracts\\*Gateway`를 진실 원본으로 사용합니다. 현재 `Auth`는 provider-domain 내부를 `identity/registration/session/recovery` 포트로 세분화했고, shared 소비면도 `AuthIdentityGateway`, `AuthSessionGateway`, `AuthRecoveryGateway`로 1차 축소한 뒤 broad shared `AuthGateway`를 definitions/repository/contract test 호환 shell 수준으로 줄였습니다. `Point`는 provider-domain 내부를 `query/reward/maintenance` 포트까지 세분화한 뒤 shared 호환면도 `PointQueryGateway`, `PointRewardGateway`, `PointMaintenanceGateway`까지 축소했고, `AdminPointService`뿐 아니라 `AuthService`, `PostService`도 broad shared `PointGateway`를 직접 사용하지 않습니다. sample plugin `BoardReward`도 `PointRewardGateway`로 옮겨 broad shell을 `Core/Plugin` compat shell과 repository/contract 호환면 위주로 더 줄였습니다. `Post`는 shared `PostReadGateway`, `PostWriteGateway`를 열어 `Comment/File` internal helper와 plugin read/write scope가 broad shared `PostGateway` 없이 시작할 수 있게 했고, broad shell은 `Core/Plugin` read-write 호환면 위주로 유지합니다.
- direct env/global 접근은 `EnvValueReader`, `EnvLoader`, `LegacyConfigProvider`, `LegacyIcodeEnvironmentBootstrapper` 같은 의도된 경계로 대부분 수렴했고, SMS legacy bootstrap은 token-only patch 범위로 축소했습니다.
- 구조 감사의 active warning은 현재 0건입니다. `AdminSmsRepository`, `AdminSmsService`처럼 길이는 길어도 public API가 순수 위임만 하는 façade는 `scripts/check_active_structure_boundaries.py`에서 note로만 추적하고 warning budget 대상으로는 보지 않습니다.
- 구조 정상화 스트림은 현재 마감 상태입니다. 남은 broad shared gateway는 `Core/Plugin` compat shell과 repository/contract 호환면으로만 관리하고, 이후 우선순위는 실제 외부 인증 smoke와 문서 운영 후속 정리(`DOC-111`, `DOC-112`)입니다.
- 원격 계약 smoke도 현재 녹색입니다: `composer run test:api:hurl` 기준 `https://gnurestapi.cc`의 `/api/v1/health`, `/api/docs/index.html`, `/api/docs/openapi.yaml`가 모두 통과했습니다.
- 구조/구현 감사의 현재 기준선은 `composer run audit:structure`, `composer run audit:implementation` 녹색 유지와 OpenAPI ↔ route `missing=0`, `extra=0`입니다.

## 10. 정리 프로세스

```bash
cd ${PROJECT_ROOT}
composer run audit:auto
python3 scripts/doc-processor.py --write
python3 scripts/doc-index.py
python3 scripts/archive_old_audits.py --check --days 7
./scripts/docs-check.sh
```

- `composer run audit:implementation`는 실행 결과를 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`와 `docs/audits/AUDIT_LATEST.md`에 자동 기록합니다.
- 푸시·릴리스 전 전체 로컬 검증은 `composer run ci:local`을 사용합니다. `composer run hooks:install` 후에는 같은 검증이 `pre-push`에서 자동 실행됩니다.
- GitHub-hosted 검증 workflow는 자동 실행하지 않으며, 명시적으로 필요할 때만 `workflow_dispatch` fallback으로 사용합니다.

## 11. 현재 planning 문서의 지위

- `docs/planning/*.md`는 지원 문서입니다.
- `docs/planning/04_G5_DECOUPLING_ROADMAP.md`는 장기 전략 문서이며, 실행 우선순위 SSOT는 `docs/IMPLEMENTATION_ROADMAP.md`입니다.
