# Admin Field Schema Registry

이 디렉터리는 레거시 `adm/*.php` 관리자 폼에서 추출한 필드 메타데이터를 generated JSON registry로 고정하는 경계입니다.

## 원칙

- 레거시 폼은 bootstrap source 입니다.
- 런타임 진실 원본은 `Data/generated/*.json` 과 `/admin/schema` 응답입니다.
- 도메인 추가/수정은 코드 하드코딩이 아니라 `schema-domains.json`에서 관리합니다.
- `default_value`는 생성(create) 화면용 정적 기본값만 뜻합니다.
- 수정(edit) 화면은 `/admin/schema`의 `default_value`가 아니라 각 도메인 상세 조회 응답의 현재값을 사용합니다.
- 레거시 폼이 `$config[...]`, helper 함수, 현재 DB 레코드처럼 런타임 값을 섞어 만드는 필드는 `default_value: null`로 남겨 오탐을 막습니다.

## 갱신 절차

1. `schema-domains.json`에 도메인 정의를 추가하거나 수정합니다.
2. `composer run schema:extract -- --domain {domain}` 으로 generated registry 를 다시 만듭니다.
3. `composer run schema:check` 로 stale 여부를 확인합니다.
4. `/admin/schema`, `/admin/schema/{domain}` 계약과 Rust 소비 화면을 같이 검증합니다.

## 주의

- 런타임에 레거시 PHP를 다시 파싱하지 않습니다.
- generated registry 와 manifest 는 반드시 커밋합니다.
- 레거시 폼/Repository 가 바뀌면 `schema:check` 가 바로 실패해야 정상입니다.
