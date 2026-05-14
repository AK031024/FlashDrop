import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, Package, Loader2 } from 'lucide-react';
import type { CompressionMode } from '../services/compression';

interface Props {
  isOpen: boolean;
  files: File[];
  onConfirm: (mode: CompressionMode) => void;
  onCancel: () => void;
}

const CompressionModal: React.FC<Props> = ({ isOpen, files, onConfirm, onCancel }) => {
  const [selectedMode, setSelectedMode] = useState<CompressionMode>('fast');
  const [isCompressing, setIsCompressing] = useState(false);

  if (!isOpen) return null;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const formattedSize = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';

  const handleConfirm = () => {
    setIsCompressing(true);
    // Give UI a tiny tick to render the loading state before synchronous compression hogs the thread
    setTimeout(() => {
      onConfirm(selectedMode);
    }, 50);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Smart Compression</h2>
                <p className="text-muted-foreground mt-1">
                  Optimize {files.length} large file{files.length !== 1 ? 's' : ''} before transfer ({formattedSize})
                </p>
              </div>
              <button 
                onClick={onCancel}
                disabled={isCompressing}
                className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedMode('fast')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedMode === 'fast' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-primary/30'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedMode === 'fast' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Fast</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Maximum speed, lower quality. Best for quick previews.</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('best')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedMode === 'best' 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-border/50 hover:border-blue-500/30'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedMode === 'best' ? 'bg-blue-500 text-white' : 'bg-secondary text-secondary-foreground'}`}>
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Best Quality</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Balanced optimization. Excellent quality with smaller size.</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('lossless')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedMode === 'lossless' 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-border/50 hover:border-emerald-500/30'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedMode === 'lossless' ? 'bg-emerald-500 text-white' : 'bg-secondary text-secondary-foreground'}`}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Lossless (.gz)</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Native ZIP compression. Original quality preserved perfectly.</p>
                </div>
              </button>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => onConfirm('none')}
                disabled={isCompressing}
                className="flex-1 py-3 px-4 rounded-xl border border-border font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Skip Compression
              </button>
              <button
                onClick={handleConfirm}
                disabled={isCompressing}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compressing...
                  </>
                ) : (
                  'Compress & Send'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CompressionModal;
