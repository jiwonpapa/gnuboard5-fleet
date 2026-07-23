# 문서 ↔ 코드 정합성 감사 보고서 — 2026-03-06

> 기준 시점: 2026-03-06 13:51 KST
> 감사 범위:
> - 코드: `api/routes/*.php`, `api/routes/v1/*.php`, `api/plugins/*/Plugin.php`, `api/v1/**/*`
> - 계약 문서: `api/docs/openapi.yaml`, `docs/API_SPEC.md`
> - 스키마 문서: `docs/ddls/*.md`
> - 운영 문서: `docs/README.md`, `docs/HISTORY.md`, `docs/architecture/*.md`, `docs/testing/API_BLACKBOX_TESTING.md`

---

## 결론

**판정: 🟠 High**

- 가장 심각한 문제는 **코드에 공개 라우트가 존재하지만 OpenAPI 계약에 없는 경로가 30개**라는 점입니다.
- 그다음은 `docs/API_SPEC.md`가 현재 구현을 부분적으로만 설명하고 있고, 문서 자동화/디렉토리 구조 같은 상위 설명도 실제 코드와 다르다는 점입니다.
- 반대로 **OpenAPI에만 있고 코드에 없는 엔드포인트는 0건**이었습니다. 즉, 현재 문제의 중심은 "문서가 코드보다 뒤처진 상태"입니다.

---

## 조사 방법

1. 코드 기준 공개 엔드포인트를 라우트 파일과 플러그인 부트 코드에서 추출
2. `api/docs/openapi.yaml`의 method/path 집합과 대조
3. `docs/API_SPEC.md`의 상세 엔드포인트 블록과 구현 범위 설명을 대조
4. `docs/ddls/*.md` 실제 파일과 `docs/API_SPEC.md`, `docs/README.md`의 링크/인덱스를 대조
5. `docs/README.md`, `docs/architecture/*.md`가 현재 저장소 구조를 정확히 설명하는지 대조

### 집계

| 기준 | 수치 |
|---|---:|
| 코드 기준 공개 method/path | 207 |
| OpenAPI method/path | 177 |
| API_SPEC 상세 블록 method/path | 86 |
| 코드에는 있으나 OpenAPI에 없는 method/path | 30 |
| OpenAPI에는 있으나 코드에 없는 method/path | 0 |

---

## Findings

### F-1. 코드에는 있는데 OpenAPI에 없는 공개 경로 30건

**심각도: Critical**

이 유형은 형님 말씀대로 심각합니다. 외부 소비자, Schemathesis, Hurl, Swagger UI, SDK 생성이 모두 이 계약을 기준으로 움직이기 때문입니다. 구현은 존재하는데 계약서가 없으면 사실상 "숨은 API"가 됩니다.

#### 1) `Admin/System` 21건 누락

코드 근거:
- `api/routes/v1/admin.php:370-438`

누락된 공개 경로:
- `GET /admin/system/auths`
- `POST /admin/system/auths`
- `DELETE /admin/system/auths/{mb_id}/{au_menu}`
- `GET /admin/system/popups`
- `GET /admin/system/popups/{nw_id}`
- `POST /admin/system/popups`
- `PUT /admin/system/popups/{nw_id}`
- `DELETE /admin/system/popups/{nw_id}`
- `GET /admin/system/polls`
- `GET /admin/system/polls/{po_id}`
- `POST /admin/system/polls`
- `PUT /admin/system/polls/{po_id}`
- `DELETE /admin/system/polls/{po_id}`
- `GET /admin/system/qa-config`
- `PUT /admin/system/qa-config`
- `GET /admin/system/theme`
- `PUT /admin/system/theme`
- `GET /admin/system/mails`
- `GET /admin/system/mail-recipients`
- `POST /admin/system/mails/test`
- `POST /admin/system/mails/send`

현재 상태:
- `docs/API_SPEC.md:600-607`에는 요약 문장으로만 존재
- `api/docs/openapi.yaml`에는 개별 path가 없음

처리:
1. OpenAPI에 21개 path를 전부 추가
2. `docs/API_SPEC.md`에도 최소 request/response/auth 수준의 상세 블록 추가
3. 테스트 픽스처가 필요한 경로는 `run_schemathesis.sh` 자동 수집 목록에도 연결

#### 2) `Admin/Groups` 레거시 호환 경로 8건 누락

코드 근거:
- `api/routes/v1/admin.php:159-184`

누락된 경로:
- `GET /admin/groups`
- `POST /admin/groups`
- `GET /admin/groups/{gr_id}`
- `PUT /admin/groups/{gr_id}`
- `DELETE /admin/groups/{gr_id}`
- `GET /admin/groups/{gr_id}/members`
- `POST /admin/groups/{gr_id}/members`
- `DELETE /admin/groups/{gr_id}/members/{mb_id}`

현재 상태:
- `docs/API_SPEC.md:585-586`에 `레거시 호환: /api/v1/admin/groups*`로만 존재
- `api/docs/openapi.yaml`에는 없음

처리:
1. 이 경로를 계속 유지할 거면 OpenAPI에 `deprecated: true`로 추가
2. 유지하지 않을 거면 제거 일정과 sunset 정책을 먼저 잡고 코드 제거
3. 사람용 문서에는 wildcard가 아니라 실제 path 목록으로 명시

#### 3) `GET /setup` 1건 완전 누락

코드 근거:
- `api/routes/v1.php:170-174`
- `api/v1/Setup/Controller/SetupController.php`

현재 상태:
- OpenAPI 없음
- `docs/API_SPEC.md` 없음

처리:
1. 공개 운영용이면 OpenAPI + API_SPEC + `.env.example`의 `SETUP_ENABLED`까지 문서화
2. 내부 전용이면 라우트 노출 정책을 문서에 명시하거나 별도 internal 문서로 격리

### F-2. `API_SPEC.md`가 현재 구현을 상세 계약서로는 따라가지 못함

**심각도: High**

정량 근거:
- 상세 블록 기준 86 method/path
- OpenAPI 기준 177 method/path

이 문제는 "문서가 없다"라기보다 "사람용 문서가 일부만 상세하고 나머지는 요약 나열"인 상태입니다.

대표 누락/축약:
- `Admin/System` 전부 요약만 있고 상세 계약 없음
- `/boards/{bo_table}/posts/{wr_id}/files*` 계열 canonical 경로가 상세 블록에 없음
  - 사람용 문서에는 `GET /api/v1/files/{bo_table}/{wr_id}/{bf_no}`만 존재
- 관리자 메일, 관리자 보드, 관리자 컨텐츠/FAQ/메뉴/포인트/방문 통계 등은 OpenAPI에는 있으나 `API_SPEC.md`에는 상세 블록 부재

처리:
1. `docs/API_SPEC.md`의 역할을 명확히 정해야 함
2. 상세 계약서 역할이면 OpenAPI와 동등한 수준으로 보강
3. 개요/정책 문서 역할로 낮출 거면 첫머리에 "상세 계약은 openapi.yaml 기준"을 명시

### F-3. 문서 자동화 설명이 실제 구현과 다름

**심각도: High**

문서 근거:
- `docs/API_SPEC.md:29-30`
- `docs/API_SPEC.md:115-116`

현재 문구:
- PHP Attributes로 OpenAPI를 자동 생성한다고 설명

실제 상태:
- `api/` PHP 코드에서 `OpenApi\\Attributes`, `use OpenApi`, `@OA\\` 사용 0건
- 스크립트에서도 OpenAPI 생성 단계 없음
- 현재 운영은 `api/docs/openapi.yaml` 수동 유지 모델

처리:
1. 실제로 자동 생성할 계획이면 attribute 기반 생성 파이프라인 구현
2. 당장 그럴 계획이 없으면 문서를 "수동 YAML 유지"로 정정
3. 현재 상태에서는 2번이 우선

### F-4. `API_SPEC.md`의 디렉토리 구조 설명이 현재 코드 구조와 다름

**심각도: Medium**

문서 근거:
- `docs/API_SPEC.md:123-129`

현재 문구:
- `/Controllers`, `/Services`, `/Repositories`, `/Models` 같은 집약형 구조 설명

실제 코드:
- `api/v1/<Domain>/Controller|Service|Repository`
- `api/v1/Core/DTO`, `api/v1/Support`, `api/v1/Integration`, `api/v1/Admin/*`

처리:
1. 현재 실제 구조 기준으로 아키텍처 섹션을 다시 그림
2. Admin/Core/Integration/Support/Setup 분기까지 반영

### F-5. DDL 문서는 존재하지만 주요 링크/인덱스가 절반 이상 누락

**심각도: Medium**

정량 근거:
- 실제 DDL 문서: 25개
- `docs/API_SPEC.md` DDL 레퍼런스 링크: 13개
- 누락된 링크: 12개

`docs/API_SPEC.md`에서 빠진 주요 DDL:
- `group`
- `content`
- `faq`
- `memo`
- `qa`
- `popular`
- `visit`
- `poll`
- `new_win`
- `mail`
- `scrap`
- `api_tables`

영향:
- 문서가 스스로 "도메인별 DDL 문서를 기준으로 구현"하라고 말하면서, 실제 관련 문서를 충분히 연결하지 못함

처리:
1. `docs/API_SPEC.md`의 DDL 레퍼런스를 실제 public/admin 도메인 기준으로 전부 확장
2. `Popup`은 `new_win`, `Mail`은 `mail`, `Poll`은 `poll`처럼 용어 매핑까지 같이 써야 함

### F-6. `docs/README.md` 인덱스가 현재 문서 트리를 따라가지 못함

**심각도: Medium**

근거:
- `docs/README.md:34-50`

확인된 문제:
- `docs/codex/` 실제 디렉토리 10개 중 4개 미기재
  - `audit-remediation`
  - `fidelity-remediation`
  - `swagger`
  - `type-safety`
- `AUDIT_LATEST.md`가 이미 존재하는데 `생성 예정`으로 표기
- 규칙 3번은 `PROMPT.md/RESULT.md 쌍`을 강제하지만 실제로는 `auth-member`, `audit-remediation`, `swagger`, `type-safety` 등 PROMPT-only 디렉토리가 존재

처리:
1. 문서 인덱스를 실제 트리 기준으로 갱신
2. Codex 규칙을 "필요 시 RESULT.md" 또는 "PROMPT-only 허용 유형"으로 현실화
3. 감사 문서 섹션 설명을 현재 운영 상태에 맞게 수정

### F-7. 아키텍처 드래프트가 실제 코드보다 앞서 있거나 다른 이름을 사용함

**심각도: Medium**

근거:
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md:103-106`
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md:170`
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md:178-180`
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md:241-266`

문서에 있으나 코드에서 확인되지 않은 예:
- `G5MemberRepository`
- `G5PostRepository`
- `MemberDto`
- `G5CompatibilityChecker`
- `USE_G5_REPO_AUTH`

주의:
- 파일명이 `DRAFT`라서 완전한 계약 위반으로 보긴 어렵지만,
- `[x] 완료 기준`과 구체 클래스명이 섞여 있어 독자가 "이미 구현된 실체"로 오해하기 쉬움

처리:
1. 진짜 설계 초안이면 체크박스/완료 표현 제거
2. 현행 구조 설명 문서로 유지할 거면 실제 클래스명과 전략으로 전면 갱신
3. 지금 상태에서는 "초안"보다는 "구버전 제안서"에 가까움

### F-8. 에러 응답 가이드 문서와 구현이 완전히 일치하지 않음

**심각도: Medium**

문서 근거:
- `docs/API_SPEC.md:842-977`
- `docs/API_SPEC.md:970-973`

실제 상태:
- `Api\\Core\\Exception\\ApiException`은 `guide`를 지원
- 하지만 `Api\\Support\\Exception\\ApiException`은 `guide`를 지원하지 않음
- 저장소 내에서 legacy `Support\\Exception\\ApiException` 사용 흔적이 100건 이상 존재

영향:
- 문서는 "모든 ApiException 계열 예외"가 `guide`를 가진다고 설명하지만,
- 실제 구현은 코어 예외/레거시 예외가 혼재함

처리:
1. 문서 표현을 "Core ApiException 경로에서 지원"으로 좁히거나
2. 레거시 예외 계층까지 `guide`를 도입하고 점진적으로 통합

---

## 문서에만 있는데 코드가 없는 항목

이 유형은 무조건 "코드부터 구현"으로 가면 안 됩니다. 문서의 종류에 따라 처리 원칙이 다릅니다.

### 계약 문서(OpenAPI, API_SPEC의 활성 계약)

- 문서에 있고 코드가 없으면 **실제 미구현으로 간주**
- 처리 원칙:
  1. 우선순위가 맞으면 코드 구현
  2. 당장 안 할 기능이면 문서에서 제거 또는 `planned`, `deprecated`, `internal`로 상태 변경

### 계획/초안 문서(planning, DRAFT)

- 문서에 있고 코드가 없다고 해서 자동으로 구현 대상으로 승격하면 안 됨
- 처리 원칙:
  1. 아직 계획이면 상태를 `planned`로 명확화
  2. 폐기된 방향이면 archive 이동 또는 문구 삭제
  3. 활성 계약 문서처럼 쓰이지 않게 제목/상태를 분명히 표시

이번 감사에서 대표 사례:
- `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md`의 G5 Repository/토글/Compatibility Guard 계열
- `docs/API_SPEC.md`의 PHP Attributes 자동 생성 설명
- `API_DOCS_BASE_URL` 환경변수 설명

---

## 처리 원칙

### 1. 코드에는 있는데 문서가 없다

**심각**

- 공개 API면 바로 문서 역산
- 순서:
  1. OpenAPI 작성
  2. API_SPEC 보강
  3. 필요한 DDL 링크 연결
  4. 테스트/감사 스크립트 반영

### 2. 코드는 보강됐는데 문서가 누락됐다

**중요**

- 코드가 source of truth인 상태이므로 문서 업데이트가 후속 필수
- 특히 alias, deprecated 경로, admin 상세 계약, request/response body를 놓치지 말아야 함

### 3. 문서에는 있는데 코드는 미구현이다

**계약 문서면 구현 또는 문서 철회 둘 중 하나**

- 구현할지 말지 결정되지 않은 상태로 문서에 남겨두는 것이 가장 나쁨
- 계약 문서에 남길 거면 구현
- 구현 안 할 거면 문서에서 내리거나 상태 명시

---

## 우선순위 제안

### P0

1. `api/docs/openapi.yaml`에 `Admin/System` 21개 path 추가
2. `api/docs/openapi.yaml`에 `Admin/Groups` 레거시 alias 8개를 `deprecated: true`로 추가
3. `GET /setup`의 공개/내부 정책 결정 후 문서화

### P1

1. `docs/API_SPEC.md`를 현재 계약 모델에 맞게 재정비
2. "PHP Attributes 자동 생성" 문구 삭제 또는 실제 구현
3. 디렉토리 구조 설명을 현행 구조로 수정
4. DDL 레퍼런스 섹션을 25개 문서 기준으로 재작성

### P2

1. `docs/README.md` 인덱스와 Codex 규칙 현실화
2. `docs/architecture/G5_INTEGRATION_LAYER_DRAFT.md` 상태 재정의
3. `docs-check.sh`에 route/openapi/API_SPEC diff 검사 추가

---

## 최종 한 줄 판정

> **지금 저장소의 핵심 문제는 "코드가 없는데 문서가 앞서는 상태"보다 "코드는 있는데 계약 문서가 뒤처진 상태"입니다.** 우선은 공개 API 30건의 문서 역산부터 바로 들어가는 게 맞습니다.
