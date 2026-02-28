import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGitStore } from './useGitStore';

// Mock the Tauri IPC layer
vi.mock('../ipc/gitIpc', () => ({
  status: vi.fn(),
  branches: vi.fn(),
  log: vi.fn(),
  checkout: vi.fn(),
  createBranch: vi.fn(),
  merge: vi.fn(),
  push: vi.fn(),
  pull: vi.fn(),
  commit: vi.fn(),
}));

import * as gitIpc from '../ipc/gitIpc';

const mockedStatus = vi.mocked(gitIpc.status);
const mockedBranches = vi.mocked(gitIpc.branches);
const mockedLog = vi.mocked(gitIpc.log);
const mockedCheckout = vi.mocked(gitIpc.checkout);
const mockedCreateBranch = vi.mocked(gitIpc.createBranch);
const mockedCommit = vi.mocked(gitIpc.commit);

beforeEach(() => {
  useGitStore.setState({
    currentBranch: 'main',
    branches: [],
    commits: [],
    status: null,
    isLoading: false,
  });
  vi.clearAllMocks();
});

describe('useGitStore', () => {
  describe('fetchStatus', () => {
    it('updates status and currentBranch from IPC', async () => {
      mockedStatus.mockResolvedValue({
        branch: 'develop',
        clean: true,
        modified: [],
        staged: [],
        untracked: [],
      });

      await useGitStore.getState().fetchStatus();

      const state = useGitStore.getState();
      expect(state.currentBranch).toBe('develop');
      expect(state.status?.clean).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchBranches', () => {
    it('updates branches and current from IPC', async () => {
      mockedBranches.mockResolvedValue({
        branches: ['main', 'feature/x'],
        current: 'feature/x',
      });

      await useGitStore.getState().fetchBranches();

      const state = useGitStore.getState();
      expect(state.branches).toEqual(['main', 'feature/x']);
      expect(state.currentBranch).toBe('feature/x');
    });
  });

  describe('fetchLog', () => {
    it('fetches commits and clears loading state', async () => {
      const mockCommits = [
        { hash: 'abc1234', short_hash: 'abc1234', message: 'Initial', author: 'Test', timestamp: '2024-01-01T00:00:00Z', refs: [] },
      ];
      mockedLog.mockResolvedValue(mockCommits);

      await useGitStore.getState().fetchLog();

      const state = useGitStore.getState();
      expect(state.commits).toEqual(mockCommits);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('switchBranch', () => {
    it('calls checkout IPC and updates currentBranch', async () => {
      mockedCheckout.mockResolvedValue(undefined);

      await useGitStore.getState().switchBranch('feature/y');

      expect(mockedCheckout).toHaveBeenCalledWith('feature/y');
      expect(useGitStore.getState().currentBranch).toBe('feature/y');
    });
  });

  describe('createBranch', () => {
    it('creates branch and refreshes branch list', async () => {
      mockedCreateBranch.mockResolvedValue(undefined);
      mockedBranches.mockResolvedValue({
        branches: ['main', 'new-branch'],
        current: 'main',
      });

      await useGitStore.getState().createBranch('new-branch');

      expect(mockedCreateBranch).toHaveBeenCalledWith('new-branch', undefined);
      expect(useGitStore.getState().branches).toContain('new-branch');
    });
  });

  describe('commitChanges', () => {
    it('calls commit IPC with message and files', async () => {
      const mockCommit = {
        hash: 'def5678',
        short_hash: 'def5678',
        message: 'Add data',
        author: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
        refs: [],
      };
      mockedCommit.mockResolvedValue(mockCommit);

      const result = await useGitStore.getState().commitChanges('Add data', ['data.csv']);

      expect(mockedCommit).toHaveBeenCalledWith('Add data', ['data.csv']);
      expect(result).toEqual(mockCommit);
    });

    it('only commits the specified files, not all changed files', async () => {
      const mockCommit = {
        hash: 'aaa1111',
        short_hash: 'aaa1111',
        message: 'Partial commit',
        author: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
        refs: [],
      };
      mockedCommit.mockResolvedValue(mockCommit);

      await useGitStore.getState().commitChanges('Partial commit', ['file1.csv']);

      expect(mockedCommit).toHaveBeenCalledWith('Partial commit', ['file1.csv']);
      // Verify it was NOT called with additional files
      expect(mockedCommit).toHaveBeenCalledTimes(1);
      expect(mockedCommit.mock.calls[0][1]).toEqual(['file1.csv']);
    });
  });
});
