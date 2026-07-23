use std::env;

fn main() {
    let host = env::var("HOST").unwrap_or_default();
    let target = env::var("TARGET").unwrap_or_default();
    let cross_checking_windows = target.contains("windows") && !host.contains("windows");

    if cross_checking_windows {
        println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
        println!("cargo:rerun-if-changed=tauri.conf.json");
        println!("cargo:rerun-if-changed=app-config.json");
        println!("cargo:rerun-if-changed=capabilities");
        println!("cargo:rustc-check-cfg=cfg(desktop)");
        println!("cargo:rustc-check-cfg=cfg(mobile)");
        println!("cargo:rustc-check-cfg=cfg(dev)");
        println!("cargo:rustc-cfg=desktop");
        println!("cargo:rustc-env=TAURI_ENV_TARGET_TRIPLE={target}");
        env::set_var("TAURI_ENV_TARGET_TRIPLE", &target);
        println!(
            "cargo:warning=Skipping Windows resource compilation on non-Windows host; run official Windows bundles on Windows CI/host."
        );
        return;
    }

    tauri_build::build()
}
