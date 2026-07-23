---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-07-18
review_cycle_days: 30
bounded_context: multisite
---
# 멀티사이트 + SSH/SFTP 통합 SDD

> **버전**: v1.0.0
> **대상**: 러스트 어드민 (G5 Admin Tauri Desktop)
> **작성**: 2026-03-09

---

## 1. 목표

러스트 어드민을 **멀티 G5 사이트 관리 + SSH/SFTP/코드편집이 되는 올인원 데스크톱 앱**으로 확장한다.

핵심 변경:
1. 사이트(Site)가 모든 설정의 PK — 엔드포인트, JWT 세션, SSH 프로필, 앱 설정이 사이트에 종속
2. SQLite로 사이트/SSH/설정 프로필을 영구 저장
3. 로컬 마스터 잠금(비밀번호 + 빠른 잠금 해제)을 앱 진입 gate로 둔다
4. 첫 실행은 `마스터 잠금 설정 -> 잠금 해제 -> 사이트 수동 등록` 순서로 시작한다
5. SSH 터미널 + SFTP 파일 브라우저 + Monaco 코드편집 통합

## 2. 권위 입력

- 헌법: `.agent/Constitution.md` (v1.4.0)
- 로드맵: `specs/IMPLEMENTATION_ROADMAP.md`
- 현재 설정: `app-config.json` + `runtime_config.rs` + `token_store.rs`
- API 계약: `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`

---

## 3. 데이터 모델

### 3.1 Site = 모든 설정의 PK

```sql
CREATE TABLE sites (
  id            TEXT PRIMARY KEY,    -- UUID v4
  name          TEXT NOT NULL,       -- "A사 쇼핑몰"
  api_base_url  TEXT NOT NULL,       -- "https://a.com/api/v1"
  is_default    INTEGER DEFAULT 0,   -- 앱 시작 시 첫 활성 탭
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(api_base_url)               -- 운영: 동일 URL 중복 등록 방지
);
```

> **동일 사이트 중복 등록 정책**:
> - 운영 빌드: `UNIQUE(api_base_url)` 강제 → 동일 URL 등록 시 에러 + "이미 등록된 사이트입니다" 안내
> - 개발/테스트 빌드: `api_base_url`에 자동 suffix 추가 (`?dev_instance=2`) 또는 `UNIQUE` 제약 비활성화
> - 환경변수 `G5_ALLOW_DUPLICATE_SITES=true` 로 개발 중 우회 가능

### 3.2 사이트별 SSH 프로필

```sql
CREATE TABLE ssh_profiles (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,       -- "운영서버", "스테이징"
  host          TEXT NOT NULL,
  port          INTEGER DEFAULT 22,
  username      TEXT NOT NULL,
  auth_type     TEXT NOT NULL,       -- 'password' | 'key' | 'agent'
  key_path      TEXT,                -- SSH 개인키 파일 경로 (auth_type='key' 시)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
-- 비밀번호/passphrase 본문은 SQLCipher DB app_settings에 저장
```

### 3.3 사이트별 앱 설정

```sql
CREATE TABLE site_settings (
  site_id  TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  key      TEXT NOT NULL,
  value    TEXT NOT NULL,
  PRIMARY KEY (site_id, key)
);
-- 예: (site_A, 'theme', 'dark'), (site_B, 'theme', 'light')
```

### 3.4 글로벌 앱 설정

```sql
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- 예: ('debug_overlay', 'true'), ('session_storage', 'file'), ('font_scale', 'md')
```

### 3.4A 로컬 마스터 잠금 및 암호화 키 저장소

```sql
CREATE TABLE app_lock (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  password_verifier TEXT NOT NULL,
  password_salt     TEXT NOT NULL,
  passkey_enabled   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
```

- `password_verifier`는 평문이 아니라 salted hash verifier다.
- 마스터 비밀번호는 로컬 앱 잠금 전용이다.
- TOTP 사용 여부, idle timeout, unlock failure/lockout 메타데이터는 `app_settings`에 저장한다.
- `app_lock.passkey_enabled` 컬럼명은 기존 호환성을 위해 유지하지만, 현재 구현 의미는 `빠른 잠금 해제 활성화 여부`다.

### 3.5 민감 정보 저장 정책

| 정보 | 저장소 | key / 경로 | 비고 |
|------|--------|-------------|------|
| **DB 암호화 키 (SQLCipher)** | 로컬 파일 | `~/Library/Application Support/g5-admin/.db-master-key` 등 OS data dir | 최초 실행 시 OS CSPRNG로 **랜덤 256-bit 자동 생성**. macOS/Linux에서는 `0600` 권한으로 저장한다. |
| 로컬 마스터 비밀번호 verifier | SQLite (`app_lock`, at-rest 암호화) | — | 1차 인증용 |
| 2차 인증 (TOTP) Secret | SQLite (`app_settings`, SQLCipher at-rest 암호화) | `security.totp_secret` | 활성화 시 QR코드 모달로 `otpauth://...` 제공 |
| 빠른 잠금 해제 secret | OS biometry secure storage | `g5-admin-desktop / local-master-fast-unlock` | `tauri-plugin-biometry v0.2.6`가 보호하고, SQLite에는 verifier만 저장 |
| JWT access/refresh token | 로컬 파일 | `sessions/site-{site_id}.json` | 기본 local runtime은 file 저장소 |
| SSH 비밀번호 | SQLite (`app_settings`, SQLCipher at-rest 암호화) | `ssh.secret.password.{ssh_profile_id}` | |
| SSH 키 passphrase | SQLite (`app_settings`, SQLCipher at-rest 암호화) | `ssh.secret.key_passphrase.{ssh_profile_id}` | |
| SSH 개인키 파일 경로 | SQLite (`ssh_profiles`) | — | `~/.ssh/id_rsa` 등 사용자 로컬 환경의 기존 파일 경로만 저장 |
| 사이트 URL, 이름, SSH 호스트 | SQLite (**SQLCipher** 암호화) | — | |

### 3.6 앱 보안 아키텍처 (3중 방어 체계)

> 핵심: 기본 local runtime은 keychain 회귀 없이 반복 테스트/재배포 후에도 기존 사이트와 SSH 정보를 유지해야 하고, 동시에 로컬 디스크 탈취 위험은 SQLCipher와 마스터 잠금으로 낮춰야 한다.

1.  **SQLCipher (DB 암호화)**: `rusqlite` `bundled-sqlcipher` feature로 DB 전체를 AES-256으로 암호화. 이때 사용하는 **암호화 키는 앱 최초 실행 시 난수 생성기(OS CSPRNG)로 자동 생성하여 로컬 `.db-master-key` 파일에 저장**한다.
    ```rust
    // local file secure storage에서 랜덤 생성된 키 로드
    let db_encryption_key = load_or_create_file_master_key()?;
    conn.pragma_update(None, "key", db_encryption_key)?;
    ```
    - 기본 local runtime은 startup에서 keychain prompt를 띄우지 않는다. `.db-master-key`는 앱 data dir 아래 별도 파일로 두고, Unix 계열에서는 `0600` 권한으로 저장한다.
2.  **이원화된 인증 (1차/2차)**:
    -   1차 인증: 마스터 비밀번호 설정 필수. 이후 `/app/security`에서 `tauri-plugin-biometry v0.2.6` 기반 빠른 잠금 해제(Touch ID / Windows Hello)를 추가 등록할 수 있다. OS biometry secure storage에는 랜덤 secret만 저장하고, SQLite에는 Argon2 verifier만 저장한다.
    -   2차 인증: Google OTP (TOTP) 선택 방식. 활성화한 사용자에 한해 비밀번호 뒤 OTP 6자리를 추가 확인한다. TOTP secret 평문은 keychain이 아니라 SQLCipher DB `app_settings`에 저장한다.
    -   빠른 잠금 해제는 1차 인증만 대체하며, TOTP가 활성화된 경우 OTP 6자리 검증은 그대로 후속 단계로 유지한다.
    -   민감 작업 step-up auth: `백업 export/import`, `전체 사이트 삭제`, `마스터 비밀번호 변경`, `자동 잠금 시간 변경`, `Google OTP 비활성화`는 현재 마스터 비밀번호를 다시 확인하고, TOTP가 활성화된 경우 현재 OTP 코드도 함께 요구한다.
    -   잠금 해제 BF 방어는 `5회 실패 -> 5분 잠금`, 이후 실패마다 `+5분`씩 늘어나며 최대 `60분`까지 제한한다. 잠금 중에는 비밀번호 입력, 빠른 잠금 해제 버튼, 일반 계속 버튼을 모두 비활성화한다.
3.  **SSH 키 파일 분리 + 비밀값 분리**: 앱이 SSH 접속 키를 발급하는 것이 아니며, 로컬의 기존 키파일(`key_path`) 경로만 들고 있는다. SSH 비밀번호와 key passphrase는 keychain이 아니라 SQLCipher DB `app_settings`에 저장한다.
4.  **자동 잠금**: 기본 15분 idle이며, `/app/security`에서 5/15/30/60분 또는 사용 안 함으로 조정한다.

---

## 4. 온보딩 플로우

### 4.1 앱 시작과 첫 실행

```
앱 시작
  │
  ├── 단일 히어로 + 보안 저장소 안내 카드 표시
  │     └── 사용자가 `계속`을 누른 뒤에만 선택형 biometry secure storage 접근
  │
  ├── g5-admin.db 없음 → 자동 생성 (스키마 마이그레이션)
  │     └── 🌟 OS CSPRNG로 DB 암호화 키를 랜덤 256-bit 자동 생성 → `.db-master-key`에 저장
  │
  ├── 로컬 마스터 잠금 없음
  │     │
  │     ▼
  │   ┌────────────────────────────────┐
  │   │  🔐 1차 앱 잠금을 설정하세요       │
  │   │                                │
  │   │  비밀번호                       │
  │   │  [**********************]      │
  │   │                                │
  │   │  비밀번호 확인                  │
  │   │  [**********************]      │
  │   │                                │
  │   │  [빠른 잠금 해제는 설정 후 추가] │
  │   │  [완료]                         │
  │   └────────────────────────────────┘
  │     │   (※ 2차 인증 OTP는 세팅 완료 후 환경설정에서 추가)
  │     └── 잠금 생성 완료 → 잠금 해제 화면
  │
  ├── 로컬 마스터 잠금 있음 + 잠금 상태
  │     │
  │     ▼
  │   ┌────────────────────────────────┐
  │   │  🔓 앱 잠금을 해제하세요         │
  │   │                                │
  │   │  비밀번호 또는 빠른 잠금 해제      │
  │   │  [**********************]      │
  │   │                                │
  │   │  [빠른 잠금 해제] [잠금 해제]      │
  │   └────────────────────────────────┘
  │     │
  │     ├── (TOTP 활성화된 경우)
  │     │     ▼
  │     │   ┌───────────────────────────┐
  │     │   │ 🛡️ 2차 인증 (Google OTP)   │
  │     │   │ [ 6자리 코드 입력 ]         │
  │     │   │ [인증 확인]                │
  │     │   └───────────────────────────┘
  │     │
  │     └── 최종 잠금 해제 성공 → SiteCatalog 조회
  │
  ├── sites 테이블이 비어있음
  │     │
  │     ▼
  │   ┌────────────────────────────────┐
  │   │  🎉 러스트 어드민에 오신 걸 환영합니다!│
  │   │                                │
  │   │  관리할 G5 사이트를 등록하세요.    │
  │   │                                │
  │   │  사이트 이름:                    │
  │   │  [A사 쇼핑몰              ]     │
  │   │                                │
  │   │  API 주소:                      │
  │   │  [https://a-company.com   ]     │
  │   │                                │
  │   │  [연결 테스트 + 등록]             │
  │   └────────────────────────────────┘
  │     │
  │     ▼
  │   연결 테스트 (Health Check)
  │     │
  │     ├── 실패 → 에러 메시지 표시 + 재입력 유도
  │     │         "연결할 수 없습니다. URL을 확인해주세요."
  │     │
  │     └── 성공 → sites 저장
  │           │
  │           ▼
  │         ┌────────────────────────────┐
  │         │  ✅ "A사 쇼핑몰" 등록 완료!   │
  │         │                            │
  │         │  ○ 사이트 더 추가하기        │
  │         │  ● 로그인하기 →              │
  │         │                            │
  │         │  [계속]                     │
  │         └────────────────────────────┘
  │           │
  │           ├── "사이트 더 추가하기" → 등록 화면으로 루프
  │           │
  │           └── "로그인하기" → 로그인 화면 (첫 사이트 활성)
  │
  ├── 기존 app-config.json / legacy apiBaseUrl 발견 + sites 비어있음
  │     └── 첫 사이트 입력에는 관여하지 않음, "기본 사이트" 자동 삽입 및 추천 노출 모두 금지
  │
  └── sites에 1건 이상 있음 → 정상 로드 → 마지막 활성 사이트로 시작
```

### 4.2 Health Check 로직

사용자가 URL 입력 시:

```
입력: "https://example.com"
  │
  ├── 1) GET https://example.com/api/v1  (connect timeout 3초, request timeout 4초)
  │     ├── transport error → 최대 15초 동안 750ms 간격으로 재시도
  │     │                    UI는 spinner + "운영체제가 네트워크 접근이나 방화벽 허용을 묻는 경우 먼저 승인" 안내 유지
  │     └── 200/JSON or 401 → ✅ api_base_url = "https://example.com/api/v1"
  │
  ├── 2) /api/v1가 transport retry window 이후에도 실패하지 않고 HTTP 응답을 주면
  │     └── GET https://example.com  (connect timeout 3초, request timeout 4초)
  │         └── 200 → 경고: "루트 주소는 응답하지만 /api/v1 경계가 확인되지 않습니다."
  │
  └── 3) /api/v1가 retry window 동안 계속 transport failure
        └── ❌ "연결 실패. URL, 네트워크, OS 방화벽/네트워크 허용 상태를 확인하세요."

추가 검증:
  - 응답 JSON에 version, status 같은 G5 API 시그니처 확인 (있으면 신뢰도 UP)
  - HTTPS 인증서 검증 (시스템 trust store)
  - transport error는 OS permission dialog 처리 시간을 주기 위해 즉시 실패로 닫지 않는다
```

### 4.3 사이트 추가 (온보딩 이후)

잠금 해제 후 사이트 목록 화면에서 `[+ 사이트 추가]` 버튼 → 동일한 등록 폼 표시 → Health Check → 성공 시 새 사이트 추가.

### 4.4 상단 앱 환경설정 (보안 메뉴)

우측 상단 `보안 설정` 액션 클릭 시 전역 보안을 관리하는 `/app/security` 화면으로 이동한다.

```
[ 환경설정 > 보안 관리 ]

▶ 1차 인증 관리
  - 마스터 비밀번호 변경  [변경하기]
  - 빠른 잠금 해제       [등록 / 폐기]  ※ `tauri-plugin-biometry v0.2.6`, Touch ID / Windows Hello

▶ 2차 인증 (추가 보안)
  - Google OTP 앱 연동   [활성화하기]
    → 원클릭 시 모달창 출력: QR 코드 표기 + otpauth://... URI 노출
    → 사용자 스마트폰 스캔 및 6자리 임시 코드 입력 후 검증 완료 시 활성화
  - [비활성화하기] → 1차 비밀번호 검증 후 즉시 해제

▶ 기타 관리
  - 자동 잠금 시간       [ 15분 ▼ ] (5분/15분/30분/60분/사용안함)
  - SSH 프로필/세션 연결 일괄 초기화
```

---

## 5. 사이트 선택 UX

### 5.1 현재 구현: 상단 작업 탭 + 좌측 서브메뉴

- canonical 멀티사이트 내비게이션은 `상단 작업 탭(고정 최상위 + 열린 사이트 탭 + 더보기) + 좌측 scoped 서브메뉴 + 중앙 작업면`이다.
- 등록 사이트 전체를 상단 탭으로 모두 노출하지 않고, 현재 작업 중인 사이트만 상단 탭에 올린다.

```
잠금 해제 직후
  ├── 사이트 0개  -> /sites/onboarding
  ├── 사이트 1개  -> 로그인 또는 /sites/:siteId/overview
  └── 사이트 여러 개 + 미로그인 -> /sites/dashboard

/sites/dashboard
  ├── 검색
  ├── 사이트 카드: 이름 / URL / 로그인 상태 / health / 접속 / 삭제
  ├── 백업 내보내기 / 백업 가져오기 / 앱 잠금
  └── + 사이트 추가 등록

보호된 작업면 (/sites/:siteId/*)
  └── 상단 AppShellWorkspaceTabs에서 고정 탭 + 열린 사이트 탭 + 더보기, 좌측 AppShellSidebar에서 현재 탭 서브메뉴를 노출
```

### 5.2 사이트 상태 배지

| 상태 | 의미 |
|------|------|
| `로그인됨` | 현재 사이트 세션 유효 |
| `로그인 필요` | 사이트는 등록됐지만 세션 없음 |
| `연결 테스트 성공` | `/api/v1` 또는 `401` 경계까지 도달 |
| `API 경계 미확인` | 루트 주소만 응답, `/api/v1` 확인 실패 |
| `연결 대기 중` | OS 네트워크/방화벽 허용 또는 일시적 transport retry window 진행 중 |

### 5.3 동작

- `/sites/dashboard`의 `접속` 버튼 → 사이트 세션 활성화 → 로그인 또는 작업 홈으로 이동
- 상단 `사이트 탭` 클릭 → 활성 사이트 전환 + scoped route 유지
- `백업 내보내기` → 사용자 지정 백업 암호로 암호화된 휴대용 백업(`.g5bak`) 생성
- `백업 가져오기` → 휴대용 백업(`.g5bak`)이면 백업 암호로 복호화해 `sites/site_settings`를 복원, 레거시 `.db`면 동일 장치/동일 로컬 키 호환 경로로 머지
- `앱 잠금` 또는 15분 idle → `/master/unlock`로 되돌아감
- 등록 사이트가 많을 때는 `더보기` 메뉴에서 사이트 전환을 수행한다

---

## 6. Rust 아키텍처 변경

### 6.1 AppState 확장

```rust
// 현재 구현
pub struct AppState {
    pub api_client: ApiClient,
    pub runtime_config: RuntimeConfig,
    pub token_store: TokenStore,
    site_repository: SiteRepository,
    site_manager: Arc<RwLock<SiteManager>>,
    master_unlocked: Arc<RwLock<bool>>,
    pending_totp_unlock: Arc<RwLock<bool>>,
}

pub struct SiteManager {
    sites: HashMap<String, Site>,
    ordered_site_ids: Vec<String>,
    active_site_id: Option<String>,
}
```

### 6.2 신규 Command 표면

```
현재 구현:
  cmd_master_lock_status  → 앱 잠금 상태 조회
  cmd_master_lock_setup   → 로컬 마스터 잠금 생성
  cmd_master_lock_unlock  → 로컬 마스터 잠금 해제
  cmd_master_lock_lock    → 로컬 마스터 잠금 재설정
  cmd_backup_export       → 사용자 지정 백업 암호로 휴대용 암호화 백업(`.g5bak`) 생성
  cmd_backup_import       → 휴대용 백업 복원 또는 레거시 `.db` 스냅샷 호환 머지
  cmd_site_catalog_get    → 전체 사이트 목록
  cmd_site_add            → 사이트 등록 (Health Check 포함)
  cmd_site_update         → 사이트 정보 수정
  cmd_site_delete         → 사이트 삭제
  cmd_site_switch         → 활성 사이트 전환
  cmd_site_health_check   → API 연결 테스트
  cmd_site_activity_list  → 사이트별 로컬 활동 기록 조회

현재 구현:
  cmd_ssh_profile_list    → site_id 기준 SSH 프로필 목록
  cmd_ssh_profile_add     → SSH 프로필 등록
  cmd_ssh_profile_update  → SSH 프로필 수정
  cmd_ssh_profile_delete  → SSH 프로필 삭제
  cmd_ssh_status          → 사이트별 SSH 연결 상태 조회
  cmd_ssh_connect         → SSH 접속
  cmd_ssh_disconnect      → SSH 연결 해제
  cmd_ssh_shell_open      → 인터랙티브 셸 열기
  cmd_ssh_shell_write     → 셸에 stdin 전송
  cmd_ssh_shell_read      → 셸에서 stdout 읽기
  cmd_ssh_shell_resize    → 터미널 크기를 원격 PTY와 동기화
  cmd_ssh_shell_close     → 인터랙티브 셸 닫기
  cmd_sftp_list_dir       → 원격 디렉터리 목록
  cmd_sftp_stat           → 파일 정보 (크기, 권한, 수정일)
  cmd_sftp_read_file      → 원격 파일 읽기 (미리보기)
  cmd_sftp_download       → 파일 다운로드
  cmd_sftp_upload         → 파일 업로드 (다중 선택/drag-drop 지원)
  cmd_sftp_copy           → 원격 경로 복사
  cmd_sftp_move           → 원격 경로 이동/이름 변경
  cmd_sftp_chmod          → 원격 권한 변경
  cmd_sftp_delete         → 원격 파일/디렉터리 삭제 (재귀 삭제 지원)
  cmd_sftp_mkdir          → 원격 디렉터리 생성
  cmd_sftp_write_file     → 원격 파일 쓰기 (편집 저장)
```

---

## 7. 동일 사이트 중복 등록 정책

### 문제

운영에서는 같은 `api_base_url`을 두 번 등록하면 혼란. 그러나 개발/테스트 시에는 같은 스테이징 URL로 여러 탭을 열어야 할 수 있음.

### 해결

```rust
fn can_register_site(url: &str, db: &SqlitePool) -> Result<(), AppError> {
    let allow_duplicates = std::env::var("G5_ALLOW_DUPLICATE_SITES")
        .map(|v| v == "true")
        .unwrap_or(false);

    if allow_duplicates {
        return Ok(());  // 개발 모드: 중복 허용
    }

    let existing = db.query("SELECT id FROM sites WHERE api_base_url = ?", [url])?;
    if existing.is_some() {
        return Err(AppError::Validation {
            message: "이미 등록된 사이트입니다.".into(),
            field: "api_base_url".into(),
        });
    }
    Ok(())
}
```

| 환경 | 동작 |
|------|------|
| 운영 빌드 | `UNIQUE` 제약 → 중복 등록 차단 |
| 개발 빌드 (`cfg!(debug_assertions)`) | 자동으로 중복 허용 |
| 환경변수 `G5_ALLOW_DUPLICATE_SITES=true` | 수동 우회 |

---

## 8. 프론트엔드 라우트 변경

```
기존 route:
  /overview
  /environment/*
  /members/*
  /boards/*
  /sms/*

변경 후 (사이트 scoped):
  /sites                    ← 사이트 관리 (목록 + 온보딩)
  /sites/:siteId/overview
  /sites/:siteId/environment/*
  /sites/:siteId/members/*
  /sites/:siteId/boards/*
  /sites/:siteId/sms/*
  /sites/:siteId/server            ← 서버관리 메뉴 (신규)
  /sites/:siteId/server/ssh        ← SSH 프로필/연결 모달 + xterm.js interactive shell
  /sites/:siteId/server/files      ← SFTP 트리 + 목록 + 편집 통합 작업면
```

---

## 9. 추가 의존성

```toml
# 현재 구현
argon2 = "0.5"
getrandom = "0.4"
keyring = "4"
rusqlite = { version = "0.40", features = ["bundled-sqlcipher"] }
russh-sftp = "2.3"
tauri-plugin-biometry = "0.2.8"
tauri-plugin-dialog = "2"
tauri-plugin-updater = "2"
```

### 후속 후보
- `xterm.js` — SSH 터미널의 현재 기반을 유지하되 후속 패키지 전환 여부를 별도로 결정
- `@monaco-editor/react` — 코드 편집기 기반 유지

---

## 10. 에이전시/프리랜서 필수 기능

> 시장 분석 결과 반영 (2026-03-09)

### 10.1 activity_logs 테이블 (P0)

```sql
CREATE TABLE activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id    TEXT REFERENCES sites(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,     -- 'member_update', 'board_create', 'config_change'
  detail     TEXT,              -- JSON: { "target": "게시판", "before": "...", "after": "..." }
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activity_site ON activity_logs(site_id, created_at DESC);
```

### 10.2 자동 업데이트 (P0)

```toml
# Cargo.toml
tauri-plugin-updater = "2"
```

- GitHub Releases 기반 또는 자체 업데이트 서버
- 앱 시작 시 백그라운드 체크 → 알림 배지 → 사용자 승인 후 다운로드

### 10.3 사이트 프로필 백업/복원 (P0)

```
내보내기: `sites + site_settings` → `g5-admin-backup-2026-03-12.g5bak` (사용자 지정 백업 암호로 암호화된 휴대용 백업)
가져오기: 휴대용 백업이면 백업 암호로 복호화 후 `sites + site_settings` 복원, 레거시 `.db` 스냅샷이면 동일 장치/동일 로컬 키 호환 경로로 머지
```

- Command: `cmd_backup_export`, `cmd_backup_import`
- keyring 자격증명은 백업에 포함 안 됨 (보안) — 가져오기 후 재입력 안내
- JWT 세션, 빠른 잠금 해제 secret, 생체 등록 상태, 마스터 비밀번호 verifier는 백업에 포함하지 않는다
- 현재 구현은 `sites + site_settings` 휴대용 백업/복원과 레거시 `.db` 호환 import까지 지원한다

### 10.4 사이트 헬스 대시보드 (P1.5)

```
┌──────────────────────────────────────────────────────┐
│ 🟢 A사 쇼핑몰     응답: 120ms   디스크: 75%          │
│ 🔴 B사 커뮤니티   연결 실패      마지막 확인: 5분 전    │
│ 🟢 C사 블로그     응답: 340ms   디스크: 45%          │
└──────────────────────────────────────────────────────┘
```

### 10.5 Quick Actions — Cmd+K 커맨드 팔레트 (P1.5)

```
┌────────────────────────────────────┐
│ 🔍 A사 쇼핑몰 게시판 설정...        │
│                                    │
│   A사 쇼핑몰 > 게시판관리 > 자유게시판│
│   A사 쇼핑몰 > 회원관리             │
│   B사 커뮤니티 > 환경설정            │
└────────────────────────────────────┘
```

### 10.6 알림/웹훅 (P2)

- 사이트 다운, SSL 만료, 디스크 부족 → 슬랙/디스코드 웹훅
- `tauri-plugin-notification` 로 로컬 알림도 지원

---

## 11. 구현 우선순위 (수정됨)

```
P0: 마스터 잠금 + SQLite + 멀티사이트 기반
  [x] 로컬 마스터 잠금 설정/해제
  [x] 선택형 Google OTP(TOTP) 2차 인증
  [x] unlock rate limit / temporary lockout
  [x] 상단 `보안 설정` 메뉴 + `/app/security` 화면
  [x] 민감 작업 step-up auth (`백업 export/import`, `전체 사이트 삭제`, `마스터 보안 설정 변경`)
  [x] 빠른 잠금 해제(Touch ID / Windows Hello)
  [x] 15분 idle auto-lock + 수동 앱 잠금
  [x] rusqlite 추가 + DB 초기화/마이그레이션
  [x] sites CRUD + Health Check
  [x] 온보딩 플로우 (잠금 해제 → 첫 사이트 수동 등록 → 추가/로그인 루프)
  [x] 상단 작업 탭 + 열린 사이트 overflow UX
  [x] SiteManager + 사이트별 api_client/token_store
  [x] bundled/default apiBaseUrl 자동 기본 사이트 주입 제거
  [x] 활동 로그 (activity_logs) 기록
  [x] 자동 업데이트 (tauri-plugin-updater)
  [x] 사이트 프로필 백업/복원

P1: SSH/SFTP 통합
  [x] SSH 프로필 CRUD (사이트별)
  [x] SSH 접속/해제 + 세션 상태 확인 (`known_hosts` 검증 포함)
  [x] 앱 내 서버 지문 확인 + `known_hosts` 신뢰 등록
  [x] SSH interactive shell
  [x] SSH PTY resize sync (`xterm.js` fit → remote window-change)
  [x] SSH 터미널 툴바 (글꼴, 높이, fit, 앱 내 전체화면)
  [x] SSH 입력 batching/polling 조정으로 실사용 반응성 개선
  [x] SFTP 파일 브라우저
  [x] SFTP 다운로드
  [x] SFTP 업로드 (다중 선택 + drag-drop)
  [x] SFTP 원격 복사/이동
  [x] SFTP 권한 변경 (`chmod`)
  [x] SFTP 파일/재귀 디렉터리 삭제 (`delete` 확인 입력)
  [x] SFTP 디렉터리 생성
  [x] SFTP 텍스트 저장
  [x] SSH/SFTP 앱형 IA 통합 (`SSH`, `SFTP` 2개 메뉴 + 프로필 모달 + 편집기 통합)
  [x] SFTP split-pane 데스크톱 작업면 (좌측 트리 + 우측 내부 스크롤 파일 테이블 + 모달 편집기)

P1.5: 에이전시 킬러 기능
  [ ] 사이트 헬스 대시보드 (전체 사이트 상태 일괄 보기)
  [ ] Quick Actions (Cmd+K 커맨드 팔레트)
  [ ] 알림/웹훅 (슬랙, 디스코드)

P2: 코드 편집기 + i18n
  [x] SFTP 파일 읽기 → 전용 editor route → 저장 시 SFTP 쓰기
  [x] Monaco Editor 교체
  [x] 구문 강조 (PHP, JS, CSS, HTML)
  [ ] 다국어 (영어/일어, 해외 시장 확장 시)

P3: DB 관리 + 고급 (최하위)
  [ ] SSH 터널 경유 MySQL 연결
  [ ] SQL 쿼리 실행
  [ ] 테이블 데이터 보기/편집
  [ ] 일괄 작업 (멀티사이트 동일 설정 적용)
  [ ] 팀 프로필 공유 (암호화 export/import)
```

---

## 12. 라이선스

| 프로젝트 | 런타임 | 소스 코드 |
|---------|-------|----------|
| PHP REST API | MIT | MIT |
| Rust Admin | Proprietary EULA (무료, 무보증) | Commercial (유료) |
| Flutter Client | Proprietary EULA (무료, 무보증) | Commercial (유료) |

---

## 13. PHP Dashboard API (신규 필요)

> Rust Admin 대시보드에 표시할 사이트 현황 데이터를 PHP REST API에서 제공해야 함.

### 엔드포인트

```
GET /api/v1/admin/dashboard
Authorization: Bearer {jwt}
```

### 응답 스키마

```json
{
  "data": {
    "visit_today": 1234,
    "visit_yesterday": 1156,
    "visit_week": 8420,
    "visit_month": 35600,
    "visit_weekly_trend": [
      { "date": "2026-03-03", "count": 1100 },
      { "date": "2026-03-04", "count": 1250 },
      ...
    ],
    "member_total": 15230,
    "member_today": 12,
    "board_total": 45,
    "post_today": 78,
    "server_info": {
      "php_version": "8.2.0",
      "db_version": "MySQL 8.0.35",
      "disk_total_gb": 500.0,
      "disk_free_gb": 380.0,
      "g5_version": "5.5.8.3"
    }
  }
}
```

### PHP 구현 파일

```
api/v1/Admin/Dashboard/
├── Controller/AdminDashboardController.php
├── Service/AdminDashboardService.php
└── Repository/AdminDashboardRepository.php
```

### 기존 활용 가능 API

- `GET /admin/visits/stats` — 방문 통계 (기존)
- `AdminVisitRepository`, `AdminVisitStatsRepository` — 방문 수 쿼리 (기존)

### 추가 필요 쿼리

- 회원 수: `SELECT COUNT(*) FROM g5_member`
- 오늘 가입: `SELECT COUNT(*) FROM g5_member WHERE mb_datetime >= CURDATE()`
- 게시판 수: `SELECT COUNT(*) FROM g5_board`
- 오늘 글: `SELECT COUNT(*) FROM g5_write_* WHERE wr_datetime >= CURDATE()` (동적 테이블)
- 서버 정보: `phpversion()`, `disk_free_space('/')`, `SELECT VERSION()`

---

## 14. 사이트 대시보드 UI

```
┌────────────────────────────────────────────────────────────────┐
│ 사이트 목록                                                   │
│ [백업 내보내기] [백업 가져오기] [앱 잠금] [+ 사이트 추가 등록] │
├────────────────────────────────────────────────────────────────┤
│ A사 쇼핑몰  로그인됨  health OK     [접속] [삭제]              │
│ https://a.example.com/api/v1                                   │
│                                                                │
│ B사 커뮤니티  로그인 필요  API 경계 미확인  [접속] [삭제]      │
│ https://b.example.com/api/v1                                   │
└────────────────────────────────────────────────────────────────┘
```

- 현재 구현은 PHP `/admin/dashboard` 차트가 아니라 로컬 사이트 선택/백업/잠금 작업면이다
- 사이트 작업 홈(`/sites/:siteId/overview`)에서는 현재 사이트 상태, 빠른 링크, 최근 로컬 활동과 PHP `/admin/dashboard` 요약 카드/최근 목록을 함께 보여준다
- 차트나 시계열 시각화가 더 필요하면 원격 대시보드 섹션 아래에 별도 카드/차트 계층으로 확장한다

---

## 15. 완료 게이트

- 마스터 비밀번호 설정/입력으로 앱 잠금/해제된다
- 선택형 Google OTP를 활성화하면 비밀번호 뒤 OTP 6자리를 추가 확인한다
- SQLCipher로 DB 파일이 암호화되어 있다
- 빠른 잠금 해제(Touch ID/Windows Hello)는 `tauri-plugin-biometry v0.2.6`을 통해 동작하고, OS biometry secure storage secret + SQLite verifier 조합으로 보호된다
- idle timeout은 기본 15분이며 `/app/security`에서 조정 가능하다
- 수동 `앱 잠금`이 `/sites/dashboard`와 보호된 작업면에서 동작한다
- 사이트 등록 시 Health Check가 동작한다 (최대 15초 transport retry window)
- 동일 URL 중복 등록이 운영에서 차단되고 개발에서 허용된다
- 첫 실행 → 사이트 등록 → "더 추가?" 루프가 동작한다
- 상단 작업 탭/더보기에서 사이트 전환이 동작한다
- 사이트 전환 시 api_client/session이 정확히 전환된다
- `/sites/dashboard`에서 백업 export/import가 동작한다
- `/sites/:siteId/overview`는 로컬 사이트 상태/빠른 링크/최근 활동을 표시한다
- 기존 app-config.json / legacy apiBaseUrl은 첫 사이트 입력에 관여하지 않으며 자동 사이트 삽입과 추천 노출이 모두 금지된다
- 활동 로그가 사이트별로 기록된다
- 자동 업데이트 체크가 앱 시작 시 동작한다
- `cargo check`, `bun run lint`, `bun run test`, `bun run build` 통과
