# 표준 감사 보고서 — 2026-03-16

> **기준 시점**: 2026-03-16 09:01 KST
> **범위**: 변경 경로 32건: `.agent/workflows/audit.md`, `.agent/workflows/deep-audit.md`, `.agent/workflows/field-parity-audit.md`, `.github/workflows/ci.yml`, `.gitignore`, `AGENTS.md`, `api/docs/openapi.contract-manifest.json`, `api/docs/openapi.yaml`, `api/v1/Admin/Shop/Catalog/Repository/AdminShopCatalogProductRepository.php`, `api/v1/Admin/Shop/Catalog/Repository/AdminShopCatalogRepository.php`, `composer.json`, `docs/AUDIT_STRATEGY.md`, 외 20건

## 결론

**🟢 통과**

- `quality-gate`는 실행되었습니다.
- `blackbox`는 실행되었습니다.
- `integrated audit`는 실행되었습니다.

## Failure
- none

## Note
- 실행 체크 수: `3`
- 감지된 변경 경로 수: `32`
- `AUDIT_LATEST.md`는 같은 날짜의 최신 표준 감사본과 자동 동기화됩니다.
- `docs/DOCUMENT_REGISTRY.md`와 `docs/docs.db`는 보고서 작성 뒤 자동 갱신됩니다.

## Evidence
- `quality_gate` status=`passed` cwd=`.` command=`composer run quality-gate`
- `blackbox` status=`passed` cwd=`.` command=`composer run test:api:blackbox`
- `integrated` status=`passed` cwd=`.` command=`composer run audit:integrated`

## 실행 체크 결과

### Implementation quality gate

- 상태: ✅ 통과
- 실행 위치: `.`
- 명령: `composer run quality-gate`
- 소요 시간: `34796ms`

#### stdout tail
```text
  [37;41mMethods:  25.00% ( 1/ 4)[0m   [30;43mLines:  85.71% ( 24/ 28)[0m
Api\Support\Exception\ApiException
  [30;43mMethods:  88.89% ( 8/ 9)[0m   [30;43mLines:  88.89% (  8/  9)[0m
Api\Support\Http\ApiResponse
  [30;43mMethods:  60.00% ( 3/ 5)[0m   [30;43mLines:  64.71% ( 22/ 34)[0m
Api\Support\Http\TraceContext
  [30;43mMethods:  62.50% ( 5/ 8)[0m   [30;43mLines:  69.05% ( 29/ 42)[0m
Api\Support\Logging\ApiLoggerFactory
  [37;41mMethods:  33.33% ( 1/ 3)[0m   [37;41mLines:  33.33% (  7/ 21)[0m
Api\Support\Logging\ErrorContextBuilder
  [37;41mMethods:  36.36% ( 4/11)[0m   [30;43mLines:  66.00% ( 66/100)[0m
Api\Support\Pagination\CursorCodec
  [37;41mMethods:   0.00% ( 0/ 3)[0m   [30;43mLines:  77.42% ( 24/ 31)[0m
Api\Support\Repository\BaseRepository
  [30;43mMethods:  71.43% ( 5/ 7)[0m   [30;43mLines:  88.24% ( 15/ 17)[0m
Api\Support\Validation\BoTable
  [30;42mMethods: 100.00% ( 1/ 1)[0m   [30;42mLines: 100.00% (  4/  4)[0m
Service coverage: 80.75% (6165/7635 statements across 191 files)
[plugin-isolation] scanning /Users/neojins/workspace/gnuboard5/php/api/plugins
[plugin-isolation] passed
```

#### stderr tail
```text
> ./scripts/run_quality_gates.sh
> python3 ./scripts/extract_admin_schema.py --mode check
> python3 ./scripts/generate_openapi_contract_manifest.py --mode check
No security vulnerability advisories found.
> ./vendor/bin/phpstan analyse api/ --level=8 --memory-limit=512M
Note: Using configuration file /Users/neojins/workspace/gnuboard5/php/phpstan.neon.
   0/639 [░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0%[1G[2K 639/639 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%
> ./scripts/run_phpunit_coverage.sh --coverage-clover build/coverage/clover.xml --coverage-text --colors=always
> ./scripts/check_plugin_isolation.sh
```

### API blackbox contract suite

- 상태: ✅ 통과
- 실행 위치: `.`
- 명령: `composer run test:api:blackbox`
- 소요 시간: `299ms`

#### stdout tail
```text
[blackbox] health endpoint status=503
[blackbox] health endpoint degraded 503 is allowed for infrastructure availability checks.
[blackbox] running Hurl suite without health check
[blackbox] target origin: https://gnurestapi.cc
[blackbox] running Hurl suite
[hurl] running 2 files against https://gnurestapi.cc (profile=smoke)
[blackbox] health endpoint is unavailable; skipping Schemathesis suite
[blackbox] completed
```

#### stderr tail
```text
> ./scripts/run_api_contract_bombing.sh
Success tests/hurl/02-swagger-ui.hurl (1 request(s) in 10 ms)
Success tests/hurl/03-openapi.hurl (1 request(s) in 38 ms)
--------------------------------------------------------------------------------
Executed files:    2
Executed requests: 2 (51.3/s)
Succeeded files:   2 (100.0%)
Failed files:      0 (0.0%)
Duration:          39 ms (0h:0m:0s:39ms)
```

### PHP + Rust integrated audit

- 상태: ✅ 통과
- 실행 위치: `.`
- 명령: `composer run audit:integrated`
- 소요 시간: `20366ms`

#### stdout tail
```text
Integrated audit report written: /Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.json
Integrated audit report written: /Users/neojins/workspace/gnuboard5/output/integrated-audit/latest.md
```

#### stderr tail
```text
> ./scripts/run_integrated_audit.sh
```
