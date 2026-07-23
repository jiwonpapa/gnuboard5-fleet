# SHOP_ADMIN 포팅 정합성 2차 사전 감사

기준: `2026-03-14`

## 1) Scope

`adm/shop_admin/*.php`, `adm/admin.menu400.shop_1of2.php`, `adm/admin.menu500.shop_2of2.php`의 라우트 후보를 기준으로 `/admin/shop*` 계약 부재 상태를 선행 평가합니다.

## 2) 증적 요약

- `adm/shop_admin` 파일 수: `99`개 (1차 감사와 동일)
- 관리자 메뉴 진입점: `26`개 (`menu400`: 16개, `menu500`: 10개)
- `api/docs/openapi.yaml`의 `/admin` path는 현재 `114`개이나 `/admin/shop*` 패턴은 `0`개
- `/admin/schema` 도메인(`api/v1/Admin/Schema/schema-domains.json`)은 `boards, config, system, theme, sms-*, mails, points, members, polls, popups, contents, groups, menus, faq-masters, faqs` 등 현재 16개만 존재
- `api/v1/Admin/Schema/Data/generated`도 현재 16개 도메인 JSON만 존재
- `composer run audit:porting` 결과는 통과(`default_value`는 현재 구현 도메인 기준 표준값 샘플만 출력)

## 3) menu400/shop 메뉴군 매핑

| 메뉴코드 | 메뉴명 | 진입점 |
|---|---|---|
| 400000 | 쇼핑몰관리 | `adm/shop_admin/` |
| 400010 | 쇼핑몰현황 | `adm/shop_admin/` |
| 400100 | 쇼핑몰설정 | `adm/shop_admin/configform.php` |
| 400400 | 주문내역 | `adm/shop_admin/orderlist.php` |
| 400440 | 개인결제관리 | `adm/shop_admin/personalpaylist.php` |
| 400200 | 분류관리 | `adm/shop_admin/categorylist.php` |
| 400300 | 상품관리 | `adm/shop_admin/itemlist.php` |
| 400660 | 상품문의 | `adm/shop_admin/itemqalist.php` |
| 400650 | 사용후기 | `adm/shop_admin/itemuselist.php` |
| 400620 | 상품재고관리 | `adm/shop_admin/itemstocklist.php` |
| 400610 | 상품유형관리 | `adm/shop_admin/itemtypelist.php` |
| 400500 | 상품옵션재고관리 | `adm/shop_admin/optionstocklist.php` |
| 400800 | 쿠폰관리 | `adm/shop_admin/couponlist.php` |
| 400810 | 쿠폰존관리 | `adm/shop_admin/couponzonelist.php` |
| 400750 | 추가배송비관리 | `adm/shop_admin/sendcostlist.php` |
| 400410 | 미완료주문 | `adm/shop_admin/inorderlist.php` |

## 4) menu500/shop 메뉴군 매핑

| 메뉴코드 | 메뉴명 | 진입점 |
|---|---|---|
| 500000 | 쇼핑몰현황/기타 | `adm/shop_admin/itemsellrank.php` |
| 500110 | 매출현황 | `adm/shop_admin/sale1.php` |
| 500100 | 상품판매순위 | `adm/shop_admin/itemsellrank.php` |
| 500120 | 주문내역출력 | `adm/shop_admin/orderprint.php` |
| 500400 | 재입고SMS알림 | `adm/shop_admin/itemstocksms.php` |
| 500300 | 이벤트관리 | `adm/shop_admin/itemevent.php` |
| 500310 | 이벤트일괄처리 | `adm/shop_admin/itemeventlist.php` |
| 500500 | 배너관리 | `adm/shop_admin/bannerlist.php` |
| 500140 | 보관함현황 | `adm/shop_admin/wishlist.php` |
| 500210 | 가격비교사이트 | `adm/shop_admin/price.php` |

## 5) form/write 엔드포인트 선별 포인트

`adm/shop_admin/*.php`에서 `action=` 속성으로 확인 가능한 write 후보는 아래와 같습니다.

- config: `configformupdate.php`
- category: `categorylistupdate.php`, `categoryformupdate.php`
- product: `itemformupdate.php`, `itemcopy.php`, `itemexcelupdate.php`, `itemstocklistupdate.php`, `optionstocklistupdate.php`, `itemstocksmsupdate.php`, `itemuseformupdate.php`
- product type/option: `itemtypelistupdate.php`
- review/Q&A: `itemqalistupdate.php`, `itemuselistupdate.php`, `itemqaformupdate.php`
- order: `orderformcartupdate.php`, `orderformreceiptupdate.php`, `orderformupdate.php`, `orderdeliveryupdate.php`, `orderpartcancelupdate.php`, `inorderformupdate.php`, `inorderlistdelete.php`
- personal pay: `personalpaycopyupdate.php`, `personalpayformupdate.php`, `personalpaylistdelete.php`
- coupon: `couponformupdate.php`, `couponlist_delete.php`, `couponzoneformupdate.php`, `couponzonelist_delete.php`
- event: `itemeventformupdate.php`, `itemeventlistupdate.php`
- banner: `bannerformupdate.php`
- sendcost: `sendcostupdate.php`
- stats/출력: `sale1today.php`, `sale1date.php`, `sale1month.php`, `sale1year.php`, `orderprintresult.php`

## 6) `default_value` 정책(중요)

- 생성(create)에서만 정적 기본값을 제공해야 하고, edit(변경)는 DB read 값이어야 합니다.
- 현재 `/admin/shop*`가 계약/라우트/스키마에 미반영이라, REST 쪽에서 기본값 계약(`default_value`)은 `shop_admin` 기능을 시작하기 전 선확인하지 않으면 안 됩니다.
- 이를 방지하려면 각 도메인별 생성/수정 스펙을 `default_value`(create-only) / `readonly_on_update` / `required`로 분리 등록해야 합니다.

## 7) 판정

- 상태: **P0-Blocker**
- 이유: `shop_admin` 진입점은 26개가 확인되지만 REST 쪽 계약/스키마/라우트가 완전히 부재
- 다음 단계:
  - 1차: `Shop` 도메인 범위를 4~5개 서비스 묶음으로 분해해 라우트 후보 확정 (`catalog`, `order`, `personalpay`, `promotion`, `stats`)
  - 2차: `/admin/shop/config|orders|products|coupons|events` 핵심 5개 엔드포인트에 대해 `legacy form`, `UPDATE/DML`, `table`, `generated schema` 대응표 작성
  - 3차: `composer run audit:porting` + `composer run audit:schema-provider-readiness` 재실행 (blocked backlog 명시 시)

## 8) 레퍼런스

- 이전 분석: `docs/audits/SHOP_ADMIN_AUDIT_2026-03-14.md`
