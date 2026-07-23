<?php

/**
 * PHP OpenAPI 공급자 감사가 기본 품질 게이트에 연결됐는지 검증합니다.
 *
 * @package  Tests\Contract
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

final class OpenApiProviderAuditWiringTest extends TestCase
{
    public function testQualityGateRunsEveryProviderContractLayerFailClosed(): void
    {
        $script = file_get_contents(dirname(__DIR__, 2) . '/scripts/run_quality_gates.sh');

        self::assertIsString($script);
        self::assertStringContainsString(
            'composer run audit:openapi-provider || provider_contract_status=1',
            $script
        );
        self::assertStringContainsString(
            'composer run audit:runtime-routes || provider_contract_status=1',
            $script
        );
        self::assertStringContainsString(
            'composer run audit:openapi-field-bindings || provider_contract_status=1',
            $script
        );
        $composer = file_get_contents(dirname(__DIR__, 2) . '/composer.json');
        self::assertIsString($composer);
        self::assertStringContainsString(
            'openapi.phase1-consumer-scope.json',
            $composer
        );
        self::assertStringContainsString(
            './scripts/docs-check.sh || provider_contract_status=1',
            $script
        );
        self::assertStringContainsString('exit "$provider_contract_status"', $script);
    }
}
