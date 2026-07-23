# 영카트 쇼핑몰 관리자 1차 포팅 감사 — 2026-03-14

> 기준 시점: 2026-03-14 00:00 KST  
> 범위: `adm/shop_admin/*.php` 전수(99개), `adm/admin.menu400.shop_1of2.php`, `adm/admin.menu500.shop_2of2.php`, `api/docs/openapi.yaml`, `/admin/` 라우트/스키마 운영 상태

## 1. 감사 결과 요약

- 현재 `adm/shop_admin`은 **범위 포함**은 맞지만, PHP REST API 상에서는 아직 `shop_admin` 기능이 구현되어 있지 않음.
- `/admin` 공개 경로에는 총 114개가 있으나, `'/admin/shop*'` 패턴 경로는 0개.
- `/admin/schema` `schema-domains.json`에는 `17`개 도메인만 존재하며 `shop_*` 도메인은 없음.
- 레거시 99개 파일 모두에 대해 “포팅/정합성 매핑 표준”이 미정의 상태라, 이번 1차 감사는 **스캔/갭 식별** 단계로 한정.

## 2. 스캔 증거

### 2.1 파일 구성

- 총 파일 수: `99`
- 공통/헬퍼: `_common.php`, `admin.shop.lib.php`, `ajax.*.php` 4개, `itemdelete.inc.php`, `ordermail.inc.php`, `ordersms.inc.php`
- 업그레이드 대상 핵심 기능군(대분류):
  - `config`: 2개 (`configform.php`, `configformupdate.php`)
  - `category`: 4개
  - `item`: 35개
  - `order`: 18개
  - `personalpay`: 6개
  - `coupon`: 10개
  - `banner`: 3개
  - `event`: 11개
  - `stat/sendcost/price/wishlist`: 각 2개
- 메뉴 진입점(기준 파일): `admin.menu400.shop_1of2.php`, `admin.menu500.shop_2of2.php` 총 `26`개 진입점
  - 메뉴상 진입점 예시: `configform`, `orderlist`, `itemlist`, `couponlist`, `bannerlist`, `itemstocksms`, `price`, `wishlist` 등

### 2.2 레거시 테이블 의존성(Top 12)

`adm/shop_admin`에서 반복 사용 빈도 상위는 다음과 같습니다.

1. `g5_shop_item_table` (73)
2. `g5_shop_order_table` (54)
3. `g5_shop_category_table` (50)
4. `g5_shop_cart_table` (39)
5. `g5_shop_default_table` (23)
6. `g5_shop_item_option_table` (20)
7. `g5_shop_personalpay_table` (18)
8. `g5_shop_event_item_table` (16)
9. `g5_shop_coupon_table` (13)
10. `g5_shop_event_table` (12)
11. `g5_shop_banner_table` (10)
12. `g5_shop_skin_path` (9)

총 25개 `g5_shop_*` 테이블이 실질적으로 노출됨.

### 2.3 계약/라우트 차이점

- OpenAPI: `/admin/shop*` 경로 없음
- 라우트 모듈: `api/routes/v1/admin.php`가 로드하는 도메인은 `core, communication, board, members, content, system` 중심
- 관리자 스키마: `api/v1/Admin/Schema/schema-domains.json`은 현재 shop 도메인을 명시하지 않음

## 3. 판정

### 3.1 현재 상태

- **판정: `미구현`(Gap 상태)**
- **구현 완료로 볼 수 없음**: `adm/shop_admin`과 API 계약/스키마 간의 연결 경로가 현재 없음

### 3.2 남은 리스크

1. **중요**: 기능 레벨은 크지만 API 계약 레이어가 비어 있어, 소비단과 계약 테스트에서 `shop_admin` 영향도를 판단할 기준이 없음.
2. **중요**: 주문/결제/재고 처리 특성상 부작용(트랜잭션, 결제 로그, 쿠폰/재고 동기화)이 크며, 포팅 시 adapter 경계와 트랜잭션 의미 정의가 선행되어야 함.
3. **중요**: 현재 헌법상 scope 예외인 점만 제외된 것이지, 소비단 계약이 없으므로 `schema provider`와 `read/write parity` 보장 규칙이 적용 전 단계.

## 4. 2차 작업 제안(우선순위)

1. `shop` 관리자 기능을 다음 도메인 패키지로 분해(우선순위 High)
   - `ShopConfig`, `ShopCatalog`, `ShopOrder`, `ShopPayment`, `ShopCoupon`, `ShopDelivery`, `ShopEvent`, `ShopPromote`, `ShopStats`
2. 메뉴 진입점(26개) 기준으로 `/admin/shop/*` 초기 공통 라우트 명세 설계
3. `/admin/schema` provider manifest에 `shop-*` feature backlog를 추가해, 구현 전 blocker/요건 추적 체계로 고정
4. 레거시 `itemform*`, `order*`, `coupon*`, `personalpay*`의 핵심 입력/출력 의미를 추려 `FIELD_PARITY_AUDIT` 2차 자료로 전환

## 5. 증거 파일

- `adm/shop_admin` (99개 파일)
- `adm/admin.menu400.shop_1of2.php` (16개 진입점)
- `adm/admin.menu500.shop_2of2.php` (10개 진입점)
- `api/routes/v1/admin.php`
- `api/docs/openapi.yaml`
- `api/v1/Admin/Schema/schema-domains.json`
- `scripts/check_admin_schema_provider_readiness.py`
