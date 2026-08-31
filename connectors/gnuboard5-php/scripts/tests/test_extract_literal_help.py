from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from extract_admin_schema import build_row_candidates, find_field_literal_help, find_literal_help  # noqa: E402
import extract_admin_schema  # noqa: E402


class LiteralHelpTests(unittest.TestCase):
    def test_two_fields_in_one_row_keep_their_opposite_descriptions(self) -> None:
        row = '''<tr>
        <th><label for="allow_ip">접근가능 IP</label></th>
        <td><?php echo help('입력된 IP만 접근 가능'); ?><textarea name="allow_ip"></textarea></td>
        <th><label for="deny_ip">접근차단 IP</label></th>
        <td><?php echo help('입력된 IP는 접근 불가'); ?><textarea name="deny_ip"></textarea></td>
        </tr>'''
        fields = {field["name"]: field for field in build_row_candidates(row, "ip", "IP", {"allow_ip", "deny_ip"})}
        self.assertEqual("입력된 IP만 접근 가능", fields["allow_ip"]["description"])
        self.assertEqual("입력된 IP는 접근 불가", fields["deny_ip"]["description"])

    def test_field_without_help_never_inherits_a_neighbor_description(self) -> None:
        row = '''<tr><td><?php echo help('A 안내'); ?><input name="a"></td>
        <td><input name="b"></td></tr>'''
        self.assertIsNone(find_field_literal_help(row, "b"))

    def test_helper_generated_control_uses_its_own_cell(self) -> None:
        row = '''<tr><td><?php echo help('다른 안내'); ?><input name="a"></td>
        <td><?php echo help('회원 선택'); echo get_member_id_select('member', ''); ?></td></tr>'''
        self.assertEqual("회원 선택", find_field_literal_help(row, "member"))

    def test_ambiguous_help_for_repeated_control_fails_closed(self) -> None:
        row = '''<tr><td><?php echo help('A 안내'); ?><input name="same"></td>
        <td><?php echo help('B 안내'); ?><input name="same"></td></tr>'''
        self.assertIsNone(find_field_literal_help(row, "same"))

    def test_split_upstream_fallback_cannot_replace_provider_sources(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "provider"
            upstream = Path(directory) / "upstream"
            root.mkdir()
            upstream.mkdir()
            with mock.patch.object(extract_admin_schema, "ROOT", root), mock.patch.object(extract_admin_schema, "LEGACY_ROOT", upstream):
                self.assertEqual(upstream / "adm/config_form.php", extract_admin_schema.source_path("adm/config_form.php"))
                self.assertEqual(root / "api/handler.php", extract_admin_schema.source_path("api/handler.php"))

    def test_literal_help_preserves_text_without_markup(self) -> None:
        self.assertEqual("회원 안내", find_literal_help("<?php echo help('회원 <b>안내</b>'); ?>"))
        self.assertEqual('회원 "안내"', find_literal_help(r'''help("회원 \"안내\"")'''))
        self.assertEqual("회원 '안내'", find_literal_help(r"help('회원 \'안내\'')"))

    def test_dynamic_php_help_is_not_user_visible_text(self) -> None:
        for expression in (
            "help('kcaptcha 사용시 ' . str_replace(array('recaptcha_inv', 'recaptcha'), 'kcaptcha', G5_CAPTCHA_URL) . '/mp3 밑의 음성 폴더를 선택합니다.')",
            "help('너비 ' . $config['cf_member_icon_width'] . '픽셀')",
            'help("너비 $width 픽셀")',
            'help("너비 {$config[\'width\']} 픽셀")',
        ):
            with self.subTest(expression=expression):
                self.assertIsNone(find_literal_help(expression))


if __name__ == "__main__":
    unittest.main()
