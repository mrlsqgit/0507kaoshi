// app/components/FileUploader.tsx
// File upload component with drag and drop support and enhanced error handling

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function FileUploader({ onFileUpload, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
  }, []);

  const handleFile = async (file: File) => {
    // Reset status
    setUploadStatus('idle');
    setErrorMessage(null);

    // Validate file extension
    const isValidExtension = file.name.match(/\.(xlsx|xls)$/i);
    if (!isValidExtension) {
      setUploadStatus('error');
      setErrorMessage('❌ 文件格式错误：仅支持 Excel 文件 (.xlsx 或 .xls)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadStatus('error');
      setErrorMessage(`❌ 文件过大：文件大小 ${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持 10MB`);
      return;
    }

    // Validate file is not empty
    if (file.size === 0) {
      setUploadStatus('error');
      setErrorMessage('❌ 文件为空：请选择有效的Excel文件');
      return;
    }

    // All validations passed
    setFileName(file.name);
    setUploadStatus('uploading');
    
    try {
      await onFileUpload(file);
      // If we get here and still on this tab, reset status
      // (successful upload should have navigated to preview tab)
    } catch (error) {
      console.error('File upload failed:', error);
      setUploadStatus('error');
      setErrorMessage('❌ 文件上传失败，请重试');
    }
  };

  const handleClear = () => {
    setFileName(null);
    setUploadStatus('idle');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Error Message */}
      {uploadStatus === 'error' && errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{errorMessage}</span>
          <button
            onClick={handleClear}
            className="ml-auto px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-md transition-colors"
          >
            重新选择
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-200' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploadStatus === 'uploading' ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && uploadStatus !== 'uploading' && fileInputRef.current?.click()}
      >
        {uploadStatus === 'uploading' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-700">正在解析文件...</p>
            <p className="text-sm text-gray-500">请稍候，解析完成后将自动跳转</p>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">{fileName}</p>
              <p className="text-sm text-gray-500">点击或拖拽更换文件</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div>
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Upload className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              拖拽 Excel 文件到此处
            </h3>
            <p className="text-gray-500">
              或点击选择文件
              <span className="mx-2 text-gray-300">|</span>
              支持 .xlsx 和 .xls 格式
            </p>
            <p className="text-xs text-gray-400 mt-2">
              📌 最大文件大小：10MB
            </p>
          </div>
        )}
      </div>

      {/* File Requirements */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          文件要求：Excel 格式(.xlsx/.xls)，第一行为表头，后续为数据行
        </p>
      </div>
    </div>
  );
}