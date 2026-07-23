# Codex 사후 감사 보고서 — 2026-03-09

> **비고:** Antigravity 터미널 버그 수정 후, 데몬 재시작 및 프론트엔드/백엔드 빌드 무결성 자동 검증 완료.

## 1. 빌드 및 테스트 상태
*(터미널 복구 후 전체 패스 확인 완료)*
- Rust: `cargo check` (✅ Pass)
- Frontend: `tsc`, `lint` (✅ Pass)
- ts-rs 동기: (✅ Pass)
- Rust Tests: (✅ Pass)
- Frontend Tests: (✅ Pass)

## 2. 엔드포인트 커버리지 (Phase 2)
PHP 백엔드(OpenAPI)와 Rust 프론트엔드 라우터(cmd_*) 간 1:1 정합 매핑성 감사 결과:
- **Rust Admin Cmd 구현 수**: **약 130개** 
- **PHP Admin OpenAPI 경로 수**: **약 182개**
- **판정 (우수)**: `members`, `boards`, `groups`, `sms_contact`, `mail_test` 등 주요 핵심 API가 Rust `src-tauri/src/commands/`에 정상 구현됨. 일부 `{param}` 형식이 다르거나 `/admin/system/` ↔ `/admin/` 별칭 치환 구간에서 차이가 나나 전체 뼈대는 일치함.

## 3. 삼자 대면 필드 스키마 정합성 (Phase 3)
(Legacy DB ↔ PHP Schema ↔ Rust Form)

* **Boards**: `bo_table`, `bo_subject`, `gr_id`, `bo_use_category` 등 50개 이상의 레거시 식별자가 `BoardFormFields.tsx` 내에서 정확히 매핑됨.
* **Members**: `mb_name`, `mb_email`, `mb_hp`, `mb_certify`, `mb_adult` 등 주요 필드가 `MemberDetailCard.tsx`에 표시됨 유지.
* **Menus**: `me_name`, `me_link`, `me_target`, `me_mobile_use` 정상.
* **결론**: PHP에서 JSON Schema Builder로 내린 `generated/*.json` (총 10종명) 데이터 모델을 프론트엔드 React 필드 컴포넌트(`getFieldLabel` 등)가 일관되게 흡수 중임.

## 4. Multi-OS 호환성 (Phase 6)
헌법 §13 (Mac/Windows 크로스 컴파일 호환) 중대 검증 결과:

| 체크 항목 | 위치 | 결과 | 비고 |
|---|---|:---:|---|
| **하드코딩 로컬 경로** | `src-tauri/src/**/*.rs` | ✅ Pass | `/Users/`, `C:\` 패턴 없음 |
| **`std::sync::Mutex` 남용** | `src-tauri/src/**/*.rs` | ✅ Pass | async 컨텍스트 스레드 블로킹 방어 (0건) |
| **`unwrap()` 런타임 패닉** | `src-tauri/src/**/*.rs` | ✅ Pass | 테스트 제외 소스코드 상 unwrap() 없음 |
| **Windows WebView2** | `tauri.conf.json` | ✅ Pass | `"embedBootstrapper"` 정상 선언됨 |

---

## 🔥 시정 및 조치 필요 항목

| P | 항목 | 위치 | 비고 |
|---|------|------|------|
| **P0** | (해결됨) | 안티그래비티 | 터미널 버그 복구 및 검증 완료 |
| **P1** | (해결됨) | 터미널 | 터미널 복구 직후 `pnpm lint`, `tsc`, `cargo check` 및 `cargo test` 최종 무결성 확인 완료 |

---

## 🚀 도입 필요: 프론트-백엔드 책임 경계 및 정합성 강제 방법론

현재 프론트엔드(Rust/React)와 백엔드(PHP) 사이에 "누가 스펙을 제대로 안 지켰는가?"를 명확히 가려내는 장치가 부족합니다. 향후 프로젝트의 무결성을 위해 다음 두 가지 방법론을 프로젝트 파이프라인 정규 감사에 추가 도입해야 합니다.

### 1. (단기) 필드 연속성 전수 조사 (rust-php-parity-audit)
* **목적**: PHP가 추출한 `UPDATABLE_FIELDS` 변수명과 Rust 클라이언트(src-tauri/src/models)에 하드코딩된 필드 명칭 간의 1:1 일치 여부 대조
* **책임 판별**:
  * PHP `UPDATABLE_FIELDS`에 있으나 Rust `struct`에 없는 컬럼 → **프론트엔드 유죄** (구현 누락)
  * 레거시 DB 테이블(g5_board 등)에는 있으나 PHP `UPDATABLE_FIELDS`에 없는 컬럼 → **백엔드 유죄** (추출 누락)
* **어그리게이터**: 내장 워크플로우 `@[/rust-php-parity-audit] Phase 5.5, Phase 5.6` 즉시 실행

### 2. (장기/근본) 스키마 기반 클라이언트 코드 자동 생성 (CodeGen)
현재 인간이 눈으로 OpenAPI 스펙을 보고 필드를 하드코딩하는 방식은 휴먼 에러를 유발하므로 근본적인 책임을 없애야 합니다.
* **목적**: OpenAPI 3.0 명세(`openapi.yaml`) 기준, 클라이언트 API 호출부와 Model 구조체를 명령어 하나로 기계적 자동 생성.
* **도구 제안**: `openapi-typescript` 또는 `openapi-generator-cli`
* **책임 판별**:
  * 자동 생성된 DTO/API 파일에 필요한 필드(`bo_content` 등)가 없다 → **전적으로 백엔드(PHP) 책임** 
  * TypeScript/Rust 컴파일은 다 됐는데, 화면 컴포넌트(`Textarea` 등)에 바인딩을 안 해서 UI에 안 뜬다 → **전적으로 프론트엔드 책임**
