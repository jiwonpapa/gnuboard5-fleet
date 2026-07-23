<?php

declare(strict_types=1);

namespace Tests\Qa;

use Api\Qa\Contracts\QaGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class QaServiceTest extends TestCase
{
    use BuildsDomainServices;

    public function testCreateQuestionRequiresConfiguredCategory(): void
    {
        $gateway = $this->createMock(QaGateway::class);
        $gateway->method('getQaConfig')->willReturn([
            'qa_category' => '회원|포인트',
            'qa_req_email' => 0,
            'qa_page_rows' => 15,
            'qa_upload_size' => 1048576,
        ]);

        $service = $this->createQaService($gateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('유효하지 않은 qa_category입니다.');

        $service->createQuestion([
            'mb_id' => 'tester',
            'mb_nick' => '테스터',
            'mb_level' => 2,
        ], [
            'qa_category' => '없는분류',
            'qa_subject' => '제목',
            'qa_content' => '내용',
        ], [], '127.0.0.1');
    }

    public function testCreateAnswerRejectsWhenMemberIsNotAdmin(): void
    {
        $gateway = $this->createMock(QaGateway::class);
        $service = $this->createQaService($gateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('관리자만 수행할 수 있습니다.');

        $service->createAnswer(10, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], [
            'qa_subject' => '답변',
            'qa_content' => '답변내용',
        ], [], '127.0.0.1');
    }

    public function testDetailIncludesRelatedQuestions(): void
    {
        $gateway = $this->createMock(QaGateway::class);
        $gateway->expects($this->once())
            ->method('getById')
            ->with(5, 'user1', false)
            ->willReturn([
                'qa_id' => 5,
                'qa_related' => 9,
                'mb_id' => 'user1',
                'qa_type' => 0,
                'qa_status' => 0,
            ]);
        $gateway->expects($this->once())
            ->method('getRelatedQuestions')
            ->with(9, 5, 10)
            ->willReturn([
                ['qa_id' => 11, 'qa_subject' => '연관 질문'],
            ]);

        $service = $this->createQaService($gateway);
        $detail = $service->detail([
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], 5);

        $this->assertSame(5, $detail['qa_id']);
        $this->assertTrue((bool)$detail['is_owner']);
        $this->assertCount(1, $detail['related_questions']);
    }

    public function testUpdateQuestionRejectsAnsweredQuestionForMember(): void
    {
        $gateway = $this->createMock(QaGateway::class);
        $gateway->method('getQaConfig')->willReturn([
            'qa_category' => '회원|포인트',
            'qa_req_email' => 0,
            'qa_page_rows' => 15,
            'qa_upload_size' => 1048576,
        ]);
        $gateway->expects($this->once())
            ->method('getById')
            ->with(7, 'user1', false)
            ->willReturn([
                'qa_id' => 7,
                'qa_type' => 0,
                'qa_status' => 1,
                'qa_file1' => '',
                'qa_source1' => '',
                'qa_file2' => '',
                'qa_source2' => '',
                'qa_email' => '',
            ]);
        $gateway->expects($this->never())->method('update');

        $service = $this->createQaService($gateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('답변이 등록된 문의글은 수정할 수 없습니다.');

        $service->updateQuestion(7, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], [
            'qa_subject' => '수정',
            'qa_content' => '수정내용',
        ], [], '127.0.0.1');
    }

    public function testBulkDeleteRequiresAdminAndDeduplicatesIds(): void
    {
        $gateway = $this->createMock(QaGateway::class);
        $gateway->expects($this->once())
            ->method('bulkDelete')
            ->with([1, 2, 3]);

        $service = $this->createQaService($gateway);
        $result = $service->bulkDelete([
            'mb_id' => 'admin',
            'mb_level' => 10,
        ], [1, '2', '2', 3, 'x', 0]);

        $this->assertSame(3, $result['deleted_count']);
        $this->assertSame([1, 2, 3], $result['qa_ids']);
    }

    public function testDownloadPayloadUsesGatewayAndFileMetadata(): void
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'qa-file-');
        $this->assertIsString($tmpFile);
        file_put_contents($tmpFile, 'hello');

        $gateway = $this->createMock(QaGateway::class);
        $gateway->expects($this->once())
            ->method('getFileForDownload')
            ->with(8, 1, 'user1', false)
            ->willReturn([
                'qa_id' => 8,
                'qa_file' => 'stored.txt',
                'qa_source' => '원본.txt',
                'path' => $tmpFile,
            ]);

        $service = $this->createQaService($gateway);
        $payload = $service->getDownloadPayload(8, 1, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ]);

        $this->assertSame(5, $payload['size']);
        $this->assertArrayHasKey('mime', $payload);

        @unlink($tmpFile);
    }
}
