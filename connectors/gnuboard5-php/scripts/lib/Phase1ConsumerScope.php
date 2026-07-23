<?php

/**
 * PHP OpenAPI 감사들이 공유하는 Phase 1 관리자 소비 범위를 제공합니다.
 *
 * @package  Gnuboard5\Audit
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Gnuboard5\Audit;

final class Phase1ConsumerScope
{
    private const SCHEMA = 'gnuboard5.php.openapi-consumer-scope/v1';

    /** @param array<string, mixed> $document */
    private function __construct(
        private readonly array $document,
        private readonly string $path,
        private readonly string $sha256
    ) {
    }

    public static function fromFile(string $path): self
    {
        $contents = file_get_contents($path);
        if (!is_string($contents)) {
            throw new \RuntimeException('consumer scope 파일을 읽을 수 없습니다: ' . $path);
        }
        $document = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($document) || ($document['schema'] ?? null) !== self::SCHEMA) {
            throw new \RuntimeException('지원하지 않는 consumer scope schema입니다: ' . $path);
        }
        foreach (['scope_id', 'contract'] as $stringKey) {
            if (!is_string($document[$stringKey] ?? null) || $document[$stringKey] === '') {
                throw new \RuntimeException('consumer scope 값이 올바르지 않습니다: ' . $stringKey);
            }
        }
        $active = $document['active_scope'] ?? null;
        if (!is_array($active)) {
            throw new \RuntimeException('consumer scope active_scope가 없습니다: ' . $path);
        }
        foreach (['include_path_prefixes', 'exclude_path_prefixes', 'include_operations'] as $listKey) {
            if (!is_array($active[$listKey] ?? null)) {
                throw new \RuntimeException('consumer scope 목록이 올바르지 않습니다: ' . $listKey);
            }
        }
        foreach (
            [
                'expected_admin_non_shop_operations',
                'expected_bootstrap_operations',
                'expected_total_operations',
            ] as $countKey
        ) {
            if (!is_int($active[$countKey] ?? null) || $active[$countKey] < 0) {
                throw new \RuntimeException('consumer scope count가 올바르지 않습니다: ' . $countKey);
            }
        }
        if (
            $active['expected_admin_non_shop_operations'] + $active['expected_bootstrap_operations']
            !== $active['expected_total_operations']
        ) {
            throw new \RuntimeException('consumer scope expected count 합계가 일치하지 않습니다.');
        }
        $bootstrapKeys = [];
        foreach ($active['include_operations'] as $operation) {
            if (
                !is_array($operation)
                || !is_string($operation['method'] ?? null)
                || $operation['method'] === ''
                || !is_string($operation['path'] ?? null)
                || !str_starts_with($operation['path'], '/')
            ) {
                throw new \RuntimeException('consumer scope include_operations 항목이 올바르지 않습니다.');
            }
            $bootstrapKeys[] = strtoupper($operation['method']) . ' ' . $operation['path'];
        }
        if (
            count(array_unique($bootstrapKeys)) !== count($bootstrapKeys)
            || count($bootstrapKeys) !== $active['expected_bootstrap_operations']
        ) {
            throw new \RuntimeException('consumer scope bootstrap operation count가 일치하지 않습니다.');
        }
        $inventory = $document['contract_inventory'] ?? null;
        if (
            !is_array($inventory)
            || !is_int($inventory['expected_total_operations'] ?? null)
            || $inventory['expected_total_operations'] < 0
            || !is_string($inventory['expected_operation_keys_sha256'] ?? null)
            || preg_match('/^[a-f0-9]{64}$/', $inventory['expected_operation_keys_sha256']) !== 1
            || !is_array($inventory['expected_classification_counts'] ?? null)
        ) {
            throw new \RuntimeException('consumer scope contract_inventory가 올바르지 않습니다.');
        }
        $classificationTotal = 0;
        foreach ($inventory['expected_classification_counts'] as $classification => $count) {
            if (!is_string($classification) || $classification === '' || !is_int($count) || $count < 0) {
                throw new \RuntimeException('consumer scope classification count가 올바르지 않습니다.');
            }
            $classificationTotal += $count;
        }
        if ($classificationTotal !== $inventory['expected_total_operations']) {
            throw new \RuntimeException('consumer scope contract inventory count 합계가 일치하지 않습니다.');
        }
        $deferred = $document['deferred_scope'] ?? null;
        if (!is_array($deferred) || ($deferred['hard_fail'] ?? null) !== false) {
            throw new \RuntimeException('consumer scope deferred_scope는 hard_fail=false여야 합니다.');
        }
        $classificationIds = [];
        foreach ($deferred['classifications'] ?? [] as $classification) {
            if (!is_array($classification) || !is_string($classification['id'] ?? null)) {
                throw new \RuntimeException('consumer scope deferred classification이 올바르지 않습니다.');
            }
            $classificationIds[] = $classification['id'];
            foreach (['include_paths', 'include_path_prefixes', 'expected_operations'] as $listKey) {
                if (isset($classification[$listKey]) && !is_array($classification[$listKey])) {
                    throw new \RuntimeException('consumer scope deferred 목록이 올바르지 않습니다: ' . $listKey);
                }
            }
            $expectedOperations = array_values(array_filter(
                $classification['expected_operations'] ?? [],
                static fn (mixed $operation): bool => is_string($operation) && str_contains($operation, ' /')
            ));
            if (count($expectedOperations) !== count($classification['expected_operations'] ?? [])) {
                throw new \RuntimeException('consumer scope expected_operations가 올바르지 않습니다.');
            }
            if (count(array_unique($expectedOperations)) !== count($expectedOperations)) {
                throw new \RuntimeException('consumer scope expected_operations에 중복이 있습니다.');
            }
            $classificationKey = 'deferred_' . $classification['id'];
            if (
                $expectedOperations !== []
                && ($inventory['expected_classification_counts'][$classificationKey] ?? null)
                    !== count($expectedOperations)
            ) {
                throw new \RuntimeException('consumer scope 보호 operation count가 일치하지 않습니다.');
            }
        }
        if (count(array_unique($classificationIds)) !== count($classificationIds)) {
            throw new \RuntimeException('consumer scope deferred classification id에 중복이 있습니다.');
        }
        return new self($document, $path, hash('sha256', $contents));
    }

    public function id(): string
    {
        return (string)$this->document['scope_id'];
    }

    public function path(): string
    {
        return $this->path;
    }

    public function contract(): string
    {
        return (string)$this->document['contract'];
    }

    public function assertContractPath(string $root, string $openapiPath): void
    {
        $contract = $this->contract();
        $contractPath = str_starts_with($contract, DIRECTORY_SEPARATOR)
            ? $contract
            : rtrim($root, DIRECTORY_SEPARATOR) . '/' . ltrim($contract, '/');
        $expected = realpath($contractPath);
        $actual = realpath($openapiPath);
        if ($expected === false || $actual === false || $expected !== $actual) {
            throw new \RuntimeException(sprintf(
                'consumer scope contract와 OpenAPI 경로가 일치하지 않습니다: contract=%s openapi=%s',
                $this->contract(),
                $openapiPath
            ));
        }
    }

    public function sha256(): string
    {
        return $this->sha256;
    }

    public function expectedAdminCount(): int
    {
        return (int)$this->activeScope()['expected_admin_non_shop_operations'];
    }

    public function expectedBootstrapCount(): int
    {
        return (int)$this->activeScope()['expected_bootstrap_operations'];
    }

    public function expectedTotalCount(): int
    {
        return (int)$this->activeScope()['expected_total_operations'];
    }

    public function expectedTotalContractCount(): int
    {
        return (int)$this->contractInventory()['expected_total_operations'];
    }

    /** @return array<string, int> */
    public function expectedClassificationCounts(): array
    {
        return $this->contractInventory()['expected_classification_counts'];
    }

    public function isActiveOperation(string $method, string $path): bool
    {
        $method = strtoupper($method);
        foreach ($this->activeScope()['include_operations'] ?? [] as $operation) {
            if (
                is_array($operation)
                && strtoupper((string)($operation['method'] ?? '')) === $method
                && (string)($operation['path'] ?? '') === $path
            ) {
                return true;
            }
        }
        foreach ($this->activeScope()['exclude_path_prefixes'] ?? [] as $prefix) {
            if (str_starts_with($path, (string)$prefix)) {
                return false;
            }
        }
        foreach ($this->activeScope()['include_path_prefixes'] ?? [] as $prefix) {
            if (str_starts_with($path, (string)$prefix)) {
                return true;
            }
        }
        return false;
    }

    public function isActiveOperationKey(string $operation): bool
    {
        [$method, $path] = self::splitOperation($operation);
        return $this->isActiveOperation($method, $path);
    }

    public function classifyOperationKey(string $operation): string
    {
        [$method, $path] = self::splitOperation($operation);
        if ($this->isActiveOperation($method, $path)) {
            return 'active';
        }
        foreach ($this->activeScope()['exclude_path_prefixes'] ?? [] as $prefix) {
            if (str_starts_with($path, (string)$prefix)) {
                return 'excluded_admin_shop';
            }
        }
        $deferred = $this->document['deferred_scope'] ?? [];
        foreach ($deferred['classifications'] ?? [] as $classification) {
            if (!is_array($classification)) {
                continue;
            }
            if (in_array($path, $classification['include_paths'] ?? [], true)) {
                return 'deferred_' . (string)($classification['id'] ?? 'unclassified');
            }
            foreach ($classification['include_path_prefixes'] ?? [] as $prefix) {
                if (str_starts_with($path, (string)$prefix)) {
                    return 'deferred_' . (string)($classification['id'] ?? 'unclassified');
                }
            }
        }
        return 'deferred_' . (string)($deferred['fallback_classification'] ?? 'unclassified');
    }

    /** @param list<string> $operations @return array<string, int> */
    public function operationCounts(array $operations): array
    {
        $active = 0;
        $bootstrap = 0;
        $deferred = 0;
        $excludedShop = 0;
        $classificationCounts = [];
        foreach ($operations as $operation) {
            $classification = $this->classifyOperationKey($operation);
            $classificationCounts[$classification] = ($classificationCounts[$classification] ?? 0) + 1;
            if ($classification === 'active') {
                $active++;
                if ($this->isBootstrapOperationKey($operation)) {
                    $bootstrap++;
                }
                continue;
            }
            if ($classification === 'excluded_admin_shop') {
                $excludedShop++;
                continue;
            }
            $deferred++;
        }
        return array_merge([
            'active' => $active,
            'admin_non_shop' => $active - $bootstrap,
            'bootstrap' => $bootstrap,
            'deferred' => $deferred,
            'excluded_admin_shop' => $excludedShop,
        ], $classificationCounts);
    }

    public function isProtectedOperationKey(string $operation): bool
    {
        return $this->classifyOperationKey($operation) === 'deferred_general_board';
    }

    /** @param list<string> $operations @return list<array<string, int|string>> */
    public function inventoryFindings(array $operations): array
    {
        $operations = array_values(array_unique(array_map('strval', $operations)));
        $findings = [];
        if (count($operations) !== $this->expectedTotalContractCount()) {
            $findings[] = [
                'rule' => 'contract_operation_count_mismatch',
                'expected' => $this->expectedTotalContractCount(),
                'actual' => count($operations),
            ];
        }
        $sortedOperations = $operations;
        sort($sortedOperations);
        $actualOperationHash = hash('sha256', implode("\n", $sortedOperations));
        $expectedOperationHash = (string)$this->contractInventory()['expected_operation_keys_sha256'];
        if (!hash_equals($expectedOperationHash, $actualOperationHash)) {
            $findings[] = [
                'rule' => 'contract_operation_set_mismatch',
                'expected' => $expectedOperationHash,
                'actual' => $actualOperationHash,
            ];
        }
        $counts = $this->operationCounts($operations);
        foreach ($this->expectedClassificationCounts() as $classification => $expected) {
            $actual = $counts[$classification] ?? 0;
            if ($actual !== $expected) {
                $findings[] = [
                    'rule' => 'contract_classification_count_mismatch',
                    'classification' => $classification,
                    'expected' => $expected,
                    'actual' => $actual,
                ];
            }
        }
        $actualLookup = array_fill_keys($operations, true);
        $protectedLookup = array_fill_keys($this->protectedOperationKeys(), true);
        foreach ($protectedLookup as $operation => $_) {
            if (!isset($actualLookup[$operation])) {
                $findings[] = [
                    'rule' => 'protected_operation_missing',
                    'operation' => $operation,
                ];
            }
        }
        foreach ($operations as $operation) {
            if (
                $this->classifyOperationKey($operation) === 'deferred_general_board'
                && !isset($protectedLookup[$operation])
            ) {
                $findings[] = [
                    'rule' => 'protected_operation_unexpected',
                    'operation' => $operation,
                ];
            }
        }
        return $findings;
    }

    /** @param list<string> $operations */
    public function assertExpectedCounts(array $operations): void
    {
        $counts = $this->operationCounts(array_values(array_map('strval', $operations)));
        $expected = [
            'active' => $this->expectedTotalCount(),
            'admin_non_shop' => $this->expectedAdminCount(),
            'bootstrap' => $this->expectedBootstrapCount(),
        ];
        foreach ($expected as $key => $expectedCount) {
            if ($counts[$key] !== $expectedCount) {
                throw new \RuntimeException(sprintf(
                    'consumer scope %s count mismatch: expected=%d actual=%d',
                    $key,
                    $expectedCount,
                    $counts[$key]
                ));
            }
        }
        $inventoryFindings = $this->inventoryFindings($operations);
        if ($inventoryFindings !== []) {
            throw new \RuntimeException((string)json_encode(
                $inventoryFindings[0],
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            ));
        }
    }

    /** @return array<string, mixed> */
    private function activeScope(): array
    {
        return $this->document['active_scope'];
    }

    /** @return array<string, mixed> */
    private function contractInventory(): array
    {
        return $this->document['contract_inventory'];
    }

    /** @return list<string> */
    private function protectedOperationKeys(): array
    {
        $operations = [];
        foreach ($this->document['deferred_scope']['classifications'] ?? [] as $classification) {
            if (!is_array($classification) || ($classification['id'] ?? null) !== 'general_board') {
                continue;
            }
            foreach ($classification['expected_operations'] ?? [] as $operation) {
                if (is_string($operation)) {
                    $operations[] = $operation;
                }
            }
        }
        return array_values(array_unique($operations));
    }

    public function isBootstrapOperationKey(string $operation): bool
    {
        [$method, $path] = self::splitOperation($operation);
        foreach ($this->activeScope()['include_operations'] ?? [] as $includedOperation) {
            if (
                is_array($includedOperation)
                && strtoupper((string)($includedOperation['method'] ?? '')) === $method
                && (string)($includedOperation['path'] ?? '') === $path
            ) {
                return true;
            }
        }
        return false;
    }

    /** @return array{string, string} */
    private static function splitOperation(string $operation): array
    {
        $separator = strpos($operation, ' ');
        if ($separator === false) {
            throw new \InvalidArgumentException('operation key 형식이 올바르지 않습니다: ' . $operation);
        }
        return [strtoupper(substr($operation, 0, $separator)), substr($operation, $separator + 1)];
    }
}
