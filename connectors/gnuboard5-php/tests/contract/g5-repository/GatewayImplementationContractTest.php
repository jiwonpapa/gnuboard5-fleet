<?php

declare(strict_types=1);

namespace Tests\Contract\G5Repository;

use Api\Auth\Repository\AuthRepository;
use Api\Auth\Service\AuthAvailabilityService;
use Api\Auth\Service\AuthRecoveryService;
use Api\Auth\Service\AuthRegistrationService;
use Api\Auth\Service\AuthService;
use Api\Auth\Service\AuthSessionService;
use Api\Auth\Contracts\AuthIdentityGateway as LocalAuthIdentityGateway;
use Api\Auth\Contracts\AuthRecoveryGateway as LocalAuthRecoveryGateway;
use Api\Auth\Contracts\AuthGateway as LocalAuthGateway;
use Api\Auth\Contracts\AuthRegistrationGateway as LocalAuthRegistrationGateway;
use Api\Auth\Contracts\AuthSessionGateway as LocalAuthSessionGateway;
use Api\Admin\Point\Service\AdminPointService;
use Api\Admin\Poll\Service\AdminPollVoteService;
use Api\Board\Repository\BoardRepository;
use Api\Board\Service\BoardService;
use Api\Comment\Contracts\CommentGateway as LocalCommentGateway;
use Api\Comment\Repository\CommentRepository;
use Api\Comment\Service\CommentService;
use Api\File\Contracts\FileGateway as LocalFileGateway;
use Api\File\Repository\FileRepository;
use Api\File\Service\FileService;
use Api\Integration\Contracts\AuthGateway;
use Api\Integration\Contracts\AuthIdentityGateway as SharedAuthIdentityGateway;
use Api\Integration\Contracts\AuthRecoveryGateway as SharedAuthRecoveryGateway;
use Api\Integration\Contracts\AuthSessionGateway as SharedAuthSessionGateway;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\CommentGateway;
use Api\Integration\Contracts\FileGateway;
use Api\Integration\Contracts\LikeGateway;
use Api\Integration\Contracts\MemoGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Integration\Contracts\MenuGateway;
use Api\Integration\Contracts\PointGateway;
use Api\Integration\Contracts\PointQueryGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Integration\Contracts\PostGateway;
use Api\Integration\Contracts\PostReadGateway as SharedPostReadGateway;
use Api\Integration\Contracts\PostWriteGateway as SharedPostWriteGateway;
use Api\Integration\Contracts\QaGateway;
use Api\Like\Contracts\LikeGateway as LocalLikeGateway;
use Api\Like\Repository\LikeRepository;
use Api\Like\Service\LikeService;
use Api\Memo\Contracts\MemoGateway as LocalMemoGateway;
use Api\Memo\Repository\MemoRepository;
use Api\Memo\Service\MemoService;
use Api\Member\Repository\MemberRepository;
use Api\Member\Service\MemberProfileUpdateService;
use Api\Member\Service\MemberService;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Api\Menu\Contracts\MenuGateway as LocalMenuGateway;
use Api\Menu\Repository\MenuRepository;
use Api\Menu\Service\MenuService;
use Api\Point\Contracts\PointMaintenanceGateway as LocalPointMaintenanceGateway;
use Api\Point\Contracts\PointGateway as LocalPointGateway;
use Api\Point\Contracts\PointQueryGateway as LocalPointQueryGateway;
use Api\Point\Contracts\PointRewardGateway as LocalPointRewardGateway;
use Api\Point\Repository\PointRepository;
use Api\Point\Service\PointService;
use Api\Post\Contracts\PostGateway as LocalPostGateway;
use Api\Post\Contracts\PostReadGateway as LocalPostReadGateway;
use Api\Post\Contracts\PostWriteGateway as LocalPostWriteGateway;
use Api\Post\Repository\PostRepository;
use Api\Post\Service\PostService;
use Api\Qa\Contracts\QaGateway as LocalQaGateway;
use Api\Qa\Repository\QaRepository;
use Api\Qa\Service\QaService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionNamedType;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

final class GatewayImplementationContractTest extends TestCase
{
    #[DataProvider('gatewayMapProvider')]
    public function testRepositoryImplementsDeclaredGateway(string $repositoryClass, string $gatewayInterface): void
    {
        $this->assertTrue(
            is_subclass_of($repositoryClass, $gatewayInterface),
            $repositoryClass . ' must implement ' . $gatewayInterface
        );
    }

    /**
     * @return array<int, array{string, string}>
     */
    public static function gatewayMapProvider(): array
    {
        return [
            [AuthRepository::class, AuthGateway::class],
            [AuthRepository::class, SharedAuthIdentityGateway::class],
            [AuthRepository::class, SharedAuthSessionGateway::class],
            [AuthRepository::class, SharedAuthRecoveryGateway::class],
            [AuthRepository::class, LocalAuthIdentityGateway::class],
            [AuthRepository::class, LocalAuthRegistrationGateway::class],
            [AuthRepository::class, LocalAuthSessionGateway::class],
            [AuthRepository::class, LocalAuthRecoveryGateway::class],
            [AuthRepository::class, LocalAuthGateway::class],
            [BoardRepository::class, BoardGateway::class],
            [PostRepository::class, PostGateway::class],
            [PostRepository::class, SharedPostReadGateway::class],
            [PostRepository::class, SharedPostWriteGateway::class],
            [PostRepository::class, LocalPostReadGateway::class],
            [PostRepository::class, LocalPostWriteGateway::class],
            [PostRepository::class, LocalPostGateway::class],
            [CommentRepository::class, CommentGateway::class],
            [CommentRepository::class, LocalCommentGateway::class],
            [FileRepository::class, FileGateway::class],
            [FileRepository::class, LocalFileGateway::class],
            [LikeRepository::class, LikeGateway::class],
            [LikeRepository::class, LocalLikeGateway::class],
            [MemoRepository::class, MemoGateway::class],
            [MemoRepository::class, LocalMemoGateway::class],
            [MemberRepository::class, MemberGateway::class],
            [MenuRepository::class, MenuGateway::class],
            [MenuRepository::class, LocalMenuGateway::class],
            [PointRepository::class, PointGateway::class],
            [PointRepository::class, PointQueryGateway::class],
            [PointRepository::class, LocalPointQueryGateway::class],
            [PointRepository::class, LocalPointRewardGateway::class],
            [PointRepository::class, LocalPointMaintenanceGateway::class],
            [PointRepository::class, LocalPointGateway::class],
            [QaRepository::class, QaGateway::class],
            [QaRepository::class, LocalQaGateway::class],
        ];
    }

    #[DataProvider('constructorContractProvider')]
    public function testServiceAndMiddlewareConstructorsDependOnContracts(
        string $className,
        int $parameterIndex,
        string $expectedType
    ): void {
        $reflection = new ReflectionClass($className);
        $constructor = $reflection->getConstructor();
        $this->assertNotNull($constructor, $className . ' constructor must exist.');

        $parameters = $constructor->getParameters();
        $this->assertArrayHasKey(
            $parameterIndex,
            $parameters,
            $className . ' constructor parameter index not found: ' . (string)$parameterIndex
        );

        $type = $parameters[$parameterIndex]->getType();
        $this->assertInstanceOf(ReflectionNamedType::class, $type);
        $this->assertSame($expectedType, $type->getName());
    }

    /**
     * @return array<int, array{string, int, string}>
     */
    public static function constructorContractProvider(): array
    {
        return [
            [AuthService::class, 0, LocalAuthGateway::class],
            [AuthAvailabilityService::class, 0, LocalAuthIdentityGateway::class],
            [AuthAvailabilityService::class, 1, LocalAuthRegistrationGateway::class],
            [AuthRegistrationService::class, 0, LocalAuthIdentityGateway::class],
            [AuthRegistrationService::class, 1, LocalAuthRegistrationGateway::class],
            [AuthRegistrationService::class, 2, LocalAuthRecoveryGateway::class],
            [AuthRegistrationService::class, 4, PointRewardGateway::class],
            [AuthRecoveryService::class, 0, LocalAuthIdentityGateway::class],
            [AuthRecoveryService::class, 1, LocalAuthRecoveryGateway::class],
            [AuthSessionService::class, 0, LocalAuthIdentityGateway::class],
            [AuthSessionService::class, 1, LocalAuthSessionGateway::class],
            [AuthSessionService::class, 3, PointMaintenanceGateway::class],
            [BoardService::class, 0, BoardGateway::class],
            [PostService::class, 0, LocalPostGateway::class],
            [PostService::class, 2, BoardGateway::class],
            [AdminPointService::class, 1, PointQueryGateway::class],
            [AdminPointService::class, 2, PointRewardGateway::class],
            [AdminPointService::class, 3, PointMaintenanceGateway::class],
            [AdminPollVoteService::class, 1, PointRewardGateway::class],
            [CommentService::class, 0, LocalCommentGateway::class],
            [CommentService::class, 1, SharedPostReadGateway::class],
            [FileService::class, 0, LocalFileGateway::class],
            [FileService::class, 2, SharedPostReadGateway::class],
            [LikeService::class, 0, LocalLikeGateway::class],
            [MemoService::class, 0, LocalMemoGateway::class],
            [MemoService::class, 1, PointRewardGateway::class],
            [MemberService::class, 0, MemberGateway::class],
            [MemberService::class, 1, SharedAuthIdentityGateway::class],
            [MemberProfileUpdateService::class, 1, SharedAuthRecoveryGateway::class],
            [MenuService::class, 0, LocalMenuGateway::class],
            [PointService::class, 0, LocalPointQueryGateway::class],
            [QaService::class, 0, LocalQaGateway::class],
            [JwtAuthMiddleware::class, 1, SharedAuthIdentityGateway::class],
            [JwtAuthMiddleware::class, 2, SharedAuthSessionGateway::class],
            [OptionalJwtAuthMiddleware::class, 1, SharedAuthIdentityGateway::class],
            [OptionalJwtAuthMiddleware::class, 2, SharedAuthSessionGateway::class],
        ];
    }

    public function testServiceAndControllerLayersDoNotUseLegacyG5FunctionCalls(): void
    {
        $root = dirname(__DIR__, 3) . '/api/v1';
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root));

        $violations = [];
        $legacyPattern = '/\b(sql_query|sql_fetch|sql_fetch_array|get_member|insert_point)\s*\(/';

        foreach ($iterator as $entry) {
            if (!$entry->isFile() || $entry->getExtension() !== 'php') {
                continue;
            }

            $path = str_replace('\\', '/', $entry->getPathname());
            $isTargetLayer = str_contains($path, '/Service/')
                || str_contains($path, '/Controller/')
                || str_contains($path, '/Middlewares/');

            if (!$isTargetLayer) {
                continue;
            }

            $contents = file_get_contents($entry->getPathname());
            if (!is_string($contents)) {
                continue;
            }

            if (preg_match($legacyPattern, $contents) === 1) {
                $violations[] = $path . ' has legacy function call';
            }

            if (str_contains($contents, 'common.php')) {
                $violations[] = $path . ' references common.php';
            }
        }

        $this->assertSame([], $violations, implode("\n", $violations));
    }

    public function testAdminRouteGroupRequiresJwtAndAdminGuardMiddleware(): void
    {
        $routesPath = dirname(__DIR__, 3) . '/api/routes.php';
        $contents = file_get_contents($routesPath);
        $this->assertIsString($contents);

        $this->assertStringContainsString("})->add(\$createAdminGuardMiddleware())->add(\$createJwtAuthMiddleware());", $contents);
    }

    public function testLocalOnlyGatewayCompatibilityNamespaceDoesNotLeakIntoDomainUsage(): void
    {
        $contracts = $this->loadGatewayUsageContracts('local_only_compat_contracts');

        $this->assertGatewayUsageAllowlist($contracts, 'deprecated');
    }

    public function testSharedGatewayUsageMatchesDocumentedInventoryAllowlist(): void
    {
        $contracts = $this->loadGatewayUsageContracts('shared_inventory_contracts');

        $this->assertGatewayUsageAllowlist($contracts, 'shared inventory');
    }

    /**
     * @param array<string, array{domain: string, allowed?: list<string>, prefixes?: list<string>}> $contracts
     */
    private function assertGatewayUsageAllowlist(array $contracts, string $label): void
    {
        $root = dirname(__DIR__, 3);
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root));
        $violations = [];

        foreach ($iterator as $entry) {
            if (!$entry->isFile() || $entry->getExtension() !== 'php') {
                continue;
            }

            $path = str_replace('\\', '/', $entry->getPathname());
            if (!str_contains($path, '/api/v1/') && !str_contains($path, '/tests/')) {
                continue;
            }

            $relativePath = str_replace('\\', '/', substr($path, strlen($root)));
            $contents = file_get_contents($entry->getPathname());
            if (!is_string($contents)) {
                continue;
            }

            foreach ($contracts as $fqcn => $meta) {
                if (!str_contains($contents, $fqcn) || $this->isAllowedGatewayUsage($relativePath, $meta)) {
                    continue;
                }

                $violations[] = sprintf(
                    '%s leaks %s usage for %s domain outside %s allowlist',
                    $relativePath,
                    $fqcn,
                    $meta['domain'],
                    $label
                );
            }
        }

        $this->assertSame([], $violations, implode("\n", $violations));
    }

    /**
     * @param array{domain: string, allowed?: list<string>, prefixes?: list<string>} $meta
     */
    private function isAllowedGatewayUsage(string $relativePath, array $meta): bool
    {
        foreach ($meta['allowed'] ?? [] as $suffix) {
            if (str_ends_with($relativePath, $suffix)) {
                return true;
            }
        }

        foreach ($meta['prefixes'] ?? [] as $prefix) {
            if (str_starts_with($relativePath, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, array{domain: string, allowed?: list<string>, prefixes?: list<string>}>
     */
    private function loadGatewayUsageContracts(string $section): array
    {
        $path = dirname(__DIR__, 3) . '/docs/architecture/GATEWAY_USAGE_RULES.json';
        $contents = file_get_contents($path);
        if (!is_string($contents)) {
            throw new RuntimeException('Unable to read gateway usage registry.');
        }

        $document = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($document) || ($document['schema_version'] ?? null) !== 1) {
            throw new RuntimeException('Invalid gateway usage registry schema version.');
        }

        $rules = $document[$section] ?? null;
        if (!is_array($rules)) {
            throw new RuntimeException(sprintf('Missing gateway usage registry section: %s', $section));
        }

        return $rules;
    }
}
