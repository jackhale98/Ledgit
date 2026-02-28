import { invoke } from '@tauri-apps/api/core';
import type {
  Commit,
  RepoStatus,
  BranchList,
  MergeResult,
  Remote,
  PullResult,
} from '../types/git';

/**
 * Get the current working-tree / index status.
 */
export async function status(): Promise<RepoStatus> {
  return invoke<RepoStatus>('git_status');
}

/**
 * Create a commit with the given message, staging the specified files first.
 */
export async function commit(
  message: string,
  files: string[],
): Promise<Commit> {
  return invoke<Commit>('git_commit', { message, files });
}

/**
 * Retrieve the commit log, optionally filtered to a single file.
 */
export async function log(
  file?: string,
  limit?: number,
  offset?: number,
): Promise<Commit[]> {
  return invoke<Commit[]>('git_log', {
    file: file ?? null,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });
}

/**
 * Show the contents of a file at a given commit hash.
 */
export async function showFile(
  hash: string,
  filePath: string,
): Promise<string> {
  return invoke<string>('git_show_file', { hash, filePath });
}

/**
 * List all local branches.
 */
export async function branches(): Promise<BranchList> {
  return invoke<BranchList>('git_branches');
}

/**
 * Create a new branch, optionally from a specific base.
 */
export async function createBranch(
  name: string,
  from?: string,
): Promise<void> {
  return invoke<void>('git_create_branch', { name, from: from ?? null });
}

/**
 * Checkout (switch to) an existing branch.
 */
export async function checkout(branch: string): Promise<void> {
  return invoke<void>('git_checkout', { branch });
}

/**
 * Merge a source branch into the current branch.
 */
export async function merge(source: string): Promise<MergeResult> {
  return invoke<MergeResult>('git_merge', { source });
}

/**
 * Push committed changes to a remote.
 */
export async function push(
  remote?: string,
  branch?: string,
): Promise<void> {
  return invoke<void>('git_push', {
    remote: remote ?? 'origin',
    branch: branch ?? null,
  });
}

/**
 * Pull changes from a remote.
 */
export async function pull(
  remote?: string,
  branch?: string,
): Promise<PullResult> {
  return invoke<PullResult>('git_pull', {
    remote: remote ?? 'origin',
    branch: branch ?? null,
  });
}

/**
 * List configured remotes.
 */
export async function remotes(): Promise<Remote[]> {
  return invoke<Remote[]>('git_remotes');
}

/**
 * Add a new remote.
 */
export async function addRemote(name: string, url: string): Promise<void> {
  return invoke<void>('git_add_remote', { name, url });
}

/**
 * Mark a conflicted file as resolved by writing the resolved content.
 */
export async function resolveConflicts(
  file: string,
  resolvedContent: string,
): Promise<void> {
  return invoke<void>('git_resolve_conflicts', { file, resolvedContent });
}
