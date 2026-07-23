# Codex Wrapper For PHP

이 디렉토리는 **그누보드5 REST API 제공자** 프로젝트입니다.
Codex는 이 파일을 `php` 작업의 1차 진입점으로 사용합니다.

## 1. 프로젝트 정체성

- 이 프로젝트는 그누보드5 코어를 직접 수정하지 않고, `g5_*` 테이블 위에 REST API를 제공하는 레이어입니다.
- 활성 소비단은 `rust`입니다.
- `flutter`, `web`는 기본 구현/감사 범위에서 제외합니다.
- 범위는 CMS/커뮤니티 기능으로 한정합니다.
- 쇼핑몰(`shop/`)은 기본 구현·분석·감사 범위에서 제외합니다.
- `adm/shop_admin/`은 레거시 포팅·필드 정합성 감사 범위에 포함됩니다.

## 2. 최우선 규칙

- 코어 파일(`common.php`, `lib/`, `head.php`, `tail.php`, `adm/` 레거시 코어)을 직접 수정하지 않습니다.
- 공개 계약 SSOT는 `api/docs/openapi.yaml`입니다.
- 문서 SSOT는 `docs/README.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/TODO.md`, `docs/HISTORY.md`, `docs/AUDIT_SYSTEM.md`, `docs/DOCUMENT_REGISTRY.md`입니다.
- Service는 HTTP 객체, `$_ENV/getenv`, `$GLOBALS`, 레거시 함수에 직접 의존하면 안 됩니다.
- 중앙 조립 파일(`api/routes/v1.php`, `api/routes/v1/admin.php`, `api/container.php`)은 조립기 역할만 해야 합니다.

## 3. Codex 기본 실행 순서

일반 작업 마감 기본 진입점:

```bash
composer run audit:auto
```

- `audit:auto`는 현재 변경 파일 또는 CI diff-base를 기준으로 필요한 감사를 자동 선택합니다.

감사 범위를 명시적으로 고정해야 할 때:

```bash
composer run audit:implementation
```

- `audit:implementation`는 결과를 `docs/audits/AUDIT_REPORT_YYYY-MM-DD.md`와 `docs/audits/AUDIT_LATEST.md`에 자동 기록합니다.

구조가 흔들리거나 대규모 리팩터링 전후:

```bash
composer run audit:structure
```

`adm/*.php`, `/admin/schema`, generated registry를 건드렸을 때:

```bash
composer run audit:porting
```

## 4. 추가 감사 조건

아래 변경은 `audit:auto`가 기본적으로 `composer run audit:integrated`까지 승격합니다.

- `api/docs/openapi.yaml`
- `api/v1/Admin/Schema/**`
- 인증/에러 응답 계약
- Rust가 읽는 DTO/enum/기본값 의미
- `api/routes/**`, `tests/contract/**`, `api/v1/*/{Dto,Dtos,Response,Responses,Enum,Enums,Definition,Definitions}/**`

아래 변경은 `composer run audit:porting`를 추가합니다.

- `adm/*.php`
- `api/v1/Admin/Schema/schema-domains.json`
- `api/v1/Admin/Schema/Data/generated/*.json`
- 관리자 create/edit 기본값, 라벨, required, section 의미

중요:

- `php`는 **공급자 감사**를 담당합니다.
- Rust 소비단 drift, UI fallback, create/edit 적용 방식의 최종 판정은 `rust`의 소비 감사가 담당합니다.

## 5. 실제 상세 규칙 위치

- 헌법: `.agent/Constitution.md`
- 감사 운영 SSOT: `docs/AUDIT_SYSTEM.md`
- 감사 전략: `docs/AUDIT_STRATEGY.md`
- 문서 거버넌스: `.agent/sub-constitutions/document-governance.md`
- 구현 감사 설명: `.agent/workflows/audit.md`
- 구조 감사 설명: `.agent/workflows/deep-audit.md`
- 포팅 정합성 감사 설명: `.agent/workflows/field-parity-audit.md`

원칙:

- 위 워크플로우 문서는 **설명서**입니다.
- 실제 실행 진입점은 항상 `composer run audit:*` 입니다.
- role-based 명령은 `audit:implementation`, `audit:structure`, `audit:porting`를 우선 사용하고, 기존 `audit:standard`, `audit:deep`, `audit:field-parity`는 호환 alias로만 유지합니다.
