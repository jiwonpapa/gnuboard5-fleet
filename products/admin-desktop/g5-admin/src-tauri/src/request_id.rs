use uuid::Uuid;

pub fn next_request_id() -> String {
    Uuid::new_v4().to_string()
}
