---
doc_type: support
status: archived
owner: rust-admin
source_of_truth: false
ai_default_include: false
last_reviewed: 2026-03-13
review_cycle_days: 90
bounded_context: codex
---
# Codex 프롬프트 — 관리자 필드 메타데이터 레지스트리와 `/admin/schema` 구현

> 목적: 레거시 `adm/*.php` 폼에 박혀 있던 한글 라벨/섹션/입력 타입을 1회 추출해 구조화된 generated registry로 만들고, PHP REST API가 `/admin/schema`로 이를 제공하며, Rust/Flutter/Web 클라이언트가 이 메타데이터를 소비하게 한다.
> 대상:
> - PHP: `/Users/neojins/workspace/gnuboard5/php`
> - Rust: `/Users/neojins/workspace/gnuboard5/rust`
> - Flutter: `/Users/neojins/workspace/gnuboard5/flutter`

## 핵심 원칙

1. 레거시 `adm/*.php`는 bootstrap source다.
- 타당성:
  - 기존 SSR에서 실제 운영자가 보던 한글 제목과 설명이 이미 여기 있다.
  - `bo_subject`, `cf_title`, `mb_hp` 같은 payload key만으로는 클라이언트가 필드 의미를 알 수 없다.
  - 새 클라이언트가 레거시 PHP를 매번 수동 참조하는 구조는 재사용 구조가 아니다.

2. 운영 시점의 진실 원본은 레거시 PHP가 아니라 generated registry + `/admin/schema`다.
- 런타임에 클라이언트가 `adm/*.php`를 직접 읽지 않는다.
- 레거시 추출 결과는 JSON registry로 고정한다.
- 서버는 registry를 읽어 `/admin/schema`로 내리고, 클라이언트는 그 응답만 소비한다.

3. validator/OpenAPI/UI는 같은 방향을 봐야 한다.
- 사람이 수정하는 canonical 입력은 PHP 메타데이터 추출 파이프라인이다.
- OpenAPI와 route-native UI는 generated 결과를 소비한다.

## 현재 권장 구조

### PHP

- 추출 스크립트:
  - `/Users/neojins/workspace/gnuboard5/php/scripts/extract_admin_schema.py`
- generated registry:
  - `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/boards.json`
  - `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/config.json`
  - `/Users/neojins/workspace/gnuboard5/php/api/v1/Admin/Schema/Data/generated/members.json`
- runtime endpoint:
  - `GET /admin/schema`
  - `GET /admin/schema/{domain}`

### Rust

- Tauri command:
  - `cmd_admin_schema_get_catalog`
  - `cmd_admin_schema_get`
- React query hook:
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/schema/useAdminFieldSchema.ts`
- route-native 소비 우선 대상:
  - boards
  - config
  - members

## 작업 절차

### WS-1. 레거시 폼에서 메타데이터 추출

대상 우선순위:
- P1: `boards`, `config`, `members`
- P2: `polls`, `popups`, `contents`, `faq-masters`, `menus`, `groups`

추출 규칙:
- `<label for="">`, `<th>`, `name=""`, `<select>`, `<option>`, helper call을 읽는다.
- `required`, `create_only`, `readonly_on_update`, `input_type`, `data_type`, `options`를 구조화한다.
- 동적 helper(`get_member_level_select`, `get_group_select`, `get_skin_select`)는 parser에서 별도 처리한다.

실행:

```bash
cd /Users/neojins/workspace/gnuboard5/php
python3 ./scripts/extract_admin_schema.py
```

### WS-2. PHP `/admin/schema` API 제공

필수 파일:
- `api/v1/Admin/Schema/Repository/AdminSchemaRepository.php`
- `api/v1/Admin/Schema/Service/AdminSchemaService.php`
- `api/v1/Admin/Schema/Controller/AdminSchemaController.php`
- `api/routes/v1.php`
- `api/routes/v1/admin.php`
- `api/docs/openapi.yaml`

응답 규칙:
- catalog는 `items`, `total`
- detail은 `sections`, `fields_by_name`
- `fields_by_name`는 클라이언트가 라벨 lookup을 빠르게 하기 위한 맵이다

### WS-3. Rust/Tauri 소비 계층 연결

필수 파일:
- `src-tauri/src/models/schema.rs`
- `src-tauri/src/api_client/schema.rs`
- `src-tauri/src/commands/schema.rs`
- `src/api/client/schema.ts`
- `src/features/schema/useAdminFieldSchema.ts`

### WS-4. route-native UI의 하드코딩 제거

원칙:
- 필드명은 payload key를 유지한다.
- 라벨/설명/선택지는 API 메타데이터를 우선 사용한다.
- API 메타데이터가 없을 때만 로컬 fallback 라벨을 허용한다.

우선 치환 대상:
- `BoardFormFields.tsx`
- `AdminConfigPage.tsx`
- `MemberDetailCard.tsx`

추가 규칙:
- `textarea`, `select`, `checkbox`는 schema `input_type` 기준으로 렌더링한다.
- `options`가 비어 있는 select는 text input fallback을 허용한다.

## 감사와 워크플로우

- 별도 감사로 빼지 말고 기존 field parity 감사에 포함한다.
- 기준 문서:
  - `/Users/neojins/workspace/gnuboard5/php/.agent/workflows/field-parity-audit.md`
  - `/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-09-FIELD_METADATA_AUDIT.md`

감사 체크포인트:
- `/admin/schema` 라우트 존재
- OpenAPI 경로/스키마 존재
- generated registry 존재
- P1 도메인(`boards/config/members`) JSON 생성 여부
- Rust route-native 화면이 API 메타데이터를 실제 소비하는지
- React 라벨 하드코딩이 감소했는지

## 검증 명령

```bash
cd /Users/neojins/workspace/gnuboard5/php
python3 ./scripts/extract_admin_schema.py
composer run contract:manifest
composer run contract:check
vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php tests/contract/AdminSchemaContractTest.php

cd /Users/neojins/workspace/gnuboard5/rust/g5-admin
pnpm contract:generate
pnpm lint
pnpm test
pnpm build

cd /Users/neojins/workspace/gnuboard5/rust
cargo test export_ts_bindings -- --nocapture
cargo test -p g5-admin-desktop
```

## 금지

- 클라이언트가 레거시 `adm/*.php`를 직접 참조하게 만들지 말 것
- 라벨 원본을 React/Flutter에 다시 하드코딩해 복제 SSOT를 만들지 말 것
- 레거시 HTML 파싱 결과를 런타임 진실 원본으로 취급하지 말 것

## 완료 기준

- PHP가 `/admin/schema`를 제공한다.
- P1 도메인 registry가 generated 상태로 커밋된다.
- Rust route-native `boards/config/members`가 API 메타데이터를 소비한다.
- field parity 감사 Phase 4.5가 🔴에서 🟢 또는 최소 🟡로 바뀐다.
