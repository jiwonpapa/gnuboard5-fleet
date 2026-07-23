<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Repository;

use Api\Support\Exception\ApiException;

final class AdminSchemaRepository
{
    private const DATA_DIR = __DIR__ . '/../Data/generated';

    public function __construct(
        private readonly ?AdminSchemaRuntimeOptionResolver $runtimeOptionResolver = null,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listDomains(): array
    {
        $items = [];
        foreach (glob(self::DATA_DIR . '/*.json') ?: [] as $path) {
            $schema = $this->readSchema($path);
            $items[] = [
                'domain' => (string)($schema['domain'] ?? ''),
                'title' => (string)($schema['title'] ?? ''),
                'legacy_form' => (string)($schema['legacy_form'] ?? ''),
                'field_count' => (int)($schema['field_count'] ?? 0),
                'section_count' => (int)($schema['section_count'] ?? 0),
                'generated_at' => (string)($schema['generated_at'] ?? ''),
            ];
        }

        usort(
            $items,
            static fn (array $left, array $right): int => strcmp((string)$left['domain'], (string)$right['domain'])
        );

        return $items;
    }

    /**
     * @return array<string, mixed>
     */
    public function getDomain(string $domain): array
    {
        $normalized = trim($domain);
        if ($normalized === '') {
            throw ApiException::badRequest('domain 값이 비어 있습니다.');
        }

        $path = self::DATA_DIR . '/' . $normalized . '.json';
        if (!is_file($path)) {
            throw ApiException::notFound('지원하지 않는 schema 도메인입니다.');
        }

        $schema = $this->readSchema($path);
        $schema = $this->resolveRuntimeOptionResolver()->enrich($normalized, $schema);
        $fieldsByName = [];

        foreach (($schema['sections'] ?? []) as $section) {
            foreach (($section['fields'] ?? []) as $field) {
                $name = (string)($field['name'] ?? '');
                if ($name === '') {
                    continue;
                }
                $fieldsByName[$name] = $field;
            }
        }

        $schema['fields_by_name'] = $fieldsByName;

        return $this->normalizeDomain($schema);
    }

    /**
     * @param array<string, mixed> $schema
     * @return array<string, mixed>
     */
    private function normalizeDomain(array $schema): array
    {
        return [
            ...$schema,
            'domain' => (string)($schema['domain'] ?? ''),
            'title' => (string)($schema['title'] ?? ''),
            'legacy_form' => (string)($schema['legacy_form'] ?? ''),
            'generated_at' => (string)($schema['generated_at'] ?? ''),
            'field_count' => (int)($schema['field_count'] ?? 0),
            'section_count' => (int)($schema['section_count'] ?? 0),
            'layout' => is_array($schema['layout'] ?? null)
                ? $this->normalizeLayout($schema['layout'])
                : null,
            'sections' => $this->normalizeSections((array)($schema['sections'] ?? [])),
            'fields_by_name' => $this->normalizeFieldMap((array)($schema['fields_by_name'] ?? [])),
        ];
    }

    /** @param array<string, mixed> $layout @return array<string, mixed> */
    private function normalizeLayout(array $layout): array
    {
        return [
            ...$layout,
            'desktop' => (string)($layout['desktop'] ?? 'tabs'),
            'mobile' => (string)($layout['mobile'] ?? 'accordion'),
            'single_open' => (bool)($layout['single_open'] ?? false),
        ];
    }

    /** @param array<int, mixed> $sections @return array<int, array<string, mixed>> */
    private function normalizeSections(array $sections): array
    {
        $normalized = [];
        foreach ($sections as $section) {
            if (!is_array($section)) {
                continue;
            }
            $normalized[] = [
                ...$section,
                'key' => (string)($section['key'] ?? ''),
                'label' => (string)($section['label'] ?? ''),
                'order' => (int)($section['order'] ?? 0),
                'fields' => $this->normalizeFields((array)($section['fields'] ?? [])),
            ];
        }

        return $normalized;
    }

    /** @param array<int, mixed> $fields @return array<int, array<string, mixed>> */
    private function normalizeFields(array $fields): array
    {
        $normalized = [];
        foreach ($fields as $field) {
            if (is_array($field)) {
                $normalized[] = $this->normalizeField($field);
            }
        }

        return $normalized;
    }

    /** @param array<string, mixed> $fields @return array<string, array<string, mixed>> */
    private function normalizeFieldMap(array $fields): array
    {
        $normalized = [];
        foreach ($fields as $name => $field) {
            if (is_array($field)) {
                $normalized[(string)$name] = $this->normalizeField($field);
            }
        }

        return $normalized;
    }

    /** @param array<string, mixed> $field @return array<string, mixed> */
    private function normalizeField(array $field): array
    {
        $optionSource = $field['option_source'] ?? null;

        return [
            ...$field,
            'name' => (string)($field['name'] ?? ''),
            'label' => (string)($field['label'] ?? ''),
            'input_type' => (string)($field['input_type'] ?? 'text'),
            'data_type' => (string)($field['data_type'] ?? 'string'),
            'required' => (bool)($field['required'] ?? false),
            'create_only' => (bool)($field['create_only'] ?? false),
            'readonly_on_update' => (bool)($field['readonly_on_update'] ?? false),
            'options' => $this->normalizeOptions((array)($field['options'] ?? [])),
            'option_source' => is_array($optionSource) ? [
                ...$optionSource,
                'kind' => (string)($optionSource['kind'] ?? ''),
                'name' => (string)($optionSource['name'] ?? ''),
            ] : null,
            'default_value' => $field['default_value'] ?? null,
        ];
    }

    /** @param array<int, mixed> $options @return array<int, array<string, mixed>> */
    private function normalizeOptions(array $options): array
    {
        $normalized = [];
        foreach ($options as $option) {
            if (!is_array($option)) {
                continue;
            }
            $normalized[] = [
                ...$option,
                'value' => (string)($option['value'] ?? ''),
                'label' => (string)($option['label'] ?? ''),
            ];
        }

        return $normalized;
    }

    private function resolveRuntimeOptionResolver(): AdminSchemaRuntimeOptionResolver
    {
        return $this->runtimeOptionResolver ?? new AdminSchemaRuntimeOptionResolver();
    }

    /**
     * @return array<string, mixed>
     */
    private function readSchema(string $path): array
    {
        $content = file_get_contents($path);
        if ($content === false) {
            throw ApiException::serverError('schema 파일을 읽을 수 없습니다.');
        }

        $decoded = json_decode($content, true);
        if (!is_array($decoded)) {
            throw ApiException::serverError('schema 파일 형식이 올바르지 않습니다.');
        }

        return $decoded;
    }
}
