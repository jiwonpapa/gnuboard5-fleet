<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

final class LegacyAdminSchemaParitySurfaceMerger
{
    /**
     * @param array<string, mixed> $inventory
     * @param array<string, mixed> $domainConfig
     * @param array{
     *   schema_scope?: string|null,
     *   supported_fields?: list<string>|null,
     *   default_section?: array{key?: string, label?: string}|null
     * }|null $legacySpec
     * @param array<string, mixed>|null $schema
     * @return array<string, mixed>
     */
    public function constrainInventory(array $inventory, array $domainConfig, ?array $legacySpec, ?array $schema = null): array
    {
        $defaultSection = is_array($legacySpec['default_section'] ?? null) ? $legacySpec['default_section'] : null;
        if ($defaultSection !== null) {
            $defaultSectionKey = trim((string)($defaultSection['key'] ?? ''));
            $defaultSectionLabel = trim((string)($defaultSection['label'] ?? ''));
            if ($defaultSectionKey !== '') {
                $inventory['fields'] = array_map(
                    static function (mixed $field) use ($defaultSectionKey, $defaultSectionLabel): mixed {
                        if (!is_array($field)) {
                            return $field;
                        }

                        $sectionKey = trim((string)($field['section_key'] ?? ''));
                        if ($sectionKey !== '') {
                            return $field;
                        }

                        $field['section_key'] = $defaultSectionKey;
                        $field['section_label'] = $defaultSectionLabel !== '' ? $defaultSectionLabel : $defaultSectionKey;
                        return $field;
                    },
                    is_array($inventory['fields'] ?? null) ? $inventory['fields'] : []
                );
            }
        }

        $allowedFields = $this->resolveAllowedFields($domainConfig, $legacySpec, $schema);
        if ($allowedFields === []) {
            return $inventory;
        }

        $inventory['fields'] = array_values(
            array_filter(
                is_array($inventory['fields'] ?? null) ? $inventory['fields'] : [],
                static function (mixed $field) use ($allowedFields): bool {
                    if (!is_array($field)) {
                        return false;
                    }

                    $fieldName = trim((string)($field['name'] ?? ''));
                    return $fieldName !== '' && isset($allowedFields[$fieldName]);
                }
            )
        );

        return $inventory;
    }

    /**
     * @param array<string, mixed> $schema
     * @param array<string, mixed> $domainConfig
     * @param array{mode?: string|null, schema_scope?: string|null, supported_fields?: list<string>|null}|null $legacySpec
     * @return array<string, mixed>
     */
    public function constrainSchema(array $schema, array $domainConfig, ?array $legacySpec): array
    {
        $constrained = $schema;
        $allowedFields = $this->resolveAllowedFields($domainConfig, $legacySpec);
        if ($allowedFields !== []) {
            $filteredSections = [];
            foreach (($constrained['sections'] ?? []) as $section) {
                if (!is_array($section)) {
                    continue;
                }
                $fields = [];
                foreach (($section['fields'] ?? []) as $field) {
                    if (!is_array($field)) {
                        continue;
                    }
                    $fieldName = trim((string)($field['name'] ?? ''));
                    if ($fieldName !== '' && isset($allowedFields[$fieldName])) {
                        $fields[] = $field;
                    }
                }
                if ($fields !== []) {
                    $section['fields'] = $fields;
                    $filteredSections[] = $section;
                }
            }
            $constrained['sections'] = $filteredSections;
        }

        $mode = trim((string)($legacySpec['mode'] ?? ''));
        if ($mode !== 'update') {
            return $constrained;
        }

        foreach (($constrained['sections'] ?? []) as $sectionIndex => $section) {
            if (!is_array($section)) {
                continue;
            }
            foreach (($section['fields'] ?? []) as $fieldIndex => $field) {
                if (!is_array($field)) {
                    continue;
                }
                $readonlyOnUpdate = (bool)($field['readonly_on_update'] ?? false);
                $createOnly = (bool)($field['create_only'] ?? false);
                if ($readonlyOnUpdate || $createOnly) {
                    $constrained['sections'][$sectionIndex]['fields'][$fieldIndex]['required'] = false;
                }
            }
        }

        return $constrained;
    }

    /**
     * @param list<array<string, mixed>> $inventories
     * @return array<string, mixed>
     */
    public function mergeInventories(array $inventories): array
    {
        $sections = [];
        $fields = [];

        foreach ($inventories as $inventory) {
            foreach (($inventory['sections'] ?? []) as $section) {
                if (!is_array($section)) {
                    continue;
                }
                $sectionKey = trim((string)($section['key'] ?? ''));
                if ($sectionKey === '') {
                    continue;
                }
                if (!isset($sections[$sectionKey])) {
                    $sections[$sectionKey] = [
                        'key' => $sectionKey,
                        'label' => (string)($section['label'] ?? $sectionKey),
                    ];
                }
            }

            foreach (($inventory['fields'] ?? []) as $field) {
                if (!is_array($field)) {
                    continue;
                }
                $fieldName = trim((string)($field['name'] ?? ''));
                if ($fieldName === '') {
                    continue;
                }

                if (!isset($fields[$fieldName])) {
                    $fields[$fieldName] = $field;
                    continue;
                }

                $fields[$fieldName] = $this->mergeInventoryField($fields[$fieldName], $field);
            }
        }

        return [
            'section_count' => count($sections),
            'field_count' => count($fields),
            'sections' => array_values($sections),
            'fields' => array_values($fields),
        ];
    }

    /**
     * @param list<array<string, mixed>> $schemas
     * @return array<string, mixed>
     */
    public function mergeSchemas(array $schemas): array
    {
        $sectionsByKey = [];
        $fieldOrderBySection = [];

        foreach ($schemas as $schema) {
            foreach (($schema['sections'] ?? []) as $section) {
                if (!is_array($section)) {
                    continue;
                }

                $sectionKey = trim((string)($section['key'] ?? ''));
                if ($sectionKey === '') {
                    continue;
                }

                if (!isset($sectionsByKey[$sectionKey])) {
                    $sectionsByKey[$sectionKey] = $section;
                    $sectionsByKey[$sectionKey]['fields'] = [];
                    $fieldOrderBySection[$sectionKey] = [];
                }

                foreach (($section['fields'] ?? []) as $field) {
                    if (!is_array($field)) {
                        continue;
                    }
                    $fieldName = trim((string)($field['name'] ?? ''));
                    if ($fieldName === '') {
                        continue;
                    }

                    if (!isset($fieldOrderBySection[$sectionKey][$fieldName])) {
                        $fieldOrderBySection[$sectionKey][$fieldName] = count($sectionsByKey[$sectionKey]['fields']);
                        $sectionsByKey[$sectionKey]['fields'][] = $field;
                        continue;
                    }

                    $index = $fieldOrderBySection[$sectionKey][$fieldName];
                    $sectionsByKey[$sectionKey]['fields'][$index] = $this->mergeSchemaField(
                        $sectionsByKey[$sectionKey]['fields'][$index],
                        $field
                    );
                }
            }
        }

        return [
            'sections' => array_values($sectionsByKey),
        ];
    }

    /**
     * @param array<string, mixed> $domainConfig
     * @param array{schema_scope?: string|null, supported_fields?: list<string>|null}|null $legacySpec
     * @param array<string, mixed>|null $schema
     * @return array<string, true>
     */
    private function resolveAllowedFields(array $domainConfig, ?array $legacySpec, ?array $schema = null): array
    {
        $supportedFields = [];
        if (is_array($legacySpec['supported_fields'] ?? null) && $legacySpec['supported_fields'] !== []) {
            $supportedFields = $legacySpec['supported_fields'];
        } elseif (trim((string)($legacySpec['schema_scope'] ?? '')) === 'supported_fields') {
            $supportedFields = is_array($domainConfig['supported_fields'] ?? null) ? $domainConfig['supported_fields'] : [];
        } elseif (trim((string)($legacySpec['schema_scope'] ?? '')) === 'schema_fields') {
            foreach (($schema['sections'] ?? []) as $section) {
                if (!is_array($section)) {
                    continue;
                }

                foreach (($section['fields'] ?? []) as $field) {
                    if (!is_array($field)) {
                        continue;
                    }

                    $fieldName = trim((string)($field['name'] ?? ''));
                    if ($fieldName !== '') {
                        $supportedFields[] = $fieldName;
                    }
                }
            }
        }

        $supportedFields = array_values(
            array_filter(
                array_map('strval', $supportedFields),
                static fn (string $value): bool => $value !== ''
            )
        );
        if ($supportedFields === []) {
            return [];
        }

        $sourceFieldMap = is_array($domainConfig['source_field_map'] ?? null) ? $domainConfig['source_field_map'] : [];
        $allowedFields = [];
        foreach ($supportedFields as $fieldName) {
            $allowedFields[$fieldName] = true;
            $sourceName = trim((string)($sourceFieldMap[$fieldName] ?? $fieldName));
            if ($sourceName !== '') {
                $allowedFields[str_replace('[]', '', $sourceName)] = true;
            }
        }

        return $allowedFields;
    }

    /**
     * @param array<string, mixed> $current
     * @param array<string, mixed> $candidate
     * @return array<string, mixed>
     */
    private function mergeInventoryField(array $current, array $candidate): array
    {
        $base = $current;
        $supplement = $candidate;
        if ($this->inventoryFieldScore($candidate) > $this->inventoryFieldScore($current)) {
            $base = $candidate;
            $supplement = $current;
        }

        $base['options'] = $this->mergeOptions(
            is_array($base['options'] ?? null) ? $base['options'] : [],
            is_array($supplement['options'] ?? null) ? $supplement['options'] : []
        );
        $base['option_count'] = count($base['options']);
        if (trim((string)($base['label'] ?? '')) === '') {
            $base['label'] = $supplement['label'] ?? null;
        }
        if (trim((string)($base['section_key'] ?? '')) === '') {
            $base['section_key'] = $supplement['section_key'] ?? null;
            $base['section_label'] = $supplement['section_label'] ?? null;
        } elseif (trim((string)($base['section_label'] ?? '')) === '') {
            $base['section_label'] = $supplement['section_label'] ?? null;
        }

        return $base;
    }

    /**
     * @param array<string, mixed> $current
     * @param array<string, mixed> $candidate
     * @return array<string, mixed>
     */
    private function mergeSchemaField(array $current, array $candidate): array
    {
        $base = $current;
        if (
            trim((string)($base['input_type'] ?? '')) === 'hidden'
            && trim((string)($candidate['input_type'] ?? '')) !== 'hidden'
        ) {
            $base = $candidate;
        }

        $base['options'] = $this->mergeOptions(
            is_array($base['options'] ?? null) ? $base['options'] : [],
            is_array($candidate['options'] ?? null) ? $candidate['options'] : []
        );

        return $base;
    }

    /**
     * @param array<string, mixed> $field
     * @return array{int, int, int}
     */
    private function inventoryFieldScore(array $field): array
    {
        $renderType = strtolower(trim((string)($field['render_type'] ?? 'text')));
        return [
            $renderType !== 'hidden' ? 1 : 0,
            ((int)($field['option_count'] ?? 0)) > 0 ? 1 : 0,
            (!(bool)($field['readonly'] ?? false) && !(bool)($field['disabled'] ?? false)) ? 1 : 0,
        ];
    }

    /**
     * @param list<array{value?: string, label?: string}> $left
     * @param list<array{value?: string, label?: string}> $right
     * @return list<array{value?: string, label?: string}>
     */
    private function mergeOptions(array $left, array $right): array
    {
        $merged = [];
        foreach (array_merge($left, $right) as $option) {
            $value = (string)($option['value'] ?? '');
            $label = (string)($option['label'] ?? '');
            $merged[$value . '|' . $label] = $option;
        }

        return array_values($merged);
    }
}
