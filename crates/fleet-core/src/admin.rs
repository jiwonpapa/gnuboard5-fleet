use std::collections::BTreeMap;

use serde::{
    Deserialize, Serialize, Serializer,
    de::{self, Deserializer},
    ser::SerializeMap,
};
use serde_json::{Map, Value};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct AdminConfig {
    pub fields: BTreeMap<String, String>,
}

impl AdminConfig {
    pub fn get(&self, name: &str) -> Option<&str> {
        self.fields.get(name).map(String::as_str)
    }
}

impl<'de> Deserialize<'de> for AdminConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = Map::<String, Value>::deserialize(deserializer)?;
        let mut fields = BTreeMap::new();
        for (name, value) in raw {
            let value = normalize_scalar::<D::Error>(&name, value)?;
            fields.insert(name, value);
        }
        Ok(Self { fields })
    }
}

impl Serialize for AdminConfig {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut map = serializer.serialize_map(Some(self.fields.len()))?;
        for (name, value) in &self.fields {
            map.serialize_entry(name, value)?;
        }
        map.end()
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct AdminConfigUpdate {
    pub fields: BTreeMap<String, Value>,
}

impl AdminConfigUpdate {
    pub fn is_empty(&self) -> bool {
        self.fields.is_empty()
    }
}

impl<'de> Deserialize<'de> for AdminConfigUpdate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = Map::<String, Value>::deserialize(deserializer)?;
        if raw.is_empty() {
            return Err(de::Error::custom(
                "admin config update requires at least one changed field",
            ));
        }
        let mut fields = BTreeMap::new();
        for (name, value) in raw {
            match value {
                Value::String(_) | Value::Number(_) | Value::Bool(_) => {
                    fields.insert(name, value);
                }
                other => {
                    return Err(de::Error::custom(format!(
                        "{name} must be string/number/bool, got {other}"
                    )));
                }
            }
        }
        Ok(Self { fields })
    }
}

impl Serialize for AdminConfigUpdate {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.fields.serialize(serializer)
    }
}

fn normalize_scalar<E>(name: &str, value: Value) -> Result<String, E>
where
    E: de::Error,
{
    match value {
        Value::Null => Ok(String::new()),
        Value::String(value) => Ok(value),
        Value::Number(value) => Ok(value.to_string()),
        Value::Bool(value) => Ok(if value { "1" } else { "0" }.to_owned()),
        other => Err(E::custom(format!(
            "{name} must be string/number/bool/null, got {other}"
        ))),
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminFieldOption {
    pub value: String,
    pub label: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminFieldOptionSource {
    pub kind: String,
    pub name: String,
    pub endpoint: Option<String>,
    pub value_field: Option<String>,
    pub label_field: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum AdminFieldDefaultValue {
    String(String),
    Number(f64),
    Boolean(bool),
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminFieldSchema {
    pub name: String,
    pub label: String,
    pub input_type: String,
    pub data_type: String,
    pub required: bool,
    pub create_only: bool,
    pub readonly_on_update: bool,
    pub description: Option<String>,
    pub default_value: Option<AdminFieldDefaultValue>,
    #[serde(default)]
    pub options: Vec<AdminFieldOption>,
    pub option_source: Option<AdminFieldOptionSource>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminSchemaLayout {
    pub desktop: String,
    pub mobile: String,
    pub single_open: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminSchemaSection {
    pub key: String,
    pub label: String,
    pub order: i32,
    pub description: Option<String>,
    #[serde(default)]
    pub fields: Vec<AdminFieldSchema>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminSchemaDomainSummary {
    pub domain: String,
    pub title: String,
    pub legacy_form: String,
    pub field_count: i32,
    pub section_count: i32,
    pub generated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminSchemaCatalog {
    #[serde(default)]
    pub items: Vec<AdminSchemaDomainSummary>,
    pub total: i32,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AdminSchemaDetail {
    pub domain: String,
    pub title: String,
    pub legacy_form: String,
    pub generated_at: String,
    pub field_count: i32,
    pub section_count: i32,
    pub layout: Option<AdminSchemaLayout>,
    #[serde(default)]
    pub sections: Vec<AdminSchemaSection>,
    #[serde(default)]
    pub fields_by_name: BTreeMap<String, AdminFieldSchema>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardMemberSummary {
    pub total_members: Option<i64>,
    pub blocked_members: Option<i64>,
    pub leave_members: Option<i64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardCountSummary {
    pub total_rows: Option<i64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminVisitStatsSummary {
    pub total_visits: Option<i64>,
    pub active_days: Option<i64>,
    pub first_date: Option<String>,
    pub last_date: Option<String>,
    pub visit_rows: Option<i64>,
    pub unique_ips: Option<i64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardSummary {
    pub members: Option<AdminDashboardMemberSummary>,
    pub posts: Option<AdminDashboardCountSummary>,
    pub points: Option<AdminDashboardCountSummary>,
    pub visits: Option<AdminVisitStatsSummary>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardRecentMember {
    pub mb_id: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_level: Option<i64>,
    pub mb_point: Option<i64>,
    pub mb_datetime: Option<String>,
    pub mb_mailling: Option<bool>,
    pub mb_open: Option<bool>,
    pub email_certified: Option<bool>,
    pub intercepted: Option<bool>,
    pub group_count: Option<i64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardRecentPost {
    pub bn_id: Option<i64>,
    pub gr_id: Option<String>,
    pub gr_subject: Option<String>,
    pub bo_table: Option<String>,
    pub bo_subject: Option<String>,
    pub wr_id: Option<i64>,
    pub wr_parent: Option<i64>,
    pub view_type: Option<String>,
    pub wr_subject: Option<String>,
    pub parent_wr_subject: Option<String>,
    pub wr_name: Option<String>,
    pub wr_datetime: Option<String>,
    pub post_mb_id: Option<String>,
    pub post_exists: Option<bool>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardRecentPoint {
    pub po_id: Option<i64>,
    pub mb_id: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub po_datetime: Option<String>,
    pub po_content: Option<String>,
    pub po_point: Option<i64>,
    pub po_mb_point: Option<i64>,
    pub po_rel_table: Option<String>,
    pub po_rel_id: Option<String>,
    pub po_rel_action: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct AdminDashboardData {
    pub limit: Option<i64>,
    pub summary: Option<AdminDashboardSummary>,
    #[serde(default)]
    pub recent_members: Vec<AdminDashboardRecentMember>,
    #[serde(default)]
    pub recent_posts: Vec<AdminDashboardRecentPost>,
    #[serde(default)]
    pub recent_points: Vec<AdminDashboardRecentPoint>,
}

#[cfg(test)]
mod tests {
    use super::{AdminConfig, AdminConfigUpdate};

    #[test]
    fn admin_config_accepts_string_number_and_bool_scalars() {
        let parsed: AdminConfig = serde_json::from_str(
            r#"{
                "cf_title": "G5",
                "cf_admin": "admin",
                "cf_register_level": 2,
                "cf_login_point": 100,
                "cf_use_point": 1,
                "cf_use_email_certify": true,
                "cf_login_minutes": 30
            }"#,
        )
        .expect("admin config should deserialize");

        assert_eq!(parsed.get("cf_title"), Some("G5"));
        assert_eq!(parsed.get("cf_admin"), Some("admin"));
        assert_eq!(parsed.get("cf_register_level"), Some("2"));
        assert_eq!(parsed.get("cf_login_point"), Some("100"));
        assert_eq!(parsed.get("cf_use_point"), Some("1"));
        assert_eq!(parsed.get("cf_use_email_certify"), Some("1"));
        assert_eq!(parsed.get("cf_login_minutes"), Some("30"));
    }

    #[test]
    fn admin_config_rejects_nested_object_field() {
        let error = serde_json::from_str::<AdminConfig>(
            r#"{
                "cf_title": {"bad": "shape"}
            }"#,
        )
        .expect_err("nested object must fail");

        assert!(error.to_string().contains("cf_title"));
    }

    #[test]
    fn admin_config_update_requires_changed_scalar_fields() {
        assert!(serde_json::from_str::<AdminConfigUpdate>("{}").is_err());
        assert!(
            serde_json::from_str::<AdminConfigUpdate>(r#"{"cf_title":{"bad":"shape"}}"#).is_err()
        );
        let update: AdminConfigUpdate =
            serde_json::from_str(r#"{"cf_title":"Fleet","cf_use_point":true}"#)
                .expect("flat changed fields");
        assert_eq!(update.fields.len(), 2);
    }
}
