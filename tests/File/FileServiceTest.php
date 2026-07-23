<?php

declare(strict_types=1);

namespace Api\File\Repository {
    if (!function_exists(__NAMESPACE__ . '\\sql_real_escape_string')) {
        function sql_real_escape_string(string $value): string
        {
            return \Tests\Support\DbStub::realEscape($value);
        }
    }
}

namespace {
    if (!function_exists('sql_query')) {
        function sql_query(string $query, bool $isCache = false): mixed
        {
            return \Tests\Support\DbStub::query($query, $isCache);
        }
    }

    if (!function_exists('sql_fetch')) {
        function sql_fetch(string $query): mixed
        {
            return \Tests\Support\DbStub::fetch($query);
        }
    }

    if (!function_exists('sql_fetch_array')) {
        function sql_fetch_array(mixed $result): mixed
        {
            return \Tests\Support\DbStub::fetchArray($result);
        }
    }

    if (!function_exists('sql_real_escape_string')) {
        function sql_real_escape_string(string $value): string
        {
            return addslashes($value);
        }
    }
}

namespace Tests\File {
    use Api\Board\Repository\BoardRepository;
    use Api\Board\Service\BoardService;
    use Api\Core\Config\EnvConfig;
    use Api\File\Contracts\FileGateway;
    use Api\File\Service\FileDeleteService;
    use Api\File\Service\FileReadService;
    use Api\File\Service\FileService;
    use Api\File\Service\FileUploadService;
    use Api\Integration\Contracts\PostReadGateway;
    use Api\Support\Exception\ApiException;
    use PHPUnit\Framework\TestCase;
    use ReflectionMethod;

    final class FileServiceTest extends TestCase
    {
        public function testNormalizeWrIdAllowsZeroForTemporaryUpload(): void
        {
            $service = $this->createFileService();

            $method = $this->reflectPrivateMethod(FileService::class, 'normalizeWrId');

            $this->assertSame(0, $method->invoke($service, null));
            $this->assertSame(0, $method->invoke($service, '0'));
            $this->assertSame(123, $method->invoke($service, '123'));
        }

        public function testNormalizeWrIdRejectsNegativeOrInvalidValue(): void
        {
            $service = $this->createFileService();
            $method = $this->reflectPrivateMethod(FileService::class, 'normalizeWrId');

            $this->expectException(ApiException::class);
            $this->expectExceptionMessage('wr_id는 0 이상의 정수여야 합니다.');
            $method->invoke($service, '-1');
        }

        public function testNormalizeWrIdRejectsNonNumericValue(): void
        {
            $service = $this->createFileService();
            $method = $this->reflectPrivateMethod(FileService::class, 'normalizeWrId');

            $this->expectException(ApiException::class);
            $this->expectExceptionMessage('wr_id는 0 이상의 정수여야 합니다.');
            $method->invoke($service, 'abc');
        }

        public function testExecutableExtensionsAreBlockedBySuffix(): void
        {
            $service = $this->createFileService();
            $method = $this->reflectPrivateMethod(FileService::class, 'sanitizeExecutableExtensions');

            $this->assertSame('safe.php-x', $method->invoke($service, 'safe.php'));
            $this->assertSame('safe.phtm-x', $method->invoke($service, 'safe.phtm'));
            $this->assertSame('image.jpg', $method->invoke($service, 'image.jpg'));
        }

        private function createFileService(): FileService
        {
            $boardService = new BoardService(new BoardRepository());
            $postRepository = $this->createMock(PostReadGateway::class);
            $fileRepository = $this->createMock(FileGateway::class);
            $envConfig = EnvConfig::fromEnv();

            return new FileService(
                $fileRepository,
                $boardService,
                $postRepository,
                new FileUploadService($fileRepository, $boardService, $postRepository, $envConfig),
                new FileReadService($fileRepository, $boardService, $postRepository, $envConfig),
                new FileDeleteService($fileRepository, $boardService, $postRepository, $envConfig),
                $envConfig
            );
        }

        private function reflectPrivateMethod(string $class, string $method): ReflectionMethod
        {
            $methodRef = new ReflectionMethod($class, $method);

            return $methodRef;
        }
    }
}
