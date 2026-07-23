<?php

/**
 * 회원 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

use Api\Core\Enum\MemberLevel;

final class MemberDTO implements \JsonSerializable
{
    public function __construct(
        public readonly string $mbId,
        public readonly string $mbName,
        public readonly string $mbNick,
        public readonly string $mbEmail,
        public readonly int $mbLevel,
        public readonly int $mbPoint,
        public readonly ?string $mbHp,
        public readonly ?string $mbHomepage,
        public readonly ?string $mbTodayLogin,
        public readonly ?string $mbDatetime,
        public readonly ?string $mbLeaveDate,
        public readonly ?string $mbIntercept,
        public readonly string $mbPassword = ''
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            mbId: trim((string)($row['mb_id'] ?? $row['mbId'] ?? '')),
            mbName: trim((string)($row['mb_name'] ?? $row['mbName'] ?? '')),
            mbNick: trim((string)($row['mb_nick'] ?? $row['mbNick'] ?? '')),
            mbEmail: trim((string)($row['mb_email'] ?? $row['mbEmail'] ?? '')),
            mbLevel: (int)($row['mb_level'] ?? $row['mbLevel'] ?? 0),
            mbPoint: (int)($row['mb_point'] ?? $row['mbPoint'] ?? 0),
            mbHp: self::nullableString($row['mb_hp'] ?? $row['mbHp'] ?? null),
            mbHomepage: self::nullableString($row['mb_homepage'] ?? $row['mbHomepage'] ?? null),
            mbTodayLogin: self::nullableString($row['mb_today_login'] ?? $row['mbTodayLogin'] ?? null),
            mbDatetime: self::nullableString($row['mb_datetime'] ?? $row['mbDatetime'] ?? null),
            mbLeaveDate: self::nullableString($row['mb_leave_date'] ?? $row['mbLeaveDate'] ?? null),
            mbIntercept: self::nullableString($row['mb_intercept_date'] ?? $row['mbIntercept'] ?? null),
            mbPassword: (string)($row['mb_password'] ?? $row['mbPassword'] ?? '')
        );
    }

    public function isAdmin(): bool
    {
        return MemberLevel::fromNumeric($this->mbLevel)->isAdmin();
    }

    public function isActive(): bool
    {
        return !$this->hasBlockDate($this->mbLeaveDate) && !$this->hasBlockDate($this->mbIntercept);
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'mb_id' => $this->mbId,
            'mb_name' => $this->mbName,
            'mb_nick' => $this->mbNick,
            'mb_email' => $this->mbEmail,
            'mb_level' => $this->mbLevel,
            'mb_point' => $this->mbPoint,
            'mb_hp' => $this->mbHp,
            'mb_homepage' => $this->mbHomepage,
            'mb_today_login' => $this->mbTodayLogin,
            'mb_datetime' => $this->mbDatetime,
            'mb_leave_date' => $this->mbLeaveDate,
            'mb_intercept_date' => $this->mbIntercept,
        ];
    }

    private function hasBlockDate(?string $date): bool
    {
        $value = trim((string)$date);
        if ($value === '') {
            return false;
        }

        return !in_array($value, ['0000-00-00', '00000000'], true);
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string)$value);
        return $normalized === '' ? null : $normalized;
    }
}
