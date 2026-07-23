<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Doctrine\DBAL\ArrayParameterType;

final class AdminSmsRecipientResolverStore extends AdminSmsMessageStoreBase
{
    /**
     * @param array<string,mixed> $payload
     * @return array<int,array<string,mixed>>
     */
    public function resolveRecipients(array $payload): array
    {
        $recipients = [];

        $groupIds = array_values(array_filter(array_map('intval', (array) ($payload['group_ids'] ?? []))));
        if ($groupIds !== []) {
            $this->requireContactStorage('SMS 수신자 조회');
            $rows = $this->fetchAllAssociative(
                "SELECT bg_no, mb_id, bk_no, bk_name, bk_hp
                 FROM {$this->contactTable()}
                 WHERE bg_no IN (:group_ids) AND bk_receipt = 1",
                ['group_ids' => $groupIds],
                ['group_ids' => ArrayParameterType::INTEGER]
            );
            foreach ($rows as $row) {
                $row['bk_hp'] = $this->normalizeMobilePhone((string) ($row['bk_hp'] ?? ''));
                if ($row['bk_hp'] === '') {
                    continue;
                }
                $recipients[] = $row;
            }
        }

        $contactIds = array_values(array_filter(array_map('intval', (array) ($payload['contact_ids'] ?? []))));
        if ($contactIds !== []) {
            $this->requireContactStorage('SMS 수신자 조회');
            $rows = $this->fetchAllAssociative(
                "SELECT bg_no, mb_id, bk_no, bk_name, bk_hp
                 FROM {$this->contactTable()}
                 WHERE bk_no IN (:contact_ids)",
                ['contact_ids' => $contactIds],
                ['contact_ids' => ArrayParameterType::INTEGER]
            );
            foreach ($rows as $row) {
                $row['bk_hp'] = $this->normalizeMobilePhone((string) ($row['bk_hp'] ?? ''));
                if ($row['bk_hp'] === '') {
                    continue;
                }
                $recipients[] = $row;
            }
        }

        $memberLevels = array_values(array_filter(array_map('intval', (array) ($payload['member_levels'] ?? []))));
        if ($memberLevels !== []) {
            $this->requireContactStorage('SMS 수신자 조회');
            $rows = $this->fetchAllAssociative(
                "SELECT m.mb_id, m.mb_nick, m.mb_name, m.mb_hp, b.bg_no, b.bk_no
                 FROM {$this->memberTable()} m
                 LEFT JOIN {$this->contactTable()} b ON b.mb_id = m.mb_id
                 WHERE m.mb_level IN (:levels) AND m.mb_sms = 1 AND COALESCE(m.mb_hp, '') <> ''",
                ['levels' => $memberLevels],
                ['levels' => ArrayParameterType::INTEGER]
            );
            foreach ($rows as $row) {
                $phone = $this->normalizeMobilePhone((string) ($row['mb_hp'] ?? ''));
                if ($phone === '') {
                    continue;
                }

                $recipients[] = [
                    'bg_no' => (int) ($row['bg_no'] ?? 0),
                    'mb_id' => trim((string) ($row['mb_id'] ?? '')),
                    'bk_no' => (int) ($row['bk_no'] ?? 0),
                    'bk_name' => trim((string) ($row['mb_nick'] ?? '')) !== ''
                        ? trim((string) $row['mb_nick'])
                        : trim((string) ($row['mb_name'] ?? '')),
                    'bk_hp' => $phone,
                ];
            }
        }

        foreach ((array) ($payload['manual_targets'] ?? []) as $target) {
            if (!is_array($target)) {
                continue;
            }

            $phone = $this->normalizeMobilePhone((string) ($target['phone'] ?? $target['bk_hp'] ?? ''));
            if ($phone === '') {
                continue;
            }

            $recipients[] = [
                'bg_no' => 0,
                'mb_id' => '',
                'bk_no' => 0,
                'bk_name' => trim((string) ($target['name'] ?? $target['bk_name'] ?? '')),
                'bk_hp' => $phone,
            ];
        }

        return $recipients;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function resolveMessageText(array $payload): string
    {
        $message = trim((string) ($payload['message'] ?? $payload['wr_message'] ?? ''));
        if ($message !== '') {
            return str_replace(["\r\n", "\r"], "\n", $message);
        }

        $templateId = (int) ($payload['template_id'] ?? $payload['fo_no'] ?? 0);
        if ($templateId > 0) {
            $this->requireTemplateStorage('SMS 템플릿 조회');
            $template = $this->fetchAssociative(
                "SELECT fo_content
                 FROM {$this->templateTable()}
                 WHERE fo_no = :fo_no
                 LIMIT 1",
                ['fo_no' => $templateId]
            );
            if (is_array($template)) {
                return str_replace(["\r\n", "\r"], "\n", trim((string) ($template['fo_content'] ?? '')));
            }
        }

        return '';
    }

    /**
     * @param array<int,array<string,mixed>> $recipients
     * @return array{0:array<int,array<string,mixed>>,1:array<string,mixed>}
     */
    public function deduplicateRecipients(array $recipients): array
    {
        $seen = [];
        $duplicates = [];
        $unique = [];

        foreach ($recipients as $recipient) {
            $phone = $this->normalizeMobilePhone((string) ($recipient['bk_hp'] ?? ''));
            if ($phone === '') {
                continue;
            }

            if (array_key_exists($phone, $seen)) {
                $duplicates[] = $this->formatMobilePhone($phone, true);
                continue;
            }

            $seen[$phone] = true;
            $recipient['bk_hp'] = $phone;
            $unique[] = $recipient;
        }

        $serialized = '';
        if ($duplicates !== []) {
            $serialized = serialize([
                'hp' => $duplicates,
                'total' => count($duplicates),
            ]);
        }

        return [
            $unique,
            [
                'serialized' => $serialized,
                'api' => [
                    'total' => count($duplicates),
                    'phones' => $duplicates,
                ],
            ],
        ];
    }
}
