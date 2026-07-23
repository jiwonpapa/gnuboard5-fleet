<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

abstract class ContractTestCase extends TestCase
{
    private const FIELD_PARITY_AUDIT = '/Users/neojins/workspace/gnuboard5/rust/specs/audits/2026-03-08-FIELD_PARITY_AUDIT.md';
    private const OPENAPI_PATH = __DIR__ . '/../../api/docs/openapi.yaml';

    /** @var array<int, string>|null */
    private static ?array $openApiLines = null;

    protected function assertResponseHasFields(array $response, array $requiredFields, string $context = ''): void
    {
        foreach ($requiredFields as $field) {
            $this->assertArrayHasKey(
                $field,
                $response,
                "Missing field '{$field}' in {$context} response"
            );
        }
    }

    protected function assertPaginationStructure(array $pagination): void
    {
        $required = ['total', 'page', 'per_page', 'last_page', 'has_next', 'has_prev'];
        $this->assertResponseHasFields($pagination, $required, 'pagination');
    }

    protected function assertPathExists(string $path): string
    {
        return $this->extractBlockForLine("  {$path}:", 2, "path {$path}");
    }

    protected function assertMethodExists(string $path, string $method): string
    {
        $pathBlock = $this->assertPathExists($path);
        return $this->extractChildBlock($pathBlock, "    {$method}:", 4, "{$method} {$path}");
    }

    protected function assertMethodHasOperationId(string $path, string $method, string $operationId): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $this->assertStringContainsString("operationId: {$operationId}", $methodBlock);
    }

    protected function assertMethodHasParameters(string $path, string $method, array $parameterNames): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        preg_match_all('/^\s*-\sname:\s([A-Za-z0-9_]+)/m', $methodBlock, $matches);
        $declared = $matches[1] ?? [];
        foreach ($parameterNames as $parameterName) {
            $this->assertContains($parameterName, $declared, "Missing parameter {$parameterName} on {$method} {$path}");
        }
    }

    protected function assertRequestBodyContainsProperties(string $path, string $method, array $properties): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        preg_match_all('/^\s{16,}([A-Za-z0-9_]+):$/m', $methodBlock, $matches);
        $declared = array_values(array_unique($matches[1] ?? []));
        foreach ($properties as $property) {
            $this->assertContains($property, $declared, "Missing request property {$property} on {$method} {$path}");
        }
    }

    protected function assertRequestBodyRequiredFields(string $path, string $method, array $requiredFields): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $declared = $this->extractRequiredFields($methodBlock);
        foreach ($requiredFields as $requiredField) {
            $this->assertContains($requiredField, $declared, "Missing required field {$requiredField} on {$method} {$path}");
        }
    }

    protected function assertRequestBodyAllowsAdditionalProperties(string $path, string $method): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $this->assertStringContainsString('additionalProperties: true', $methodBlock);
    }

    protected function assertRequestBodyUsesSchemaRef(string $path, string $method, string $component): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $this->assertStringContainsString("#/components/schemas/{$component}", $methodBlock);
    }

    protected function assertSchemaRequiredFields(string $schema, array $requiredFields): void
    {
        $document = Yaml::parseFile(self::OPENAPI_PATH);
        $declared = is_array($document)
            ? ($document['components']['schemas'][$schema]['required'] ?? [])
            : [];
        $this->assertIsArray($declared, "Schema {$schema} required must be an array");
        foreach ($requiredFields as $requiredField) {
            $this->assertContains($requiredField, $declared, "Missing required field {$requiredField} on schema {$schema}");
        }
    }

    protected function assertSchemaIsClosedObject(string $schema): void
    {
        $schemaBlock = $this->assertSchemaComponentExists($schema);
        $this->assertStringContainsString('type: object', $schemaBlock);
        $this->assertStringContainsString('additionalProperties: false', $schemaBlock);
    }

    protected function assertMethodResponseSchema(string $path, string $method, string $status, string $component): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $responsesBlock = $this->extractChildBlock($methodBlock, '      responses:', 6, "responses {$method} {$path}");
        $statusBlock = $this->extractChildBlock($responsesBlock, "        '{$status}':", 8, "response {$status} {$method} {$path}");
        $this->assertStringContainsString("#/components/schemas/{$component}", $statusBlock);
    }

    protected function assertMethodHasResponseStatus(string $path, string $method, string $status): void
    {
        $methodBlock = $this->assertMethodExists($path, $method);
        $responsesBlock = $this->extractChildBlock($methodBlock, '      responses:', 6, "responses {$method} {$path}");
        $this->assertStringContainsString("        '{$status}':", $responsesBlock, "Missing response {$status} on {$method} {$path}");
    }

    protected function assertComponentUsesSchemaRef(string $component, string $schema): void
    {
        $componentBlock = $this->assertSchemaComponentExists($component);
        $this->assertStringContainsString("#/components/schemas/{$schema}", $componentBlock);
    }

    protected function assertComponentArrayItemsUseSchemaRef(string $component, string $schema): void
    {
        $componentBlock = $this->assertSchemaComponentExists($component);
        $this->assertStringContainsString("items:\n            \$ref: '#/components/schemas/{$schema}'", $componentBlock);
    }

    protected function assertComponentHasPaginationRef(string $component): void
    {
        $componentBlock = $this->assertSchemaComponentExists($component);
        $this->assertStringContainsString("pagination:\n          \$ref: '#/components/schemas/Pagination'", $componentBlock);
    }

    protected function assertSchemaHasFields(string $schema, array $fields): void
    {
        $properties = array_fill_keys($this->resolvedSchemaPropertyNames($schema), true);
        foreach ($fields as $field) {
            $this->assertArrayHasKey($field, $properties, "Missing field {$field} on schema {$schema}");
        }
    }

    protected function assertResolvedSchemaHasFields(string $schema, array $fields): void
    {
        $properties = array_fill_keys($this->resolvedSchemaPropertyNames($schema), true);
        foreach ($fields as $field) {
            $this->assertArrayHasKey($field, $properties, "Missing resolved schema field {$field} on {$schema}");
        }
    }

    /** @return list<string> */
    protected function resolvedSchemaPropertyNames(string $schema): array
    {
        $document = Yaml::parseFile(self::OPENAPI_PATH);
        $properties = is_array($document)
            ? ($document['components']['schemas'][$schema]['properties'] ?? [])
            : [];
        $this->assertIsArray($properties, "Schema {$schema} properties must be an object");

        return array_values(array_map('strval', array_keys($properties)));
    }

    protected function assertSchemaFieldContains(string $schema, string $field, string $needle): void
    {
        $schemaBlock = $this->assertSchemaComponentExists($schema);
        $fieldBlock = $this->extractChildBlock($schemaBlock, "        {$field}:", 8, "field {$field} on schema {$schema}");
        $this->assertStringContainsString($needle, $fieldBlock, "Missing '{$needle}' on field {$field} of schema {$schema}");
    }

    protected function markLegacyParitySkipped(string $domain, array $legacyFields): void
    {
        $this->markTestSkipped(
            sprintf(
                'Legacy field parity for %s is still tracked in %s (%d fields pending).',
                $domain,
                self::FIELD_PARITY_AUDIT,
                count($legacyFields)
            )
        );
    }

    private function extractRequiredFields(string $block): array
    {
        preg_match_all('/required:\s*\[([^\]]+)\]/', $block, $matches);
        $fields = [];

        foreach ($matches[1] ?? [] as $list) {
            foreach (explode(',', $list) as $field) {
                $trimmed = trim($field, " \t\n\r\0\x0B'\"");
                if ($trimmed !== '') {
                    $fields[] = $trimmed;
                }
            }
        }

        return array_values(array_unique($fields));
    }

    private function assertSchemaComponentExists(string $component): string
    {
        return $this->extractBlockForLine("    {$component}:", 4, "schema component {$component}");
    }

    private function extractBlockForLine(string $needle, int $baseIndent, string $context): string
    {
        $lines = self::openApiLines();
        foreach ($lines as $index => $line) {
            if ($line !== $needle) {
                continue;
            }

            return $this->collectIndentedBlock($lines, $index, $baseIndent);
        }

        self::fail("Unable to find {$context} in OpenAPI document.");
    }

    private function extractChildBlock(string $parentBlock, string $needle, int $baseIndent, string $context): string
    {
        $lines = explode("\n", $parentBlock);
        foreach ($lines as $index => $line) {
            if ($line !== $needle) {
                continue;
            }

            return $this->collectIndentedBlock($lines, $index, $baseIndent);
        }

        self::fail("Unable to find {$context} in OpenAPI document.");
    }

    /**
     * @param array<int, string> $lines
     */
    private function collectIndentedBlock(array $lines, int $startIndex, int $baseIndent): string
    {
        $buffer = [$lines[$startIndex]];
        $lineCount = count($lines);

        for ($index = $startIndex + 1; $index < $lineCount; $index++) {
            $line = $lines[$index];
            $trimmed = trim($line);
            $indent = $this->indent($line);

            if ($trimmed !== '' && $indent <= $baseIndent) {
                break;
            }

            $buffer[] = $line;
        }

        return implode("\n", $buffer);
    }

    private function indent(string $line): int
    {
        return strlen($line) - strlen(ltrim($line, ' '));
    }

    /**
     * @return array<int, string>
     */
    private static function openApiLines(): array
    {
        if (self::$openApiLines !== null) {
            return self::$openApiLines;
        }

        $document = file_get_contents(self::OPENAPI_PATH);
        if ($document === false) {
            self::fail('Unable to read OpenAPI document.');
        }

        self::$openApiLines = explode("\n", $document);
        return self::$openApiLines;
    }
}
