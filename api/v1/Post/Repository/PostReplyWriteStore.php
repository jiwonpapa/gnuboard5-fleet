<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Util\G5DateTime;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;

final class PostReplyWriteStore extends PostWriteSupport
{
    public function __construct(
        BoardGateway $boardRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    /**
     * @param array<string, mixed> $parent
     * @param array<string, mixed> $member
     */
    public function createReply(
        string $boTable,
        array $parent,
        string $wrReply,
        array $member,
        string $subject,
        string $content,
        ?string $option,
        string $ip
    ): int {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $boardTable = $this->boardRepository->getBoardTable();
        $boardNewTable = $this->tables()->get('board_new');

        $memberId = trim((string)($member['mb_id'] ?? ''));
        $memberName = trim((string)($member['mb_name'] ?? ($member['mb_nick'] ?? '')));
        $memberEmail = trim((string)($member['mb_email'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $resolvedOption = trim((string)$option);
        $parentOption = (string)($parent['wr_option'] ?? '');
        if ($this->containsSecretOption($parentOption) && !$this->containsSecretOption($resolvedOption)) {
            $resolvedOption = $resolvedOption === '' ? 'secret' : $resolvedOption . ',secret';
        }
        $resolvedOption = implode(',', array_values(array_unique(array_filter(array_map('trim', explode(',', $resolvedOption))))));

        $now = G5DateTime::now();
        $wrPassword = $this->containsSecretOption($resolvedOption) ? (string)($parent['wr_password'] ?? '') : '';

        $this->executeStatement(
            "INSERT INTO {$writeTable}
             SET
                wr_num = :wr_num,
                wr_reply = :wr_reply,
                wr_parent = 0,
                wr_is_comment = 0,
                wr_comment = 0,
                wr_comment_reply = '',
                ca_name = :ca_name,
                wr_option = :wr_option,
                wr_subject = :wr_subject,
                wr_content = :wr_content,
                wr_seo_title = '',
                wr_link1 = '',
                wr_link2 = '',
                wr_link1_hit = 0,
                wr_link2_hit = 0,
                wr_hit = 0,
                wr_good = 0,
                wr_nogood = 0,
                mb_id = :mb_id,
                wr_password = :wr_password,
                wr_name = :wr_name,
                wr_email = :wr_email,
                wr_homepage = '',
                wr_datetime = :wr_datetime,
                wr_last = :wr_last,
                wr_ip = :wr_ip,
                wr_facebook_user = '',
                wr_twitter_user = '',
                wr_1 = '',
                wr_2 = '',
                wr_3 = '',
                wr_4 = '',
                wr_5 = '',
                wr_6 = '',
                wr_7 = '',
                wr_8 = '',
                wr_9 = '',
                wr_10 = ''",
            [
                'wr_num' => (int)($parent['wr_num'] ?? 0),
                'wr_reply' => $wrReply,
                'ca_name' => (string)($parent['ca_name'] ?? ''),
                'wr_option' => $resolvedOption,
                'wr_subject' => $subject,
                'wr_content' => $content,
                'mb_id' => $memberId,
                'wr_password' => $wrPassword,
                'wr_name' => $memberName,
                'wr_email' => $memberEmail,
                'wr_datetime' => $now,
                'wr_last' => $now,
                'wr_ip' => trim($ip),
            ]
        );

        $replyId = $this->lastInsertId();
        if ($replyId <= 0) {
            $replyId = $this->resolveInsertedWriteId($writeTable, $memberId, $now, $subject, $content, $wrReply);
        }
        if ($replyId <= 0) {
            throw ApiException::serverError('답변 생성에 실패했습니다.');
        }

        $replyIdSafe = (int)$replyId;
        $this->executeStatement(
            "UPDATE {$writeTable}
             SET wr_parent = :wr_parent
             WHERE wr_id = :wr_id",
            [
                'wr_parent' => $replyIdSafe,
                'wr_id' => $replyIdSafe,
            ]
        );

        $this->executeStatement(
            "INSERT INTO {$boardNewTable} (bo_table, wr_id, wr_parent, bn_datetime, mb_id)
             VALUES (:bo_table, :wr_id, :wr_parent, :bn_datetime, :mb_id)",
            [
                'bo_table' => $boTable,
                'wr_id' => $replyIdSafe,
                'wr_parent' => $replyIdSafe,
                'bn_datetime' => $now,
                'mb_id' => $memberId,
            ]
        );

        $this->executeStatement(
            "UPDATE {$boardTable}
             SET bo_count_write = bo_count_write + 1
             WHERE bo_table = :bo_table",
            ['bo_table' => $boTable]
        );

        return $replyIdSafe;
    }
}
