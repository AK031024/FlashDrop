import React, { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { webrtcService } from '../services/webrtc';
import { UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CompressionModal from './CompressionModal';
import { compressFile, isCompressible, type CompressionMode } from '../services/compression';

const DropZone: React.FC = () => {
  const { peers } = useStore();
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showCompressionModal, setShowCompressionModal] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (peers.length === 0) {
      alert("No peers connected to send files to.");
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [peers]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (peers.length === 0) {
      alert("No peers connected to send files to.");
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    // Check if any file is compressible (>1MB and right type)
    const hasCompressible = files.some(isCompressible);

    if (hasCompressible) {
      setPendingFiles(files);
      setShowCompressionModal(true);
    } else {
      sendFiles(files);
    }
  };

  const sendFiles = async (files: File[], mode: CompressionMode = 'none') => {
    setShowCompressionModal(false);
    
    // Process files sequentially to avoid freezing UI completely if large
    const processedFiles: File[] = [];
    for (const file of files) {
      if (isCompressible(file)) {
        const compressed = await compressFile(file, mode);
        processedFiles.push(compressed);
      } else {
        processedFiles.push(file);
      }
    }

    // Send to all peers for simplicity in this MVP
    peers.forEach(peer => {
      processedFiles.forEach(file => {
        webrtcService.sendFile(peer.id, file);
      });
    });
    
    setPendingFiles([]);
  };

  return (
    <div
      className={`relative w-full h-56 border-2 border-dashed rounded-4xl flex flex-col items-center justify-center transition-all duration-500 overflow-hidden group ${
        isDragActive 
          ? 'border-primary bg-primary/5 scale-[1.01]' 
          : 'border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Animated background pulse when active */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        title=""
      />
      
      <div className="flex flex-col items-center pointer-events-none text-muted-foreground relative z-20">
        <motion.div 
          animate={{ 
            y: isDragActive ? -12 : 0,
            scale: isDragActive ? 1.1 : 1,
            backgroundColor: isDragActive ? "var(--primary)" : "var(--background)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="p-5 rounded-3xl shadow-xl mb-5 flex items-center justify-center ring-1 ring-border/50"
        >
          <UploadCloud className={`w-10 h-10 transition-colors ${isDragActive ? 'text-primary-foreground' : 'text-primary'}`} />
        </motion.div>
        
        <div className="text-center">
          <p className={`font-black text-xl transition-colors ${isDragActive ? 'text-primary' : 'text-foreground'}`}>
            {isDragActive ? 'Release to Share' : 'Drop anything here'}
          </p>
          <p className="text-sm font-medium mt-1 opacity-60">
            {isDragActive ? 'Instantly sending to all peers' : 'or click to browse your files'}
          </p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary/20 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary/20 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary/20 rounded-br-lg" />

      <CompressionModal
        isOpen={showCompressionModal}
        files={pendingFiles.filter(isCompressible)}
        onConfirm={(mode) => sendFiles(pendingFiles, mode)}
        onCancel={() => {
          setShowCompressionModal(false);
          setPendingFiles([]);
        }}
      />
    </div>
  );
};

export default DropZone;
