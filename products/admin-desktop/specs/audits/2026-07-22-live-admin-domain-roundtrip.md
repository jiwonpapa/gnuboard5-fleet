---
doc_type: audit
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-07-23
review_cycle_days: 7
bounded_context: api-pipeline
---
# 17-domain live 관리자 API 왕복 감사

## 결론

- Apache origin: `17/17 PASS`
- writable domain: `13/13` mutation·readback·cleanup PASS
- SMS 미설치 domain: `4/4` documented 503 unavailable PASS
- 외부 발송: `0건`
- 증거등급: `historical_observation` — 당시 관찰 결과이며 current-run JSON이 보존되지 않아 destination certification이 아님
- 공개 HTTPS: `FAIL` — ModSecurity CRS `911100`이 PUT·PATCH·DELETE를 HTML 403으로 차단
- 최종 Tauri 소비 인증: `partial` — production Rust wire는 통과했지만 실제 설치 앱의 전 domain invoke/DOM 증거는 미완료
- 설치 앱 스모크: fast profile 빌드·`/Applications/그누5어드민.app` 재설치·ad-hoc codesign 검증·Intro→마스터 잠금 해제 화면 렌더 PASS

## 감사 범위

`boards`, `config`, `contents`, `faq-masters`, `faqs`, `groups`, `mails`, `members`, `menus`, `points`, `polls`, `popups`, `sms-contacts`, `sms-messages`, `sms-templates`, `system`, `theme`의 정확한 17-domain을 검사했습니다.

기계 판독 SSOT는 `specs/integration/LIVE_DOMAIN_CERTIFICATION.json`이며 75개 실행 계획 operationId와 13개 비가역 또는 외부효과 제외 operationId를 고정합니다. 일반 게시판 protected API와 쇼핑몰은 이 소비 감사 범위에 넣지 않았고 PHP 공급자 계약에서는 보존합니다.

## fail-closed 안전장치

실제 fixture 생성 전 존재하지 않는 리소스에 PUT·PATCH·DELETE를 보내 문서화된 404가 돌아오는지 확인합니다. 공개 경로처럼 WAF가 HTML 403을 반환하면 domain 실행을 시작하지 않고 `domain_count=0`, `mutation_method_preflight=false`로 종료합니다. 따라서 차단된 DELETE 때문에 fixture가 남는 재발을 막습니다.

각 writable domain은 baseline, dependency setup, mutation, API readback, cleanup, cleanup readback을 분리 기록합니다. 실패 경로에서도 cleanup을 시도하며 cleanup 미확인은 PASS가 될 수 없습니다.

## 실서버 결과

당시 실행에서 사용한 관찰 라벨 `origin-live-v5`는 17개 domain과 모든 proof를 통과한 것으로 기록됐습니다. 공개 경로 관찰 라벨 `public-waf-preflight-v1`은 세 메서드가 모두 `response.403.media_type: undeclared media type text/html`로 실패했으며 domain mutation은 실행되지 않은 것으로 기록됐습니다.

## 증거 보존 경계

당시 `live-admin-domain-roundtrip.json`과 `live-domain-registry.json`은 Git에 보존되지 않았고 현재 작업공간에도 남아 있지 않습니다. 따라서 위 결과는 `historical_observation`이며 새 통합 저장소나 배포 대상의 current-run 인증 자료로 승계하지 않습니다. destination certification은 새 대상에서 provider revision, OpenAPI SHA, 실행 operationId, unavailable accounting을 결합한 full audit를 다시 실행해 산출물을 보존한 경우에만 부여합니다.

실서버 검증 중 발견된 PHP 결함 두 건도 공급자 저장소에서 수정했습니다.

- 엄격 SQL mode에서 게시판 최소 생성 payload의 NOT NULL text 기본값 누락
- 포인트 원장 `po_rel_id` 20자 제한을 넘는 audit relation ID

## 남은 인증 경계

1. VPSGuard/Apache WAF 정책 소유자가 API write method 허용 범위를 확정해야 공개 HTTPS write certification을 재실행할 수 있습니다.
2. 17-domain production wire 증거를 실제 Tauri command invoke와 설치 앱 DOM 저장·재수화 증거로 확장해야 `real API write/readback/rollback` capability를 `implemented`로 승격할 수 있습니다.
3. provider identity는 clean PHP revision/OpenAPI SHA와 결합해야 하며 현재 코드 수정 배포 증거를 release 인증으로 오인하지 않습니다.

설치 앱 UI 검증에서는 자격 증명을 새로 저장하거나 입력하지 않았습니다. 따라서 앱 셸과 잠금 해제 진입은 확인했지만 로그인 이후 전 메뉴 동작 증거로 확대 해석하지 않습니다.
