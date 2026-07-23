export const mailMenuThemeApiTargetsByCommand: Readonly<Record<string, string>> =
  {
    "cmd_admin_mail_test_send": "/admin/system/mails/test",
    "cmd_admin_system_mail_get_list": "/admin/system/mails",
    "cmd_admin_system_mail_recipients_get": "/admin/system/mail-recipients",
    "cmd_admin_system_mail_send": "/admin/system/mails/send",
    "cmd_admin_mail_test_send_legacy_mails": "/admin/mails/test",
    "cmd_admin_mail_test_send_legacy_mail_tests": "/admin/mail-tests",
    "cmd_admin_mail_get_list": "/admin/mails",
    "cmd_admin_mail_send": "/admin/mails",
    "cmd_admin_mail_get": "/admin/mails/{ma_id}",
    "cmd_admin_mail_update": "/admin/mails/{ma_id}",
    "cmd_admin_mail_delete": "/admin/mails/{ma_id}",
    "cmd_admin_mail_create": "/admin/mails/templates",
    "cmd_admin_mail_recipients_get": "/admin/mails/recipients",
    "cmd_admin_maintenance_purge_session_files":
      "/admin/system/maintenance/session-files/purge",
    "cmd_admin_maintenance_purge_cache_files":
      "/admin/system/maintenance/cache-files/purge",
    "cmd_admin_maintenance_purge_captcha_files":
      "/admin/system/maintenance/captcha-files/purge",
    "cmd_admin_maintenance_purge_thumbnail_files":
      "/admin/system/maintenance/thumbnail-files/purge",
    "cmd_admin_maintenance_purge_member_list_files":
      "/admin/system/maintenance/member-list-files/purge",
    "cmd_admin_menu_get_list": "/admin/menus",
    "cmd_admin_menu_create": "/admin/menus",
    "cmd_admin_menu_reorder": "/admin/menus",
    "cmd_admin_menu_reorder_legacy": "/admin/menus/reorder",
    "cmd_admin_menu_get": "/admin/menus/{me_id}",
    "cmd_admin_menu_update": "/admin/menus/{me_id}",
    "cmd_admin_menu_delete": "/admin/menus/{me_id}",
    "cmd_admin_theme_config_get": "/admin/system/theme",
    "cmd_admin_theme_config_update": "/admin/system/theme",
    "cmd_admin_theme_get_list": "/admin/system/themes",
    "cmd_admin_theme_get": "/admin/system/themes/{theme}",
  };
