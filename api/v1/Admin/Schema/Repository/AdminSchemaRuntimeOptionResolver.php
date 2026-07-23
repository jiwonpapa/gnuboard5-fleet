<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Repository;

use Api\Admin\Schema\Support\AdminSchemaRuntimeDirectoryOptionCatalog;
use Api\Admin\Schema\Support\AdminSchemaRuntimeStateProvider;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSchemaRuntimeOptionResolver
{
    private ?AdminSchemaRuntimeDirectoryOptionCatalog $resolvedDirectoryCatalog = null;
    private ?AdminSchemaRuntimeStateProvider $resolvedStateProvider = null;

    /**
     * @param array<string, mixed>|null $configValues
     * @param list<string>|null $memberIds
     */
    public function __construct(
        private readonly ?string $projectRoot = null,
        private readonly ?array $configValues = null,
        private readonly ?array $memberIds = null,
        private readonly ?QueryBuilder $queryBuilder = null,
        private readonly ?TableRegistry $tableRegistry = null,
    ) {
    }

    /**
     * @param array<string, mixed> $schema
     * @return array<string, mixed>
     */
    public function enrich(string $domain, array $schema): array
    {
        if ($domain !== 'config') {
            return $schema;
        }

        $optionsByField = $this->buildConfigOptionsByField();
        if ($optionsByField === []) {
            return $schema;
        }

        foreach (($schema['sections'] ?? []) as $sectionIndex => $section) {
            foreach (($section['fields'] ?? []) as $fieldIndex => $field) {
                $fieldName = (string)($field['name'] ?? '');
                if ($fieldName === '') {
                    continue;
                }

                if (!array_key_exists($fieldName, $optionsByField)) {
                    continue;
                }

                $schema['sections'][$sectionIndex]['fields'][$fieldIndex]['options'] = $optionsByField[$fieldName];
            }
        }

        return $schema;
    }

    /**
     * @return array<string, list<array{value: string, label: string}>>
     */
    private function buildConfigOptionsByField(): array
    {
        $config = $this->stateProvider()->configValues();
        $directoryCatalog = $this->directoryCatalog();
        $stateProvider = $this->stateProvider();

        return array_filter(
            [
                'cf_admin' => $stateProvider->memberOptions(10),
                'cf_new_skin' => $directoryCatalog->skinOptions('new', false, $config),
                'cf_search_skin' => $directoryCatalog->skinOptions('search', false, $config),
                'cf_connect_skin' => $directoryCatalog->skinOptions('connect', false, $config),
                'cf_faq_skin' => $directoryCatalog->skinOptions('faq', false, $config),
                'cf_mobile_new_skin' => $directoryCatalog->skinOptions('new', true, $config),
                'cf_mobile_search_skin' => $directoryCatalog->skinOptions('search', true, $config),
                'cf_mobile_connect_skin' => $directoryCatalog->skinOptions('connect', true, $config),
                'cf_mobile_faq_skin' => $directoryCatalog->skinOptions('faq', true, $config),
                'cf_member_skin' => $directoryCatalog->skinOptions('member', false, $config),
                'cf_mobile_member_skin' => $directoryCatalog->skinOptions('member', true, $config),
                'cf_editor' => $directoryCatalog->editorOptions(),
                'cf_captcha_mp3' => $directoryCatalog->captchaMp3Options(),
            ],
            static fn (array $options): bool => $options !== []
        );
    }

    private function directoryCatalog(): AdminSchemaRuntimeDirectoryOptionCatalog
    {
        return $this->resolvedDirectoryCatalog ??= new AdminSchemaRuntimeDirectoryOptionCatalog($this->projectRoot);
    }

    private function stateProvider(): AdminSchemaRuntimeStateProvider
    {
        return $this->resolvedStateProvider ??= new AdminSchemaRuntimeStateProvider(
            $this->configValues,
            $this->memberIds,
            $this->queryBuilder,
            $this->tableRegistry,
        );
    }
}
