// app/components/FileUploader.tsx
// File upload component with drag and drop support

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploader({ onFileUpload, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
  }, [onFileUpload]);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('请选择 Excel 文件 (.xlsx 或 .xls)');
      return;
    }
    setFileName(file.name);
    onFileUpload(file);
  };

  const handleClear = () => {
    setFileName(null);
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
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-4">
            <Upload className="w-8 h-8 text-primary-500" />
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
            <div className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              拖拽 Excel 文件到此处
            </h3>
            <p className="text-gray-500">
              或点击选择文件
              <span className="mx-2 text-gray-300">|</span>
              支持 .xlsx 和 .xls 格式
            </p>
          </div>
        )}
      </div>
    </div>
  );
}