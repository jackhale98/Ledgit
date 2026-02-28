# Ledgit

A lightweight desktop application for editing CSV files with built-in git version control. Edit your spreadsheets while every change is automatically tracked, enabling full version history, branching, merging, and diffing.

Built with [Tauri](https://tauri.app/) (Rust) and [React](https://react.dev/) (TypeScript).

## Features

### Spreadsheet Editing
- Full cell editing powered by [ag-grid](https://www.ag-grid.com/)
- Add and remove rows and columns
- Column sorting and filtering
- Automatic column type inference (number, date, boolean, text)
- CSV and TSV support
- Undo/redo with 100-level history
- Auto-save after 2 seconds of inactivity
- Keyboard shortcuts: `Ctrl+S` (save), `Ctrl+Z` (undo), `Ctrl+Y` (redo)

### Version Control
- **Auto-commit** — saves are automatically committed with descriptive messages based on what changed
- **Branching** — create, switch, and list branches
- **Merging** — fast-forward and three-way merge with conflict detection
- **Conflict resolution** — three-pane editor showing Ours / Merged / Theirs with per-cell accept buttons
- **Diff viewer** — select any two commits to compare with color-coded changes (green = added, red = removed, yellow = modified)
- **Remote operations** — push, pull, add and list remotes
- **Commit history** — browse paginated commit log, optionally filtered by file

### File Management
- Browse all CSV/TSV files in the repository
- Create and delete files
- File watcher reloads external changes automatically
- Recent repositories list (up to 10)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri system dependencies — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
cargo tauri dev
```

The app will open a native window with Vite HMR on `localhost:1420`.

## Building for Production

```bash
# Build the distributable app
cargo tauri build
```

The output binary will be in `src-tauri/target/release/`.

## Other Commands

```bash
npm run lint          # TypeScript type checking
npm test              # Run tests (Vitest)
npm run test:watch    # Run tests in watch mode
npm run build         # Build frontend only
```

## Project Structure

```
ledgit/
├── src/                           # React/TypeScript frontend
│   ├── components/
│   │   ├── SpreadsheetEditor/     # ag-grid CSV editor
│   │   ├── VersionSidebar/        # Branch selector & commit list
│   │   ├── DiffViewer/            # Commit comparison view
│   │   ├── FileExplorer/          # File browser sidebar
│   │   ├── MergeResolver/         # Three-pane conflict resolution
│   │   ├── TitleBar/              # Top navigation bar
│   │   ├── WelcomeScreen/         # Repo selection on startup
│   │   └── common/                # Button, Toast, Modal
│   ├── stores/                    # Zustand state management
│   │   ├── useRepoStore.ts        # Repository lifecycle
│   │   ├── useSheetStore.ts       # Spreadsheet data & undo/redo
│   │   ├── useGitStore.ts         # Git operations & history
│   │   └── useDiffStore.ts        # Diff/compare mode
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAutoSave.ts         # Auto-save with commit
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useFileWatcher.ts      # External file change detection
│   │   └── useDiffHighlighting.ts # Cell styling for diffs
│   ├── ipc/                       # Tauri IPC bridge
│   ├── services/                  # Frontend diff/merge logic
│   ├── types/                     # TypeScript interfaces
│   └── utils/                     # Helpers & formatters
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── commands/              # IPC command handlers
│   │   ├── services/
│   │   │   ├── git_service.rs     # Git operations via libgit2
│   │   │   └── file_service.rs    # CSV read/write & type inference
│   │   └── models/                # Shared data types & errors
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop framework | Tauri 2 | Native window, IPC, plugins |
| Frontend | React 18, TypeScript 5 | UI components |
| Spreadsheet | ag-grid 34 | Cell editing, sorting, filtering |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| State | Zustand 5 | Lightweight stores |
| CSV parsing | PapaParse (frontend), csv crate (backend) | Read/write CSV |
| Diff/merge | daff | Table-aware diffing |
| Git | libgit2 (via git2 crate) | All git operations |
| File watching | notify crate | Detect external changes |
| Build | Vite 6 | Frontend bundling & HMR |

## License

This project is private.
