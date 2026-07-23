import {
  type CommandContextBuilder,
  stringFromPayload,
  stringFromRecord,
} from "./shared";

export const localCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_auth_status": () => ({
    area: "Auth > Session",
    operation: "인증 세션 확인",
  }),

  "cmd_master_lock_status": () => ({
    area: "Master Lock",
    localTarget: "status",
    operation: "앱 잠금 상태 조회",
  }),

  "cmd_master_lock_setup": () => ({
    area: "Master Lock",
    localTarget: "setup",
    operation: "앱 잠금 설정",
  }),

  "cmd_master_lock_unlock": () => ({
    area: "Master Lock",
    localTarget: "unlock",
    operation: "앱 잠금 해제",
  }),

  "cmd_master_lock_unlock_fast": () => ({
    area: "Master Lock",
    localTarget: "fast-unlock",
    operation: "빠른 잠금 해제",
  }),

  "cmd_master_lock_verify_totp": () => ({
    area: "Master Lock",
    localTarget: "unlock-totp",
    operation: "앱 잠금 OTP 검증",
  }),

  "cmd_master_lock_lock": () => ({
    area: "Master Lock",
    localTarget: "lock",
    operation: "앱 잠금 다시 잠그기",
  }),

  "cmd_security_settings_get": () => ({
    area: "Security",
    localTarget: "settings",
    operation: "보안 설정 조회",
  }),

  "cmd_security_fast_unlock_status": () => ({
    area: "Security",
    localTarget: "fast-unlock",
    operation: "빠른 잠금 해제 상태 조회",
  }),

  "cmd_security_enable_fast_unlock": () => ({
    area: "Security",
    localTarget: "fast-unlock-enable",
    operation: "빠른 잠금 해제 등록",
  }),

  "cmd_security_disable_fast_unlock": () => ({
    area: "Security",
    localTarget: "fast-unlock-disable",
    operation: "빠른 잠금 해제 폐기",
  }),

  "cmd_security_change_master_password": () => ({
    area: "Security",
    localTarget: "master-password",
    operation: "마스터 비밀번호 변경",
  }),

  "cmd_security_update_idle_timeout": () => ({
    area: "Security",
    localTarget: "idle-timeout",
    operation: "자동 잠금 시간 변경",
  }),

  "cmd_security_start_totp_enrollment": () => ({
    area: "Security",
    localTarget: "totp-enrollment",
    operation: "OTP 등록 시작",
  }),

  "cmd_security_enable_totp": () => ({
    area: "Security",
    localTarget: "totp-enable",
    operation: "OTP 활성화",
  }),

  "cmd_security_disable_totp": () => ({
    area: "Security",
    localTarget: "totp-disable",
    operation: "OTP 비활성화",
  }),

  "cmd_backup_export": (payload) => ({
    area: "Backup",
    localTarget: stringFromRecord(payload?.input, "path"),
    operation: "휴대용 암호화 백업 내보내기",
  }),

  "cmd_backup_import": (payload) => ({
    area: "Backup",
    localTarget: stringFromRecord(payload?.input, "path"),
    operation: "백업 가져오기",
  }),

  "cmd_site_catalog_get": () => ({
    area: "Site Catalog",
    operation: "등록 사이트 목록 조회",
  }),

  "cmd_site_health_check": (payload) => ({
    area: "Site Catalog",
    localTarget: stringFromRecord(payload?.input, "api_base_url"),
    operation: "사이트 연결 테스트",
  }),

  "cmd_site_add": (payload) => ({
    area: "Site Catalog",
    localTarget: stringFromRecord(payload?.input, "name"),
    operation: "사이트 등록",
  }),

  "cmd_site_update": (payload) => ({
    area: "Site Catalog",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "사이트 수정",
  }),

  "cmd_site_delete": (payload) => ({
    area: "Site Catalog",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "사이트 삭제",
  }),

  "cmd_site_switch": (payload) => ({
    area: "Site Catalog",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "활성 사이트 전환",
  }),

  "cmd_site_activity_list": (payload) => ({
    area: "Site Activity",
    localTarget: stringFromPayload(payload, "site_id") ?? "all-sites",
    operation: "사이트 활동 기록 조회",
  }),

  "cmd_ssh_status": (payload) => ({
    area: "Site SSH Session",
    localTarget:
      stringFromPayload(payload, "siteId") ??
      stringFromPayload(payload, "site_id") ??
      "unknown-site",
    operation: "SSH 연결 상태 조회",
  }),

  "cmd_ssh_connect": (payload) => ({
    area: "Site SSH Session",
    localTarget:
      stringFromRecord(payload?.input, "ssh_profile_id") ??
      stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 연결 시작",
  }),

  "cmd_ssh_disconnect": (payload) => ({
    area: "Site SSH Session",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 연결 해제",
  }),

  "cmd_ssh_host_verification_status": (payload) => ({
    area: "Site SSH Host Verification",
    localTarget:
      stringFromRecord(payload?.input, "ssh_profile_id") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SSH 서버 지문 확인",
  }),

  "cmd_ssh_host_verification_trust": (payload) => ({
    area: "Site SSH Host Verification",
    localTarget:
      stringFromRecord(payload?.input, "ssh_profile_id") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SSH 서버 신뢰 등록",
  }),

  "cmd_ssh_shell_open": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH interactive shell 열기",
  }),

  "cmd_ssh_terminal_bridge_connect": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH 터미널 브리지 연결",
  }),

  "cmd_ssh_shell_write": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH 셸 입력 전송",
  }),

  "cmd_ssh_shell_read": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH 셸 출력 읽기",
  }),

  "cmd_ssh_shell_close": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH interactive shell 닫기",
  }),

  "cmd_ssh_shell_resize": (payload) => ({
    area: "Site SSH Shell",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SSH PTY 크기 동기화",
  }),

  "cmd_sftp_list_dir": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 디렉터리 목록 조회",
  }),

  "cmd_sftp_stat": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 파일 정보 조회",
  }),

  "cmd_sftp_read_file": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 파일 본문 읽기",
  }),

  "cmd_sftp_download": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 파일 다운로드",
  }),

  "cmd_sftp_upload": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "destination_path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 파일 업로드",
  }),

  "cmd_sftp_copy": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "source_path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 항목 복사",
  }),

  "cmd_sftp_move": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "source_path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 항목 이동",
  }),

  "cmd_sftp_chmod": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 권한 변경",
  }),

  "cmd_sftp_delete": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 항목 삭제",
  }),

  "cmd_sftp_mkdir": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 디렉터리 생성",
  }),

  "cmd_sftp_write_file": (payload) => ({
    area: "Site SFTP",
    localTarget:
      stringFromRecord(payload?.input, "path") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 파일 저장",
  }),

  "cmd_sftp_transfer_snapshot": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SFTP 전송 큐 조회",
  }),

  "cmd_sftp_transfer_enqueue": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SFTP 전송 큐 등록",
  }),

  "cmd_sftp_transfer_pause": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "item_id") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 전송 일시 중지",
  }),

  "cmd_sftp_transfer_retry": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "item_id") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 전송 재시도",
  }),

  "cmd_sftp_transfer_cancel": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "item_id") ??
      stringFromRecord(payload?.input, "site_id") ??
      "unknown-site",
    operation: "SFTP 전송 취소",
  }),

  "cmd_sftp_transfer_set_concurrency": (payload) => ({
    area: "Site SFTP Transfers",
    localTarget:
      stringFromRecord(payload?.input, "site_id") ?? "unknown-site",
    operation: "SFTP 전송 동시 처리 수 변경",
  }),

  "cmd_ssh_profile_list": (payload) => ({
    area: "Site SSH Profiles",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 프로필 목록 조회",
  }),

  "cmd_ssh_profile_add": (payload) => ({
    area: "Site SSH Profiles",
    localTarget: stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 프로필 등록",
  }),

  "cmd_ssh_profile_update": (payload) => ({
    area: "Site SSH Profiles",
    localTarget:
      stringFromRecord(payload?.input, "ssh_profile_id") ??
      stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 프로필 수정",
  }),

  "cmd_ssh_profile_delete": (payload) => ({
    area: "Site SSH Profiles",
    localTarget:
      stringFromRecord(payload?.input, "ssh_profile_id") ??
      stringFromRecord(payload?.input, "site_id"),
    operation: "SSH 프로필 삭제",
  }),

  "cmd_auth_login": (payload) => ({
    area: "Auth > Login",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "관리자 로그인",
  }),

  "cmd_auth_logout": () => ({
    area: "Auth > Logout",
    operation: "로그아웃",
  }),

  "cmd_auth_refresh": () => ({
    area: "Auth > Session",
    operation: "인증 토큰 갱신",
  }),

  "cmd_system_health": () => ({
    area: "System > Health",
    operation: "API 상태 확인",
  }),

  "cmd_member_me_get": () => ({
    area: "Session > Profile",
    operation: "내 프로필 조회",
  }),
};
