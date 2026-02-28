import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { RepoInfo } from '../types/git';

/**
 * Open an existing git repository at the given path.
 */
export async function openRepo(path: string): Promise<RepoInfo> {
  return invoke<RepoInfo>('repo_open', { path });
}

/**
 * Initialize a new git repository at the given path.
 */
export async function init(path: string): Promise<RepoInfo> {
  return invoke<RepoInfo>('repo_init', { path });
}

/**
 * Show a native folder-picker dialog and return the selected path.
 * Returns null if the user cancels.
 */
export async function openDialog(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected === 'string') {
    return selected;
  }
  return null;
}

/**
 * Get information about the currently-opened repository.
 */
export async function info(): Promise<RepoInfo> {
  return invoke<RepoInfo>('repo_info');
}
