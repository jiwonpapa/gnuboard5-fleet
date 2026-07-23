<?php

declare(strict_types=1);

namespace Tests\Admin\Schema;

use Api\Admin\Schema\Repository\AdminSchemaRepository;
use Api\Admin\Schema\Service\AdminSchemaService;
use PHPUnit\Framework\TestCase;

final class AdminSchemaServiceTest extends TestCase
{
    public function testListReturnsExpandedSchemaDomains(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());
        $result = $service->list();
        $domains = array_column($result['items'], 'domain');

        self::assertSame(24, $result['total']);
        self::assertContains('boards', $domains);
        self::assertContains('config', $domains);
        self::assertContains('contents', $domains);
        self::assertContains('faqs', $domains);
        self::assertContains('faq-masters', $domains);
        self::assertContains('groups', $domains);
        self::assertContains('members', $domains);
        self::assertContains('menus', $domains);
        self::assertContains('polls', $domains);
        self::assertContains('popups', $domains);
        self::assertContains('system', $domains);
        self::assertContains('theme', $domains);
        self::assertContains('sms-contacts', $domains);
        self::assertContains('sms-messages', $domains);
        self::assertContains('sms-templates', $domains);
        self::assertContains('mails', $domains);
        self::assertContains('points', $domains);
        self::assertContains('shop-catalog-category', $domains);
        self::assertContains('shop-catalog-product', $domains);
        self::assertContains('shop-catalog-review', $domains);
        self::assertContains('shop-catalog-inquiry', $domains);
        self::assertContains('shop-catalog-event', $domains);
        self::assertContains('shop-catalog-option', $domains);
        self::assertContains('shop-catalog-stocksms', $domains);
    }

    public function testBoardSchemaContainsLegacyLabelsAndSections(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());
        $result = $service->get('boards');

        self::assertSame('boards', $result['domain']);
        self::assertSame('게시판', $result['title']);
        self::assertSame('api/v1/Admin/Schema/schema-domains.json', $result['source']['manifest']);
        self::assertContains('adm/board_form.php', $result['legacy_forms']);
        self::assertArrayHasKey('bo_subject', $result['fields_by_name']);
        self::assertSame('게시판 제목', $result['fields_by_name']['bo_subject']['label']);
        self::assertSame('게시판 코드', $result['fields_by_name']['bo_table']['label']);
        self::assertSame('리스트 정렬 필드', $result['fields_by_name']['bo_sort_field']['label']);
        self::assertSame('상단 내용', $result['fields_by_name']['bo_content_head']['label']);
        self::assertSame('공지글 ID 목록', $result['fields_by_name']['bo_notice']['label']);
        self::assertSame('게시판 기본 설정', $result['sections'][0]['label']);
        self::assertSame([], $this->findRawFieldLabels($result));
    }

    public function testMemberSchemaUsesCanonicalApiFieldForCertify(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());
        $result = $service->get('members');

        self::assertSame('본인확인방법', $result['fields_by_name']['mb_certify']['label']);
        self::assertSame('radio', $result['fields_by_name']['mb_certify']['input_type']);
        self::assertSame('우편번호', $result['fields_by_name']['mb_zip']['label']);
    }

    public function testSchemaDefaultValuesExposeCreateOnlyStaticDefaults(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());

        $boards = $service->get('boards');
        self::assertSame('both', $boards['fields_by_name']['bo_device']['default_value']);
        self::assertSame('basic', $boards['fields_by_name']['bo_skin']['default_value']);
        self::assertSame(4, $boards['fields_by_name']['bo_gallery_cols']['default_value']);
        self::assertSame('_head.php', $boards['fields_by_name']['bo_include_head']['default_value']);
        self::assertTrue($boards['fields_by_name']['bo_use_search']['default_value']);
        self::assertNull($boards['fields_by_name']['bo_page_rows']['default_value']);
        self::assertNull($boards['fields_by_name']['bo_read_point']['default_value']);

        $polls = $service->get('polls');
        self::assertSame('', $polls['fields_by_name']['po_subject']['default_value']);
        self::assertSame('', $polls['fields_by_name']['po_etc']['default_value']);
        self::assertNull($polls['fields_by_name']['po_point']['default_value']);

        $menus = $service->get('menus');
        self::assertSame('_self', $menus['fields_by_name']['me_target']['default_value']);
        self::assertTrue($menus['fields_by_name']['me_use']['default_value']);
        self::assertTrue($menus['fields_by_name']['me_mobile_use']['default_value']);
    }

    public function testExtendedDomainSchemasExposeLegacyOrOverrideLabels(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());

        $polls = $service->get('polls');
        self::assertSame('투표 제목', $polls['fields_by_name']['po_subject']['label']);
        self::assertSame('투표등록일', $polls['fields_by_name']['po_date']['label']);
        self::assertSame('항목 1', $polls['fields_by_name']['po_poll1']['label']);
        self::assertSame([], $this->findRawFieldLabels($polls));

        $contents = $service->get('contents');
        self::assertSame('내용 ID', $contents['fields_by_name']['co_id']['label']);
        self::assertSame('textarea', $contents['fields_by_name']['co_content']['input_type']);

        $config = $service->get('config');
        self::assertSame('최고관리자', $config['fields_by_name']['cf_admin']['label']);
        self::assertSame('select', $config['fields_by_name']['cf_admin']['input_type']);
        self::assertFalse($config['fields_by_name']['cf_admin']['readonly_on_update']);
        self::assertSame('짧은 URL 사용', $config['fields_by_name']['cf_bbs_rewrite']['label']);
        self::assertFalse($config['fields_by_name']['cf_bbs_rewrite']['readonly_on_update']);
        self::assertSame('select', $config['fields_by_name']['cf_register_level']['input_type']);
        self::assertCount(9, $config['fields_by_name']['cf_register_level']['options']);
        self::assertSame('select', $config['fields_by_name']['cf_use_member_icon']['input_type']);
        self::assertCount(3, $config['fields_by_name']['cf_use_member_icon']['options']);
        self::assertSame('select', $config['fields_by_name']['cf_icon_level']['input_type']);
        self::assertCount(9, $config['fields_by_name']['cf_icon_level']['options']);
        self::assertFalse($config['fields_by_name']['cf_icon_level']['readonly_on_update']);
        self::assertSame('checkbox', $config['fields_by_name']['cf_social_servicelist']['input_type']);
        self::assertSame('string', $config['fields_by_name']['cf_social_servicelist']['data_type']);
        self::assertCount(6, $config['fields_by_name']['cf_social_servicelist']['options']);
        self::assertFalse($config['fields_by_name']['cf_social_servicelist']['readonly_on_update']);
        self::assertFalse($config['fields_by_name']['cf_1_subj']['readonly_on_update']);
        self::assertFalse($config['fields_by_name']['cf_1']['readonly_on_update']);
        self::assertArrayNotHasKey('cf_id', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_theme', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_copy_log', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_visit', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_register_skin', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_mobile_register_skin', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_use_sns', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_use_include_head', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_include_head', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_include_tail', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_visitor', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_mobile_editor', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_icode_use', $config['fields_by_name']);
        self::assertArrayNotHasKey('cf_kakao_java_script_key', $config['fields_by_name']);
        self::assertSame('tabs', $config['layout']['desktop']);
        self::assertSame('accordion', $config['layout']['mobile']);
        self::assertTrue($config['layout']['single_open']);
        self::assertSame([], $this->findRawFieldLabels($config));

        $groups = $service->get('groups');
        self::assertSame('그룹 관리자', $groups['fields_by_name']['gr_admin']['label']);
        self::assertSame('출력 순서', $groups['fields_by_name']['gr_order']['label']);

        $menus = $service->get('menus');
        self::assertSame('메뉴 이름', $menus['fields_by_name']['me_name']['label']);
        self::assertSame('메뉴 ID', $menus['fields_by_name']['me_id']['label']);

        $faqMasters = $service->get('faq-masters');
        self::assertSame('상단이미지', $faqMasters['fields_by_name']['fm_himg']['label']);
        self::assertSame('FAQ 마스터 ID', $faqMasters['fields_by_name']['fm_id']['label']);

        $faqs = $service->get('faqs');
        self::assertSame('질문', $faqs['fields_by_name']['fa_subject']['label']);
        self::assertSame('FAQ 항목 ID', $faqs['fields_by_name']['fa_id']['label']);

        $system = $service->get('system');
        self::assertSame('회신번호', $system['fields_by_name']['cf_phone']['label']);
        self::assertSame('아이코드 서버 포트', $system['fields_by_name']['cf_icode_server_port']['label']);
        self::assertSame(7295, $system['fields_by_name']['cf_icode_server_port']['default_value']);
        self::assertFalse($system['fields_by_name']['cf_icode_id']['required']);
        self::assertFalse($system['fields_by_name']['cf_icode_pw']['required']);
        self::assertFalse($system['fields_by_name']['cf_phone']['required']);
        self::assertSame([], $this->findRawFieldLabels($system));

        $theme = $service->get('theme');
        self::assertSame('테마', $theme['fields_by_name']['cf_theme']['label']);
        self::assertSame('모바일 테마', $theme['fields_by_name']['cf_mobile_theme']['label']);
        self::assertSame('select', $theme['fields_by_name']['cf_mobile_theme']['input_type']);
        self::assertSame([], $this->findRawFieldLabels($theme));

        $smsContacts = $service->get('sms-contacts');
        self::assertSame('그룹명', $smsContacts['fields_by_name']['bg_name']['label']);
        self::assertSame('휴대폰번호', $smsContacts['fields_by_name']['bk_hp']['label']);
        self::assertSame('휴대폰 번호 없는 회원 포함', $smsContacts['fields_by_name']['include_no_phone']['label']);
        self::assertSame('텍스트 가져오기', $smsContacts['fields_by_name']['contacts_text']['label']);
        self::assertSame('드라이런', $smsContacts['fields_by_name']['dry_run']['label']);
        self::assertSame([], $this->findRawFieldLabels($smsContacts));

        $smsMessages = $service->get('sms-messages');
        self::assertSame('이모티콘 목록', $smsMessages['fields_by_name']['template_id']['label']);
        self::assertSame('내용', $smsMessages['fields_by_name']['message']['label']);
        self::assertSame('예약전송', $smsMessages['fields_by_name']['booking_at']['label']);
        self::assertSame([], $this->findRawFieldLabels($smsMessages));

        $smsTemplates = $service->get('sms-templates');
        self::assertSame('그룹명', $smsTemplates['fields_by_name']['fg_name']['label']);
        self::assertSame('회원', $smsTemplates['fields_by_name']['fg_member']['label']);
        self::assertSame('제목', $smsTemplates['fields_by_name']['fo_name']['label']);
        self::assertSame([], $this->findRawFieldLabels($smsTemplates));

        $mails = $service->get('mails');
        self::assertSame('메일 제목', $mails['fields_by_name']['ma_subject']['label']);
        self::assertSame('메일 제목', $mails['fields_by_name']['subject']['label']);
        self::assertSame('대상선택', $mails['fields_by_name']['target_type']['label']);
        self::assertSame('선택 템플릿 사용', $mails['fields_by_name']['use_selected_template']['label']);
        self::assertSame('드라이런', $mails['fields_by_name']['dry_run']['label']);
        self::assertSame([], $this->findRawFieldLabels($mails));

        $points = $service->get('points');
        self::assertSame('검색대상', $points['fields_by_name']['search_field']['label']);
        self::assertSame('검색어', $points['fields_by_name']['search']['label']);
        self::assertSame('포인트', $points['fields_by_name']['point']['label']);
        self::assertSame('기준일', $points['fields_by_name']['base_date']['label']);
        self::assertSame([], $this->findRawFieldLabels($points));
    }

    public function testParityDomainsCoverLegacyTableColumnsWithoutRawLabels(): void
    {
        $service = new AdminSchemaService(new AdminSchemaRepository());
        $domainTables = [
            'boards' => 'g5_board',
            'config' => 'g5_config',
            'members' => 'g5_member',
            'groups' => 'g5_group',
            'polls' => 'g5_poll',
            'popups' => 'g5_new_win',
            'contents' => 'g5_content',
            'faq-masters' => 'g5_faq_master',
            'faqs' => 'g5_faq',
            'menus' => 'g5_menu',
            'shop-catalog-category' => 'g5_shop_category',
            'shop-catalog-product' => 'g5_shop_item',
            'shop-catalog-review' => 'g5_shop_item_use',
            'shop-catalog-inquiry' => 'g5_shop_item_qa',
            'shop-catalog-event' => 'g5_shop_event',
            'shop-catalog-option' => 'g5_shop_item_option',
            'shop-catalog-stocksms' => 'g5_shop_item_stocksms',
        ];
        $expectedExcludedColumns = [
            'config' => [
                'cf_id',
                'cf_lg_mert_key',
                'cf_lg_mid',
                'cf_max_po_id',
                'cf_optimize_date',
                'cf_theme',
                'cf_toss_client_key',
                'cf_toss_secret_key',
                'cf_visit',
            ],
        ];

        foreach ($domainTables as $domain => $tableName) {
            $schema = $service->get($domain);
            $fieldNames = array_keys($schema['fields_by_name']);
            $missingColumns = array_values(array_diff($this->extractTableColumns($tableName), $fieldNames));
            $expectedMissingColumns = $expectedExcludedColumns[$domain] ?? [];

            sort($missingColumns);
            sort($expectedMissingColumns);

            self::assertSame($expectedMissingColumns, $missingColumns, sprintf('%s schema 에 누락된 legacy 컬럼이 있습니다: %s', $domain, implode(', ', $missingColumns)));
            self::assertSame([], $this->findRawFieldLabels($schema), sprintf('%s schema 에 raw label 이 남아 있습니다.', $domain));
        }

        $members = $service->get('members');
        self::assertSame('회원 번호', $members['fields_by_name']['mb_no']['label']);
        self::assertSame('회원 동의 로그', $members['fields_by_name']['mb_agree_log']['label']);
        self::assertTrue($members['fields_by_name']['mb_no']['readonly_on_update']);

        $polls = $service->get('polls');
        self::assertSame('투표 ID', $polls['fields_by_name']['po_id']['label']);
        self::assertSame('항목 9 투표수', $polls['fields_by_name']['po_cnt9']['label']);
        self::assertTrue($polls['fields_by_name']['po_id']['readonly_on_update']);

        $contents = $service->get('contents');
        self::assertSame('SEO 제목', $contents['fields_by_name']['co_seo_title']['label']);
        self::assertSame('조회수', $contents['fields_by_name']['co_hit']['label']);
    }

    /**
     * @return list<string>
     */
    private function findRawFieldLabels(array $schema): array
    {
        $raw = [];

        foreach ($schema['fields_by_name'] as $fieldName => $field) {
            if (($field['label'] ?? null) === $fieldName) {
                $raw[] = $fieldName;
            }
        }

        sort($raw);

        return $raw;
    }

    /**
     * @return list<string>
     */
    private function extractTableColumns(string $tableName): array
    {
        $root = dirname(__DIR__, 3);
        $sqlPaths = [
            $root . '/install/gnuboard5.sql',
            $root . '/install/gnuboard5shop.sql',
        ];

        $pattern = sprintf('/CREATE TABLE IF NOT EXISTS `%s` \((.*?)\)\s*ENGINE=/s', preg_quote($tableName, '/'));

        foreach ($sqlPaths as $sqlPath) {
            $sql = file_get_contents($sqlPath);
            self::assertNotFalse($sql, sprintf('%s SQL 파일을 읽는 데 실패했습니다.', $sqlPath));

            $matched = preg_match($pattern, $sql, $matches);
            if ($matched === 1) {
                preg_match_all('/^\s*`([^`]+)`/m', $matches[1], $columnMatches);

                return $columnMatches[1];
            }
        }

        self::fail(sprintf('%s 테이블 정의를 install/gnuboard5.sql 혹은 install/gnuboard5shop.sql 에서 찾지 못했습니다.', $tableName));
    }
}
