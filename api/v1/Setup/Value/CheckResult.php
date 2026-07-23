<?php

/**
 * CheckResult API module.
 *
 * @package  Gnuboard5\Api\v1\Setup\Value
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Setup\Value;

final readonly class CheckResult
{
    public function __construct(
        public bool $passed,
        public string $instruction,
        public string $label
    ) {
    }

    /**
     * @return array{passed: bool, instruction: string, label: string}
     */
    public function toArray(): array
    {
        return [
            'passed' => $this->passed,
            'instruction' => $this->instruction,
            'label' => $this->label,
        ];
    }
}
