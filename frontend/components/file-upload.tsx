"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { API_BASE_URL } from "@/lib/api-config";

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // 处理被拒绝的文件
    if (fileRejections.length > 0) {
      const error = fileRejections[0].errors[0];
      let errorMsg = "文件上传失败";
      
      if (error?.code === "file-too-large") {
        errorMsg = "文件大小不能超过15MB";
      } else if (error?.code === "file-invalid-type") {
        errorMsg = "不支持的文件格式（仅支持 TXT, PDF, DOCX, MD）";
      } else {
        errorMsg = error?.message || "上传出错";
      }
      
      setMessage({ type: "error", text: errorMsg });
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "上传失败");
      }

      const data = await res.json();
      setMessage({ type: "success", text: `文件 ${data.filename} 上传成功！` });
      onUploadSuccess();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "上传失败",
      });
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/markdown": [".md"],
    },
    maxSize: 15728640, // 15MB
    multiple: false,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`cursor-pointer transition-all duration-200 border border-dashed rounded-lg p-4 text-center ${
          isDragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2" />
          ) : (
            <Upload className="h-6 w-6 text-gray-600 mb-2" />
          )}
          <p className="text-xs font-medium text-gray-700 mb-0.5">
            {uploading ? "上传中..." : isDragActive ? "放开上传" : "上传文件"}
          </p>
          <p className="text-xs text-gray-500">
            PDF、Word、Markdown 或文本
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-2 rounded text-xs ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
