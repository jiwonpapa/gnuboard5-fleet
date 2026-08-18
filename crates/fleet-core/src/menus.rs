use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenu {
    pub me_id: i64,
    pub me_code: String,
    pub me_name: String,
    pub me_link: String,
    pub me_target: String,
    pub me_order: i64,
    pub me_use: i64,
    pub me_mobile_use: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuList {
    pub items: Vec<AdminMenu>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuCreate {
    pub me_code: String,
    pub me_name: String,
    pub me_link: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_target: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_use: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_mobile_use: Option<i64>,
}

impl AdminMenuCreate {
    pub fn is_valid(&self) -> bool {
        valid_text(&self.me_code)
            && valid_text(&self.me_name)
            && valid_text(&self.me_link)
            && self.me_target.as_deref().is_none_or(valid_text)
            && self.me_order.is_none_or(|value| value >= 0)
            && self.me_use.is_none_or(valid_toggle)
            && self.me_mobile_use.is_none_or(valid_toggle)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_link: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_target: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_use: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub me_mobile_use: Option<i64>,
}

impl AdminMenuUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.me_code.is_some()
            || self.me_name.is_some()
            || self.me_link.is_some()
            || self.me_target.is_some()
            || self.me_order.is_some()
            || self.me_use.is_some()
            || self.me_mobile_use.is_some();
        has_change
            && self.me_code.as_deref().is_none_or(valid_text)
            && self.me_name.as_deref().is_none_or(valid_text)
            && self.me_link.as_deref().is_none_or(valid_text)
            && self.me_target.as_deref().is_none_or(valid_text)
            && self.me_order.is_none_or(|value| value >= 0)
            && self.me_use.is_none_or(valid_toggle)
            && self.me_mobile_use.is_none_or(valid_toggle)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuReorderItem {
    pub me_id: i64,
    pub me_order: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuReorder {
    pub orders: Vec<AdminMenuReorderItem>,
}

impl AdminMenuReorder {
    pub fn is_valid(&self) -> bool {
        !self.orders.is_empty()
            && self
                .orders
                .iter()
                .all(|item| valid_menu_id(item.me_id) && item.me_order >= 0)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMenuReorderResult {
    pub result: String,
}

pub fn valid_menu_id(value: i64) -> bool {
    value > 0
}

fn valid_text(value: &str) -> bool {
    !value.trim().is_empty()
}

fn valid_toggle(value: i64) -> bool {
    matches!(value, 0 | 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn menu_inputs_reuse_form_rules_and_fail_closed() {
        assert!(
            AdminMenuCreate {
                me_code: "100100".into(),
                me_name: "회사 소개".into(),
                me_link: "/content/company".into(),
                me_target: Some("_self".into()),
                me_order: Some(10),
                me_use: Some(1),
                me_mobile_use: Some(0),
            }
            .is_valid()
        );
        assert!(!AdminMenuUpdate::default().is_valid());
        assert!(
            !AdminMenuCreate {
                me_code: " ".into(),
                me_name: String::new(),
                me_link: String::new(),
                me_target: None,
                me_order: Some(-1),
                me_use: Some(2),
                me_mobile_use: None,
            }
            .is_valid()
        );
        assert!(
            AdminMenuReorder {
                orders: vec![AdminMenuReorderItem {
                    me_id: 1,
                    me_order: 0
                }],
            }
            .is_valid()
        );
        assert!(!AdminMenuReorder { orders: vec![] }.is_valid());
    }
}
