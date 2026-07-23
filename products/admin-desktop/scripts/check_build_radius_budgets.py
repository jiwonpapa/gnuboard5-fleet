#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path
import tomllib


ROOT_DIR = Path(__file__).resolve().parents[1]

ALLOWED_MODEL_DEPENDENT_MANIFESTS = {
    "g5-admin-api-client/Cargo.toml",
    "g5-admin/src-tauri/Cargo.toml",
}

BUDGETS = {
    "workspace_member_count": 24,
    "workspace_internal_path_edges": 50,
    "desktop_internal_path_dependencies": 20,
    "placeholder_workspace_members": 0,
    "active_desktop_loc": 32_000,
    "app_error_loc": 420,
    "app_error_max_file_loc": 390,
    "api_client_loc": 5_200,
    "api_client_max_file_loc": 300,
    "api_client_models_fan_in_files": 0,
    "api_ports_loc": 80,
    "api_ports_max_file_loc": 75,
    "debug_support_loc": 180,
    "debug_support_max_file_loc": 180,
    "error_contract_loc": 390,
    "error_contract_max_file_loc": 220,
    "health_check_loc": 320,
    "health_check_max_file_loc": 180,
    "models_loc": 9_000,
    "models_direct_dependents": 2,
    "models_public_items": 520,
    "port_types_loc": 260,
    "port_types_max_file_loc": 260,
    "runtime_config_loc": 620,
    "runtime_config_max_file_loc": 390,
    "runtime_types_loc": 80,
    "runtime_types_max_file_loc": 80,
    "security_core_loc": 180,
    "security_core_max_file_loc": 180,
    "site_manager_loc": 120,
    "site_manager_max_file_loc": 120,
    "store_ports_loc": 150,
    "store_ports_max_file_loc": 140,
    "ssh_ports_loc": 130,
    "ssh_ports_max_file_loc": 120,
    "desktop_models_fan_in_files": 0,
    "core_port_adapters_loc": 760,
    "core_port_adapter_max_file_loc": 300,
    "local_store_loc": 3_100,
    "local_store_max_file_loc": 760,
    "local_store_models_fan_in_files": 0,
    "session_store_loc": 900,
    "session_store_max_file_loc": 650,
    "sftp_transfer_queue_loc": 510,
    "sftp_transfer_queue_max_file_loc": 460,
    "ssh_terminal_bridge_loc": 360,
    "ssh_terminal_bridge_max_file_loc": 320,
}


def main() -> int:
    failures: list[str] = []
    metrics = collect_metrics()

    for name, budget in BUDGETS.items():
        value = metrics[name]
        if value > budget:
            failures.append(f"{name}: {value} > budget {budget}")

    direct_model_dependents = set(list_direct_model_dependency_manifests())
    unexpected_model_dependents = sorted(
        direct_model_dependents - ALLOWED_MODEL_DEPENDENT_MANIFESTS
    )
    if unexpected_model_dependents:
        failures.append(
            "g5-admin-models direct dependencies must not spread beyond "
            f"{sorted(ALLOWED_MODEL_DEPENDENT_MANIFESTS)}; unexpected: {unexpected_model_dependents}"
        )

    standard_audit = (ROOT_DIR / "scripts/run_standard_audit.sh").read_text()
    if "--workspace" in standard_audit:
        failures.append("run_standard_audit.sh must not run Cargo with --workspace")
    if "--features ts-bindings" not in standard_audit:
        failures.append("ts-rs export sync must be the only standard audit path that enables ts-bindings")
    if "models::tests::export_ts_bindings" not in standard_audit:
        failures.append("ts-rs export sync must use the exact full test path; bare export_ts_bindings runs 0 tests")

    models_manifest = (ROOT_DIR / "g5-admin-models/Cargo.toml").read_text()
    if not re.search(
        r'(?m)^ts-rs\s*=\s*\{[^}\n]*\boptional\s*=\s*true\b[^}\n]*\}\s*$',
        models_manifest,
    ):
        failures.append("g5-admin-models must keep ts-rs optional for normal desktop checks")
    if '"dep:ts-rs"' not in models_manifest:
        failures.append("g5-admin-models must gate ts-rs behind the ts-bindings feature")
    if '"g5-admin-error-contract/ts-bindings"' not in models_manifest:
        failures.append("g5-admin-models ts-bindings must enable re-exported error contract bindings")

    ssh_manifest = (ROOT_DIR / "g5-admin-ssh/Cargo.toml").read_text()
    if "default-features = false" not in ssh_manifest:
        failures.append("g5-admin-ssh russh dependency must keep default-features = false")
    if "aws-lc-rs" in ssh_manifest:
        failures.append("g5-admin-ssh must not opt russh back into aws-lc-rs by default")

    desktop_manifest = (ROOT_DIR / "g5-admin/src-tauri/Cargo.toml").read_text()
    if 'g5-admin-app-error = { path = "../../g5-admin-app-error", features = ["desktop-conversions"] }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-app-error with desktop-conversions instead of owning AppError")
    if 'g5-admin-api-client = { path = "../../g5-admin-api-client" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-api-client instead of owning api_client code")
    api_client_lib = (ROOT_DIR / "g5-admin-api-client/src/lib.rs").read_text()
    if "pub use g5_admin_models::models" in api_client_lib:
        failures.append("g5-admin-api-client must not re-export shared models; import g5_admin_models::models directly")
    if 'g5-admin-api-ports = { path = "../../g5-admin-api-ports" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-api-ports instead of owning admin API port contracts")
    if 'thiserror = "2"' in desktop_manifest:
        failures.append("desktop crate must not directly depend on thiserror; keep AppError derive in g5-admin-app-error")
    if 'g5-admin-debug-support = { path = "../../g5-admin-debug-support" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-debug-support instead of owning tracing setup code")
    for dependency in ("tracing-appender", "tracing-subscriber"):
        if dependency in desktop_manifest:
            failures.append(f"desktop crate must not directly depend on {dependency}; keep logging setup in g5-admin-debug-support")
    if 'g5-admin-error-contract = { path = "../../g5-admin-error-contract" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-error-contract instead of owning error payload classification policy")
    if 'g5-admin-health-check = { path = "../../g5-admin-health-check" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-health-check instead of owning reqwest health probes")
    if 'g5-admin-local-store = { path = "../../g5-admin-local-store" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-local-store instead of owning db code")
    for dependency in ("rusqlite", "bundled-sqlcipher"):
        if dependency in desktop_manifest:
            failures.append(f"desktop crate must not directly depend on {dependency}; keep db in g5-admin-local-store")
    if 'g5-admin-runtime-config = { path = "../../g5-admin-runtime-config" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-runtime-config instead of owning runtime config loading")
    for dependency in ("dirs", 'serde = { version = "1"'):
        if dependency in desktop_manifest:
            failures.append(f"desktop crate must not directly depend on {dependency}; keep runtime config parsing in g5-admin-runtime-config")
    if 'g5-admin-security-core = { path = "../../g5-admin-security-core" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-security-core instead of owning TOTP/random-secret code")
    for dependency in ("totp-rs", "getrandom", "rand_core"):
        if dependency in desktop_manifest:
            failures.append(f"desktop crate must not directly depend on {dependency}; keep security crypto helpers in g5-admin-security-core")
    if 'g5-admin-session-store = { path = "../../g5-admin-session-store" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-session-store instead of owning token_store code")
    if "keyring" in desktop_manifest:
        failures.append("desktop crate must not directly depend on keyring; keep session storage in g5-admin-session-store")
    if 'g5-admin-site-manager = { path = "../../g5-admin-site-manager" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-site-manager instead of owning active site ordering state")
    if 'g5-admin-store-ports = { path = "../../g5-admin-store-ports" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-store-ports instead of owning store port contracts")
    if "reqwest" in desktop_manifest:
        failures.append("desktop crate must not directly depend on reqwest; keep HTTP clients in g5-admin-api-client or g5-admin-health-check")
    if 'g5-admin-port-types = { path = "../../g5-admin-port-types" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-port-types instead of owning shared core port DTOs")
    if 'g5-admin-ssh-ports = { path = "../../g5-admin-ssh-ports" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-ssh-ports instead of owning SSH/SFTP port contracts")
    if 'g5-admin-ssh-terminal-bridge = { path = "../../g5-admin-ssh-terminal-bridge" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-ssh-terminal-bridge instead of owning WebSocket terminal bridge code")
    for dependency in ("tokio-tungstenite", "futures-util"):
        if dependency in desktop_manifest:
            failures.append(f"desktop crate must not directly depend on {dependency}; keep terminal bridge transport in g5-admin-ssh-terminal-bridge")
    if 'g5-admin-sftp-transfer-queue = { path = "../../g5-admin-sftp-transfer-queue" }' not in desktop_manifest:
        failures.append("desktop crate must depend on g5-admin-sftp-transfer-queue instead of owning SFTP queue state")
    if 'tauri-plugin-updater = { version = "2", default-features = false, features = ["native-tls", "zip"] }' not in desktop_manifest:
        failures.append("desktop tauri-plugin-updater must use native-tls without default rustls-tls to avoid duplicate reqwest TLS stacks")

    local_store_manifest = (ROOT_DIR / "g5-admin-local-store/Cargo.toml").read_text()
    if "rusqlite" not in local_store_manifest or "bundled-sqlcipher" not in local_store_manifest:
        failures.append("g5-admin-local-store must own rusqlite bundled-sqlcipher storage dependency")
    if "g5-admin-runtime-types" not in local_store_manifest:
        failures.append("g5-admin-local-store must use g5-admin-runtime-types for runtime storage modes")
    if "g5-admin-port-types" not in local_store_manifest:
        failures.append("g5-admin-local-store must expose storage records through g5-admin-port-types")
    if "g5-admin-models" in local_store_manifest:
        failures.append("g5-admin-local-store must not pull shared models; keep storage DTOs model-free")
    local_store_lib = (ROOT_DIR / "g5-admin-local-store/src/lib.rs").read_text()
    if "pub use g5_admin_models::models" in local_store_lib:
        failures.append("g5-admin-local-store must not re-export shared models; import g5_admin_models::models directly")
    app_error_manifest = (ROOT_DIR / "g5-admin-app-error/Cargo.toml").read_text()
    if "default = []" not in app_error_manifest or "desktop-conversions" not in app_error_manifest:
        failures.append("g5-admin-app-error must keep heavyweight desktop conversions behind a feature")
    if "g5-admin-error-contract" not in app_error_manifest or "thiserror" not in app_error_manifest:
        failures.append("g5-admin-app-error must own AppError over the shared error contract")
    if "g5-admin-models" in app_error_manifest:
        failures.append("g5-admin-app-error must not pull shared models in the default AppError path")
    debug_support_manifest = (ROOT_DIR / "g5-admin-debug-support/Cargo.toml").read_text()
    if "tracing-appender" not in debug_support_manifest or "tracing-subscriber" not in debug_support_manifest:
        failures.append("g5-admin-debug-support must own tracing appender/subscriber dependencies")
    error_contract_manifest = (ROOT_DIR / "g5-admin-error-contract/Cargo.toml").read_text()
    if "g5-admin-models" in error_contract_manifest:
        failures.append("g5-admin-error-contract must own error payload and trace types without pulling shared models")
    if "serde" not in error_contract_manifest or "serde_json" not in error_contract_manifest:
        failures.append("g5-admin-error-contract must own serde dependencies for error payload and trace contracts")
    runtime_config_manifest = (ROOT_DIR / "g5-admin-runtime-config/Cargo.toml").read_text()
    if "dirs" not in runtime_config_manifest or "serde_json" not in runtime_config_manifest:
        failures.append("g5-admin-runtime-config must own runtime config filesystem/JSON dependencies")
    if "g5-admin-runtime-types" not in runtime_config_manifest:
        failures.append("g5-admin-runtime-config must share runtime boundary modes through g5-admin-runtime-types")
    for dependency in ("g5-admin-local-store", "g5-admin-session-store", "g5-admin-port-types", "g5-admin-models"):
        if dependency in runtime_config_manifest:
            failures.append(
                f"g5-admin-runtime-config must not depend on {dependency}; runtime config checks must not pull storage/model implementations"
            )
    security_core_manifest = (ROOT_DIR / "g5-admin-security-core/Cargo.toml").read_text()
    if "totp-rs" not in security_core_manifest or "getrandom" not in security_core_manifest:
        failures.append("g5-admin-security-core must own TOTP/random-secret dependencies")
    session_store_manifest = (ROOT_DIR / "g5-admin-session-store/Cargo.toml").read_text()
    if "keyring" not in session_store_manifest:
        failures.append("g5-admin-session-store must own keyring session storage dependency")
    if "g5-admin-runtime-types" not in session_store_manifest:
        failures.append("g5-admin-session-store must use g5-admin-runtime-types for runtime storage modes")
    for dependency in ("g5-admin-local-store", "g5-admin-models"):
        if dependency in session_store_manifest:
            failures.append(
                f"g5-admin-session-store must not depend on {dependency}; inject file session persistence at the desktop boundary"
            )
    api_client_manifest = (ROOT_DIR / "g5-admin-api-client/Cargo.toml").read_text()
    if "g5-admin-transport" not in api_client_manifest or "reqwest" not in api_client_manifest:
        failures.append("g5-admin-api-client must own admin API transport extension dependencies")
    transport_manifest = (ROOT_DIR / "g5-admin-transport/Cargo.toml").read_text()
    if (
        "reqwest" not in transport_manifest
        or "g5-admin-port-types" not in transport_manifest
        or "g5-admin-error-contract" not in transport_manifest
    ):
        failures.append("g5-admin-transport must own HTTP transport over reqwest, trace types, and port DTOs")
    if "g5-admin-models" in transport_manifest:
        failures.append("g5-admin-transport must not pull shared models; keep HTTP wire DTOs local")
    api_ports_manifest = (ROOT_DIR / "g5-admin-api-ports/Cargo.toml").read_text()
    if (
        "g5-admin-app-error" not in api_ports_manifest
        or "g5-admin-port-types" not in api_ports_manifest
        or "g5-admin-error-contract" not in api_ports_manifest
    ):
        failures.append("g5-admin-api-ports must own admin API port traits over AppError, trace types, and port DTOs")
    if "g5-admin-models" in api_ports_manifest:
        failures.append("g5-admin-api-ports must not pull shared models; convert API records at the desktop boundary")
    health_check_manifest = (ROOT_DIR / "g5-admin-health-check/Cargo.toml").read_text()
    if "reqwest" not in health_check_manifest:
        failures.append("g5-admin-health-check must own reqwest health probe dependency")
    if "g5-admin-error-contract" not in health_check_manifest or "g5-admin-models" in health_check_manifest:
        failures.append("g5-admin-health-check must use error-contract trace types without pulling shared models")
    terminal_bridge_manifest = (ROOT_DIR / "g5-admin-ssh-terminal-bridge/Cargo.toml").read_text()
    if "tokio-tungstenite" not in terminal_bridge_manifest or "futures-util" not in terminal_bridge_manifest:
        failures.append("g5-admin-ssh-terminal-bridge must own WebSocket terminal bridge dependencies")
    if "g5-admin-models" in terminal_bridge_manifest:
        failures.append("g5-admin-ssh-terminal-bridge must not pull shared models; keep WebSocket bridge payloads local")
    sftp_queue_manifest = (ROOT_DIR / "g5-admin-sftp-transfer-queue/Cargo.toml").read_text()
    if "uuid" not in sftp_queue_manifest or "tokio" not in sftp_queue_manifest:
        failures.append("g5-admin-sftp-transfer-queue must own queue UUID/tokio state dependencies")
    if "g5-admin-models" in sftp_queue_manifest:
        failures.append("g5-admin-sftp-transfer-queue must not pull shared models; convert UI DTOs at the desktop boundary")
    site_manager_manifest = (ROOT_DIR / "g5-admin-site-manager/Cargo.toml").read_text()
    if "g5-admin-models" in site_manager_manifest:
        failures.append("g5-admin-site-manager must not pull shared models; convert site DTOs at the desktop boundary")
    port_types_manifest = (ROOT_DIR / "g5-admin-port-types/Cargo.toml").read_text()
    if "g5-admin-models" in port_types_manifest:
        failures.append("g5-admin-port-types must not pull shared models; keep SSH connector DTOs model-free")
    store_ports_manifest = (ROOT_DIR / "g5-admin-store-ports/Cargo.toml").read_text()
    if "g5-admin-app-error" not in store_ports_manifest or "g5-admin-port-types" not in store_ports_manifest:
        failures.append("g5-admin-store-ports must own store port traits over AppError and port DTOs")
    if "g5-admin-models" in store_ports_manifest:
        failures.append("g5-admin-store-ports must not pull shared models; convert store records at the desktop boundary")
    ssh_ports_manifest = (ROOT_DIR / "g5-admin-ssh-ports/Cargo.toml").read_text()
    if "g5-admin-app-error" not in ssh_ports_manifest or "g5-admin-port-types" not in ssh_ports_manifest:
        failures.append("g5-admin-ssh-ports must own SSH/SFTP port traits over AppError and port DTOs")
    desktop_port_types = (ROOT_DIR / "g5-admin/src-tauri/src/core/port_types.rs").read_text()
    if "pub use g5_admin_port_types::*;" not in desktop_port_types:
        failures.append("desktop core port_types must re-export g5-admin-port-types DTOs")
    desktop_ports = (ROOT_DIR / "g5-admin/src-tauri/src/core/ports.rs").read_text()
    if "g5_admin_api_ports" not in desktop_ports:
        failures.append("desktop core ports must re-export admin API port contracts from g5-admin-api-ports")
    if "pub trait AdminApiPort" in desktop_ports:
        failures.append("desktop core ports must not own AdminApiPort directly")
    if "g5_admin_ssh_ports" not in desktop_ports:
        failures.append("desktop core ports must re-export SSH/SFTP port contracts from g5-admin-ssh-ports")
    if "g5_admin_store_ports" not in desktop_ports:
        failures.append("desktop core ports must re-export store port contracts from g5-admin-store-ports")
    desktop_api_client_shim = (ROOT_DIR / "g5-admin/src-tauri/src/api_client.rs").read_text()
    if desktop_api_client_shim.strip() != "pub use g5_admin_api_client::*;":
        failures.append("desktop api_client module must stay a thin g5-admin-api-client re-export")
    desktop_lib = (ROOT_DIR / "g5-admin/src-tauri/src/lib.rs").read_text()
    if "pub use g5_admin_models::models" in desktop_lib:
        failures.append("desktop crate must not re-export shared models; import g5_admin_models::models directly")
    desktop_token_store_shim = (ROOT_DIR / "g5-admin/src-tauri/src/token_store.rs").read_text()
    if "pub use g5_admin_session_store::*;" not in desktop_token_store_shim:
        failures.append("desktop token_store module must re-export g5-admin-session-store")
    for helper in ("SiteSessionRepository", "token_session_from_model", "model_session_from_token"):
        if helper not in desktop_token_store_shim:
            failures.append(f"desktop token_store module must own {helper} boundary conversion")
    desktop_error_mod = (ROOT_DIR / "g5-admin/src-tauri/src/error/mod.rs").read_text()
    if "pub use g5_admin_app_error::AppError;" not in desktop_error_mod:
        failures.append("desktop error module must re-export AppError from g5-admin-app-error")
    for stale_error_file in ("api_client.rs", "classification.rs", "ssh.rs"):
        if (ROOT_DIR / "g5-admin/src-tauri/src/error" / stale_error_file).exists():
            failures.append(f"desktop error/{stale_error_file} must not keep AppError conversion or classification ownership")
    desktop_error_payload_shim = (ROOT_DIR / "g5-admin/src-tauri/src/error/payload.rs").read_text()
    if desktop_error_payload_shim.strip() != "pub use g5_admin_error_contract::{AppErrorPayload, CommandResult};":
        failures.append("desktop error payload module must stay a thin g5-admin-error-contract re-export")
    desktop_site_manager_shim = (ROOT_DIR / "g5-admin/src-tauri/src/site_manager.rs").read_text()
    if "pub use g5_admin_site_manager::*;" not in desktop_site_manager_shim:
        failures.append("desktop site_manager module must re-export g5-admin-site-manager")
    for helper in ("site_manager_site_from_model", "model_site_from_manager"):
        if helper not in desktop_site_manager_shim:
            failures.append(f"desktop site_manager module must own {helper} boundary conversion")
    failures.extend(check_runtime_model_import_policy())

    failures.extend(check_doc_build_radius_policy())

    print("build radius budget metrics:")
    for name, value in metrics.items():
        print(f"- {name}: {value} / {BUDGETS[name]}")

    if failures:
        print("FAIL: build radius budgets exceeded", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("PASS: build radius budgets")
    return 0


def collect_metrics() -> dict[str, int]:
    src_tauri = ROOT_DIR / "g5-admin/src-tauri/src"
    app_error = ROOT_DIR / "g5-admin-app-error/src"
    api_client = ROOT_DIR / "g5-admin-api-client/src"
    api_ports = ROOT_DIR / "g5-admin-api-ports/src"
    debug_support = ROOT_DIR / "g5-admin-debug-support/src"
    error_contract = ROOT_DIR / "g5-admin-error-contract/src"
    health_check = ROOT_DIR / "g5-admin-health-check/src"
    models = ROOT_DIR / "g5-admin-models/src/models"
    port_types = ROOT_DIR / "g5-admin-port-types/src"
    runtime_config = ROOT_DIR / "g5-admin-runtime-config/src"
    runtime_types = ROOT_DIR / "g5-admin-runtime-types/src"
    security_core = ROOT_DIR / "g5-admin-security-core/src"
    site_manager = ROOT_DIR / "g5-admin-site-manager/src"
    store_ports = ROOT_DIR / "g5-admin-store-ports/src"
    ssh_ports = ROOT_DIR / "g5-admin-ssh-ports/src"
    local_store = ROOT_DIR / "g5-admin-local-store/src"
    session_store = ROOT_DIR / "g5-admin-session-store/src"
    sftp_transfer_queue = ROOT_DIR / "g5-admin-sftp-transfer-queue/src"
    ssh_terminal_bridge = ROOT_DIR / "g5-admin-ssh-terminal-bridge/src"
    port_adapter_files = [
        src_tauri / "core/port_adapters.rs",
        *sorted((src_tauri / "core/port_adapters").glob("*.rs")),
    ]
    app_error_files = list(iter_rust_files(app_error, exclude_tests=True))
    api_client_files = list(iter_rust_files(api_client, exclude_tests=True))
    api_ports_files = list(iter_rust_files(api_ports, exclude_tests=True))
    debug_support_files = list(iter_rust_files(debug_support, exclude_tests=True))
    error_contract_files = list(iter_rust_files(error_contract, exclude_tests=True))
    health_check_files = list(iter_rust_files(health_check, exclude_tests=True))
    port_types_files = list(iter_rust_files(port_types, exclude_tests=True))
    runtime_config_files = list(iter_rust_files(runtime_config, exclude_tests=True))
    runtime_types_files = list(iter_rust_files(runtime_types, exclude_tests=True))
    security_core_files = list(iter_rust_files(security_core, exclude_tests=True))
    site_manager_files = list(iter_rust_files(site_manager, exclude_tests=True))
    store_ports_files = list(iter_rust_files(store_ports, exclude_tests=True))
    ssh_ports_files = list(iter_rust_files(ssh_ports, exclude_tests=True))
    local_store_files = list(iter_rust_files(local_store, exclude_tests=True))
    session_store_files = list(iter_rust_files(session_store, exclude_tests=True))
    sftp_transfer_queue_files = list(iter_rust_files(sftp_transfer_queue, exclude_tests=True))
    ssh_terminal_bridge_files = list(iter_rust_files(ssh_terminal_bridge, exclude_tests=True))

    return {
        "workspace_member_count": len(list_workspace_members()),
        "workspace_internal_path_edges": count_workspace_internal_path_edges(),
        "desktop_internal_path_dependencies": count_manifest_path_dependencies(
            ROOT_DIR / "g5-admin/src-tauri/Cargo.toml"
        ),
        "placeholder_workspace_members": count_placeholder_workspace_members(),
        "active_desktop_loc": count_rust_loc(src_tauri),
        "app_error_loc": sum(count_file_loc(path) for path in app_error_files),
        "app_error_max_file_loc": max(count_file_loc(path) for path in app_error_files),
        "api_client_loc": sum(count_file_loc(path) for path in api_client_files),
        "api_client_max_file_loc": max(count_file_loc(path) for path in api_client_files),
        "api_client_models_fan_in_files": count_files_containing(
            api_client, "crate::models"
        ),
        "api_ports_loc": sum(count_file_loc(path) for path in api_ports_files),
        "api_ports_max_file_loc": max(count_file_loc(path) for path in api_ports_files),
        "debug_support_loc": sum(count_file_loc(path) for path in debug_support_files),
        "debug_support_max_file_loc": max(count_file_loc(path) for path in debug_support_files),
        "error_contract_loc": sum(count_file_loc(path) for path in error_contract_files),
        "error_contract_max_file_loc": max(count_file_loc(path) for path in error_contract_files),
        "health_check_loc": sum(count_file_loc(path) for path in health_check_files),
        "health_check_max_file_loc": max(count_file_loc(path) for path in health_check_files),
        "models_loc": count_rust_loc(models, ignore_ts_binding_attrs=True),
        "models_direct_dependents": len(list_direct_model_dependency_manifests()),
        "models_public_items": count_public_items(models),
        "port_types_loc": sum(count_file_loc(path) for path in port_types_files),
        "port_types_max_file_loc": max(count_file_loc(path) for path in port_types_files),
        "runtime_config_loc": sum(count_file_loc(path) for path in runtime_config_files),
        "runtime_config_max_file_loc": max(
            count_file_loc(path) for path in runtime_config_files
        ),
        "runtime_types_loc": sum(count_file_loc(path) for path in runtime_types_files),
        "runtime_types_max_file_loc": max(count_file_loc(path) for path in runtime_types_files),
        "security_core_loc": sum(count_file_loc(path) for path in security_core_files),
        "security_core_max_file_loc": max(
            count_file_loc(path) for path in security_core_files
        ),
        "site_manager_loc": sum(count_file_loc(path) for path in site_manager_files),
        "site_manager_max_file_loc": max(count_file_loc(path) for path in site_manager_files),
        "store_ports_loc": sum(count_file_loc(path) for path in store_ports_files),
        "store_ports_max_file_loc": max(count_file_loc(path) for path in store_ports_files),
        "ssh_ports_loc": sum(count_file_loc(path) for path in ssh_ports_files),
        "ssh_ports_max_file_loc": max(count_file_loc(path) for path in ssh_ports_files),
        "desktop_models_fan_in_files": count_files_containing(src_tauri, "crate::models"),
        "core_port_adapters_loc": sum(count_file_loc(path) for path in port_adapter_files),
        "core_port_adapter_max_file_loc": max(count_file_loc(path) for path in port_adapter_files),
        "local_store_loc": sum(count_file_loc(path) for path in local_store_files),
        "local_store_max_file_loc": max(count_file_loc(path) for path in local_store_files),
        "local_store_models_fan_in_files": count_files_containing(
            local_store, "crate::models"
        ),
        "session_store_loc": sum(count_file_loc(path) for path in session_store_files),
        "session_store_max_file_loc": max(count_file_loc(path) for path in session_store_files),
        "sftp_transfer_queue_loc": sum(
            count_file_loc(path) for path in sftp_transfer_queue_files
        ),
        "sftp_transfer_queue_max_file_loc": max(
            count_file_loc(path) for path in sftp_transfer_queue_files
        ),
        "ssh_terminal_bridge_loc": sum(
            count_file_loc(path) for path in ssh_terminal_bridge_files
        ),
        "ssh_terminal_bridge_max_file_loc": max(
            count_file_loc(path) for path in ssh_terminal_bridge_files
        ),
    }


def list_workspace_members() -> list[str]:
    document = tomllib.loads((ROOT_DIR / "Cargo.toml").read_text(encoding="utf-8"))
    return [str(member) for member in document.get("workspace", {}).get("members", [])]


def count_manifest_path_dependencies(manifest_path: Path) -> int:
    document = tomllib.loads(manifest_path.read_text(encoding="utf-8"))
    dependency_tables = [
        document.get("dependencies", {}),
        document.get("dev-dependencies", {}),
        document.get("build-dependencies", {}),
    ]
    return sum(
        1
        for table in dependency_tables
        for dependency in table.values()
        if isinstance(dependency, dict) and "path" in dependency
    )


def count_workspace_internal_path_edges() -> int:
    return sum(
        count_manifest_path_dependencies(ROOT_DIR / member / "Cargo.toml")
        for member in list_workspace_members()
    )


def count_placeholder_workspace_members() -> int:
    return sum(
        1
        for member in list_workspace_members()
        if count_rust_loc(ROOT_DIR / member / "src") < 10
    )


def count_rust_loc(
    path: Path, *, ignore_ts_binding_attrs: bool = False, exclude_tests: bool = False
) -> int:
    return sum(
        count_file_loc(file_path, ignore_ts_binding_attrs=ignore_ts_binding_attrs)
        for file_path in iter_rust_files(path, exclude_tests=exclude_tests)
    )


def iter_rust_files(path: Path, *, exclude_tests: bool = False):
    for file_path in path.rglob("*.rs"):
        if exclude_tests and "tests" in file_path.relative_to(path).parts:
            continue
        yield file_path


def count_file_loc(path: Path, *, ignore_ts_binding_attrs: bool = False) -> int:
    return sum(
        1
        for line in path.read_text().splitlines()
        if line.strip() and not is_ignored_ts_binding_attr(line, ignore_ts_binding_attrs)
    )


def is_ignored_ts_binding_attr(line: str, ignore_ts_binding_attrs: bool) -> bool:
    return ignore_ts_binding_attrs and line.strip().startswith(
        '#[cfg_attr(feature = "ts-bindings",'
    )


def count_public_items(path: Path) -> int:
    public_item = re.compile(r"^\s*pub\s+(struct|enum|type|trait)\b")
    return sum(
        1
        for file_path in path.rglob("*.rs")
        for line in file_path.read_text().splitlines()
        if public_item.search(line)
    )


def count_files_containing(path: Path, needle: str) -> int:
    return sum(1 for file_path in path.rglob("*.rs") if needle in file_path.read_text())


def list_direct_model_dependency_manifests() -> list[str]:
    model_dependency = re.compile(r"(?m)^\s*g5-admin-models\s*=")
    manifests: list[str] = []
    for manifest_path in sorted(ROOT_DIR.rglob("Cargo.toml")):
        relative_path = manifest_path.relative_to(ROOT_DIR).as_posix()
        if relative_path.startswith("target/"):
            continue
        if model_dependency.search(manifest_path.read_text()):
            manifests.append(relative_path)
    return manifests


def check_doc_build_radius_policy() -> list[str]:
    failures: list[str] = []
    banned_patterns = (
        "cargo check --workspace",
        "cargo clippy --workspace",
        "--manifest-path Cargo.toml --workspace",
        "--manifest-path ../Cargo.toml --workspace",
        "cargo test -p g5-admin-desktop export_ts_bindings",
        "cargo test -p g5-admin-desktop models::tests::export_ts_bindings",
        "cargo test --manifest-path src-tauri/Cargo.toml export_ts_bindings",
        "cargo test --manifest-path g5-admin/src-tauri/Cargo.toml export_ts_bindings",
        "--features ts-bindings export_ts_bindings -- --exact",
    )
    allowed_parts = {
        "specs/archive",
        "specs/HISTORY.md",
        "specs/codex",
    }
    scan_roots = [
        ROOT_DIR / "AGENTS.md",
        ROOT_DIR / ".agent",
        ROOT_DIR / "specs",
    ]

    for file_path in iter_policy_files(scan_roots):
        relative_path = file_path.relative_to(ROOT_DIR).as_posix()
        if any(relative_path.startswith(part) for part in allowed_parts):
            continue
        text = file_path.read_text()
        for pattern in banned_patterns:
            if pattern in text:
                failures.append(
                    f"{relative_path}: active governance docs must not prescribe `{pattern}`; use scoped cargo or audit:deep"
                )
    return failures


def check_runtime_model_import_policy() -> list[str]:
    failures: list[str] = []
    scan_roots = [
        ROOT_DIR / "g5-admin/src-tauri/src/app_state",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/activity.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/auth",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/backup.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/board",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/board_group",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/common.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/config.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/content.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/dashboard.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/debug.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/faq",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/layout",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/mail",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/mail_test.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/maintenance.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/master_lock.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/member",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/menu",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/menu.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/permission",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/permission.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/point",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/popular.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/popup",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/poll",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/push.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/qa.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/qa_config.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/report.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/schema.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/site",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/sms.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/sms_contact",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/sms_history",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/sms_message.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/sms_template",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/security",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/system_tools.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/theme.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/visit.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/commands/write_count.rs",
        ROOT_DIR / "g5-admin/src-tauri/src/core/port_adapters",
    ]

    for scan_root in scan_roots:
        scan_files = [scan_root] if scan_root.is_file() else scan_root.rglob("*.rs")
        for file_path in scan_files:
            if "crate::models" in file_path.read_text():
                relative_path = file_path.relative_to(ROOT_DIR).as_posix()
                failures.append(
                    f"{relative_path}: selected command/runtime boundary must import g5_admin_models::models directly instead of the desktop crate::models re-export"
                )

    return failures


def iter_policy_files(paths: list[Path]):
    for path in paths:
        if path.is_file():
            yield path
            continue
        if not path.exists():
            continue
        for file_path in path.rglob("*"):
            if file_path.suffix in {".md", ".toml", ".yaml", ".yml", ".json"}:
                yield file_path


if __name__ == "__main__":
    raise SystemExit(main())
