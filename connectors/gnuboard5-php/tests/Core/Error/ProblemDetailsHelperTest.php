<?php

declare(strict_types=1);

namespace Tests\Core\Error;

use Api\Core\Error\ProblemDetailsHelper;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ProblemDetailsHelperTest extends TestCase
{
    public function testClassifyDetectsStorageErrors(): void
    {
        $result = ProblemDetailsHelper::classify(
            new RuntimeException('file_put_contents(/tmp/test): Failed to open stream: Permission denied'),
            500
        );

        $this->assertSame('server.storage_error', $result['error_code']);
        $this->assertSame('storage', $result['error_category']);
        $this->assertSame('storage', $result['fault_domain']);
        $this->assertSame('storage', $result['owner']);
        $this->assertSame('파일 저장소 처리 중 오류가 발생했습니다.', $result['guide']['reason']);
    }

    public function testClassifyDetectsBootstrapErrors(): void
    {
        $result = ProblemDetailsHelper::classify(
            new RuntimeException('Composer autoload not found.'),
            503,
            '/errors/bootstrap'
        );

        $this->assertSame('server.service_unavailable', $result['error_code']);
        $this->assertSame('server', $result['error_category']);
    }

    public function testBuildMetaIncludesOperationalFields(): void
    {
        $classification = ProblemDetailsHelper::classify(new RuntimeException('boom'), 500);
        $meta = ProblemDetailsHelper::buildMeta('corr-1', 'srv-1', $classification);

        $this->assertSame('corr-1', $meta['request_id']);
        $this->assertSame('corr-1', $meta['correlation_id']);
        $this->assertSame('srv-1', $meta['server_request_id']);
        $this->assertSame('server.runtime_error', $meta['error_code']);
        $this->assertSame('server', $meta['error_category']);
        $this->assertSame('server_runtime', $meta['fault_domain']);
        $this->assertSame('php_api', $meta['owner']);
        $this->assertFalse($meta['retryable']);
        $this->assertFalse($meta['user_actionable']);
        $this->assertArrayHasKey('server_time', $meta);
        $this->assertArrayHasKey('version', $meta);
    }
}
