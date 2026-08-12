use serde::{Deserialize, Serialize};

use crate::{groups::valid_group_id, permissions::Pagination};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub gr_id: Option<String>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_direction: Option<String>,
}

impl AdminBoardListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self.gr_id.as_deref().is_none_or(valid_group_id)
            && self
                .search
                .as_deref()
                .is_none_or(|value| value.len() <= 200)
            && self.sort_by.as_deref().is_none_or(|value| {
                matches!(
                    value,
                    "bo_table" | "bo_subject" | "gr_id" | "bo_count_write" | "bo_count_comment"
                )
            })
            && self
                .sort_direction
                .as_deref()
                .is_none_or(|value| matches!(value, "ASC" | "DESC"))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoard {
    pub bo_table: String,
    pub bo_subject: Option<String>,
    pub gr_id: Option<String>,
    pub bo_device: Option<String>,
    pub bo_use_category: Option<bool>,
    pub bo_category_list: Option<String>,
    pub bo_admin: Option<String>,
    pub bo_read_level: Option<i64>,
    pub bo_write_level: Option<i64>,
    pub bo_comment_level: Option<i64>,
    pub bo_download_level: Option<i64>,
    pub bo_use_secret: Option<i64>,
    pub bo_upload_count: Option<i64>,
    pub bo_upload_size: Option<i64>,
    pub bo_count_write: Option<i64>,
    pub bo_count_comment: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardList {
    pub items: Vec<AdminBoard>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardCreate {
    pub bo_table: String,
    pub bo_subject: String,
    pub gr_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_use_category: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_category_list: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_read_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_write_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_comment_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_download_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_use_secret: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_upload_count: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_upload_size: Option<i64>,
}

impl AdminBoardCreate {
    pub fn is_valid(&self) -> bool {
        valid_board_table(&self.bo_table)
            && valid_subject(&self.bo_subject)
            && valid_group_id(&self.gr_id)
            && valid_levels([
                self.bo_read_level,
                self.bo_write_level,
                self.bo_comment_level,
                self.bo_download_level,
            ])
            && valid_secret(self.bo_use_secret)
            && valid_nonnegative(self.bo_upload_count)
            && valid_nonnegative(self.bo_upload_size)
            && valid_category(self.bo_use_category, self.bo_category_list.as_deref())
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_use_category: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_category_list: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_read_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_write_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_comment_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_download_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_use_secret: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_upload_count: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bo_upload_size: Option<i64>,
}

impl AdminBoardUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.bo_subject.is_some()
            || self.gr_id.is_some()
            || self.bo_use_category.is_some()
            || self.bo_category_list.is_some()
            || self.bo_read_level.is_some()
            || self.bo_write_level.is_some()
            || self.bo_comment_level.is_some()
            || self.bo_download_level.is_some()
            || self.bo_use_secret.is_some()
            || self.bo_upload_count.is_some()
            || self.bo_upload_size.is_some();
        has_change
            && self.bo_subject.as_deref().is_none_or(valid_subject)
            && self.gr_id.as_deref().is_none_or(valid_group_id)
            && valid_levels([
                self.bo_read_level,
                self.bo_write_level,
                self.bo_comment_level,
                self.bo_download_level,
            ])
            && valid_secret(self.bo_use_secret)
            && valid_nonnegative(self.bo_upload_count)
            && valid_nonnegative(self.bo_upload_size)
            && valid_category(self.bo_use_category, self.bo_category_list.as_deref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardCopy {
    pub target_bo_table: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_bo_subject: Option<String>,
    #[serde(default)]
    pub copy_posts: bool,
}

impl AdminBoardCopy {
    pub fn is_valid(&self) -> bool {
        valid_board_table(&self.target_bo_table)
            && self.target_bo_subject.as_deref().is_none_or(valid_subject)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminNewPostsDelete {
    pub bn_ids: Vec<i64>,
}

impl AdminNewPostsDelete {
    pub fn is_valid(&self) -> bool {
        !self.bn_ids.is_empty()
            && self.bn_ids.iter().all(|value| *value > 0)
            && self
                .bn_ids
                .iter()
                .enumerate()
                .all(|(index, value)| !self.bn_ids[index + 1..].contains(value))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminNewPostsDeleteResult {
    pub deleted: bool,
    pub deleted_count: i64,
    pub deleted_posts: i64,
    pub deleted_comments: i64,
    pub skipped: i64,
    pub bn_ids: Vec<i64>,
}

pub fn valid_board_table(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 20
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn valid_subject(value: &str) -> bool {
    !value.trim().is_empty()
}

fn valid_levels(values: [Option<i64>; 4]) -> bool {
    values
        .into_iter()
        .all(|value| value.is_none_or(|level| (1..=10).contains(&level)))
}

fn valid_secret(value: Option<i64>) -> bool {
    value.is_none_or(|value| (0..=2).contains(&value))
}

fn valid_nonnegative(value: Option<i64>) -> bool {
    value.is_none_or(|value| value >= 0)
}

fn valid_category(enabled: Option<bool>, categories: Option<&str>) -> bool {
    categories.is_none_or(|value| value.len() <= 1000)
        && !(enabled == Some(true) && categories.is_some_and(|value| value.trim().is_empty()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn board_inputs_fail_closed_on_invalid_identifiers_levels_and_destructive_ids() {
        assert!(
            AdminBoardCreate {
                bo_table: "notice_1".into(),
                bo_subject: "공지".into(),
                gr_id: "community".into(),
                bo_use_category: Some(true),
                bo_category_list: Some("공지|일반".into()),
                bo_read_level: Some(1),
                bo_write_level: Some(10),
                bo_comment_level: Some(2),
                bo_download_level: Some(2),
                bo_use_secret: Some(0),
                bo_upload_count: Some(2),
                bo_upload_size: Some(1048576),
            }
            .is_valid()
        );
        assert!(
            !AdminBoardCreate {
                bo_table: "../notice".into(),
                bo_subject: " ".into(),
                gr_id: "bad-group".into(),
                bo_use_category: None,
                bo_category_list: None,
                bo_read_level: Some(11),
                bo_write_level: None,
                bo_comment_level: None,
                bo_download_level: None,
                bo_use_secret: Some(3),
                bo_upload_count: Some(-1),
                bo_upload_size: None,
            }
            .is_valid()
        );
        assert!(!AdminBoardUpdate::default().is_valid());
        assert!(AdminNewPostsDelete { bn_ids: vec![1, 2] }.is_valid());
        assert!(!AdminNewPostsDelete { bn_ids: vec![1, 1] }.is_valid());
        assert!(
            !AdminNewPostsDelete {
                bn_ids: vec![1, 2, 1]
            }
            .is_valid()
        );
    }
}
