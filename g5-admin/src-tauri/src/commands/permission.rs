use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) mod auth;
pub(crate) mod permissions;

const PERMISSION_COMPONENT: &str = "g5_admin::commands::permission";

fn deleted_message(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}
