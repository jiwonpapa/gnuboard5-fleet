<?php

/**
 * MemoService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Memo\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Service;

use Api\Core\DTO\MemoItemDTO;
use Api\Core\DTO\PaginationDTO;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Memo\Contracts\MemoGateway;
use Api\Memo\Service\Support\MemoInputNormalizer;
use Api\Memo\Service\Support\MemoPolicyService;
use Api\Support\Exception\ApiException;

final class MemoService
{
    private readonly MemoInputNormalizer $input;
    private readonly MemoPolicyService $policy;

    public function __construct(
        private readonly MemoGateway $memoGateway,
        private readonly PointRewardGateway $pointGateway
    ) {
        $this->input = new MemoInputNormalizer();
        $this->policy = new MemoPolicyService();
    }

    public function list(array $member, array $query): array
    {
        $memberId = $this->input->requireMemberId($member);
        $listInput = $this->input->normalizeListQuery($query);
        $kind = $listInput['kind'];
        $perPage = $listInput['per_page'];
        $cursor = $listInput['cursor'];

        if (trim((string)$cursor) !== '') {
            $result = $this->memoGateway->getListByCursor($memberId, $kind, $perPage, $cursor);

            return [
                'items' => array_map(
                    static fn (MemoItemDTO $item): array => $item->jsonSerialize(),
                    $result->items
                ),
                'pagination' => $result->pagination->jsonSerialize(),
            ];
        }

        $page = $listInput['page'];
        $result = $this->memoGateway->getList($memberId, $kind, $page, $perPage);

        return [
            'items' => $result['items'] ?? [],
            'pagination' => PaginationDTO::create((int)($result['total'] ?? 0), $page, $perPage)->jsonSerialize(),
        ];
    }

    public function detail(array $member, int $meId, string $kind): array
    {
        $memberId = $this->input->requireMemberId($member);
        $kindSafe = $this->input->normalizeKind($kind);
        $meId = $this->input->requireMemoId($meId);

        $memo = $this->memoGateway->getById($meId, $memberId, $kindSafe);
        if ($memo === null) {
            throw ApiException::notFound('쪽지를 찾을 수 없습니다.');
        }

        if ($kindSafe === 'recv' && $this->policy->isUnread($memo)) {
            $this->memoGateway->markAsRead($meId, $memberId);
            $this->memoGateway->updateMemoCount($memberId);
            $memo = $this->memoGateway->getById($meId, $memberId, $kindSafe) ?? $memo;
        }

        return $memo;
    }

    public function send(array $member, array $payload, string $ip): array
    {
        $senderId = $this->input->requireMemberId($member);
        $isAdmin = $this->policy->assertSendAllowed($member);
        $sendPayload = $this->input->normalizeSendPayload($payload);
        $recipients = $sendPayload['recipients'];
        $memo = $sendPayload['memo'];

        $validated = [];
        foreach ($recipients as $recipientId) {
            $recipient = $this->memoGateway->validateRecipient($recipientId, $isAdmin);
            $targetId = trim((string)($recipient['mb_id'] ?? ''));
            if ($targetId === '' || isset($validated[$targetId])) {
                continue;
            }

            $validated[$targetId] = [
                'mb_id' => $targetId,
                'mb_nick' => (string)($recipient['mb_nick'] ?? ''),
            ];
        }

        if ($validated === []) {
            throw ApiException::badRequest('해당 회원이 존재하지 않습니다.');
        }

        $memoSendPoint = abs($this->memoGateway->getMemoSendPoint());
        $recipientCount = count($validated);
        $this->policy->assertEnoughPoints($member, $memoSendPoint, $recipientCount, $isAdmin);

        $sentRecipients = [];
        foreach ($validated as $recipient) {
            $recvId = (string)$recipient['mb_id'];
            $recvNick = (string)$recipient['mb_nick'];

            $meId = $this->memoGateway->send($senderId, $recvId, $memo, $ip);
            $this->memoGateway->updateMemoCall($recvId, $senderId);
            $this->memoGateway->updateMemoCount($recvId);

            if (!$isAdmin && $memoSendPoint > 0) {
                $content = $recvNick . '(' . $recvId . ')님께 쪽지 발송';
                $this->pointGateway->grant(
                    $senderId,
                    -$memoSendPoint,
                    $content,
                    '@memo',
                    $recvId,
                    (string)$meId
                );
            }

            $sentRecipients[] = $recvId;
        }

        return [
            'sent_count' => count($sentRecipients),
            'recipients' => $sentRecipients,
        ];
    }

    public function delete(array $member, int $meId): array
    {
        $memberId = $this->input->requireMemberId($member);
        $meId = $this->input->requireMemoId($meId);

        $deleted = $this->memoGateway->delete($meId, $memberId);
        if ($deleted === null) {
            throw ApiException::notFound('삭제할 쪽지가 없습니다.');
        }

        if ($this->policy->isUnread($deleted)) {
            $this->memoGateway->clearMemoCall(
                (string)($deleted['me_recv_mb_id'] ?? ''),
                (string)($deleted['me_send_mb_id'] ?? '')
            );
            $this->memoGateway->updateMemoCount($memberId);
        }

        return [
            'deleted' => true,
            'me_id' => $meId,
        ];
    }

    public function unreadCount(array $member): array
    {
        $memberId = $this->input->requireMemberId($member);

        return [
            'unread_count' => $this->memoGateway->countUnread($memberId),
        ];
    }
}
