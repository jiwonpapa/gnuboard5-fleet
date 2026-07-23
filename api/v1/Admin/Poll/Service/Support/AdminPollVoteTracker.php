<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

final class AdminPollVoteTracker
{
    /**
     * @return array<int, string>
     */
    public function parse(string $raw): array
    {
        $items = array_map('trim', explode(',', $raw));
        $items = array_values(array_filter($items, static fn (string $item): bool => $item !== ''));

        return array_values(array_unique($items));
    }

    public function contains(string $raw, string $value): bool
    {
        if (trim($value) === '') {
            return false;
        }

        return in_array(trim($value), $this->parse($raw), true);
    }

    public function append(string $raw, string $value): string
    {
        $normalizedValue = trim($value);
        if ($normalizedValue === '') {
            return $this->join($this->parse($raw));
        }

        $items = $this->parse($raw);
        $items[] = $normalizedValue;

        return $this->join($items);
    }

    /**
     * @param array<int, string> $items
     */
    private function join(array $items): string
    {
        $normalized = array_values(array_unique(array_filter(array_map('trim', $items), static fn (string $item): bool => $item !== '')));
        if ($normalized === []) {
            return '';
        }

        return implode(',', $normalized) . ',';
    }
}
