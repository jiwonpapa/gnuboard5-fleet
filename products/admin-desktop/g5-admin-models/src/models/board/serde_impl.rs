use super::contract::AdminBoard;
use super::{collect_extra_scalars, read_i32_like, read_required_string_like, read_string_like};
use serde::de::Deserializer;
use serde::Deserialize;
use serde_json::{Map, Value};

impl<'de> Deserialize<'de> for AdminBoard {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let mut raw = Map::<String, Value>::deserialize(deserializer)?;

        Ok(Self {
            bo_table: read_required_string_like::<D::Error>(&mut raw, "bo_table")?,
            bo_subject: read_string_like::<D::Error>(&mut raw, "bo_subject")?,
            gr_id: read_string_like::<D::Error>(&mut raw, "gr_id")?,
            bo_read_level: read_i32_like::<D::Error>(&mut raw, "bo_read_level")?,
            bo_write_level: read_i32_like::<D::Error>(&mut raw, "bo_write_level")?,
            bo_comment_level: read_i32_like::<D::Error>(&mut raw, "bo_comment_level")?,
            bo_download_level: read_i32_like::<D::Error>(&mut raw, "bo_download_level")?,
            bo_use_category: read_i32_like::<D::Error>(&mut raw, "bo_use_category")?,
            bo_category_list: read_string_like::<D::Error>(&mut raw, "bo_category_list")?,
            bo_count_write: read_i32_like::<D::Error>(&mut raw, "bo_count_write")?,
            bo_count_comment: read_i32_like::<D::Error>(&mut raw, "bo_count_comment")?,
            bo_use_secret: read_i32_like::<D::Error>(&mut raw, "bo_use_secret")?,
            bo_upload_count: read_i32_like::<D::Error>(&mut raw, "bo_upload_count")?,
            bo_upload_size: read_i32_like::<D::Error>(&mut raw, "bo_upload_size")?,
            extra: collect_extra_scalars::<D::Error>(&raw)?,
        })
    }
}
