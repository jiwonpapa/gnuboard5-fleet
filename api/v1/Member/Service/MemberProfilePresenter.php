<?php

/**
 * MemberProfilePresenter API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

final class MemberProfilePresenter
{
    /**
     * @param array<string, mixed> $memberRow
     * @return array<string, mixed>
     */
    public function toMyProfile(array $memberRow): array
    {
        $profile = $this->basePrivateProfile($memberRow);
        $profile['mb_today_login'] = (string)($memberRow['mb_today_login'] ?? '');
        $profile['mb_datetime'] = (string)($memberRow['mb_datetime'] ?? '');

        return $profile;
    }

    /**
     * @param array<string, mixed> $memberRow
     * @return array<string, mixed>
     */
    public function toUpdatedProfile(array $memberRow): array
    {
        return $this->basePrivateProfile($memberRow);
    }

    /**
     * @param array<string, mixed> $memberRow
     * @return array<string, mixed>
     */
    public function toPublicProfile(array $memberRow, bool $isAdminViewer): array
    {
        $result = [
            'mb_id' => (string)($memberRow['mb_id'] ?? ''),
            'mb_nick' => (string)($memberRow['mb_nick'] ?? ''),
            'mb_level' => (int)($memberRow['mb_level'] ?? 0),
            'mb_point' => (int)($memberRow['mb_point'] ?? 0),
            'mb_open' => (int)($memberRow['mb_open'] ?? 0),
            'mb_homepage' => (string)($memberRow['mb_homepage'] ?? ''),
            'mb_profile' => (string)($memberRow['mb_profile'] ?? ''),
            'mb_datetime' => (string)($memberRow['mb_datetime'] ?? ''),
        ];

        if ($isAdminViewer) {
            $result['mb_email'] = (string)($memberRow['mb_email'] ?? '');
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $memberRow
     * @return array<string, mixed>
     */
    private function basePrivateProfile(array $memberRow): array
    {
        [$zip1, $zip2, $zip] = $this->extractZipFields($memberRow);

        return [
            'mb_id' => (string)($memberRow['mb_id'] ?? ''),
            'mb_name' => (string)($memberRow['mb_name'] ?? ''),
            'mb_nick' => (string)($memberRow['mb_nick'] ?? ''),
            'mb_nick_date' => (string)($memberRow['mb_nick_date'] ?? ''),
            'mb_email' => (string)($memberRow['mb_email'] ?? ''),
            'mb_level' => (int)($memberRow['mb_level'] ?? 0),
            'mb_point' => (int)($memberRow['mb_point'] ?? 0),
            'mb_hp' => (string)($memberRow['mb_hp'] ?? ''),
            'mb_tel' => (string)($memberRow['mb_tel'] ?? ''),
            'mb_homepage' => (string)($memberRow['mb_homepage'] ?? ''),
            'mb_zip' => $zip,
            'mb_zip1' => $zip1,
            'mb_zip2' => $zip2,
            'mb_addr1' => (string)($memberRow['mb_addr1'] ?? ''),
            'mb_addr2' => (string)($memberRow['mb_addr2'] ?? ''),
            'mb_addr3' => (string)($memberRow['mb_addr3'] ?? ''),
            'mb_addr_jibeon' => (string)($memberRow['mb_addr_jibeon'] ?? ''),
            'mb_open' => (int)($memberRow['mb_open'] ?? 0),
            'mb_open_date' => (string)($memberRow['mb_open_date'] ?? ''),
            'mb_mailling' => (int)($memberRow['mb_mailling'] ?? 0),
            'mb_sms' => (int)($memberRow['mb_sms'] ?? 0),
            'mb_marketing_agree' => (int)($memberRow['mb_marketing_agree'] ?? 0),
            'mb_thirdparty_agree' => (int)($memberRow['mb_thirdparty_agree'] ?? 0),
            'mb_mailling_date' => (string)($memberRow['mb_mailling_date'] ?? ''),
            'mb_sms_date' => (string)($memberRow['mb_sms_date'] ?? ''),
            'mb_marketing_date' => (string)($memberRow['mb_marketing_date'] ?? ''),
            'mb_thirdparty_date' => (string)($memberRow['mb_thirdparty_date'] ?? ''),
            'mb_signature' => (string)($memberRow['mb_signature'] ?? ''),
            'mb_profile' => (string)($memberRow['mb_profile'] ?? ''),
            'mb_1' => (string)($memberRow['mb_1'] ?? ''),
            'mb_2' => (string)($memberRow['mb_2'] ?? ''),
            'mb_3' => (string)($memberRow['mb_3'] ?? ''),
            'mb_4' => (string)($memberRow['mb_4'] ?? ''),
            'mb_5' => (string)($memberRow['mb_5'] ?? ''),
            'mb_6' => (string)($memberRow['mb_6'] ?? ''),
            'mb_7' => (string)($memberRow['mb_7'] ?? ''),
            'mb_8' => (string)($memberRow['mb_8'] ?? ''),
            'mb_9' => (string)($memberRow['mb_9'] ?? ''),
            'mb_10' => (string)($memberRow['mb_10'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $memberRow
     * @return array{0:string,1:string,2:string}
     */
    private function extractZipFields(array $memberRow): array
    {
        $zip1 = $this->normalizeZipSegment((string)($memberRow['mb_zip1'] ?? ''));
        $zip2 = $this->normalizeZipSegment((string)($memberRow['mb_zip2'] ?? ''));
        $legacyZip = trim((string)($memberRow['mb_zip'] ?? ''));

        if ($zip1 === '' && $zip2 === '' && $legacyZip !== '') {
            [$zip1, $zip2] = $this->splitZip($legacyZip);
        }

        return [$zip1, $zip2, $this->formatZip($zip1, $zip2)];
    }

    /**
     * @return array{0:string,1:string}
     */
    private function splitZip(string $rawZip): array
    {
        $digits = preg_replace('/[^0-9]/', '', $rawZip) ?? '';
        if ($digits === '') {
            return ['', ''];
        }

        if (strlen($digits) <= 3) {
            return [$this->normalizeZipSegment($digits), ''];
        }

        return [
            $this->normalizeZipSegment(substr($digits, 0, 3)),
            $this->normalizeZipSegment(substr($digits, 3, 3)),
        ];
    }

    private function normalizeZipSegment(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $value) ?? '';

        return substr($digits, 0, 3);
    }

    private function formatZip(string $zip1, string $zip2): string
    {
        if ($zip1 === '' && $zip2 === '') {
            return '';
        }

        return $zip1 . $zip2;
    }
}
