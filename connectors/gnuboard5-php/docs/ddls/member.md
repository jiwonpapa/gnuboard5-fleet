# Member Domain DDL

## 1. 범위
- 회원 조회, 검색, 회원 상태, 정보 수정 API 기초 데이터
- 그룹/권한 정보와 결합될 수 있는 회원 기본키 체계 정리

## 2. 핵심 테이블

### 2.1 `g5_member`
- 스키마 상세는 [auth 도메인 문서](./auth.md)의 `g5_member` 항목을 우선 참조한다.

### 2.2 `g5_group_member`
```sql
CREATE TABLE IF NOT EXISTS `g5_group_member` (
  `gm_id` int(11) NOT NULL AUTO_INCREMENT,
  `gr_id` varchar(255) NOT NULL,
  `mb_id` varchar(20) NOT NULL,
  `gm_datetime` datetime NOT NULL,
  PRIMARY KEY (`gm_id`),
  KEY `gr_id` (`gr_id`),
  KEY `mb_id` (`mb_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

## 3. 회원 상태 정책(권고)
- `mb_leave_date`, `mb_intercept_date`는 활성/비활성 판단의 핵심.
- `mb_level`/`mb_id` 조합으로 board 접근 제어 및 관리자 판별 정책을 구현.
- 회원 커스텀 필드는 `mb_1`~`mb_10` 사용.
- `mb_open` 변경 시 `mb_open_date`, `mb_mailling`/`mb_sms`/`mb_marketing_agree`/`mb_thirdparty_agree` 변경 시 각 동의일자와 `mb_agree_log`를 함께 갱신한다.

## 4. API 계약 영향
- `/members`류 API가 있을 경우 목록 조회/필드 최소 노출(`mb_password` 등 민감 정보 제외).
- 관리자 회원 API도 raw `SELECT *` row를 응답하지 않는다. 공개 57개 필드만 projection하며 `mb_password`, `mb_email_certify2`, `mb_lost_certify`, `mb_dupinfo`는 항상 제외한다.
- 관리자 수정 요청은 외부 입력 화이트리스트만 받고 동의일자와 `mb_agree_log`는 서버 파생 필드로만 저장한다. `mb_password`는 입력 전용이며 해시값을 응답하지 않는다.
- 회원 정렬 시 `mb_level`, `mb_datetime`, `mb_today_login` 인덱스를 우선 사용.
- 그룹 회원 목록은 `gm_id`, `gr_id`, `mb_id`, `gm_datetime`과 회원 LEFT JOIN의 `mb_name`, `mb_nick`, `mb_level`, `mb_today_login`만 반환한다. JOIN 대상이 없으면 회원 필드는 nullable이다.
