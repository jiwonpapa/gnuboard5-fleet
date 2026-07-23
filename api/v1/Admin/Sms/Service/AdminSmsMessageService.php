<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Admin\Sms\Service\Support\AdminSmsMessagePresenter;
use Api\Support\Exception\ApiException;

final class AdminSmsMessageService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMessageBatches(array $query): array
    {
        [$page, $perPage] = AdminSmsInput::pagination($query);
        $search = trim((string)($query['search'] ?? $query['sv'] ?? ''));
        $result = $this->repository->listMessageBatches($page, $perPage, $search);
        $items = [];
        foreach ($result['items'] as $item) {
            $items[] = AdminSmsMessagePresenter::batch($item);
        }

        return [
            'items' => $items,
            'pagination' => AdminSmsInput::buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listDeliveries(array $query): array
    {
        [$page, $perPage] = AdminSmsInput::pagination($query);
        $searchField = AdminSmsInput::normalizeEnum(
            (string)($query['search_field'] ?? $query['st'] ?? 'hp'),
            ['name', 'hp', 'bk_no'],
            'search_field'
        );
        $search = trim((string)($query['search'] ?? $query['sv'] ?? ''));
        $result = $this->repository->listDeliveries($page, $perPage, $searchField, $search);
        $items = [];
        foreach ($result['items'] as $item) {
            $items[] = AdminSmsMessagePresenter::delivery($item);
        }

        return [
            'items' => $items,
            'pagination' => AdminSmsInput::buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function detailMessageBatch(int $writeNo, array $query): array
    {
        AdminSmsInput::assertPositiveInt($writeNo, 'wr_no');
        $writeRenum = (int)($query['wr_renum'] ?? 0);
        AdminSmsInput::assertNonNegativeInt($writeRenum, 'wr_renum');

        $batch = $this->repository->findMessageBatch($writeNo, $writeRenum);
        if ($batch === null) {
            throw ApiException::notFound('전송 이력을 찾을 수 없습니다.');
        }

        [$page, $perPage] = AdminSmsInput::pagination($query);
        $searchField = AdminSmsInput::normalizeEnum(
            (string)($query['search_field'] ?? $query['sst'] ?? 'name'),
            ['name', 'hp'],
            'search_field'
        );
        $search = trim((string)($query['search'] ?? $query['ssv'] ?? ''));
        $deliveries = $this->repository->listBatchDeliveries($writeNo, $writeRenum, $page, $perPage, $searchField, $search);

        $normalizedBatch = AdminSmsMessagePresenter::batch($batch);
        $retryBatches = [];
        $sourceRetryBatches = is_array($batch['retry_batches'] ?? null) ? $batch['retry_batches'] : [];
        foreach ($sourceRetryBatches as $retryBatch) {
            $retryBatches[] = AdminSmsMessagePresenter::retryBatch($retryBatch);
        }
        $deliveryItems = [];
        foreach ($deliveries['items'] as $delivery) {
            $deliveryItems[] = AdminSmsMessagePresenter::delivery($delivery);
        }
        $normalizedBatch['retry_batches'] = $retryBatches;
        $normalizedBatch['deliveries'] = $deliveryItems;
        $normalizedBatch['deliveries_pagination'] = AdminSmsInput::buildPagination($page, $perPage, $deliveries['total']);

        return $normalizedBatch;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sendMessage(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, [
            'message',
            'wr_message',
            'template_id',
            'fo_no',
            'reply',
            'wr_reply',
            'booking_at',
            'group_ids',
            'contact_ids',
            'member_levels',
            'manual_targets',
        ]);
        $message = trim((string)($payload['message'] ?? $payload['wr_message'] ?? ''));
        $templateId = (int)($payload['template_id'] ?? $payload['fo_no'] ?? 0);
        if ($message === '' && $templateId <= 0) {
            throw ApiException::badRequest('message 또는 template_id 중 하나는 필요합니다.');
        }

        $targetCount = count((array)($payload['group_ids'] ?? []))
            + count((array)($payload['contact_ids'] ?? []))
            + count((array)($payload['member_levels'] ?? []))
            + count((array)($payload['manual_targets'] ?? []));
        if ($targetCount <= 0) {
            throw ApiException::badRequest('발송 대상이 없습니다.');
        }

        foreach (['group_ids', 'contact_ids', 'member_levels'] as $field) {
            if (array_key_exists($field, $payload)) {
                $payload[$field] = AdminSmsInput::normalizeIntList($payload[$field], $field);
            }
        }
        if (array_key_exists('manual_targets', $payload)) {
            if (!is_array($payload['manual_targets'])) {
                throw ApiException::badRequest('manual_targets는 배열이어야 합니다.');
            }
            foreach ($payload['manual_targets'] as $target) {
                if (!is_array($target)) {
                    throw ApiException::badRequest('manual_targets 항목은 객체여야 합니다.');
                }
                AdminSmsInput::assertAllowedKeys($target, ['name', 'phone', 'bk_name', 'bk_hp'], 'manual_targets 항목');
                if (!array_key_exists('phone', $target) && !array_key_exists('bk_hp', $target)) {
                    throw ApiException::badRequest('manual_targets 항목에는 phone 또는 bk_hp가 필요합니다.');
                }
                AdminSmsInput::normalizeMobilePhone(
                    (string)($target['phone'] ?? $target['bk_hp'] ?? ''),
                    'manual_targets.phone'
                );
            }
        }

        if (array_key_exists('booking_at', $payload)) {
            AdminSmsInput::normalizeBookingAt($payload['booking_at']);
        }

        if (array_key_exists('wr_reply', $payload) || array_key_exists('reply', $payload)) {
            $reply = trim((string)($payload['wr_reply'] ?? $payload['reply'] ?? ''));
            if (!AdminSmsInput::isValidCallbackPhone($reply)) {
                throw ApiException::badRequest('wr_reply는 유효한 회신번호여야 합니다.');
            }
        }

        return AdminSmsMessagePresenter::sendResult($this->repository->sendMessage($payload));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function resendFailures(int $writeNo, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['wr_renum', 'booking_at']);
        AdminSmsInput::assertPositiveInt($writeNo, 'wr_no');
        $sourceRenum = (int)($payload['wr_renum'] ?? 0);
        AdminSmsInput::assertNonNegativeInt($sourceRenum, 'wr_renum');
        if (array_key_exists('booking_at', $payload)) {
            AdminSmsInput::normalizeBookingAt($payload['booking_at']);
        }

        return AdminSmsMessagePresenter::sendResult(
            $this->repository->resendMessageBatch($writeNo, $sourceRenum, true, $payload['booking_at'] ?? null)
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function resendAll(int $writeNo, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['wr_renum', 'booking_at']);
        AdminSmsInput::assertPositiveInt($writeNo, 'wr_no');
        $sourceRenum = (int)($payload['wr_renum'] ?? 0);
        AdminSmsInput::assertNonNegativeInt($sourceRenum, 'wr_renum');
        if (array_key_exists('booking_at', $payload)) {
            AdminSmsInput::normalizeBookingAt($payload['booking_at']);
        }

        return AdminSmsMessagePresenter::sendResult(
            $this->repository->resendMessageBatch($writeNo, $sourceRenum, false, $payload['booking_at'] ?? null)
        );
    }
}
