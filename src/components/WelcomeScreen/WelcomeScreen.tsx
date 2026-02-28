import React from 'react';
import { useRepoStore } from '../../stores/useRepoStore';
import { Button } from '../common/Button';
import { showToast } from '../common/Toast';

export const WelcomeScreen: React.FC = () => {
  const { recentRepos, openRepo, initRepo, openDialog } = useRepoStore();

  const handleOpen = async () => {
    try {
      const path = await openDialog();
      if (path) {
        await openRepo(path);
      }
    } catch (err) {
      showToast(`Failed to open repository: ${err}`, 'error');
    }
  };

  const handleInit = async () => {
    try {
      const path = await openDialog();
      if (path) {
        await initRepo(path);
      }
    } catch (err) {
      showToast(`Failed to initialize repository: ${err}`, 'error');
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      await openRepo(path);
    } catch (err) {
      showToast(`Failed to open repository: ${err}`, 'error');
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo / Title */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Ledgit</h1>
          <p className="mt-2 text-lg text-gray-500">
            CSV editing with built-in version control
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 px-8">
          <Button variant="primary" onClick={handleOpen}>
            Open Repository
          </Button>
          <Button variant="secondary" onClick={handleInit}>
            Initialize New Repository
          </Button>
        </div>

        {/* Recent Repos */}
        {recentRepos.length > 0 && (
          <div className="px-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Recent Repositories
            </h2>
            <ul className="space-y-1">
              {recentRepos.map((repoPath) => {
                const name = repoPath.split('/').pop() ?? repoPath;
                return (
                  <li key={repoPath}>
                    <button
                      onClick={() => handleOpenRecent(repoPath)}
                      className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="ml-2 text-xs text-gray-400">{repoPath}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
