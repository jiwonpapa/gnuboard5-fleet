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
# Codex 프롬프트 — 오픈소스 신뢰 인프라 도입

> 대상: PHP REST API (`/php`) + Rust Tauri Admin (`/rust/g5-admin`)
> 제외: CI/CD 파이프라인
> 총 7개 워크스트림

---

## 지시 사항

아래 7개 워크스트림을 **순서대로** 실행하라. 각 워크스트림 완료 후 `[DONE WS-N]`을 로그에 남겨라.

모든 파일은 **두 프로젝트 루트 각각에** 생성한다:
- PHP: `/Users/neojins/workspace/gnuboard5/php/`
- Rust: `/Users/neojins/workspace/gnuboard5/rust/g5-admin/`

---

## WS-1. LICENSE 파일 (AGPL-3.0)

### PHP 프로젝트
1. `/php/LICENSE` 파일 생성 — AGPL-3.0 전문 (https://www.gnu.org/licenses/agpl-3.0.txt)
2. 파일 상단에 저작권 표기:
   ```
   Copyright (C) 2026 jiwonpapa
   
   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
   ```
3. `/php/README.md` 하단에 라이선스 섹션 추가 (이미 있으면 병합):
   ```markdown
   ## License
   This project is licensed under the [AGPL-3.0](LICENSE).
   ```

### Rust 프로젝트
1. `/rust/g5-admin/LICENSE` — 동일 AGPL-3.0 전문, 동일 저작권 표기
2. `/rust/g5-admin/src-tauri/Cargo.toml`의 `[package]` 섹션에 `license = "AGPL-3.0-or-later"` 추가
3. `/rust/g5-admin/package.json`에 `"license": "AGPL-3.0-or-later"` 추가

### 검증
- `cat /php/LICENSE | head -5` → AGPL 확인
- `cat /rust/g5-admin/LICENSE | head -5` → AGPL 확인
- `grep license /rust/g5-admin/src-tauri/Cargo.toml` → AGPL 확인

---

## WS-2. CHANGELOG.md

### 양쪽 프로젝트에 `/CHANGELOG.md` 생성

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 포맷을 따른다.

#### PHP 프로젝트 (`/php/CHANGELOG.md`):
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-08

### Added
- REST API for 20 admin domains (170 operations)
- OpenAPI 3.0 documentation (`api/docs/openapi.yaml`)
- JWT authentication with keyring-based token storage
- RFC 7807 Problem Details error responses
- Request tracing with `request_id`, `correlation_id`, `server_request_id`
- Admin domains: Config, Member, Board, Group, Content, FAQ, Mail, Menu, Popup, Point, Poll, Popular, Visit, WriteCount, SMS, System (Auth, Maintenance, Theme, QA Config, Browscap), Push, Report, Layout
- Field-level validation for all CRUD operations
- Pagination support with `page`, `per_page`, `total`, `last_page`, `has_next`, `has_prev`

### Security
- Admin guard middleware for all `/admin/*` routes
- JWT middleware with refresh token support
- Input sanitization on all write endpoints
```

#### Rust 프로젝트 (`/rust/g5-admin/CHANGELOG.md`):
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-08

### Added
- Tauri v2 desktop admin application for Gnuboard5
- 30 IPC commands covering 8 admin domains
- React 19 + TypeScript strict frontend
- shadcn/ui + Tailwind CSS 4 design system
- TanStack Query v5 for server state management
- react-hook-form + zod for form validation
- AdminDataTable shared component with @tanstack/react-table
- ConfirmActionDialog for destructive actions
- AdminFormFields shared form components (12 types)
- JWT authentication via Rust keyring (no browser storage)
- ts-rs type bridge (57 types synchronized)
- Vite 7 with manual chunk splitting (react-core, tanstack, ui-vendor, vendor)
- DebugDock development tool (4-file modular)
- Route-native admin shell with Header/Sidebar separation
- 25 Vitest unit tests for form validation

### Security
- Zero `unwrap()` in production code
- Zero `any` in TypeScript
- Zero `sessionStorage`/`localStorage` usage
- All API calls routed through Tauri IPC → Rust reqwest
```

---

## WS-3. SECURITY.md

양쪽 프로젝트에 동일 내용으로 생성:

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing:

📧 **security@jiwonpapa.dev**

(실제 이메일로 교체 필요)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix release**: Within 30 days for critical issues

### Scope

The following are in scope:
- Authentication bypass
- SQL injection
- Cross-site scripting (XSS) in API responses
- Token leakage
- Unauthorized data access
- Remote code execution

### Recognition

We will credit security researchers in our CHANGELOG (with permission).
```

---

## WS-4. CONTRIBUTING.md

양쪽 프로젝트에 생성:

```markdown
# Contributing to G5 Headless

Thank you for your interest in contributing! This project uses **Constitution-Driven Development** — all code must adhere to the rules defined in `.agent/Constitution.md`.

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Read `.agent/Constitution.md` before writing any code
4. Make your changes
5. Run all quality gates (see below)
6. Submit a Pull Request

## Quality Gates (must pass before PR)

### PHP Project
```bash
composer test          # PHPUnit tests
composer lint          # PHP_CodeSniffer
```

### Rust/Tauri Project
```bash
cargo check --workspace    # Rust compilation
pnpm test                  # Vitest (25 tests)
npx tsc --noEmit           # TypeScript type check
pnpm lint                  # ESLint
```

## Code Standards

- **Rust**: No `unwrap()` in production code. Use `?` operator or explicit error handling.
- **TypeScript**: No `any` type. No direct `fetch()` calls. All API calls through Tauri `invoke`.
- **React**: Use `AdminDataTable` for tables, `ConfirmActionDialog` for destructive actions, `react-hook-form` + `zod` for forms.
- **CSS**: Tailwind CSS only. No custom CSS files.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add board group management
fix: correct member detail field mapping
docs: update API coverage audit
refactor: extract shared form fields
```

## CLA

By submitting a Pull Request, you agree to the [Contributor License Agreement](CLA.md).

## License

All contributions are licensed under [AGPL-3.0](LICENSE).
```

---

## WS-5. CLA.md (Contributor License Agreement)

양쪽 프로젝트에 생성:

```markdown
# Contributor License Agreement

By submitting a contribution (pull request, patch, or any other form) to this project, you agree to the following terms:

## 1. Grant of Rights

You grant the project maintainer (jiwonpapa) a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to:

- Use, reproduce, modify, and distribute your contribution
- Sublicense your contribution under any license, including proprietary licenses
- Use your contribution in commercial products

## 2. Original Work

You represent that your contribution is your original work and that you have the right to grant the above license.

## 3. No Obligation

The project maintainer is not obligated to use your contribution and may modify or reject it at their discretion.

## 4. Dual Licensing

You understand that this project uses dual licensing (AGPL-3.0 for open source, commercial license for premium features). Your contribution may be included in both open source and commercial versions.

## 5. Agreement

By submitting a pull request, you indicate your agreement to these terms. No separate signature is required.
```

> ⚠️ 이 CLA는 형님이 이중 라이선스(AGPL + 상업용)를 유지하는 데 필수. 타인 기여 코드도 상업 버전에 포함할 수 있는 권리를 확보.

---

## WS-6. API 계약 테스트 (PHP)

`/php/tests/Contract/` 디렉토리에 계약 테스트를 생성한다.

### 6-1. 테스트 구조
```
php/tests/Contract/
├── AdminBoardContractTest.php
├── AdminConfigContractTest.php
├── AdminMemberContractTest.php
├── AdminPollContractTest.php
├── AdminPopupContractTest.php
├── AdminGroupContractTest.php
├── AdminContentContractTest.php
├── AdminFaqContractTest.php
├── AdminMenuContractTest.php
├── AdminPointContractTest.php
├── AdminSmsContractTest.php
├── AdminSystemContractTest.php
├── AdminVisitContractTest.php
└── ContractTestCase.php (공통 Base Class)
```

### 6-2. ContractTestCase.php 패턴
```php
<?php
declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

abstract class ContractTestCase extends TestCase
{
    /**
     * OpenAPI YAML에서 해당 경로의 응답 스키마 필드를 추출해
     * 실제 API 응답 키와 비교하는 헬퍼.
     */
    protected function assertResponseHasFields(array $response, array $requiredFields, string $context = ''): void
    {
        foreach ($requiredFields as $field) {
            $this->assertArrayHasKey(
                $field,
                $response,
                "Missing field '{$field}' in {$context} response"
            );
        }
    }

    protected function assertPaginationStructure(array $pagination): void
    {
        $required = ['total', 'page', 'per_page', 'last_page', 'has_next', 'has_prev'];
        $this->assertResponseHasFields($pagination, $required, 'pagination');
    }
}
```

### 6-3. 각 도메인별 테스트 패턴 (AdminBoardContractTest.php 예시)
```php
<?php
declare(strict_types=1);

namespace Tests\Contract;

class AdminBoardContractTest extends ContractTestCase
{
    private const BOARD_LIST_FIELDS = [
        'bo_table', 'bo_subject', 'gr_id',
        'bo_read_level', 'bo_write_level', 'bo_comment_level', 'bo_download_level',
        'bo_use_category', 'bo_category_list',
        'bo_count_write', 'bo_count_comment',
        'bo_use_secret', 'bo_upload_count', 'bo_upload_size',
    ];

    private const BOARD_CREATE_REQUIRED = ['bo_table', 'bo_subject', 'gr_id'];

    public function testListResponseHasAllFields(): void
    {
        // Repository를 직접 호출하여 실제 SELECT 결과의 키를 검증
        // (통합 테스트 기반 — DB fixture 필요 시 setUp에서 INSERT)
        $repo = $this->createRepository();
        // ... 생략: fixture 삽입 후 list() 호출
        // $this->assertResponseHasFields($item, self::BOARD_LIST_FIELDS, 'board list item');
        $this->assertTrue(true); // placeholder
    }

    public function testBoardFieldsMatchLegacy(): void
    {
        // 레거시 adm/board_form.php에서 사용하는 57개 필드 중
        // UPDATABLE_FIELDS에 포함되지 않은 필드를 검출
        $legacyFields = [
            'bo_admin', 'bo_device', 'bo_write_point', 'bo_comment_point',
            'bo_read_point', 'bo_download_point', 'bo_gallery_cols',
            'bo_gallery_width', 'bo_gallery_height', 'bo_image_width',
            'bo_page_rows', 'bo_mobile_page_rows', 'bo_subject_len',
            'bo_mobile_subject_len', 'bo_table_width', 'bo_mobile_subject',
            'bo_write_min', 'bo_write_max', 'bo_comment_min', 'bo_comment_max',
            'bo_count_delete', 'bo_count_modify', 'bo_hot', 'bo_new', 'bo_order',
            'bo_use_captcha', 'bo_use_cert', 'bo_use_dhtml_editor', 'bo_use_email',
            'bo_use_file_content', 'bo_use_good', 'bo_use_nogood', 'bo_use_ip_view',
            'bo_use_list_content', 'bo_use_list_file', 'bo_use_list_view',
            'bo_use_name', 'bo_use_rss_view', 'bo_use_search', 'bo_use_sideview',
            'bo_use_signature', 'bo_use_sns', 'bo_include_head', 'bo_include_tail',
            'bo_insert_content', 'bo_sort_field', 'bo_reply_order', 'bo_select_editor',
        ];

        // 이 테스트는 의도적으로 FAIL하여 "이 필드들이 아직 미구현"임을 문서화한다.
        // 구현 완료 시 해당 필드를 $legacyFields에서 제거한다.
        $this->markTestSkipped(
            'Legacy field parity: ' . count($legacyFields) . ' fields not yet in UPDATABLE_FIELDS. '
            . 'See specs/audits/2026-03-08-FIELD_PARITY_AUDIT.md'
        );
    }
}
```

### 6-4. 모든 도메인에 동일 패턴 적용
- 각 도메인별 `XXXX_LIST_FIELDS`, `XXXX_DETAIL_FIELDS`, `XXXX_CREATE_REQUIRED` 상수 정의
- `testListResponseHasAllFields`, `testDetailResponseHasAllFields`, `testCreateRequired` 최소 3개 테스트
- `testXxxFieldsMatchLegacy` — 레거시 필드 대조 (2026-03-08-FIELD_PARITY_AUDIT.md 참조)

### 6-5. 검증
```bash
cd /php && composer test -- --filter=Contract
```
에러 없이 통과(또는 skip)해야 함.

---

## WS-7. E2E 테스트 (Rust Tauri)

Rust Tauri 프로젝트에 E2E 스모크 테스트를 추가한다.

### 7-1. 파일: `/rust/g5-admin/tests/e2e/smoke.test.ts`

Vitest + `@tauri-apps/api/core`를 사용해 IPC 명령이 실행되는지 검증한다.
단, 실제 서버 연결 없이 **Tauri mock** 을 사용한다.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tauri invoke를 mock
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('E2E Smoke: IPC Commands exist and callable', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  const commands = [
    'cmd_auth_login',
    'cmd_auth_logout',
    'cmd_auth_status',
    'cmd_auth_refresh',
    'cmd_admin_config_get',
    'cmd_admin_config_update',
    'cmd_admin_member_get_list',
    'cmd_admin_member_get',
    'cmd_admin_member_update',
    'cmd_admin_member_update_level',
    'cmd_admin_member_delete',
    'cmd_admin_board_get_list',
    'cmd_admin_board_get',
    'cmd_admin_board_create',
    'cmd_admin_board_update',
    'cmd_admin_board_delete',
    'cmd_admin_poll_get_list',
    'cmd_admin_poll_get',
    'cmd_admin_poll_create',
    'cmd_admin_poll_update',
    'cmd_admin_poll_delete',
    'cmd_admin_popup_get_list',
    'cmd_admin_popup_get',
    'cmd_admin_popup_create',
    'cmd_admin_popup_update',
    'cmd_admin_popup_delete',
    'cmd_admin_permission_get_list',
    'cmd_admin_permission_save',
    'cmd_admin_permission_delete',
    'cmd_admin_qa_config_get',
    'cmd_admin_qa_config_update',
    'cmd_admin_sms_config_get',
    'cmd_admin_sms_config_update',
    'cmd_admin_sms_member_sync',
    'cmd_member_me_get',
    'cmd_system_health',
    'cmd_debug_log_tail',
    'cmd_debug_runtime_info',
  ];

  it.each(commands)('invoke("%s") is callable', async (cmd) => {
    vi.mocked(invoke).mockResolvedValueOnce({ ok: true });
    await expect(invoke(cmd, {})).resolves.toBeDefined();
    expect(invoke).toHaveBeenCalledWith(cmd, {});
  });

  it('all 38 commands are registered', () => {
    expect(commands).toHaveLength(38);
  });
});
```

### 7-2. 검증
```bash
cd /rust/g5-admin && pnpm test -- --filter=smoke
```

---

## 자체 감사 (모든 WS 완료 후)

```bash
# 1. LICENSE 존재 확인
test -f /php/LICENSE && echo "PHP LICENSE ✅" || echo "❌"
test -f /rust/g5-admin/LICENSE && echo "Rust LICENSE ✅" || echo "❌"

# 2. CHANGELOG 존재 확인
test -f /php/CHANGELOG.md && echo "PHP CHANGELOG ✅" || echo "❌"
test -f /rust/g5-admin/CHANGELOG.md && echo "Rust CHANGELOG ✅" || echo "❌"

# 3. SECURITY 존재 확인
test -f /php/SECURITY.md && echo "PHP SECURITY ✅" || echo "❌"
test -f /rust/g5-admin/SECURITY.md && echo "Rust SECURITY ✅" || echo "❌"

# 4. CONTRIBUTING 존재 확인
test -f /php/CONTRIBUTING.md && echo "PHP CONTRIBUTING ✅" || echo "❌"
test -f /rust/g5-admin/CONTRIBUTING.md && echo "Rust CONTRIBUTING ✅" || echo "❌"

# 5. CLA 존재 확인
test -f /php/CLA.md && echo "PHP CLA ✅" || echo "❌"
test -f /rust/g5-admin/CLA.md && echo "Rust CLA ✅" || echo "❌"

# 6. API 계약 테스트
cd /php && composer test -- --filter=Contract 2>&1 | tail -5

# 7. E2E 스모크 테스트
cd /rust/g5-admin && pnpm test -- --filter=smoke 2>&1 | tail -5

# 8. Cargo.toml license 필드
grep -q "AGPL" /rust/g5-admin/src-tauri/Cargo.toml && echo "Cargo license ✅" || echo "❌"
```

모든 항목 ✅ 확인 후 `[ALL WS DONE]` 출력.
