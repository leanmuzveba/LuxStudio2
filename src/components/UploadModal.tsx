import React, { useState } from 'react';
import {
  Upload,
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (file: File, durationMs: number) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate upload & metadata extraction
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          // Try to get actual video duration
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            const durationMs = Math.round((video.duration || 98) * 1000);
            onUploadSuccess(file, durationMs);
            onClose();
          };
          video.onerror = () => {
            // fallback
            onUploadSuccess(file, 120000);
            onClose();
          };
          video.src = URL.createObjectURL(file);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  return (
    <div
      id="upload-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-[#0b1222] border border-[#14213D] w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0e162b]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FCA311]/20 border border-[#FCA311]/40 flex items-center justify-center text-[#FCA311]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Import Teaching / Sermon Video</h3>
              <p className="text-[11px] text-gray-400">Supports long 1–2 hour MP4, MOV, and WebM files</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Drag & Drop Box */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-[#FCA311] bg-[#14213D]/40 scale-102'
                : 'border-white/15 bg-[#060a14] hover:border-white/30'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="w-12 h-12 bg-[#14213D] border border-white/10 flex items-center justify-center text-[#FCA311] mb-3 shadow-lg">
              <FileVideo className="w-6 h-6" />
            </div>

            <div className="font-bold text-white text-sm mb-1">
              Drag and drop your sermon recording here
            </div>
            <p className="text-xs text-gray-400 max-w-xs mb-3">
              or click to browse from your device (MP4, MOV, WebM up to 2GB)
            </p>

            <span className="px-3 py-1 bg-white/5 border border-white/10 text-[11px] text-gray-300 font-semibold">
              Select Video File
            </span>
          </div>

          {/* Progress if uploading */}
          {isProcessing && (
            <div className="space-y-2 p-4 bg-[#060a14] border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold">Uploading {selectedFile?.name}...</span>
                <span className="text-[#FCA311] font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-black h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-[#FCA311] h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
