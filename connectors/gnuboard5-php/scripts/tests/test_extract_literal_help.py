from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from extract_admin_schema import find_literal_help  # noqa: E402
import extract_admin_schema  # noqa: E402


class LiteralHelpTests(unittest.TestCase):
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
