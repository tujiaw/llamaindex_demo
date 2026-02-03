"use client";

import { useState } from "react";
import { Plus, FileText, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { FileList } from "@/components/file-list";
import { Chat } from "@/components/chat";

interface FileItem {
  file_id: string;
  filename: string;
  size: number;
  uploaded_at: string;
  chunks_count: number;
}

interface SourceContent {
  filename: string;
  text: string;
  score: number;
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceContent | null>(null);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setShowUpload(false);
  };

  const handleFilesChange = (newFiles: FileItem[]) => {
    setFiles(newFiles);
  };

  const handleSelectionChange = (fileIds: Set<string>) => {
    setSelectedFileIds(fileIds);
  };

  const handleSelectAll = () => {
    setSelectedFileIds(new Set(files.map(f => f.file_id)));
  };

  const handleDeselectAll = () => {
    setSelectedFileIds(new Set());
  };

  const isAllSelected = files.length > 0 && selectedFileIds.size === files.length;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">RAG 系统</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout with Cards */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Sidebar - Sources */}
        <aside className="w-80 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">来源</h2>
              <button className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <Button
              onClick={() => setShowUpload(!showUpload)}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加来源
            </Button>
          </div>

          {/* Upload Area */}
          {showUpload && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-4">
            {files.length > 0 && (
              <div className="mb-3 pb-3 border-b border-gray-200">
                <button
                  onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium text-gray-900">
                      {isAllSelected ? "已全选" : selectedFileIds.size > 0 ? "部分选中" : "选择所有来源"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedFileIds.size} / {files.length} 个来源
                    </div>
                  </div>
                  {/* 全选复选框 */}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    isAllSelected 
                      ? "bg-blue-500 border-blue-500" 
                      : selectedFileIds.size > 0
                      ? "bg-blue-300 border-blue-300"
                      : "border-gray-300 bg-white"
                  }`}>
                    {selectedFileIds.size > 0 && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        {isAllSelected ? (
                          <path d="M5 13l4 4L19 7"></path>
                        ) : (
                          <path d="M20 12H4"></path>
                        )}
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            )}
            <FileList
              refreshTrigger={refreshTrigger}
              onFilesChange={handleFilesChange}
              selectedFiles={selectedFileIds}
              onSelectionChange={handleSelectionChange}
            />
          </div>
        </aside>

        {/* Center - Chat */}
        <main className="flex-1 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">对话</h2>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded" title="更多选项">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded" title="更多">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Chat 
              files={files} 
              selectedFileIds={selectedFileIds}
              onSourceClick={setSelectedSource}
            />
          </div>
        </main>

        {/* Right Sidebar - Source Viewer */}
        <aside className="w-80 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">来源内容</h2>
              {selectedSource && (
                <button 
                  onClick={() => setSelectedSource(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedSource ? (
              <div className="space-y-4">
                {/* 来源信息 */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {selectedSource.filename}
                      </h3>
                      <p className="text-xs text-gray-600">
                        相关度: {(selectedSource.score * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 内容展示 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">文档内容</h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedSource.text}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">未选择来源</h3>
                <p className="text-xs text-gray-500 max-w-[200px]">
                  点击对话中的来源文档查看详细内容
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
