#[path = "live_admin_domain_roundtrip/mod.rs"]
mod harness;

use harness::{run, Args};

#[tokio::main]
async fn main() {
    let args = Args::parse().unwrap_or_else(|error| {
        eprintln!("{error}");
        std::process::exit(2);
    });
    match run(args).await {
        Ok(true) => {}
        Ok(false) => std::process::exit(1),
        Err(error) => {
            eprintln!("live admin domain roundtrip failed: {error}");
            std::process::exit(1);
        }
    }
}
