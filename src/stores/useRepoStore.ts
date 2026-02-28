import { create } from 'zustand';
import type { RepoInfo } from '../types/git';
import * as repoIpc from '../ipc/repoIpc';

const RECENT_REPOS_KEY = 'ledgit_recent_repos';
const MAX_RECENT = 10;

function loadRecentRepos(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_REPOS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistRecentRepos(repos: string[]): void {
  localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(repos));
}

function addToRecent(path: string, existing: string[]): string[] {
  const filtered = existing.filter((p) => p !== path);
  const updated = [path, ...filtered].slice(0, MAX_RECENT);
  persistRecentRepos(updated);
  return updated;
}

interface RepoState {
  repoInfo: RepoInfo | null;
  recentRepos: string[];
  isOpen: boolean;

  openRepo: (path: string) => Promise<void>;
  initRepo: (path: string) => Promise<void>;
  openDialog: () => Promise<string | null>;
  closeRepo: () => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repoInfo: null,
  recentRepos: loadRecentRepos(),
  isOpen: false,

  openRepo: async (path: string) => {
    const info = await repoIpc.openRepo(path);
    set({
      repoInfo: info,
      isOpen: true,
      recentRepos: addToRecent(path, get().recentRepos),
    });
  },

  initRepo: async (path: string) => {
    const info = await repoIpc.init(path);
    set({
      repoInfo: info,
      isOpen: true,
      recentRepos: addToRecent(path, get().recentRepos),
    });
  },

  openDialog: async () => {
    const path = await repoIpc.openDialog();
    return path;
  },

  closeRepo: () => {
    set({ repoInfo: null, isOpen: false });
  },
}));
