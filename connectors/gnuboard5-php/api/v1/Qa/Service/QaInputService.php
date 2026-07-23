<?php

/**
 * QaInputService API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Service\Support\QaActorInput;
use Api\Qa\Service\Support\QaScalarInput;
use Api\Qa\Service\Support\QaTextInput;

final class QaInputService
{
    private ?QaActorInput $resolvedActorInput = null;
    private ?QaScalarInput $resolvedScalarInput = null;
    private ?QaTextInput $resolvedTextInput = null;

    /**
     * @param array<string, mixed> $config
     */
    public function validateCategory(string $rawCategory, array $config): string
    {
        return $this->textInput()->validateCategory($rawCategory, $config);
    }

    public function normalizeEmail(string $rawEmail, bool $required): string
    {
        return $this->scalarInput()->normalizeEmail($rawEmail, $required);
    }

    public function sanitizeSubject(string $rawSubject): string
    {
        return $this->textInput()->sanitizeSubject($rawSubject);
    }

    public function sanitizeContent(string $rawContent): string
    {
        return $this->textInput()->sanitizeContent($rawContent);
    }

    public function normalizePhone(string $rawPhone): string
    {
        return $this->scalarInput()->normalizePhone($rawPhone);
    }

    public function toBoolInt(mixed $value): int
    {
        return $this->scalarInput()->toBoolInt($value);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function requireMemberId(array $member): string
    {
        return $this->actorInput()->requireMemberId($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function isAdmin(array $member): bool
    {
        return $this->actorInput()->isAdmin($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function assertAdmin(array $member): void
    {
        $this->actorInput()->assertAdmin($member);
    }

    /**
     * @param array<string, mixed> $member
     */
    public function resolveQaName(array $member, string $memberId): string
    {
        return $this->actorInput()->resolveQaName($member, $memberId);
    }

    public function normalizePositiveInt(mixed $value, string $field, int $default): int
    {
        return $this->scalarInput()->normalizePositiveInt($value, $field, $default);
    }

    public function normalizeNullableKeyword(mixed $value): ?string
    {
        return $this->textInput()->normalizeNullableKeyword($value);
    }

    private function actorInput(): QaActorInput
    {
        return $this->resolvedActorInput ??= new QaActorInput();
    }

    private function scalarInput(): QaScalarInput
    {
        return $this->resolvedScalarInput ??= new QaScalarInput();
    }

    private function textInput(): QaTextInput
    {
        return $this->resolvedTextInput ??= new QaTextInput();
    }
}
