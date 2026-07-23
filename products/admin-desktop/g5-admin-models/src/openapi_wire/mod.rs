//! Canonical PHP OpenAPI wire contract.
//!
//! `generated` owns the serde/ts-rs DTO inventory and the compact active
//! operation manifest.  The validator is called by the shared transport before
//! a response is deserialized into any presentation-oriented DTO.

mod generated;
mod validator;

pub use generated::*;
pub use validator::{validate_active_request, validate_active_response, ActiveWireContractError};
