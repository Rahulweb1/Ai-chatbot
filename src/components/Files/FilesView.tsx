import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  Code,
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Save,
  Check,
  FolderPlus,
  FileCode,
  FileText,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { VirtualFile } from '../../types';

export function FilesView() {
  const [fileTree, setFileTree] = useState<VirtualFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('src/App.tsx');
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);

  // Fetch file tree on mount
  const fetchTree = async () => {
    try {
      const res = await fetch('/api/files/tree');
      const data = await res.json();
      if (data.tree) {
        setFileTree(data.tree);
      }
    } catch (err) {
      console.error('Failed to fetch file tree:', err);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // Fetch active file content
  useEffect(() => {
    if (!selectedFilePath) return;
    const fetchContent = async () => {
      try {
        const res = await fetch('/api/files/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: selectedFilePath }),
        });
        const data = await res.json();
        if (data.content !== undefined) {
          setFileContent(data.content);
        }
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    };
    fetchContent();
  }, [selectedFilePath]);

  const handleSaveFile = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFilePath, content: fileContent }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;
    const targetPath = newFileName.includes('/') ? newFileName : `src/${newFileName}`;
    try {
      await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: targetPath, content: '// New component file\n' }),
      });
      setNewFileName('');
      setIsCreatingFile(false);
      fetchTree();
      setSelectedFilePath(targetPath);
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const renderTree = (items: VirtualFile[], depth = 0) => {
    return items.map((item) => {
      const isSelected = item.path === selectedFilePath;
      const isDir = item.type === 'directory';

      return (
        <div key={item.id} style={{ paddingLeft: `${depth * 12}px` }}>
          <div
            onClick={() => !isDir && setSelectedFilePath(item.path)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all font-mono ${
              isSelected
                ? 'bg-[#2E6FF2]/20 text-[#5B9CFF] font-bold border border-[#2E6FF2]/40 shadow-sm'
                : 'text-[#6B7A99] hover:text-[#EAF1FF] hover:bg-[#030712]'
            }`}
          >
            {isDir ? (
              <Folder className="w-4 h-4 text-[#5B9CFF] shrink-0" />
            ) : item.name.endsWith('.png') || item.name.endsWith('.jpg') ? (
              <ImageIcon className="w-4 h-4 text-[#5B9CFF] shrink-0" />
            ) : (
              <FileCode className="w-4 h-4 text-[#5B9CFF] shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
          </div>

          {isDir && item.children && renderTree(item.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 flex overflow-hidden bg-[#030712] z-10 font-['Inter',sans-serif]">
      {/* File Tree Left Sidebar */}
      <div className="w-64 bg-[#0A1128] border-r border-[#12275C] flex flex-col p-3 shrink-0 h-full min-h-0">
        <div className="flex items-center justify-between mb-3 border-b border-[#12275C] pb-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B9CFF]">
            Workspace Files
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreatingFile(!isCreatingFile)}
              className="p-1.5 rounded-lg hover:bg-[#030712] text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
              title="Create New File"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={fetchTree}
              className="p-1.5 rounded-lg hover:bg-[#030712] text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
              title="Refresh Directory Tree"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isCreatingFile && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#030712] border border-[#12275C] space-y-2">
            <input
              type="text"
              placeholder="e.g. components/Button.tsx"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-2 py-1 bg-[#0A1128] border border-[#12275C] text-xs text-[#EAF1FF] rounded focus:outline-none font-mono"
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setIsCreatingFile(false)}
                className="px-2 py-1 rounded text-[#6B7A99] hover:text-[#EAF1FF] text-[11px] font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFile}
                className="px-2.5 py-1 rounded bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-bold text-[11px] font-mono"
              >
                Create
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-0.5">{renderTree(fileTree)}</div>
      </div>

      {/* Main File Editor & Previewer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#030712]">
        {/* Active Model & Key Disclosure Header */}
        <div className="p-4 bg-[#0A1128]/80 border-b border-[#12275C] backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-grotesk font-extrabold text-sm text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                  <span>File Editor & Workspace Explorer</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30">
                    FS SYNC
                  </span>
                </h2>
                <p className="text-xs text-[#6B7A99] font-mono mt-0.5 truncate">
                  Target: <span className="text-[#5B9CFF] font-bold">{selectedFilePath}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveFile}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 p-4 overflow-auto bg-[#030712]">
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-full bg-[#0A1128] text-[#EAF1FF] font-mono text-xs p-4 rounded-xl border border-[#12275C] focus:outline-none focus:border-[#2E6FF2] leading-relaxed resize-none shadow-inner"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
