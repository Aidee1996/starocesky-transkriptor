
import React, { ChangeEvent, useState } from 'react';
import { FileData } from '../types';
import { convertFileToBase64 } from '../services/geminiService';

interface FileUploaderProps {
  onFilesSelected: (filesData: FileData[]) => void;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    const processedFiles: FileData[] = [];

    for (const file of files) {
      try {
        const base64 = await convertFileToBase64(file);
        processedFiles.push({
          id: crypto.randomUUID(),
          file,
          base64,
          mimeType: file.type
        });
      } catch (err) {
        console.error(`Error reading file ${file.name}`, err);
      }
    }

    if (processedFiles.length > 0) {
      onFilesSelected(processedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-parchment-600 bg-parchment-100 scale-[1.02]' 
            : 'border-parchment-300 bg-white/50 hover:border-parchment-400'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.tif,.tiff,.pdf"
          onChange={handleFileChange}
          disabled={disabled}
          multiple // Enable multiple files
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="space-y-4 pointer-events-none">
          <div className="mx-auto w-16 h-16 bg-parchment-100 text-parchment-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-parchment-800">
              Nahrajte jeden nebo více souborů
            </p>
            <p className="text-sm text-parchment-500 mt-2">
              Podporované formáty: JPG, TIF, PDF
            </p>
            <p className="text-xs text-parchment-400 mt-1">
              Batch processing podporován
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
