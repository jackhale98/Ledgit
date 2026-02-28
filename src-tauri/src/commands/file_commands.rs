use std::path::Path;
use std::sync::Mutex;

use tauri::State;

use crate::models::error::AppError;
use crate::models::sheet::{Column, FileInfo, Row, SheetData};
use crate::services::file_service::FileService;

/// Shared application state holding the currently opened repository path.
pub struct AppState {
    pub repo_path: Mutex<Option<String>>,
}

/// Helper to get the FileService from the current AppState.
fn get_file_service(state: &State<AppState>) -> Result<FileService, AppError> {
    let guard = state.repo_path.lock().unwrap();
    let path_str = guard.as_ref().ok_or(AppError::NoRepo)?;
    Ok(FileService::new(Path::new(path_str)))
}

/// Read a CSV file and return structured sheet data.
#[tauri::command]
pub fn file_read_csv(
    state: State<AppState>,
    file_path: String,
) -> Result<SheetData, AppError> {
    let service = get_file_service(&state)?;
    service.read_csv(&file_path)
}

/// Write columns and rows to a CSV file. Returns the resulting file size.
#[tauri::command]
pub fn file_write_csv(
    state: State<AppState>,
    file_path: String,
    columns: Vec<Column>,
    rows: Vec<Row>,
) -> Result<u64, AppError> {
    let service = get_file_service(&state)?;
    service.write_csv(&file_path, &columns, &rows)
}

/// List all CSV files in the repository.
#[tauri::command]
pub fn file_list(state: State<AppState>) -> Result<Vec<FileInfo>, AppError> {
    let service = get_file_service(&state)?;
    service.list_csv_files()
}

/// Create a new empty CSV file with the given columns.
#[tauri::command]
pub fn file_create(
    state: State<AppState>,
    file_path: String,
    columns: Vec<Column>,
) -> Result<(), AppError> {
    let service = get_file_service(&state)?;
    service.create_csv(&file_path, &columns)
}

/// Delete a file from the repository.
#[tauri::command]
pub fn file_delete(
    state: State<AppState>,
    file_path: String,
) -> Result<(), AppError> {
    let service = get_file_service(&state)?;
    service.delete_file(&file_path)
}
