/** A single git commit. */
export interface Commit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  timestamp: string;
  refs: string[];
}

/** Current working-tree / index status of the repository. */
export interface RepoStatus {
  branch: string;
  clean: boolean;
  modified: string[];
  staged: string[];
  untracked: string[];
}

/** Branch listing. */
export interface BranchList {
  branches: string[];
  current: string;
}

/** High-level information about the opened repository. */
export interface RepoInfo {
  path: string;
  name: string;
  branch: string;
  remote_url: string | null;
}

/** Result of a git merge operation. */
export interface MergeResult {
  success: boolean;
  conflicts: string[] | null;
}

/** A configured git remote. */
export interface Remote {
  name: string;
  url: string;
}

/** Result of a git pull operation. */
export interface PullResult {
  updated: boolean;
  new_commits: number;
  conflicts: string[] | null;
}
