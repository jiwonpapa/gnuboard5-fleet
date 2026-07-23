<?php

declare(strict_types=1);

namespace Tests\Contract;

final class ProtectedBoardPipelineContractTest extends ContractTestCase
{
    public function testBoardMutationRequestsAreNamedAndClosed(): void
    {
        $requests = [
            ['/boards/{bo_table}/posts', 'post', 'PostCreateRequest'],
            ['/boards/{bo_table}/posts/{wr_id}', 'put', 'PostUpdateRequest'],
            ['/boards/{bo_table}/posts/{wr_id}/reply', 'post', 'PostReplyRequest'],
            ['/boards/{bo_table}/posts/{wr_id}/files', 'post', 'PostFileUploadRequest'],
            ['/boards/{bo_table}/posts/{wr_id}/good', 'post', 'PostVoteRequest'],
            ['/boards/{bo_table}/posts/{wr_id}/comments', 'post', 'CommentCreateRequest'],
            ['/boards/{bo_table}/posts/{wr_id}/comments/{comment_id}', 'put', 'CommentUpdateRequest'],
            ['/files/upload', 'post', 'FileUploadRequest'],
            ['/polls/{po_id}/vote', 'post', 'PollVoteRequest'],
        ];

        foreach ($requests as [$path, $method, $schema]) {
            $this->assertRequestBodyUsesSchemaRef($path, $method, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }

    public function testBoardSuccessResponsesUseConcreteDtos(): void
    {
        $responses = [
            ['/boards/{bo_table}', 'get', '200', 'BoardDetailResponse'],
            ['/boards/{bo_table}/posts', 'get', '200', 'PostListResponse'],
            ['/boards/{bo_table}/posts', 'post', '201', 'PostCreateResponse'],
            ['/boards/{bo_table}/posts/{wr_id}', 'get', '200', 'PostDetailResponse'],
            ['/boards/{bo_table}/posts/{wr_id}', 'put', '200', 'PostDetailResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/reply', 'post', '201', 'PostReplyResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/files', 'get', '200', 'PostFileListResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/files', 'post', '201', 'PostFileResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/good', 'post', '200', 'PostVoteResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/comments', 'get', '200', 'CommentListResponse'],
            ['/boards/{bo_table}/posts/{wr_id}/comments', 'post', '201', 'CommentDetailResponse'],
            ['/polls/active', 'get', '200', 'PollActiveResponse'],
            ['/polls/{po_id}/vote', 'post', '200', 'PollVoteResponse'],
            ['/polls/{po_id}/result', 'get', '200', 'PollResultResponse'],
        ];

        foreach ($responses as [$path, $method, $status, $schema]) {
            $this->assertMethodResponseSchema($path, $method, $status, $schema);
            $this->assertSchemaIsClosedObject($schema);
        }
    }

    public function testPublicDtosExcludeProviderInternalSecretsAndPaths(): void
    {
        self::assertNotContains('wr_password', $this->resolvedSchemaPropertyNames('Post'));
        self::assertNotContains('path', $this->resolvedSchemaPropertyNames('PostFile'));
        $this->assertSchemaHasFields('Post', ['wr_id', 'wr_subject', 'wr_content', 'is_notice']);
        $this->assertSchemaHasFields('PostFile', ['bo_table', 'wr_id', 'bf_no', 'bf_fileurl']);
    }
}
