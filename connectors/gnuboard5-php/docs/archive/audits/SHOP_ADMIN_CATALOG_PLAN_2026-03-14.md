# 영카트 쇼핑몰 관리자 `catalog` 포팅 사전 계획 2026-03-14

기준: `2026-03-14`  
범위: `adm/shop_admin` 중 카탈로그 계열 (`category*`, `item*`, `optionstock*`, `itemqa*`, `itemuse*`, `itemevent*`)

## 1) 목표

`shop-catalog` 블로커를 해소하기 위한 **최소 실행 단위**를 `SHOP` 한 덩어리로 바로 띄우지 않고, API 계약/스키마 설계 기준을 먼저 고정합니다.

- `schema-domains.json`에 `shop-catalog`이 `plan` 상태로 남아 있는 상태 자체는 유지한다.
- 다음 구현 단계에서 `admin` 라우트/서비스/레포지토리 분해를 바로 적용할 수 있게
  - 경로 후보
  - CRUD/액션 후보
  - 테이블 소유권
  - 기본값 정책
  를 이 문서에 선정의한다.

## 2) 카탈로그 범위 식별 (legacy 진입점)

### 2-1. 진입점(메뉴 기준)

- `400200` 분류관리: `categorylist.php`
- `400300` 상품관리: `itemlist.php`
- `400610` 상품유형관리: `itemtypelist.php`
- `400500` 상품옵션재고관리: `itemstocklist.php`, `optionstocklist.php`
- `400620` 상품재고관리: `itemstocklist.php`
- `400650` 사용후기: `itemuselist.php`, `itemuseform.php`
- `400660` 상품문의: `itemqalist.php`, `itemqaform.php`
- `400750` 상품이벤트(쿠폰존 아닌): `itemeventlist.php`, `itemeventform.php`

### 2-2. write 액션 후보(레거시 추출 기반)

- `categoryformupdate.php`, `categorylistupdate.php`
- `itemformupdate.php`, `itemcopyupdate.php`(참조형), `itemexcelupdate.php`
- `itemstocklistupdate.php`, `optionstocklistupdate.php`, `itemstocksmsupdate.php`
- `itemtypelistupdate.php`
- `itemuselistupdate.php`, `itemuseformupdate.php`
- `itemqalistupdate.php`, `itemqaformupdate.php`
- `itemeventformupdate.php`, `itemeventlistupdate.php`

> `itemeventlist.php`에는 `action="<?php echo $_SERVER['SCRIPT_NAME']; ?>"` 형태 자체 호출도 있어
> list-only 또는 batch 액션 분기 처리 필요성이 큽니다.

## 3) 카탈로그 기능 분해(1차 구현 추천)

1. `catalog.category`  
   - 리소스: `g5_shop_category_table`  
   - 우선 처리: 목록 조회/등록/수정/삭제(soft delete 아님)  
   - 기존 근거: `categorylist.php`, `categoryform.php`

2. `catalog.product`  
   - 리소스: `g5_shop_item_table`, `g5_shop_category_table`  
   - 우선 처리: 목록 조회/단건 조회/등록/수정/삭제  
   - 기존 근거: `itemlist.php`, `itemform.php`, `itemcopy.php`, `itemexcel.php`

3. `catalog.stock`  
   - 리소스: `g5_shop_item_option_table`, `g5_shop_cart_table`  
   - 우선 처리: 재고 변경/재입고 SMS 알림 정책 조회/수정  
   - 기존 근거: `itemstocklist.php`, `optionstocklist.php`, `itemstocksms.php`

4. `catalog.review`  
   - 리소스: `g5_shop_item_use_table`, `g5_shop_item_table`  
   - 우선 처리: 목록 조회/상태 토글/답변 등록  
   - 기존 근거: `itemuselist.php`, `itemuseform.php`

5. `catalog.inquiry`  
   - 리소스: `g5_shop_item_qa_table`  
   - 우선 처리: 목록 조회/답변 등록  
   - 기존 근거: `itemqalist.php`, `itemqaform.php`

6. `catalog.event`  
   - 리소스: `g5_shop_event_table`, `g5_shop_event_item_table`, `g5_shop_item_relation_table`  
   - 우선 처리: 목록 조회/등록/수정  
   - 기존 근거: `itemeventform.php`, `itemeventlist.php`

## 4) 레이어 매핑(초안)

- `api/routes/v1/admin.php`: `shop_catalog.php` 모듈 추가 준비
- `api/v1/Admin/Catalog/` 하위에서 아래 경로 모듈 선정의 권장:
  - `Controller/AdminShopCatalogController.php`
  - `Service/AdminShopCatalogService.php`
  - `Repository/AdminShopCatalogRepository.php`
  - `Schema` 파이프라인에 `schema-domains.json`의 `shop-catalog` 엔트리 동기화

> 실제 구현 전에는 `Api\\Admin\\Catalog` 로컬 계약으로 시작하고 `Api\\Integration\\Contracts` 의존은 배제합니다.

## 5) `/admin/schema` 기본값 정책(중요)

- **원칙 재확인**: `default_value`는 생성(CREATE) 화면용 정적/세션 독립값만 노출.
- 편집(UPDATE)은 `/admin/schema/{domain}/{id}` 또는 상세 조회값을 기준으로 현재값 사용.
- 레거시 폼에서 다음 유형은 `default_value`로 오인하면 안 됨:
  - 동적 토글/조건부 표시 필드
  - `select` 기본선택이 SQL/헬퍼 기반이거나 `$config` 기반일 경우
  - 복수행/체크박스 배열(`[]`) 형태 반복필드
- 현재 `extract_admin_schema.py`의 `default_value` 추출 규칙은:
  - 폼 literal 우선
  - SQL 기본값 fallback
  - 최후에 정적 타입 fallback(`string`/`integer`/`boolean`)  
  구조를 유지할 것

## 6) 다음 단계 체크리스트

1. `shop-catalog` 라우트 설계 확정 (최소:
   `GET /admin/shop/catalog/categories`, `POST`, `GET /{categoryId}`, `PATCH /{categoryId}`,
   `GET /admin/shop/catalog/products`, `POST`, `GET /{productId}`, `PATCH /{productId}`,
   `PATCH /{productId}/stock`, `PATCH /{productId}/options`)
2. `field parity` 기준 점검 파일 생성:
   - 입력 필드 목록(템플릿/배열/버튼/액션 플래그 제외)
   - create-only / readonly_on_update 정책 선언
3. `schema-domains.json` `shop-catalog` 엔트리(1차) 등록 전환:
   - `schema-domains.json` 등록
   - `scripts/extract_admin_schema.py` 결과물 생성
4. 구현 후 `composer run audit:porting` + `composer run audit:schema-provider-readiness` + `composer run audit:schema-provider-report`.

## 7) 상태

`shop-catalog`은 현재 README/문서 기준으로 `provider_domain_missing` 상태를 유지해야 하며,
카탈로그 1차 구현이 합의되기 전까지 `implemented` 상태로 변경하지 않습니다.
