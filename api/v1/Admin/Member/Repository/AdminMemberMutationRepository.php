<?php

declare(strict_types=1);

namespace Api\Admin\Member\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;
use Api\Core\Util\G5DateTime;

final class AdminMemberMutationRepository extends AdminMemberRepositoryBase
{
    private const UPDATABLE_FIELDS = [
        'mb_name',
        'mb_nick',
        'mb_email',
        'mb_level',
        'mb_hp',
        'mb_tel',
        'mb_mailling',
        'mb_sms',
        'mb_marketing_agree',
        'mb_thirdparty_agree',
        'mb_mailling_date',
        'mb_sms_date',
        'mb_marketing_date',
        'mb_thirdparty_date',
        'mb_open_date',
        'mb_homepage',
        'mb_zip1',
        'mb_zip2',
        'mb_addr1',
        'mb_addr2',
        'mb_addr3',
        'mb_addr_jibeon',
        'mb_memo',
        'mb_profile',
        'mb_signature',
        'mb_adult',
        'mb_certify',
        'mb_open',
        'mb_leave_date',
        'mb_intercept_date',
        'mb_1',
        'mb_2',
        'mb_3',
        'mb_4',
        'mb_5',
        'mb_6',
        'mb_7',
        'mb_8',
        'mb_9',
        'mb_10',
    ];

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?PasswordCompat $passwordCompat = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $memberId, array $payload): int
    {
        $payload = $this->normalizeZipPayload($payload);
        $sets = [];
        $params = ['mb_id' => $memberId];

        foreach (self::UPDATABLE_FIELDS as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $payload[$field];
        }

        if (array_key_exists('mb_password', $payload)) {
            $sets[] = 'mb_password = :u_mb_password';
            $params['u_mb_password'] = $this->password()->hash((string)$payload['mb_password']);
        }

        if (array_key_exists('__mb_agree_log_prepend', $payload)) {
            $sets[] = "mb_agree_log = CONCAT(:u_mb_agree_log_prepend, COALESCE(mb_agree_log, ''))";
            $params['u_mb_agree_log_prepend'] = (string)$payload['__mb_agree_log_prepend'];
        }

        if ($sets === []) {
            return 0;
        }

        $sql = sprintf(
            'UPDATE %s SET %s WHERE mb_id = :mb_id',
            $this->memberTable(),
            implode(', ', $sets)
        );

        return $this->executeStatement($sql, $params);
    }

    public function updateLevel(string $memberId, int $level): int
    {
        return $this->executeStatement(
            "UPDATE {$this->memberTable()} SET mb_level = :mb_level WHERE mb_id = :mb_id",
            [
                'mb_id' => $memberId,
                'mb_level' => $level,
            ]
        );
    }

    public function softDelete(string $memberId): int
    {
        return $this->executeStatement(
            "UPDATE {$this->memberTable()} SET mb_leave_date = :leave_date WHERE mb_id = :mb_id",
            [
                'mb_id' => $memberId,
                'leave_date' => str_replace('-', '', G5DateTime::today()),
            ]
        );
    }

    private function password(): PasswordCompat
    {
        if ($this->passwordCompat instanceof PasswordCompat) {
            return $this->passwordCompat;
        }

        return new PasswordCompat();
    }
}
