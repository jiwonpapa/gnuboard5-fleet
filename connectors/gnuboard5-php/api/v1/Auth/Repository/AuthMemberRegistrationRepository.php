<?php

/**
 * AuthMemberRegistrationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AuthMemberRegistrationRepository extends AuthRepositorySupport
{
    public function __construct(
        private readonly AuthMemberQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?\Api\Core\Security\PasswordCompat $passwordCompat = null,
        ?\Api\Core\Config\G5Config $configReader = null,
        ?\Api\Core\Config\EnvConfig $envConfig = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $configReader, $envConfig);
    }

    public function registerMember(array $member): array
    {
        $required = ['mb_id', 'mb_password', 'mb_name', 'mb_nick', 'mb_email'];
        foreach ($required as $field) {
            if (!array_key_exists($field, $member) || trim((string)$member[$field]) === '') {
                throw ApiException::badRequest("필수값 누락: {$field}");
            }
        }

        $config = $this->loadConfig();

        $mbId = $this->sanitizeSingleLine((string)$member['mb_id']);
        $mbPassword = (string)$member['mb_password'];
        $mbName = $this->sanitizeSingleLine((string)$member['mb_name']);
        $mbNick = $this->sanitizeSingleLine((string)$member['mb_nick']);
        $mbEmail = $this->sanitizeSingleLine((string)$member['mb_email']);
        $mbHp = $this->normalizePhone((string)($member['mb_hp'] ?? ''));
        $mbRecommend = $this->sanitizeSingleLine((string)($member['mb_recommend'] ?? ''));
        $ip = $this->sanitizeIp((string)($member['mb_ip'] ?? ''));
        $mbMailling = $this->toBooleanFlag($member['mb_mailling'] ?? null);
        $mbSms = $this->toBooleanFlag($member['mb_sms'] ?? null);
        $mbOpen = $this->toBooleanFlag($member['mb_open'] ?? null);
        $marketingAgree = $this->toBooleanFlag($member['mb_marketing_agree'] ?? null);
        $thirdpartyAgree = $this->toBooleanFlag($member['mb_thirdparty_agree'] ?? null);
        $mbHomepage = $this->sanitizeSingleLine((string)($member['mb_homepage'] ?? ''));
        $mbTel = $this->sanitizeSingleLine((string)($member['mb_tel'] ?? ''));
        $mbSignature = $this->sanitizeMultiline((string)($member['mb_signature'] ?? ''));
        $mbProfile = $this->sanitizeMultiline((string)($member['mb_profile'] ?? ''));
        $mbAddr1 = $this->sanitizeSingleLine((string)($member['mb_addr1'] ?? ''));
        $mbAddr2 = $this->sanitizeSingleLine((string)($member['mb_addr2'] ?? ''));
        $mbAddr3 = $this->sanitizeSingleLine((string)($member['mb_addr3'] ?? ''));
        $mbAddrJibeon = $this->normalizeJibeon((string)($member['mb_addr_jibeon'] ?? ''));
        [$mbZip1, $mbZip2] = $this->splitZip((string)($member['mb_zip'] ?? ''));
        if (array_key_exists('mb_zip1', $member)) {
            $mbZip1 = $this->normalizeZipSegment((string)$member['mb_zip1']);
        }
        if (array_key_exists('mb_zip2', $member)) {
            $mbZip2 = $this->normalizeZipSegment((string)$member['mb_zip2']);
        }

        $level = (int)($config['cf_register_level'] ?? 2);
        $now = G5DateTime::now();
        $today = G5DateTime::today();
        $emailCertify = ((int)($config['cf_use_email_certify'] ?? 0) === 1) ? '0000-00-00 00:00:00' : $now;
        $mbMaillingDate = $mbMailling === 1 ? $now : null;
        $mbSmsDate = $mbSms === 1 ? $now : null;
        $marketingDate = $marketingAgree === 1 ? $now : null;
        $thirdpartyDate = $thirdpartyAgree === 1 ? $now : null;
        $useRecommend = (int)($config['cf_use_recommend'] ?? 0) === 1;
        if (!$useRecommend) {
            $mbRecommend = '';
        } elseif ($mbRecommend !== '') {
            if (strcasecmp($mbId, $mbRecommend) === 0) {
                throw ApiException::badRequest('본인을 추천인으로 지정할 수 없습니다.');
            }
            if (!$this->queryRepository->existsMemberId($mbRecommend)) {
                throw ApiException::badRequest('존재하지 않는 추천인 아이디입니다.');
            }
        }

        $agreeLog = $this->buildInitialAgreeLog($marketingAgree, $thirdpartyAgree);

        $memberTable = $this->tables()->get('member');
        $sql = "INSERT INTO {$memberTable} (
                mb_id, mb_password, mb_name, mb_nick, mb_nick_date, mb_email, mb_homepage,
                mb_level, mb_recommend, mb_hp, mb_tel, mb_zip1, mb_zip2, mb_addr1, mb_addr2, mb_addr3, mb_addr_jibeon,
                mb_today_login, mb_login_ip, mb_datetime, mb_ip,
                mb_email_certify, mb_mailling, mb_sms, mb_open, mb_open_date,
                mb_marketing_agree, mb_thirdparty_agree, mb_mailling_date, mb_sms_date, mb_marketing_date, mb_thirdparty_date,
                mb_1, mb_2, mb_3, mb_4, mb_5, mb_6, mb_7, mb_8, mb_9, mb_10,
                mb_signature, mb_profile, mb_memo, mb_lost_certify, mb_agree_log
            ) VALUES (
                :mb_id, :mb_password, :mb_name, :mb_nick, :mb_nick_date, :mb_email, :mb_homepage,
                :mb_level, :mb_recommend, :mb_hp, :mb_tel, :mb_zip1, :mb_zip2, :mb_addr1, :mb_addr2, :mb_addr3, :mb_addr_jibeon,
                :mb_today_login, :mb_login_ip, :mb_datetime, :mb_ip,
                :mb_email_certify, :mb_mailling, :mb_sms, :mb_open, :mb_open_date,
                :mb_marketing_agree, :mb_thirdparty_agree, :mb_mailling_date, :mb_sms_date, :mb_marketing_date, :mb_thirdparty_date,
                '', '', '', '', '', '', '', '', '', '',
                :mb_signature, :mb_profile, '', '', :mb_agree_log
            )";

        $affected = $this->executeStatement($sql, [
            'mb_id' => $mbId,
            'mb_password' => $this->queryRepository->hashPassword($mbPassword),
            'mb_name' => $mbName,
            'mb_nick' => $mbNick,
            'mb_nick_date' => $today,
            'mb_email' => $mbEmail,
            'mb_homepage' => $mbHomepage,
            'mb_level' => $level,
            'mb_recommend' => $mbRecommend,
            'mb_hp' => $mbHp,
            'mb_tel' => $mbTel,
            'mb_zip1' => $mbZip1,
            'mb_zip2' => $mbZip2,
            'mb_addr1' => $mbAddr1,
            'mb_addr2' => $mbAddr2,
            'mb_addr3' => $mbAddr3,
            'mb_addr_jibeon' => $mbAddrJibeon,
            'mb_today_login' => $now,
            'mb_login_ip' => $ip,
            'mb_datetime' => $now,
            'mb_ip' => $ip,
            'mb_email_certify' => $emailCertify,
            'mb_mailling' => (string)$mbMailling,
            'mb_sms' => (string)$mbSms,
            'mb_open' => (string)$mbOpen,
            'mb_open_date' => $today,
            'mb_marketing_agree' => (string)$marketingAgree,
            'mb_thirdparty_agree' => (string)$thirdpartyAgree,
            'mb_mailling_date' => $mbMaillingDate,
            'mb_sms_date' => $mbSmsDate,
            'mb_marketing_date' => $marketingDate,
            'mb_thirdparty_date' => $thirdpartyDate,
            'mb_signature' => $mbSignature,
            'mb_profile' => $mbProfile,
            'mb_agree_log' => $agreeLog,
        ]);

        if ($affected <= 0) {
            throw ApiException::conflict('회원 생성에 실패했습니다.');
        }

        $createdMember = $this->queryRepository->findMemberById($mbId);
        if ($createdMember === null) {
            throw ApiException::serverError('회원 생성 후 조회 실패');
        }

        $createdMember['_register_point'] = ((int)($config['cf_use_point'] ?? 1) === 1)
            ? (int)($config['cf_register_point'] ?? 0)
            : 0;
        $createdMember['_recommend_member_id'] = $mbRecommend;
        $createdMember['_recommend_point'] = (
            (int)($config['cf_use_point'] ?? 1) === 1
            && (int)($config['cf_use_recommend'] ?? 0) === 1
        ) ? (int)($config['cf_recommend_point'] ?? 0) : 0;

        return $createdMember;
    }

    private function buildInitialAgreeLog(int $marketingAgree, int $thirdpartyAgree): string
    {
        $entry = [
            'at' => G5DateTime::now(),
            'source' => 'register',
            'mb_marketing_agree' => $marketingAgree,
            'mb_thirdparty_agree' => $thirdpartyAgree,
        ];

        return (string)json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
