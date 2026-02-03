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

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);

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
            <Chat files={files} selectedFileIds={selectedFileIds} />
          </div>
        </main>

        {/* Right Sidebar - Studio Panel */}
        <aside className="w-80 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Studio</h2>
              <button className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="space-y-3">
              {/* 功能卡片网格 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">摘要</span>
                  </div>
                </button>

                <button className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">大纲</span>
                  </div>
                </button>

                <button className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">问答</span>
                  </div>
                </button>

                <button className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">关键点</span>
                  </div>
                </button>
              </div>

              {/* 系统状态 */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">文档统计</h3>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>文档总数</span>
                    <span className="font-medium text-gray-900">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>已选中</span>
                    <span className="font-medium text-blue-600">{selectedFileIds.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>向量块</span>
                    <span className="font-medium text-gray-900">
                      {files.reduce((acc, f) => acc + f.chunks_count, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
