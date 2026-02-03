"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Settings, Share2, User } from "lucide-react";
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
  const [userId, setUserId] = useState("");

  useEffect(() => {
    // 获取或创建用户ID
    let uid = localStorage.getItem("llamaindex_user_id");
    if (!uid) {
      uid = "user_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("llamaindex_user_id", uid);
    }
    setUserId(uid);
  }, []);

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
      <header className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-base">🤖</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">RAG 系统</h1>
          </div>
          <div className="flex items-center gap-2">
            {userId && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md">
                <User className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs font-mono text-gray-700">{userId}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-8">
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              分享
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout with Cards */}
      <div className="flex-1 flex overflow-hidden pt-4 pb-1 px-4 gap-4">
        {/* Left Sidebar - Sources */}
        <aside className="w-96 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">来源</h2>
              <button className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>添加来源</span>
            </button>
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-5 h-5"></div>
                  <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {isAllSelected ? "已全选" : selectedFileIds.size > 0 ? "部分选中" : "选择所有来源"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {selectedFileIds.size} / {files.length} 个来源
                      </div>
                    </div>
                    {/* 全选复选框 */}
                    <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                      {selectedFileIds.size > 0 ? (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isAllSelected ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          )}
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-gray-400" />
                      )}
                    </div>
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
            <h2 className="text-sm font-semibold text-gray-900">对话</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Chat 
              files={files} 
              selectedFileIds={selectedFileIds}
              onSourceClick={setSelectedSource}
              userId={userId}
            />
          </div>
        </main>

        {/* Right Sidebar - Source Viewer */}
        <aside className="w-96 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
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
      
      {/* 底部提示文字 */}
      <footer className="py-1 px-4">
        <p className="text-xs text-gray-500 text-center">
          RAG 系统提供的内容必经核实，因此请仔细查看回答内容。
        </p>
      </footer>
    </div>
  );
}
