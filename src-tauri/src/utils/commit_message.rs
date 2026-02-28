/// Auto-generate a commit message from a list of changed file paths.
///
/// Groups changes by action (add, modify, delete) and produces
/// a short, readable summary.
pub fn generate_commit_message(
    added: &[String],
    modified: &[String],
    deleted: &[String],
) -> String {
    let mut parts: Vec<String> = Vec::new();

    if !added.is_empty() {
        let names = file_names(added);
        parts.push(format!("Add {}", names));
    }

    if !modified.is_empty() {
        let names = file_names(modified);
        parts.push(format!("Update {}", names));
    }

    if !deleted.is_empty() {
        let names = file_names(deleted);
        parts.push(format!("Remove {}", names));
    }

    if parts.is_empty() {
        return "Update files".to_string();
    }

    parts.join("; ")
}

/// Extract just the file name (without directory) from each path,
/// and join them with commas. If there are more than 3 files,
/// show the first 2 and summarize the rest.
fn file_names(paths: &[String]) -> String {
    let names: Vec<&str> = paths
        .iter()
        .filter_map(|p| p.rsplit('/').next())
        .collect();

    if names.len() <= 3 {
        names.join(", ")
    } else {
        format!(
            "{}, {} and {} more",
            names[0],
            names[1],
            names.len() - 2
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_add_only() {
        let msg = generate_commit_message(
            &["data/sales.csv".to_string()],
            &[],
            &[],
        );
        assert_eq!(msg, "Add sales.csv");
    }

    #[test]
    fn test_generate_mixed() {
        let msg = generate_commit_message(
            &["new.csv".to_string()],
            &["existing.csv".to_string()],
            &[],
        );
        assert_eq!(msg, "Add new.csv; Update existing.csv");
    }

    #[test]
    fn test_generate_many_files() {
        let added: Vec<String> = (0..5)
            .map(|i| format!("dir/file{}.csv", i))
            .collect();
        let msg = generate_commit_message(&added, &[], &[]);
        assert!(msg.contains("and 3 more"));
    }

    #[test]
    fn test_generate_empty() {
        let msg = generate_commit_message(&[], &[], &[]);
        assert_eq!(msg, "Update files");
    }
}
