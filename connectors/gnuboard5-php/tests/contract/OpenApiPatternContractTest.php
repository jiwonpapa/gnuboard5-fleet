<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

final class OpenApiPatternContractTest extends TestCase
{
    public function testDigitPatternsAreNotDoubleEscaped(): void
    {
        $document = Yaml::parseFile(__DIR__ . '/../../api/docs/openapi.yaml');
        $this->assertIsArray($document);

        $patterns = [];
        $this->collectPatterns($document, '$', $patterns);

        foreach ($patterns as $path => $pattern) {
            $this->assertStringNotContainsString(
                '\\\\d',
                $pattern,
                "OpenAPI pattern {$path} contains a double-escaped digit class"
            );
        }
    }

    public function testMailRuntimeDatetimesMatchTheirDeclaredPatterns(): void
    {
        $document = Yaml::parseFile(__DIR__ . '/../../api/docs/openapi.yaml');
        $this->assertIsArray($document);

        foreach (['AdminMailTemplate', 'AdminMailDetail', 'AdminMailRecipient'] as $schema) {
            $field = $schema === 'AdminMailRecipient' ? 'mb_datetime' : 'ma_time';
            $pattern = $document['components']['schemas'][$schema]['properties'][$field]['pattern'] ?? null;

            $this->assertIsString($pattern, "Missing datetime pattern on {$schema}");
            $this->assertSame(
                1,
                preg_match('/' . $pattern . '/D', '2026-07-22 10:36:17'),
                "Runtime MySQL datetime does not match {$schema}"
            );
        }
    }

    /**
     * @param array<mixed>         $value
     * @param array<string,string> $patterns
     */
    private function collectPatterns(array $value, string $path, array &$patterns): void
    {
        foreach ($value as $key => $child) {
            $childPath = $path . '.' . (string)$key;
            if ($key === 'pattern' && is_string($child)) {
                $patterns[$childPath] = $child;
                continue;
            }

            if (is_array($child)) {
                $this->collectPatterns($child, $childPath, $patterns);
            }
        }
    }
}
