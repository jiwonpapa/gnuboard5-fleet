# 표준 감사 보고서 — 2026-07-15

> **기준 시점**: 2026-07-15 12:15 KST
> **범위**: 변경 경로 66건: `api/docs/openapi.contract-manifest.json`, `api/docs/openapi.yaml`, `api/v1/Admin/Poll/Repository/AdminPollQueryRepository.php`, `api/v1/Admin/Poll/Service/AdminPollManageService.php`, `api/v1/Admin/Poll/Service/AdminPollResultService.php`, `api/v1/Admin/Poll/Service/AdminPollVoteService.php`, `api/v1/Admin/Poll/Service/Support/AdminPollInputNormalizer.php`, `api/v1/Admin/Poll/Service/Support/AdminPollVoteInputNormalizer.php`, `api/v1/Admin/Popular/Service/AdminPopularService.php`, `api/v1/Admin/Push/Service/AdminPushService.php`, `api/v1/Admin/Report/Service/AdminReportService.php`, `api/v1/Admin/Schema/Service/AdminSchemaService.php`, 외 54건

## 결론

**🟢 통과**

- `quality-gate`는 실행되었습니다.
- `blackbox`는 생략되었습니다.
- `integrated audit`는 생략되었습니다.

## Failure
- none

## Note
- 실행 체크 수: `1`
- 감지된 변경 경로 수: `66`
- `AUDIT_LATEST.md`는 같은 날짜의 최신 표준 감사본과 자동 동기화됩니다.
- `docs/DOCUMENT_REGISTRY.md`와 `docs/docs.db`는 보고서 작성 뒤 자동 갱신됩니다.

## Evidence
- `quality_gate` status=`passed` cwd=`.` command=`composer run quality-gate`

## 실행 체크 결과

### Implementation quality gate

- 상태: ✅ 통과
- 실행 위치: `.`
- 명령: `composer run quality-gate`
- 소요 시간: `95315ms`

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
Service coverage: 82.15% (7341/8936 statements across 215 files)
[plugin-isolation] scanning /Users/neojins/workspace/gnuboard5/php/api/plugins
[plugin-isolation] passed
```

#### stderr tail
```text
> ./scripts/run_quality_gates.sh
> python3 ./scripts/extract_admin_schema.py --mode check
> python3 ./scripts/generate_openapi_contract_manifest.py --mode check
> python3 ./scripts/check_openapi_provider_contract.py --consumer-scope ./api/docs/openapi.phase1-consumer-scope.json --output-json ./output/openapi-provider-audit/latest.json --output-md ./output/openapi-provider-audit/latest.md
> php ./scripts/extract_runtime_route_graph.php --consumer-scope ./api/docs/openapi.phase1-consumer-scope.json --output ./output/openapi-provider-audit/runtime-route-graph.json
> php ./scripts/check_openapi_field_bindings.php
No security vulnerability advisories found.
> ./vendor/bin/phpstan analyse api/ --level=8 --memory-limit=512M
Note: Using configuration file /Users/neojins/workspace/gnuboard5/php/phpstan.neon.
   0/679 [░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0%[1G[2K 679/679 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%
> ./scripts/run_phpunit_coverage.sh --coverage-clover build/coverage/clover.xml --coverage-text --colors=always
> ./scripts/check_plugin_isolation.sh
```
