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
# Codex Prompt: 멀티사이트 SQLite 기반 전환 (P0)

> **입력 문서**: `specs/domains/MULTI_SITE_SDD.md`
> **범위**: P0 — SQLite + 멀티사이트 + 보안 + 대시보드 (SSH/SFTP는 포함하지 않음)
> **헌법**: `.agent/Constitution.md` v1.4.0

---

## 목표

기존 러스트 어드민의 단일 사이트 구조를 SQLite 기반 멀티사이트 구조로 전환한다.

---

## ⚠️ 단계별 실행 순서 (반드시 순서대로)

> 각 Phase를 완료하고 검증한 후에 다음 Phase로 진행할 것.
> Phase 실패 시 해당 Phase만 재실행. **절대 전체를 다시 하지 않는다.**

---

### Phase 1: SQLite + SQLCipher 기반 (Rust only)

**목적**: DB 초기화, 마스터 비밀번호, 스키마 생성

#### 1.1 의존성

`g5-admin/src-tauri/Cargo.toml`:
```toml
rusqlite = { version = "0.32", features = ["bundled-sqlcipher"] }
tauri-plugin-updater = "2"
tauri-plugin-biometric = "2"
```

#### 1.2 DB 모듈

`src-tauri/src/db.rs` 신규:
```rust
use rusqlite::Connection;
use std::path::PathBuf;

pub fn db_path() -> PathBuf {
    let base = dirs::data_local_dir().unwrap().join("g5-admin");
    std::fs::create_dir_all(&base).unwrap();
    base.join("g5-admin.db")
}

pub fn open_db(master_password: &str) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(db_path())?;
    conn.pragma_update(None, "key", master_password)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS sites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_base_url TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS site_settings (
            site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (site_id, key)
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            detail TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_logs(site_id, created_at DESC);
    ")?;

    // 운영 빌드에서만 UNIQUE 인덱스
    if !cfg!(debug_assertions) && std::env::var("G5_ALLOW_DUPLICATE_SITES").unwrap_or_default() != "true" {
        conn.execute_batch(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_url ON sites(api_base_url);"
        ).ok(); // 이미 있으면 무시
    }
    Ok(())
}
```

#### 1.3 모델

`src-tauri/src/models/site.rs` 신규:
```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Site {
    pub id: String,
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SiteAddInput { pub name: String, pub api_base_url: String }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct HealthCheckResult { pub reachable: bool, pub resolved_url: String, pub message: String }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ActivityLog { pub id: i64, pub site_id: String, pub action: String, pub detail: Option<String>, pub created_at: String }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BackupResult { pub file_path: String, pub sites_count: i64 }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportResult { pub imported: i64, pub skipped: i64 }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DashboardData {
    pub visit_today: i64,
    pub visit_yesterday: i64,
    pub visit_week: i64,
    pub visit_month: i64,
    pub member_total: i64,
    pub member_today: i64,
    pub board_total: i64,
    pub post_today: i64,
    pub server_info: ServerInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ServerInfo {
    pub php_version: String,
    pub db_version: String,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub g5_version: String,
}
```

#### Phase 1 검증
```
[ ] cargo check --workspace
[ ] SQLite DB 파일이 data_local_dir에 생성됨
[ ] 마스터 비번 없이 DB 파일 읽기 시 실패 확인
```

---

### Phase 2: SiteManager + AppState 변경 (Rust only)

**목적**: 멀티사이트 코어 로직

#### 2.1 SiteManager

`src-tauri/src/site_manager.rs` 신규:
```rust
pub struct SiteManager {
    sites: HashMap<String, SiteContext>,
    active_site_id: Option<String>,
}

pub struct SiteContext {
    pub site: Site,
    pub api_client: ApiClient,
    pub token_store: TokenStore,
}

impl SiteManager {
    pub fn load_from_db(db: &Connection) -> Self { /* sites 테이블 전체 로드 */ }
    pub fn switch_site(&mut self, site_id: &str) -> Result<(), AppError> { /* 활성 변경 */ }
    pub fn active_context(&self) -> Result<&SiteContext, AppError> { /* 현재 활성 반환 */ }
    pub fn active_context_mut(&mut self) -> Result<&mut SiteContext, AppError> { /* mut 버전 */ }
    pub fn add_site(&mut self, db: &Connection, name: &str, url: &str) -> Result<Site, AppError> { /* Health + DB + Context */ }
    pub fn remove_site(&mut self, db: &Connection, site_id: &str) -> Result<(), AppError> { /* 삭제 + cleanup */ }
}
```

#### 2.2 AppState 변경

`src-tauri/src/app_state.rs` 수정:
```rust
// 기존:
// pub struct AppState { pub api_client, pub runtime_config, pub token_store }

// 변경:
pub struct AppState {
    pub db: Mutex<Connection>,
    pub site_manager: Mutex<SiteManager>,
    pub global_config: GlobalConfig,
    pub master_password: Mutex<Option<String>>,  // 잠금/해제용
}
```

#### 2.3 기존 Command 호환 (기계적 치환)

모든 `state.api_client` → `state.site_manager.lock().active_context()?.api_client`
모든 `state.token_store` → `state.site_manager.lock().active_context()?.token_store`

> ⚠️ 이 치환은 모든 commands/*.rs 파일에 적용. 로직 변경 없음.

#### Phase 2 검증
```
[ ] cargo check --workspace
[ ] cargo test -p g5-admin-desktop
[ ] 기존 command 시그니처 변경 없음 확인
```

---

### Phase 3: Site Commands + Health Check (Rust only)

**목적**: 사이트 CRUD API

`src-tauri/src/commands/site.rs` 신규:
- `cmd_site_list` → Vec<Site>
- `cmd_site_add(name, url)` → Health Check + DB INSERT + SiteContext
- `cmd_site_update(site_id, name, url)` → DB UPDATE
- `cmd_site_delete(site_id)` → DB DELETE + keyring cleanup
- `cmd_site_switch(site_id)` → active_site_id 변경
- `cmd_site_health_check(url)` → GET {url}/api/v1 (timeout 5초)

`src-tauri/src/commands/activity.rs` 신규:
- `cmd_activity_log(action, detail)` → INSERT
- `cmd_activity_list(site_id, limit)` → SELECT (최근 N건)

`src-tauri/src/commands/backup.rs` 신규:
- `cmd_backup_export(path)` → VACUUM INTO
- `cmd_backup_import(path)` → 머지

`src-tauri/src/commands/security.rs` 신규:
- `cmd_set_master_password(password)` → 첫 설정
- `cmd_unlock(password)` → SQLCipher 키 검증 + DB 열기
- `cmd_lock()` → DB 닫기 + 메모리 클리어
- `cmd_biometric_enroll()` → 마스터 비번을 keyring에 저장
- `cmd_biometric_unlock()` → keyring에서 비번 로드 → unlock

Dashboard command:
- `cmd_dashboard(site_id)` → `GET /admin/dashboard` API 호출 → DashboardData 반환

#### Phase 3 검증
```
[ ] cargo check --workspace
[ ] cmd_site_add + cmd_site_list 동작
[ ] cmd_site_health_check 5초 타임아웃
[ ] 중복 URL 차단 (운영) / 허용 (개발)
[ ] cmd_lock / cmd_unlock 동작
[ ] cmd_dashboard 호출 시 API 요청 발생
```

---

### Phase 4: 마이그레이션 + 자동 업데이트 (Rust only)

**목적**: 기존 사용자 호환 + 업데이트 인프라

#### 4.1 자동 마이그레이션

앱 시작 시:
1. `g5-admin.db` 없음 + `app-config.json` 있음 → 마이그레이션
2. `apiBaseUrl` 읽기 → sites에 "기본 사이트" INSERT
3. session.json → 사이트별 세션 이전
4. `app-config.json` → `app-config.json.migrated`

#### 4.2 자동 업데이트

`main.rs`:
```rust
.plugin(tauri_plugin_updater::Builder::new().build())
```

`tauri.conf.json`:
```json
{ "plugins": { "updater": { "endpoints": ["https://releases.example.com/g5-admin/{{target}}/{{arch}}/{{current_version}}"] } } }
```

#### Phase 4 검증
```
[ ] app-config.json → SQLite 마이그레이션 동작
[ ] 기존 세션 보존 확인
[ ] 자동 업데이트 플러그인 로드 확인
```

---

### Phase 5: 프론트엔드 — 잠금/온보딩/탭 (React/TypeScript)

**목적**: 사용자 UI 전체

#### 5.1 잠금 화면

`src/features/security/LockScreen.tsx` 신규:
- 마스터 비밀번호 입력 필드
- "Touch ID로 해제" 버튼 (생체인증 가능 시)
- 3회 실패 → 5분 잠금 표시
- 첫 실행 시 → 비밀번호 설정 모드

#### 5.2 온보딩

`src/features/onboarding/SiteOnboardingPage.tsx` 신규:
- sites 0건 시 표시
- 사이트 이름 + API URL 입력
- [연결 테스트 + 등록] → cmd_site_health_check → cmd_site_add
- 성공 → "더 추가?" / "로그인하기" 선택

#### 5.3 탭 바

`src/features/layout/SiteTabBar.tsx` 신규:
- 최상단 배치
- cmd_site_list 렌더링
- 탭 클릭 → cmd_site_switch → react-query invalidate
- [+ 사이트 추가] → 등록 다이얼로그
- 연결 상태 아이콘 (🟢🔴)
- 1개라도 표시

#### 5.4 대시보드 (사이트별 첫 화면)

`src/features/dashboard/SiteDashboard.tsx` 신규:
- 사이트 전환 또는 로그인 직후 표시
- cmd_dashboard 호출 → 그래프/카드 렌더링

```
┌──────────────────────────────────────────────────────┐
│  [A사 쇼핑몰 ×] [B사 커뮤니티 ×] [+]                   │ ← 탭
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 오늘 방문 1,234    어제 1,156    주간 8,420        │ ← 카드
│                                                      │
│  👥 총 회원 15,230     오늘 가입 12                    │
│  📝 총 게시판 45       오늘 글 78                      │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │  📈 주간 방문자 추이 (차트)   │                     │ ← 그래프
│  │  월 화 수 목 금 토 일        │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│  🖥️ 서버 정보                                        │
│  PHP 8.2.0 | MySQL 8.0 | 디스크 120GB/500GB          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

차트 라이브러리: `recharts` (React 기본, 번들 50KB)

#### 5.5 라우팅

`src/app/router.tsx`:
- `/lock` → 잠금 화면 (마스터 비밀번호)
- `/onboarding` → 사이트 등록 (sites 0건 시)
- `/dashboard` → 대시보드 (로그인 직후, 기본)
- 기존 라우트 유지

#### Phase 5 검증
```
[ ] pnpm lint
[ ] pnpm test
[ ] pnpm build
[ ] 잠금 화면 → 비밀번호 입력 → 해제
[ ] 온보딩 → 등록 → "더 추가?" 루프
[ ] 탭 바 표시 (1개라도)
[ ] 탭 전환 시 대시보드 데이터 갱신
[ ] 대시보드 카드 + 그래프 렌더링
```

---

## PHP REST API: Dashboard 엔드포인트 (별도 Codex 작업)

> 이 부분은 PHP 프로젝트에서 별도로 구현. Rust Codex 프롬프트와 분리.

### 신규 엔드포인트

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
      { "date": "2026-03-05", "count": 1180 },
      { "date": "2026-03-06", "count": 1300 },
      { "date": "2026-03-07", "count": 1220 },
      { "date": "2026-03-08", "count": 1150 },
      { "date": "2026-03-09", "count": 1234 }
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

### PHP 구현 위치

```
api/v1/Admin/Dashboard/
├── Controller/AdminDashboardController.php
├── Service/AdminDashboardService.php
└── Repository/AdminDashboardRepository.php
```

### Service 로직

```php
class AdminDashboardService {
    public function getDashboard(): array {
        return [
            'visit_today'      => $this->visitRepo->countToday(),
            'visit_yesterday'  => $this->visitRepo->countYesterday(),
            'visit_week'       => $this->visitRepo->countWeek(),
            'visit_month'      => $this->visitRepo->countMonth(),
            'visit_weekly_trend' => $this->visitRepo->weeklyTrend(),
            'member_total'     => $this->memberRepo->countAll(),
            'member_today'     => $this->memberRepo->countToday(),
            'board_total'      => $this->boardRepo->countAll(),
            'post_today'       => $this->writeRepo->countToday(),
            'server_info'      => $this->getServerInfo(),
        ];
    }

    private function getServerInfo(): array {
        return [
            'php_version'   => phpversion(),
            'db_version'    => $this->pdo->query('SELECT VERSION()')->fetchColumn(),
            'disk_total_gb' => round(disk_total_space('/') / 1073741824, 1),
            'disk_free_gb'  => round(disk_free_space('/') / 1073741824, 1),
            'g5_version'    => G5_VERSION,
        ];
    }
}
```

### 라우트 등록

`api/routes/v1/admin.php`에 추가:
```php
$app->get('/dashboard', function ($request, $response) use ($createAdminDashboardController) {
    return $createAdminDashboardController()->index($request, $response);
});
```

### Rust 측 API Client

`src-tauri/src/api_client/dashboard.rs` 신규:
```rust
pub async fn get_dashboard(&self) -> Result<DashboardData, ApiError> {
    self.get("/admin/dashboard").await
}
```

---

## 최종 검증 체크리스트

### Rust (Phase 1~4)
- [ ] `cargo check --workspace`
- [ ] `cargo test -p g5-admin-desktop`
- [ ] `cargo test export_ts_bindings -- --nocapture`
- [ ] SQLCipher DB 암호화 (마스터 비번 없이 읽기 불가)
- [ ] 마스터 비밀번호 설정/입력
- [ ] 생체인증 (Touch ID / Windows Hello)
- [ ] 자동 잠금 (15분 idle)
- [ ] Health Check (5초 타임아웃)
- [ ] 중복 URL 차단 (운영) / 허용 (개발)
- [ ] app-config.json 자동 마이그레이션
- [ ] 자동 업데이트 플러그인 로드

### Frontend (Phase 5)
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] 잠금 화면 → 해제
- [ ] 온보딩 → 등록 → "더 추가?" 루프
- [ ] 탭 바 (1개라도 표시, 전환 동작)
- [ ] 대시보드 카드 + 그래프
- [ ] 활동 기록 목록 조회

### PHP (별도)
- [ ] `GET /admin/dashboard` 응답 확인
- [ ] visit_today, member_total 등 정확한 수치
- [ ] server_info (PHP 버전, 디스크) 반환
