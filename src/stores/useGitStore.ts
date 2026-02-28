import { create } from 'zustand';
import type { Commit, RepoStatus, MergeResult, PullResult } from '../types/git';
import * as gitIpc from '../ipc/gitIpc';

interface GitState {
  currentBranch: string;
  branches: string[];
  commits: Commit[];
  status: RepoStatus | null;
  isLoading: boolean;

  fetchStatus: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchLog: (file?: string) => Promise<void>;
  switchBranch: (branch: string) => Promise<void>;
  createBranch: (name: string, from?: string) => Promise<void>;
  merge: (source: string) => Promise<MergeResult>;
  push: (remote?: string, branch?: string) => Promise<void>;
  pull: (remote?: string, branch?: string) => Promise<PullResult>;
  commitChanges: (message: string, files: string[]) => Promise<Commit>;
}

export const useGitStore = create<GitState>((set) => ({
  currentBranch: 'main',
  branches: [],
  commits: [],
  status: null,
  isLoading: false,

  fetchStatus: async () => {
    set({ isLoading: true });
    try {
      const s = await gitIpc.status();
      set({ status: s, currentBranch: s.branch, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchBranches: async () => {
    try {
      const bl = await gitIpc.branches();
      set({ branches: bl.branches, currentBranch: bl.current });
    } catch {
      /* ignored */
    }
  },

  fetchLog: async (file?: string) => {
    set({ isLoading: true });
    try {
      const commits = await gitIpc.log(file);
      set({ commits, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  switchBranch: async (branch: string) => {
    await gitIpc.checkout(branch);
    set({ currentBranch: branch });
  },

  createBranch: async (name: string, from?: string) => {
    await gitIpc.createBranch(name, from);
    const bl = await gitIpc.branches();
    set({ branches: bl.branches, currentBranch: bl.current });
  },

  merge: async (source: string) => {
    const result = await gitIpc.merge(source);
    return result;
  },

  push: async (remote?: string, branch?: string) => {
    await gitIpc.push(remote, branch);
  },

  pull: async (remote?: string, branch?: string) => {
    const result = await gitIpc.pull(remote, branch);
    return result;
  },

  commitChanges: async (message: string, files: string[]) => {
    const c = await gitIpc.commit(message, files);
    return c;
  },
}));
