<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\LegacyAdminFieldInventoryExtractor;
use PHPUnit\Framework\TestCase;

final class LegacyAdminFieldInventoryExtractorTest extends TestCase
{
    public function testExtractorCollectsSectionsAndFieldRenderTypes(): void
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="ko">
<body>
<form>
  <section id="anc_cf_basic">
    <h2>홈페이지 기본환경 설정</h2>
    <table>
      <tbody>
        <tr>
          <th scope="row"><label for="cf_admin">최고관리자</label></th>
          <td>
            <select id="cf_admin" name="cf_admin" required>
              <option value="">선택안함</option>
              <option value="neojins">neojins</option>
            </select>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="cf_use_point">포인트 사용</label></th>
          <td>
            <input type="checkbox" id="cf_use_point" name="cf_use_point" value="1" checked>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="cf_title">홈페이지 제목</label></th>
          <td>
            <input type="text" id="cf_title" name="cf_title" value="그누보드">
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</form>
</body>
</html>
HTML;

        $extractor = new LegacyAdminFieldInventoryExtractor();
        $inventory = $extractor->extract($html);
        $fieldsByName = [];
        foreach ($inventory['fields'] as $field) {
            $fieldsByName[$field['name']] = $field;
        }

        self::assertSame(1, $inventory['section_count']);
        self::assertSame(3, $inventory['field_count']);
        self::assertSame('select', $fieldsByName['cf_admin']['render_type']);
        self::assertSame(2, $fieldsByName['cf_admin']['option_count']);
        self::assertSame('checkbox', $fieldsByName['cf_use_point']['render_type']);
        self::assertSame('text', $fieldsByName['cf_title']['render_type']);
        self::assertSame('anc_cf_basic', $fieldsByName['cf_admin']['section_key']);
        self::assertSame('홈페이지 기본환경 설정', $fieldsByName['cf_admin']['section_label']);
    }

    public function testExtractorCollectsStandaloneControlsAndNormalizesIndexedNames(): void
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="ko">
<body>
<form>
  <div>
    <label for="bg_name">그룹명<strong class="sound_only"> 필수</strong></label>
    <input type="text" id="bg_name" name="bg_name" required>
  </div>
  <div>
    <input type="checkbox" id="no_hp" value="1">
    <label for="no_hp">휴대폰 번호 없는 회원 포함</label>
  </div>
  <table>
    <tbody>
      <tr>
        <th scope="row"><label for="fg_name_0">그룹명</label></th>
        <td>
          <input type="text" id="fg_name_0" name="fg_name[0]" value="기본 그룹">
          <input type="checkbox" id="fg_member_0" name="fg_member[0]" value="1">
        </td>
      </tr>
    </tbody>
  </table>
</form>
</body>
</html>
HTML;

        $inventory = (new LegacyAdminFieldInventoryExtractor())->extract($html);
        $fieldsByName = [];
        foreach ($inventory['fields'] as $field) {
            $fieldsByName[$field['name']] = $field;
        }

        self::assertArrayHasKey('bg_name', $fieldsByName);
        self::assertTrue($fieldsByName['bg_name']['required']);
        self::assertArrayHasKey('no_hp', $fieldsByName);
        self::assertArrayHasKey('fg_name', $fieldsByName);
        self::assertArrayHasKey('fg_member', $fieldsByName);
        self::assertSame('checkbox', $fieldsByName['fg_member']['render_type']);
    }

    public function testExtractorPrefersVisibleDuplicateOverHiddenField(): void
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="ko">
<body>
<form>
  <input type="hidden" name="mb_id" value="admin">
  <table>
    <tbody>
      <tr>
        <th scope="row"><label for="mb_id">회원아이디<strong class="sound_only">필수</strong></label></th>
        <td><input type="text" id="mb_id" name="mb_id" required></td>
      </tr>
    </tbody>
  </table>
</form>
</body>
</html>
HTML;

        $inventory = (new LegacyAdminFieldInventoryExtractor())->extract($html);
        $fieldsByName = [];
        foreach ($inventory['fields'] as $field) {
            $fieldsByName[$field['name']] = $field;
        }

        self::assertSame('text', $fieldsByName['mb_id']['render_type']);
        self::assertTrue($fieldsByName['mb_id']['required']);
    }
}
