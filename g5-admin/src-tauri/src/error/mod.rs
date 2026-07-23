mod payload;

pub use g5_admin_app_error::AppError;
pub use payload::{AppErrorPayload, CommandResult};

#[cfg(test)]
mod tests;
