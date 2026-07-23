<?php

declare(strict_types=1);

namespace Tests\Qa;

use Api\Qa\Contracts\QaGateway;
use Api\Qa\Service\QaAttachmentService;
use Api\Qa\Service\QaAttachmentStorage;
use Api\Qa\Service\QaInputService;
use Api\Qa\Service\QaMutationService;
use Api\Qa\Service\QaReadService;
use Api\Qa\Service\QaWriteService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class QaWorkflowServiceTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];
    private string $tempRoot = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempRoot = sys_get_temp_dir() . '/g5-api-qa-workflow-' . uniqid('', true);
        mkdir($this->tempRoot, 0775, true);
        $this->setEnv('DATA_PATH', $this->tempRoot);
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->tempRoot);
        foreach ($this->envBackup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }
        $this->envBackup = [];
        parent::tearDown();
    }

    public function testReadServiceListBuildsPaginationAndFilters(): void
    {
        $gateway = new QaGatewayStub();
        $gateway->listResult = [
            'items' => [['qa_id' => 1]],
            'total' => 23,
        ];

        $service = $this->createReadService($gateway);
        $result = $service->list(
            ['mb_id' => 'user1', 'mb_level' => 2],
            ['page' => '2', 'per_page' => '200', 'category' => '회원', 'search_field' => 'qa_subject', 'search' => '문의']
        );

        $this->assertSame(['user1', false, 2, 100, '회원', 'qa_subject', '문의'], $gateway->lastListArgs);
        $this->assertSame(23, $result['pagination']['total']);
        $this->assertSame(2, $result['pagination']['page']);
        $this->assertSame(100, $result['pagination']['per_page']);
        $this->assertSame(1, $result['pagination']['last_page']);
        $this->assertFalse($result['pagination']['has_next']);
        $this->assertTrue($result['pagination']['has_prev']);
    }

    public function testReadServiceDetailAndDownloadFailuresAreReported(): void
    {
        $gateway = new QaGatewayStub();
        $service = $this->createReadService($gateway);

        try {
            $service->detail(['mb_id' => 'user1', 'mb_level' => 2], 99);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('문의글을 찾을 수 없습니다.', $exception->getMessage());
        }

        try {
            $service->getDownloadPayload(10, 3, ['mb_id' => 'user1', 'mb_level' => 2]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('file no는 1 또는 2만 허용됩니다.', $exception->getMessage());
        }

        $gateway->downloadFiles[10][1] = ['path' => $this->tempRoot . '/missing.txt'];

        try {
            $service->getDownloadPayload(10, 1, ['mb_id' => 'user1', 'mb_level' => 2]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('파일이 존재하지 않습니다.', $exception->getMessage());
        }
    }

    public function testWriteServiceCreateQuestionAndAnswerPersistNormalizedPayload(): void
    {
        $gateway = new QaGatewayStub();
        $gateway->config['qa_req_email'] = 1;
        $gateway->qaRows[701] = [
            'qa_id' => 701,
            'qa_related' => 701,
            'qa_type' => 0,
            'qa_category' => '회원',
            'mb_id' => 'admin',
        ];

        $writeService = $this->createWriteService($gateway);

        $question = $writeService->createQuestion(
            ['mb_id' => 'user1', 'mb_nick' => '닉네임', 'mb_level' => 2],
            [
                'qa_category' => '회원',
                'qa_email' => ' user1@example.com ',
                'qa_hp' => '010-1234-5678',
                'qa_subject' => ' 문의 제목 ',
                'qa_content' => ' 문의 내용 ',
                'qa_email_recv' => 'yes',
                'qa_sms_recv' => true,
                'qa_html' => 1,
            ],
            [],
            '127.0.0.1'
        );

        $this->assertSame('user1@example.com', $gateway->lastCreatedQuestion['qa_email'] ?? null);
        $this->assertSame('010-1234-5678', $gateway->lastCreatedQuestion['qa_hp'] ?? null);
        $this->assertSame(1, $gateway->lastCreatedQuestion['qa_email_recv'] ?? null);
        $this->assertSame(1, $gateway->lastCreatedQuestion['qa_sms_recv'] ?? null);
        $this->assertSame(1, $gateway->lastCreatedQuestion['qa_html'] ?? null);
        $this->assertSame('닉네임', $gateway->lastCreatedQuestion['qa_name'] ?? null);
        $this->assertSame('문의 제목', $question['qa_subject'] ?? null);

        $answer = $writeService->createAnswer(
            701,
            ['mb_id' => 'admin', 'mb_level' => 10, 'mb_name' => '관리자'],
            [
                'qa_email' => 'admin@example.com',
                'qa_subject' => ' 답변 제목 ',
                'qa_content' => ' 답변 내용 ',
                'qa_html' => 'on',
            ],
            [],
            '127.0.0.1'
        );

        $this->assertSame(701, $gateway->lastCreatedAnswerParentId);
        $this->assertSame('회원', $gateway->lastCreatedAnswer['qa_category'] ?? null);
        $this->assertSame(1, $gateway->lastCreatedAnswer['qa_html'] ?? null);
        $this->assertSame('답변 제목', $answer['qa_subject'] ?? null);
    }

    public function testWriteServiceRejectsAnsweredParentAndInvalidRelatedBase(): void
    {
        $gateway = new QaGatewayStub();
        $gateway->qaRows[10] = [
            'qa_id' => 10,
            'qa_type' => 1,
            'qa_related' => 10,
            'qa_category' => '회원',
            'mb_id' => 'admin',
        ];
        $gateway->qaRows[20] = [
            'qa_id' => 0,
            'qa_related' => 0,
            'qa_type' => 0,
            'qa_category' => '회원',
            'mb_id' => 'user1',
        ];

        $writeService = $this->createWriteService($gateway);

        try {
            $writeService->createAnswer(
                10,
                ['mb_id' => 'admin', 'mb_level' => 10],
                ['qa_subject' => '답변', 'qa_content' => '내용'],
                [],
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('답변글에는 다시 답변을 등록할 수 없습니다.', $exception->getMessage());
        }

        try {
            $writeService->createRelatedQuestion(
                20,
                ['mb_id' => 'user1', 'mb_level' => 2],
                ['qa_category' => '회원', 'qa_subject' => '제목', 'qa_content' => '내용'],
                [],
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('연관 질문 기준값이 유효하지 않습니다.', $exception->getMessage());
        }
    }

    public function testWriteServiceCreateRelatedQuestionUsesOriginRelatedId(): void
    {
        $gateway = new QaGatewayStub();
        $gateway->qaRows[30] = [
            'qa_id' => 30,
            'qa_related' => 15,
            'qa_type' => 0,
            'qa_category' => '포인트',
            'mb_id' => 'user1',
        ];

        $writeService = $this->createWriteService($gateway);
        $related = $writeService->createRelatedQuestion(
            30,
            ['mb_id' => 'user1', 'mb_level' => 2, 'mb_name' => '사용자'],
            ['qa_category' => '포인트', 'qa_subject' => '추가 문의', 'qa_content' => '상세 내용'],
            [],
            '127.0.0.1'
        );

        $this->assertSame(15, $gateway->lastCreatedRelatedParentId);
        $this->assertSame('포인트', $gateway->lastCreatedRelated['qa_category'] ?? null);
        $this->assertSame('추가 문의', $related['qa_subject'] ?? null);
    }

    public function testMutationServiceUpdatesQuestionDeletesAttachmentAndDelegatesDelete(): void
    {
        $storage = new QaAttachmentStorage();
        $qaDir = $storage->qaStorageDir();
        file_put_contents($qaDir . '/old.txt', 'old');

        $gateway = new QaGatewayStub();
        $gateway->config['qa_req_email'] = 1;
        $gateway->qaRows[50] = [
            'qa_id' => 50,
            'qa_related' => 50,
            'qa_type' => 0,
            'qa_status' => 0,
            'qa_category' => '회원',
            'qa_email' => 'saved@example.com',
            'qa_file1' => 'old.txt',
            'qa_source1' => 'old.txt',
            'qa_file2' => '',
            'qa_source2' => '',
            'mb_id' => 'user1',
        ];

        $mutationService = $this->createMutationService($gateway);
        $updated = $mutationService->updateQuestion(
            50,
            ['mb_id' => 'user1', 'mb_level' => 2],
            [
                'bf_file_del' => ['1' => 'yes'],
                'qa_category' => '회원',
                'qa_subject' => '수정 제목',
                'qa_content' => '수정 내용',
                'qa_html' => true,
                'qa_sms_recv' => 'yes',
            ],
            [],
            '127.0.0.1'
        );

        $this->assertSame(50, $gateway->lastUpdatedQaId);
        $this->assertSame('saved@example.com', $gateway->lastUpdatedData['qa_email'] ?? null);
        $this->assertSame('', $gateway->lastUpdatedData['qa_file1'] ?? null);
        $this->assertSame('', $gateway->lastUpdatedData['qa_source1'] ?? null);
        $this->assertSame(1, $gateway->lastUpdatedData['qa_html'] ?? null);
        $this->assertSame(1, $gateway->lastUpdatedData['qa_sms_recv'] ?? null);
        $this->assertSame('수정 제목', $updated['qa_subject'] ?? null);
        $this->assertFileDoesNotExist($qaDir . '/old.txt');

        $mutationService->deleteQuestion(50, ['mb_id' => 'user1', 'mb_level' => 2]);

        $this->assertSame([50, 'user1', false], $gateway->lastDeleteArgs);
    }

    public function testMutationServiceRejectsMissingQuestionAndInvalidBulkDeletePayload(): void
    {
        $gateway = new QaGatewayStub();
        $mutationService = $this->createMutationService($gateway);

        try {
            $mutationService->updateQuestion(
                404,
                ['mb_id' => 'user1', 'mb_level' => 2],
                ['qa_subject' => '수정', 'qa_content' => '내용'],
                [],
                '127.0.0.1'
            );
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('문의글을 찾을 수 없습니다.', $exception->getMessage());
        }

        try {
            $mutationService->bulkDelete(['mb_id' => 'admin', 'mb_level' => 10], ['x', 0]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('qa_ids에는 1개 이상의 유효한 qa_id가 필요합니다.', $exception->getMessage());
        }
    }

    private function createReadService(QaGateway $gateway): QaReadService
    {
        return new QaReadService($gateway, new QaInputService());
    }

    private function createWriteService(QaGateway $gateway): QaWriteService
    {
        $input = new QaInputService();
        $attachment = new QaAttachmentService(new QaAttachmentStorage());
        $read = new QaReadService($gateway, $input);

        return new QaWriteService($gateway, $input, $attachment, $read);
    }

    private function createMutationService(QaGateway $gateway): QaMutationService
    {
        $input = new QaInputService();
        $attachment = new QaAttachmentService(new QaAttachmentStorage());
        $read = new QaReadService($gateway, $input);

        return new QaMutationService($gateway, $input, $attachment, $read);
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }

    private function removeDirectory(string $directory): void
    {
        if ($directory === '' || !is_dir($directory)) {
            return;
        }

        $items = scandir($directory);
        if (!is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . '/' . $item;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}

final class QaGatewayStub implements QaGateway
{
    /** @var array<string, mixed> */
    public array $config = [
        'qa_category' => '회원|포인트',
        'qa_req_email' => 0,
        'qa_page_rows' => 15,
        'qa_upload_size' => 1048576,
    ];

    /** @var array<string, mixed> */
    public array $listResult = ['items' => [], 'total' => 0];

    /** @var array<int, array<string, mixed>> */
    public array $qaRows = [];

    /** @var array<int, array<int, array<string, mixed>>> */
    public array $downloadFiles = [];

    /** @var array<int, array<int, array<string, mixed>>> */
    public array $relatedByExcludeId = [];

    /** @var array<int|string|bool|null> */
    public array $lastListArgs = [];

    /** @var array<string, mixed>|null */
    public ?array $lastCreatedQuestion = null;

    /** @var array<string, mixed>|null */
    public ?array $lastCreatedAnswer = null;

    /** @var array<string, mixed>|null */
    public ?array $lastCreatedRelated = null;

    public int $lastCreatedAnswerParentId = 0;
    public int $lastCreatedRelatedParentId = 0;
    public int $lastUpdatedQaId = 0;

    /** @var array<string, mixed> */
    public array $lastUpdatedData = [];

    /** @var array<int|string|bool> */
    public array $lastDeleteArgs = [];

    private int $nextId = 801;

    public function getList(
        string $memberId,
        bool $isAdmin,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $searchText
    ): array {
        $this->lastListArgs = [$memberId, $isAdmin, $page, $perPage, $category, $searchField, $searchText];

        return $this->listResult;
    }

    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array
    {
        return $this->qaRows[$qaId] ?? null;
    }

    public function createQuestion(array $data): int
    {
        $id = $this->nextId++;
        $this->lastCreatedQuestion = $data;
        $this->qaRows[$id] = array_merge([
            'qa_id' => $id,
            'qa_related' => $id,
            'qa_type' => 0,
            'qa_status' => 0,
        ], $data);

        return $id;
    }

    public function createAnswer(int $parentQaId, array $data): int
    {
        $id = $this->nextId++;
        $this->lastCreatedAnswerParentId = $parentQaId;
        $this->lastCreatedAnswer = $data;
        $this->qaRows[$id] = array_merge([
            'qa_id' => $id,
            'qa_related' => $parentQaId,
            'qa_type' => 1,
            'qa_status' => 0,
        ], $data);

        return $id;
    }

    public function createRelatedQuestion(int $relatedQaId, array $data): int
    {
        $id = $this->nextId++;
        $this->lastCreatedRelatedParentId = $relatedQaId;
        $this->lastCreatedRelated = $data;
        $this->qaRows[$id] = array_merge([
            'qa_id' => $id,
            'qa_related' => $relatedQaId,
            'qa_type' => 0,
            'qa_status' => 0,
        ], $data);

        return $id;
    }

    public function update(int $qaId, array $data): void
    {
        $this->lastUpdatedQaId = $qaId;
        $this->lastUpdatedData = $data;
        if (isset($this->qaRows[$qaId])) {
            $this->qaRows[$qaId] = array_merge($this->qaRows[$qaId], $data);
        }
    }

    public function delete(int $qaId, string $memberId, bool $isAdmin): void
    {
        $this->lastDeleteArgs = [$qaId, $memberId, $isAdmin];
    }

    public function bulkDelete(array $qaIds): void
    {
    }

    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array
    {
        return $this->relatedByExcludeId[$excludeQaId] ?? [];
    }

    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array
    {
        return $this->downloadFiles[$qaId][$fileNo] ?? null;
    }

    public function getQaConfig(): array
    {
        return $this->config;
    }
}
