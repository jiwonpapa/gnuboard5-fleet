use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPushMessageRequest {
    pub title: String,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub member_ids: Option<Vec<String>>,
}

impl AdminPushMessageRequest {
    pub fn is_valid(&self) -> bool {
        if !bounded_required(&self.title, 255)
            || !bounded_required(&self.body, 65_535)
            || !valid_optional(&self.r#type, 64)
        {
            return false;
        }

        match (&self.target, &self.member_ids) {
            (Some(target), None) => target == "all",
            (None, Some(member_ids)) => {
                !member_ids.is_empty()
                    && member_ids.len() <= 1_000
                    && member_ids
                        .iter()
                        .all(|member_id| bounded_required(member_id, 20))
                    && member_ids.iter().collect::<BTreeSet<_>>().len() == member_ids.len()
            }
            _ => false,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPushMessageResult {
    pub requested_by: String,
    pub target_count: i64,
    pub queued: i64,
    pub failed: i64,
}

fn bounded_required(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

fn valid_optional(value: &Option<String>, max: usize) -> bool {
    value
        .as_ref()
        .is_none_or(|value| bounded_required(value, max))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn targeted() -> AdminPushMessageRequest {
        AdminPushMessageRequest {
            title: "운영 공지".into(),
            body: "점검 안내입니다.".into(),
            r#type: Some("manual".into()),
            target: None,
            member_ids: Some(vec!["member-a".into(), "member-b".into()]),
        }
    }

    #[test]
    fn push_requires_exactly_one_valid_target_mode() {
        assert!(targeted().is_valid());
        assert!(
            AdminPushMessageRequest {
                target: Some("all".into()),
                member_ids: None,
                ..targeted()
            }
            .is_valid()
        );
        assert!(
            !AdminPushMessageRequest {
                target: Some("all".into()),
                ..targeted()
            }
            .is_valid()
        );
        assert!(
            !AdminPushMessageRequest {
                target: None,
                member_ids: None,
                ..targeted()
            }
            .is_valid()
        );
    }

    #[test]
    fn push_rejects_blank_duplicate_and_oversized_fields() {
        assert!(
            !AdminPushMessageRequest {
                title: " ".into(),
                ..targeted()
            }
            .is_valid()
        );
        assert!(
            !AdminPushMessageRequest {
                member_ids: Some(vec!["member-a".into(), "member-a".into()]),
                ..targeted()
            }
            .is_valid()
        );
        assert!(
            !AdminPushMessageRequest {
                r#type: Some("x".repeat(65)),
                ..targeted()
            }
            .is_valid()
        );
    }
}
