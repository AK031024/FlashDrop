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
      className={`relative w-full h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden group ${
        isDragActive 
          ? 'border-primary bg-primary/5 scale-[1.01] shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
          : 'border-border bg-secondary/10 hover:bg-secondary/20 hover:border-primary/40'
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
      
      <div className="flex flex-col items-center pointer-events-none text-muted-foreground relative z-20 px-6 text-center">
        <motion.div 
          animate={{ 
            y: isDragActive ? -16 : 0,
            scale: isDragActive ? 1.15 : 1,
            backgroundColor: isDragActive ? "var(--primary)" : "var(--secondary)"
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="w-20 h-20 rounded-[2rem] shadow-2xl mb-6 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors"
        >
          <UploadCloud className={`w-10 h-10 transition-colors ${isDragActive ? 'text-primary-foreground' : 'text-primary'}`} />
        </motion.div>
        
        <div className="space-y-2">
          <p className={`font-black text-2xl tracking-tight transition-colors ${isDragActive ? 'text-primary' : 'text-foreground'}`}>
            {isDragActive ? 'Drop to start sharing' : 'Drop files here'}
          </p>
          <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-40">
            {isDragActive ? 'Instantly sending to all peers' : 'or click to browse your files'}
          </p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-primary/20 rounded-tl-xl" />
      <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-primary/20 rounded-tr-xl" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-primary/20 rounded-bl-xl" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-primary/20 rounded-br-xl" />

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
