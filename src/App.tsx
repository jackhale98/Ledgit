import React from 'react';
import { useRepoStore } from './stores/useRepoStore';
import { useDiffStore } from './stores/useDiffStore';
import { useAutoSave } from './hooks/useAutoSave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileWatcher } from './hooks/useFileWatcher';
import { WelcomeScreen } from './components/WelcomeScreen/WelcomeScreen';
import { TitleBar } from './components/TitleBar/TitleBar';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { SpreadsheetEditor } from './components/SpreadsheetEditor/SpreadsheetEditor';
import { DiffViewer } from './components/DiffViewer/DiffViewer';
import { VersionSidebar } from './components/VersionSidebar/VersionSidebar';
import { ToastContainer } from './components/common/Toast';

const App: React.FC = () => {
  const isOpen = useRepoStore((s) => s.isOpen);
  const isCompareMode = useDiffStore((s) => s.isCompareMode);

  useAutoSave();
  useKeyboardShortcuts();
  useFileWatcher();

  if (!isOpen) {
    return (
      <>
        <WelcomeScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: file explorer */}
        <FileExplorer />

        {/* Center: spreadsheet or diff viewer */}
        <div className="flex-1 overflow-hidden">
          {isCompareMode ? <DiffViewer /> : <SpreadsheetEditor />}
        </div>

        {/* Right sidebar: version control */}
        <VersionSidebar />
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;
