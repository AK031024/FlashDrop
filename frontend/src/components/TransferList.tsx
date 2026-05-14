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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-secondary/40 border border-border/80 rounded-2xl p-5 flex items-center gap-5 shadow-sm hover:border-primary/20 transition-all group"
    >
      <div className={`p-4 rounded-xl shadow-lg ring-1 ring-white/5 ${transfer.direction === 'incoming' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
        {transfer.direction === 'incoming' ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col min-w-0">
            <p className="font-black text-sm truncate pr-4 tracking-tight">{transfer.name}</p>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">{formatSize(transfer.size)}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isComplete ? 'text-green-500' : 'text-primary'}`}>
              {isComplete ? 'Complete' : `${Math.round(transfer.progress)}%`}
            </span>
          </div>
        </div>
        
        <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
          <motion.div 
            className={`absolute top-0 left-0 h-full rounded-full ${isComplete ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-primary shadow-[0_0_10px_rgba(255,255,255,0.1)]'}`}
            initial={{ width: 0 }}
            animate={{ width: `${transfer.progress}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-3">
            {!isComplete && transfer.speed > 0 && (
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {formatSize(transfer.speed)}/s <span className="opacity-30 mx-1">•</span> ETA: {Math.round(transfer.eta)}s
              </p>
            )}
            {isComplete && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Saved Successfully</span>
              </div>
            )}
          </div>
          
          {isComplete && transfer.direction === 'incoming' && transfer.blobUrl && (
            <a 
              href={transfer.blobUrl} 
              download={transfer.name}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground bg-primary px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Save File
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TransferList: React.FC = () => {
  const { transfers, autoDownload, turboLanMode, toggleAutoDownload, toggleTurboLanMode } = useStore();
  const transferList = Object.values(transfers).reverse();

  return (
    <div className="w-full mt-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-col">
          <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Queue & Activity</h3>
          <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-1">Real-time status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="group relative">
            <button 
              onClick={toggleAutoDownload}
              className={`flex items-center gap-2 p-2 px-3 rounded-xl border transition-all ${autoDownload ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Auto-Save</span>
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] font-bold text-muted-foreground leading-relaxed">
              Automatically save incoming files to your device as soon as they arrive.
            </div>
          </div>

          <div className="group relative">
            <button 
              onClick={toggleTurboLanMode}
              className={`flex items-center gap-2 p-2 px-3 rounded-xl border transition-all ${turboLanMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Turbo LAN</span>
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] font-bold text-muted-foreground leading-relaxed">
              Prioritize local network speed for faster transfers between devices on the same Wi-Fi.
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-[250px] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {transferList.length > 0 ? (
            transferList.map((t, i) => (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
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
              className="flex-1 flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-[2rem] bg-secondary/5"
            >
              <div className="w-20 h-20 bg-secondary rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner border border-border">
                <ArrowUpCircle className="w-10 h-10 text-muted-foreground/20" />
              </div>
              <p className="font-black text-lg tracking-tight text-foreground/40">No active transfers</p>
              <p className="text-[10px] font-black text-muted-foreground/30 mt-2 uppercase tracking-[0.2em] text-center max-w-[240px] leading-relaxed">
                Drag files to the area above to instantly share with connected devices
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TransferList;
