use super::perform_health_check_with_policy;
use std::net::TcpListener as StdTcpListener;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::time::sleep;

#[tokio::test]
async fn health_check_retries_transport_errors_until_delayed_api_becomes_available() {
    let reserved = StdTcpListener::bind("127.0.0.1:0").expect("port should reserve");
    let address = reserved.local_addr().expect("address should resolve");
    drop(reserved);

    tokio::spawn(async move {
        sleep(Duration::from_millis(250)).await;
        let listener = TcpListener::bind(address)
            .await
            .expect("listener should bind");
        let (mut socket, _) = listener.accept().await.expect("connection should arrive");
        let mut buffer = [0_u8; 1024];
        let _ = socket.read(&mut buffer).await;
        socket
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK")
            .await
            .expect("response should write");
    });

    let result = perform_health_check_with_policy(
        &format!("http://{address}"),
        Duration::from_millis(120),
        Duration::from_millis(120),
        Duration::from_millis(900),
        Duration::from_millis(100),
    )
    .await
    .expect("health check should succeed");

    assert!(result.reachable);
    let expected_url = format!("http://{address}/api/v1");
    assert_eq!(result.resolved_url.as_deref(), Some(expected_url.as_str()));
}

#[tokio::test]
async fn health_check_reports_missing_api_boundary_when_root_responds_but_api_path_does_not() {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener should bind");
    let address = listener.local_addr().expect("address should resolve");

    tokio::spawn(async move {
        for _ in 0..2 {
            let (mut socket, _) = listener.accept().await.expect("connection should arrive");
            let mut buffer = [0_u8; 1024];
            let read = socket.read(&mut buffer).await.expect("request should read");
            let request = String::from_utf8_lossy(&buffer[..read]);
            if request.starts_with("GET /api/v1/health ") {
                socket
                    .write_all(
                        b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                    )
                    .await
                    .expect("404 should write");
            } else {
                socket
                    .write_all(
                        b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK",
                    )
                    .await
                    .expect("200 should write");
            }
        }
    });

    let result = perform_health_check_with_policy(
        &format!("http://{address}"),
        Duration::from_millis(120),
        Duration::from_millis(120),
        Duration::from_millis(300),
        Duration::from_millis(50),
    )
    .await
    .expect("health check should return a diagnostic result");

    assert!(!result.reachable);
    assert!(result.message.contains("/api/v1 경계가 확인되지 않습니다"));
}

#[tokio::test]
async fn health_check_uses_health_endpoint_when_api_root_is_not_browsable() {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener should bind");
    let address = listener.local_addr().expect("address should resolve");

    tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.expect("connection should arrive");
        let mut buffer = [0_u8; 1024];
        let read = socket.read(&mut buffer).await.expect("request should read");
        let request = String::from_utf8_lossy(&buffer[..read]);
        assert!(request.starts_with("GET /api/v1/health "));
        socket
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK")
            .await
            .expect("200 should write");
    });

    let api_base_url = format!("http://{address}/api/v1");
    let result = perform_health_check_with_policy(
        &api_base_url,
        Duration::from_millis(120),
        Duration::from_millis(120),
        Duration::from_millis(300),
        Duration::from_millis(50),
    )
    .await
    .expect("health check should succeed");

    assert!(result.reachable);
    assert_eq!(result.resolved_url.as_deref(), Some(api_base_url.as_str()));
}
