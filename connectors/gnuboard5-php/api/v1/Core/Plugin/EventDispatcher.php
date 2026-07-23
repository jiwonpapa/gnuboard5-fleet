<?php

/**
 * EventDispatcher API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

final class EventDispatcher
{
    /** @var array<string, list<array{listener: callable, priority: int}>> */
    private array $listeners = [];

    public function listen(string $eventName, callable $listener, int $priority = 0): void
    {
        $this->listeners[$eventName][] = [
            'listener' => $listener,
            'priority' => $priority,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function dispatch(string $eventName, array $payload = []): array
    {
        if (!isset($this->listeners[$eventName])) {
            return $payload;
        }

        $sorted = $this->listeners[$eventName];
        usort(
            $sorted,
            static fn (array $left, array $right): int => $left['priority'] <=> $right['priority']
        );

        foreach ($sorted as $entry) {
            $result = ($entry['listener'])($payload);
            if (is_array($result)) {
                $payload = $result;
            }
        }

        return $payload;
    }

    public function hasListeners(string $eventName): bool
    {
        return !empty($this->listeners[$eventName]);
    }
}
