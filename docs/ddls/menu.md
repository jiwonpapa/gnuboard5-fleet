# Menu Domain DDL

## 1. 범위
- 네비게이션 메뉴 API(노출/사용여부) 기준
- PC/Mobile 메뉴 분기

## 2. 핵심 테이블

### 2.1 `g5_menu`
```sql
CREATE TABLE IF NOT EXISTS `g5_menu` (
  `me_id` int(11) NOT NULL AUTO_INCREMENT,
  `me_code` varchar(255) NOT NULL,
  `me_name` varchar(255) NOT NULL,
  `me_link` varchar(255) NOT NULL,
  `me_target` varchar(255) NOT NULL,
  `me_order` int(11) NOT NULL,
  `me_use` tinyint(4) NOT NULL,
  `me_mobile_use` tinyint(4) NOT NULL,
  PRIMARY KEY (`me_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. API 계약 영향
- 메뉴 노출 API는 `me_use=1` 또는 사용자별 권한 규칙(필요 시 `me_code`)으로 필터링.
- `me_link`는 외부 URL일 경우 allow-list 정책과 조합해 검사.
- 코드 정렬(`me_order`)이 메뉴의 선후순서 결정.
- 관리자 API의 `me_use`, `me_mobile_use` canonical 타입은 DB·Tauri 소비와 같은 정수 `0|1`이며 boolean으로 변환하지 않는다.
- 생성 기본값은 `me_target=_self`, `me_order=0`, 두 사용 플래그 `1`이다. 수정은 7개 mutable field만 허용하고 재정렬은 `me_id`, `me_order` 두 필드만 저장한다.
- 목록·상세·생성·수정 응답은 위 테이블의 8개 컬럼만 projection하고 DB 숫자 문자열을 integer로 정규화한다.
