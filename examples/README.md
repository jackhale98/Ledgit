# Ledgit Demo Repository

A sample git repository with employee data to demonstrate Ledgit's features.

## Setup

```bash
./setup.sh
```

This creates a `demo-repo/` directory with:

- **4 commits** on `main` with evolving employee data
- **1 branch** (`feature/budget-update`) with salary changes that diverge from main

## What to test

1. **Open** `demo-repo/` in Ledgit
2. **Branch switching** — switch between `main` and `feature/budget-update`, watch the spreadsheet update
3. **Diff view** — compare commits to see salary changes highlighted
4. **Commit** — edit cells, select files to stage, and commit
5. **Merge** — merge `feature/budget-update` into `main` to see conflict resolution

## Reset

```bash
rm -rf demo-repo/
./setup.sh
```
