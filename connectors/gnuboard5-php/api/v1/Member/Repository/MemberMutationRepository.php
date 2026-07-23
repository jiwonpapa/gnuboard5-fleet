<?php

/**
 * MemberMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class MemberMutationRepository extends MemberRepositorySupport
{
    public function update(string $memberId, array $updates): void
    {
        if ($updates === []) {
            throw ApiException::badRequest('수정할 데이터가 없습니다.');
        }

        $allowed = [
            'mb_password',
            'mb_nick',
            'mb_email',
            'mb_hp',
            'mb_tel',
            'mb_homepage',
            'mb_zip1',
            'mb_zip2',
            'mb_addr1',
            'mb_addr2',
            'mb_addr3',
            'mb_addr_jibeon',
            'mb_open',
            'mb_mailling',
            'mb_sms',
            'mb_marketing_agree',
            'mb_thirdparty_agree',
            'mb_signature',
            'mb_profile',
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

        $setParts = [];
        $params = ['mb_id' => trim($memberId)];
        foreach ($updates as $field => $value) {
            if (!is_string($field) || !in_array($field, $allowed, true)) {
                continue;
            }

            $paramKey = 'u_' . $field;
            $setParts[] = "{$field} = :{$paramKey}";
            $params[$paramKey] = (string)$value;
        }

        if (array_key_exists('mb_nick', $updates)) {
            $setParts[] = 'mb_nick_date = :u_mb_nick_date';
            $params['u_mb_nick_date'] = G5DateTime::today();
        }

        if (array_key_exists('mb_email', $updates)) {
            $setParts[] = "mb_email_certify = '0000-00-00 00:00:00'";
            $setParts[] = "mb_email_certify2 = ''";
        }

        if (array_key_exists('mb_open', $updates)) {
            $setParts[] = 'mb_open_date = :u_mb_open_date';
            $params['u_mb_open_date'] = G5DateTime::today();
        }

        $consentTouched = array_key_exists('mb_mailling', $updates)
            || array_key_exists('mb_sms', $updates)
            || array_key_exists('mb_marketing_agree', $updates)
            || array_key_exists('mb_thirdparty_agree', $updates);
        if (array_key_exists('mb_mailling', $updates)) {
            $setParts[] = 'mb_mailling_date = :u_mb_mailling_date';
            $params['u_mb_mailling_date'] = G5DateTime::now();
        }
        if (array_key_exists('mb_sms', $updates)) {
            $setParts[] = 'mb_sms_date = :u_mb_sms_date';
            $params['u_mb_sms_date'] = G5DateTime::now();
        }
        if (array_key_exists('mb_marketing_agree', $updates)) {
            $setParts[] = 'mb_marketing_date = :u_mb_marketing_date';
            $params['u_mb_marketing_date'] = G5DateTime::now();
        }
        if (array_key_exists('mb_thirdparty_agree', $updates)) {
            $setParts[] = 'mb_thirdparty_date = :u_mb_thirdparty_date';
            $params['u_mb_thirdparty_date'] = G5DateTime::now();
        }
        if ($consentTouched) {
            $setParts[] = "mb_agree_log = CONCAT(COALESCE(mb_agree_log, ''), :u_mb_agree_log)";
            $params['u_mb_agree_log'] = $this->buildAgreeLogEntry($updates);
        }

        if ($setParts === []) {
            throw ApiException::badRequest('수정 대상 필드가 없습니다.');
        }

        $memberTable = $this->getMemberTable();
        $sql = sprintf(
            'UPDATE %s SET %s WHERE mb_id = :mb_id',
            $memberTable,
            implode(', ', $setParts)
        );

        $this->executeStatement($sql, $params);
    }

    public function withdraw(string $memberId, string $leaveDate, string $memo): void
    {
        $table = $this->getMemberTable();
        $this->executeStatement(
            "UPDATE {$table}
             SET mb_leave_date = :mb_leave_date,
                 mb_memo = :mb_memo,
                 mb_certify = '',
                 mb_adult = 0,
                 mb_dupinfo = '',
                 mb_email_certify2 = '',
                 mb_lost_certify = ''
             WHERE mb_id = :mb_id",
            [
                'mb_leave_date' => $leaveDate,
                'mb_memo' => $memo,
                'mb_id' => trim($memberId),
            ]
        );
    }

    private function buildAgreeLogEntry(array $updates): string
    {
        $entry = [
            'at' => G5DateTime::now(),
            'source' => 'member_update',
            'mb_mailling' => array_key_exists('mb_mailling', $updates) ? (int)$updates['mb_mailling'] : null,
            'mb_sms' => array_key_exists('mb_sms', $updates) ? (int)$updates['mb_sms'] : null,
            'mb_marketing_agree' => array_key_exists('mb_marketing_agree', $updates) ? (int)$updates['mb_marketing_agree'] : null,
            'mb_thirdparty_agree' => array_key_exists('mb_thirdparty_agree', $updates) ? (int)$updates['mb_thirdparty_agree'] : null,
        ];

        return (string)json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    }
}
