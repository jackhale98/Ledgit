mod commands;
mod models;
mod services;
mod utils;

use commands::file_commands::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            repo_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // Repo
            commands::repo_commands::repo_open,
            commands::repo_commands::repo_init,
            commands::repo_commands::repo_open_dialog,
            commands::repo_commands::repo_info,
            // Files
            commands::file_commands::file_read_csv,
            commands::file_commands::file_write_csv,
            commands::file_commands::file_list,
            commands::file_commands::file_create,
            commands::file_commands::file_delete,
            // Git
            commands::git_commands::git_status,
            commands::git_commands::git_commit,
            commands::git_commands::git_log,
            commands::git_commands::git_show_file,
            commands::git_commands::git_branches,
            commands::git_commands::git_create_branch,
            commands::git_commands::git_checkout,
            commands::git_commands::git_merge,
            commands::git_commands::git_push,
            commands::git_commands::git_pull,
            commands::git_commands::git_remotes,
            commands::git_commands::git_add_remote,
            commands::git_commands::git_resolve_conflicts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ledgit");
}
