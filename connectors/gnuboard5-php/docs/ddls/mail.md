# Mail Domain DDL

## 1. 범위
- 관리자 메일 템플릿/발송 이력 관리(`admin/mail`)
- 운영 공지/대량 발송 원본 저장

## 2. 핵심 테이블

### 2.1 `g5_mail`
```sql
CREATE TABLE IF NOT EXISTS `g5_mail` (
  `ma_id` int(11) NOT NULL AUTO_INCREMENT,
  `ma_subject` varchar(255) NOT NULL DEFAULT '',
  `ma_content` mediumtext NOT NULL,
  `ma_time` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `ma_ip` varchar(255) NOT NULL DEFAULT '',
  `ma_last_option` text NOT NULL,
  PRIMARY KEY (`ma_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
```

| 컬럼 | 의미 |
|---|---|
| `ma_subject` | 메일 제목 |
| `ma_content` | 메일 본문(템플릿 포함) |
| `ma_time` | 작성/발송 시각 |
| `ma_ip` | 관리자 요청 IP |
| `ma_last_option` | 마지막 발송 옵션(대상/필터) 직렬화 값 |

## 3. 인덱스/무결성 포인트
- PK(`ma_id`) 외 인덱스가 없어 기간 검색(`ma_time`) 중심 조회 시 운영 인덱스 검토 필요.
- 본문 컬럼이 `mediumtext`이므로 목록 API는 본문 전체 로딩을 피하는 projection 전략 권장.

## 4. 비즈니스 규칙
- API는 본문 저장과 발송 트리거를 분리해 멱등성을 유지한다.
- 대량 발송 옵션은 `ma_last_option`에 저장되므로 구조 변경 시 하위호환 파서를 함께 관리해야 한다.

## 5. REST 계약 결합

- 템플릿 생성·수정 canonical 입력은 `ma_subject`, `ma_content`이며 레거시 `subject`, `content` 쌍을 호환 입력으로 유지한다. 두 흐름 모두 위 두 DB 컬럼에 저장한다.
- 목록/상세 응답은 `ma_id`, `ma_subject`, `ma_content`, `ma_time`, `ma_ip`, `ma_last_option`을 필수 필드로 반환한다. 상세에는 파싱된 `last_option` 8개 필드와 `preview_html`을 추가한다.
- 발송 필터는 `ma_last_option` 문자열로 직렬화하고 조회 상세에서 `mb_id1`, `mb_id1_from`, `mb_id1_to`, `mb_email`, `mb_mailling`, `mb_level_from`, `mb_level_to`, `gr_id`로 역직렬화한다.
- 수신자 조회는 `g5_member`의 `mb_id`, `mb_name`, `mb_nick`, `mb_email`, `mb_level`, `mb_mailling`, `mb_datetime`만 공개하며 비밀번호·인증 관련 컬럼은 응답에서 제외한다.
