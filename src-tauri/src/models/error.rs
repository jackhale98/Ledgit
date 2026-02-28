use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid CSV: {0}")]
    InvalidCsv(String),

    #[error("Git error: {0}")]
    GitError(#[from] git2::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("CSV parse error: {0}")]
    CsvError(#[from] csv::Error),

    #[error("No repository open")]
    NoRepo,

    #[error("Merge conflict in {0}")]
    MergeConflict(String),

    #[error("Repository already exists at {0}")]
    RepoExists(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
