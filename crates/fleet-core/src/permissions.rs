use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct Pagination {
    pub mode: Option<String>,
    pub total: Option<i64>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub last_page: Option<i64>,
    pub cursor: Option<String>,
    pub next_cursor: Option<String>,
    pub has_next: Option<bool>,
    pub has_prev: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct MemberProfile {
    pub mb_id: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i64>,
    pub mb_point: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminAuthAssignment {
    pub au_menu: String,
    pub au_auth: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminAuthMember {
    pub mb_id: String,
    pub mb_name: String,
    pub mb_nick: String,
    #[serde(default)]
    pub auths: Vec<AdminAuthAssignment>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPermission {
    pub mb_id: String,
    pub au_menu: String,
    pub au_auth: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminAuthListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub mb_id: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPermissionListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub mb_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminAuthMemberList {
    pub items: Vec<AdminAuthMember>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPermissionList {
    pub items: Vec<AdminSystemPermission>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminAuthUpsert {
    pub auths: Vec<AdminAuthAssignment>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPermissionSave {
    pub mb_id: String,
    pub au_menu: String,
    pub au_auth: String,
}

pub fn valid_member_id(value: &str) -> bool {
    (3..=20).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

pub fn valid_admin_menu(value: &str) -> bool {
    (3..=6).contains(&value.len()) && value.bytes().all(|byte| byte.is_ascii_digit())
}

pub fn valid_system_menu(value: &str) -> bool {
    (1..=50).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

pub fn normalize_auth(value: &str, comma_separated: bool) -> Option<String> {
    let mut found = [false; 3];
    for byte in value.bytes() {
        match byte.to_ascii_lowercase() {
            b'r' => found[0] = true,
            b'w' => found[1] = true,
            b'd' => found[2] = true,
            b',' | b' ' | b'\t' | b'\n' | b'\r' => {}
            _ => return None,
        }
    }
    let values = [("r", found[0]), ("w", found[1]), ("d", found[2])]
        .into_iter()
        .filter_map(|(value, present)| present.then_some(value))
        .collect::<Vec<_>>();
    (!values.is_empty()).then(|| values.join(if comma_separated { "," } else { "" }))
}

impl AdminAuthUpsert {
    pub fn normalized(&self) -> Option<Self> {
        if self.auths.is_empty() {
            return None;
        }
        let auths = self
            .auths
            .iter()
            .map(|entry| {
                valid_admin_menu(&entry.au_menu).then_some(AdminAuthAssignment {
                    au_menu: entry.au_menu.clone(),
                    au_auth: normalize_auth(&entry.au_auth, true)?,
                })
            })
            .collect::<Option<Vec<_>>>()?;
        Some(Self { auths })
    }
}

impl AdminSystemPermissionSave {
    pub fn normalized(&self) -> Option<Self> {
        valid_member_id(&self.mb_id)
            .then_some(())
            .and_then(|_| valid_system_menu(&self.au_menu).then_some(()))
            .and_then(|_| {
                Some(Self {
                    mb_id: self.mb_id.clone(),
                    au_menu: self.au_menu.clone(),
                    au_auth: normalize_auth(&self.au_auth, false)?,
                })
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permission_inputs_are_normalized_and_invalid_values_fail_closed() {
        let input = AdminSystemPermissionSave {
            mb_id: "admin_1".into(),
            au_menu: "config_100".into(),
            au_auth: "D, r, r".into(),
        };
        assert_eq!(input.normalized().unwrap().au_auth, "rd");
        assert!(!valid_member_id("../admin"));
        assert!(!valid_system_menu("menu/path"));
        assert!(normalize_auth("rx", false).is_none());
    }

    #[test]
    fn grouped_auth_requires_numeric_menu_and_non_empty_grants() {
        let input = AdminAuthUpsert {
            auths: vec![AdminAuthAssignment {
                au_menu: "100100".into(),
                au_auth: "W,R".into(),
            }],
        };
        assert_eq!(input.normalized().unwrap().auths[0].au_auth, "r,w");
        assert!(AdminAuthUpsert { auths: vec![] }.normalized().is_none());
    }
}
