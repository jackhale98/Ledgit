use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub field: String,
    pub header_name: String,
    #[serde(default)]
    pub col_type: ColumnType,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "lowercase")]
pub enum ColumnType {
    #[default]
    Text,
    Number,
    Date,
    Boolean,
}

pub type Row = std::collections::HashMap<String, serde_json::Value>;

#[derive(Debug, Serialize, Deserialize)]
pub struct SheetData {
    pub columns: Vec<Column>,
    pub rows: Vec<Row>,
    pub meta: FileMeta,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMeta {
    pub file_path: String,
    pub row_count: usize,
    pub delimiter: char,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified: String,
}
