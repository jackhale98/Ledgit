use std::path::Path;

use tauri::State;

use crate::commands::file_commands::AppState;
use crate::models::error::AppError;
use crate::models::git::RepoInfo;
use crate::services::git_service::GitService;

/// Open an existing git repository and store its path in the app state.
#[tauri::command]
pub fn repo_open(state: State<AppState>, path: String) -> Result<RepoInfo, AppError> {
    let service = GitService::open(Path::new(&path))?;
    let info = service.repo_info()?;

    let mut guard = state.repo_path.lock().unwrap();
    *guard = Some(path);

    Ok(info)
}

/// Initialize a new git repository and store its path in the app state.
#[tauri::command]
pub fn repo_init(state: State<AppState>, path: String) -> Result<RepoInfo, AppError> {
    let service = GitService::init(Path::new(&path))?;
    let info = service.repo_info()?;

    let mut guard = state.repo_path.lock().unwrap();
    *guard = Some(path);

    Ok(info)
}

/// Open a folder picker dialog and return the selected path.
/// The frontend can then call repo_open or repo_init with the chosen path.
#[tauri::command]
pub async fn repo_open_dialog(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let dialog = app.dialog();
    let (tx, rx) = std::sync::mpsc::channel();

    dialog.file().pick_folder(move |folder| {
        let result = folder.map(|f| f.to_string());
        let _ = tx.send(result);
    });

    let result = rx
        .recv()
        .map_err(|_| AppError::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Dialog cancelled",
        )))?;

    Ok(result)
}

/// Get info about the currently opened repository.
#[tauri::command]
pub fn repo_info(state: State<AppState>) -> Result<RepoInfo, AppError> {
    let guard = state.repo_path.lock().unwrap();
    let path_str = guard.as_ref().ok_or(AppError::NoRepo)?;
    let service = GitService::open(Path::new(path_str))?;
    service.repo_info()
}
