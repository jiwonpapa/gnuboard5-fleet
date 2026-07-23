<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

final class LegacyAdminSchemaParityComparator
{
    /**
     * @param array{
     *   fields?: list<array{
     *     name: string,
     *     section_key?: string|null,
     *     render_type?: string,
     *     required?: bool,
     *     readonly?: bool,
     *     disabled?: bool,
     *     option_count?: int
     *   }>
     * } $inventory
     * @param array{
     *   sections?: list<array{
     *     key?: string,
     *     fields?: list<array{
     *       name?: string,
     *       input_type?: string,
     *       required?: bool,
     *       readonly_on_update?: bool,
     *       options?: list<array{value?: string, label?: string}>
     *     }>
     *   }>
     * } $schema
     * @param array{
     *   strict_choice_options?: bool,
     *   source_field_map?: array<string, string>,
     *   ignored_legacy_fields?: list<string>,
     *   ignored_section_mismatches?: list<string>,
     *   ignored_render_type_mismatches?: list<string>,
     *   ignored_required_mismatches?: list<string>,
     *   ignored_readonly_mismatches?: list<string>,
     *   ignored_schema_only_fields?: list<string>
     * } $options
     * @return array{
     *   status: 'pass'|'fail',
     *   legacy_field_count: int,
     *   schema_field_count: int,
     *   legacy_only_fields: list<string>,
     *   schema_only_fields: list<string>,
     *   section_mismatches: list<array{field: string, legacy: string|null, schema: string|null}>,
     *   render_type_mismatches: list<array{field: string, legacy: string, schema: string}>,
     *   required_mismatches: list<array{field: string, legacy: bool, schema: bool}>,
     *   readonly_mismatches: list<array{field: string, legacy: bool, schema: bool}>,
     *   option_mismatches: list<array{field: string, legacy: int, schema: int}>
     * }
     */
    public function compare(array $inventory, array $schema, array $options = []): array
    {
        $strictChoiceOptions = (bool)($options['strict_choice_options'] ?? false);
        $sourceFieldMap = is_array($options['source_field_map'] ?? null) ? $options['source_field_map'] : [];
        $ignoredLegacyFields = array_values(
            array_filter(
                array_map('strval', is_array($options['ignored_legacy_fields'] ?? null) ? $options['ignored_legacy_fields'] : []),
                static fn (string $value): bool => $value !== ''
            )
        );
        $ignoredSectionMismatches = array_fill_keys(
            array_values(
                array_filter(
                    array_map('strval', is_array($options['ignored_section_mismatches'] ?? null) ? $options['ignored_section_mismatches'] : []),
                    static fn (string $value): bool => $value !== ''
                )
            ),
            true
        );
        $ignoredRenderTypeMismatches = array_fill_keys(
            array_values(
                array_filter(
                    array_map('strval', is_array($options['ignored_render_type_mismatches'] ?? null) ? $options['ignored_render_type_mismatches'] : []),
                    static fn (string $value): bool => $value !== ''
                )
            ),
            true
        );
        $ignoredRequiredMismatches = array_fill_keys(
            array_values(
                array_filter(
                    array_map('strval', is_array($options['ignored_required_mismatches'] ?? null) ? $options['ignored_required_mismatches'] : []),
                    static fn (string $value): bool => $value !== ''
                )
            ),
            true
        );
        $ignoredReadonlyMismatches = array_fill_keys(
            array_values(
                array_filter(
                    array_map('strval', is_array($options['ignored_readonly_mismatches'] ?? null) ? $options['ignored_readonly_mismatches'] : []),
                    static fn (string $value): bool => $value !== ''
                )
            ),
            true
        );
        $ignoredSchemaOnlyFields = array_fill_keys(
            array_values(
                array_filter(
                    array_map('strval', is_array($options['ignored_schema_only_fields'] ?? null) ? $options['ignored_schema_only_fields'] : []),
                    static fn (string $value): bool => $value !== ''
                )
            ),
            true
        );
        $legacyFields = $this->indexLegacyFields($inventory, $ignoredLegacyFields);
        $schemaFields = $this->indexSchemaFields($schema);
        $legacyFields = $this->resolveLegacyAliasesAgainstSchema($legacyFields, $schemaFields, $sourceFieldMap);
        $legacyHasSectionMetadata = $this->legacyHasSectionMetadata($legacyFields);

        $legacyOnly = array_values(array_diff(array_keys($legacyFields), array_keys($schemaFields)));
        $schemaOnly = array_values(
            array_filter(
                array_diff(array_keys($schemaFields), array_keys($legacyFields)),
                static fn (string $fieldName): bool => !isset($ignoredSchemaOnlyFields[$fieldName])
            )
        );
        sort($legacyOnly);
        sort($schemaOnly);

        $sectionMismatches = [];
        $renderTypeMismatches = [];
        $requiredMismatches = [];
        $readonlyMismatches = [];
        $optionMismatches = [];

        foreach ($legacyFields as $fieldName => $legacyField) {
            if (!isset($schemaFields[$fieldName])) {
                continue;
            }

            $schemaField = $schemaFields[$fieldName];
            if (
                $legacyHasSectionMetadata
                && !isset($ignoredSectionMismatches[$fieldName])
                && ($legacyField['section_key'] ?? null) !== ($schemaField['section_key'] ?? null)
            ) {
                $sectionMismatches[] = [
                    'field' => $fieldName,
                    'legacy' => $legacyField['section_key'] ?? null,
                    'schema' => $schemaField['section_key'] ?? null,
                ];
            }

            $legacyRenderType = $this->normalizeLegacyRenderType((string)($legacyField['render_type'] ?? 'text'));
            $schemaRenderType = $this->normalizeSchemaRenderType((string)($schemaField['input_type'] ?? 'text'));
            if (
                !isset($ignoredRenderTypeMismatches[$fieldName])
                && !$this->isRenderTypeCompatible($legacyRenderType, $schemaRenderType)
            ) {
                $renderTypeMismatches[] = [
                    'field' => $fieldName,
                    'legacy' => $legacyRenderType,
                    'schema' => $schemaRenderType,
                ];
            }

            $legacyRequired = (bool)($legacyField['required'] ?? false);
            $schemaRequired = (bool)($schemaField['required'] ?? false);
            if (!isset($ignoredRequiredMismatches[$fieldName]) && $legacyRequired !== $schemaRequired) {
                $requiredMismatches[] = [
                    'field' => $fieldName,
                    'legacy' => $legacyRequired,
                    'schema' => $schemaRequired,
                ];
            }

            $legacyReadonly = (bool)($legacyField['readonly'] ?? false) || (bool)($legacyField['disabled'] ?? false);
            $schemaReadonly = (bool)($schemaField['readonly_on_update'] ?? false);
            if (!isset($ignoredReadonlyMismatches[$fieldName]) && $legacyReadonly !== $schemaReadonly) {
                $readonlyMismatches[] = [
                    'field' => $fieldName,
                    'legacy' => $legacyReadonly,
                    'schema' => $schemaReadonly,
                ];
            }

            if (
                $strictChoiceOptions
                && in_array($legacyRenderType, ['select', 'radio', 'checkbox'], true)
            ) {
                $legacyOptionCount = (int)($legacyField['option_count'] ?? 0);
                $schemaOptionCount = count($schemaField['options'] ?? []);
                if ($legacyOptionCount !== $schemaOptionCount) {
                    $optionMismatches[] = [
                        'field' => $fieldName,
                        'legacy' => $legacyOptionCount,
                        'schema' => $schemaOptionCount,
                    ];
                }
            }
        }

        $hasFailures = $legacyOnly !== []
            || $schemaOnly !== []
            || $sectionMismatches !== []
            || $renderTypeMismatches !== []
            || $requiredMismatches !== []
            || $readonlyMismatches !== []
            || $optionMismatches !== [];

        return [
            'status' => $hasFailures ? 'fail' : 'pass',
            'legacy_field_count' => count($legacyFields),
            'schema_field_count' => count($schemaFields),
            'legacy_only_fields' => $legacyOnly,
            'schema_only_fields' => $schemaOnly,
            'section_mismatches' => $sectionMismatches,
            'render_type_mismatches' => $renderTypeMismatches,
            'required_mismatches' => $requiredMismatches,
            'readonly_mismatches' => $readonlyMismatches,
            'option_mismatches' => $optionMismatches,
        ];
    }

    /**
     * @param array<string, mixed> $inventory
     * @param list<string> $ignoredLegacyFields
     * @return array<string, array<string, mixed>>
     */
    private function indexLegacyFields(array $inventory, array $ignoredLegacyFields): array
    {
        $ignored = array_fill_keys($ignoredLegacyFields, true);
        $fieldsByName = [];
        foreach (($inventory['fields'] ?? []) as $field) {
            $name = (string)($field['name'] ?? '');
            if ($name === '') {
                continue;
            }
            if (isset($ignored[$name])) {
                continue;
            }

            $fieldsByName[$name] = $field;
            $fieldsByName[$name]['name'] = $name;
        }

        return $fieldsByName;
    }

    /**
     * @param array<string, array<string, mixed>> $legacyFields
     * @param array<string, array<string, mixed>> $schemaFields
     * @param array<string, string> $sourceFieldMap
     * @return array<string, array<string, mixed>>
     */
    private function resolveLegacyAliasesAgainstSchema(array $legacyFields, array $schemaFields, array $sourceFieldMap): array
    {
        foreach ($sourceFieldMap as $left => $right) {
            $leftName = trim((string)$left);
            $rightName = trim((string)$right);
            if ($leftName === '' || $rightName === '') {
                continue;
            }

            if (isset($legacyFields[$leftName], $schemaFields[$rightName]) && !isset($schemaFields[$leftName])) {
                $legacyFields[$rightName] = $legacyFields[$leftName];
                $legacyFields[$rightName]['name'] = $rightName;
                unset($legacyFields[$leftName]);
                continue;
            }

            if (isset($legacyFields[$rightName], $schemaFields[$leftName]) && !isset($schemaFields[$rightName])) {
                $legacyFields[$leftName] = $legacyFields[$rightName];
                $legacyFields[$leftName]['name'] = $leftName;
                unset($legacyFields[$rightName]);
            }
        }

        return $legacyFields;
    }

    /**
     * @param array<string, mixed> $schema
     * @return array<string, array<string, mixed>>
     */
    private function indexSchemaFields(array $schema): array
    {
        $fieldsByName = [];
        foreach (($schema['sections'] ?? []) as $section) {
            $sectionKey = (string)($section['key'] ?? '');
            foreach (($section['fields'] ?? []) as $field) {
                $name = (string)($field['name'] ?? '');
                if ($name === '') {
                    continue;
                }

                $field['section_key'] = $sectionKey !== '' ? $sectionKey : null;
                $fieldsByName[$name] = $field;
            }
        }

        return $fieldsByName;
    }

    private function normalizeLegacyRenderType(string $renderType): string
    {
        $normalized = strtolower(trim($renderType));
        return $normalized !== '' ? $normalized : 'text';
    }

    private function normalizeSchemaRenderType(string $inputType): string
    {
        $normalized = strtolower(trim($inputType));
        return $normalized !== '' ? $normalized : 'text';
    }

    private function isRenderTypeCompatible(string $legacyRenderType, string $schemaRenderType): bool
    {
        if ($legacyRenderType === $schemaRenderType) {
            return true;
        }

        return $legacyRenderType === 'text'
            && in_array($schemaRenderType, ['text', 'number', 'date', 'datetime-local'], true);
    }

    /**
     * @param array<string, array<string, mixed>> $legacyFields
     */
    private function legacyHasSectionMetadata(array $legacyFields): bool
    {
        foreach ($legacyFields as $field) {
            $sectionKey = trim((string)($field['section_key'] ?? ''));
            if ($sectionKey !== '') {
                return true;
            }
        }

        return false;
    }
}
