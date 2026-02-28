use std::path::Path;

use tauri::State;

use crate::commands::file_commands::AppState;
use crate::models::error::AppError;
use crate::models::git::{BranchList, Commit, MergeResult, PullResult, Remote, RepoStatus};
use crate::services::git_service::GitService;

/// Helper to get the GitService from the current AppState.
fn get_git_service(state: &State<AppState>) -> Result<GitService, AppError> {
    let guard = state.repo_path.lock().unwrap();
    let path_str = guard.as_ref().ok_or(AppError::NoRepo)?;
    GitService::open(Path::new(path_str))
}

/// Get the current repository status.
#[tauri::command]
pub fn git_status(state: State<AppState>) -> Result<RepoStatus, AppError> {
    let service = get_git_service(&state)?;
    service.status()
}

/// Stage files and create a commit.
#[tauri::command]
pub fn git_commit(
    state: State<AppState>,
    message: String,
    files: Vec<String>,
) -> Result<Commit, AppError> {
    let service = get_git_service(&state)?;
    service.commit(&message, &files)
}

/// Get the commit log with optional file filter and pagination.
#[tauri::command]
pub fn git_log(
    state: State<AppState>,
    file: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<Commit>, AppError> {
    let service = get_git_service(&state)?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    service.log(file.as_deref(), limit, offset)
}

/// Show the contents of a file at a specific commit.
#[tauri::command]
pub fn git_show_file(
    state: State<AppState>,
    hash: String,
    file_path: String,
) -> Result<String, AppError> {
    let service = get_git_service(&state)?;
    service.show_file(&hash, &file_path)
}

/// List all branches.
#[tauri::command]
pub fn git_branches(state: State<AppState>) -> Result<BranchList, AppError> {
    let service = get_git_service(&state)?;
    service.branches()
}

/// Create a new branch.
#[tauri::command]
pub fn git_create_branch(
    state: State<AppState>,
    name: String,
    from: Option<String>,
) -> Result<(), AppError> {
    let service = get_git_service(&state)?;
    service.create_branch(&name, from.as_deref())
}

/// Checkout an existing branch.
#[tauri::command]
pub fn git_checkout(
    state: State<AppState>,
    branch: String,
) -> Result<(), AppError> {
    let service = get_git_service(&state)?;
    service.checkout(&branch)
}

/// Merge a source branch into the current branch.
#[tauri::command]
pub fn git_merge(
    state: State<AppState>,
    source: String,
) -> Result<MergeResult, AppError> {
    let service = get_git_service(&state)?;
    service.merge(&source)
}

/// Push to a remote.
#[tauri::command]
pub fn git_push(
    state: State<AppState>,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<(), AppError> {
    let service = get_git_service(&state)?;
    let remote_name = remote.as_deref().unwrap_or("origin");
    let branch_name = match branch {
        Some(b) => b,
        None => {
            let status = service.status()?;
            status.branch
        }
    };
    service.push(remote_name, &branch_name)
}

/// Pull from a remote (fetch + merge).
#[tauri::command]
pub fn git_pull(
    state: State<AppState>,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<PullResult, AppError> {
    let service = get_git_service(&state)?;
    let remote_name = remote.as_deref().unwrap_or("origin");
    let branch_name = match branch {
        Some(b) => b,
        None => {
            let status = service.status()?;
            status.branch
        }
    };
    service.pull(remote_name, &branch_name)
}

/// List all remotes.
#[tauri::command]
pub fn git_remotes(state: State<AppState>) -> Result<Vec<Remote>, AppError> {
    let service = get_git_service(&state)?;
    service.remotes()
}

/// Add a remote to the repository.
#[tauri::command]
pub fn git_add_remote(
    state: State<AppState>,
    name: String,
    url: String,
) -> Result<(), AppError> {
    let service = get_git_service(&state)?;
    service.add_remote(&name, &url)
}

/// Resolve merge conflicts by staging the resolved files.
#[tauri::command]
pub fn git_resolve_conflicts(
    state: State<AppState>,
    files: Vec<String>,
) -> Result<Commit, AppError> {
    let service = get_git_service(&state)?;
    service.resolve_conflicts(&files)
}
