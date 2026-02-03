"use client";

import { useEffect, useState } from "react";
import { Trash2, File, Clock, Database, MoreVertical, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <div className="space-y-1">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.file_id);
        return (
          <div
            key={file.file_id}
            className="group relative flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* 图标区域：文档图标和三点菜单叠加 */}
            <div className="flex-shrink-0 relative w-5 h-5">
              {/* 文档图标 - 默认显示，悬停时隐藏 */}
              <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              
              {/* 三点菜单 - 默认隐藏，悬停时显示 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    side="bottom"
                    sideOffset={2}
                    className="w-44 bg-white border-gray-200 shadow-lg"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.file_id);
                      }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      移除来源
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 实现重命名功能
                      }}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      重命名来源
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 文件名和选中状态区域（可点击选中） */}
            <div
              onClick={() => toggleFileSelection(file.file_id)}
              className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
            >
              {/* 文件名 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-900 truncate">
                  {file.filename}
                </h3>
              </div>

              {/* 选中状态 */}
              <div className="flex-shrink-0">
                {isSelected ? (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-gray-400" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
