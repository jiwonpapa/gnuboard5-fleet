<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

final class LegacyAdminFieldInventoryExtractor
{
    /**
     * @return array{
     *   section_count: int,
     *   field_count: int,
     *   sections: list<array{key: string, label: string}>,
     *   fields: list<array{
     *     name: string,
     *     label: string,
     *     section_key: string|null,
     *     section_label: string|null,
     *     render_type: string,
     *     required: bool,
     *     readonly: bool,
     *     disabled: bool,
     *     option_count: int,
     *     options: list<array{value: string, label: string}>
     *   }>
     * }
     */
    public function extract(string $html): array
    {
        $document = new DOMDocument();
        @$document->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        $xpath = new DOMXPath($document);

        $sections = $this->collectSections($xpath);
        $fieldsByName = [];
        $processedControlIds = [];

        /** @var DOMElement $row */
        foreach ($xpath->query('//tr[.//input or .//select or .//textarea]') ?: [] as $row) {
            $rowHeader = $this->cleanText($this->queryText($xpath, './th[1]', $row));
            $section = $this->findNearestSection($row, $sections);
            $labels = $this->buildLabelMap($xpath, $row);

            /** @var DOMElement $control */
            foreach ($xpath->query('.//input|.//select|.//textarea', $row) ?: [] as $control) {
                $processedControlIds[spl_object_id($control)] = true;
                $this->recordControl($xpath, $control, $fieldsByName, $section, $labels, $rowHeader, $row);
            }
        }

        /** @var DOMElement $control */
        foreach ($xpath->query('//input|//select|//textarea') ?: [] as $control) {
            if (isset($processedControlIds[spl_object_id($control)])) {
                continue;
            }

            $scope = $this->findStandaloneScope($control);
            $section = $this->findNearestSection($control, $sections);
            $labels = $this->buildLabelMap($xpath, $scope);
            $this->recordControl($xpath, $control, $fieldsByName, $section, $labels, '', $scope);
        }

        return [
            'section_count' => count($sections),
            'field_count' => count($fieldsByName),
            'sections' => array_values($sections),
            'fields' => array_values($fieldsByName),
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $fieldsByName
     * @param array{key: string|null, label: string|null} $section
     * @param array<string, string> $labels
     */
    private function recordControl(
        DOMXPath $xpath,
        DOMElement $control,
        array &$fieldsByName,
        array $section,
        array $labels,
        string $rowHeader,
        DOMElement $headerScope
    ): void {
        $rawName = trim((string)$control->getAttribute('name'));
        if ($rawName === '') {
            $rawName = trim((string)$control->getAttribute('id'));
        }
        if ($rawName === '') {
            return;
        }

        $name = $this->normalizeFieldName($rawName);
        if ($name === '') {
            return;
        }

        $renderType = $this->resolveRenderType($control);
        $id = trim((string)$control->getAttribute('id'));
        $fieldHeader = $this->resolveFieldHeader($control, $headerScope);
        $label = $labels[$id] ?? $labels[$rawName] ?? $labels[$name] ?? ($fieldHeader !== '' ? $fieldHeader : ($rowHeader !== '' ? $rowHeader : $name));

        $candidate = [
            'name' => $name,
            'label' => $label,
            'section_key' => $section['key'],
            'section_label' => $section['label'],
            'render_type' => $renderType,
            'required' => false,
            'readonly' => false,
            'disabled' => false,
            'option_count' => 0,
            'options' => [],
        ];
        $current = $fieldsByName[$name] ?? $candidate;

        if (isset($fieldsByName[$name]) && $this->fieldScore($candidate) > $this->fieldScore($current)) {
            $candidate['required'] = (bool)($current['required'] ?? false);
            $candidate['readonly'] = (bool)($current['readonly'] ?? false);
            $candidate['disabled'] = (bool)($current['disabled'] ?? false);
            $candidate['options'] = is_array($current['options'] ?? null) ? $current['options'] : [];
            $candidate['option_count'] = (int)($current['option_count'] ?? 0);
            if (trim((string)($candidate['label'] ?? '')) === '') {
                $candidate['label'] = $current['label'] ?? $label;
            }
            if (trim((string)($candidate['section_key'] ?? '')) === '') {
                $candidate['section_key'] = $current['section_key'] ?? null;
                $candidate['section_label'] = $current['section_label'] ?? null;
            } elseif (trim((string)($candidate['section_label'] ?? '')) === '') {
                $candidate['section_label'] = $current['section_label'] ?? null;
            }
            $current = $candidate;
        }

        $current['required'] = $current['required']
            || $control->hasAttribute('required')
            || str_contains($fieldHeader, '필수')
            || str_contains($rowHeader, '필수');
        $current['readonly'] = $current['readonly'] || $control->hasAttribute('readonly');
        $current['disabled'] = $current['disabled'] || $control->hasAttribute('disabled');
        $current['options'] = $this->mergeOptions(
            $current['options'],
            $this->extractOptions($xpath, $control, $labels, $rowHeader)
        );
        $current['option_count'] = count($current['options']);

        $fieldsByName[$name] = $current;
    }

    /**
     * @return array<string, array{key: string, label: string}>
     */
    private function collectSections(DOMXPath $xpath): array
    {
        $sections = [];

        /** @var DOMElement $section */
        foreach ($xpath->query('//section[@id]') ?: [] as $section) {
            $id = trim((string)$section->getAttribute('id'));
            if (!str_starts_with($id, 'anc_')) {
                continue;
            }

            $label = $this->cleanText(
                $this->queryText($xpath, './h1|./h2|./h3|.//caption[1]', $section)
            );

            $sections[$id] = [
                'key' => $id,
                'label' => $label !== '' ? $label : $id,
            ];
        }

        return $sections;
    }

    /**
     * @param array<string, array{key: string, label: string}> $sections
     * @return array{key: string|null, label: string|null}
     */
    private function findNearestSection(DOMNode $node, array $sections): array
    {
        $current = $node->parentNode;
        while ($current instanceof DOMElement) {
            $id = trim((string)$current->getAttribute('id'));
            if ($id !== '' && array_key_exists($id, $sections)) {
                return $sections[$id];
            }
            $current = $current->parentNode;
        }

        return ['key' => null, 'label' => null];
    }

    private function findStandaloneScope(DOMElement $control): DOMElement
    {
        $current = $control;
        while ($current->parentNode instanceof DOMElement) {
            $current = $current->parentNode;
            $tagName = strtolower($current->tagName);
            if (in_array($tagName, ['form', 'section', 'fieldset', 'div', 'li', 'p', 'td', 'body'], true)) {
                return $current;
            }
        }

        return $control;
    }

    /**
     * @return array<string, string>
     */
    private function buildLabelMap(DOMXPath $xpath, DOMElement $scope): array
    {
        $labels = [];

        /** @var DOMElement $label */
        foreach ($xpath->query('.//label[@for]', $scope) ?: [] as $label) {
            $key = trim((string)$label->getAttribute('for'));
            if ($key === '') {
                continue;
            }
            $labels[$key] = $this->cleanText($label->textContent);
        }

        return $labels;
    }

    private function resolveFieldHeader(DOMElement $control, DOMElement $row): string
    {
        $cell = $control;
        while ($cell->parentNode instanceof DOMElement && $cell->parentNode !== $row) {
            $cell = $cell->parentNode;
        }

        if (!($cell instanceof DOMElement) || $cell->parentNode !== $row) {
            return '';
        }

        if (strtolower($cell->tagName) === 'th') {
            return $this->cleanText($cell->textContent);
        }

        for ($sibling = $cell->previousSibling; $sibling !== null; $sibling = $sibling->previousSibling) {
            if ($sibling instanceof DOMElement && strtolower($sibling->tagName) === 'th') {
                return $this->cleanText($sibling->textContent);
            }
        }

        return '';
    }

    private function resolveRenderType(DOMElement $control): string
    {
        $tag = strtolower($control->tagName);
        if ($tag === 'select' || $tag === 'textarea') {
            return $tag;
        }

        $type = strtolower(trim((string)$control->getAttribute('type')));
        return $type !== '' ? $type : 'text';
    }

    /**
     * @param array<string, mixed> $field
     * @return array{int, int, int}
     */
    private function fieldScore(array $field): array
    {
        $renderType = strtolower(trim((string)($field['render_type'] ?? 'text')));
        return [
            $renderType !== 'hidden' ? 1 : 0,
            ((int)($field['option_count'] ?? 0)) > 0 ? 1 : 0,
            (!(bool)($field['readonly'] ?? false) && !(bool)($field['disabled'] ?? false)) ? 1 : 0,
        ];
    }

    private function normalizeFieldName(string $rawName): string
    {
        $normalized = preg_replace('/\[[^\]]*\]/', '', $rawName);
        return trim((string)$normalized);
    }

    /**
     * @param array<string, string> $labels
     * @return list<array{value: string, label: string}>
     */
    private function extractOptions(DOMXPath $xpath, DOMElement $control, array $labels, string $rowHeader): array
    {
        $renderType = $this->resolveRenderType($control);

        if ($renderType === 'select') {
            $options = [];
            /** @var DOMElement $option */
            foreach ($xpath->query('./option', $control) ?: [] as $option) {
                $options[] = [
                    'value' => (string)$option->getAttribute('value'),
                    'label' => $this->cleanText($option->textContent),
                ];
            }
            return $options;
        }

        if (!in_array($renderType, ['radio', 'checkbox'], true)) {
            return [];
        }

        $id = trim((string)$control->getAttribute('id'));
        $value = (string)$control->getAttribute('value');
        $label = $labels[$id] ?? ($value !== '' ? $value : $rowHeader);

        return [[
            'value' => $value,
            'label' => $this->cleanText($label),
        ]];
    }

    /**
     * @param list<array{value: string, label: string}> $left
     * @param list<array{value: string, label: string}> $right
     * @return list<array{value: string, label: string}>
     */
    private function mergeOptions(array $left, array $right): array
    {
        $merged = [];
        foreach (array_merge($left, $right) as $option) {
            $key = $option['value'] . '|' . $option['label'];
            $merged[$key] = $option;
        }

        return array_values($merged);
    }

    private function queryText(DOMXPath $xpath, string $query, DOMNode $context): string
    {
        $result = $xpath->query($query, $context);
        if ($result === false || $result->length === 0) {
            return '';
        }

        return (string)$result->item(0)?->textContent;
    }

    private function cleanText(string $value): string
    {
        $normalized = preg_replace('/\s+/u', ' ', html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        return trim((string)$normalized);
    }
}
