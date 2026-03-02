"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, X, FileText, Image, File } from "lucide-react";
import type { UploadedFile } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";

interface FileAttachmentProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return Image;
  if (contentType === "application/pdf") return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileAttachment({
  uploadedFiles,
  onFilesChange,
  disabled,
}: FileAttachmentProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    try {
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const result = await api.upload<UploadedFile>(
          "/api/ia-upload/",
          formData
        );
        newFiles.push(result);
      }

      onFilesChange([...uploadedFiles, ...newFiles]);
      toast.success(
        `${newFiles.length} arquivo(s) anexado(s)`
      );
    } catch {
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeFile(fileId: string) {
    onFilesChange(uploadedFiles.filter((f) => f.file_id !== fileId));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* File chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {uploadedFiles.map((file) => {
            const Icon = getFileIcon(file.content_type);
            return (
              <Badge
                key={file.file_id}
                variant="secondary"
                className="gap-1 pr-1 text-[11px] max-w-48"
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{file.filename}</span>
                <span className="text-muted-foreground shrink-0">
                  ({formatSize(file.size)})
                </span>
                <button
                  onClick={() => removeFile(file.file_id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        title="Anexar arquivo"
      >
        <Paperclip className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
      </Button>
    </div>
  );
}
