<?php

/**
 * OpenAPI operation을 실제 PHP handler 호출 graph와 필드 단위로 대조합니다.
 *
 * @package  Gnuboard5\Audit
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Gnuboard5\Audit;

use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar;
use PhpParser\Node\Stmt;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;
use Symfony\Component\Yaml\Yaml;

final class PhpAuditSourceIndex
{
    /** @var array<string, array<string, mixed>> */
    private array $classes = [];

    /** @var array<string, list<string>> */
    private array $shortNames = [];

    /** @var array<string, string> */
    private array $bindings = [];

    /** @var list<string> */
    private array $parseFailures = [];

    /** @var list<array<string, mixed>> */
    private array $closures = [];

    private string $sourceFingerprintSha256 = '';

    /** @param list<string> $sourceRoots */
    public function __construct(private readonly string $root, array $sourceRoots)
    {
        $parser = (new ParserFactory())->createForNewestSupportedVersion();
        $sourceFingerprints = [];
        foreach ($this->phpFiles($sourceRoots) as $path) {
            $source = file_get_contents($path);
            if (!is_string($source)) {
                $this->parseFailures[] = $this->relativePath($path) . ': unreadable';
                $sourceFingerprints[] = $this->relativePath($path) . ':unreadable';
                continue;
            }
            $sourceFingerprints[] = $this->relativePath($path) . ':' . hash('sha256', $source);
            try {
                $statements = $parser->parse($source) ?? [];
                $traverser = new NodeTraverser();
                $traverser->addVisitor(new NameResolver());
                $statements = $traverser->traverse($statements);
                $this->indexStatements($statements, $path);
            } catch (\Throwable $exception) {
                $this->parseFailures[] = $this->relativePath($path) . ': ' . $exception->getMessage();
            }
        }
        foreach ($this->shortNames as &$classes) {
            $classes = array_values(array_unique($classes));
            sort($classes);
        }
        unset($classes);
        sort($this->parseFailures);
        $this->sourceFingerprintSha256 = hash('sha256', implode("\n", $sourceFingerprints));
    }

    /** @return list<string> */
    public function parseFailures(): array
    {
        return $this->parseFailures;
    }

    public function sourceFingerprintSha256(): string
    {
        return $this->sourceFingerprintSha256;
    }

    public function resolveClass(?string $class): ?string
    {
        if (!is_string($class) || $class === '') {
            return null;
        }
        $normalized = ltrim($class, '\\');
        if (isset($this->classes[$normalized])) {
            return $normalized;
        }
        $bound = $this->bindings[$normalized] ?? null;
        if (is_string($bound) && $bound !== $normalized) {
            return $this->resolveClass($bound);
        }
        $short = str_contains($normalized, '\\')
            ? substr($normalized, (int)strrpos($normalized, '\\') + 1)
            : $normalized;
        $candidates = $this->shortNames[$short] ?? [];
        return count($candidates) === 1 ? $candidates[0] : null;
    }

    /** @return array<string, mixed>|null */
    public function class(string $class): ?array
    {
        $resolved = $this->resolveClass($class);
        return $resolved === null ? null : ($this->classes[$resolved] ?? null);
    }

    /** @return array<string, mixed>|null */
    public function method(string $class, string $method): ?array
    {
        $resolved = $this->resolveClass($class);
        $visited = [];
        while ($resolved !== null && !isset($visited[$resolved])) {
            $visited[$resolved] = true;
            $definition = $this->classes[$resolved] ?? null;
            if (!is_array($definition)) {
                return null;
            }
            if (isset($definition['methods'][$method])) {
                return $definition['methods'][$method];
            }
            $resolved = $this->resolveClass($definition['parent'] ?? null);
        }
        return null;
    }

    public function propertyType(string $class, string $property): ?string
    {
        $definition = $this->class($class);
        $type = $definition['properties'][$property] ?? null;
        return is_string($type) ? $this->resolveClass($type) : null;
    }

    public function methodReturnType(string $class, string $method): ?string
    {
        $definition = $this->method($class, $method);
        $type = is_array($definition) ? ($definition['return_type'] ?? null) : null;

        return is_string($type) ? $this->resolveClass($type) : null;
    }

    public function classConstant(string $class, string $constant): ?Expr
    {
        $resolved = $this->resolveClass($class);
        $visited = [];
        while ($resolved !== null && !isset($visited[$resolved])) {
            $visited[$resolved] = true;
            $definition = $this->classes[$resolved] ?? null;
            if (!is_array($definition)) {
                return null;
            }
            $value = $definition['constants'][$constant] ?? null;
            if ($value instanceof Expr) {
                return $value;
            }
            $resolved = $this->resolveClass($definition['parent'] ?? null);
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    public function closure(string $file, int $line): ?array
    {
        $matches = array_values(array_filter(
            $this->closures,
            static fn (array $closure): bool => $closure['file'] === $file
                && $closure['start_line'] <= $line
                && $closure['end_line'] >= $line
        ));
        usort(
            $matches,
            static fn (array $left, array $right): int =>
                ($left['end_line'] - $left['start_line']) <=> ($right['end_line'] - $right['start_line'])
        );
        return $matches[0] ?? null;
    }

    public function relativePath(string $path): string
    {
        $root = str_replace('\\', '/', rtrim($this->root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
        $normalized = str_replace('\\', '/', $path);
        return str_starts_with($normalized, $root)
            ? substr($normalized, strlen($root))
            : $normalized;
    }

    /** @param list<string> $sourceRoots @return list<string> */
    private function phpFiles(array $sourceRoots): array
    {
        $files = [];
        foreach ($sourceRoots as $relativeRoot) {
            $scanRoot = $this->root . '/' . trim($relativeRoot, '/');
            if (!is_dir($scanRoot)) {
                $this->parseFailures[] = trim($relativeRoot, '/') . ': source root missing';
                continue;
            }
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($scanRoot, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $entry) {
                if ($entry->isFile() && strtolower($entry->getExtension()) === 'php') {
                    $files[] = $entry->getPathname();
                }
            }
        }
        sort($files);
        return $files;
    }

    /** @param array<int, Node> $statements */
    private function indexStatements(array $statements, string $file): void
    {
        $walk = function (Node $node) use (&$walk, $file): void {
            if ($node instanceof Expr\Array_) {
                foreach ($node->items as $item) {
                    if (
                        $item === null
                        || !$item->key instanceof Expr\ClassConstFetch
                        || !$item->key->class instanceof Name
                        || !$item->key->name instanceof Node\Identifier
                        || strtolower($item->key->name->toString()) !== 'class'
                        || !$item->value instanceof Expr\FuncCall
                        || !$item->value->name instanceof Name
                        || strtolower(ltrim($item->value->name->toString(), '\\')) !== 'di\\autowire'
                    ) {
                        continue;
                    }
                    $argument = $item->value->getArgs()[0]->value ?? null;
                    if (
                        !$argument instanceof Expr\ClassConstFetch
                        || !$argument->class instanceof Name
                        || !$argument->name instanceof Node\Identifier
                        || strtolower($argument->name->toString()) !== 'class'
                    ) {
                        continue;
                    }
                    $abstraction = ltrim($item->key->class->toString(), '\\');
                    $concrete = ltrim($argument->class->toString(), '\\');
                    if ($abstraction !== '' && $concrete !== '') {
                        $this->bindings[$abstraction] = $concrete;
                    }
                }
            }
            if ($node instanceof Expr\Closure) {
                $parameters = [];
                foreach ($node->params as $parameter) {
                    $parameters[] = [
                        'name' => $parameter->var instanceof Expr\Variable && is_string($parameter->var->name)
                            ? $parameter->var->name
                            : '',
                        'type' => self::typeName($parameter->type),
                    ];
                }
                $this->closures[] = [
                    'file' => $this->relativePath($file),
                    'start_line' => $node->getStartLine(),
                    'end_line' => $node->getEndLine(),
                    'parameters' => $parameters,
                    'node' => $node,
                ];
            }
            if ($node instanceof Stmt\Class_) {
                $name = $node->namespacedName ?? $node->getAttribute('namespacedName');
                if (!$name instanceof Name) {
                    return;
                }
                $className = $name->toString();
                $properties = [];
                $methods = [];
                $constants = [];
                foreach ($node->getConstants() as $constantGroup) {
                    foreach ($constantGroup->consts as $constant) {
                        $constants[$constant->name->toString()] = $constant->value;
                    }
                }
                foreach ($node->getProperties() as $property) {
                    $type = self::typeName($property->type);
                    foreach ($property->props as $prop) {
                        if (is_string($type)) {
                            $properties[$prop->name->toString()] = $type;
                        }
                    }
                }
                foreach ($node->getMethods() as $method) {
                    $parameters = [];
                    foreach ($method->params as $parameter) {
                        $parameterName = $parameter->var instanceof Expr\Variable
                            && is_string($parameter->var->name)
                            ? $parameter->var->name
                            : '';
                        $parameterType = self::typeName($parameter->type);
                        $parameters[] = [
                            'name' => $parameterName,
                            'type' => $parameterType,
                        ];
                        if ($parameter->flags !== 0 && $parameterName !== '' && is_string($parameterType)) {
                            $properties[$parameterName] = $parameterType;
                        }
                    }
                    $methods[$method->name->toString()] = [
                        'class' => $className,
                        'name' => $method->name->toString(),
                        'return_type' => self::typeName($method->returnType),
                        'node' => $method,
                        'parameters' => $parameters,
                        'file' => $this->relativePath($file),
                        'line' => $method->getStartLine(),
                    ];
                }
                $constructor = $methods['__construct']['node'] ?? null;
                if ($constructor instanceof Stmt\ClassMethod) {
                    $parameterTypes = [];
                    foreach ($constructor->params as $parameter) {
                        if ($parameter->var instanceof Expr\Variable && is_string($parameter->var->name)) {
                            $parameterTypes[$parameter->var->name] = self::typeName($parameter->type);
                        }
                    }
                    foreach ($constructor->stmts ?? [] as $statement) {
                        if (!$statement instanceof Stmt\Expression || !$statement->expr instanceof Expr\Assign) {
                            continue;
                        }
                        $target = $statement->expr->var;
                        $value = $statement->expr->expr;
                        if (
                            $target instanceof Expr\PropertyFetch
                            && $target->var instanceof Expr\Variable
                            && $target->var->name === 'this'
                            && $target->name instanceof Node\Identifier
                            && $value instanceof Expr\Variable
                            && is_string($value->name)
                        ) {
                            $type = $parameterTypes[$value->name] ?? null;
                            if (is_string($type)) {
                                $properties[$target->name->toString()] = $type;
                            }
                        }
                    }
                }
                $parent = $node->extends instanceof Name ? $node->extends->toString() : null;
                $this->classes[$className] = [
                    'name' => $className,
                    'short_name' => $node->name?->toString(),
                    'file' => $this->relativePath($file),
                    'parent' => $parent,
                    'constants' => $constants,
                    'properties' => $properties,
                    'methods' => $methods,
                ];
                $short = $node->name?->toString();
                if (is_string($short) && $short !== '') {
                    $this->shortNames[$short][] = $className;
                }
                return;
            }
            foreach ($node->getSubNodeNames() as $name) {
                $child = $node->{$name};
                if ($child instanceof Node) {
                    $walk($child);
                } elseif (is_array($child)) {
                    foreach ($child as $item) {
                        if ($item instanceof Node) {
                            $walk($item);
                        }
                    }
                }
            }
        };
        foreach ($statements as $statement) {
            $walk($statement);
        }
    }

    private static function typeName(Node|string|null $type): ?string
    {
        if ($type instanceof Node\NullableType) {
            return self::typeName($type->type);
        }
        if ($type instanceof Name || $type instanceof Node\Identifier) {
            return $type->toString();
        }
        if ($type instanceof Node\UnionType || $type instanceof Node\IntersectionType) {
            foreach ($type->types as $candidate) {
                $name = self::typeName($candidate);
                if (is_string($name) && !in_array($name, ['null', 'array', 'string', 'int', 'bool', 'float'], true)) {
                    return $name;
                }
            }
        }
        return null;
    }
}

final class PhpFieldFlowAnalyzer
{
    private const INPUT_LOCATIONS = ['path', 'query', 'header', 'cookie', 'body'];
    private const MAX_STATIC_FOREACH_ITERATIONS = 512;

    public function __construct(private readonly PhpAuditSourceIndex $index)
    {
    }

    /** @return array<string, mixed> */
    public function analyze(string $handlerClass, string $handlerMethod): array
    {
        $class = $this->index->resolveClass($handlerClass);
        $method = $class === null ? null : $this->index->method($class, $handlerMethod);
        $state = [
            'reads' => [],
            'type_evidence' => [],
            'default_evidence' => [],
            'enum_evidence' => [],
            'dynamic_accesses' => [],
            'unresolved_calls' => [],
            'visited_methods' => [],
        ];
        if ($class === null || !is_array($method)) {
            return [
                ...$state,
                'handler_resolved' => false,
                'response_fields' => [],
            ];
        }

        $initial = [];
        foreach ($method['parameters'] as $parameter) {
            $name = (string)$parameter['name'];
            $type = (string)($parameter['type'] ?? '');
            if ($name === 'request' || str_ends_with($type, 'ServerRequestInterface')) {
                $initial[$name] = self::taint('request');
            } elseif ($name === 'args') {
                $initial[$name] = self::taint('path');
            } else {
                $initial[$name] = self::emptyInfo();
            }
        }
        $stack = [];
        $summary = $this->analyzeMethod($class, $handlerMethod, $initial, $state, $stack, 0);
        foreach (['reads', 'type_evidence', 'default_evidence', 'enum_evidence'] as $key) {
            ksort($state[$key]);
            foreach ($state[$key] as &$entries) {
                if (is_array($entries)) {
                    $entries = array_values(array_unique($entries, SORT_REGULAR));
                }
            }
            unset($entries);
        }
        foreach (['dynamic_accesses', 'unresolved_calls', 'visited_methods'] as $key) {
            $state[$key] = array_values(array_unique($state[$key], SORT_REGULAR));
        }
        $responseFields = array_values(array_unique($summary['fields']));
        sort($responseFields);
        return [
            ...$state,
            'handler_resolved' => true,
            'response_fields' => $responseFields,
        ];
    }

    /** @return array<string, mixed> */
    public function analyzeClosure(string $source, int $line): array
    {
        $closure = $this->index->closure($source, $line);
        $state = [
            'reads' => [],
            'type_evidence' => [],
            'default_evidence' => [],
            'enum_evidence' => [],
            'dynamic_accesses' => [],
            'unresolved_calls' => [],
            'visited_methods' => [],
        ];
        if (!is_array($closure) || !$closure['node'] instanceof Expr\Closure) {
            return [...$state, 'handler_resolved' => false, 'response_fields' => []];
        }
        $env = [];
        foreach ($closure['parameters'] as $parameter) {
            $name = (string)$parameter['name'];
            $type = (string)($parameter['type'] ?? '');
            $env[$name] = ($name === 'request' || str_ends_with($type, 'ServerRequestInterface'))
                ? self::taint('request')
                : ($name === 'args' ? self::taint('path') : self::emptyInfo());
        }
        $returns = self::emptyInfo();
        $stack = [];
        $state['visited_methods'][] = [
            'class' => null,
            'method' => '{closure}',
            'file' => $source,
            'line' => $closure['start_line'],
            'layer' => 'RouteClosure',
        ];
        $this->scanStatements(
            $closure['node']->stmts,
            $env,
            '@route:' . $source,
            $state,
            $stack,
            0,
            $returns
        );
        foreach (['reads', 'type_evidence', 'default_evidence', 'enum_evidence'] as $key) {
            ksort($state[$key]);
        }
        foreach (['dynamic_accesses', 'unresolved_calls', 'visited_methods'] as $key) {
            $state[$key] = array_values(array_unique($state[$key], SORT_REGULAR));
        }
        $fields = array_values(array_unique($returns['fields']));
        sort($fields);
        return [...$state, 'handler_resolved' => true, 'response_fields' => $fields];
    }

    /**
     * @param array<string, array<string, mixed>> $initial
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function analyzeMethod(
        string $class,
        string $methodName,
        array $initial,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $method = $this->index->method($class, $methodName);
        if (!is_array($method) || $depth > 14) {
            return self::emptyInfo();
        }
        $signature = $class . '::' . $methodName . ':' . hash('sha256', serialize($initial));
        if (isset($stack[$signature])) {
            return self::emptyInfo();
        }
        $stack[$signature] = true;
        $state['visited_methods'][] = [
            'class' => $class,
            'method' => $methodName,
            'file' => $method['file'],
            'line' => $method['line'],
            'layer' => self::layer($class),
        ];
        $env = $initial;
        $returns = self::emptyInfo();
        $node = $method['node'];
        if ($node instanceof Stmt\ClassMethod) {
            $this->scanStatements($node->stmts ?? [], $env, $class, $state, $stack, $depth, $returns);
        }
        unset($stack[$signature]);
        return $returns;
    }

    /**
     * @param array<int, Stmt> $statements
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @param array<string, mixed> $returns
     */
    private function scanStatements(
        array $statements,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth,
        array &$returns
    ): void {
        foreach ($statements as $statement) {
            if ($statement instanceof Stmt\Expression) {
                $this->evalExpr($statement->expr, $env, $class, $state, $stack, $depth);
                continue;
            }
            if ($statement instanceof Stmt\Return_) {
                if ($statement->expr instanceof Expr) {
                    $returns = self::mergeInfo(
                        $returns,
                        $this->evalExpr($statement->expr, $env, $class, $state, $stack, $depth)
                    );
                }
                continue;
            }
            if ($statement instanceof Stmt\If_) {
                $this->evalExpr($statement->cond, $env, $class, $state, $stack, $depth);
                $branches = [[$statement->stmts, $env]];
                foreach ($statement->elseifs as $elseif) {
                    $this->evalExpr($elseif->cond, $env, $class, $state, $stack, $depth);
                    $branches[] = [$elseif->stmts, $env];
                }
                if ($statement->else !== null) {
                    $branches[] = [$statement->else->stmts, $env];
                }
                foreach ($branches as [$branchStatements, $branchEnv]) {
                    $this->scanStatements(
                        $branchStatements,
                        $branchEnv,
                        $class,
                        $state,
                        $stack,
                        $depth,
                        $returns
                    );
                    $env = self::mergeEnv($env, $branchEnv);
                }
                continue;
            }
            if ($statement instanceof Stmt\Foreach_) {
                $iterable = $this->evalExpr($statement->expr, $env, $class, $state, $stack, $depth);
                $iterations = self::foreachIterations($iterable);
                if ($iterations !== []) {
                    $loopEnv = $env;
                    foreach ($iterations as $iteration) {
                        $iterationEnv = $env;
                        if ($statement->keyVar instanceof Expr\Variable && is_string($statement->keyVar->name)) {
                            $iterationEnv[$statement->keyVar->name] = $iteration['key'];
                        }
                        if ($statement->valueVar instanceof Expr\Variable && is_string($statement->valueVar->name)) {
                            $iterationEnv[$statement->valueVar->name] = $iteration['value'];
                        }
                        $this->scanStatements(
                            $statement->stmts,
                            $iterationEnv,
                            $class,
                            $state,
                            $stack,
                            $depth,
                            $returns
                        );
                        $loopEnv = self::mergeEnv($loopEnv, $iterationEnv);
                    }
                    $env = self::mergeEnv($env, $loopEnv);
                    continue;
                }
                $loopEnv = $env;
                if ($statement->valueVar instanceof Expr\Variable && is_string($statement->valueVar->name)) {
                    $loopEnv[$statement->valueVar->name] = self::iterableElementInfo($iterable);
                }
                $this->scanStatements(
                    $statement->stmts,
                    $loopEnv,
                    $class,
                    $state,
                    $stack,
                    $depth,
                    $returns
                );
                $env = self::mergeEnv($env, $loopEnv);
                continue;
            }
            if ($statement instanceof Stmt\TryCatch) {
                $tryEnv = $env;
                $this->scanStatements($statement->stmts, $tryEnv, $class, $state, $stack, $depth, $returns);
                foreach ($statement->catches as $catch) {
                    $catchEnv = $env;
                    $this->scanStatements($catch->stmts, $catchEnv, $class, $state, $stack, $depth, $returns);
                    $tryEnv = self::mergeEnv($tryEnv, $catchEnv);
                }
                if ($statement->finally !== null) {
                    $this->scanStatements(
                        $statement->finally->stmts,
                        $tryEnv,
                        $class,
                        $state,
                        $stack,
                        $depth,
                        $returns
                    );
                }
                $env = self::mergeEnv($env, $tryEnv);
                continue;
            }
            $this->scanGenericNode($statement, $env, $class, $state, $stack, $depth, $returns);
        }
    }

    /**
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function evalExpr(
        Expr $expression,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        if ($expression instanceof Expr\Variable && is_string($expression->name)) {
            return $env[$expression->name] ?? self::emptyInfo();
        }
        if ($expression instanceof Expr\Assign) {
            $info = $this->evalExpr($expression->expr, $env, $class, $state, $stack, $depth);
            if ($expression->var instanceof Expr\Variable && is_string($expression->var->name)) {
                $env[$expression->var->name] = $info;
            } elseif ($expression->var instanceof Expr\ArrayDimFetch) {
                $this->assignArrayField($expression->var, $info, $env);
            } else {
                $this->evalWritable($expression->var, $env, $class, $state, $stack, $depth);
            }
            return $info;
        }
        if ($expression instanceof Expr\ArrayDimFetch) {
            $base = $this->evalExpr($expression->var, $env, $class, $state, $stack, $depth);
            $key = self::dimensionKey($expression->dim, $env);
            $selected = self::emptyInfo();
            $hasAssignedMember = $key !== null && array_key_exists($key, $base['members']);
            $assignedMemberIsServerDerived = $hasAssignedMember && $base['members'][$key]['taints'] === [];
            if ($base['taints'] !== [] && !$assignedMemberIsServerDerived) {
                if ($key === null) {
                    $state['dynamic_accesses'][] = $this->locationRecord(
                        $class,
                        $expression,
                        'dynamic array key on request-derived value'
                    );
                } else {
                    $nextTaints = [];
                    foreach ($base['taints'] as $location => $prefixes) {
                        foreach ($prefixes as $prefix) {
                            $path = self::prefixField($prefix, $key);
                            $nextTaints[$location][] = $path;
                            if (in_array($location, self::INPUT_LOCATIONS, true)) {
                                $this->recordRead($state, $location, $path, $class, $expression);
                            }
                        }
                    }
                    $selected['taints'] = self::uniqueTaints($nextTaints);
                }
            }
            if ($key === null) {
                foreach ($base['members'] as $member) {
                    $selected = self::mergeInfo($selected, $member);
                }
                return self::mergeInfo($selected, [
                    'taints' => $base['taints'],
                    'fields' => [],
                    'literals' => $base['literals'],
                    'members' => [],
                ]);
            }
            if ($hasAssignedMember) {
                $selected = self::mergeInfo($selected, $base['members'][$key]);
            }
            if ($base['fields'] !== []) {
                $selected['fields'] = array_merge($selected['fields'], self::selectFields($base['fields'], $key));
            }
            return self::normalizeInfo($selected);
        }
        if ($expression instanceof Expr\Array_) {
            $info = self::emptyInfo();
            foreach ($expression->items as $item) {
                if ($item === null) {
                    continue;
                }
                $value = $this->evalExpr($item->value, $env, $class, $state, $stack, $depth);
                $key = self::literalString($item->key);
                $member = $key ?? '[]';
                $info['members'][$member] = isset($info['members'][$member])
                    ? self::mergeInfo($info['members'][$member], $value)
                    : $value;
                $info['fields'][] = $member;
                foreach ($value['fields'] as $field) {
                    $info['fields'][] = self::prefixField($member, $field);
                }
                $literal = self::literalValue($item->value);
                if ($literal !== self::NO_LITERAL) {
                    $info['literals'][] = $literal;
                }
            }
            return self::normalizeInfo($info);
        }
        if ($expression instanceof Expr\StaticCall) {
            return $this->evalStaticCall($expression, $env, $class, $state, $stack, $depth);
        }
        if ($expression instanceof Expr\MethodCall || $expression instanceof Expr\NullsafeMethodCall) {
            return $this->evalMethodCall($expression, $env, $class, $state, $stack, $depth);
        }
        if ($expression instanceof Expr\FuncCall) {
            return $this->evalFunctionCall($expression, $env, $class, $state, $stack, $depth);
        }
        if ($expression instanceof Expr\BinaryOp\Coalesce) {
            $left = $this->evalExpr($expression->left, $env, $class, $state, $stack, $depth);
            $right = $this->evalExpr($expression->right, $env, $class, $state, $stack, $depth);
            $default = self::literalValue($expression->right);
            if ($default !== self::NO_LITERAL) {
                $this->recordSemanticEvidence($state['default_evidence'], $left, $default, $class, $expression);
            }
            return self::mergeInfo($left, $right);
        }
        if ($expression instanceof Expr\Cast) {
            $inner = $this->evalExpr($expression->expr, $env, $class, $state, $stack, $depth);
            $type = match (true) {
                $expression instanceof Expr\Cast\Int_ => 'integer',
                $expression instanceof Expr\Cast\Double => 'number',
                $expression instanceof Expr\Cast\Bool_ => 'boolean',
                $expression instanceof Expr\Cast\String_ => 'string',
                $expression instanceof Expr\Cast\Array_ => 'array',
                default => 'mixed',
            };
            $this->recordDirectTaintReads($state, $inner, $class, $expression);
            $this->recordSemanticEvidence($state['type_evidence'], $inner, $type, $class, $expression);
            return $inner;
        }
        if ($expression instanceof Expr\Ternary) {
            $condition = $this->evalExpr($expression->cond, $env, $class, $state, $stack, $depth);
            $if = $expression->if instanceof Expr
                ? $this->evalExpr($expression->if, $env, $class, $state, $stack, $depth)
                : $condition;
            $else = $this->evalExpr($expression->else, $env, $class, $state, $stack, $depth);
            return self::mergeInfo($condition, $if, $else);
        }
        if ($expression instanceof Expr\Match_) {
            $info = $this->evalExpr($expression->cond, $env, $class, $state, $stack, $depth);
            foreach ($expression->arms as $arm) {
                $info = self::mergeInfo(
                    $info,
                    $this->evalExpr($arm->body, $env, $class, $state, $stack, $depth)
                );
            }
            return $info;
        }
        if ($expression instanceof Expr\PropertyFetch) {
            return self::emptyInfo();
        }
        if (
            $expression instanceof Expr\ClassConstFetch
            && $expression->class instanceof Name
            && $expression->name instanceof Node\Identifier
        ) {
            $className = strtolower($expression->class->toString());
            $targetClass = in_array($className, ['self', 'static'], true)
                ? $class
                : $this->index->resolveClass($expression->class->toString());
            if ($className === 'parent') {
                $definition = $this->index->class($class);
                $targetClass = is_array($definition) && is_string($definition['parent'] ?? null)
                    ? $definition['parent']
                    : null;
            }
            $constant = is_string($targetClass)
                ? $this->index->classConstant($targetClass, $expression->name->toString())
                : null;
            if ($constant instanceof Expr) {
                return $this->evalExpr($constant, $env, $class, $state, $stack, $depth);
            }
            return self::emptyInfo();
        }
        if ($expression instanceof Expr\ConstFetch || $expression instanceof Scalar) {
            $literal = self::literalValue($expression);
            $info = self::emptyInfo();
            if ($literal !== self::NO_LITERAL) {
                $info['literals'][] = $literal;
            }
            return $info;
        }
        return $this->evalGenericExpression($expression, $env, $class, $state, $stack, $depth);
    }

    private const NO_LITERAL = "\0__NO_LITERAL__\0";

    /**
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function evalStaticCall(
        Expr\StaticCall $call,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $method = $call->name instanceof Node\Identifier ? $call->name->toString() : null;
        $targetClass = null;
        if ($call->class instanceof Name) {
            $rawClass = strtolower($call->class->toString());
            $targetClass = in_array($rawClass, ['self', 'static'], true)
                ? $class
                : $this->index->resolveClass($call->class->toString());
            if ($rawClass === 'parent') {
                $definition = $this->index->class($class);
                $targetClass = is_array($definition) && is_string($definition['parent'] ?? null)
                    ? $definition['parent']
                    : null;
            }
        }
        $rawArguments = $call->getArgs();
        $arguments = $this->argumentInfos($rawArguments, $env, $class, $state, $stack, $depth);
        if ($method === 'parseJsonBody') {
            return self::taint('body');
        }
        $shortClass = $call->class instanceof Name ? $call->class->getLast() : '';
        if ($shortClass === 'ApiResponse' && $method === 'envelope') {
            $fields = ['data', 'meta', 'meta.server_time', 'meta.version'];
            foreach ($arguments[1]['fields'] ?? [] as $field) {
                $fields[] = self::prefixField('data', $field);
            }
            if (isset($rawArguments[2]) && self::literalValue($rawArguments[2]->value) !== null) {
                $fields[] = 'pagination';
                foreach ($arguments[2]['fields'] ?? [] as $field) {
                    $fields[] = 'pagination.' . $field;
                }
            }
            foreach ($arguments[3]['fields'] ?? [] as $field) {
                $fields[] = self::prefixField('meta', $field);
            }
            return self::infoWithFields($fields);
        }
        if ($shortClass === 'ApiResponse' && $method === 'json') {
            return self::infoWithFields($arguments[1]['fields'] ?? []);
        }
        if (
            $shortClass === 'AdminSmsInput'
            && in_array($method, ['toBool', 'boolToInt'], true)
            && isset($arguments[0])
        ) {
            $this->recordDirectTaintReads($state, $arguments[0], $class, $call);
            $this->recordSemanticEvidence($state['type_evidence'], $arguments[0], 'boolean', $class, $call);
        }
        if ($targetClass !== null && is_string($method) && $this->index->method($targetClass, $method) !== null) {
            return $this->callMethod($targetClass, $method, $arguments, $state, $stack, $depth + 1);
        }
        $this->recordHelperFieldRead($arguments, $rawArguments, $state, $class, $call);
        $this->recordUnresolvedTaintedCall($arguments, $state, $class, $call, $shortClass . '::' . (string)$method);
        return self::emptyInfo();
    }

    /**
     * @param Expr\MethodCall|Expr\NullsafeMethodCall $call
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function evalMethodCall(
        Expr $call,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $method = $call->name instanceof Node\Identifier ? $call->name->toString() : null;
        $receiver = $this->evalExpr($call->var, $env, $class, $state, $stack, $depth);
        $rawArguments = $call->getArgs();
        $arguments = $this->argumentInfos($rawArguments, $env, $class, $state, $stack, $depth);
        if (isset($receiver['taints']['request'])) {
            if ($method === 'getQueryParams') {
                return self::taint('query');
            }
            if ($method === 'getCookieParams') {
                return self::taint('cookie');
            }
            if ($method === 'getUploadedFiles') {
                return self::taint('body');
            }
            if ($method === 'getParsedBody') {
                return self::taint('body');
            }
            if ($method === 'getHeaderLine') {
                $field = isset($rawArguments[0]) ? self::literalString($rawArguments[0]->value) : null;
                if ($field !== null) {
                    $this->recordRead($state, 'header', $field, $class, $call);
                    return self::taint('header', $field);
                }
            }
            if ($method === 'getAttribute' || $method === 'getServerParams' || $method === 'getBody') {
                return self::emptyInfo();
            }
        }
        if (
            $receiver['taints'] !== []
            && in_array($method, [
                'getError',
                'getClientFilename',
                'getClientMediaType',
                'getSize',
                'getStream',
                'moveTo',
                'rewind',
                'eof',
                'read',
            ], true)
        ) {
            $this->recordDirectTaintReads($state, $receiver, $class, $call);
            $this->recordSemanticEvidence($state['type_evidence'], $receiver, 'string', $class, $call);
            return self::emptyInfo();
        }
        $targetClass = $this->receiverClass($call->var, $class);
        if ($targetClass !== null && is_string($method) && $this->index->method($targetClass, $method) !== null) {
            return $this->callMethod($targetClass, $method, $arguments, $state, $stack, $depth + 1);
        }
        if ($method === 'select' || $method === 'addSelect') {
            $fields = $receiver['fields'];
            foreach ($rawArguments as $argument) {
                $fields = array_merge($fields, self::selectArgumentFields($argument->value));
            }
            return self::infoWithFields($fields);
        }
        if (in_array($method, ['get', 'first', 'find', 'fetchAll', 'fetchAssociative'], true)) {
            return $receiver;
        }
        $this->recordHelperFieldRead($arguments, $rawArguments, $state, $class, $call);
        $this->recordUnresolvedTaintedCall($arguments, $state, $class, $call, (string)$method);
        return $receiver;
    }

    /**
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function evalFunctionCall(
        Expr\FuncCall $call,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $rawArguments = $call->getArgs();
        $arguments = $this->argumentInfos($rawArguments, $env, $class, $state, $stack, $depth);
        $name = $call->name instanceof Name ? strtolower($call->name->toString()) : '';
        if ($name === 'array_keys' && isset($arguments[0])) {
            $keys = array_values(array_filter(
                array_keys($arguments[0]['members']),
                static fn (string $key): bool => $key !== '[]'
            ));
            if ($keys !== []) {
                $info = self::emptyInfo();
                foreach ($keys as $key) {
                    $info = self::mergeInfo($info, self::infoWithLiteral($key));
                }
                return $info;
            }
        }
        if ($name === 'array_map' && isset($arguments[0], $arguments[1])) {
            $mapper = self::literalString($rawArguments[0]->value ?? null);
            $mappedType = match (strtolower((string)$mapper)) {
                'intval' => 'integer',
                'floatval', 'doubleval' => 'number',
                'boolval' => 'boolean',
                'strval' => 'string',
                default => null,
            };
            if ($mappedType !== null) {
                $element = self::iterableElementInfo($arguments[1]);
                $this->recordDirectTaintReads($state, $element, $class, $call);
                $this->recordSemanticEvidence($state['type_evidence'], $element, $mappedType, $class, $call);
            }
        }
        if ($name === 'in_array' && isset($arguments[0], $rawArguments[1])) {
            $values = self::arrayLiteralValues($rawArguments[1]->value);
            if ($values === []) {
                $values = $arguments[1]['literals'] ?? [];
            }
            if ($values !== []) {
                $this->recordDirectTaintReads($state, $arguments[0], $class, $call);
                $this->recordSemanticEvidence($state['enum_evidence'], $arguments[0], $values, $class, $call);
            }
        }
        $type = match ($name) {
            'trim', 'ltrim', 'rtrim', 'strtolower', 'strtoupper', 'strval' => 'string',
            'intval' => 'integer',
            'floatval', 'doubleval' => 'number',
            'boolval' => 'boolean',
            // PHP arrays encode both JSON arrays and JSON objects (associative arrays).
            'is_array' => 'php_array',
            'is_bool' => 'boolean',
            'is_float' => 'number',
            'is_int', 'is_integer' => 'integer',
            'is_string' => 'string',
            default => null,
        };
        if ($type !== null && isset($arguments[0])) {
            if (!str_starts_with($name, 'is_')) {
                $this->recordDirectTaintReads($state, $arguments[0], $class, $call);
            }
            $this->recordSemanticEvidence($state['type_evidence'], $arguments[0], $type, $class, $call);
        }
        return self::mergeInfo(...$arguments);
    }

    /**
     * @param list<array<string, mixed>> $arguments
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @return array<string, mixed>
     */
    private function callMethod(
        string $class,
        string $method,
        array $arguments,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $definition = $this->index->method($class, $method);
        if (!is_array($definition)) {
            return self::emptyInfo();
        }
        $initial = [];
        foreach ($definition['parameters'] as $index => $parameter) {
            $initial[(string)$parameter['name']] = $arguments[$index] ?? self::emptyInfo();
        }
        return $this->analyzeMethod($class, $method, $initial, $state, $stack, $depth);
    }

    /** @param array<int, Node\Arg> $args @return list<array<string, mixed>> */
    private function argumentInfos(
        array $args,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $result = [];
        foreach ($args as $argument) {
            $result[] = $this->evalExpr($argument->value, $env, $class, $state, $stack, $depth);
        }
        return $result;
    }

    private function evalWritable(
        Expr $expression,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): void {
        if ($expression instanceof Expr\ArrayDimFetch) {
            $this->evalExpr($expression, $env, $class, $state, $stack, $depth);
        }
    }

    /** @param array<string, array<string, mixed>> $env @param array<string, mixed> $value */
    private function assignArrayField(Expr\ArrayDimFetch $target, array $value, array &$env): void
    {
        if (!$target->var instanceof Expr\Variable || !is_string($target->var->name)) {
            return;
        }
        $container = $env[$target->var->name] ?? self::emptyInfo();
        $key = self::dimensionKey($target->dim, $env);
        $prefix = $key ?? '[]';
        $fields = [$prefix];
        foreach ($value['fields'] as $field) {
            $fields[] = self::prefixField($prefix, $field);
        }
        $container['fields'] = array_merge($container['fields'], $fields);
        $container['members'][$prefix] = isset($container['members'][$prefix])
            ? self::mergeInfo($container['members'][$prefix], $value)
            : $value;
        $env[$target->var->name] = self::normalizeInfo($container);
    }

    private function receiverClass(Expr $receiver, string $class): ?string
    {
        if ($receiver instanceof Expr\Variable && $receiver->name === 'this') {
            return $class;
        }
        if (
            $receiver instanceof Expr\PropertyFetch
            && $receiver->name instanceof Node\Identifier
        ) {
            $owner = $this->receiverClass($receiver->var, $class);
            return $owner === null ? null : $this->index->propertyType($owner, $receiver->name->toString());
        }
        if (
            ($receiver instanceof Expr\MethodCall || $receiver instanceof Expr\NullsafeMethodCall)
            && $receiver->name instanceof Node\Identifier
        ) {
            $owner = $this->receiverClass($receiver->var, $class);
            return $owner === null
                ? null
                : $this->index->methodReturnType($owner, $receiver->name->toString());
        }

        return null;
    }

    /**
     * @param array<string, array<string, mixed>> $env
     * @param array<string, mixed> $state
     * @param array<string, true> $stack
     * @param array<string, mixed> $returns
     */
    private function scanGenericNode(
        Node $node,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth,
        array &$returns
    ): void {
        foreach ($node->getSubNodeNames() as $name) {
            $child = $node->{$name};
            if ($child instanceof Expr) {
                $this->evalExpr($child, $env, $class, $state, $stack, $depth);
            } elseif ($child instanceof Stmt) {
                $this->scanStatements([$child], $env, $class, $state, $stack, $depth, $returns);
            } elseif (is_array($child)) {
                $statements = array_values(array_filter($child, static fn (mixed $item): bool => $item instanceof Stmt));
                if ($statements !== []) {
                    $this->scanStatements($statements, $env, $class, $state, $stack, $depth, $returns);
                }
            }
        }
    }

    private function evalGenericExpression(
        Expr $expression,
        array &$env,
        string $class,
        array &$state,
        array &$stack,
        int $depth
    ): array {
        $info = self::emptyInfo();
        foreach ($expression->getSubNodeNames() as $name) {
            $child = $expression->{$name};
            if ($child instanceof Expr) {
                $info = self::mergeInfo(
                    $info,
                    $this->evalExpr($child, $env, $class, $state, $stack, $depth)
                );
            } elseif (is_array($child)) {
                foreach ($child as $item) {
                    if ($item instanceof Expr) {
                        $info = self::mergeInfo(
                            $info,
                            $this->evalExpr($item, $env, $class, $state, $stack, $depth)
                        );
                    }
                }
            }
        }
        return $info;
    }

    /** @param array<string, mixed> $state */
    private function recordRead(array &$state, string $location, string $path, string $class, Node $node): void
    {
        $state['reads'][$location . ':' . $path][] = $this->locationRecord($class, $node, null);
    }

    /** @param array<string, mixed> $state @param array<string, mixed> $info */
    private function recordDirectTaintReads(array &$state, array $info, string $class, Node $node): void
    {
        foreach ($info['taints'] as $location => $paths) {
            if (!in_array($location, self::INPUT_LOCATIONS, true)) {
                continue;
            }
            foreach ($paths as $path) {
                if ($path !== '') {
                    $this->recordRead($state, $location, $path, $class, $node);
                }
            }
        }
    }

    /** @param array<string, mixed> $bucket @param array<string, mixed> $info */
    private function recordSemanticEvidence(
        array &$bucket,
        array $info,
        mixed $value,
        string $class,
        Node $node
    ): void {
        foreach ($info['taints'] as $location => $paths) {
            if (!in_array($location, self::INPUT_LOCATIONS, true)) {
                continue;
            }
            foreach ($paths as $path) {
                if ($path === '') {
                    continue;
                }
                $bucket[$location . ':' . $path][] = [
                    'value' => $value,
                    ...$this->locationRecord($class, $node, null),
                ];
            }
        }
    }

    /**
     * @param list<array<string, mixed>> $arguments
     * @param array<int, Node\Arg> $rawArguments
     * @param array<string, mixed> $state
     */
    private function recordHelperFieldRead(
        array $arguments,
        array $rawArguments,
        array &$state,
        string $class,
        Node $node
    ): void {
        foreach ($arguments as $index => $info) {
            if ($info['taints'] === []) {
                continue;
            }
            $next = $rawArguments[$index + 1]->value ?? null;
            $field = self::literalString($next);
            if ($field === null) {
                continue;
            }
            foreach ($info['taints'] as $location => $prefixes) {
                if (!in_array($location, self::INPUT_LOCATIONS, true)) {
                    continue;
                }
                foreach ($prefixes as $prefix) {
                    $path = $prefix === '' ? $field : $prefix . '.' . $field;
                    $this->recordRead($state, $location, $path, $class, $node);
                }
            }
        }
    }

    /** @param list<array<string, mixed>> $arguments @param array<string, mixed> $state */
    private function recordUnresolvedTaintedCall(
        array $arguments,
        array &$state,
        string $class,
        Node $node,
        string $call
    ): void {
        $containsUnresolvedContainer = false;
        foreach ($arguments as $info) {
            foreach ($info['taints'] as $paths) {
                if (in_array('', $paths, true)) {
                    $containsUnresolvedContainer = true;
                }
            }
        }
        if (!$containsUnresolvedContainer) {
            return;
        }
        $state['unresolved_calls'][] = [
            'call' => $call,
            ...$this->locationRecord($class, $node, 'request-derived value reaches unresolved call'),
        ];
    }

    /** @return array<string, mixed> */
    private function locationRecord(string $class, Node $node, ?string $reason): array
    {
        $definition = $this->index->class($class);
        $record = [
            'file' => $definition['file'] ?? (str_starts_with($class, '@route:') ? substr($class, 7) : null),
            'line' => $node->getStartLine(),
            'layer' => self::layer($class),
        ];
        if ($reason !== null) {
            $record['reason'] = $reason;
        }
        return $record;
    }

    private static function layer(string $class): string
    {
        foreach (['Controller', 'Service', 'Repository', 'Support', 'Dto', 'Response'] as $layer) {
            if (str_contains($class, '\\' . $layer . '\\')) {
                return $layer;
            }
        }
        return 'Other';
    }

    /** @return array<string, mixed> */
    private static function emptyInfo(): array
    {
        return ['taints' => [], 'fields' => [], 'literals' => [], 'members' => []];
    }

    /** @return array<string, mixed> */
    private static function taint(string $location, string $path = ''): array
    {
        return ['taints' => [$location => [$path]], 'fields' => [], 'literals' => [], 'members' => []];
    }

    /** @param list<string> $fields @return array<string, mixed> */
    private static function infoWithFields(array $fields): array
    {
        return self::normalizeInfo(['taints' => [], 'fields' => $fields, 'literals' => [], 'members' => []]);
    }

    /** @return array<string, mixed> */
    private static function infoWithLiteral(mixed $literal): array
    {
        return self::normalizeInfo(['taints' => [], 'fields' => [], 'literals' => [$literal], 'members' => []]);
    }

    /** @param array<string, mixed> ...$infos @return array<string, mixed> */
    private static function mergeInfo(array ...$infos): array
    {
        $merged = self::emptyInfo();
        foreach ($infos as $info) {
            foreach ($info['taints'] ?? [] as $location => $paths) {
                $merged['taints'][$location] = array_merge($merged['taints'][$location] ?? [], $paths);
            }
            $merged['fields'] = array_merge($merged['fields'], $info['fields'] ?? []);
            $merged['literals'] = array_merge($merged['literals'], $info['literals'] ?? []);
            foreach ($info['members'] ?? [] as $key => $member) {
                $merged['members'][$key] = isset($merged['members'][$key])
                    ? self::mergeInfo($merged['members'][$key], $member)
                    : $member;
            }
        }
        return self::normalizeInfo($merged);
    }

    /** @param array<string, mixed> $info @return array<string, mixed> */
    private static function normalizeInfo(array $info): array
    {
        $info['taints'] = self::uniqueTaints($info['taints'] ?? []);
        $info['fields'] = array_values(array_unique(array_filter(
            $info['fields'] ?? [],
            static fn (mixed $field): bool => is_string($field) && $field !== ''
        )));
        sort($info['fields']);
        $info['literals'] = array_values(array_unique($info['literals'] ?? [], SORT_REGULAR));
        $info['members'] = $info['members'] ?? [];
        foreach ($info['members'] as $key => $member) {
            if (!is_string($key) || !is_array($member)) {
                unset($info['members'][$key]);
                continue;
            }
            $info['members'][$key] = self::normalizeInfo($member);
        }
        ksort($info['members']);
        return $info;
    }

    /** @param array<string, list<string>> $taints @return array<string, list<string>> */
    private static function uniqueTaints(array $taints): array
    {
        foreach ($taints as &$paths) {
            $paths = array_values(array_unique($paths));
            sort($paths);
        }
        unset($paths);
        ksort($taints);
        return $taints;
    }

    /**
     * @param array<string, array<string, mixed>> ...$environments
     * @return array<string, array<string, mixed>>
     */
    private static function mergeEnv(array ...$environments): array
    {
        $result = [];
        foreach ($environments as $environment) {
            foreach ($environment as $name => $info) {
                $result[$name] = isset($result[$name]) ? self::mergeInfo($result[$name], $info) : $info;
            }
        }
        return $result;
    }

    /**
     * @param array<string, mixed> $iterable
     * @return list<array{key: array<string, mixed>, value: array<string, mixed>}>
     */
    private static function foreachIterations(array $iterable): array
    {
        $namedMembers = array_filter(
            $iterable['members'],
            static fn (string $key): bool => $key !== '[]',
            ARRAY_FILTER_USE_KEY
        );
        if ($namedMembers !== [] && count($namedMembers) <= self::MAX_STATIC_FOREACH_ITERATIONS) {
            $iterations = [];
            foreach ($namedMembers as $key => $value) {
                $iterations[] = ['key' => self::infoWithLiteral($key), 'value' => $value];
            }
            return $iterations;
        }

        if ($iterable['taints'] !== []) {
            return [];
        }
        $literals = $iterable['literals'];
        if ($literals === [] || count($literals) > self::MAX_STATIC_FOREACH_ITERATIONS) {
            return [];
        }
        $iterations = [];
        foreach ($literals as $index => $literal) {
            $iterations[] = [
                'key' => self::infoWithLiteral($index),
                'value' => self::infoWithLiteral($literal),
            ];
        }
        return $iterations;
    }

    /** @param array<string, mixed> $iterable @return array<string, mixed> */
    private static function iterableElementInfo(array $iterable): array
    {
        $element = $iterable['members']['[]'] ?? self::emptyInfo();
        $nextTaints = [];
        foreach ($iterable['taints'] as $location => $prefixes) {
            foreach ($prefixes as $prefix) {
                $nextTaints[$location][] = $prefix === '' ? '[]' : $prefix . '[]';
            }
        }
        $selectedFields = self::selectFields($iterable['fields'], '[]');

        return self::mergeInfo($element, [
            'taints' => self::uniqueTaints($nextTaints),
            'fields' => $selectedFields,
            'literals' => [],
            'members' => [],
        ]);
    }

    /** @param list<string> $fields @return list<string> */
    private static function selectFields(array $fields, string $key): array
    {
        $result = [];
        foreach ($fields as $field) {
            if ($field === $key) {
                continue;
            }
            foreach ([$key . '.', $key . '[].'] as $prefix) {
                if (str_starts_with($field, $prefix)) {
                    $result[] = substr($field, strlen($prefix));
                }
            }
        }
        return array_values(array_unique($result));
    }

    private static function prefixField(string $prefix, string $field): string
    {
        if ($prefix === '') {
            return $field;
        }
        return str_starts_with($field, '[]') ? $prefix . $field : $prefix . '.' . $field;
    }

    private static function literalString(Node|Expr|null $node): ?string
    {
        return $node instanceof Scalar\String_ ? $node->value : null;
    }

    /** @param array<string, array<string, mixed>> $env */
    private static function dimensionKey(Node|Expr|null $node, array $env): ?string
    {
        if ($node instanceof Scalar\Int_) {
            return '[]';
        }
        $literal = self::literalString($node);
        if ($literal !== null) {
            return $literal;
        }
        if (!$node instanceof Expr\Variable || !is_string($node->name)) {
            return null;
        }
        $literals = $env[$node->name]['literals'] ?? [];
        if (count($literals) !== 1) {
            return null;
        }
        if (is_int($literals[0])) {
            return '[]';
        }
        if (!is_string($literals[0]) || $literals[0] === '') {
            return null;
        }
        return $literals[0];
    }

    private static function literalValue(Node|Expr|null $node): mixed
    {
        if ($node instanceof Scalar\String_ || $node instanceof Scalar\Int_ || $node instanceof Scalar\Float_) {
            return $node->value;
        }
        if ($node instanceof Expr\ConstFetch) {
            return match (strtolower($node->name->toString())) {
                'null' => null,
                'true' => true,
                'false' => false,
                default => self::NO_LITERAL,
            };
        }
        return self::NO_LITERAL;
    }

    /** @return list<mixed> */
    private static function arrayLiteralValues(Node|Expr|null $node): array
    {
        if (!$node instanceof Expr\Array_) {
            return [];
        }
        $values = [];
        foreach ($node->items as $item) {
            if ($item === null) {
                continue;
            }
            $value = self::literalValue($item->value);
            if ($value !== self::NO_LITERAL) {
                $values[] = $value;
            }
        }
        return $values;
    }

    /** @return list<string> */
    private static function selectArgumentFields(Node|Expr $node): array
    {
        $values = $node instanceof Expr\Array_ ? self::arrayLiteralValues($node) : [self::literalValue($node)];
        $fields = [];
        foreach ($values as $value) {
            if (!is_string($value)) {
                continue;
            }
            foreach (preg_split('/\s*,\s*/', $value) ?: [] as $part) {
                $part = trim($part);
                if ($part === '' || $part === '*') {
                    continue;
                }
                if (preg_match('/\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i', $part, $match) === 1) {
                    $fields[] = $match[1];
                    continue;
                }
                $part = preg_replace('/^[A-Za-z_][A-Za-z0-9_]*\./', '', $part) ?? $part;
                if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $part) === 1) {
                    $fields[] = $part;
                }
            }
        }
        return array_values(array_unique($fields));
    }
}

final class OpenApiFieldBindingAudit
{
    private const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

    /** @return array<string, mixed> */
    public static function run(
        string $root,
        string $openapiPath,
        string $runtimeGraphPath,
        string $policyPath
    ): array {
        $policy = json_decode((string)file_get_contents($policyPath), true, 512, JSON_THROW_ON_ERROR);
        if (($policy['schema'] ?? null) !== 'gnuboard5.php.openapi-field-binding-policy/v1') {
            throw new \RuntimeException('지원하지 않는 field binding policy schema입니다.');
        }
        $consumerScopeConfig = $policy['consumer_scope'] ?? null;
        if (!is_string($consumerScopeConfig) || $consumerScopeConfig === '') {
            throw new \RuntimeException('field binding policy consumer_scope가 없습니다.');
        }
        $consumerScopePath = str_starts_with($consumerScopeConfig, DIRECTORY_SEPARATOR)
            ? $consumerScopeConfig
            : $root . '/' . ltrim($consumerScopeConfig, '/');
        $consumerScope = Phase1ConsumerScope::fromFile($consumerScopePath);
        $consumerScope->assertContractPath($root, $openapiPath);
        $runtime = json_decode((string)file_get_contents($runtimeGraphPath), true, 512, JSON_THROW_ON_ERROR);
        if (($runtime['schema'] ?? null) !== 'gnuboard5.php.runtime-route-graph/v3') {
            throw new \RuntimeException('runtime route graph v3가 필요합니다.');
        }
        $document = Yaml::parseFile($openapiPath);
        if (!is_array($document)) {
            throw new \RuntimeException('OpenAPI 문서를 읽을 수 없습니다.');
        }
        $index = new PhpAuditSourceIndex($root, $policy['source_roots'] ?? []);
        $analyzer = new PhpFieldFlowAnalyzer($index);
        $operations = self::openapiOperations($document);
        $bindings = [];
        foreach ($runtime['bindings'] ?? [] as $binding) {
            if (is_array($binding) && is_string($binding['operation'] ?? null)) {
                $bindings[$binding['operation']] = $binding;
            }
        }
        $activeKeys = array_values(array_filter(
            array_keys($operations),
            static fn (string $key): bool => $consumerScope->isActiveOperationKey($key)
        ));
        sort($activeKeys);
        $protectedKeys = array_values(array_filter(
            array_keys($operations),
            static fn (string $key): bool => $consumerScope->isProtectedOperationKey($key)
        ));
        sort($protectedKeys);
        $auditedKeys = array_values(array_unique(array_merge($activeKeys, $protectedKeys)));
        sort($auditedKeys);
        $scopeCounts = $consumerScope->operationCounts(array_keys($operations));
        $bootstrapCount = $scopeCounts['bootstrap'];
        $adminCount = $scopeCounts['admin_non_shop'];
        $operationReports = [];
        $findings = [];
        foreach ($auditedKeys as $key) {
            $operation = $operations[$key];
            $binding = $bindings[$key] ?? null;
            $handlerClass = is_array($binding) ? ($binding['handler_class'] ?? null) : null;
            $handlerMethod = is_array($binding) ? ($binding['handler_method'] ?? null) : null;
            $flow = (($binding['handler_kind'] ?? null) === 'route_closure_static_call')
                && is_string($binding['source'] ?? null)
                && is_int($binding['line'] ?? null)
                ? $analyzer->analyzeClosure($binding['source'], $binding['line'])
                : (is_string($handlerClass) && is_string($handlerMethod)
                ? $analyzer->analyze($handlerClass, $handlerMethod)
                : [
                    'handler_resolved' => false,
                    'reads' => [],
                    'type_evidence' => [],
                    'default_evidence' => [],
                    'enum_evidence' => [],
                    'dynamic_accesses' => [],
                    'unresolved_calls' => [],
                    'visited_methods' => [],
                    'response_fields' => [],
                ]);
            $expectedRequest = self::requestFields($document, $operation['path_item'], $operation['operation']);
            $expectedResponse = self::responseFields($document, $operation['operation']);
            $actualReads = array_keys($flow['reads']);
            sort($actualReads);
            $expectedRequestKeys = array_keys($expectedRequest);
            sort($expectedRequestKeys);
            $missingRequest = array_values(array_diff($expectedRequestKeys, $actualReads));
            $extraRequest = array_values(array_filter(
                array_diff($actualReads, $expectedRequestKeys),
                static fn (string $field): bool => !self::isDerivedFromDeclaredScalar($field, $expectedRequest)
            ));
            $requiredExpectedResponseKeys = array_keys(array_filter(
                $expectedResponse,
                static fn (array $semantics): bool => ($semantics['required'] ?? false) === true
            ));
            $actualResponseKeys = array_map(
                static fn (string $field): string => str_replace('[]', '', $field),
                $flow['response_fields']
            );
            $normalizedExpectedResponse = array_map(
                static fn (string $field): string => str_replace('[]', '', $field),
                $requiredExpectedResponseKeys
            );
            $missingResponse = [];
            foreach ($normalizedExpectedResponse as $indexKey => $field) {
                if (!in_array($field, $actualResponseKeys, true)) {
                    $missingResponse[] = $requiredExpectedResponseKeys[$indexKey];
                }
            }
            $comparison = is_array($policy['comparison'] ?? null) ? $policy['comparison'] : [];
            $semanticUnproven = self::semanticUnproven($expectedRequest, $flow, $comparison);
            $observedLayers = array_values(array_unique(array_map(
                static fn (array $visit): string => (string)($visit['layer'] ?? 'Unknown'),
                $flow['visited_methods']
            )));
            sort($observedLayers);
            $requiredLayers = $policy['required_layer_overrides'][$key]
                ?? $policy['required_layers']
                ?? [];
            $requiredLayers = array_values(array_filter(
                $requiredLayers,
                static fn (mixed $layer): bool => is_string($layer) && $layer !== ''
            ));
            sort($requiredLayers);
            $missingRequiredLayers = array_values(array_diff($requiredLayers, $observedLayers));
            $operationFindings = [];
            if (
                ($comparison['require_operation_id'] ?? true)
                && (!is_string($operation['operation_id']) || $operation['operation_id'] === '')
            ) {
                $operationFindings[] = 'operation_id_missing';
            }
            if (!is_array($binding)) {
                $operationFindings[] = 'runtime_binding_missing';
            }
            if (
                ($comparison['require_handler_source'] ?? true)
                && (!is_array($binding) || !is_string($binding['handler_source'] ?? null))
            ) {
                $operationFindings[] = 'handler_source_missing';
            }
            if (($flow['handler_resolved'] ?? false) !== true) {
                $operationFindings[] = 'handler_source_unresolved';
            }
            if (($comparison['require_request_field_binding'] ?? true) && $missingRequest !== []) {
                $operationFindings[] = 'request_fields_unbound';
            }
            if ($extraRequest !== []) {
                $operationFindings[] = 'implementation_fields_undocumented';
            }
            if (($comparison['require_success_response_field_binding'] ?? true) && $missingResponse !== []) {
                $operationFindings[] = 'response_fields_unbound';
            }
            if (
                ($comparison['require_no_dynamic_input_access'] ?? true)
                && ($flow['dynamic_accesses'] ?? []) !== []
            ) {
                $operationFindings[] = 'dynamic_input_access';
            }
            if (($flow['unresolved_calls'] ?? []) !== []) {
                $operationFindings[] = 'tainted_call_unresolved';
            }
            if ($semanticUnproven !== []) {
                $operationFindings[] = 'request_semantics_unproven';
            }
            if ($missingRequiredLayers !== []) {
                $operationFindings[] = 'pipeline_layers_unreached';
            }
            foreach (array_values(array_unique($operationFindings)) as $rule) {
                $findings[] = [
                    'rule' => $rule,
                    'operation' => $key,
                    'operation_id' => $operation['operation_id'],
                ];
            }
            $operationReports[] = [
                'operation' => $key,
                'operation_id' => $operation['operation_id'],
                'scope_classification' => $consumerScope->isActiveOperationKey($key)
                    ? 'active'
                    : 'protected_general_board',
                'handler' => is_array($binding) ? ($binding['handler'] ?? null) : null,
                'handler_class' => $handlerClass,
                'handler_method' => $handlerMethod,
                'handler_source' => is_array($binding) ? ($binding['handler_source'] ?? null) : null,
                'expected_request_fields' => $expectedRequest,
                'observed_request_reads' => $flow['reads'],
                'missing_request_fields' => $missingRequest,
                'undocumented_implementation_fields' => $extraRequest,
                'request_semantics_unproven' => $semanticUnproven,
                'expected_success_response_fields' => $expectedResponse,
                'observed_response_fields' => $flow['response_fields'],
                'missing_response_fields' => $missingResponse,
                'dynamic_accesses' => $flow['dynamic_accesses'],
                'unresolved_calls' => $flow['unresolved_calls'],
                'required_layers' => $requiredLayers,
                'observed_layers' => $observedLayers,
                'missing_required_layers' => $missingRequiredLayers,
                'visited_methods' => $flow['visited_methods'],
                'finding_rules' => array_values(array_unique($operationFindings)),
                'status' => $operationFindings === [] ? 'passed' : 'failed',
            ];
        }
        $expectedCount = $consumerScope->expectedTotalCount();
        if (count($activeKeys) !== $expectedCount) {
            $findings[] = [
                'rule' => 'active_operation_count_mismatch',
                'expected' => $expectedCount,
                'actual' => count($activeKeys),
            ];
        }
        $expectedAdminCount = $consumerScope->expectedAdminCount();
        if ($adminCount !== $expectedAdminCount) {
            $findings[] = [
                'rule' => 'active_admin_operation_count_mismatch',
                'expected' => $expectedAdminCount,
                'actual' => $adminCount,
            ];
        }
        $expectedBootstrapCount = $consumerScope->expectedBootstrapCount();
        if ($bootstrapCount !== $expectedBootstrapCount) {
            $findings[] = [
                'rule' => 'active_bootstrap_operation_count_mismatch',
                'expected' => $expectedBootstrapCount,
                'actual' => $bootstrapCount,
            ];
        }
        foreach ($consumerScope->inventoryFindings(array_keys($operations)) as $inventoryFinding) {
            $findings[] = $inventoryFinding;
        }
        foreach ($index->parseFailures() as $failure) {
            $findings[] = ['rule' => 'php_source_parse_failure', 'detail' => $failure];
        }
        $sourceFingerprintSha256 = $index->sourceFingerprintSha256();
        $findingCounts = [];
        foreach ($findings as $finding) {
            $rule = (string)$finding['rule'];
            $findingCounts[$rule] = ($findingCounts[$rule] ?? 0) + 1;
        }
        ksort($findingCounts);
        $openapiSha = self::sha256File($openapiPath);
        if (($runtime['openapi_sha256'] ?? null) !== $openapiSha) {
            $findings[] = ['rule' => 'runtime_graph_openapi_stale'];
            $findingCounts['runtime_graph_openapi_stale'] = 1;
        }
        if (($runtime['consumer_scope_sha256'] ?? null) !== $consumerScope->sha256()) {
            $findings[] = ['rule' => 'runtime_graph_consumer_scope_stale'];
            $findingCounts['runtime_graph_consumer_scope_stale'] = 1;
        }
        $layerReachCounts = [];
        foreach ($operationReports as $operationReport) {
            foreach ($operationReport['observed_layers'] as $layer) {
                $layerReachCounts[$layer] = ($layerReachCounts[$layer] ?? 0) + 1;
            }
        }
        ksort($layerReachCounts);
        $status = $findings === [] ? 'passed' : 'failed';
        unset($analyzer, $index);
        gc_collect_cycles();

        return [
            'schema' => 'gnuboard5.php.openapi-field-binding-audit/v1',
            'status' => $status,
            'certified' => $status === 'passed',
            'inputs' => [
                'openapi' => self::relativePath($root, $openapiPath),
                'openapi_sha256' => $openapiSha,
                'runtime_graph' => self::relativePath($root, $runtimeGraphPath),
                'runtime_fingerprint_sha256' => $runtime['runtime_fingerprint_sha256'] ?? null,
                'policy' => self::relativePath($root, $policyPath),
                'policy_sha256' => self::sha256File($policyPath),
                'consumer_scope' => self::relativePath($root, $consumerScopePath),
                'consumer_scope_id' => $consumerScope->id(),
                'consumer_scope_sha256' => $consumerScope->sha256(),
                'analyzer_sha256' => self::sha256File(__FILE__),
                'php_source_fingerprint_sha256' => $sourceFingerprintSha256,
            ],
            'stats' => [
                'expected_active_operation_count' => $expectedCount,
                'active_operation_count' => count($activeKeys),
                'protected_operation_count' => count($protectedKeys),
                'audited_operation_count' => count($auditedKeys),
                'admin_non_shop_operation_count' => $adminCount,
                'bootstrap_operation_count' => $bootstrapCount,
                'operation_report_count' => count($operationReports),
                'passed_operation_count' => count(array_filter(
                    $operationReports,
                    static fn (array $report): bool => $report['status'] === 'passed'
                )),
                'failed_operation_count' => count(array_filter(
                    $operationReports,
                    static fn (array $report): bool => $report['status'] === 'failed'
                )),
                'finding_count' => count($findings),
                'finding_counts' => $findingCounts,
                'layer_reach_operation_counts' => $layerReachCounts,
            ],
            'findings' => $findings,
            'operations' => $operationReports,
        ];
    }

    /** @return array<string, array<string, mixed>> */
    private static function openapiOperations(array $document): array
    {
        $operations = [];
        foreach ($document['paths'] ?? [] as $path => $pathItem) {
            if (!is_array($pathItem)) {
                continue;
            }
            foreach (self::METHODS as $method) {
                $operation = $pathItem[$method] ?? null;
                if (!is_array($operation)) {
                    continue;
                }
                $key = strtoupper($method) . ' ' . $path;
                $operations[$key] = [
                    'method' => strtoupper($method),
                    'path' => $path,
                    'operation_id' => $operation['operationId'] ?? null,
                    'path_item' => $pathItem,
                    'operation' => $operation,
                ];
            }
        }
        ksort($operations);
        return $operations;
    }

    /** @return array<string, array<string, mixed>> */
    private static function requestFields(array $document, array $pathItem, array $operation): array
    {
        $fields = [];
        $parameters = [];
        foreach ([$pathItem['parameters'] ?? [], $operation['parameters'] ?? []] as $source) {
            if (is_array($source)) {
                $parameters = array_merge($parameters, $source);
            }
        }
        foreach ($parameters as $parameter) {
            $resolved = self::resolveObject($document, $parameter);
            $location = $resolved['in'] ?? null;
            $name = $resolved['name'] ?? null;
            if (!is_string($location) || !is_string($name)) {
                continue;
            }
            $schema = self::resolveObject($document, $resolved['schema'] ?? []);
            $fields[$location . ':' . $name] = self::fieldSemantics(
                $schema,
                (bool)($resolved['required'] ?? false)
            );
        }
        $requestBody = self::resolveObject($document, $operation['requestBody'] ?? []);
        $content = $requestBody['content'] ?? [];
        if (is_array($content)) {
            foreach ($content as $media) {
                if (!is_array($media)) {
                    continue;
                }
                foreach (self::flattenSchema($document, $media['schema'] ?? [], '', [], true) as $path => $semantics) {
                    $fields['body:' . $path] = $semantics;
                }
            }
        }
        ksort($fields);
        return $fields;
    }

    /** @return array<string, array<string, mixed>> */
    private static function responseFields(array $document, array $operation): array
    {
        $fields = [];
        foreach ($operation['responses'] ?? [] as $status => $response) {
            if (preg_match('/^2\d\d$/', (string)$status) !== 1 || (string)$status === '204') {
                continue;
            }
            $resolved = self::resolveObject($document, $response);
            $content = $resolved['content'] ?? [];
            if (!is_array($content) || $content === []) {
                continue;
            }
            $media = $content['application/json'] ?? reset($content);
            if (!is_array($media)) {
                continue;
            }
            foreach (self::flattenSchema($document, $media['schema'] ?? [], '', [], true) as $path => $semantics) {
                $fields[$path] = [
                    'statuses' => array_values(array_unique(array_merge(
                        $fields[$path]['statuses'] ?? [],
                        [(string)$status]
                    ))),
                    ...$semantics,
                ];
            }
        }
        ksort($fields);
        return $fields;
    }

    /** @return array<string, array<string, mixed>> */
    private static function flattenSchema(
        array $document,
        mixed $schema,
        string $prefix,
        array $stack,
        bool $required
    ): array {
        if (!is_array($schema)) {
            return [];
        }
        $ref = $schema['$ref'] ?? null;
        if (is_string($ref) && str_starts_with($ref, '#/')) {
            if (isset($stack[$ref])) {
                return [];
            }
            $stack[$ref] = true;
            $schema = self::resolveObject($document, $schema);
        }
        $result = [];
        foreach (['allOf', 'oneOf', 'anyOf'] as $variantKey) {
            foreach ($schema[$variantKey] ?? [] as $variant) {
                $result = self::mergeFlattenedSchema(
                    $result,
                    self::flattenSchema($document, $variant, $prefix, $stack, $required)
                );
            }
        }
        if (($schema['type'] ?? null) === 'array' || isset($schema['items'])) {
            $arrayPrefix = $prefix === '' ? '[]' : $prefix . '[]';
            return array_replace(
                $result,
                self::flattenSchema($document, $schema['items'] ?? [], $arrayPrefix, $stack, $required)
            );
        }
        $properties = $schema['properties'] ?? [];
        if (!is_array($properties) || $properties === []) {
            if (
                $prefix !== ''
                && array_intersect(['type', 'format', 'enum', 'default', 'nullable'], array_keys($schema)) !== []
            ) {
                $result[$prefix] = self::fieldSemantics($schema, $required);
            }
            return $result;
        }
        $requiredFields = is_array($schema['required'] ?? null) ? $schema['required'] : [];
        foreach ($properties as $name => $property) {
            $path = $prefix === '' ? (string)$name : $prefix . '.' . (string)$name;
            $resolved = self::resolveObject($document, $property);
            $isRequired = $required && in_array((string)$name, $requiredFields, true);
            $result[$path] = self::fieldSemantics($resolved, $isRequired);
            $result = array_replace(
                $result,
                self::flattenSchema($document, $property, $path, $stack, $isRequired)
            );
        }
        return $result;
    }

    /** @return array<string, mixed> */
    private static function fieldSemantics(array $schema, bool $required): array
    {
        return [
            'type' => $schema['type'] ?? null,
            'format' => $schema['format'] ?? null,
            'required' => $required,
            'nullable' => (bool)($schema['nullable'] ?? false),
            'has_default' => array_key_exists('default', $schema),
            'default' => $schema['default'] ?? null,
            'enum' => is_array($schema['enum'] ?? null) ? $schema['enum'] : [],
            'variants' => [],
        ];
    }

    /**
     * oneOf/anyOf의 같은 필드 경로를 마지막 분기로 덮어쓰지 않고 각 허용 의미를 보존합니다.
     *
     * @param array<string, array<string, mixed>> $left
     * @param array<string, array<string, mixed>> $right
     * @return array<string, array<string, mixed>>
     */
    private static function mergeFlattenedSchema(array $left, array $right): array
    {
        foreach ($right as $path => $semantics) {
            if (!isset($left[$path])) {
                $left[$path] = $semantics;
                continue;
            }

            $leftVariants = $left[$path]['variants'] ?? [];
            if ($leftVariants === []) {
                $leftVariants[] = self::withoutVariants($left[$path]);
            }
            $rightVariants = $semantics['variants'] ?? [];
            if ($rightVariants === []) {
                $rightVariants[] = self::withoutVariants($semantics);
            }
            $variants = array_values(array_merge($leftVariants, $rightVariants));
            $types = array_values(array_unique(array_filter(
                array_map(static fn (array $variant): mixed => $variant['type'] ?? null, $variants),
                'is_string'
            )));
            $enums = [];
            foreach ($variants as $variant) {
                foreach ($variant['enum'] ?? [] as $value) {
                    if (!in_array($value, $enums, true)) {
                        $enums[] = $value;
                    }
                }
            }

            $left[$path] = [
                'type' => count($types) === 1 ? $types[0] : null,
                'format' => $left[$path]['format'] ?? $semantics['format'] ?? null,
                'required' => (bool)(($left[$path]['required'] ?? false) || ($semantics['required'] ?? false)),
                'nullable' => (bool)(($left[$path]['nullable'] ?? false) || ($semantics['nullable'] ?? false)),
                'has_default' => (bool)(
                    ($left[$path]['has_default'] ?? false) || ($semantics['has_default'] ?? false)
                ),
                'default' => ($left[$path]['has_default'] ?? false)
                    ? ($left[$path]['default'] ?? null)
                    : ($semantics['default'] ?? null),
                'enum' => $enums,
                'variants' => $variants,
            ];
        }

        return $left;
    }

    /** @param array<string, mixed> $semantics @return array<string, mixed> */
    private static function withoutVariants(array $semantics): array
    {
        unset($semantics['variants']);
        return $semantics;
    }

    /** @return array<string, mixed> */
    private static function resolveObject(array $document, mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $ref = $value['$ref'] ?? null;
        if (!is_string($ref) || !str_starts_with($ref, '#/')) {
            return $value;
        }
        $node = $document;
        foreach (explode('/', substr($ref, 2)) as $part) {
            $part = str_replace(['~1', '~0'], ['/', '~'], $part);
            if (!is_array($node) || !array_key_exists($part, $node)) {
                throw new \RuntimeException('OpenAPI ref를 해석할 수 없습니다: ' . $ref);
            }
            $node = $node[$part];
        }
        return is_array($node) ? $node : [];
    }

    /**
     * A validated scalar may be split, parsed, or used to load derived data. Those derived
     * members are not additional HTTP request fields and must not expand the OpenAPI shape.
     *
     * @param array<string, array<string, mixed>> $expected
     */
    private static function isDerivedFromDeclaredScalar(string $field, array $expected): bool
    {
        foreach ($expected as $declared => $semantics) {
            $types = is_string($semantics['type'] ?? null) ? [$semantics['type']] : [];
            foreach ($semantics['variants'] ?? [] as $variant) {
                if (is_string($variant['type'] ?? null)) {
                    $types[] = $variant['type'];
                }
            }
            $types = array_values(array_unique($types));
            if (
                $types === []
                || array_diff($types, ['boolean', 'integer', 'number', 'string']) !== []
            ) {
                continue;
            }
            if (str_starts_with($field, $declared . '.') || str_starts_with($field, $declared . '[]')) {
                return true;
            }
        }

        return false;
    }

    /** @return list<array<string, mixed>> */
    private static function semanticUnproven(array $expected, array $flow, array $comparison): array
    {
        $result = [];
        foreach ($expected as $key => $semantics) {
            if (!isset($flow['reads'][$key])) {
                continue;
            }
            $issues = [];
            $observedTypes = self::evidenceValues($flow['type_evidence'][$key] ?? []);
            $expectedType = $semantics['type'] ?? null;
            $observedDefaults = self::evidenceValues($flow['default_evidence'][$key] ?? []);
            $observedEnums = self::evidenceValues($flow['enum_evidence'][$key] ?? []);
            $variants = $semantics['variants'] ?? [];
            $checks = $variants === [] ? [$semantics] : $variants;
            foreach ($checks as $check) {
                $checkType = $check['type'] ?? null;
                if ($comparison['require_type_evidence'] ?? true) {
                    if ($observedTypes === []) {
                        $issues[] = 'type_missing';
                    } elseif (
                        is_string($checkType)
                        && !self::typeEvidenceMatches($checkType, $observedTypes, $check['format'] ?? null)
                    ) {
                        $issues[] = 'type_mismatch';
                    }
                }
                if ($comparison['require_default_evidence_when_declared'] ?? true) {
                    if (($check['has_default'] ?? false) && $observedDefaults === []) {
                        $issues[] = 'default_missing';
                    } elseif (
                        ($check['has_default'] ?? false)
                        && !in_array($check['default'] ?? null, $observedDefaults, true)
                    ) {
                        $issues[] = 'default_mismatch';
                    }
                }
                if ($comparison['require_enum_evidence_when_declared'] ?? true) {
                    if (($check['enum'] ?? []) !== [] && $observedEnums === []) {
                        $issues[] = 'enum_missing';
                    } elseif (
                        ($check['enum'] ?? []) !== []
                        && !self::enumEvidenceMatches($check['enum'], $observedEnums, $checkType)
                    ) {
                        $issues[] = 'enum_mismatch';
                    }
                }
            }
            $issues = array_values(array_unique($issues));
            if ($issues !== []) {
                $result[] = [
                    'field' => $key,
                    'issues' => $issues,
                    'expected' => [
                        'type' => $expectedType,
                        'has_default' => $semantics['has_default'] ?? false,
                        'default' => $semantics['default'] ?? null,
                        'enum' => $semantics['enum'] ?? [],
                        'variants' => $variants,
                    ],
                    'observed' => [
                        'types' => $observedTypes,
                        'defaults' => $observedDefaults,
                        'enums' => $observedEnums,
                    ],
                ];
            }
        }
        return $result;
    }

    /** @param array<int, mixed> $evidence @return list<mixed> */
    private static function evidenceValues(array $evidence): array
    {
        $values = [];
        foreach ($evidence as $record) {
            if (is_array($record) && array_key_exists('value', $record)) {
                $values[] = $record['value'];
            }
        }
        return array_values(array_unique($values, SORT_REGULAR));
    }

    /** @param list<mixed> $observedTypes */
    private static function typeEvidenceMatches(
        string $expectedType,
        array $observedTypes,
        ?string $expectedFormat = null
    ): bool {
        $accepted = match ($expectedType) {
            'number' => ['number', 'integer'],
            'array', 'object' => [$expectedType, 'php_array'],
            'string' => $expectedFormat === 'binary' ? ['string', 'php_array'] : ['string'],
            default => [$expectedType],
        };
        foreach ($observedTypes as $observedType) {
            if (is_string($observedType) && in_array($observedType, $accepted, true)) {
                return true;
            }
        }
        return false;
    }

    /** @param list<mixed> $expectedEnum @param list<mixed> $observedEnums */
    private static function enumEvidenceMatches(
        array $expectedEnum,
        array $observedEnums,
        ?string $expectedType = null
    ): bool {
        $expected = $expectedEnum;
        usort($expected, static fn (mixed $left, mixed $right): int => strcmp(
            json_encode($left, JSON_THROW_ON_ERROR),
            json_encode($right, JSON_THROW_ON_ERROR)
        ));
        foreach ($observedEnums as $observedEnum) {
            if (!is_array($observedEnum)) {
                continue;
            }
            $candidate = array_values($observedEnum);
            usort($candidate, static fn (mixed $left, mixed $right): int => strcmp(
                json_encode($left, JSON_THROW_ON_ERROR),
                json_encode($right, JSON_THROW_ON_ERROR)
            ));
            if ($candidate === $expected) {
                return true;
            }
        }

        $combined = [];
        foreach ($observedEnums as $observedEnum) {
            if (!is_array($observedEnum)) {
                continue;
            }
            foreach ($observedEnum as $value) {
                $matchesType = match ($expectedType) {
                    'string' => is_string($value),
                    'integer' => is_int($value),
                    'number' => is_int($value) || is_float($value),
                    'boolean' => is_bool($value),
                    default => true,
                };
                if ($matchesType && !in_array($value, $combined, true)) {
                    $combined[] = $value;
                }
            }
        }
        usort($combined, static fn (mixed $left, mixed $right): int => strcmp(
            json_encode($left, JSON_THROW_ON_ERROR),
            json_encode($right, JSON_THROW_ON_ERROR)
        ));

        return $combined === $expected;
    }

    private static function relativePath(string $root, string $path): string
    {
        $normalizedRoot = str_replace('\\', '/', rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
        $normalized = str_replace('\\', '/', $path);
        return str_starts_with($normalized, $normalizedRoot)
            ? substr($normalized, strlen($normalizedRoot))
            : $normalized;
    }

    private static function sha256File(string $path): string
    {
        $hash = hash_file('sha256', $path);
        if (!is_string($hash)) {
            throw new \RuntimeException('SHA-256을 계산할 수 없습니다: ' . $path);
        }
        return $hash;
    }
}
