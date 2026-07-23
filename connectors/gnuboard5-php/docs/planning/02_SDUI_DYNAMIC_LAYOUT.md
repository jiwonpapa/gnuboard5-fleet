# SDUI 기반 동적 레이아웃 및 인앱 광고 제어 모듈

> **상태**: 📋 계획 단계 | **우선순위**: 중간 | **대상**: Flutter 앱 + REST API

---

## 1. 목표

관리자가 **앱을 재배포(스토어 업데이트) 없이** 인덱스 페이지, 메뉴 구조, 광고 배치, 위젯 구성을 실시간으로 변경할 수 있는 **Server-Driven UI(SDUI)** 시스템을 구축한다.

**핵심 UX 원칙**: 초보 관리자도 **드래그 & 드롭**으로 위젯을 배치하고 순서를 변경할 수 있어야 한다.

---

## 2. SDUI 개념

```
[관리자 웹 에디터]
    ↓  (위젯 배치 저장)
[REST API] → JSON 레이아웃 스키마
    ↓  (앱 실행 시 fetch)
[Flutter 앱] → JSON 파싱 → 동적 위젯 렌더링
```

앱 업데이트 없이 서버의 JSON 스키마만 변경하면 앱 UI가 실시간으로 바뀐다.

---

## 3. 위젯 타입 정의

### 기본 위젯 (Built-in)

| 위젯 타입 | 설명 | 드래그 가능 |
|----------|------|-----------|
| `latest_posts` | 최신글 목록 (게시판별 필터) | ✅ |
| `notice_banner` | 공지사항 배너 (슬라이드) | ✅ |
| `popular_posts` | 인기글 (추천순/조회순) | ✅ |
| `category_grid` | 게시판 카테고리 그리드 | ✅ |
| `search_bar` | 통합 검색 바 | ✅ |
| `image_carousel` | 이미지 슬라이더 | ✅ |
| `ad_banner` | 광고 배너 (내부/외부 링크) | ✅ |
| `spacer` | 여백/구분선 | ✅ |
| `html_block` | 자유 HTML/텍스트 블록 | ✅ |
| `quick_menu` | 빠른 메뉴 아이콘 그리드 | ✅ |

### 위젯 속성 스키마 (JSON)

```json
{
  "type": "latest_posts",
  "title": "자유게시판 최신글",
  "config": {
    "bo_table": "free",
    "limit": 5,
    "show_thumbnail": true,
    "thumbnail_width": 120,
    "thumbnail_height": 120
  },
  "style": {
    "layout": "list",
    "background_color": "#FFFFFF",
    "padding": 16
  }
}
```

---

## 4. 관리자 에디터 UX (드래그 & 드롭)

### 핵심 인터랙션 패턴

```
┌─────────────────────────────┐
│  [+ 위젯 추가]              │
│                             │
│  ┌───────────────────────┐  │
│  │ ≡ 공지사항 배너       │◀─ 드래그 핸들
│  │   [편집] [삭제]       │  │
│  └───────────────────────┘  │
│         ↕ (드래그로 순서 변경)
│  ┌───────────────────────┐  │
│  │ ≡ 최신글 (자유게시판)  │  │
│  │   [편집] [삭제]       │  │
│  └───────────────────────┘  │
│         ↕                   │
│  ┌───────────────────────┐  │
│  │ ≡ 광고 배너           │  │
│  │   [편집] [삭제]       │  │
│  └───────────────────────┘  │
│                             │
│  [미리보기]  [저장]         │
└─────────────────────────────┘
```

### 관리자 워크플로우

1. **위젯 팔레트**에서 원하는 위젯 타입 선택 → 레이아웃에 추가
2. 각 위젯의 **[편집]** 클릭 → 게시판 선택, 표시 개수, 썸네일 크기 등 설정
3. **드래그 핸들(≡)**을 잡고 위아래로 끌어 **순서 변경**
4. **[미리보기]**로 모바일 미리보기 확인
5. **[저장]** → API로 JSON 스키마 전송 → 앱에 즉시 반영

---

## 5. REST API 엔드포인트

### 사용자용 (앱)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/v1/layouts/{page_id}` | 페이지 레이아웃 JSON 스키마 조회 |
| GET | `/api/v1/layouts/{page_id}/widgets/{widget_id}/data` | 개별 위젯 데이터 fetch |

### 관리자용

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/v1/admin/layouts` | 전체 페이지 레이아웃 목록 |
| GET | `/api/v1/admin/layouts/{page_id}` | 특정 페이지 레이아웃 상세 |
| PUT | `/api/v1/admin/layouts/{page_id}` | 레이아웃 전체 저장 (위젯 배열) |
| POST | `/api/v1/admin/layouts/{page_id}/widgets` | 위젯 신규 추가 |
| PATCH | `/api/v1/admin/layouts/{page_id}/widgets/{widget_id}` | 위젯 설정 수정 |
| DELETE | `/api/v1/admin/layouts/{page_id}/widgets/{widget_id}` | 위젯 삭제 |
| PATCH | `/api/v1/admin/layouts/{page_id}/reorder` | 위젯 순서 변경 (드래그 결과 반영) |

### 레이아웃 전체 응답 예시

```json
{
  "data": {
    "page_id": "index",
    "title": "메인 인덱스",
    "updated_at": "2026-03-04T15:00:00+09:00",
    "widgets": [
      {
        "widget_id": "w001",
        "type": "notice_banner",
        "order": 1,
        "config": { "auto_slide": true, "interval": 5000 },
        "style": { "height": 200 }
      },
      {
        "widget_id": "w002",
        "type": "latest_posts",
        "order": 2,
        "config": { "bo_table": "free", "limit": 5, "show_thumbnail": true },
        "style": { "layout": "card", "columns": 2 }
      },
      {
        "widget_id": "w003",
        "type": "ad_banner",
        "order": 3,
        "config": { "image_url": "/uploads/ad/banner1.jpg", "link": "https://..." },
        "style": { "height": 100 }
      }
    ]
  }
}
```

---

## 6. DB 스키마 (예상)

```sql
-- 페이지 레이아웃
CREATE TABLE g5_sdui_layout (
    sl_id       INT AUTO_INCREMENT PRIMARY KEY,
    sl_page_id  VARCHAR(50) NOT NULL UNIQUE,
    sl_title    VARCHAR(100) NOT NULL,
    sl_schema   JSON NOT NULL,
    sl_active   TINYINT(1) DEFAULT 1,
    sl_datetime DATETIME NOT NULL,
    sl_updated  DATETIME NOT NULL
);

-- 광고 배너 관리
CREATE TABLE g5_sdui_ad (
    sa_id       INT AUTO_INCREMENT PRIMARY KEY,
    sa_title    VARCHAR(100) NOT NULL,
    sa_image    VARCHAR(255),
    sa_link     VARCHAR(500),
    sa_start    DATETIME,
    sa_end      DATETIME,
    sa_active   TINYINT(1) DEFAULT 1,
    sa_click    INT DEFAULT 0,
    sa_view     INT DEFAULT 0
);
```

---

## 7. Flutter 측 구현 참고

- SDUI JSON 파싱 → Material/Cupertino 위젯 동적 빌드
- 위젯 타입별 `WidgetFactory` 패턴으로 확장 가능 설계
- 레이아웃 캐싱 (로컬 DB) + ETag 기반 갱신 체크
- 광고 배너 노출 시 `view` 카운트 API 호출, 클릭 시 `click` 카운트

---

## 8. 오픈 이슈

1. 관리자 에디터를 웹(그누보드 관리자) vs Flutter 앱 내장 중 어디에 구현할지
2. 위젯 캐싱 전략 (TTL vs ETag vs WebSocket 실시간)
3. 광고 성과 리포트 (노출수/클릭수/CTR) 대시보드 범위
4. 다국어 위젯 타이틀 지원 여부
