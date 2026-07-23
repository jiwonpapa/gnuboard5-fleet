<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminBoardContractTest extends ContractTestCase
{
    public function testListAndDetailResponseContractsCoverAdminSchemaFields(): void
    {
        $this->assertMethodHasOperationId('/admin/boards', 'get', 'adminListBoards');
        $this->assertMethodHasParameters(
            '/admin/boards',
            'get',
            ['page', 'per_page', 'gr_id', 'search', 'sort_by', 'sort_direction']
        );
        $this->assertMethodResponseSchema('/admin/boards', 'get', '200', 'AdminBoardListResponse');
        $this->assertComponentArrayItemsUseSchemaRef('AdminBoardListResponse', 'AdminBoard');
        $this->assertComponentHasPaginationRef('AdminBoardListResponse');

        $this->assertMethodHasOperationId('/admin/boards/{bo_table}', 'get', 'adminGetBoard');
        $this->assertMethodResponseSchema('/admin/boards/{bo_table}', 'get', '200', 'AdminBoardDetailResponse');
        $this->assertComponentUsesSchemaRef('AdminBoardDetailResponse', 'AdminBoard');

        $this->assertSameFields($this->allBoardSchemaFields(), $this->resolvedSchemaPropertyNames('AdminBoard'));
    }

    public function testCreateAndUpdateUseNamedClosedFullBoardSchemas(): void
    {
        $this->assertMethodHasOperationId('/admin/boards', 'post', 'adminCreateBoard');
        $this->assertRequestBodyUsesSchemaRef('/admin/boards', 'post', 'AdminBoardCreateRequest');
        $this->assertMethodResponseSchema('/admin/boards', 'post', '201', 'AdminBoardDetailResponse');
        $this->assertSchemaRequiredFields('AdminBoardCreateRequest', ['bo_table', 'bo_subject', 'gr_id']);
        $this->assertSchemaIsClosedObject('AdminBoardCreateRequest');

        $this->assertMethodHasOperationId('/admin/boards/{bo_table}', 'put', 'adminUpdateBoard');
        $this->assertRequestBodyUsesSchemaRef('/admin/boards/{bo_table}', 'put', 'AdminBoardUpdateRequest');
        $this->assertMethodResponseSchema('/admin/boards/{bo_table}', 'put', '200', 'AdminBoardDetailResponse');
        $this->assertSchemaIsClosedObject('AdminBoardUpdateRequest');

        $createFields = array_values(array_filter(
            $this->allBoardSchemaFields(),
            static fn (string $field): bool => $field !== 'bo_notice'
        ));
        $this->assertSameFields($createFields, $this->resolvedSchemaPropertyNames('AdminBoardCreateRequest'));
        $this->assertSameFields($this->mutableBoardSchemaFields(), $this->resolvedSchemaPropertyNames('AdminBoardUpdateRequest'));
    }

    public function testCopyAndNewPostDeletionUseNamedClosedSchemas(): void
    {
        $this->assertMethodHasOperationId('/admin/boards/{bo_table}/copy', 'post', 'adminCopyBoard');
        $this->assertRequestBodyUsesSchemaRef('/admin/boards/{bo_table}/copy', 'post', 'AdminBoardCopyRequest');
        $this->assertMethodResponseSchema('/admin/boards/{bo_table}/copy', 'post', '201', 'AdminBoardDetailResponse');
        $this->assertSchemaRequiredFields('AdminBoardCopyRequest', ['target_bo_table']);
        $this->assertSchemaIsClosedObject('AdminBoardCopyRequest');
        $this->assertSameFields(
            ['target_bo_table', 'target_bo_subject', 'copy_posts'],
            $this->resolvedSchemaPropertyNames('AdminBoardCopyRequest')
        );

        $this->assertMethodHasOperationId('/admin/boards/new-posts', 'delete', 'adminDeleteNewPosts');
        $this->assertRequestBodyUsesSchemaRef('/admin/boards/new-posts', 'delete', 'AdminNewPostsDeleteRequest');
        $this->assertMethodResponseSchema(
            '/admin/boards/new-posts',
            'delete',
            '200',
            'AdminNewPostsDeleteResponse'
        );
        $this->assertSchemaRequiredFields('AdminNewPostsDeleteRequest', ['bn_ids']);
        $this->assertSchemaIsClosedObject('AdminNewPostsDeleteRequest');
    }

    /** @return list<string> */
    private function allBoardSchemaFields(): array
    {
        return array_values(array_map(
            static fn (array $field): string => (string)$field['name'],
            $this->boardSchemaFields()
        ));
    }

    /** @return list<string> */
    private function mutableBoardSchemaFields(): array
    {
        return array_values(array_map(
            static fn (array $field): string => (string)$field['name'],
            array_filter(
                $this->boardSchemaFields(),
                static fn (array $field): bool => ($field['readonly_on_update'] ?? true) === false
                    && ($field['create_only'] ?? true) === false
            )
        ));
    }

    /** @return list<array<string,mixed>> */
    private function boardSchemaFields(): array
    {
        $path = dirname(__DIR__, 2) . '/api/v1/Admin/Schema/Data/generated/boards.json';
        $document = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $fields = [];
        foreach ($document['sections'] ?? [] as $section) {
            foreach ($section['fields'] ?? [] as $field) {
                if (is_array($field)) {
                    $fields[] = $field;
                }
            }
        }

        return $fields;
    }

    /** @param list<string> $expected @param list<string> $actual */
    private function assertSameFields(array $expected, array $actual): void
    {
        sort($expected);
        sort($actual);
        self::assertSame($expected, $actual);
    }
}
