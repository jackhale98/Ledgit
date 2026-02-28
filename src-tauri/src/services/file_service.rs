use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};

use crate::models::error::AppError;
use crate::models::sheet::{Column, ColumnType, FileMeta, FileInfo, Row, SheetData};

pub struct FileService {
    repo_path: PathBuf,
}

impl FileService {
    pub fn new(repo_path: &Path) -> Self {
        Self {
            repo_path: repo_path.to_path_buf(),
        }
    }

    /// Read a CSV file and return structured sheet data with inferred column types.
    pub fn read_csv(&self, file_path: &str) -> Result<SheetData, AppError> {
        let full_path = self.resolve_path(file_path);
        if !full_path.exists() {
            return Err(AppError::FileNotFound(file_path.to_string()));
        }

        let metadata = fs::metadata(&full_path)?;
        let size_bytes = metadata.len();

        let mut reader = csv::ReaderBuilder::new()
            .flexible(true)
            .from_path(&full_path)?;

        let headers: Vec<String> = reader
            .headers()?
            .iter()
            .map(|h| h.to_string())
            .collect();

        let mut rows: Vec<Row> = Vec::new();
        for result in reader.records() {
            let record = result?;
            let mut row = Row::new();
            for (i, field) in record.iter().enumerate() {
                if let Some(header) = headers.get(i) {
                    row.insert(header.clone(), infer_value(field));
                }
            }
            rows.push(row);
        }

        let column_types = infer_column_types(&headers, &rows);
        let columns: Vec<Column> = headers
            .iter()
            .enumerate()
            .map(|(i, h)| Column {
                field: h.clone(),
                header_name: h.clone(),
                col_type: column_types
                    .get(i)
                    .cloned()
                    .unwrap_or(ColumnType::Text),
            })
            .collect();

        let row_count = rows.len();
        let meta = FileMeta {
            file_path: file_path.to_string(),
            row_count,
            delimiter: ',',
            size_bytes,
        };

        Ok(SheetData {
            columns,
            rows,
            meta,
        })
    }

    /// Write columns and rows to a CSV file. Returns the resulting file size in bytes.
    pub fn write_csv(
        &self,
        file_path: &str,
        columns: &[Column],
        rows: &[Row],
    ) -> Result<u64, AppError> {
        let full_path = self.resolve_path(file_path);

        // Ensure parent directory exists
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut writer = csv::Writer::from_path(&full_path)?;

        // Write header row
        let headers: Vec<&str> = columns.iter().map(|c| c.field.as_str()).collect();
        writer.write_record(&headers)?;

        // Write data rows
        for row in rows {
            let record: Vec<String> = columns
                .iter()
                .map(|col| {
                    row.get(&col.field)
                        .map(|v| match v {
                            serde_json::Value::String(s) => s.clone(),
                            serde_json::Value::Null => String::new(),
                            other => other.to_string(),
                        })
                        .unwrap_or_default()
                })
                .collect();
            writer.write_record(&record)?;
        }

        writer.flush()?;
        let metadata = fs::metadata(&full_path)?;
        Ok(metadata.len())
    }

    /// List all CSV files in the repository, recursively. Skips the .git directory.
    pub fn list_csv_files(&self) -> Result<Vec<FileInfo>, AppError> {
        let mut files = Vec::new();
        self.walk_dir(&self.repo_path, &mut files)?;
        files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(files)
    }

    /// Create a new empty CSV file with the given columns.
    pub fn create_csv(
        &self,
        file_path: &str,
        columns: &[Column],
    ) -> Result<(), AppError> {
        let full_path = self.resolve_path(file_path);

        if full_path.exists() {
            return Err(AppError::InvalidCsv(format!(
                "File already exists: {}",
                file_path
            )));
        }

        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut writer = csv::Writer::from_path(&full_path)?;
        let headers: Vec<&str> = columns.iter().map(|c| c.field.as_str()).collect();
        writer.write_record(&headers)?;
        writer.flush()?;

        Ok(())
    }

    /// Delete a file from the repository.
    pub fn delete_file(&self, file_path: &str) -> Result<(), AppError> {
        let full_path = self.resolve_path(file_path);
        if !full_path.exists() {
            return Err(AppError::FileNotFound(file_path.to_string()));
        }
        fs::remove_file(&full_path)?;
        Ok(())
    }

    // ── Private helpers ──────────────────────────────────────────────

    /// Resolve a relative file path against the repo root.
    fn resolve_path(&self, file_path: &str) -> PathBuf {
        let p = Path::new(file_path);
        if p.is_absolute() {
            p.to_path_buf()
        } else {
            self.repo_path.join(p)
        }
    }

    /// Recursively walk a directory, collecting CSV FileInfo entries.
    fn walk_dir(&self, dir: &Path, files: &mut Vec<FileInfo>) -> Result<(), AppError> {
        if !dir.is_dir() {
            return Ok(());
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            // Skip .git directory
            if path
                .file_name()
                .map(|n| n == ".git")
                .unwrap_or(false)
            {
                continue;
            }

            if path.is_dir() {
                self.walk_dir(&path, files)?;
            } else if let Some(ext) = path.extension() {
                if ext == "csv" || ext == "tsv" {
                    let metadata = fs::metadata(&path)?;
                    let modified: DateTime<Utc> = metadata.modified()?.into();

                    let rel_path = path
                        .strip_prefix(&self.repo_path)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .to_string();

                    files.push(FileInfo {
                        name: path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        path: rel_path,
                        size_bytes: metadata.len(),
                        modified: modified.to_rfc3339(),
                    });
                }
            }
        }

        Ok(())
    }
}

// ── Free-standing helpers ────────────────────────────────────────────

/// Try to parse a CSV cell value into a typed JSON value.
/// Attempts number, then boolean, then falls back to string.
fn infer_value(raw: &str) -> serde_json::Value {
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return serde_json::Value::Null;
    }

    // Try integer
    if let Ok(n) = trimmed.parse::<i64>() {
        return serde_json::Value::Number(n.into());
    }

    // Try float
    if let Ok(f) = trimmed.parse::<f64>() {
        if let Some(n) = serde_json::Number::from_f64(f) {
            return serde_json::Value::Number(n);
        }
    }

    // Try boolean
    match trimmed.to_lowercase().as_str() {
        "true" | "yes" | "1" => return serde_json::Value::Bool(true),
        "false" | "no" | "0" => return serde_json::Value::Bool(false),
        _ => {}
    }

    serde_json::Value::String(raw.to_string())
}

/// Sample up to the first 100 rows to determine the predominant type for each column.
fn infer_column_types(headers: &[String], rows: &[Row]) -> Vec<ColumnType> {
    let sample_size = rows.len().min(100);
    let sample = &rows[..sample_size];

    headers
        .iter()
        .map(|header| {
            let mut num_count = 0u32;
            let mut bool_count = 0u32;
            let mut date_count = 0u32;
            let mut text_count = 0u32;
            let mut non_null = 0u32;

            for row in sample {
                if let Some(val) = row.get(header) {
                    match val {
                        serde_json::Value::Null => {}
                        serde_json::Value::Number(_) => {
                            num_count += 1;
                            non_null += 1;
                        }
                        serde_json::Value::Bool(_) => {
                            bool_count += 1;
                            non_null += 1;
                        }
                        serde_json::Value::String(s) => {
                            non_null += 1;
                            // Check if the string looks like a date (YYYY-MM-DD pattern)
                            if looks_like_date(s) {
                                date_count += 1;
                            } else {
                                text_count += 1;
                            }
                        }
                        _ => {
                            text_count += 1;
                            non_null += 1;
                        }
                    }
                }
            }

            if non_null == 0 {
                return ColumnType::Text;
            }

            // Majority wins
            let threshold = non_null / 2;
            if num_count > threshold {
                ColumnType::Number
            } else if bool_count > threshold {
                ColumnType::Boolean
            } else if date_count > threshold {
                ColumnType::Date
            } else {
                ColumnType::Text
            }
        })
        .collect()
}

/// Simple heuristic to detect date-like strings (YYYY-MM-DD, MM/DD/YYYY, etc.).
fn looks_like_date(s: &str) -> bool {
    let trimmed = s.trim();
    if trimmed.len() < 8 || trimmed.len() > 25 {
        return false;
    }

    // YYYY-MM-DD
    if trimmed.len() >= 10 {
        let bytes = trimmed.as_bytes();
        if bytes.len() >= 10
            && bytes[4] == b'-'
            && bytes[7] == b'-'
            && bytes[0..4].iter().all(|b| b.is_ascii_digit())
            && bytes[5..7].iter().all(|b| b.is_ascii_digit())
            && bytes[8..10].iter().all(|b| b.is_ascii_digit())
        {
            return true;
        }
    }

    // MM/DD/YYYY
    if trimmed.contains('/') {
        let parts: Vec<&str> = trimmed.split('/').collect();
        if parts.len() == 3
            && parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit()))
        {
            return true;
        }
    }

    false
}
