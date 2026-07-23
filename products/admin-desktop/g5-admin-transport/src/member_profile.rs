use crate::{ApiClientError, RequestConfig, TransportClient};
use g5_admin_error_contract::{ApiTraceMeta, HasApiTraceMeta, Traced};
use g5_admin_port_types::MemberProfileRecord;
use reqwest::Method;
use serde::Deserialize;

#[derive(Deserialize)]
struct MemberEnvelope {
    data: MemberProfileWire,
    #[serde(default)]
    meta: ApiTraceMeta,
}

impl HasApiTraceMeta for MemberEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Deserialize)]
struct MemberProfileWire {
    mb_id: String,
    mb_name: Option<String>,
    mb_nick: Option<String>,
    mb_email: Option<String>,
    mb_level: Option<i32>,
    mb_point: Option<i32>,
}

impl From<MemberProfileWire> for MemberProfileRecord {
    fn from(profile: MemberProfileWire) -> Self {
        Self {
            mb_id: profile.mb_id,
            mb_name: profile.mb_name,
            mb_nick: profile.mb_nick,
            mb_email: profile.mb_email,
            mb_level: profile.mb_level,
            mb_point: profile.mb_point,
        }
    }
}

impl TransportClient {
    pub async fn get_my_profile(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<MemberProfileRecord>, ApiClientError> {
        let response = self
            .send_json::<(), (), MemberEnvelope>(
                request_id,
                Method::GET,
                "/members/me",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: MemberEnvelope| payload.data.into()))
    }
}
