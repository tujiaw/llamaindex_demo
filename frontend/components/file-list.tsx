"use client";

import { useEffect, useState } from "react";
import { Trash2, File, Clock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FileItem {
  file_id: string;
  filename: string;
  size: number;
  uploaded_at: string;
  chunks_count: number;
}

interface FileListProps {
  refreshTrigger: number;
  onFilesChange: (files: FileItem[]) => void;
  selectedFiles: Set<string>;
  onSelectionChange: (fileIds: Set<string>) => void;
}

export function FileList({ refreshTrigger, onFilesChange, selectedFiles, onSelectionChange }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/files/list");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setFiles(data);
      onFilesChange(data);
      // 默认选中所有文件
      onSelectionChange(new Set(data.map((f: FileItem) => f.file_id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    onSelectionChange(newSelection);
  };

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const deleteFile = async (fileId: string) => {
    if (!confirm("确定要删除这个文件吗？")) return;

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      loadFiles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-900 border border-red-200">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <File className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-xs text-gray-500">暂无来源</p>
        <p className="text-xs text-gray-400 mt-1">点击上方按钮添加</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.file_id);
        return (
          <div
            key={file.file_id}
            onClick={() => toggleFileSelection(file.file_id)}
            className={`group relative rounded-lg p-3 transition-all cursor-pointer ${
              isSelected 
                ? "bg-blue-50 border-2 border-blue-500" 
                : "bg-white border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* 勾选框 */}
              <div className="flex-shrink-0 mt-1">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? "bg-blue-500 border-blue-500" 
                    : "border-gray-300 bg-white"
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>

              {/* 文件图标 */}
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  isSelected ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  <File className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-gray-600"}`} />
                </div>
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium truncate mb-1 ${
                  isSelected ? "text-blue-900" : "text-gray-900"
                }`}>
                  {file.filename}
                </h3>
                <div className={`flex items-center gap-2 text-xs ${
                  isSelected ? "text-blue-700" : "text-gray-500"
                }`}>
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                  <span>•</span>
                  <span>{file.chunks_count} 块</span>
                </div>
              </div>

              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.file_id);
                }}
                className={`h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 absolute right-2 top-2 ${
                  isSelected 
                    ? "hover:bg-blue-100 text-blue-900" 
                    : "hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
