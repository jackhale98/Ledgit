use std::path::Path;

use git2::{
    BranchType, DiffOptions, MergeOptions, Repository, Signature, Sort, StatusOptions,
};

use crate::models::error::AppError;
use crate::models::git::{BranchList, Commit, MergeResult, PullResult, Remote, RepoInfo, RepoStatus};

pub struct GitService {
    repo: Repository,
}

impl GitService {
    /// Open an existing git repository at the given path.
    pub fn open(path: &Path) -> Result<Self, AppError> {
        let repo = Repository::open(path)?;
        Ok(Self { repo })
    }

    /// Initialize a new git repository at the given path.
    /// Creates a .gitattributes file and makes an initial commit.
    pub fn init(path: &Path) -> Result<Self, AppError> {
        if path.join(".git").exists() {
            return Err(AppError::RepoExists(path.to_string_lossy().to_string()));
        }

        let repo = Repository::init(path)?;

        // Create .gitattributes for CSV diff
        let gitattributes = "*.csv diff=csv\n*.tsv diff=tsv\n";
        std::fs::write(path.join(".gitattributes"), gitattributes)?;

        // Stage .gitattributes
        let mut index = repo.index()?;
        index.add_path(Path::new(".gitattributes"))?;
        index.write()?;
        let tree_oid = index.write_tree()?;

        // Make initial commit (scope tree/sig so repo isn't borrowed when moved)
        {
            let tree = repo.find_tree(tree_oid)?;
            let sig = Self::default_signature(&repo)?;
            repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                "Initial commit – Ledgit repository",
                &tree,
                &[], // no parents for initial commit
            )?;
        }

        Ok(Self { repo })
    }

    /// Get the current status of the repository.
    pub fn status(&self) -> Result<RepoStatus, AppError> {
        let branch = self.current_branch()?;

        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false);

        let statuses = self.repo.statuses(Some(&mut opts))?;

        let mut modified = Vec::new();
        let mut staged = Vec::new();
        let mut untracked = Vec::new();

        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let st = entry.status();

            if st.is_wt_new() {
                untracked.push(path.clone());
            }
            if st.is_wt_modified() || st.is_wt_deleted() || st.is_wt_renamed() {
                modified.push(path.clone());
            }
            if st.is_index_new()
                || st.is_index_modified()
                || st.is_index_deleted()
                || st.is_index_renamed()
            {
                staged.push(path.clone());
            }
        }

        let clean = modified.is_empty() && staged.is_empty() && untracked.is_empty();

        Ok(RepoStatus {
            branch,
            clean,
            modified,
            staged,
            untracked,
        })
    }

    /// Stage specific files and create a commit.
    pub fn commit(&self, message: &str, files: &[String]) -> Result<Commit, AppError> {
        let mut index = self.repo.index()?;

        // Stage the specified files
        for file in files {
            let path = Path::new(file);
            let full_path = self.repo.workdir().unwrap_or(Path::new(".")).join(path);
            if full_path.exists() {
                index.add_path(path)?;
            } else {
                // File was deleted – remove from index
                index.remove_path(path)?;
            }
        }

        index.write()?;
        let tree_oid = index.write_tree()?;
        let tree = self.repo.find_tree(tree_oid)?;

        let sig = Self::default_signature(&self.repo)?;

        // Find parent commit (HEAD)
        let parent = match self.repo.head() {
            Ok(head) => {
                let oid = head.target().ok_or_else(|| {
                    AppError::GitError(git2::Error::from_str("HEAD has no target"))
                })?;
                Some(self.repo.find_commit(oid)?)
            }
            Err(_) => None,
        };

        let parents: Vec<&git2::Commit> = parent.iter().collect();

        let oid = self
            .repo
            .commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)?;

        let commit = self.repo.find_commit(oid)?;
        Ok(Self::commit_to_model(&commit))
    }

    /// Get commit log, optionally filtered by file path, with pagination.
    pub fn log(
        &self,
        file: Option<&str>,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Commit>, AppError> {
        let mut revwalk = self.repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(Sort::TIME)?;

        let mut commits = Vec::new();
        let mut skipped = 0;

        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = self.repo.find_commit(oid)?;

            // If filtering by file, check if the commit touches that file
            if let Some(file_path) = file {
                if !self.commit_touches_file(&commit, file_path)? {
                    continue;
                }
            }

            // Handle offset
            if skipped < offset {
                skipped += 1;
                continue;
            }

            commits.push(Self::commit_to_model(&commit));

            if commits.len() >= limit {
                break;
            }
        }

        Ok(commits)
    }

    /// Show the contents of a file at a specific commit hash.
    pub fn show_file(&self, hash: &str, file_path: &str) -> Result<String, AppError> {
        let oid = self.repo.revparse_single(hash)?.id();
        let commit = self.repo.find_commit(oid)?;
        let tree = commit.tree()?;

        let entry = tree.get_path(Path::new(file_path)).map_err(|_| {
            AppError::FileNotFound(format!("{} at commit {}", file_path, hash))
        })?;

        let blob = self
            .repo
            .find_blob(entry.id())
            .map_err(|e| AppError::GitError(e))?;

        let content = std::str::from_utf8(blob.content())
            .map_err(|_| AppError::InvalidCsv("File is not valid UTF-8".to_string()))?;

        Ok(content.to_string())
    }

    /// List all branches.
    pub fn branches(&self) -> Result<BranchList, AppError> {
        let current = self.current_branch()?;
        let mut branches = Vec::new();

        for branch_result in self.repo.branches(Some(BranchType::Local))? {
            let (branch, _) = branch_result?;
            if let Some(name) = branch.name()? {
                branches.push(name.to_string());
            }
        }

        Ok(BranchList { branches, current })
    }

    /// Create a new branch, optionally from a specific base branch.
    pub fn create_branch(&self, name: &str, from: Option<&str>) -> Result<(), AppError> {
        let target_commit = if let Some(base) = from {
            let branch = self.repo.find_branch(base, BranchType::Local)?;
            branch.get().peel_to_commit()?
        } else {
            let head = self.repo.head()?;
            let oid = head.target().ok_or_else(|| {
                AppError::GitError(git2::Error::from_str("HEAD has no target"))
            })?;
            self.repo.find_commit(oid)?
        };

        self.repo.branch(name, &target_commit, false)?;
        Ok(())
    }

    /// Checkout an existing branch.
    pub fn checkout(&self, branch: &str) -> Result<(), AppError> {
        let refname = format!("refs/heads/{}", branch);
        let obj = self
            .repo
            .revparse_single(&refname)?;

        self.repo.checkout_tree(&obj, None)?;
        self.repo.set_head(&refname)?;

        Ok(())
    }

    /// Merge a source branch into the current branch.
    /// Handles fast-forward, normal merge, and conflicts.
    pub fn merge(&self, source: &str) -> Result<MergeResult, AppError> {
        let source_ref = format!("refs/heads/{}", source);
        let annotated = self
            .repo
            .find_reference(&source_ref)?
            .peel_to_commit()?;
        let annotated_commit = self.repo.find_annotated_commit(annotated.id())?;

        let (analysis, _preference) = self.repo.merge_analysis(&[&annotated_commit])?;

        if analysis.is_up_to_date() {
            return Ok(MergeResult {
                success: true,
                conflicts: None,
            });
        }

        if analysis.is_fast_forward() {
            // Fast-forward merge: update the current branch ref to the target
            let target_oid = annotated_commit.id();
            let head_ref = self.repo.head()?;
            if let Some(name) = head_ref.name() {
                self.repo.reference(name, target_oid, true, "Fast-forward merge")?;
            }
            let obj = self.repo.find_object(target_oid, None)?;
            self.repo.checkout_tree(&obj, None)?;
            // Re-set HEAD to refresh
            self.repo.set_head(head_ref.name().unwrap_or("refs/heads/main"))?;

            return Ok(MergeResult {
                success: true,
                conflicts: None,
            });
        }

        // Normal merge
        let mut merge_opts = MergeOptions::new();
        self.repo
            .merge(&[&annotated_commit], Some(&mut merge_opts), None)?;

        // Check for conflicts
        let index = self.repo.index()?;
        if index.has_conflicts() {
            let mut conflict_files = Vec::new();
            for conflict in index.conflicts()? {
                let conflict = conflict?;
                if let Some(ancestor) = conflict.our {
                    let path = String::from_utf8_lossy(&ancestor.path).to_string();
                    conflict_files.push(path);
                }
            }
            return Ok(MergeResult {
                success: false,
                conflicts: Some(conflict_files),
            });
        }

        // No conflicts – create merge commit
        let mut index = self.repo.index()?;
        let tree_oid = index.write_tree()?;
        let tree = self.repo.find_tree(tree_oid)?;
        let sig = Self::default_signature(&self.repo)?;

        let head_commit = self.repo.head()?.peel_to_commit()?;
        let source_commit = self.repo.find_commit(annotated_commit.id())?;

        let current_branch = self.current_branch()?;
        let msg = format!("Merge branch '{}' into '{}'", source, current_branch);

        self.repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &msg,
            &tree,
            &[&head_commit, &source_commit],
        )?;

        // Clean up merge state
        self.repo.cleanup_state()?;

        Ok(MergeResult {
            success: true,
            conflicts: None,
        })
    }

    /// Push to a remote.
    pub fn push(&self, remote_name: &str, branch: &str) -> Result<(), AppError> {
        let mut remote = self.repo.find_remote(remote_name)?;
        let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
        remote.push(&[&refspec], None)?;
        Ok(())
    }

    /// Pull from a remote (fetch + merge).
    pub fn pull(&self, remote_name: &str, branch: &str) -> Result<PullResult, AppError> {
        // Remember HEAD before pull to count new commits afterwards
        let head_oid_before = self.repo.head().ok().and_then(|h| h.target());

        // Fetch
        let mut remote = self.repo.find_remote(remote_name)?;
        remote.fetch(&[branch], None, None)?;

        // Find the fetched commit
        let fetch_head = self
            .repo
            .find_reference(&format!("refs/remotes/{}/{}", remote_name, branch))?;
        let fetch_commit = fetch_head.peel_to_commit()?;
        let annotated = self.repo.find_annotated_commit(fetch_commit.id())?;

        let (analysis, _) = self.repo.merge_analysis(&[&annotated])?;

        if analysis.is_up_to_date() {
            return Ok(PullResult {
                updated: false,
                new_commits: 0,
                conflicts: None,
            });
        }

        if analysis.is_fast_forward() {
            let target_oid = annotated.id();
            let head_ref = self.repo.head()?;
            if let Some(name) = head_ref.name() {
                self.repo.reference(name, target_oid, true, "Fast-forward pull")?;
            }
            let obj = self.repo.find_object(target_oid, None)?;
            self.repo.checkout_tree(&obj, None)?;
            self.repo.set_head(head_ref.name().unwrap_or("refs/heads/main"))?;

            let new_commits = Self::count_commits_between(&self.repo, head_oid_before, target_oid);
            return Ok(PullResult {
                updated: true,
                new_commits,
                conflicts: None,
            });
        }

        // Normal merge
        let mut merge_opts = MergeOptions::new();
        self.repo.merge(&[&annotated], Some(&mut merge_opts), None)?;

        let index = self.repo.index()?;
        if index.has_conflicts() {
            let mut conflict_files = Vec::new();
            for conflict in index.conflicts()? {
                let conflict = conflict?;
                if let Some(our) = conflict.our {
                    let path = String::from_utf8_lossy(&our.path).to_string();
                    conflict_files.push(path);
                }
            }
            return Ok(PullResult {
                updated: false,
                new_commits: 0,
                conflicts: Some(conflict_files),
            });
        }

        // Create merge commit
        let mut index = self.repo.index()?;
        let tree_oid = index.write_tree()?;
        let tree = self.repo.find_tree(tree_oid)?;
        let sig = Self::default_signature(&self.repo)?;
        let head_commit = self.repo.head()?.peel_to_commit()?;
        let remote_commit = self.repo.find_commit(annotated.id())?;

        self.repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &format!("Merge remote branch '{}/{}'", remote_name, branch),
            &tree,
            &[&head_commit, &remote_commit],
        )?;

        self.repo.cleanup_state()?;

        let new_commits = Self::count_commits_between(&self.repo, head_oid_before, annotated.id());
        Ok(PullResult {
            updated: true,
            new_commits,
            conflicts: None,
        })
    }

    /// Add a remote to the repository.
    pub fn add_remote(&self, name: &str, url: &str) -> Result<(), AppError> {
        self.repo.remote(name, url)?;
        Ok(())
    }

    /// List all remotes.
    pub fn remotes(&self) -> Result<Vec<Remote>, AppError> {
        let remote_names = self.repo.remotes()?;
        let mut remotes = Vec::new();

        for name in remote_names.iter() {
            if let Some(name) = name {
                if let Ok(remote) = self.repo.find_remote(name) {
                    remotes.push(Remote {
                        name: name.to_string(),
                        url: remote.url().unwrap_or("").to_string(),
                    });
                }
            }
        }

        Ok(remotes)
    }

    /// Get repository info.
    pub fn repo_info(&self) -> Result<RepoInfo, AppError> {
        let path = self
            .repo
            .workdir()
            .unwrap_or(self.repo.path())
            .to_string_lossy()
            .to_string();

        let name = self
            .repo
            .workdir()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let branch = self.current_branch().unwrap_or_else(|_| "main".to_string());

        let remote_url = self
            .repo
            .find_remote("origin")
            .ok()
            .and_then(|r| r.url().map(|u| u.to_string()));

        Ok(RepoInfo {
            path,
            name,
            branch,
            remote_url,
        })
    }

    /// Resolve conflicts by staging resolved files and committing.
    pub fn resolve_conflicts(&self, files: &[String]) -> Result<Commit, AppError> {
        let mut index = self.repo.index()?;

        // Stage the resolved files, which also clears their conflict entries
        for file in files {
            index.add_path(Path::new(file))?;
        }

        index.write()?;
        let tree_oid = index.write_tree()?;
        let tree = self.repo.find_tree(tree_oid)?;
        let sig = Self::default_signature(&self.repo)?;

        let head_commit = self.repo.head()?.peel_to_commit()?;

        // Find MERGE_HEAD
        let merge_head_path = self.repo.path().join("MERGE_HEAD");
        let parents = if merge_head_path.exists() {
            let merge_head_str = std::fs::read_to_string(&merge_head_path)?;
            let merge_oid = git2::Oid::from_str(merge_head_str.trim())
                .map_err(|e| AppError::GitError(e))?;
            let merge_commit = self.repo.find_commit(merge_oid)?;
            vec![head_commit, merge_commit]
        } else {
            vec![head_commit]
        };

        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

        let oid = self.repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Resolve merge conflicts",
            &tree,
            &parent_refs,
        )?;

        self.repo.cleanup_state()?;

        let commit = self.repo.find_commit(oid)?;
        Ok(Self::commit_to_model(&commit))
    }

    // ── Private helpers ──────────────────────────────────────────────

    /// Get the current branch name.
    fn current_branch(&self) -> Result<String, AppError> {
        let head = self.repo.head()?;
        let name = head
            .shorthand()
            .unwrap_or("HEAD")
            .to_string();
        Ok(name)
    }

    /// Create a default signature using "Ledgit" as the author.
    fn default_signature(repo: &Repository) -> Result<Signature<'_>, AppError> {
        // Try to get signature from git config first
        match repo.signature() {
            Ok(sig) => Ok(sig),
            Err(_) => {
                let sig = Signature::now("Ledgit", "ledgit@local")?;
                Ok(sig)
            }
        }
    }

    /// Count commits between an old HEAD and a new OID.
    fn count_commits_between(repo: &Repository, old_head: Option<git2::Oid>, new_oid: git2::Oid) -> u32 {
        let Ok(mut revwalk) = repo.revwalk() else { return 0 };
        if revwalk.push(new_oid).is_err() {
            return 0;
        }
        if let Some(old) = old_head {
            let _ = revwalk.hide(old);
        }
        revwalk.set_sorting(Sort::TIME).ok();
        revwalk.count() as u32
    }

    /// Check if a commit modifies a specific file.
    fn commit_touches_file(&self, commit: &git2::Commit, file_path: &str) -> Result<bool, AppError> {
        let tree = commit.tree()?;

        let parent_tree = if commit.parent_count() > 0 {
            Some(commit.parent(0)?.tree()?)
        } else {
            None
        };

        let mut diff_opts = DiffOptions::new();
        diff_opts.pathspec(file_path);

        let diff = self.repo.diff_tree_to_tree(
            parent_tree.as_ref(),
            Some(&tree),
            Some(&mut diff_opts),
        )?;

        Ok(diff.deltas().count() > 0)
    }

    /// Convert a git2::Commit to our model Commit.
    fn commit_to_model(commit: &git2::Commit) -> Commit {
        let hash = commit.id().to_string();
        let short_hash = hash[..7.min(hash.len())].to_string();
        let message = commit.message().unwrap_or("").to_string();
        let author = commit.author().name().unwrap_or("Unknown").to_string();
        let timestamp = chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        Commit {
            hash,
            short_hash,
            message,
            author,
            timestamp,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_init_and_open() {
        let dir = TempDir::new().unwrap();
        let service = GitService::init(dir.path()).unwrap();
        let status = service.status().unwrap();
        assert!(status.clean);

        let _reopened = GitService::open(dir.path()).unwrap();
    }

    #[test]
    fn test_commit_and_log() {
        let dir = TempDir::new().unwrap();
        let service = GitService::init(dir.path()).unwrap();

        // Create a test file
        std::fs::write(dir.path().join("test.csv"), "a,b\n1,2\n").unwrap();

        let commit = service
            .commit("Add test file", &["test.csv".to_string()])
            .unwrap();
        assert_eq!(commit.message, "Add test file");

        let log = service.log(None, 10, 0).unwrap();
        assert!(log.len() >= 2); // initial + our commit
    }
}
