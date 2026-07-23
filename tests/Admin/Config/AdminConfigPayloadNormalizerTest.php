<?php

declare(strict_types=1);

namespace Tests\Admin\Config;

use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Admin\Config\Support\AdminConfigPayloadNormalizer;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AdminConfigPayloadNormalizerTest extends TestCase
{
    public function testRejectsUnknownFieldInsteadOfSilentlyDroppingIt(): void
    {
        $normalizer = new AdminConfigPayloadNormalizer($this->repository());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        $normalizer->normalize([
            'cf_title' => '그누보드',
            'unknown' => 'drop-me',
        ]);
    }

    public function testNormalizesCanonicalInputTypes(): void
    {
        $normalizer = new AdminConfigPayloadNormalizer($this->repository());

        self::assertSame(
            [
                'cf_title' => '그누보드',
                'cf_use_point' => 1,
                'cf_comment_point' => -10,
                'cf_social_servicelist' => 'naver,kakao',
                'cf_icode_server_port' => 7295,
            ],
            $normalizer->normalize([
                'cf_title' => ' 그누보드 ',
                'cf_use_point' => 'on',
                'cf_comment_point' => '-10',
                'cf_social_servicelist' => ['naver', 'kakao', 'naver', 'invalid'],
                'cf_icode_server_port' => '7a2-95',
            ])
        );
    }

    #[DataProvider('invalidScalarProvider')]
    public function testRejectsValuesOutsideDeclaredInputVariants(string $field, mixed $value): void
    {
        $normalizer = new AdminConfigPayloadNormalizer($this->repository());

        $this->expectException(ApiException::class);
        $normalizer->normalize([$field => $value]);
    }

    /** @return iterable<string,array{string,mixed}> */
    public static function invalidScalarProvider(): iterable
    {
        yield 'flag float' => ['cf_use_point', 1.0];
        yield 'integer float' => ['cf_comment_point', 1.5];
        yield 'text integer' => ['cf_title', 123];
        yield 'email array' => ['cf_admin_email', ['admin@example.com']];
    }

    private function repository(): AdminConfigRepository
    {
        return new AdminConfigRepository(
            $this->createMock(QueryBuilder::class),
            new TableRegistry('g5_')
        );
    }
}
