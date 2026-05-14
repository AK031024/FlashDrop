import React from 'react';
import { useStore } from '../store/useStore';
import type { TransferState } from '../store/useStore';
import { FileText, Image, Video, File, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Download, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TransferItem: React.FC<{ transfer: TransferState }> = ({ transfer }) => {
  const getIcon = () => {
    if (transfer.type?.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (transfer.type?.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (transfer.type?.startsWith('text/')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isComplete = transfer.status === 'completed';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
    >
      <div className={`p-3 rounded-xl ${transfer.direction === 'incoming' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
        {transfer.direction === 'incoming' ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <p className="font-medium text-sm truncate pr-4">{transfer.name}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatSize(transfer.size)}</span>
        </div>
        
        <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <motion.div 
            className={`absolute top-0 left-0 h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${transfer.progress}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <span>{isComplete ? 'Done' : `${Math.round(transfer.progress)}%`}</span>
          {!isComplete && transfer.speed > 0 && (
            <span>{formatSize(transfer.speed)}/s • ETA: {Math.round(transfer.eta)}s</span>
          )}
          {isComplete && transfer.direction === 'incoming' && transfer.blobUrl && (
            <a 
              href={transfer.blobUrl} 
              download={transfer.name}
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-md"
            >
              <Download className="w-3 h-3" /> Save
            </a>
          )}
          {isComplete && transfer.direction === 'outgoing' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
      </div>
    </motion.div>
  );
};

const TransferList: React.FC = () => {
  const { transfers, autoDownload, turboLanMode, toggleAutoDownload, toggleTurboLanMode } = useStore();
  const transferList = Object.values(transfers).reverse();

  return (
    <div className="w-full mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Queue & Activity</h3>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleAutoDownload}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all group"
          >
            <Download className={`w-3.5 h-3.5 ${autoDownload ? 'text-blue-500' : 'opacity-50 group-hover:opacity-100'}`} />
            Auto-Save
            <div className={`w-8 h-4 rounded-full relative transition-colors border border-border/50 shadow-inner ${autoDownload ? 'bg-blue-500' : 'bg-secondary/80'}`}>
              <motion.div 
                animate={{ x: autoDownload ? 16 : 2 }}
                className="absolute top-1 left-0 w-2 h-2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              />
            </div>
          </button>
          <button 
            onClick={toggleTurboLanMode}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all group"
          >
            <Zap className={`w-3.5 h-3.5 ${turboLanMode ? 'text-amber-500' : 'opacity-50 group-hover:opacity-100'}`} />
            Turbo LAN
            <div className={`w-8 h-4 rounded-full relative transition-colors border border-border/50 shadow-inner ${turboLanMode ? 'bg-amber-500' : 'bg-secondary/80'}`}>
              <motion.div 
                animate={{ x: turboLanMode ? 16 : 2 }}
                className="absolute top-1 left-0 w-2 h-2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              />
            </div>
          </button>
        </div>
      </div>

      <div className="min-h-[200px] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {transferList.length > 0 ? (
            transferList.map((t, i) => (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <TransferItem transfer={t} />
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-border/40 rounded-3xl bg-secondary/10"
            >
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <ArrowUpCircle className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="font-bold text-sm text-foreground/60">No active transfers</p>
              <p className="text-[10px] font-medium text-muted-foreground/60 mt-1 uppercase tracking-widest text-center max-w-[200px]">
                Drop files above to start sharing instantly
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TransferList;
