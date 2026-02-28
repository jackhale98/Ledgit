use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepoStatus {
    pub branch: String,
    pub clean: bool,
    pub modified: Vec<String>,
    pub staged: Vec<String>,
    pub untracked: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchList {
    pub branches: Vec<String>,
    pub current: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepoInfo {
    pub path: String,
    pub name: String,
    pub branch: String,
    pub remote_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeResult {
    pub success: bool,
    pub conflicts: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Remote {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullResult {
    pub updated: bool,
    pub new_commits: u32,
    pub conflicts: Option<Vec<String>>,
}
