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

    /// Read a CSV/TSV file and return structured sheet data with inferred column types.
    /// Delimiter is detected from the file extension (.tsv → tab) or by sniffing
    /// the first line for semicolons vs commas.
    pub fn read_csv(&self, file_path: &str) -> Result<SheetData, AppError> {
        let full_path = self.resolve_path(file_path);
        if !full_path.exists() {
            return Err(AppError::FileNotFound(file_path.to_string()));
        }

        let metadata = fs::metadata(&full_path)?;
        let size_bytes = metadata.len();

        let delimiter = detect_delimiter(&full_path, file_path);

        let mut reader = csv::ReaderBuilder::new()
            .delimiter(delimiter)
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
            delimiter: delimiter as char,
            size_bytes,
        };

        Ok(SheetData {
            columns,
            rows,
            meta,
        })
    }

    /// Write columns and rows to a CSV/TSV file. Returns the resulting file size in bytes.
    /// Delimiter is chosen from the file extension (.tsv → tab, .csv → comma/semicolon).
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

        let delimiter = detect_delimiter(&full_path, file_path);

        let mut writer = csv::WriterBuilder::new()
            .delimiter(delimiter)
            .from_path(&full_path)?;

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

    /// Create a new empty CSV/TSV file with the given columns.
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

        let delimiter = detect_delimiter(&full_path, file_path);

        let mut writer = csv::WriterBuilder::new()
            .delimiter(delimiter)
            .from_path(&full_path)?;
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

/// Detect the delimiter for a file based on its extension and content.
/// - `.tsv` → tab
/// - `.csv` → sniff first line: if semicolons outnumber commas, use semicolon; else comma
/// - anything else → comma
fn detect_delimiter(full_path: &Path, file_path: &str) -> u8 {
    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "tsv" => b'\t',
        _ => {
            // Sniff the first line to detect semicolon-separated files
            if full_path.exists() {
                if let Ok(content) = fs::read_to_string(full_path) {
                    if let Some(first_line) = content.lines().next() {
                        let semicolons = first_line.matches(';').count();
                        let commas = first_line.matches(',').count();
                        if semicolons > commas {
                            return b';';
                        }
                    }
                }
            }
            b','
        }
    }
}

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
            let mut _text_count = 0u32;
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
                                _text_count += 1;
                            }
                        }
                        _ => {
                            _text_count += 1;
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_detect_delimiter_csv() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("data.csv");
        fs::write(&path, "a,b,c\n1,2,3\n").unwrap();
        assert_eq!(detect_delimiter(&path, "data.csv"), b',');
    }

    #[test]
    fn test_detect_delimiter_tsv() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("data.tsv");
        fs::write(&path, "a\tb\tc\n1\t2\t3\n").unwrap();
        assert_eq!(detect_delimiter(&path, "data.tsv"), b'\t');
    }

    #[test]
    fn test_detect_delimiter_semicolon() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("data.csv");
        fs::write(&path, "a;b;c\n1;2;3\n").unwrap();
        assert_eq!(detect_delimiter(&path, "data.csv"), b';');
    }

    #[test]
    fn test_detect_delimiter_nonexistent_file() {
        let path = Path::new("/tmp/nonexistent_test_file.csv");
        assert_eq!(detect_delimiter(path, "nonexistent.csv"), b',');
    }

    #[test]
    fn test_read_csv_comma() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("data.csv"), "name,age\nAlice,30\nBob,25\n").unwrap();

        let service = FileService::new(dir.path());
        let result = service.read_csv("data.csv").unwrap();

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].field, "name");
        assert_eq!(result.columns[1].field, "age");
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.meta.delimiter, ',');
    }

    #[test]
    fn test_read_csv_tab() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("data.tsv"), "name\tage\nAlice\t30\nBob\t25\n").unwrap();

        let service = FileService::new(dir.path());
        let result = service.read_csv("data.tsv").unwrap();

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].field, "name");
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.meta.delimiter, '\t');
    }

    #[test]
    fn test_read_csv_semicolon() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("data.csv"), "name;age\nAlice;30\nBob;25\n").unwrap();

        let service = FileService::new(dir.path());
        let result = service.read_csv("data.csv").unwrap();

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].field, "name");
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.meta.delimiter, ';');
    }

    #[test]
    fn test_write_and_read_roundtrip() {
        let dir = TempDir::new().unwrap();
        let service = FileService::new(dir.path());

        let columns = vec![
            Column { field: "x".into(), header_name: "X".into(), col_type: ColumnType::Text },
            Column { field: "y".into(), header_name: "Y".into(), col_type: ColumnType::Number },
        ];
        let rows = vec![
            {
                let mut r = Row::new();
                r.insert("x".into(), serde_json::Value::String("hello".into()));
                r.insert("y".into(), serde_json::json!(42));
                r
            },
        ];

        service.write_csv("out.csv", &columns, &rows).unwrap();
        let result = service.read_csv("out.csv").unwrap();

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.rows.len(), 1);
        assert_eq!(
            result.rows[0].get("x").unwrap(),
            &serde_json::Value::String("hello".into())
        );
    }

    #[test]
    fn test_write_tsv_roundtrip() {
        let dir = TempDir::new().unwrap();
        let service = FileService::new(dir.path());

        let columns = vec![
            Column { field: "a".into(), header_name: "A".into(), col_type: ColumnType::Text },
            Column { field: "b".into(), header_name: "B".into(), col_type: ColumnType::Text },
        ];
        let rows = vec![
            {
                let mut r = Row::new();
                r.insert("a".into(), serde_json::Value::String("one".into()));
                r.insert("b".into(), serde_json::Value::String("two".into()));
                r
            },
        ];

        service.write_csv("out.tsv", &columns, &rows).unwrap();

        // Verify the file actually has tabs
        let content = fs::read_to_string(dir.path().join("out.tsv")).unwrap();
        assert!(content.contains('\t'), "TSV file should contain tab characters");
        assert!(!content.contains(','), "TSV file should not contain commas as delimiters");

        let result = service.read_csv("out.tsv").unwrap();
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.meta.delimiter, '\t');
    }

    #[test]
    fn test_list_csv_files_finds_csv_and_tsv() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.csv"), "x\n1\n").unwrap();
        fs::write(dir.path().join("b.tsv"), "y\n2\n").unwrap();
        fs::write(dir.path().join("c.txt"), "not a csv").unwrap();

        let service = FileService::new(dir.path());
        let files = service.list_csv_files().unwrap();

        let names: Vec<&str> = files.iter().map(|f| f.name.as_str()).collect();
        assert!(names.contains(&"a.csv"));
        assert!(names.contains(&"b.tsv"));
        assert!(!names.contains(&"c.txt"));
    }

    #[test]
    fn test_file_not_found() {
        let dir = TempDir::new().unwrap();
        let service = FileService::new(dir.path());

        let result = service.read_csv("nonexistent.csv");
        assert!(result.is_err());
    }

    #[test]
    fn test_create_csv() {
        let dir = TempDir::new().unwrap();
        let service = FileService::new(dir.path());

        let columns = vec![
            Column { field: "id".into(), header_name: "ID".into(), col_type: ColumnType::Number },
        ];

        service.create_csv("new.csv", &columns).unwrap();

        let result = service.read_csv("new.csv").unwrap();
        assert_eq!(result.columns.len(), 1);
        assert_eq!(result.rows.len(), 0);
    }

    #[test]
    fn test_create_csv_already_exists() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("existing.csv"), "a\n1\n").unwrap();

        let service = FileService::new(dir.path());
        let columns = vec![
            Column { field: "a".into(), header_name: "A".into(), col_type: ColumnType::Text },
        ];

        let result = service.create_csv("existing.csv", &columns);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_file() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("to_delete.csv"), "a\n1\n").unwrap();

        let service = FileService::new(dir.path());
        service.delete_file("to_delete.csv").unwrap();

        assert!(!dir.path().join("to_delete.csv").exists());
    }

    #[test]
    fn test_infer_value_types() {
        assert_eq!(infer_value("42"), serde_json::json!(42));
        assert_eq!(infer_value("3.14"), serde_json::json!(3.14));
        assert_eq!(infer_value("hello"), serde_json::json!("hello"));
        assert_eq!(infer_value(""), serde_json::Value::Null);
        assert_eq!(infer_value("true"), serde_json::json!(true));
        assert_eq!(infer_value("false"), serde_json::json!(false));
    }
}
