use super::*;

#[derive(Default)]
struct FakeShell;

#[async_trait::async_trait]
impl SshShellPort for FakeShell {
    async fn write(&self, _data: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn read(&self) -> Result<SshShellReadResult, AppError> {
        Ok(SshShellReadResult::default())
    }

    async fn read_blocking(&self) -> Result<SshShellReadResult, AppError> {
        Ok(SshShellReadResult {
            stdout: "ready".to_string(),
            ..SshShellReadResult::default()
        })
    }

    async fn snapshot(&self) -> Result<String, AppError> {
        Ok("snapshot".to_string())
    }

    async fn resize(&self, _cols: u32, _rows: u32) -> Result<(), AppError> {
        Ok(())
    }

    async fn close(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[tokio::test]
async fn shell_port_contract_returns_read_result() {
    let shell: Arc<dyn SshShellPort + Send + Sync> = Arc::new(FakeShell);

    let output = shell.read_blocking().await.expect("read");

    assert_eq!(output.stdout, "ready");
    assert!(!output.closed);
}
