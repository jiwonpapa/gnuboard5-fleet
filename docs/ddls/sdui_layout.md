# SDUI Layout Domain DDL

## 1. 범위
- 앱/웹 페이지 단위 레이아웃 JSON 스키마 저장
- 위젯 단위 구성요소 추가/수정/삭제/재정렬
- 광고 위젯 메타 확장 테이블 연계 준비

## 2. 핵심 테이블

### 2.1 `g5_sdui_layout`
```sql
CREATE TABLE IF NOT EXISTS `g5_sdui_layout` (
  `sl_id` int(11) NOT NULL AUTO_INCREMENT,
  `sl_page_id` varchar(50) NOT NULL,
  `sl_title` varchar(255) NOT NULL,
  `sl_schema` longtext NOT NULL,
  `sl_active` tinyint(4) NOT NULL DEFAULT 1,
  `sl_datetime` datetime NOT NULL,
  `sl_updated` datetime NOT NULL,
  PRIMARY KEY (`sl_id`),
  UNIQUE KEY `uk_page_id` (`sl_page_id`),
  KEY `idx_active_updated` (`sl_active`,`sl_updated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 `g5_sdui_ad` (확장용)
```sql
CREATE TABLE IF NOT EXISTS `g5_sdui_ad` (
  `sa_id` int(11) NOT NULL AUTO_INCREMENT,
  `sa_code` varchar(50) NOT NULL,
  `sa_title` varchar(255) NOT NULL,
  `sa_payload` longtext NOT NULL,
  `sa_active` tinyint(4) NOT NULL DEFAULT 1,
  `sa_datetime` datetime NOT NULL,
  PRIMARY KEY (`sa_id`),
  UNIQUE KEY `uk_ad_code` (`sa_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 3. API 계약 영향
- `/layouts/{page_id}`는 `sl_active=1` 조건의 단일 레코드를 조회한다.
- `sl_schema`는 JSON 문자열로 저장하며 루트는 `{ "widgets": [] }` 구조를 강제한다.
- `/admin/layouts/{page_id}` 저장은 upsert 정책이며 `sl_updated`를 최신 시각으로 갱신한다.
- 위젯 식별자 `widget_id`는 영문/숫자/`_`/`-` 허용 정규식(`1~80자`)을 따른다.
- 관리자 쓰기 body는 저장/생성/부분 수정/재정렬별 closed schema로 제한하며, 위젯 공개 필드는 `widget_id`, `type`, `title`, `order`, `config`, `style`이다.
- 관리자 목록/상세 응답은 `sl_id`, `sl_page_id`, `sl_title`, `sl_active`, `sl_datetime`, `sl_updated`를 공통으로 반환하고 상세는 저장 원형인 `sl_schema` JSON 문자열을 추가한다. `sl_active`는 정수 `0|1` 계약이다.

## 4. 무결성/운영 포인트
- `sl_schema` 파싱 실패 시 빈 스키마로 취급하여 API 500 전파를 방지한다.
- 위젯 재정렬은 전달된 `widget_ids[]` 기반으로 order를 재계산한다.
- 대형 JSON 저장 시 I/O 부하를 고려해 관리자 수정 API에는 변경 이력 로깅을 권장한다.
